"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PayrollRun = {
  run_id: string;
  period_start: string | null;
  period_end: string | null;
  pay_date: string | null;
  employees_paid: number | null;
  total_gross: number | null;
  total_net: number | null;
  status: string | null;
};

type Invoice = {
  invoice_id: string;
  invoice_number: string;
  client_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  balance_due: number | null;
  status: string | null;
};

function money(amount: number | null, currency = "INR") {
  const code = currency.toUpperCase().match(/^[A-Z]{3}$/) ? currency.toUpperCase() : "INR";
  return amount == null ? "Not provided" : new Intl.NumberFormat("en-IN", { style: "currency", currency: code }).format(amount);
}

export function PayrollWorkspace({ runs }: { runs: PayrollRun[] }) {
  if (!runs.length) return <EmptyState title="No payroll runs available" description="Payroll data has not been loaded for this workspace." />;
  return <div className="space-y-4">
    <p className="text-sm text-muted">Source dataset summary. Totals are payroll-run aggregates, not individual employee payslips.</p>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b border-border text-muted">{["Run", "Period", "Pay date", "Employees", "Gross", "Net", "Status"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{runs.map((run) => <tr key={run.run_id} className="border-b border-border last:border-0">
          <td className="px-4 py-3 font-medium">{run.run_id}</td>
          <td className="px-4 py-3">{run.period_start ?? "?"} – {run.period_end ?? "?"}</td>
          <td className="px-4 py-3">{run.pay_date ?? "Not provided"}</td>
          <td className="px-4 py-3">{run.employees_paid ?? "Not provided"}</td>
          <td className="px-4 py-3">{money(run.total_gross)}</td>
          <td className="px-4 py-3 font-semibold">{money(run.total_net)}</td>
          <td className="px-4 py-3"><Badge variant={run.status?.toLowerCase() === "completed" ? "success" : "warning"}>{run.status ?? "Unknown"}</Badge></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function FinanceWorkspace({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const statuses = useMemo(() => [...new Set(invoices.map((row) => row.status).filter((value): value is string => Boolean(value)))].sort(), [invoices]);
  const filtered = useMemo(() => invoices.filter((row) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [row.invoice_number, row.client_name ?? "", row.invoice_id].some((value) => value.toLowerCase().includes(needle));
    return matchesSearch && (!status || row.status === status);
  }), [invoices, search, status]);

  if (!invoices.length) return <EmptyState title="No finance records available" description="Invoice data has not been loaded for this workspace." />;
  return <section className="space-y-4">
    <p className="text-sm text-muted">Source invoice records. No transactions are created from this page.</p>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <Input label="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice, ID or client" />
      <label className="grid gap-1.5 text-sm font-medium">Filter by status
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    {!filtered.length ? <EmptyState title="No matching invoices" description="Try a different search or status filter." /> : <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead><tr className="border-b border-border text-muted">{["Invoice", "Client", "Date", "Due", "Total", "Paid", "Balance", "Status"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.invoice_id} className="border-b border-border last:border-0">
          <td className="px-4 py-3 font-medium">{row.invoice_number}</td><td className="px-4 py-3">{row.client_name ?? "Not provided"}</td>
          <td className="px-4 py-3">{row.invoice_date ?? "Not provided"}</td><td className="px-4 py-3">{row.due_date ?? "Not provided"}</td>
          <td className="px-4 py-3">{money(row.total_amount, row.currency ?? "INR")}</td><td className="px-4 py-3">{money(row.amount_paid, row.currency ?? "INR")}</td>
          <td className="px-4 py-3 font-semibold">{money(row.balance_due, row.currency ?? "INR")}</td>
          <td className="px-4 py-3"><Badge variant={row.status?.toLowerCase() === "paid" ? "success" : "warning"}>{row.status ?? "Unknown"}</Badge></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <p className="text-xs text-muted" aria-live="polite">Showing {filtered.length} of {invoices.length} invoices.</p>
  </section>;
}
