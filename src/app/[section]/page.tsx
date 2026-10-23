
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Download,
  Plus,
  CalendarDays,
  CircleCheck,
  Clock3,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { EmployeeDirectory } from "@/components/employees/employee-directory";
import type { LucideIcon } from "lucide-react";

import { PortalShell } from "@/components/layout/portal-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const pages: Record<string, { title: string; description: string }> = {
  profile: {
    title: "My Profile",
    description: "Your employee information and reporting details.",
  },
  employees: {
    title: "Employee Directory",
    description: "Search and explore the organisation directory.",
  },
  leave: {
    title: "Leave Management",
    description: "Review balances, requests and leave history.",
  },
  payslips: {
    title: "My Payslips",
    description: "Explore monthly payslip summaries.",
  },
  admin: {
    title: "Employee Management",
    description: "Admin workspace for employee records.",
  },
  approvals: {
    title: "Approvals",
    description: "Review requests awaiting a decision.",
  },
  payroll: {
    title: "Payroll Runs",
    description: "Explore payroll run summaries and statuses.",
  },
  finance: {
    title: "Finance",
    description: "Review illustrative invoices and expenses.",
  },
  "team-board": {
    title: "Team Board",
    description: "A sample Kanban workspace for team tasks.",
  },
  insights: {
    title: "AI Insights",
    description: "Sample risk and anomaly cards for human review.",
  },
  assistant: {
    title: "HR Assistant",
    description: "Explore sample HR policy questions.",
  },
  login: {
    title: "Sign in",
    description:
      "Login UI preview. Secure authentication is added in the authentication task.",
  },
};

const sampleEmployees = [
  {
    id: "GM00017",
    name: "Navaneetha S",
    department: "Engineering",
    role: "Frontend Developer",
    status: "Active",
  },
  {
    id: "GM00018",
    name: "Arun Kumar",
    department: "Human Resources",
    role: "HR Executive",
    status: "Active",
  },
  {
    id: "GM00019",
    name: "Priya R",
    department: "Finance",
    role: "Finance Analyst",
    status: "Active",
  },
  {
    id: "GM00020",
    name: "Karthik M",
    department: "Engineering",
    role: "Software Engineer",
    status: "On leave",
  },
];

const teamColumns: { title: string; tasks: string[] }[] = [
  {
    title: "To Do",
    tasks: ["Review onboarding checklist", "Prepare team notes"],
  },
  {
    title: "In Progress",
    tasks: ["Update employee portal"],
  },
  {
    title: "Blocked",
    tasks: ["Waiting for approval"],
  },
  {
    title: "Done",
    tasks: ["Create project structure"],
  },
];

const leaveCards: {
  title: string;
  value: string;
  Icon: LucideIcon;
}[] = [
  {
    title: "Annual leave",
    value: "12 days",
    Icon: CalendarDays,
  },
  {
    title: "Sick leave",
    value: "6 days",
    Icon: Clock3,
  },
  {
    title: "Requests awaiting review",
    value: "2",
    Icon: AlertCircle,
  },
];

const employmentDetails: [string, string][] = [
  ["Department", "Engineering"],
  ["Job title", "Frontend Developer"],
  ["Work email", "navanee@growmar.in"],
  ["Reporting manager", "Demo Manager"],
  ["Location", "India"],
  ["Employment status", "Active"],
];

