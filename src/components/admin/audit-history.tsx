"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEntry = {
  audit_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  employee_id: string;
  employee_name: string | null;
  changed_field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

type AuditResponse = { data: AuditEntry[]; total: number; page: number; limit: number };

function displayValue(value: string | null) {
  return value === null || value === "" ? "—" : value;
}

export function AuditHistory() {
  const [result, setResult] = useState<AuditResponse>({ data: [], total: 0, page: 1, limit: 20 });
  const [employeeId, setEmployeeId] = useState("");
  const [action, setAction] = useState("");
  const [field, setField] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageCount = Math.max(1, Math.ceil(result.total / result.limit));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      employee_id: employeeId.trim(),
      action: action.trim(),
      field: field.trim(),
      page: String(page),
      limit: "20",
    });
    try {
      const response = await fetch(`/api/v1/admin/audit-history?${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Unable to load audit history.");
      setResult(body as AuditResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load audit history.");
    } finally {
      setLoading(false);
    }
  }, [action, employeeId, field, page]);

  useEffect(() => { void load(); }, [load]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Employee ID
          <input value={employeeId} onChange={(event) => updateFilter(setEmployeeId, event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" placeholder="Filter by employee" />
        </label>
        <label className="text-sm font-medium">Action
          <input value={action} onChange={(event) => updateFilter(setAction, event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" placeholder="e.g. UPDATE" />
        </label>
        <label className="text-sm font-medium">Changed field
          <input value={field} onChange={(event) => updateFilter(setField, event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" placeholder="e.g. work_mode" />
        </label>
        <div className="flex items-end text-sm text-muted">{result.total} audit entries</div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</p>}
      {loading ? (
        <p role="status" className="rounded-lg border border-border p-6 text-sm text-muted">Loading audit history…</p>
      ) : result.data.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-sm text-muted">No audit entries match these filters.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-muted"><tr>
                <th className="p-3">Timestamp</th><th className="p-3">Employee</th><th className="p-3">Action / field</th>
                <th className="p-3">Previous value</th><th className="p-3">New value</th><th className="p-3">Actor</th>
              </tr></thead>
              <tbody>{result.data.map((entry) => <tr key={entry.audit_id} className="border-t border-border align-top">
                <td className="p-3 whitespace-nowrap">{entry.created_at}</td>
                <td className="p-3">{entry.employee_name ?? "Unknown employee"}<span className="block text-xs text-muted">{entry.employee_id}</span></td>
                <td className="p-3">{entry.action}<span className="block text-xs text-muted">{entry.changed_field ?? "—"}</span></td>
                <td className="max-w-56 break-words p-3">{displayValue(entry.old_value)}</td>
                <td className="max-w-56 break-words p-3">{displayValue(entry.new_value)}</td>
                <td className="p-3">{entry.actor_name}<span className="block text-xs text-muted">{entry.actor_id}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">{result.data.map((entry) => <article key={entry.audit_id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{entry.action} · {entry.changed_field ?? "—"}</strong><time className="text-xs text-muted">{entry.created_at}</time></div>
            <p className="mt-2 text-sm">{entry.employee_name ?? "Unknown employee"} <span className="text-muted">({entry.employee_id})</span></p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Previous value</dt><dd className="break-words">{displayValue(entry.old_value)}</dd></div>
              <div><dt className="text-xs text-muted">New value</dt><dd className="break-words">{displayValue(entry.new_value)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Actor: {entry.actor_name} ({entry.actor_id})</p>
          </article>)}</div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Page {page} of {pageCount}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">Previous</button>
              <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
