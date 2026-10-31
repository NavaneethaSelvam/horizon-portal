import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const secret = "integration-test-secret-that-is-at-least-32-chars";
const dbName = `.phase2-integration-${process.pid}-${Date.now()}.db`;
const dbFile = path.join(process.cwd(), "prisma", dbName);
process.env.DATABASE_URL = `file:./${dbName}`;
process.env.SESSION_SECRET = secret;

let db: import("@prisma/client").PrismaClient;
let api: {
  leave: typeof import("../src/app/api/v1/leave/route");
  attendance: typeof import("../src/app/api/v1/attendance/route");
  leaveItem: typeof import("../src/app/api/v1/leave/[id]/route");
  approvals: typeof import("../src/app/api/v1/approvals/route");
  notifications: typeof import("../src/app/api/v1/notifications/route");
  read: typeof import("../src/app/api/v1/notifications/[id]/read/route");
  payslips: typeof import("../src/app/api/v1/payslips/route");
  payslip: typeof import("../src/app/api/v1/payslips/[run_id]/route");
  admin: typeof import("../src/app/api/v1/admin/employees/route");
  auditHistory: typeof import("../src/app/api/v1/admin/audit-history/route");
  employee: typeof import("../src/app/api/v1/admin/employees/[id]/route");
  server: typeof import("../src/lib/server");
  middleware: typeof import("../src/middleware");
  directory: typeof import("../src/app/api/v1/employees/route");
  employeeDetail: typeof import("../src/app/api/v1/employees/[id]/route");
  login: typeof import("../src/app/api/v1/auth/login/route");
  me: typeof import("../src/app/api/v1/auth/me/route");
  logout: typeof import("../src/app/api/v1/auth/logout/route");
};

