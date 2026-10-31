
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "horizon_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const pathname = request.nextUrl.pathname;
    const role = String(payload.role);
    const accessRules: { prefix: string; roles: string[] }[] = [
      { prefix: "/admin", roles: ["ADMIN", "HR"] },
      { prefix: "/audit-history", roles: ["ADMIN", "HR"] },
      { prefix: "/approvals", roles: ["ADMIN", "HR", "MANAGER"] },
      { prefix: "/payroll", roles: ["ADMIN", "HR"] },
      { prefix: "/finance", roles: ["ADMIN"] },
      { prefix: "/team-board", roles: ["ADMIN", "MANAGER"] },
      { prefix: "/insights", roles: ["ADMIN", "HR", "MANAGER"] },
    ];
    const denied = accessRules.find(({ prefix, roles }) =>
      (pathname === prefix || pathname.startsWith(`${prefix}/`)) && !roles.includes(role)
    );
    if (denied) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/profile/:path*",
    "/leave/:path*",
    "/attendance/:path*",
    "/payroll/:path*",
    "/payslips/:path*",
    "/notifications/:path*",
    "/approvals/:path*",
    "/admin/:path*",
    "/audit-history/:path*",
    "/finance/:path*",
    "/team-board/:path*",
    "/insights/:path*",
  ],
};
