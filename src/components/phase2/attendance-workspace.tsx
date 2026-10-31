"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";

type AttendanceRow = {
  employee_id: string;
  employee_name: string | null;
  period_end_date: string;
  scheduled_days: number | null;
  present_days: number | null;
  wfh_days: number | null;
  paid_leave_days: number | null;
  unpaid_absence_days: number | null;
  late_arrivals: number | null;
  avg_hours_worked: number | null;
  overtime_hours: number | null;
  attendance_rate: number | null;
};

type AttendanceResponse = {
  success: true;
  scope: "employee" | "team" | "organization";
  attendance: AttendanceRow[];
};

function isAttendanceRow(value: unknown): value is AttendanceRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;
  const numericFields = [
    "scheduled_days",
    "present_days",
    "wfh_days",
    "paid_leave_days",
    "unpaid_absence_days",
    "late_arrivals",
    "avg_hours_worked",
    "overtime_hours",
    "attendance_rate",
  ];

  return (
    typeof row.employee_id === "string" &&
    (typeof row.employee_name === "string" || row.employee_name === null) &&
    typeof row.period_end_date === "string" &&
    numericFields.every(
      (field) => typeof row[field] === "number" || row[field] === null,
    )
  );
}

function isAttendanceResponse(value: unknown): value is AttendanceResponse {
  if (!value || typeof value !== "object") return false;

  const response = value as Record<string, unknown>;
  return (
    response.success === true &&
    ["employee", "team", "organization"].includes(String(response.scope)) &&
    Array.isArray(response.attendance) &&
    response.attendance.every(isAttendanceRow)
  );
}

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function formatValue(value: number | null, digits = 2) {
  if (value === null) return "Not provided";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function getTotal(rows: AttendanceRow[], field: keyof AttendanceRow) {
  if (!rows.length) return "—";

  const values = rows.map((row) => row[field]);
  const numericValues = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (numericValues.length !== values.length) return "Not provided";

  return formatValue(numericValues.reduce((total, value) => total + value, 0));
}

function formatRate(value: number | null) {
  return value === null ? "Not provided" : `${formatValue(value * 100, 2)}%`;
}

const scopeLabels = {
  employee: "Your attendance",
  team: "Authorized team attendance",
  organization: "Organization attendance",
};

function AttendanceMetrics({ row }: { row: AttendanceRow }) {
  const metrics = [
    ["Scheduled days", row.scheduled_days],
    ["Present days", row.present_days],
    ["Work from home", row.wfh_days],
    ["Paid leave", row.paid_leave_days],
    ["Unpaid absence", row.unpaid_absence_days],
    ["Late arrivals", row.late_arrivals],
    ["Average hours", row.avg_hours_worked],
    ["Overtime hours", row.overtime_hours],
  ] as const;

  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      {metrics.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-1 font-medium">{formatValue(value)}</dd>
        </div>
      ))}
      <div>
        <dt className="text-xs text-muted">Attendance rate</dt>
        <dd className="mt-1 font-medium">{formatRate(row.attendance_rate)}</dd>
      </div>
    </dl>
  );
}

export function AttendanceWorkspace() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch(
          `/api/v1/attendance?month=${encodeURIComponent(month)}`,
          { cache: "no-store" },
        );
        const result: unknown = await response.json();

        if (!response.ok || !isAttendanceResponse(result)) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Unable to load attendance.";
          throw new Error(message);
        }

        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load attendance.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [month, retry]);

  const attendance = data?.attendance ?? [];

  return (
    <section className="mt-8 space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{data ? scopeLabels[data.scope] : "Attendance"}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Monthly summary data from the attendance source records.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            Month
            <input
              aria-label="Attendance month"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
              className="min-h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
        </CardHeader>
      </Card>

      {error ? (
        <ErrorState
          title="Attendance unavailable"
          description={error}
          onRetry={() => setRetry((current) => current + 1)}
        />
      ) : loading ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted" aria-busy="true">
          Loading attendance…
        </p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Monthly records", String(attendance.length)],
              ["Present days", getTotal(attendance, "present_days")],
              ["Paid leave days", getTotal(attendance, "paid_leave_days")],
              ["Unpaid absence days", getTotal(attendance, "unpaid_absence_days")],
            ].map(([title, value]) => (
              <Card key={title}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted">{title}</p>
                  <p className="mt-2 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {attendance.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Monthly attendance records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:hidden">
                  {attendance.map((row) => (
                    <article
                      key={`${row.employee_id}:${row.period_end_date}`}
                      className="rounded-lg border border-border p-4"
                    >
                      {data.scope !== "employee" ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">{row.employee_name ?? row.employee_id}</h3>
                          <Badge>{row.employee_id}</Badge>
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm text-muted">
                        Month ending {row.period_end_date}
                      </p>
                      <AttendanceMetrics row={row} />
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        {data.scope !== "employee" ? <th className="px-3 py-3">Employee</th> : null}
                        <th className="px-3 py-3">Month ending</th>
                        <th className="px-3 py-3">Scheduled</th>
                        <th className="px-3 py-3">Present</th>
                        <th className="px-3 py-3">Work from home</th>
                        <th className="px-3 py-3">Paid leave</th>
                        <th className="px-3 py-3">Unpaid absence</th>
                        <th className="px-3 py-3">Late arrivals</th>
                        <th className="px-3 py-3">Avg. hours</th>
                        <th className="px-3 py-3">Overtime</th>
                        <th className="px-3 py-3">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((row) => (
                        <tr
                          key={`${row.employee_id}:${row.period_end_date}`}
                          className="border-b border-border last:border-0"
                        >
                          {data.scope !== "employee" ? (
                            <td className="px-3 py-3">
                              <span className="block font-medium">{row.employee_name ?? row.employee_id}</span>
                              <span className="text-xs text-muted">{row.employee_id}</span>
                            </td>
                          ) : null}
                          <td className="px-3 py-3">{row.period_end_date}</td>
                          <td className="px-3 py-3">{formatValue(row.scheduled_days)}</td>
                          <td className="px-3 py-3">{formatValue(row.present_days)}</td>
                          <td className="px-3 py-3">{formatValue(row.wfh_days)}</td>
                          <td className="px-3 py-3">{formatValue(row.paid_leave_days)}</td>
                          <td className="px-3 py-3">{formatValue(row.unpaid_absence_days)}</td>
                          <td className="px-3 py-3">{formatValue(row.late_arrivals)}</td>
                          <td className="px-3 py-3">{formatValue(row.avg_hours_worked)}</td>
                          <td className="px-3 py-3">{formatValue(row.overtime_hours)}</td>
                          <td className="px-3 py-3">{formatRate(row.attendance_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-muted">
                  AttendanceMonthly contains monthly aggregates rather than daily status events.
                  Values shown here are sourced from those records; no missing daily statuses are inferred.
                </p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No attendance records"
              description={`No monthly attendance records are available for ${month}.`}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