function PageTable({ section }: { section: string }) {
  let headers: string[] = ["Reference", "Name", "Department", "Status"];

  let rows: string[][] = sampleEmployees.map((employee) => [
    employee.id,
    employee.name,
    employee.department,
    employee.status,
  ]);

  if (section === "approvals" || section === "leave") {
    headers = ["Request", "Employee", "Type", "Status"];

    rows = [
      ["LR-1042", "Navaneetha S", "Annual leave", "Pending"],
      ["LR-1043", "Arun Kumar", "Sick leave", "Pending"],
      ["LR-1044", "Priya R", "Annual leave", "Approved"],
    ];
  } else if (section === "payroll" || section === "payslips") {
    headers = ["Reference", "Period", "Net amount", "Status"];

    rows = [
      ["PR-2026-09", "September 2026", "₹32,500", "Completed"],
      ["PR-2026-08", "August 2026", "₹31,800", "Completed"],
      ["PR-2026-07", "July 2026", "₹31,800", "Completed"],
    ];
  } else if (section === "finance") {
    headers = ["Reference", "Description", "Amount", "Status"];

    rows = [
      ["INV-001", "Office supplies", "₹18,500", "Pending"],
      ["INV-002", "Software services", "₹42,000", "Approved"],
      ["INV-003", "Equipment", "₹27,500", "Pending"],
    ];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Records</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-3 font-semibold"
                  >
                    {header}
                  </th>
                ))}

                <th className="px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row[0]}
                  className="border-b border-border last:border-0"
                >
                  {row.map((value, index) => (
                    <td key={index} className="px-3 py-4">
                      {index === row.length - 1 ? (
                        <Badge
                          variant={
                            value === "Pending" ||
                            value === "On leave"
                              ? "warning"
                              : "success"
                          }
                        >
                          {value}
                        </Badge>
                      ) : (
                        value
                      )}
                    </td>
                  ))}

                  <td className="px-3 py-4">
                    <Button
                      variant="secondary"
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted">
          Sample preview data. Live database connection will be
          added in the backend task.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const page = pages[section];

  if (!page) {
    notFound();
  }

  if (section === "employees") {
  return (
    <PortalShell>
      <div>
        <p className="text-sm font-semibold text-primary">
          HORIZON WORKSPACE
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Employee Directory
        </h1>
        <p className="mt-2 text-sm text-muted">
          Search and explore the organisation directory.
        </p>
      </div>

      <EmployeeDirectory />
    </PortalShell>
  );
}

  if (section === "login") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <p className="text-sm text-muted">
              Sign in to your Horizon workspace.
            </p>
          </CardHeader>

          <CardContent>
            <form action="/" className="space-y-4">
              <Input
                label="Work email"
                type="email"
                placeholder="you@company.com"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                required
              />

              <p className="text-xs text-muted">
                This is a UI preview. Authentication is not connected yet.
              </p>

              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>

            <div className="mt-5 rounded-lg bg-background p-3 text-xs text-muted">
              Demo login buttons and secure sessions will be connected
              in HP-03.
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <PortalShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-primary">
            HORIZON WORKSPACE
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {page.title}
          </h1>

          <p className="mt-2 text-sm text-muted">
            {page.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["leave", "admin", "approvals"].includes(section) && (
            <Button>
              <Plus className="size-4" />
              Add new
            </Button>
          )}

          {["payslips", "payroll", "finance"].includes(section) && (
            <Button variant="secondary">
              <Download className="size-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {section === "profile" && (
        <section className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="flex size-24 items-center justify-center rounded-full bg-primary-soft text-2xl font-bold text-primary">
                NS
              </div>

              <h2 className="mt-4 text-xl font-bold">
                Navaneetha S
              </h2>

              <p className="mt-1 text-sm text-muted">
                Frontend Developer
              </p>

              <Badge variant="success">Active</Badge>

              <p className="mt-4 text-sm text-muted">
                Employee ID: GM00017
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment details</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5 sm:grid-cols-2">
              {employmentDetails.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {section === "team-board" && (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {teamColumns.map((column) => (
            <Card key={column.title}>
              <CardHeader>
                <CardTitle>{column.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {column.tasks.map((task) => (
                  <div
                    key={task}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    {task}
                    <p className="mt-3 text-xs text-muted">
                      Sample task
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {section === "insights" && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <Badge variant="warning">Medium risk</Badge>

              <h2 className="mt-3 font-bold">
                Workload pattern needs review
              </h2>

              <p className="mt-2 text-sm text-muted">
                Illustrative sample: a team member has several
                overlapping assignments.
              </p>

              <p className="mt-3 font-semibold">
                Sample exposure: ₹25,000
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <Badge variant="danger">Review needed</Badge>

              <h2 className="mt-3 font-bold">
                Payroll anomaly example
              </h2>

              <p className="mt-2 text-sm text-muted">
                Illustrative sample: one entry differs from the
                expected range.
              </p>

              <p className="mt-3 font-semibold">
                Sample exposure: ₹12,000
              </p>
            </CardContent>
          </Card>

          <p className="text-sm font-semibold text-muted md:col-span-2">
            AI-generated, for human review. These are examples,
            not real findings.
          </p>
        </section>
      )}

      {section === "assistant" && (
        <Card className="mt-8 max-w-2xl">
          <CardHeader>
            <CardTitle>
              <MessageCircle className="mr-2 inline size-5" />
              HR Assistant
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg bg-background p-4 text-sm">
              Vanakkam! I can help you explore leave policies,
              payslips and employee profile information in this demo.
            </div>

            <p className="mt-5 text-sm font-semibold">
              Suggested questions
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/leave"
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
              >
                How do I apply for leave?
              </Link>

              <Link
                href="/payslips"
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
              >
                Where are my payslips?
              </Link>

              <Link
                href="/profile"
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
              >
                View my profile
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {section === "leave" && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {leaveCards.map(({ title, value, Icon }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">{title}</p>
                  <Icon className="size-5 text-primary" />
                </div>

                <p className="mt-3 text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {(section === "employees" || section === "admin") && (
        <div className="mt-8 max-w-sm">
          <Input
            label="Search employees"
            placeholder="Name, ID or department..."
          />
        </div>
      )}

      {![
        "assistant",
        "team-board",
        "insights",
        "profile",
      ].includes(section) && (
        <div className="mt-6">
          <PageTable section={section} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted">
        <CircleCheck className="size-4 shrink-0 text-success" />

        <span>
          UI preview with sample data. API, database, loading,
          empty and error states are to be wired into their
          respective tasks.
        </span>

        <ArrowRight className="ml-auto size-4 shrink-0" />
      </div>
    </PortalShell>
  );
}
