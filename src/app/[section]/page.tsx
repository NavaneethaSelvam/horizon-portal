import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PortalShell } from "@/components/layout/portal-shell";
import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { Phase2Workspace } from "@/components/phase2/phase2-workspace";
import { AttendanceWorkspace } from "@/components/phase2/attendance-workspace";
import { AuditHistory } from "@/components/admin/audit-history";
import { PayrollWorkspace, FinanceWorkspace } from "@/components/operations/workspace-tables";
import { TeamTaskBoard } from "@/components/operations/team-task-board";
import { WorkloadCapacity } from "@/components/operations/workload-capacity";
import { AiInsightsWorkspace } from "@/components/operations/ai-insights-workspace";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { getUserFromToken, prisma } from "@/lib/server";

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
  "workload-capacity": { title: "Workload & Capacity", description: "Review sprint workload, approved leave and evidence-based capacity." },
  insights: { title: "AI Insights", description: "Aggregate AI-generated sample outputs for HR and Admin review." },
  assistant: { title: "HR Assistant", description: "Search the configured HR FAQ dataset." },
} as const;

const restrictedRoles: Record<string, string[]> = {
  admin: ["ADMIN", "HR"],
  "audit-history": ["ADMIN", "HR"],
  approvals: ["ADMIN", "HR", "MANAGER"],
  payroll: ["ADMIN", "HR"],
  finance: ["ADMIN"],
  "team-board": ["ADMIN", "MANAGER"],
  "workload-capacity": ["ADMIN", "MANAGER"],
  insights: ["ADMIN", "HR"],
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
    if (!user || user.role !== "ADMIN") redirect("/");
    const [invoiceRows, expenseRows, vendors, departments] = await Promise.all([
      prisma.invoice.findMany({
        orderBy: [{ invoice_date: "desc" }, { invoice_number: "asc" }],
        take: 1000,
        select: {
          invoice_id: true,
          invoice_number: true,
          client_id: true,
          invoice_date: true,
          due_date: true,
          currency: true,
          subtotal: true,
          gst_rate_percent: true,
          gst_amount: true,
          total_amount: true,
          amount_paid: true,
          balance_due: true,
          status: true,
          last_payment_date: true,
          po_number: true,
          client: { select: { client_name: true } },
        },
      }),
      prisma.expense.findMany({
        orderBy: [{ expense_date: "desc" }, { expense_id: "asc" }],
        take: 1000,
        select: {
          expense_id: true,
          expense_date: true,
          category_account: true,
          vendor_id: true,
          bill_reference: true,
          description: true,
          department_id: true,
          amount_excl_gst: true,
          gst_rate_percent: true,
          gst_amount: true,
          total_amount: true,
          due_date: true,
          paid_date: true,
          status: true,
          payment_mode: true,
          submitted_by: true,
          approved_by: true,
        },
      }),
      prisma.vendor.findMany({
        select: { vendor_id: true, vendor_name: true },
      }),
      prisma.department.findMany({
        select: { department_id: true, department_name: true },
      }),
    ]);
    const vendorMap = new Map(vendors.map((v) => [v.vendor_id, v.vendor_name]));
    const deptMap = new Map(departments.map((d) => [d.department_id, d.department_name]));
    const invoices = invoiceRows.map(({ client, ...record }) => ({
      ...record,
      client_name: client?.client_name ?? null,
    }));
    const expenses = expenseRows.map((record) => ({
      ...record,
      vendor_name: record.vendor_id ? vendorMap.get(record.vendor_id) ?? null : null,
      department_name: record.department_id ? deptMap.get(record.department_id) ?? null : null,
    }));
    return <PortalShell><Heading title={page.title} description={page.description} /><FinanceWorkspace invoices={invoices} expenses={expenses} /></PortalShell>;
  }

  if (section === "team-board") return <PortalShell><Heading title={page.title} description={page.description} /><TeamTaskBoard /></PortalShell>;
  if (section === "workload-capacity") return <PortalShell><Heading title={page.title} description={page.description} /><WorkloadCapacity /></PortalShell>;

  if (section === "insights" && user) return <PortalShell><Heading title={page.title} description={page.description} /><AiInsightsWorkspace /></PortalShell>;

  if (section === "assistant" && user) {
    const faqs = await prisma.faq.findMany({ orderBy: { category: "asc" }, take: 100, select: { question: true, answer: true, category: true } });
    return <PortalShell><Heading title={page.title} description={page.description} /><AssistantChat faqs={faqs} /></PortalShell>;
  }

  return notFound();
}
