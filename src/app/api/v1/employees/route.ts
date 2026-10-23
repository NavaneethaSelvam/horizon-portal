
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
    // 1. Read the session cookie.
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // 2. Verify the session token.
    const { payload } = await jwtVerify(
      token,
      getSessionSecret()
    );

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session.",
        },
        { status: 401 }
      );
    }

    // 3. Confirm the account is still active
    // and its current role matches the session.
    const user = await prisma.demoUser.findUnique({
      where: { username: payload.sub },
      select: {
        username: true,
        role: true,
        is_active: true,
      },
    });

    const allowedRoles = [
      "ADMIN",
      "HR",
      "MANAGER",
      "EMPLOYEE",
    ];

    if (
      !user ||
      !user.is_active ||
      user.role !== payload.role ||
      !allowedRoles.includes(user.role ?? "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Your session is no longer valid.",
        },
        { status: 401 }
      );
    }

    // 4. Only authenticated, active users reach this query.
    const employees = await prisma.employee.findMany({
      take: 25,
      orderBy: {
        employee_id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Employees API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to authenticate or fetch employees.",
      },
      { status: 401 }
    );
  }
}
