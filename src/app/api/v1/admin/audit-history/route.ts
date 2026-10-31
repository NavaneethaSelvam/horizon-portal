import { NextRequest, NextResponse } from "next/server";
import { forbidden, getUser, prisma, unauthorized } from "@/lib/server";

const pageSizeDefault = 20;
const pageSizeMaximum = 100;
const safeEmployeeFields = new Set([
  "full_name",
  "work_email",
  "department_id",
  "role_id",
  "manager_id",
  "work_location",
  "work_mode",
  "employment_type",
  "hire_date",
  "is_active",
]);

function safeValue(field: string | null, value: string | null) {
  if (value === null) return null;
  if (field === "*") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return JSON.stringify(Object.fromEntries(
        Object.entries(parsed).filter(([key]) => safeEmployeeFields.has(key)),
      ));
    } catch {
      return null;
    }
  }
  return field && safeEmployeeFields.has(field) ? value : null;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return unauthorized();
  if (!["ADMIN", "HR"].includes(user.role)) return forbidden();

  const params = new URL(request.url).searchParams;
  const employeeId = (params.get("employee_id") ?? "").trim().slice(0, 100);
  const action = (params.get("action") ?? "").trim().slice(0, 50);
  const field = (params.get("field") ?? "").trim().slice(0, 100);
  const pageValue = Number(params.get("page") || 1);
  const limitValue = Number(params.get("limit") || pageSizeDefault);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = Number.isInteger(limitValue) && limitValue > 0
    ? Math.min(pageSizeMaximum, limitValue)
    : pageSizeDefault;
  const where = {
    ...(employeeId ? { employee_id: employeeId } : {}),
    ...(action ? { action } : {}),
    ...(field ? { changed_field: field } : {}),
  };

  try {
    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ created_at: "desc" }, { audit_id: "desc" }],
        select: {
          audit_id: true,
          actor_id: true,
          action: true,
          employee_id: true,
          changed_field: true,
          old_value: true,
          new_value: true,
          created_at: true,
          actor: { select: { full_name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    const employeeIds = [...new Set(records.map((record) => record.employee_id))];
    const employees = employeeIds.length
      ? await prisma.employee.findMany({
          where: { employee_id: { in: employeeIds } },
          select: { employee_id: true, full_name: true },
        })
      : [];
    const employeeNames = new Map(employees.map((employee) => [employee.employee_id, employee.full_name]));

    return NextResponse.json({
      success: true,
      data: records.map((record) => ({
        audit_id: record.audit_id,
        actor_id: record.actor_id,
        actor_name: record.actor.full_name,
        action: record.action,
        employee_id: record.employee_id,
        employee_name: employeeNames.get(record.employee_id) ?? null,
        changed_field: record.changed_field && (
          record.changed_field === "*" || safeEmployeeFields.has(record.changed_field)
        ) ? record.changed_field : "Sensitive field",
        old_value: safeValue(record.changed_field, record.old_value),
        new_value: safeValue(record.changed_field, record.new_value),
        created_at: record.created_at,
      })),
      total,
      page,
      limit,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("GET /api/v1/admin/audit-history failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load audit history." },
      { status: 500 },
    );
  }
}
