
"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Wallet,
  Users,
  FileText,
  CircleCheck,
  Megaphone,
} from "lucide-react";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { PortalShell } from "@/components/layout/portal-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

type UserRole = "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof CalendarDays;
  roles: UserRole[];
};

const quickActions: QuickAction[] = [
  {
    label: "Apply for leave",
    href: "/leave",
    icon: CalendarDays,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "View payslips",
    href: "/payslips",
    icon: Wallet,
    roles: ["ADMIN", "HR", "EMPLOYEE"],
  },
  {
    label: "Employee directory",
    href: "/employees",
    icon: Users,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "My profile",
    href: "/profile",
    icon: FileText,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
];

export default function HomePage() {
  const [role, setRole] = useState<UserRole>("EMPLOYEE");

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        if (!response.ok) {
          return;
        }

        const result = await response.json();
        const currentRole = result?.user?.role;

        if (
          active &&
          ["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(currentRole)
        ) {
          setRole(currentRole as UserRole);
        }
      } catch {
        // PortalShell handles authentication and session errors.
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, []);

  const visibleActions = quickActions.filter((action) =>
    action.roles.includes(role)
  );

  return (
    <PortalShell>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-primary">
            YOUR WORKSPACE
          </p>

          <DashboardWelcome />

          <p className="mt-2 text-sm text-muted">
            Here is your work overview for today.
          </p>
        </div>

        <Badge variant="success">Demo workspace</Badge>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                Annual leave balance
              </span>
              <CalendarDays className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-bold">12 days</p>
            <p className="mt-2 text-xs text-muted">Sample balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Last payslip</span>
              <Wallet className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-bold">₹32,500</p>
            <p className="mt-2 text-xs text-muted">
              Illustrative sample amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Pending requests</span>
              <Clock3 className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-bold">2</p>
            <p className="mt-2 text-xs text-muted">
              Sample request count
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Directory</span>
              <Users className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-bold">441</p>
            <p className="mt-2 text-xs text-muted">
              Expected dataset count
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-3 sm:grid-cols-2">
            {visibleActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary-soft"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <Icon className="size-5 text-primary" />
                    {action.label}
                  </span>
                  <ArrowUpRight className="size-4 text-muted" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest announcements</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Megaphone className="size-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Welcome to Horizon Portal
                </p>
                <p className="mt-1 text-sm text-muted">
                  Your employee workspace is ready to explore.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Demo announcement
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CircleCheck className="size-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Keep your profile updated
                </p>
                <p className="mt-1 text-sm text-muted">
                  Check your department and reporting information.
                </p>
                <Link
                  href="/profile"
                  className="mt-2 inline-block text-sm font-semibold text-primary"
                >
                  View profile
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {[
              [
                "Leave request",
                "Your sample request is awaiting review.",
                "Pending",
              ],
              [
                "Employee profile",
                "Your demo profile is available.",
                "Complete",
              ],
              [
                "Payslip",
                "Open the payslips page to explore the sample view.",
                "Available",
              ],
            ].map(([title, description, status]) => (
              <div
                key={title}
                className="flex flex-col justify-between gap-2 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                </div>

                <Badge
                  variant={status === "Pending" ? "warning" : "success"}
                >
                  {status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PortalShell>
  );
}
