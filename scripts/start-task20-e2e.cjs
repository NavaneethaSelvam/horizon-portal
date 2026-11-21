"use strict";

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const port = "3101";
const databaseName = `.task20-e2e-${process.pid}-${Date.now()}.db`;
const databaseFile = path.join(projectRoot, "prisma", databaseName);
const databaseUrl = `file:./${databaseName}`;
const standaloneDatabaseUrl = `file:${databaseFile.split(path.sep).join("/")}`;
const testSecret = "task20-local-only-secret-do-not-use-in-production";
const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const generatedPrismaSchema = path.join(projectRoot, "node_modules", ".prisma", "client", "schema.prisma");
const standaloneDirectory = path.join(projectRoot, ".next", "standalone");
const standaloneServer = path.join(standaloneDirectory, "server.js");
const bootstrapRunner = path.join(projectRoot, "scripts", "run-bootstrap-migration-db.cjs");
const bootstrapScript = path.join(projectRoot, "tests", "bootstrap-migration-db.py");
const migrationsDirectory = path.join(projectRoot, "prisma", "migrations");

function localEnvironment() {
  const environment = {};
  for (const key of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "PATHEXT",
    "NODE_OPTIONS",
  ]) {
    if (process.env[key]) environment[key] = process.env[key];
  }

  return {
    ...environment,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: testSecret,
    PORT: port,
    HOSTNAME: "127.0.0.1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

const testEnvironment = localEnvironment();
const productionEnvironment = { ...testEnvironment, NODE_ENV: "production" };
const standaloneEnvironment = {
  ...productionEnvironment,
  DATABASE_URL: standaloneDatabaseUrl,
  TASK20_E2E_LOCAL_RATE_LIMIT: "1",
};
let server;
let cleaned = false;

function removeTemporaryDatabase() {
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    fs.rmSync(`${databaseFile}${suffix}`, { force: true });
  }
}

