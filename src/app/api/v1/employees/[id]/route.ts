
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/server";

const SESSION_COOKIE = "horizon_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured correctly.");
  }

  return new TextEncoder().encode(secret);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify the login session
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, getSessionSecret());

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid session." },
        { status: 401 }
      );
    }

    // 2. Confirm the user is still active
    const user = await prisma.demoUser.findUnique({
      where: { username: payload.sub },
      select: {
        username: true,
        role: true,
        is_active: true,
        employee_id: true,
      },
    });

    const allowedRoles = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

    if (
      !user ||
      !user.is_active ||
      user.role !== payload.role ||
      !user.employee_id ||
      !allowedRoles.includes(user.role ?? "")
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid session." },
        { status: 401 }
      );
    }

    const employeeAccount = await prisma.employee.findUnique({ where: { employee_id: user.employee_id }, select: { is_active: true } });
    if (!employeeAccount?.is_active) return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });

    // 3. Read the requested employee ID
    const { id } = await context.params;

    if (!id || id.length > 100) {
      return NextResponse.json(
        { success: false, message: "Invalid employee ID." },
        { status: 400 }
      );
    }

    // 4. Return only approved employee fields
    const employee = await prisma.employee.findUnique({
      where: { employee_id: id },
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
