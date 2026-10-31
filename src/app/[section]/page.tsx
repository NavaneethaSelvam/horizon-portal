import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PortalShell } from "@/components/layout/portal-shell";
import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { Phase2Workspace } from "@/components/phase2/phase2-workspace";
import { AttendanceWorkspace } from "@/components/phase2/attendance-workspace";
import { AuditHistory } from "@/components/admin/audit-history";
import { PayrollWorkspace, FinanceWorkspace } from "@/components/operations/workspace-tables";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { getUserFromToken, managerAssignedEmployeeIds, prisma } from "@/lib/server";

const pages = {
  profile: { title: "My Profile", description: "Your employee information and reporting details." },
  employees: { title: "Employee Directory", description: "Search and explore the organisation directory." },
  leave: { title: "Leave Management", description: "Review balances, requests and leave history." },
  attendance: { title: "Attendance", description: "Review monthly attendance summaries." },
  payslips: { title: "My Payslips", description: "Explore monthly payslip summaries." },
  admin: { title: "Employee Management", description: "Admin workspace for employee records." },
  "audit-history": { title: "Audit History", description: "Review employee record changes and their actors." },
  approvals: { title: "Approvals", description: "Review requests awaiting a decision." },
  notifications: { title: "Notifications", description: "Your private inbox and organisation announcements." },
  payroll: { title: "Payroll Runs", description: "Source payroll-run summaries and statuses." },
  finance: { title: "Finance", description: "Source invoice balances and payment statuses." },
  "team-board": { title: "Team Board", description: "Task assignments in your permitted teams." },
  insights: { title: "AI Insights", description: "Training dataset risk and anomaly outputs." },
  assistant: { title: "HR Assistant", description: "Search the configured HR FAQ dataset." },
} as const;

const restrictedRoles: Record<string, string[]> = {
  admin: ["ADMIN", "HR"],
  "audit-history": ["ADMIN", "HR"],
  approvals: ["ADMIN", "HR", "MANAGER"],
  payroll: ["ADMIN", "HR"],
  finance: ["ADMIN"],
  "team-board": ["ADMIN", "MANAGER"],
  insights: ["ADMIN", "HR", "MANAGER"],
  attendance: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
};