before(async () => {
  const python = process.platform === "win32" ? "python" : "python3";
  const bootstrap = path.join(process.cwd(), "tests", "bootstrap-migration-db.py");
  execFileSync(python, [bootstrap, dbFile, path.join(process.cwd(), "prisma", "migrations")], { stdio: "pipe" });
  const cli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [cli, "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }, stdio: "pipe" });
  const { PrismaClient } = await import("@prisma/client");
  db = new PrismaClient();
  await db.department.create({ data: { department_id: "D-TEST", department_name: "Test" } });
  await db.role.create({ data: { role_id: "R-TEST", department_id: "D-TEST", role_title: "Test role" } });
  await db.employee.createMany({ data: [
    { employee_id: "E-A", full_name: "Employee A", work_email: "a@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-1" },
    { employee_id: "E-B", full_name: "Employee B", work_email: "b@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-1" },
    { employee_id: "E-OUT", full_name: "Outside Employee", work_email: "out@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-2" },
    { employee_id: "E-T1", full_name: "Task Team One", work_email: "t1@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-2" },
    { employee_id: "E-T2", full_name: "Task Team Two", work_email: "t2@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-2" },
    { employee_id: "M-1", full_name: "Manager One", work_email: "m1@example.test", role_id: "R-TEST", department_id: "D-TEST", manager_id: "M-2" },
    { employee_id: "M-2", full_name: "Manager Two", work_email: "m2@example.test", role_id: "R-TEST", department_id: "D-TEST" },
    { employee_id: "H-1", full_name: "HR User", work_email: "hr@example.test", role_id: "R-TEST", department_id: "D-TEST" },
    { employee_id: "A-1", full_name: "Admin User", work_email: "admin@example.test", role_id: "R-TEST", department_id: "D-TEST" },
  ] });
  const passwordHash = await bcrypt.hash("IntegrationPass123!", 4);
  await db.demoUser.createMany({ data: [
    ["a", "E-A", "EMPLOYEE"], ["b", "E-B", "EMPLOYEE"], ["outside", "E-OUT", "EMPLOYEE"],
    ["m1", "M-1", "MANAGER"], ["m2", "M-2", "MANAGER"], ["hr", "H-1", "HR"], ["admin", "A-1", "ADMIN"],
  ].map(([username, employee_id, role]) => ({ username, employee_id, role, password_hash: passwordHash })) });
  await db.leaveType.createMany({ data: [
    { leave_type_code: "CL", leave_type_name: "Casual Leave", pay_type: "Paid" },
    { leave_type_code: "BL", leave_type_name: "Bereavement Leave", pay_type: "Paid" },
    { leave_type_code: "ML", leave_type_name: "Maternity Leave", pay_type: "Paid" },
    { leave_type_code: "LOP", leave_type_name: "Loss of Pay", pay_type: "Unpaid" },
  ] });
  for (const employee_id of ["E-A", "E-B", "E-OUT", "E-T1", "E-T2"]) await db.leaveBalance.create({ data: { employee_id, as_of_date: "2026-10-27", financial_year: "FY26", cl_entitlement: 5, cl_used: 0, cl_balance: 5, sl_entitlement: 0, sl_used: 0, sl_balance: 0, el_used_fy: 0, el_balance: 0, pending_days: employee_id === "E-A" ? 3 : 0 } });
  await db.leaveRequest.createMany({ data: [
    { leave_request_id: "LR-A", employee_id: "E-A", leave_type_code: "CL", start_date: "2026-12-02", end_date: "2026-12-03", days: 2, status: "Pending", applied_on: "2026-10-27", balance_reserved: true },
    { leave_request_id: "LR-REJECT", employee_id: "E-A", leave_type_code: "CL", start_date: "2026-12-04", end_date: "2026-12-04", days: 1, status: "Pending", applied_on: "2026-10-27", balance_reserved: true },
    { leave_request_id: "LR-OUT", employee_id: "E-OUT", leave_type_code: "CL", start_date: "2026-12-05", end_date: "2026-12-05", days: 1, status: "Pending", applied_on: "2026-10-27" },
    { leave_request_id: "LR-OWN", employee_id: "M-1", leave_type_code: "LOP", start_date: "2026-12-06", end_date: "2026-12-06", days: 1, status: "Pending", applied_on: "2026-10-27" },
    { leave_request_id: "LR-T1", employee_id: "E-T1", leave_type_code: "LOP", start_date: "2026-12-07", end_date: "2026-12-07", days: 1, status: "Pending", applied_on: "2026-10-27" },
    { leave_request_id: "LR-T2", employee_id: "E-T2", leave_type_code: "LOP", start_date: "2026-12-08", end_date: "2026-12-08", days: 1, status: "Pending", applied_on: "2026-10-27" },
    { leave_request_id: "LR-CONCURRENT", employee_id: "E-B", leave_type_code: "LOP", start_date: "2026-12-09", end_date: "2026-12-09", days: 1, status: "Pending", applied_on: "2026-10-27" },
  ] });
  await db.notification.createMany({ data: [
    { notification_id: "N-A", user_id: "E-A", title: "Private A", message: "For A", created_at: "2026-10-27T00:00:00.000Z" },
    { notification_id: "N-B", user_id: "E-B", title: "Private B", message: "For B", created_at: "2026-10-27T00:00:00.000Z" },
  ] });
  await db.payrollRun.create({ data: { run_id: "RUN-1", status: "Completed" } });
  await db.payrollRun.create({ data: { run_id: "RUN-B", status: "Completed" } });
  await db.payslip.createMany({ data: [
    { payroll_item_id: "P-A", run_id: "RUN-1", employee_id: "E-A", gross_pay: 100, total_deductions: 10, net_pay: 90 },
    { payroll_item_id: "P-B", run_id: "RUN-1", employee_id: "E-B", gross_pay: 200, total_deductions: 20, net_pay: 180 },
    { payroll_item_id: "P-B-ONLY", run_id: "RUN-B", employee_id: "E-B", gross_pay: 200, total_deductions: 20, net_pay: 180 },
  ] });
  await db.sprint.create({ data: { sprint_id: "S-1", sprint_name: "Test" } });
  await db.team.createMany({ data: [
    { team_id: "T-1", team_name: "Team One", team_lead_employee_id: "M-1" },
    { team_id: "T-2", team_name: "Team Two", team_lead_employee_id: "M-1" },
  ] });
  await db.task.createMany({ data: [
    { task_id: "TASK-1", team_id: "T-1", sprint_id: "S-1", assignee_employee_id: "E-T1" },
    { task_id: "TASK-2", team_id: "T-2", sprint_id: "S-1", assignee_employee_id: "E-T2" },
  ] });
  await db.attendanceMonthly.createMany({ data: [
    { employee_id: "E-A", period_end_date: "2026-10-31", scheduled_days: 22, present_days: 20, attendance_rate: 0.91 },
    { employee_id: "E-OUT", period_end_date: "2026-10-31", scheduled_days: 22, present_days: 21, attendance_rate: 0.95 },
    { employee_id: "E-A", period_end_date: "2026-11-30", scheduled_days: 20, present_days: 19, attendance_rate: 0.95 },
  ] });
  api = {
    leave: await import("../src/app/api/v1/leave/route"),
    attendance: await import("../src/app/api/v1/attendance/route"),
    leaveItem: await import("../src/app/api/v1/leave/[id]/route"),
    approvals: await import("../src/app/api/v1/approvals/route"),
    notifications: await import("../src/app/api/v1/notifications/route"),
    read: await import("../src/app/api/v1/notifications/[id]/read/route"),
    payslips: await import("../src/app/api/v1/payslips/route"),
    payslip: await import("../src/app/api/v1/payslips/[run_id]/route"),
    admin: await import("../src/app/api/v1/admin/employees/route"),
    auditHistory: await import("../src/app/api/v1/admin/audit-history/route"),
    employee: await import("../src/app/api/v1/admin/employees/[id]/route"),
    server: await import("../src/lib/server"),
    middleware: await import("../src/middleware"),
    directory: await import("../src/app/api/v1/employees/route"),
    employeeDetail: await import("../src/app/api/v1/employees/[id]/route"),
    login: await import("../src/app/api/v1/auth/login/route"),
    me: await import("../src/app/api/v1/auth/me/route"),
    logout: await import("../src/app/api/v1/auth/logout/route"),
  };
});

after(async () => {
  if (db) await db.$disconnect();
  if (api?.server) await api.server.prisma.$disconnect();
  for (const suffix of ["", "-journal", "-shm", "-wal"]) fs.rmSync(`${dbFile}${suffix}`, { force: true });
});

async function request(user: string | null, role: string | null, method = "GET", body?: unknown, url = "http://localhost/api/test") {
  const headers = new Headers({ "content-type": "application/json" });
  if (user && role) {
    const token = await new SignJWT({ role }).setProtectedHeader({ alg: "HS256" }).setSubject(user).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));
    headers.set("cookie", `horizon_session=${token}`);
  }
  return new NextRequest(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

test("protected endpoints return 401 without a verified session", async () => {
  for (const handler of [api.leave.GET, api.attendance.GET, api.notifications.GET, api.payslips.GET, api.admin.GET, api.approvals.GET, api.directory.GET]) {
    assert.equal((await handler(await request(null, null))).status, 401);
  }
  assert.equal((await api.leave.POST(await request(null, null, "POST", { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-10", reason: "Unauthenticated" }))).status, 401);
  assert.equal((await api.leaveItem.PATCH(await request(null, null, "PATCH"), { params: Promise.resolve({ id: "LR-A" }) })).status, 401);
  assert.equal((await api.employeeDetail.GET(await request(null, null), { params: Promise.resolve({ id: "E-A" }) })).status, 401);
});

test("all four roles can authenticate; invalid credentials are rejected and logout clears the cookie", async () => {
  for (const [username, role] of [["a", "EMPLOYEE"], ["m1", "MANAGER"], ["hr", "HR"], ["admin", "ADMIN"]]) {
    const response = await api.login.POST(new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password: "IntegrationPass123!" }),
    }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, role);
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
  }
  const wrongPassword = await api.login.POST(new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "a", password: "wrong" }),
  }));
  assert.equal(wrongPassword.status, 401);
  const missingFields = await api.login.POST(new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "a" }),
  }));
  assert.equal(missingFields.status, 400);
  await db.demoUser.create({
    data: {
      username: "orphan",
      employee_id: null,
      role: "EMPLOYEE",
      password_hash: await bcrypt.hash("IntegrationPass123!", 4),
    },
  });
  const unlinkedAccount = await api.login.POST(new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "orphan", password: "IntegrationPass123!" }),
  }));
  assert.equal(unlinkedAccount.status, 401);
  assert.equal((await api.me.GET(await request("a", "EMPLOYEE"))).status, 200);
  const logout = await api.logout.POST();
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
});

