
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeManagement } from "@/components/admin/employee-management";
import { availableLeaveBalance } from "@/lib/phase2-rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
const currency = (v: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(v ?? 0);

const label = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function leaveTypeAvailable(type: Obj, balances?: Obj) {
  if (type.pay_type === "Unpaid" || type.leave_type_code === "LOP") {
    return true;
  }

  const field: Record<string, string> = {
    CL: "cl_balance",
    SL: "sl_balance",
    EL: "el_balance",
  };

  return Boolean(
    field[type.leave_type_code] &&
      balances?.[field[type.leave_type_code]] != null,
  );
}

export function Phase2Workspace({ section }: { section: string }) {
  const [data, setData] = useState<Obj>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [submittingLeave, setSubmittingLeave] = useState(false);
  const leaveSubmitLock = useRef(false);

  const [cancellingLeave, setCancellingLeave] = useState("");
  const cancellationLocks = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const path =
        section === "admin"
          ? "/api/v1/admin/employees"
          : section === "approvals"
            ? "/api/v1/approvals"
            : `/api/v1/${section}`;

      const response = await fetch(path, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load data.");
      }

      setData(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load data.",
      );
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestableLeaveTypes = (data.types ?? []).filter((type: Obj) =>
    leaveTypeAvailable(type, data.balances),
  );

  const defaultLeaveType =
    requestableLeaveTypes[0]?.leave_type_code ?? "";

  async function post(url: string, body?: Obj) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || `Action failed (${response.status}).`,
        );
      }

      setMessage(
        body?.decision === "approve"
          ? "Leave request approved."
          : body?.decision === "reject"
            ? "Leave request rejected."
            : "Saved successfully.",
      );

      await refresh();

      if (url.includes("/notifications")) {
        window.dispatchEvent(new Event("horizon:notifications-updated"));
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Action failed.",
      );
    }
  }

  async function cancelLeave(id: string) {
    if (cancellationLocks.current.has(id)) return;

    cancellationLocks.current.add(id);
    setCancellingLeave(id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/v1/leave/${encodeURIComponent(id)}`,
        { method: "PATCH" },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to cancel leave request.",
        );
      }

      setData((current) => ({
        ...current,
        requests: (current.requests ?? []).map((item: Obj) =>
          item.leave_request_id === id
            ? { ...item, status: "Cancelled", balance_reserved: false }
            : item,
        ),
      }));

      setMessage("Leave request cancelled.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to cancel leave request.",
      );
    } finally {
      cancellationLocks.current.delete(id);
      setCancellingLeave("");
    }
  }

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    if (leaveSubmitLock.current) return;

    const values = new FormData(form);
    const leaveType = String(values.get("type") ?? "").trim();
    const start = String(values.get("start") ?? "").trim();
    const end = String(values.get("end") ?? "").trim();
    const reason = String(values.get("reason") ?? "").trim();

    if (!leaveType) {
      setMessage("");
      setError("Choose a leave type.");
      return;
    }

    if (!start || !end) {
      setMessage("");
      setError("Enter both a start date and an end date.");
      return;
    }

    if (end < start) {
      setMessage("");
      setError("End date must be on or after the start date.");
      return;
    }

    if (!reason || reason.length > 1000) {
      setMessage("");
      setError("Enter a reason of 1 to 1000 characters.");
      return;
    }

    leaveSubmitLock.current = true;
    setSubmittingLeave(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/v1/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type_code: leaveType,
          start_date: start,
          end_date: end,
          reason,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success || !result.request) {
        const details =
          result?.message ||
          result?.error ||
          `Leave request failed (${response.status}).`;

        throw new Error(details);
      }

      const created = result.request as Obj;

      setData((current) => ({
        ...current,
        requests: [
          created,
          ...(current.requests ?? []).filter(
            (request: Obj) =>
              request.leave_request_id !== created.leave_request_id,
          ),
        ],
      }));

      setMessage("Leave request submitted successfully.");
      form.reset();
    } catch (cause) {
      setMessage("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to submit leave request. Please try again.",
      );
    } finally {
      leaveSubmitLock.current = false;
      setSubmittingLeave(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-8 text-sm text-muted" aria-busy="true">
        Loading…
      </p>
    );
  }

  const notice = (
    <>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-md border border-green-300 p-3 text-sm"
        >
          {message}
        </p>
      )}
    </>
  );

  if (section === "leave") {
    return (
      <div className="mt-8 space-y-6">
        {notice}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Casual leave", availableLeaveBalance(data.balances?.cl_balance, data.requests ?? [], "CL")],
            ["Sick leave", availableLeaveBalance(data.balances?.sl_balance, data.requests ?? [], "SL")],
            ["Earned leave", availableLeaveBalance(data.balances?.el_balance, data.requests ?? [], "EL")],
          ].map(([name, balance]) => (
            <Card key={String(name)}>
              <CardContent className="p-5">
                <p className="text-sm text-muted">{name}</p>
                <p className="mt-2 text-2xl font-bold">
                  {balance ?? "—"} days available
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Apply for leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={submitLeave}
            >
              <label className="text-sm">
                Leave type
                <select
                  required
                  name="type"
                  defaultValue={defaultLeaveType}
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                >
                  {(data.types ?? []).map((type: Obj) => {
                    const available = leaveTypeAvailable(
                      type,
                      data.balances,
                    );

                    return (
                      <option
                        key={type.leave_type_code}
                        value={type.leave_type_code}
                        disabled={!available}
                      >
                        {type.leave_type_name}
                        {available ? "" : " — balance not configured"}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="text-sm">
                Start date
                <input
                  required
                  name="start"
                  type="date"
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                />
              </label>

              <label className="text-sm">
                End date
                <input
                  required
                  name="end"
                  type="date"
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                />
              </label>

              <label className="text-sm sm:col-span-2">
                Reason
                <textarea
                  required
                  name="reason"
                  maxLength={1000}
                  className="mt-1 block w-full rounded-md border border-border bg-background p-2"
                />
              </label>

              <Button
                type="submit"
                loading={submittingLeave}
                disabled={submittingLeave}
                className="sm:col-span-2"
              >
                Submit request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthCalendar
              holidays={data.holidays ?? []}
              requests={data.requests ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request history</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows
              rows={data.requests}
              cols={[
                "leave_type.leave_type_name",
                "start_date",
                "end_date",
                "days",
                "status",
              ]}
              renderAction={(request: Obj) =>
                request.status === "Pending" ? (
                  <Button
                    variant="secondary"
                    disabled={
                      cancellingLeave === request.leave_request_id
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Cancel leave request ${request.leave_request_id}?`,
                        )
                      ) {
                        void cancelLeave(request.leave_request_id);
                      }
                    }}
                  >
                    {cancellingLeave === request.leave_request_id
                      ? "Cancelling…"
                      : "Cancel"}
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows
              rows={data.holidays}
              cols={["holiday_date", "holiday_name", "weekday"]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendance ? (
              <Rows
                rows={[data.attendance]}
                cols={[
                  "period_end_date",
                  "scheduled_days",
                  "present_days",
                  "paid_leave_days",
                  "attendance_rate",
                ]}
              />
            ) : (
              <p className="text-sm text-muted">
                No monthly attendance record is available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section === "payslips") {
    return (
      <div className="mt-8 space-y-4">
        {notice}
        {(data.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">No payslips found.</p>
        ) : (
          (data.data ?? []).map((payslip: Obj) => (
            <Card key={payslip.payroll_item_id}>
              <CardHeader>
                <CardTitle>
                  {payslip.period_start} – {payslip.period_end}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Money title="Gross pay" value={payslip.gross_pay} />
                  <Money
                    title="Deductions"
                    value={payslip.total_deductions}
                  />
                  <Money title="Net pay" value={payslip.net_pay} />
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer">
                    Earnings and deductions
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      "basic",
                      "hra",
                      "conveyance",
                      "medical",
                      "special_allowance",
                      "overtime_pay",
                      "variable_pay",
                      "pf_employee",
                      "esi_employee",
                      "professional_tax",
                      "tds",
                      "other_deductions",
                    ].map((key) => (
                      <p
                        key={key}
                        className="flex justify-between border-b border-border py-1 text-sm"
                      >
                        <span>{label(key)}</span>
                        <span>{currency(payslip[key])}</span>
                      </p>
                    ))}
                  </div>
                  <Button
                    className="mt-4 print:hidden"
                    onClick={() => window.print()}
                  >
                    Print / Save as PDF
                  </Button>
                </details>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div className="mt-8 space-y-4">
        {notice}
        <p className="text-sm text-muted">
          {data.unread ?? 0} unread notifications
        </p>

        {(data.notifications ?? []).map((notification: Obj) => (
          <Card
            key={notification.notification_id}
            className={
              notification.is_read ? "opacity-70" : "border-primary"
            }
          >
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{notification.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {notification.message}
                </p>
                <time className="mt-2 block text-xs text-muted">
                  {new Date(notification.created_at).toLocaleString()}
                </time>
              </div>

              {!notification.is_read && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void post(
                      `/api/v1/notifications/${notification.notification_id}/read`,
                    )
                  }
                >
                  Mark read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows
              rows={data.announcements}
              cols={["posted_on", "title", "body"]}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section === "approvals") {
    return (
      <div className="mt-8 space-y-4">
        {notice}

        <Card>
          <CardHeader>
            <CardTitle>Requests awaiting review</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows
              rows={data.requests}
              cols={[
                "employee.full_name",
                "leave_type.leave_type_name",
                "start_date",
                "end_date",
                "days",
                "reason",
              ]}
              empty="No requests are awaiting your review."
              renderAction={(request: Obj) =>
                request.employee_id === data.actor_employee_id ? (
                  <span className="text-sm text-muted">
                    Your request — you cannot approve it yourself.
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Approve leave request ${request.leave_request_id}?`,
                          )
                        ) {
                          void post("/api/v1/approvals", {
                            request_id: request.leave_request_id,
                            decision: "approve",
                          });
                        }
                      }}
                    >
                      Approve
                    </Button>

                    <Reject
                      id={request.leave_request_id}
                      submit={(reason) =>
                        post("/api/v1/approvals", {
                          request_id: request.leave_request_id,
                          decision: "reject",
                          reason,
                        })
                      }
                    />
                  </div>
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows
              rows={data.recent_decisions}
              cols={[
                "employee.full_name",
                "leave_type.leave_type_name",
                "start_date",
                "end_date",
                "days",
                "status",
              ]}
              empty="No recent decisions."
            />
          </CardContent>
        </Card>

        <TeamAttendance />
      </div>
    );
  }

  if (section === "admin") return <AdminWorkspace />;

  return null;
}

function Money({
  title,
  value,
}: {
  title: string;
  value: number | null;
}) {
  return (
    <div className="rounded-lg bg-background p-4">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-xl font-bold">{currency(value)}</p>
    </div>
  );
}

function TeamAttendance() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [rows, setRows] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    fetch(`/api/v1/approvals?month=${month}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ?? "Could not load team attendance.",
          );
        }

        if (!cancelled) setRows(result.attendance ?? []);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load team attendance.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team attendance</CardTitle>
        <label className="text-sm">
          Month
          <input
            aria-label="Attendance month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="ml-2 rounded border border-border bg-background p-2"
          />
        </label>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted" aria-busy="true">
            Loading attendance…
          </p>
        ) : (
          <Rows
            rows={rows}
            cols={[
              "employee_id",
              "period_end_date",
              "present_days",
              "attendance_rate",
            ]}
            empty="No attendance records are available for this month."
          />
        )}
      </CardContent>
    </Card>
  );
}

function MonthCalendar({
  holidays,
  requests,
}: {
  holidays: Obj[];
  requests: Obj[];
}) {
  const [month, setMonth] = useState(() => new Date());

  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1).getDay();
  const count = new Date(year, m + 1, 0).getDate();

  const cells = [
    ...Array(first).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  const iso = (day: number) =>
    `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          className="rounded border border-border px-3 py-1"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
        >
          Previous
        </button>

        <p className="font-semibold">
          {month.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <button
          className="rounded border border-border px-3 py-1"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 font-semibold text-muted"
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} />;

          const date = iso(day);
          const holiday = holidays.find(
            (item) => item.holiday_date === date,
          );
          const leave = requests.find(
            (item) =>
              item.status === "Approved" &&
              item.start_date <= date &&
              item.end_date >= date,
          );

          return (
            <div
              key={date}
              className="min-h-16 rounded-md border border-border p-1 text-left"
            >
              <span className="font-medium">{day}</span>

              {holiday && (
                <span
                  title={String(holiday.holiday_name)}
                  className="mt-1 block truncate rounded bg-amber-100 px-1 text-[10px] text-amber-900"
                >
                  {holiday.holiday_name}
                </span>
              )}

              {leave && (
                <span className="mt-1 block truncate rounded bg-green-100 px-1 text-[10px] text-green-900">
                  {leave.leave_type?.leave_type_name ?? "Approved leave"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function val(row: Obj, key: string) {
  return key.split(".").reduce((value, part) => value?.[part], row) ?? "—";
}

function Rows({
  rows,
  cols,
  empty = "No records found.",
  renderAction,
}: {
  rows?: Obj[];
  cols: string[];
  empty?: string;
  renderAction?: (row: Obj) => ReactNode;
}) {
  if (!rows?.length) {
    return <p className="text-sm text-muted">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {cols.map((column) => (
              <th key={column} className="p-3">
                {label(column.split(".").at(-1)!)}
              </th>
            ))}
            {renderAction && <th className="p-3">Decision</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={
                row.notification_id ??
                row.leave_request_id ??
                row.employee_id ??
                row.payroll_item_id ??
                index
              }
              className="border-b border-border"
            >
              {cols.map((column) => (
                <td key={column} className="p-3">
                  {column === "status" ? (
                    <Badge
                      variant={
                        row.status === "Approved"
                          ? "success"
                          : row.status === "Rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {String(val(row, column))}
                    </Badge>
                  ) : (
                    String(val(row, column))
                  )}
                </td>
              ))}

              {renderAction && (
                <td className="p-3">{renderAction(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reject({
  id,
  submit,
}: {
  id: string;
  submit: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-label={`Reject ${id}`}
      >
        Reject
      </Button>
    );
  }

  return (
    <form
      className="flex gap-1"
      onSubmit={(event) => {
        event.preventDefault();

        const form = new FormData(event.currentTarget);
        const reason = String(form.get("reason") ?? "").trim();

        if (!reason) return;

        if (window.confirm(`Reject leave request ${id}?`)) {
          submit(reason);
        }
      }}
    >
      <input
        required
        name="reason"
        maxLength={1000}
        placeholder="Reason"
        aria-label="Rejection reason"
        className="w-32 rounded border border-border bg-background px-2"
      />

      <Button type="submit" variant="secondary">
        Reject
      </Button>

      <button
        type="button"
        aria-label="Cancel rejection"
        onClick={() => setOpen(false)}
      >
        ×
      </button>
    </form>
  );
}

function AdminWorkspace() {
  return <EmployeeManagement />;
}
