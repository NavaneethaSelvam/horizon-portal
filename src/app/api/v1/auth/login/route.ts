
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/server";

const SESSION_COOKIE = "horizon_session";
const SESSION_DURATION = 60 * 60 * 8; // 8 hours

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.demoUser.findUnique({
      where: { username },
    });

    // Reject unknown, inactive, or incorrectly authenticated users.
    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    if (!user.employee_id) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employee_id: user.employee_id },
      select: { is_active: true },
    });
    if (!employee?.is_active) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Only allow the four supported roles.
    if (
      !["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(
        user.role ?? ""
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This account has an invalid role.",
        },
        { status: 403 }
      );
    }

    const token = await new SignJWT({
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.username)
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(getSessionSecret());

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        username: user.username,
        name: user.full_name,
        employeeId: user.employee_id,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login right now.",
      },
      { status: 500 }
    );
  }
}