test("employee profile and directory APIs return safe, authenticated data", async () => {
  const detail = await api.employeeDetail.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ id: "E-A" }) });
  assert.equal(detail.status, 200);
  const employee = (await detail.json()).data;
  assert.equal(employee.employee_id, "E-A");
  assert.equal(employee.full_name, "Employee A");
  assert.equal(employee.manager.full_name, "Manager One");
  assert.equal(employee.manager.manager.full_name, "Manager Two");
  assert.equal(Object.keys(employee).some((key) => /salary|pay|wage/i.test(key)), false);
  assert.equal((await api.employeeDetail.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ id: "E-OUT" }) })).status, 200);
  assert.equal((await api.employeeDetail.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ id: "MISSING" }) })).status, 404);

  const directory = await api.directory.GET(await request("a", "EMPLOYEE"));
  assert.equal(directory.status, 200);
  const result = await directory.json();
  assert.equal(result.data.some((row: Record<string, unknown>) => Object.keys(row).some((key) => /salary|pay|wage/i.test(key))), false);
});

test("employees receive only their own leave, notifications and payslips", async () => {
  const leave = await api.leave.GET(await request("a", "EMPLOYEE"));
  assert.deepEqual((await leave.json()).requests.map((row: { employee_id?: string }) => row.employee_id), ["E-A", "E-A"]);
  const ownNotifications = await api.notifications.GET(await request("a", "EMPLOYEE"));
  assert.deepEqual((await ownNotifications.json()).notifications.map((row: { notification_id: string }) => row.notification_id), ["N-A"]);
  const own = await api.payslips.GET(await request("a", "EMPLOYEE"));
  assert.deepEqual((await own.json()).data.map((row: { payroll_item_id: string }) => row.payroll_item_id), ["P-A"]);
  const ownerDetail = await api.payslip.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ run_id: "RUN-1" }) });
  assert.equal((await ownerDetail.json()).data.payroll_item_id, "P-A");
  assert.equal((await api.payslips.GET(new NextRequest("http://localhost/api/v1/payslips?employee_id=E-B", { headers: { cookie: `horizon_session=${await tokenFor("a", "EMPLOYEE")}` } }))).status, 403);
  assert.equal((await api.payslip.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ run_id: "RUN-B" }) })).status, 403);
  assert.equal((await api.payslip.GET(await request("a", "EMPLOYEE"), { params: Promise.resolve({ run_id: "MISSING" }) })).status, 404);
  const privateRead = await api.read.POST(await request("a", "EMPLOYEE", "POST"), { params: Promise.resolve({ id: "N-B" }) });
  assert.equal(privateRead.status, 404);
  assert.equal((await api.read.POST(await request("a", "EMPLOYEE", "POST"), { params: Promise.resolve({ id: "N-A" }) })).status, 200);
  const readAfterRefresh = await api.notifications.GET(await request("a", "EMPLOYEE"));
  const readState = await readAfterRefresh.json();
  assert.equal(readState.unread, 0);
  assert.equal(readState.notifications[0].is_read, true);
  const after = await api.notifications.GET(await request("b", "EMPLOYEE"));
  assert.equal((await after.json()).notifications[0].is_read, false);
});

async function tokenFor(username: string, role: string) {
  return new SignJWT({ role }).setProtectedHeader({ alg: "HS256" }).setSubject(username).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));
}

test("Employee role is denied from every HR/Admin employee API", async () => {
  assert.equal((await api.admin.GET(await request("a", "EMPLOYEE"))).status, 403);
  assert.equal((await api.admin.POST(await request("a", "EMPLOYEE", "POST", { employee_id: "E-X", full_name: "X", work_email: "x@example.test" }))).status, 403);
  assert.equal((await api.employee.PATCH(await request("a", "EMPLOYEE", "PATCH", { full_name: "Changed" }), { params: Promise.resolve({ id: "E-A" }) })).status, 403);
  assert.equal((await api.approvals.GET(await request("a", "EMPLOYEE"))).status, 403);
  assert.equal((await api.approvals.POST(await request("a", "EMPLOYEE", "POST", { request_id: "LR-A", decision: "approve" }))).status, 403);
});

test("admin, audit, approval and operational pages are role-gated in middleware", async () => {
  for (const pathname of ["/admin", "/audit-history", "/approvals", "/payroll", "/finance", "/insights", "/team-board"]) {
    const response = await api.middleware.middleware(
      await request("a", "EMPLOYEE", "GET", undefined, `http://localhost${pathname}`)
    );
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `http://localhost/`);
  }
  assert.equal((await api.middleware.middleware(await request("m1", "MANAGER", "GET", undefined, "http://localhost/approvals"))).status, 200);
  assert.equal((await api.middleware.middleware(await request("hr", "HR", "GET", undefined, "http://localhost/admin"))).status, 200);
  assert.equal((await api.middleware.middleware(await request("admin", "ADMIN", "GET", undefined, "http://localhost/audit-history"))).status, 200);
  assert.equal((await api.middleware.middleware(await request("hr", "HR", "GET", undefined, "http://localhost/audit-history"))).status, 200);
  const financeDenied = await api.middleware.middleware(await request("hr", "HR", "GET", undefined, "http://localhost/finance"));
  assert.equal(financeDenied.status, 307);
  assert.equal(financeDenied.headers.get("location"), "http://localhost/");
  assert.equal((await api.middleware.middleware(await request("m1", "MANAGER", "GET", undefined, "http://localhost/team-board"))).status, 200);
  assert.equal((await api.middleware.middleware(await request("hr", "HR", "GET", undefined, "http://localhost/payroll"))).status, 200);
  assert.equal((await api.middleware.middleware(await request("admin", "ADMIN", "GET", undefined, "http://localhost/finance"))).status, 200);
});

