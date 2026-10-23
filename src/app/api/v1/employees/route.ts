
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const SESSION_COOKIE = "horizon_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured correctly.");
  }

  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
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

    const user = await prisma.demoUser.findUnique({
      where: { username: payload.sub },
      select: {
        username: true,
        role: true,
        is_active: true,
      },
    });

    const allowedRoles = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

    if (
      !user ||
      !user.is_active ||
      user.role !== payload.role ||
      !allowedRoles.includes(user.role ?? "")
    ) {
      return NextResponse.json(
        { success: false, message: "Your session is no longer valid." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") ?? "").trim().slice(0, 100);
    const departmentId = (
      searchParams.get("department") ?? ""
    ).trim().slice(0, 100);

    const requestedPage = Number(searchParams.get("page") ?? "1");
    const requestedLimit = Number(searchParams.get("limit") ?? "10");

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 10;

    
const where = {
  ...(search
    ? {
        OR: [
          {
            employee_id: {
              contains: search,
            },
          },
          {
            full_name: {
              contains: search,
            },
          },
          {
            work_email: {
              contains: search,
            },
          },
        ],
      }
    : {}),
  ...(departmentId ? { department_id: departmentId } : {}),
};

    const [employees, total, departments] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { employee_id: "asc" },
        select: {
          employee_id: true,
          full_name: true,
          work_email: true,
          department: {
            select: {
              department_id: true,
              department_name: true,
            },
          },
          role: {
            select: {
              role_title: true,
              level: true,
            },
          },
          work_location: true,
          work_mode: true,
          employment_type: true,
          hire_date: true,
          manager: {
            select: {
              employee_id: true,
              full_name: true,
            },
          },
        },
      }),
      prisma.employee.count({ where }),
      prisma.department.findMany({
        orderBy: { department_name: "asc" },
        select: {
          department_id: true,
          department_name: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      departments,
    });
  } catch (error) {
    console.error("Employees API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to authenticate or fetch employees.",
      },
      { status: 500 }
    );
  }
}
