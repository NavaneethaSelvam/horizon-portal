import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken, prisma } from "@/lib/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = await getUserFromToken(cookieStore.get("horizon_session")?.value);
  if (!user) redirect("/login");
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { employee_id: id },
    select: {
      employee_id: true, full_name: true, work_email: true, work_location: true,
      work_mode: true, employment_type: true, hire_date: true, is_active: true,
      department: { select: { department_name: true } }, role: { select: { role_title: true, level: true } },
      manager: { select: { employee_id: true, full_name: true, role: { select: { role_title: true } } } },
      direct_reports: { orderBy: { full_name: "asc" }, select: { employee_id: true, full_name: true, role: { select: { role_title: true } } } },
    },
  });
  if (!employee) notFound();
  const initials = employee.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const details = [
    ["Department", employee.department?.department_name ?? "Not assigned"],
    ["Role", employee.role?.role_title ?? "Not assigned"],
    ["Level", employee.role?.level == null ? "Not provided" : String(employee.role.level)],
    ["Work email", employee.work_email],
    ["Location", employee.work_location ?? "Not provided"],
    ["Work mode", employee.work_mode ?? "Not provided"],
    ["Employment type", employee.employment_type ?? "Not provided"],
    ["Hire date", employee.hire_date ?? "Not provided"],
  ];
  return <PortalShell>
    <Link href="/employees" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><ArrowLeft aria-hidden="true" className="size-4" />Back to directory</Link>
    <div className="mt-5 flex flex-wrap items-center gap-4"><div aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">{initials}</div><div><p className="text-sm text-muted">Employee profile</p><h1 className="text-2xl font-bold">{employee.full_name}</h1><p className="text-sm text-muted">{employee.employee_id}</p></div><Badge variant={employee.is_active ? "success" : "danger"}>{employee.is_active ? "Active" : "Inactive"}</Badge></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Employment details</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><p className="text-xs text-muted">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>)}<div><p className="text-xs text-muted">Reporting manager</p>{employee.manager ? <Link className="mt-1 block font-medium text-primary hover:underline" href={`/employees/${encodeURIComponent(employee.manager.employee_id)}`}>{employee.manager.full_name} · {employee.manager.role?.role_title ?? "Manager"}</Link> : <p className="mt-1 font-medium">No manager listed</p>}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Direct reports</CardTitle></CardHeader><CardContent className="space-y-3">{employee.direct_reports.length ? employee.direct_reports.map((report) => <Link key={report.employee_id} href={`/employees/${encodeURIComponent(report.employee_id)}`} className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"><span className="font-medium">{report.full_name}</span><span className="text-sm text-muted">{report.employee_id} · {report.role?.role_title ?? "Role not assigned"}</span></Link>) : <p className="text-sm text-muted">No direct reports listed.</p>}</CardContent></Card></div>
    <p className="mt-5 text-xs text-muted">Directory profile data only. Compensation and payslip fields are not shown.</p>
  </PortalShell>;
}