test("managers see direct reports and all assigned teams, and cannot decide outside scope", async () => {
  const queue = await api.approvals.GET(await request("m1", "MANAGER"));
  const queueData = await queue.json();
  assert.equal(queueData.actor_employee_id, "M-1");
  const ids = queueData.requests.map((row: { leave_request_id: string }) => row.leave_request_id);
  assert.deepEqual(ids.sort(), ["LR-A", "LR-REJECT", "LR-T1", "LR-T2", "LR-CONCURRENT"].sort());
  const hrQueue = await api.approvals.GET(await request("hr", "HR"));
  assert.ok((await hrQueue.json()).requests.some((row: { leave_request_id: string }) => row.leave_request_id === "LR-OUT"));
  const monthly = await api.approvals.GET(await request("m1", "MANAGER", "GET", undefined, "http://localhost/api/v1/approvals?month=2026-10"));
  assert.deepEqual((await monthly.json()).attendance.map((row: { employee_id: string; period_end_date: string }) => `${row.employee_id}:${row.period_end_date}`), ["E-A:2026-10-31"]);
  assert.equal((await api.approvals.GET(await request("m1", "MANAGER", "GET", undefined, "http://localhost/api/v1/approvals?month=2026-99"))).status, 400);
  const outside = await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-OUT", decision: "approve" }));
  assert.equal(outside.status, 403);
  const self = await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-OWN", decision: "approve" }));
  assert.equal(self.status, 403);
});

test("attendance is month-filtered and scoped for employees, managers, HR and Admin", async () => {
  const endpoint = "http://localhost/api/v1/attendance";
  const unauthenticated = await api.attendance.GET(await request(null, null, "GET", undefined, `${endpoint}?month=2026-10`));
  assert.equal(unauthenticated.status, 401);

  const employee = await api.attendance.GET(await request("a", "EMPLOYEE", "GET", undefined, `${endpoint}?month=2026-10&employee_id=E-OUT`));
  const employeeData = await employee.json();
  assert.equal(employee.status, 200);
  assert.equal(employeeData.scope, "employee");
  assert.deepEqual(employeeData.attendance.map((row: { employee_id: string }) => row.employee_id), ["E-A"]);
  assert.equal(employeeData.attendance[0].employee_name, "Employee A");

  const otherMonth = await api.attendance.GET(await request("a", "EMPLOYEE", "GET", undefined, `${endpoint}?month=2026-11`));
  assert.deepEqual((await otherMonth.json()).attendance.map((row: { period_end_date: string }) => row.period_end_date), ["2026-11-30"]);
  const noRecords = await api.attendance.GET(await request("b", "EMPLOYEE", "GET", undefined, `${endpoint}?month=2026-12`));
  assert.deepEqual((await noRecords.json()).attendance, []);
  assert.equal((await api.attendance.GET(await request("a", "EMPLOYEE", "GET", undefined, `${endpoint}?month=2026-99`))).status, 400);

  await db.attendanceMonthly.create({
    data: { employee_id: "E-T1", period_end_date: "2026-10-31", scheduled_days: 22, present_days: 18 },
  });
  const manager = await api.attendance.GET(await request("m1", "MANAGER", "GET", undefined, `${endpoint}?month=2026-10&employee_id=E-OUT`));
  const managerData = await manager.json();
  assert.equal(manager.status, 200);
  assert.equal(managerData.scope, "team");
  assert.deepEqual(
    managerData.attendance.map((row: { employee_id: string }) => row.employee_id),
    ["E-A", "E-T1"],
  );

  for (const [username, role] of [["hr", "HR"], ["admin", "ADMIN"]]) {
    const response = await api.attendance.GET(await request(username, role, "GET", undefined, `${endpoint}?month=2026-10`));
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.scope, "organization");
    assert.ok(result.attendance.some((row: { employee_id: string }) => row.employee_id === "E-OUT"));
    assert.ok(result.attendance.some((row: { employee_id: string }) => row.employee_id === "E-T1"));
  }
});

