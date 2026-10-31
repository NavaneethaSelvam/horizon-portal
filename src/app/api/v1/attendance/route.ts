import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getUser,
  managerAssignedEmployeeIds,
  prisma,
  unauthorized,
} from "@/lib/server";

const currentMonth = () => new Date().toISOString().slice(0, 7);

export async function GET(request: NextRequest) {
  const actor = await getUser(request);

  if (!actor) return unauthorized();

  if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(actor.role)) {
    return forbidden();
  }

  const requestedMonth = new URL(request.url).searchParams.get("month");
  const month = requestedMonth ?? currentMonth();

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json(
      { success: false, message: "Month must use YYYY-MM format." },
      { status: 400 },
    );
  }

  try {
    let employeeIds: string[] | undefined;
    let scope: "employee" | "team" | "organization";

    if (actor.role === "EMPLOYEE") {
      employeeIds = [actor.employeeId];
      scope = "employee";
    } else if (actor.role === "MANAGER") {
      employeeIds = await managerAssignedEmployeeIds(actor.employeeId);
      scope = "team";
    } else {
      scope = "organization";
    }

    const records = await prisma.attendanceMonthly.findMany({
      where: {
        period_end_date: { startsWith: month },
        ...(employeeIds ? { employee_id: { in: employeeIds } } : {}),
      },
      orderBy: [{ period_end_date: "desc" }, { employee_id: "asc" }],
    });

    const recordEmployeeIds = [...new Set(records.map((record) => record.employee_id))];
    const employees = recordEmployeeIds.length
      ? await prisma.employee.findMany({
          where: { employee_id: { in: recordEmployeeIds } },
          select: { employee_id: true, full_name: true },
        })
      : [];
    const employeeNames = new Map(
      employees.map((employee) => [employee.employee_id, employee.full_name]),
    );

    return NextResponse.json(
      {
        success: true,
        month,
        scope,
        attendance: records.map((record) => ({
          ...record,
          employee_name: employeeNames.get(record.employee_id) ?? null,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/v1/attendance failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load attendance data." },
      { status: 500 },
    );
  }
}
