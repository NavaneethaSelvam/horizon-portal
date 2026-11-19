
import { NextRequest, NextResponse } from "next/server";
import { forbidden, getUser, prisma, unauthorized } from "@/lib/server";
import { idSchema, validationError } from "@/lib/validation";
import { securityEvent } from "@/lib/security";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) return unauthorized();
    const { id } = await context.params;
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return validationError("Invalid employee ID.");
    const canViewAny = user.role === "ADMIN" || user.role === "HR";
    const isSelf = user.employeeId === parsedId.data;
    const isDirectReport = user.role === "MANAGER" && Boolean(await prisma.employee.findFirst({ where: { employee_id: parsedId.data, manager_id: user.employeeId }, select: { employee_id: true } }));
    if (!canViewAny && !isSelf && !isDirectReport) {
      securityEvent("forbidden_employee_profile_access", { actorEmployeeId: user.employeeId, targetEmployeeId: parsedId.data, role: user.role });
      return forbidden();
    }

    // 4. Return only approved employee fields
    const employee = await prisma.employee.findUnique({
      where: { employee_id: parsedId.data },
      select: {
        employee_id: true,
        full_name: true,
        work_email: true,
        work_location: true,
        work_mode: true,
        employment_type: true,
        hire_date: true,

        department: {
          select: {
            department_id: true,
            department_name: true,
          },
        },

        role: {
          select: {
            role_id: true,
            role_title: true,
            level: true,
            grade: true,
          },
        },

        manager: {
          select: {
            employee_id: true,
            full_name: true,
            work_email: true,

            department: {
              select: {
                department_name: true,
              },
            },

            role: {
              select: {
                role_title: true,
              },
            },

            manager: {
              select: {
                employee_id: true,
                full_name: true,
                role: {
                  select: {
                    role_title: true,
                  },
                },
              },
            },
          },
        },

        direct_reports: {
          orderBy: { full_name: "asc" },
          select: {
            employee_id: true,
            full_name: true,
            work_email: true,

            department: {
              select: {
                department_name: true,
              },
            },

            role: {
              select: {
                role_title: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Employee detail API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch employee details.",
      },
      { status: 500 }
    );
  }
}