test("leave applications reserve balance, reject overlap/insufficient balance, and unsupported paid leave is safe", async () => {
  const endpoint = "http://localhost/api/v1/leave";
  const missingType = await api.leave.POST(await request("a", "EMPLOYEE", "POST", { start_date: "2026-12-10", end_date: "2026-12-10", reason: "Trip" }, endpoint));
  assert.equal(missingType.status, 400);
  assert.match((await missingType.json()).message, /leave type/i);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-02-30", end_date: "2026-03-01", reason: "Trip" }, endpoint))).status, 400);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-11", end_date: "2026-12-10", reason: "Trip" }, endpoint))).status, 400);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-10", reason: "   " }, endpoint))).status, 400);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-10", reason: "x".repeat(1001) }, endpoint))).status, 400);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "UNKNOWN", start_date: "2026-12-10", end_date: "2026-12-10", reason: "Trip" }, endpoint))).status, 400);
  const submitted = await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-11", reason: "Trip" }));
  assert.equal(submitted.status, 201);
  const created = (await submitted.json()).request;
  assert.equal(created.employee_id, "E-A");
  assert.equal(created.status, "Pending");
  assert.equal(created.days, 2);
  assert.equal(created.leave_type.leave_type_name, "Casual Leave");
  assert.ok(await db.notification.findFirst({ where: { user_id: "E-A", idempotency_key: `leave-submitted:${created.leave_request_id}` } }));
  const history = await api.leave.GET(await request("a", "EMPLOYEE", "GET", undefined, `${endpoint}?employee_id=E-B`));
  const persisted = (await history.json()).requests.find((row: { leave_request_id: string }) => row.leave_request_id === created.leave_request_id);
  assert.equal(persisted?.employee_id, "E-A");
  const otherEmployeeHistory = await api.leave.GET(await request("b", "EMPLOYEE", "GET", undefined, `${endpoint}?employee_id=E-A`));
  assert.ok(!(await otherEmployeeHistory.json()).requests.some((row: { leave_request_id: string }) => row.leave_request_id === created.leave_request_id));
  assert.equal((await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } })).pending_days, 5);
  const duplicate = await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-11", reason: "Duplicate dates" }));
  assert.equal(duplicate.status, 409);
  assert.ok((await duplicate.json()).request_id === created.leave_request_id);
  assert.equal((await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "CL", start_date: "2026-12-14", end_date: "2026-12-17", reason: "Too long" }))).status, 409);
  const beforeUnsupportedPaidLeave = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } });
  const unsupportedPaidLeave = await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "ML", start_date: "2026-12-10", end_date: "2026-12-11", reason: "Medical" }));
  assert.equal(unsupportedPaidLeave.status, 409);
  assert.match((await unsupportedPaidLeave.json()).message, /balance is not configured/i);
  assert.equal(await db.leaveRequest.count({ where: { employee_id: "E-A", leave_type_code: "ML" } }), 0);
  const missingBereavementBalance = await api.leave.POST(await request("a", "EMPLOYEE", "POST", { leave_type_code: "BL", start_date: "2026-12-10", end_date: "2026-12-11", reason: "Verification" }));
  assert.equal(missingBereavementBalance.status, 409);
  assert.match((await missingBereavementBalance.json()).message, /Bereavement Leave/);
  assert.equal(await db.leaveRequest.count({ where: { employee_id: "E-A", leave_type_code: "BL" } }), 0);
  const afterUnsupportedPaidLeave = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } });
  assert.deepEqual(
    [afterUnsupportedPaidLeave.cl_balance, afterUnsupportedPaidLeave.sl_balance, afterUnsupportedPaidLeave.el_balance, afterUnsupportedPaidLeave.pending_days],
    [beforeUnsupportedPaidLeave.cl_balance, beforeUnsupportedPaidLeave.sl_balance, beforeUnsupportedPaidLeave.el_balance, beforeUnsupportedPaidLeave.pending_days],
  );
  const raceBody = { leave_type_code: "CL", start_date: "2026-12-10", end_date: "2026-12-11", reason: "Concurrent apply" };
  const simultaneous = await Promise.all([
    api.leave.POST(await request("b", "EMPLOYEE", "POST", raceBody)),
    api.leave.POST(await request("b", "EMPLOYEE", "POST", raceBody)),
  ]);
  assert.deepEqual(simultaneous.map(response => response.status).sort(), [201, 409]);
  assert.equal(await db.leaveRequest.count({ where: { employee_id: "E-B", status: "Pending", start_date: "2026-12-10" } }), 1);
  assert.equal((await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-B" } })).pending_days, 2);
});

test("paid leave application fails safely when pending reservation balance is null", async () => {
  await db.employee.create({ data: {
    employee_id: "E-PENDING-NULL",
    full_name: "Null Reservation Employee",
    work_email: "null-reservation@example.test",
    department_id: "D-TEST",
    role_id: "R-TEST",
  } });
  await db.demoUser.create({ data: {
    username: "nullpending",
    employee_id: "E-PENDING-NULL",
    role: "EMPLOYEE",
    password_hash: "test-only",
  } });
  await db.leaveBalance.create({ data: {
    employee_id: "E-PENDING-NULL",
    as_of_date: "2026-10-27",
    financial_year: "FY26",
    cl_entitlement: 5,
    cl_used: 0,
    cl_balance: 5,
    sl_entitlement: 5,
    sl_used: 0,
    sl_balance: 5,
    el_used_fy: 0,
    el_balance: 5,
    pending_days: null,
  } });

  const response = await api.leave.POST(await request("nullpending", "EMPLOYEE", "POST", {
    leave_type_code: "CL",
    start_date: "2027-03-01",
    end_date: "2027-03-01",
    reason: "Reservation configuration check",
  }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /reservation cannot be tracked/i);
  assert.equal(await db.leaveRequest.count({ where: { employee_id: "E-PENDING-NULL" } }), 0);
  const balance = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-PENDING-NULL" } });
  assert.equal(balance.cl_balance, 5);
  assert.equal(balance.pending_days, null);
});

test("approve/reject decisions update balances, notify once, and reject repeated decisions", async () => {
  const approve = await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-A", decision: "approve" }));
  assert.equal(approve.status, 200);
  const balance = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } });
  assert.equal(balance.cl_balance, 3);
  assert.equal(balance.cl_used, 2);
  assert.equal(balance.pending_days, 3);
  assert.equal(await db.notification.count({ where: { user_id: "E-A", idempotency_key: "leave-decision:LR-A" } }), 1);
  assert.equal((await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-A", decision: "approve" }))).status, 409);
  assert.equal((await db.notification.count({ where: { user_id: "E-A", idempotency_key: "leave-decision:LR-A" } })), 1);
  assert.equal((await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-REJECT", decision: "reject" }))).status, 400);
  assert.equal((await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-REJECT", decision: "reject", reason: "Coverage needs" }))).status, 200);
  assert.equal((await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } })).pending_days, 2);
  assert.equal(await db.notification.count({ where: { user_id: "E-A", idempotency_key: "leave-decision:LR-REJECT" } }), 1);
  const historyAfterDecision = await api.leave.GET(await request("a", "EMPLOYEE"));
  assert.equal((await historyAfterDecision.json()).requests.find((row: { leave_request_id: string }) => row.leave_request_id === "LR-A").status, "Approved");
  const approvalView = await api.approvals.GET(await request("m1", "MANAGER"));
  const recent = (await approvalView.json()).recent_decisions;
  assert.equal(recent.find((row: { leave_request_id: string }) => row.leave_request_id === "LR-A").status, "Approved");
  assert.equal(recent.find((row: { leave_request_id: string }) => row.leave_request_id === "LR-REJECT").status, "Rejected");
  const concurrent = await Promise.all([
    api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-CONCURRENT", decision: "approve" })),
    api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: "LR-CONCURRENT", decision: "approve" })),
  ]);
  assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
  assert.equal(await db.notification.count({ where: { user_id: "E-B", idempotency_key: "leave-decision:LR-CONCURRENT" } }), 1);
});

