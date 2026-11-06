"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  filterPayrollRuns,
  payrollStatusVariant,
  summarizePayrollRuns,
  type PayrollRunSummary,
  type PayrollStatusFilter,
} from "@/lib/payroll-rules";
import {
  formatCurrencyINR,
  invoiceStatusVariant,
  expenseStatusVariant,
  calculateInvoiceOutstanding,
  filterInvoices,
  filterExpenses,
  summarizeFinance,
  type InvoiceRecord,
  type ExpenseRecord,
  type InvoiceStatusFilter,
  type ExpenseStatusFilter,
  type FinanceTab,
} from "@/lib/finance-rules";


function money(amount: number | null, currency = "INR") {
  const code = currency.toUpperCase().match(/^[A-Z]{3}$/) ? currency.toUpperCase() : "INR";
  return amount == null ? "Not provided" : new Intl.NumberFormat("en-IN", { style: "currency", currency: code }).format(amount);
}

export function PayrollWorkspace({ runs }: { runs: PayrollRunSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PayrollStatusFilter>("all");
  const filtered = useMemo(
    () => filterPayrollRuns(runs, search, status),
    [runs, search, status],
  );
  const summary = useMemo(() => summarizePayrollRuns(runs), [runs]);

  if (!runs.length) return <EmptyState title="No payroll runs available" description="Payroll data has not been loaded for this workspace." />;
  const columns = ["Run ID", "Period", "Pay date", "Employee count", "Gross", "Net", "Status"];
  const runDetails = (run: PayrollRunSummary) => [
    ["Run ID", run.run_id],
    ["Period", `${run.period_start ?? "Not provided"} – ${run.period_end ?? "Not provided"}`],
    ["Pay date", run.pay_date ?? "Not provided"],
    ["Employee count", run.employees_paid ?? "Not provided"],
    ["Gross", money(run.total_gross)],
    ["Net", money(run.total_net)],
  ] as const;

  return <div className="space-y-5">
    <p className="text-sm text-muted">Source dataset summary. Totals are payroll-run aggregates, not individual employee payslips.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Payroll runs", String(summary.runCount)],
        ["Paid runs", String(summary.paidCount)],
        ["Payment pending", String(summary.pendingCount)],
        ["Aggregate gross", money(summary.totalGross)],
        ["Aggregate net", money(summary.totalNet)],
      ].map(([title, value]) => (
        <Card key={title}>
          <CardContent className="p-4">
            <p className="text-sm text-muted">{title}</p>
            <p className="mt-2 break-words text-lg font-bold sm:text-xl">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
      <Input
        label="Search payroll runs"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Run ID or period"
      />
      <label className="grid gap-1.5 text-sm font-medium">
        Filter by status
        <select
          value={status}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setStatus(
              value === "paid" || value === "pending" || value === "other"
                ? value
                : "all",
            );
          }}
          className="h-11 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <option value="all">All statuses</option>
          <option value="paid">PAID</option>
          <option value="pending">POSTED - PAYMENT PENDING</option>
          <option value="other">Other statuses</option>
        </select>
      </label>
    </div>
    {!filtered.length ? (
      <EmptyState title="No matching payroll runs" description="Try a different run ID, period or status filter." />
    ) : (
      <>
        <div className="space-y-3 md:hidden">
          {filtered.map((run) => (
            <Card key={run.run_id}>
              <CardContent className="p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{run.run_id}</h2>
                  <Badge variant={payrollStatusVariant(run.status)}>{run.status ?? "Unknown"}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {runDetails(run).slice(1).map(([label, value]) => (
                    <div key={label} className={label === "Period" ? "col-span-2" : ""}>
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="mt-1 break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                {columns.map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.run_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{run.run_id}</td>
                  <td className="px-4 py-3">{run.period_start ?? "Not provided"} – {run.period_end ?? "Not provided"}</td>
                  <td className="px-4 py-3">{run.pay_date ?? "Not provided"}</td>
                  <td className="px-4 py-3">{run.employees_paid ?? "Not provided"}</td>
                  <td className="px-4 py-3">{money(run.total_gross)}</td>
                  <td className="px-4 py-3 font-semibold">{money(run.total_net)}</td>
                  <td className="px-4 py-3"><Badge variant={payrollStatusVariant(run.status)}>{run.status ?? "Unknown"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          Showing {filtered.length} of {runs.length} payroll runs.
        </p>
      </>
    )}
  </div>;
}

export function FinanceWorkspace({
  invoices = [],
  expenses = [],
}: {
  invoices?: InvoiceRecord[];
  expenses?: ExpenseRecord[];
}) {
  const [activeTab, setActiveTab] = useState<FinanceTab>("invoices");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusFilter>("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatus, setExpenseStatus] = useState<ExpenseStatusFilter>("all");

  const summary = useMemo(
    () => summarizeFinance(invoices, expenses),
    [invoices, expenses],
  );

  const filteredInvoices = useMemo(
    () => filterInvoices(invoices, invoiceSearch, invoiceStatus),
    [invoices, invoiceSearch, invoiceStatus],
  );

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, expenseSearch, expenseStatus),
    [expenses, expenseSearch, expenseStatus],
  );

  if (!invoices.length && !expenses.length) {
    return (
      <EmptyState
        title="No finance records available"
        description="Invoice and expense data has not been loaded for this workspace."
      />
    );
  }

  const invoiceColumns = [
    "Invoice",
    "Client",
    "Date",
    "Due date",
    "Total",
    "Paid",
    "Outstanding",
    "Status",
  ];

  const expenseColumns = [
    "Bill Ref",
    "Vendor",
    "Department",
    "Date",
    "Description",
    "Total",
    "Status",
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <p className="text-sm text-muted">
          Read-only Finance Console (Admin view). Figures are computed directly from verified invoice and expense records.
        </p>
        <span className="rounded bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
          ADMIN ACCESS ONLY
        </span>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          {
            title: "Billed (Issued)",
            value: formatCurrencyINR(summary.billedAmount),
            caption: `${summary.issuedCount} issued invoices`,
          },
          {
            title: "Collected Revenue",
            value: formatCurrencyINR(summary.collectedAmount),
            caption: "Verified amount_paid",
          },
          {
            title: "Outstanding",
            value: formatCurrencyINR(summary.outstandingAmount),
            caption: "max(total - paid, 0)",
          },
          {
            title: "Overdue Receivables",
            value: formatCurrencyINR(summary.overdueAmount),
            caption: `${summary.overdueCount} overdue invoices`,
          },
          {
            title: "Total Expenses",
            value: formatCurrencyINR(summary.totalExpensesAmount),
            caption: `Paid: ${formatCurrencyINR(summary.paidExpensesAmount)} · Unpaid: ${formatCurrencyINR(summary.unpaidExpensesAmount)}`,
          },
          {
            title: "Net Cash Flow",
            value: formatCurrencyINR(summary.netCashFlow),
            caption: "Collected - Paid expenses",
          },
        ].map(({ title, value, caption }) => (
          <Card key={title}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted">{title}</p>
              <p className="mt-2 break-words text-lg font-bold sm:text-xl">{value}</p>
              <p className="mt-1 text-[11px] text-muted">{caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown & Discrepancy Reporting */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-muted">Invoice Breakdown:</span>
          <span className="rounded bg-success/15 px-2 py-0.5 font-medium text-success">
            Paid: {summary.statusCounts.PAID}
          </span>
          <span className="rounded bg-warning/15 px-2 py-0.5 font-medium text-warning">
            Partially Paid: {summary.statusCounts.PARTIALLY_PAID}
          </span>
          <span className="rounded bg-warning/15 px-2 py-0.5 font-medium text-warning">
            Unpaid: {summary.statusCounts.UNPAID}
          </span>
          <span className="rounded bg-danger/15 px-2 py-0.5 font-medium text-danger">
            Overdue: {summary.statusCounts.OVERDUE}
          </span>
          <span className="rounded bg-surface-muted px-2 py-0.5 font-medium text-muted">
            Draft (excluded): {summary.draftCount}
          </span>
          <span className="rounded bg-surface-muted px-2 py-0.5 font-medium text-muted">
            Cancelled (excluded): {summary.cancelledCount}
          </span>
        </div>

        {summary.discrepancyCount > 0 ? (
          <div className="rounded bg-danger/10 px-2.5 py-1 font-semibold text-danger">
            ⚠️ Audit Note: {summary.discrepancyCount} issued invoice(s) have a balance discrepancy.
          </div>
        ) : (
          <div className="font-medium text-success">
            ✓ 100% of issued invoices reconcile with recorded balance.
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Invoices (Receivables)
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground">
            {invoices.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "expenses"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Expenses (Payables)
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground">
            {expenses.length}
          </span>
        </button>
      </div>

      {/* Invoices Tab Content */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
            <Input
              label="Search invoices"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              placeholder="Invoice number, client name, PO or ID"
            />
            <label className="grid gap-1.5 text-sm font-medium">
              Filter by status
              <select
                value={invoiceStatus}
                onChange={(event) =>
                  setInvoiceStatus(event.target.value as InvoiceStatusFilter)
                }
                className="h-11 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <option value="all">All statuses</option>
                <option value="PAID">PAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="UNPAID">UNPAID (Pending collection)</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="SENT">SENT</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
          </div>

          {!filteredInvoices.length ? (
            <EmptyState
              title="No matching invoices"
              description="Try adjusting your invoice search or status filter."
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredInvoices.map((inv) => {
                  const outstanding = calculateInvoiceOutstanding(inv);
                  return (
                    <Card key={inv.invoice_id}>
                      <CardContent className="p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold">{inv.invoice_number}</h3>
                          <Badge variant={invoiceStatusVariant(inv.status)}>
                            {inv.status ?? "Unknown"}
                          </Badge>
                        </div>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                          <div className="col-span-2">
                            <dt className="text-xs text-muted">Client</dt>
                            <dd className="mt-0.5 font-medium">
                              {inv.client_name ?? "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Invoice date</dt>
                            <dd className="mt-0.5 font-medium">
                              {inv.invoice_date ?? "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Due date</dt>
                            <dd className="mt-0.5 font-medium">
                              {inv.due_date ?? "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Total amount</dt>
                            <dd className="mt-0.5 font-medium">
                              {formatCurrencyINR(inv.total_amount)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Amount paid</dt>
                            <dd className="mt-0.5 font-medium text-success">
                              {formatCurrencyINR(inv.amount_paid)}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-xs text-muted">Outstanding</dt>
                            <dd className="mt-0.5 font-semibold text-warning">
                              {formatCurrencyINR(outstanding)}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      {invoiceColumns.map((label) => (
                        <th key={label} className="px-4 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const outstanding = calculateInvoiceOutstanding(inv);
                      return (
                        <tr
                          key={inv.invoice_id}
                          className="border-b border-border last:border-0 hover:bg-surface-muted/50"
                        >
                          <td className="px-4 py-3 font-medium">
                            {inv.invoice_number}
                          </td>
                          <td className="px-4 py-3">
                            {inv.client_name ?? "Not provided"}
                          </td>
                          <td className="px-4 py-3">
                            {inv.invoice_date ?? "Not provided"}
                          </td>
                          <td className="px-4 py-3">
                            {inv.due_date ?? "Not provided"}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrencyINR(inv.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-success">
                            {formatCurrencyINR(inv.amount_paid)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-warning">
                            {formatCurrencyINR(outstanding)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={invoiceStatusVariant(inv.status)}>
                              {inv.status ?? "Unknown"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted" aria-live="polite">
                Showing {filteredInvoices.length} of {invoices.length} invoices.
              </p>
            </>
          )}
        </div>
      )}

      {/* Expenses Tab Content */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
            <Input
              label="Search expenses"
              value={expenseSearch}
              onChange={(event) => setExpenseSearch(event.target.value)}
              placeholder="Bill ref, vendor, department or description"
            />
            <label className="grid gap-1.5 text-sm font-medium">
              Filter by status
              <select
                value={expenseStatus}
                onChange={(event) =>
                  setExpenseStatus(event.target.value as ExpenseStatusFilter)
                }
                className="h-11 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <option value="all">All statuses</option>
                <option value="PAID">PAID</option>
                <option value="UNPAID">UNPAID (Pending payment)</option>
              </select>
            </label>
          </div>

          {!filteredExpenses.length ? (
            <EmptyState
              title="No matching expenses"
              description="Try adjusting your expense search or status filter."
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredExpenses.map((exp) => (
                  <Card key={exp.expense_id}>
                    <CardContent className="p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">
                          {exp.bill_reference || exp.expense_id}
                        </h3>
                        <Badge variant={expenseStatusVariant(exp.status)}>
                          {exp.status ?? "Unknown"}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div className="col-span-2">
                          <dt className="text-xs text-muted">Vendor</dt>
                          <dd className="mt-0.5 font-medium">
                            {exp.vendor_name ?? exp.vendor_id ?? "Not provided"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Department</dt>
                          <dd className="mt-0.5 font-medium">
                            {exp.department_name ?? exp.department_id ?? "Not provided"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Expense date</dt>
                          <dd className="mt-0.5 font-medium">
                            {exp.expense_date ?? "Not provided"}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted">Description</dt>
                          <dd className="mt-0.5 font-medium">
                            {exp.description ?? "Not provided"}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted">Total amount</dt>
                          <dd className="mt-0.5 font-bold">
                            {formatCurrencyINR(exp.total_amount)}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      {expenseColumns.map((label) => (
                        <th key={label} className="px-4 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => (
                      <tr
                        key={exp.expense_id}
                        className="border-b border-border last:border-0 hover:bg-surface-muted/50"
                      >
                        <td className="px-4 py-3 font-medium">
                          {exp.bill_reference || exp.expense_id}
                        </td>
                        <td className="px-4 py-3">
                          {exp.vendor_name ?? exp.vendor_id ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3">
                          {exp.department_name ?? exp.department_id ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3">
                          {exp.expense_date ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3 max-w-[240px] truncate" title={exp.description ?? ""}>
                          {exp.description ?? "Not provided"}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrencyINR(exp.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={expenseStatusVariant(exp.status)}>
                            {exp.status ?? "Unknown"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted" aria-live="polite">
                Showing {filteredExpenses.length} of {expenses.length} expenses.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