function runNode(args, environment = testEnvironment) {
  execFileSync(process.execPath, args, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
}

async function seedDatabase() {
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const passwordHash = bcrypt.hashSync("Task20Test!2026", 4);

  try {
    await db.department.create({
      data: { department_id: "D-E2E", department_name: "E2E Test Department" },
    });
    await db.role.createMany({
      data: [
        { role_id: "R-E2E-EMP", department_id: "D-E2E", role_title: "E2E Employee" },
        { role_id: "R-E2E-MGR", department_id: "D-E2E", role_title: "E2E Manager" },
      ],
    });
    await db.employee.create({
      data: {
        employee_id: "E2E-MGR",
        full_name: "Task 20 Manager",
        work_email: "manager.e2e@local.test",
        department_id: "D-E2E",
        role_id: "R-E2E-MGR",
      },
    });
    await db.employee.create({
      data: {
        employee_id: "E2E-EMP",
        full_name: "Task 20 Employee",
        work_email: "employee.e2e@local.test",
        department_id: "D-E2E",
        role_id: "R-E2E-EMP",
        manager_id: "E2E-MGR",
      },
    });
    await db.demoUser.createMany({
      data: [
        {
          username: "employee.e2e@local.test",
          full_name: "Task 20 Employee",
          employee_id: "E2E-EMP",
          role: "EMPLOYEE",
          password_hash: passwordHash,
        },
        {
          username: "manager.e2e@local.test",
          full_name: "Task 20 Manager",
          employee_id: "E2E-MGR",
          role: "MANAGER",
          password_hash: passwordHash,
        },
      ],
    });
    await db.leaveType.createMany({
      data: [
        { leave_type_code: "CL", leave_type_name: "Casual Leave", pay_type: "Paid" },
        { leave_type_code: "LOP", leave_type_name: "Loss of Pay", pay_type: "Unpaid" },
      ],
    });
    await db.leaveBalance.create({
      data: {
        employee_id: "E2E-EMP",
        as_of_date: "2027-01-01",
        financial_year: "FY27",
        cl_entitlement: 10,
        cl_used: 0,
        cl_balance: 10,
        sl_entitlement: 0,
        sl_used: 0,
        sl_balance: 0,
        el_used_fy: 0,
        el_balance: 0,
        pending_days: 0,
      },
    });
    await db.leaveRequest.create({
      data: {
        leave_request_id: "LR-E2E-APPROVAL",
        employee_id: "E2E-EMP",
        leave_type_code: "CL",
        start_date: "2027-01-12",
        end_date: "2027-01-12",
        days: 1,
        reason: "Task 20 approval fixture",
        status: "Pending",
        applied_on: "2027-01-02T00:00:00.000Z",
      },
    });
    await db.payrollRun.create({
      data: { run_id: "RUN-E2E", period_start: "2026-12-01", period_end: "2026-12-31", status: "Completed" },
    });
    await db.payslip.create({
      data: {
        payroll_item_id: "PAY-E2E",
        run_id: "RUN-E2E",
        employee_id: "E2E-EMP",
        period_start: "2026-12-01",
        period_end: "2026-12-31",
        gross_pay: 1000,
        total_deductions: 100,
        net_pay: 900,
      },
    });
    await db.sprint.create({
      data: { sprint_id: "SPRINT-E2E", sprint_name: "Task 20 Sprint", start_date: "2027-01-01", end_date: "2027-01-31", working_days: 21 },
    });
    await db.team.create({
      data: { team_id: "TEAM-E2E", team_name: "Task 20 Team", team_lead_employee_id: "E2E-MGR" },
    });
    await db.task.create({
      data: {
        task_id: "TASK-E2E",
        team_id: "TEAM-E2E",
        sprint_id: "SPRINT-E2E",
        assignee_employee_id: "E2E-EMP",
        task_type: "Task 20 browser fixture",
        priority: "P1",
        story_points: 3,
        status: "To Do",
      },
    });
  } finally {
    await db.$disconnect();
  }
}

function assertSqlitePrismaClient() {
  if (!fs.existsSync(generatedPrismaSchema)) {
    throw new Error(
      "SQLite Prisma Client is missing. Run npm.cmd run generate:local after stopping any running Next.js development server.",
    );
  }

  const schema = fs.readFileSync(generatedPrismaSchema, "utf8");
  if (!/provider\s*=\s*[\"']sqlite[\"']/.test(schema)) {
    throw new Error(
      "The generated Prisma Client is not SQLite. Run npm.cmd run generate:local after stopping any running Next.js development server.",
    );
  }
}

function prepareDatabase() {
  removeTemporaryDatabase();
  execFileSync(process.execPath, [bootstrapRunner, bootstrapScript, databaseFile, migrationsDirectory], {
    cwd: projectRoot,
    env: testEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });
  runNode([prismaCli, "migrate", "deploy", "--schema", path.join(projectRoot, "prisma", "schema.prisma")]);
}

function buildApplication() {
  runNode([nextCli, "build"], productionEnvironment);
}

function prepareStandaloneAssets() {
  if (!fs.existsSync(standaloneServer)) {
    throw new Error(`Standalone server was not generated at ${standaloneServer}`);
  }

  const staticSource = path.join(projectRoot, ".next", "static");
  const staticTarget = path.join(standaloneDirectory, ".next", "static");
  if (fs.existsSync(staticSource)) {
    fs.cpSync(staticSource, staticTarget, { recursive: true, force: true });
  }

  const publicSource = path.join(projectRoot, "public");
  const publicTarget = path.join(standaloneDirectory, "public");
  if (fs.existsSync(publicSource)) {
    fs.cpSync(publicSource, publicTarget, { recursive: true, force: true });
  }
}

function stopServer() {
  if (!server || server.killed) return;
  if (process.platform === "win32") {
    require("node:child_process").spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    server.kill("SIGTERM");
  }
}

function cleanup(exitCode = 0) {
  if (cleaned) return;
  cleaned = true;
  stopServer();
  removeTemporaryDatabase();
  process.exit(exitCode);
}

async function main() {
  assertSqlitePrismaClient();
  prepareDatabase();
  await seedDatabase();
  buildApplication();
  prepareStandaloneAssets();
  server = spawn(process.execPath, [standaloneServer], {
    cwd: standaloneDirectory,
    env: standaloneEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });
  server.once("error", () => cleanup(1));
  server.once("exit", (code) => cleanup(code ?? 1));
}

process.once("SIGINT", () => cleanup(0));
process.once("SIGTERM", () => cleanup(0));
process.once("SIGHUP", () => cleanup(0));

main().catch((error) => {
  console.error(error);
  cleanup(1);
});