test("reserved leave decisions fail safely when pending days cannot be released", async () => {
  await db.employee.create({ data: {
    employee_id: "E-BROKEN-RESERVATION",
    full_name: "Untracked Reservation Employee",
    work_email: "untracked-reservation@example.test",
    department_id: "D-TEST",
    role_id: "R-TEST",
    manager_id: "M-1",
  } });
  await db.leaveBalance.create({ data: {
    employee_id: "E-BROKEN-RESERVATION",
    as_of_date: "2026-10-27",
    financial_year: "FY26",
    cl_entitlement: 5,
    cl_used: 0,
    cl_balance: 5,
    sl_entitlement: 5,
    sl_used: 0,
    sl_balance: 5,
    el_used_fy: 0,
    el_balance: 5,
    pending_days: 0,
  } });
  await db.leaveRequest.create({ data: {
    leave_request_id: "LR-BROKEN-RESERVATION",
    employee_id: "E-BROKEN-RESERVATION",
    leave_type_code: "CL",
    start_date: "2027-03-01",
    end_date: "2027-03-01",
    days: 1,
    status: "Pending",
    applied_on: "2026-10-27",
    balance_reserved: true,
  } });

  for (const decision of ["approve", "reject"] as const) {
    const response = await api.approvals.POST(await request("m1", "MANAGER", "POST", {
      request_id: "LR-BROKEN-RESERVATION",
      decision,
      reason: decision === "reject" ? "Insufficient reservation evidence" : undefined,
    }));
    assert.equal(response.status, 409);
    assert.match((await response.json()).message, /balance is not configured/i);
    const balance = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-BROKEN-RESERVATION" } });
    assert.equal(balance.cl_balance, 5);
    assert.equal(balance.pending_days, 0);
    assert.equal((await db.leaveRequest.findUniqueOrThrow({ where: { leave_request_id: "LR-BROKEN-RESERVATION" } })).status, "Pending");
    assert.equal(await db.notification.count({ where: { idempotency_key: `leave-decision:LR-BROKEN-RESERVATION` } }), 0);
  }
});

test("owners can cancel pending leave, release its reservation, and cannot cancel others or decided requests", async () => {
  // Isolate cancellation behavior from earlier balance consumption in this test file.
  await db.leaveBalance.update({ where: { employee_id_as_of_date_financial_year: { employee_id: "E-A", as_of_date: "2026-10-27", financial_year: "FY26" } }, data: { cl_balance: 10 } });
  const submitted = await api.leave.POST(await request("a", "EMPLOYEE", "POST", {
    leave_type_code: "CL", start_date: "2027-02-01", end_date: "2027-02-02", reason: "Plans changed",
  }));
  assert.equal(submitted.status, 201);
  const id = (await submitted.json()).request.leave_request_id as string;
  const before = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } });
  const otherOwner = await api.leaveItem.PATCH(await request("b", "EMPLOYEE", "PATCH"), { params: Promise.resolve({ id }) });
  assert.equal(otherOwner.status, 404);
  const cancelled = await api.leaveItem.PATCH(await request("a", "EMPLOYEE", "PATCH"), { params: Promise.resolve({ id }) });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).status, "Cancelled");
  const history = await api.leave.GET(await request("a", "EMPLOYEE"));
  assert.equal((await history.json()).requests.find((row: { leave_request_id: string }) => row.leave_request_id === id).status, "Cancelled");
  assert.equal((await db.leaveRequest.findUniqueOrThrow({ where: { leave_request_id: id } })).balance_reserved, false);
  const approvals = await api.approvals.GET(await request("m1", "MANAGER"));
  const approvalData = await approvals.json();
  assert.ok(!approvalData.requests.some((row: { leave_request_id: string }) => row.leave_request_id === id));
  assert.equal(approvalData.recent_decisions.find((row: { leave_request_id: string }) => row.leave_request_id === id).status, "Cancelled");
  const after = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-A" } });
  assert.equal(after.pending_days, (before.pending_days ?? 0) - 2);
  assert.equal(await db.notification.count({ where: { user_id: "E-A", idempotency_key: `leave-cancelled:${id}` } }), 1);
  assert.equal((await api.leaveItem.PATCH(await request("a", "EMPLOYEE", "PATCH"), { params: Promise.resolve({ id }) })).status, 409);
  assert.equal((await api.leaveItem.PATCH(await request("a", "EMPLOYEE", "PATCH"), { params: Promise.resolve({ id: "LR-A" }) })).status, 409);
});

