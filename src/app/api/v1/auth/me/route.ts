
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

const SESSION_COOKIE = "horizon_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is not configured correctly."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      getSessionSecret()
    );

    if (typeof payload.sub !== "string") {
      const response = NextResponse.json(
        {
          success: false,
          message: "Invalid session.",
        },
        { status: 401 }
      );

      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    // Check the latest account status and role in the database.
    const user = await prisma.demoUser.findUnique({
      where: { username: payload.sub },
    });

    if (
      !user ||
      !user.is_active ||
      user.role !== payload.role
    ) {
      const response = NextResponse.json(
        {
          success: false,
          message: "Session is no longer valid.",
        },
        { status: 401 }
      );

      // Clear the session cookie when the session is invalid.
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        name: user.full_name,
        employeeId: user.employee_id,
        role: user.role,
      },
    });
  } catch {
    const response = NextResponse.json(
      {
        success: false,
        message: "Invalid or expired session.",
      },
      { status: 401 }
    );

    // Clear an invalid or expired session cookie.
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}
