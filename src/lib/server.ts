import { Prisma, PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type SessionUser = { username: string; employeeId: string; role: string };

export async function getUser(request: NextRequest): Promise<SessionUser | null> {
  return getUserFromToken(request.cookies.get("horizon_session")?.value);
}

export async function getUserFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  let username: string;
  let role: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.role !== "string") return null;
    username = payload.sub;
    role = payload.role;
  } catch { return null; }
  const user = await prisma.demoUser.findUnique({ where: { username } });
  if (!user?.is_active || !user.employee_id || user.role !== role) return null;
  const employee = await prisma.employee.findUnique({ where: { employee_id: user.employee_id }, select: { is_active: true } });
  if (!employee?.is_active) return null;
  return { username: user.username, employeeId: user.employee_id, role: user.role ?? "" };
}

export function unauthorized() { return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 }); }
export function forbidden() { return NextResponse.json({ success: false, message: "You do not have permission to perform this action." }, { status: 403 }); }

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function managerAssignedEmployeeIds(managerId: string, client: DbClient = prisma): Promise<string[]> {
  const [reports, teams] = await Promise.all([
    client.employee.findMany({ where: { manager_id: managerId }, select: { employee_id: true } }),
    client.team.findMany({ where: { team_lead_employee_id: managerId }, select: { team_id: true } }),
  ]);
  const tasks = teams.length ? await client.task.findMany({
    where: { team_id: { in: teams.map((team) => team.team_id) }, assignee_employee_id: { not: null } },
    select: { assignee_employee_id: true }, distinct: ["assignee_employee_id"],
  }) : [];
  return [...new Set([...reports.map((row) => row.employee_id), ...tasks.map((row) => row.assignee_employee_id).filter((id): id is string => Boolean(id))])];
}

export async function notify(userId: string, title: string, message: string, idempotencyKey?: string, client: DbClient = prisma) {
  const data = {
    notification_id: crypto.randomUUID(), user_id: userId, title, message,
    created_at: new Date().toISOString(), ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  };
  return idempotencyKey
    ? client.notification.upsert({ where: { idempotency_key: idempotencyKey }, create: data, update: {} })
    : client.notification.create({ data });
}