test("Task 6 to 10 flow: employee applies, manager approves, balance and notifications update", async () => {
  const priorBalance = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-B" } });
  const apply = await api.leave.POST(await request("b", "EMPLOYEE", "POST", {
    leave_type_code: "CL", start_date: "2027-01-04", end_date: "2027-01-04", reason: "Personal appointment",
  }));
  assert.equal(apply.status, 201);
  const created = (await apply.json()).request;
  assert.equal(created.status, "Pending");
  assert.equal(created.balance_reserved, true);
  assert.equal((await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-B" } })).pending_days, (priorBalance.pending_days ?? 0) + 1);

  const queue = await api.approvals.GET(await request("m1", "MANAGER"));
  assert.ok((await queue.json()).requests.some((row: { leave_request_id: string }) => row.leave_request_id === created.leave_request_id));
  assert.equal((await api.approvals.POST(await request("m1", "MANAGER", "POST", { request_id: created.leave_request_id, decision: "approve" }))).status, 200);

  const history = await api.leave.GET(await request("b", "EMPLOYEE"));
  assert.equal((await history.json()).requests.find((row: { leave_request_id: string }) => row.leave_request_id === created.leave_request_id).status, "Approved");
  const afterBalance = await db.leaveBalance.findFirstOrThrow({ where: { employee_id: "E-B" } });
  assert.equal(afterBalance.pending_days, priorBalance.pending_days);
  assert.equal(afterBalance.cl_balance, (priorBalance.cl_balance ?? 0) - 1);
  assert.equal(afterBalance.cl_used, (priorBalance.cl_used ?? 0) + 1);
  const inbox = await api.notifications.GET(await request("b", "EMPLOYEE"));
  const titles = (await inbox.json()).notifications.map((item: { title: string }) => item.title);
  assert.ok(titles.includes("Leave request submitted"));
  assert.ok(titles.includes("Leave request approved"));
});

test("HR create and edit operations write per-field audit records", async () => {
  const invalid = await api.admin.POST(await request("hr", "HR", "POST", { employee_id: "E-BAD", full_name: "", work_email: "bad" }));
  assert.equal(invalid.status, 400);
  const invalidWorkMode = await api.admin.POST(await request("hr", "HR", "POST", { employee_id: "E-BAD-MODE", full_name: "Invalid Mode", work_email: "bad-mode@example.test", work_mode: 123 }));
  assert.equal(invalidWorkMode.status, 400);
  const invalidEmploymentType = await api.admin.POST(await request("hr", "HR", "POST", { employee_id: "E-BAD-TYPE", full_name: "Invalid Type", work_email: "bad-type@example.test", employment_type: "x".repeat(101) }));
  assert.equal(invalidEmploymentType.status, 400);
  const created = await api.admin.POST(await request("hr", "HR", "POST", { employee_id: "E-NEW", full_name: "New Person", work_email: "new@example.test", department_id: "D-TEST", work_mode: "Hybrid", employment_type: "Permanent" }));
  assert.equal(created.status, 201);
  const createdData = (await created.json()).data;
  assert.equal(createdData.work_mode, "Hybrid");
  assert.equal(createdData.employment_type, "Permanent");
  const persisted = await db.employee.findUniqueOrThrow({ where: { employee_id: "E-NEW" } });
  assert.equal(persisted.work_mode, "Hybrid");
  assert.equal(persisted.employment_type, "Permanent");
  const listed = await api.admin.GET(await request("hr", "HR", "GET", undefined, "http://localhost/api/v1/admin/employees?search=E-NEW"));
  const listedEmployee = (await listed.json()).data[0];
  assert.equal(listedEmployee.work_mode, "Hybrid");
  assert.equal(listedEmployee.employment_type, "Permanent");
  assert.equal((await api.admin.POST(await request("hr", "HR", "POST", { employee_id: "E-DUP", full_name: "Duplicate Email", work_email: "new@example.test" }))).status, 409);
  const edit = await api.employee.PATCH(await request("hr", "HR", "PATCH", { full_name: "Updated Person", work_email: "updated@example.test", work_mode: "Remote", employment_type: "Contractor" }), { params: Promise.resolve({ id: "E-NEW" }) });
  assert.equal(edit.status, 200);
  const editedData = (await edit.json()).data;
  assert.equal(editedData.work_mode, "Remote");
  assert.equal(editedData.employment_type, "Contractor");
  const editedPersisted = await db.employee.findUniqueOrThrow({ where: { employee_id: "E-NEW" } });
  assert.equal(editedPersisted.work_mode, "Remote");
  assert.equal(editedPersisted.employment_type, "Contractor");
  assert.equal((await api.employee.PATCH(await request("hr", "HR", "PATCH", { work_mode: 42 }), { params: Promise.resolve({ id: "E-NEW" }) })).status, 400);
  assert.equal((await api.employee.PATCH(await request("hr", "HR", "PATCH", { employment_type: "x".repeat(101) }), { params: Promise.resolve({ id: "E-NEW" }) })).status, 400);
  assert.equal((await api.employee.PATCH(await request("a", "EMPLOYEE", "PATCH", { work_mode: "Remote" }), { params: Promise.resolve({ id: "E-NEW" }) })).status, 403);
  assert.equal((await api.admin.POST(await request("a", "EMPLOYEE", "POST", { employee_id: "E-DENIED", full_name: "Denied", work_email: "denied@example.test", work_mode: "Remote" }))).status, 403);
  const createAudit = await db.auditLog.findFirstOrThrow({ where: { employee_id: "E-NEW", action: "CREATE" } });
  assert.deepEqual(JSON.parse(createAudit.new_value ?? "{}"), {
    full_name: "New Person",
    work_email: "new@example.test",
    department_id: "D-TEST",
    role_id: null,
    manager_id: null,
    work_location: null,
    work_mode: "Hybrid",
    employment_type: "Permanent",
    hire_date: null,
  });
  const log = await db.auditLog.findMany({ where: { employee_id: "E-NEW" }, orderBy: { changed_field: "asc" } });
  assert.deepEqual(log.map(row => [row.action, row.changed_field]), [["CREATE", "*"], ["UPDATE", "employment_type"], ["UPDATE", "full_name"], ["UPDATE", "work_email"], ["UPDATE", "work_mode"]]);
  assert.equal(log.find(row => row.changed_field === "full_name")?.old_value, "New Person");
  assert.equal(log.find(row => row.changed_field === "full_name")?.new_value, "Updated Person");
  const filtered = await api.admin.GET(await request("hr", "HR", "GET", undefined, "http://localhost/api/v1/admin/employees?search=Updated&department=D-TEST&page=1&limit=1&sort=full_name&direction=asc"));
  const filteredData = await filtered.json();
  assert.equal(filteredData.total, 1);
  assert.equal(filteredData.data[0].employee_id, "E-NEW");
  const pageOne = await api.admin.GET(await request("hr", "HR", "GET", undefined, "http://localhost/api/v1/admin/employees?department=D-TEST&page=1&limit=1&sort=employee_id&direction=asc"));
  const pageTwo = await api.admin.GET(await request("hr", "HR", "GET", undefined, "http://localhost/api/v1/admin/employees?department=D-TEST&page=2&limit=1&sort=employee_id&direction=asc"));
  assert.notEqual((await pageOne.json()).data[0].employee_id, (await pageTwo.json()).data[0].employee_id);
  await db.demoUser.create({ data: { username: "new_employee", employee_id: "E-NEW", role: "EMPLOYEE", password_hash: "test-only" } });
  const deactivated = await api.employee.PATCH(await request("hr", "HR", "PATCH", { is_active: false }), { params: Promise.resolve({ id: "E-NEW" }) });
  assert.equal(deactivated.status, 200);
  const inactiveAudit = await db.auditLog.findFirstOrThrow({ where: { employee_id: "E-NEW", changed_field: "is_active" } });
  assert.equal(inactiveAudit.action, "DEACTIVATE");
  assert.equal(inactiveAudit.old_value, "true");
  assert.equal(inactiveAudit.new_value, "false");
  assert.equal(await api.server.getUser(await request("new_employee", "EMPLOYEE")), null);
});

test("employee work mode and employment type persist through create, edit, and restricted GET", async () => {
  const created = await api.admin.POST(await request("hr", "HR", "POST", {
    employee_id: "E-ROUNDTRIP",
    full_name: "Round Trip Employee",
    work_email: "roundtrip@example.test",
    department_id: "D-TEST",
    work_mode: "Hybrid",
    employment_type: "Permanent",
  }));
  assert.equal(created.status, 201);

  const employeeUrl = "http://localhost/api/v1/admin/employees?search=E-ROUNDTRIP";
  const initialGet = await api.admin.GET(await request("hr", "HR", "GET", undefined, employeeUrl));
  assert.equal(initialGet.status, 200);
  const initialEmployee = (await initialGet.json()).data[0];
  assert.equal(initialEmployee.work_mode, "Hybrid");
  assert.equal(initialEmployee.employment_type, "Permanent");

  const edit = await api.employee.PATCH(
    await request("hr", "HR", "PATCH", { work_mode: "Remote", employment_type: "Contractor" }),
    { params: Promise.resolve({ id: "E-ROUNDTRIP" }) },
  );
  assert.equal(edit.status, 200);

  const updatedGet = await api.admin.GET(await request("hr", "HR", "GET", undefined, employeeUrl));
  assert.equal(updatedGet.status, 200);
  const updatedEmployee = (await updatedGet.json()).data[0];
  assert.equal(updatedEmployee.work_mode, "Remote");
  assert.equal(updatedEmployee.employment_type, "Contractor");

  const unauthorizedUpdate = await api.employee.PATCH(
    await request("a", "EMPLOYEE", "PATCH", { work_mode: "Hybrid", employment_type: "Permanent" }),
    { params: Promise.resolve({ id: "E-ROUNDTRIP" }) },
  );
  assert.equal(unauthorizedUpdate.status, 403);
  const unauthorizedRead = await api.admin.GET(await request("a", "EMPLOYEE", "GET", undefined, employeeUrl));
  assert.equal(unauthorizedRead.status, 403);
});

test("audit history is HR/Admin-only, filterable, paginated, and redacts sensitive values", async () => {
  await db.auditLog.createMany({ data: [
    {
      audit_id: "AUDIT-HISTORY-1", actor_id: "H-1", action: "UPDATE", employee_id: "E-A",
      changed_field: "work_mode", old_value: "Office", new_value: "Remote", created_at: "2026-10-28T10:00:00.000Z",
    },
    {
      audit_id: "AUDIT-HISTORY-2", actor_id: "H-1", action: "UPDATE", employee_id: "E-A",
      changed_field: "employment_type", old_value: "Permanent", new_value: "Contractor", created_at: "2026-10-28T11:00:00.000Z",
    },
    {
      audit_id: "AUDIT-HISTORY-3", actor_id: "H-1", action: "UPDATE", employee_id: "E-A",
      changed_field: "password", old_value: "old-password-must-not-leak", new_value: "new-password-must-not-leak", created_at: "2026-10-28T12:00:00.000Z",
    },
    {
      audit_id: "AUDIT-HISTORY-4", actor_id: "H-1", action: "CREATE", employee_id: "E-A",
      changed_field: "*", new_value: JSON.stringify({ full_name: "Employee A", password: "created-password-must-not-leak", session_token: "session-token-must-not-leak" }),
      created_at: "2026-10-28T13:00:00.000Z",
    },
  ] });

  const url = "http://localhost/api/v1/admin/audit-history?employee_id=E-A&action=UPDATE&limit=2";
  const hrResponse = await api.auditHistory.GET(await request("hr", "HR", "GET", undefined, url));
  assert.equal(hrResponse.status, 200);
  const firstPage = await hrResponse.json();
  assert.equal(firstPage.total, 3);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.data.length, 2);
  assert.equal(firstPage.data[0].actor_name, "HR User");
  assert.equal(firstPage.data[0].employee_name, "Employee A");
  assert.equal(firstPage.data[0].changed_field, "Sensitive field");
  assert.equal(firstPage.data[0].old_value, null);
  assert.equal(firstPage.data[0].new_value, null);
  assert.equal(JSON.stringify(firstPage).includes("must-not-leak"), false);

  const adminResponse = await api.auditHistory.GET(await request("admin", "ADMIN", "GET", undefined, url));
  assert.equal(adminResponse.status, 200);
  const secondPageResponse = await api.auditHistory.GET(await request("hr", "HR", "GET", undefined, `${url}&page=2`));
  const secondPage = await secondPageResponse.json();
  assert.equal(secondPage.total, 3);
  assert.equal(secondPage.data.length, 1);
  assert.equal(secondPage.data[0].changed_field, "work_mode");
  assert.equal(secondPage.data[0].old_value, "Office");
  assert.equal(secondPage.data[0].new_value, "Remote");

  const filteredResponse = await api.auditHistory.GET(await request("hr", "HR", "GET", undefined, `${url}&field=work_mode`));
  const filtered = await filteredResponse.json();
  assert.equal(filtered.total, 1);
  assert.equal(filtered.data[0].audit_id, "AUDIT-HISTORY-1");

  const createResponse = await api.auditHistory.GET(await request("hr", "HR", "GET", undefined, "http://localhost/api/v1/admin/audit-history?employee_id=E-A&action=CREATE"));
  const createEntry = (await createResponse.json()).data[0];
  assert.deepEqual(JSON.parse(createEntry.new_value), { full_name: "Employee A" });
  assert.equal(JSON.stringify(createEntry).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(createEntry).includes("session-token"), false);

  assert.equal((await api.auditHistory.GET(await request("a", "EMPLOYEE", "GET", undefined, url))).status, 403);
  assert.equal((await api.auditHistory.GET(await request("m1", "MANAGER", "GET", undefined, url))).status, 403);
  assert.equal((await api.auditHistory.GET(await request(null, null, "GET", undefined, url))).status, 401);
});
