
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/server";

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

  const secret = getSessionSecret();
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    ({ payload } = await jwtVerify(token, secret));
  } catch {
    return invalidSession();
  }

  if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
    return invalidSession();
  }
  return getSessionUser(payload.sub, payload.role);
}

async function getSessionUser(username: string, role: string) {
  const user = await prisma.demoUser.findUnique({
    where: { username },
  });

  if (
    !user ||
    !user.is_active ||
    user.role !== role ||
    !user.employee_id ||
    !["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(user.role ?? "")
  ) {
    return invalidSession();
  }

  const employee = await prisma.employee.findUnique({
    where: { employee_id: user.employee_id },
    select: { is_active: true },
  });
  if (!employee?.is_active) return invalidSession();

  return NextResponse.json({
    success: true,
    user: {
      username: user.username,
      name: user.full_name,
      employeeId: user.employee_id,
      role: user.role,
    },
  });
}

function invalidSession() {
  const response = NextResponse.json(
    {
      success: false,
      message: "Invalid or expired session.",
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
