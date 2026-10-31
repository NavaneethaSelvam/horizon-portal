import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUser, prisma, unauthorized, forbidden } from "@/lib/server";
import { isIsoDate } from "@/lib/phase2-rules";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getUser(request);
  if (!actor) return unauthorized();
  if (!["ADMIN", "HR"].includes(actor.role)) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, message: "Invalid employee data." }, { status: 400 });

  const allowed = ["full_name", "work_email", "department_id", "role_id", "manager_id", "work_location", "work_mode", "employment_type", "hire_date", "is_active"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    const value = (body as Record<string, unknown>)[key];
    if (key === "is_active") {
      if (typeof value !== "boolean") return NextResponse.json({ success: false, message: "is_active must be boolean." }, { status: 400 });
      data[key] = value;
      continue;
    }
    if (value !== null && typeof value !== "string") return NextResponse.json({ success: false, message: `Invalid ${key}.` }, { status: 400 });
    const trimmed = typeof value === "string" ? value.trim() : null;
    const max = key === "full_name" ? 200 : key === "work_email" ? 254 : key === "hire_date" ? 10 : 100;
    if (trimmed && trimmed.length > max) return NextResponse.json({ success: false, message: `${key} is too long.` }, { status: 400 });
    if (key === "full_name" && !trimmed) return NextResponse.json({ success: false, message: "Name is required." }, { status: 400 });
    if (key === "work_email" && (!trimmed || !emailPattern.test(trimmed))) return NextResponse.json({ success: false, message: "A valid work email is required." }, { status: 400 });
    if (key === "hire_date" && trimmed && !isIsoDate(trimmed)) return NextResponse.json({ success: false, message: "Hire date must be a valid date in YYYY-MM-DD format." }, { status: 400 });
    data[key] = key === "work_email" && trimmed ? trimmed.toLowerCase() : trimmed;
  }
  if (!Object.keys(data).length) return NextResponse.json({ success: false, message: "No supported changes provided." }, { status: 400 });
  if (data.manager_id === id) return NextResponse.json({ success: false, message: "An employee cannot manage themselves." }, { status: 400 });
  const [department, role, manager] = await Promise.all([
    typeof data.department_id === "string" ? prisma.department.findUnique({ where: { department_id: data.department_id } }) : null,
    typeof data.role_id === "string" ? prisma.role.findUnique({ where: { role_id: data.role_id } }) : null,
    typeof data.manager_id === "string" ? prisma.employee.findUnique({ where: { employee_id: data.manager_id } }) : null,
  ]);
  if (typeof data.department_id === "string" && !department || typeof data.role_id === "string" && !role || typeof data.manager_id === "string" && !manager) return NextResponse.json({ success: false, message: "Department, role or manager reference does not exist." }, { status: 400 });
  if (typeof data.manager_id === "string") {
    const seen = new Set([id]);
    let current: string | null = data.manager_id;
    while (current) {
      if (seen.has(current)) return NextResponse.json({ success: false, message: "This manager assignment would create a reporting cycle." }, { status: 400 });
      seen.add(current);
      const nextManager: { manager_id: string | null } | null = await prisma.employee.findUnique({ where: { employee_id: current }, select: { manager_id: true } });
      current = nextManager?.manager_id ?? null;
    }
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      const old = await tx.employee.findUnique({ where: { employee_id: id } });
      if (!old) throw new Error("NOT_FOUND");
      const updated = await tx.employee.update({ where: { employee_id: id }, data });
      for (const [field, value] of Object.entries(data)) {
        const prior = (old as unknown as Record<string, unknown>)[field];
        const normalized = value === "" ? null : value;
        if (prior === normalized) continue;
        await tx.auditLog.create({ data: {
          audit_id: crypto.randomUUID(), actor_id: actor.employeeId,
          action: field === "is_active" && value === false ? "DEACTIVATE" : "UPDATE",
          employee_id: id, changed_field: field,
          old_value: prior == null ? null : String(prior), new_value: normalized == null ? null : String(normalized),
          created_at: new Date().toISOString(),
        } });
      }
      return updated;
    });
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ success: false, message: "Employee not found." }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ success: false, message: "Work email is already in use." }, { status: 409 });
    console.error("PATCH /api/v1/admin/employees failed:", error);
    return NextResponse.json({ success: false, message: "Could not update employee." }, { status: 500 });
  }
}