function Heading({ title, description }: { title: string; description: string }) {
  return <div><p className="text-sm font-semibold text-primary">HORIZON WORKSPACE</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p></div>;
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section as keyof typeof pages];
  if (!page) notFound();

  let user: Awaited<ReturnType<typeof getUserFromToken>> = null;
  if (restrictedRoles[section] || ["profile", "assistant"].includes(section)) {
    const cookieStore = await cookies();
    user = await getUserFromToken(cookieStore.get("horizon_session")?.value);
    if (!user) redirect("/login");
    if (restrictedRoles[section] && !restrictedRoles[section].includes(user.role)) redirect("/");
  }

  if (section === "employees") return <PortalShell><Heading title={page.title} description={page.description} /><EmployeeDirectory /></PortalShell>;
  if (section === "attendance" && user) return <PortalShell><Heading title={page.title} description={page.description} /><AttendanceWorkspace /></PortalShell>;
  if (section === "audit-history" && user) return <PortalShell><Heading title={page.title} description={page.description} /><AuditHistory /></PortalShell>;
  if (["leave", "payslips", "notifications", "admin", "approvals"].includes(section)) {
    return <PortalShell><Heading title={page.title} description={page.description} /><Phase2Workspace section={section} /></PortalShell>;
  }

  if (section === "profile" && user) {
    const employee = await prisma.employee.findUnique({
      where: { employee_id: user.employeeId },
      select: {
        employee_id: true, full_name: true, work_email: true, work_location: true, work_mode: true,
        employment_type: true, hire_date: true, is_active: true,
        department: { select: { department_name: true } }, role: { select: { role_title: true } },
        manager: { select: { employee_id: true, full_name: true } },
      },
    });
    if (!employee) return <PortalShell><Heading title={page.title} description={page.description} /><EmptyState title="Profile not found" description="Your employee record could not be loaded." /></PortalShell>;
    const initials = employee.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
    const details = [
      ["Department", employee.department?.department_name ?? "Not assigned"],
      ["Job title", employee.role?.role_title ?? "Not assigned"],
      ["Work email", employee.work_email],
      ["Reporting manager", employee.manager ? `${employee.manager.full_name} (${employee.manager.employee_id})` : "No reporting manager"],
      ["Location", employee.work_location ?? "Not specified"],
      ["Work mode", employee.work_mode ?? "Not specified"],
      ["Employment type", employee.employment_type ?? "Not specified"],
      ["Hire date", employee.hire_date ?? "Not specified"],
    ];
    return <PortalShell><Heading title={page.title} description={page.description} /><section className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card><CardContent className="flex flex-col items-center p-7 text-center"><div aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">{initials}</div><h2 className="mt-4 text-xl font-bold">{employee.full_name}</h2><p className="mt-1 text-sm text-muted">{employee.role?.role_title ?? "Employee"}</p><Badge variant={employee.is_active ? "success" : "danger"}>{employee.is_active ? "Active" : "Inactive"}</Badge><p className="mt-3 text-sm text-muted">Employee ID: {employee.employee_id}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Employment details</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><p className="text-xs text-muted">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>)}</CardContent></Card>
    </section><p className="mt-4 text-xs text-muted">Profile details are read-only here. Compensation information is not shown.</p></PortalShell>;
  }

  if (section === "payroll") {
    const runs = await prisma.payrollRun.findMany({ orderBy: [{ period_end: "desc" }, { run_id: "desc" }], take: 100, select: { run_id: true, period_start: true, period_end: true, pay_date: true, employees_paid: true, total_gross: true, total_net: true, status: true } });
    return <PortalShell><Heading title={page.title} description={page.description} /><PayrollWorkspace runs={runs} /></PortalShell>;
  }

  if (section === "finance") {
    const records = await prisma.invoice.findMany({ orderBy: [{ invoice_date: "desc" }, { invoice_number: "asc" }], take: 500, select: { invoice_id: true, invoice_number: true, invoice_date: true, due_date: true, currency: true, total_amount: true, amount_paid: true, balance_due: true, status: true, client: { select: { client_name: true } } } });
    const invoices = records.map(({ client, ...record }) => ({ ...record, client_name: client?.client_name ?? null }));
    return <PortalShell><Heading title={page.title} description={page.description} /><FinanceWorkspace invoices={invoices} /></PortalShell>;
  }

  if (section === "team-board" && user) {
    const [teams, assignedIds] = await Promise.all([
      prisma.team.findMany({ where: { team_lead_employee_id: user.employeeId }, select: { team_id: true } }),
      user.role === "ADMIN" ? Promise.resolve([]) : managerAssignedEmployeeIds(user.employeeId),
    ]);
    const teamIds = teams.map((team) => team.team_id);
    const taskWhere = user.role === "ADMIN" ? {} : { OR: [...(teamIds.length ? [{ team_id: { in: teamIds } }] : []), ...(assignedIds.length ? [{ assignee_employee_id: { in: assignedIds } }] : [])] };
    const tasks = await prisma.task.findMany({ where: taskWhere, orderBy: [{ due_date: "asc" }, { task_id: "asc" }], take: 200, select: { task_id: true, task_type: true, priority: true, status: true, story_points: true, due_date: true, team: { select: { team_name: true } }, sprint: { select: { sprint_name: true } }, assignee_employee_id: true } });
    const assigneeIds = [...new Set(tasks.map((task) => task.assignee_employee_id).filter((id): id is string => Boolean(id)))];
    const assignees = await prisma.employee.findMany({ where: { employee_id: { in: assigneeIds } }, select: { employee_id: true, full_name: true } });
    const names = new Map(assignees.map((employee) => [employee.employee_id, employee.full_name]));
    return <PortalShell><Heading title={page.title} description={page.description} /><p className="mt-4 text-sm text-muted">Tasks are read-only source dataset records; no work items are created here.</p>
      {tasks.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{tasks.map((task) => <Card key={task.task_id}><CardHeader><CardTitle>{task.task_type || task.task_id}</CardTitle><p className="text-xs text-muted">{task.task_id} · {task.team.team_name}</p></CardHeader><CardContent className="space-y-2 text-sm"><p>Status: <Badge variant={task.status?.toLowerCase() === "completed" ? "success" : "warning"}>{task.status || "Unspecified"}</Badge></p><p>Assignee: {task.assignee_employee_id ? names.get(task.assignee_employee_id) ?? task.assignee_employee_id : "Unassigned"}</p><p>Sprint: {task.sprint.sprint_name}</p><p>Priority: {task.priority ?? "Not provided"} · Due: {task.due_date ?? "Not provided"}</p><p>Story points: {task.story_points ?? "Not provided"}</p></CardContent></Card>)}</div> : <div className="mt-5"><EmptyState title="No tasks found" description="There are no source tasks in your permitted team scope." /></div>}
    </PortalShell>;
  }

  if (section === "insights" && user) {
    const assignedIds = user.role === "MANAGER" ? await managerAssignedEmployeeIds(user.employeeId) : null;
    const [risks, anomalies] = await Promise.all([
      prisma.aiAttritionRisk.findMany({ where: assignedIds ? { employee_id: { in: assignedIds } } : {}, orderBy: { risk_score_12m: "desc" }, take: 50 }),
      prisma.aiAnomalyResult.findMany({ where: assignedIds ? { employee_id: { in: assignedIds } } : {}, orderBy: { anomaly_score: "desc" }, take: 50 }),
    ]);
    const employeeIds = [...new Set([...risks.map((row) => row.employee_id), ...anomalies.map((row) => row.employee_id)].filter((id): id is string => Boolean(id)))];
    const employees = await prisma.employee.findMany({ where: { employee_id: { in: employeeIds } }, select: { employee_id: true, full_name: true } });
    const names = new Map(employees.map((employee) => [employee.employee_id, employee.full_name]));
    return <PortalShell><Heading title={page.title} description={page.description} /><p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Training dataset model output only. No live AI inference is configured; review these indicators with a human.</p>
      <div className="mt-4 grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>Attrition risk predictions</CardTitle></CardHeader><CardContent className="space-y-3">{risks.length ? risks.map((row) => <div key={row.prediction_id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{row.employee_id ? names.get(row.employee_id) ?? row.employee_id : "Department prediction"}</strong><Badge variant={row.risk_band?.toLowerCase() === "high" ? "danger" : "warning"}>{row.risk_band ?? "Unrated"}</Badge></div><p className="mt-1 text-sm text-muted">12-month score: {row.risk_score_12m == null ? "Not provided" : `${(row.risk_score_12m * 100).toFixed(1)}%`}</p><p className="mt-1 text-xs text-muted">{[row.top_reason_1, row.top_reason_2, row.top_reason_3].filter(Boolean).join(" · ") || "No reason provided"}</p></div>) : <p className="text-sm text-muted">No prediction rows in your permitted scope.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Payroll anomaly results</CardTitle></CardHeader><CardContent className="space-y-3">{anomalies.length ? anomalies.map((row) => <div key={row.result_id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{row.employee_id ? names.get(row.employee_id) ?? row.employee_id : "Unassigned record"}</strong><Badge variant={row.flagged ? "danger" : "success"}>{row.flagged ? "Flagged" : "Not flagged"}</Badge></div><p className="mt-1 text-sm text-muted">{row.reason_text ?? row.reason_code ?? "No reason provided"}</p><p className="mt-1 text-xs text-muted">Period: {row.period ?? "Not provided"} · Score: {row.anomaly_score ?? "Not provided"} · Data version: {row.model_version ?? "Not provided"}</p></div>) : <p className="text-sm text-muted">No anomaly rows in your permitted scope.</p>}</CardContent></Card></div>
    </PortalShell>;
  }

  if (section === "assistant" && user) {
    const faqs = await prisma.faq.findMany({ orderBy: { category: "asc" }, take: 100, select: { question: true, answer: true, category: true } });
    return <PortalShell><Heading title={page.title} description={page.description} /><AssistantChat faqs={faqs} /></PortalShell>;
  }

  return notFound();
}
