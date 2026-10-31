"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeCsvCell } from "@/lib/phase2-rules";

type Department = { department_id: string; department_name: string };
type Role = { role_id: string; role_title: string };
type Employee = {
  employee_id: string; full_name: string; work_email: string; department_id: string | null;
  role_id: string | null; manager_id: string | null; work_location: string | null;
  work_mode: string | null; employment_type: string | null; hire_date: string | null;
  is_active: boolean; department?: Department | null; role?: Role | null;
};
type Manager = { employee_id: string; full_name: string };
type EmployeeResponse = {
  data: Employee[]; total: number; page: number; limit: number;
  departments: Department[]; roles: Role[]; managers: Manager[];
};
type FormState = {
  employee_id: string; full_name: string; work_email: string; department_id: string;
  role_id: string; manager_id: string; work_location: string; work_mode: string;
  employment_type: string; hire_date: string;
};
const emptyForm: FormState = { employee_id: "", full_name: "", work_email: "", department_id: "", role_id: "", manager_id: "", work_location: "", work_mode: "", employment_type: "", hire_date: "" };
const columns = [
  ["employee_id", "Employee ID"], ["full_name", "Name"], ["work_email", "Email"],
  ["department_id", "Department"], ["hire_date", "Hire date"], ["is_active", "Status"],
] as const;

export function EmployeeManagement() {
  const [result, setResult] = useState<EmployeeResponse>({ data: [], total: 0, page: 1, limit: 20, departments: [], roles: [], managers: [] });
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("employee_id");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pages = Math.max(1, Math.ceil(result.total / result.limit));

  const load = useCallback(async (targetPage = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ search, department, page: String(targetPage), limit: "20", sort, direction });
    try {
      const response = await fetch(`/api/v1/admin/employees?${query}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? "Unable to load employees.");
      setResult(json as EmployeeResponse);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load employees."); }
    finally { setLoading(false); }
  }, [department, direction, page, search, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(page); }, 200);
    return () => window.clearTimeout(timer);
  }, [load, page]);

  const visibleIds = useMemo(() => result.data.map((employee) => employee.employee_id), [result.data]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const body: Record<string, unknown> = {
      ...form,
      department_id: form.department_id || null,
      role_id: form.role_id || null,
      manager_id: form.manager_id || null,
      work_location: form.work_location || null,
      work_mode: form.work_mode || null,
      employment_type: form.employment_type || null,
      hire_date: form.hire_date || null,
    };
    const url = editing ? `/api/v1/admin/employees/${encodeURIComponent(form.employee_id)}` : "/api/v1/admin/employees";
    try {
      const response = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? "Could not save employee.");
      setDialogOpen(false); setMessage(editing ? "Employee changes saved." : "Employee created.");
      await load(page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save employee."); }
    finally { setSaving(false); }
  }

  async function deactivate(employee: Employee) {
    if (!window.confirm(`Deactivate ${employee.full_name}? They will no longer be able to use the portal.`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/employees/${encodeURIComponent(employee.employee_id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: false }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? "Could not deactivate employee.");
      setMessage("Employee deactivated."); await load(page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not deactivate employee."); }
  }

  async function exportCsv() {
    setError("");
    try {
      const query = new URLSearchParams({ search, department, page: "1", limit: "100", sort, direction });
      const first = await fetch(`/api/v1/admin/employees?${query}`, { cache: "no-store" });
      const start = await first.json();
      if (!first.ok) throw new Error(start.message ?? "Could not export employees.");
      const employees: Employee[] = [...start.data];
      const totalPages = Math.ceil(start.total / start.limit);
      for (let current = 2; current <= totalPages; current++) {
        query.set("page", String(current));
        const response = await fetch(`/api/v1/admin/employees?${query}`, { cache: "no-store" });
        const batch = await response.json();
        if (!response.ok) throw new Error(batch.message ?? "Could not export employees.");
        employees.push(...batch.data);
      }
      const rows = selected.size ? employees.filter((employee) => selected.has(employee.employee_id)) : employees;
      const csv = ["Employee ID,Name,Email,Department,Title,Active", ...rows.map((employee) => [employee.employee_id, employee.full_name, employee.work_email, employee.department?.department_name, employee.role?.role_title, employee.is_active ? "Active" : "Inactive"].map(safeCsvCell).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "employees.csv"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(selected.size ? `Exported ${rows.length} selected employee(s).` : `Exported ${rows.length} filtered employee(s).`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export employees."); }
  }

  function openCreate() { setEditing(false); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(employee: Employee) {
    setEditing(true);
    setForm({ employee_id: employee.employee_id, full_name: employee.full_name, work_email: employee.work_email, department_id: employee.department_id ?? "", role_id: employee.role_id ?? "", manager_id: employee.manager_id ?? "", work_location: employee.work_location ?? "", work_mode: employee.work_mode ?? "", employment_type: employee.employment_type ?? "", hire_date: employee.hire_date ?? "" });
    setDialogOpen(true);
  }
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return <section className="mt-8 space-y-4">
    {error && <p role="alert" className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-md border border-green-300 p-3 text-sm">{message}</p>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Search<input aria-label="Search employees" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="mt-1 block rounded-md border border-border bg-background p-2" placeholder="Name, email or ID" /></label>
      <label className="text-sm">Department<select aria-label="Department filter" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} className="mt-1 block rounded-md border border-border bg-background p-2"><option value="">All departments</option>{result.departments.map((item) => <option key={item.department_id} value={item.department_id}>{item.department_name}</option>)}</select></label>
      <Button variant="secondary" onClick={() => void exportCsv()}>Export {selected.size ? `${selected.size} selected` : "filtered"} CSV</Button>
      <Button onClick={openCreate}>Add employee</Button>
    </div>
    <p aria-live="polite" className="text-sm text-muted">{selected.size} selected · {result.total} matching employees</p>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead><tr className="border-b border-border"><th className="p-3"><input type="checkbox" aria-label="Select all employees on this page" checked={allVisibleSelected} onChange={toggleAll} /></th>{columns.map(([key, title]) => <th key={key} className="p-3"><button type="button" onClick={() => { setSort(key); setDirection((current) => sort === key && current === "asc" ? "desc" : "asc"); setPage(1); }} aria-label={`Sort by ${title}`} className="font-semibold hover:text-primary">{title}{sort === key ? direction === "asc" ? " ↑" : " ↓" : ""}</button></th>)}<th className="p-3">Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={columns.length + 2} className="p-6 text-center text-muted">Loading employees…</td></tr> : result.data.length ? result.data.map((employee) => <tr key={employee.employee_id} className="border-b border-border last:border-0">
          <td className="p-3"><input type="checkbox" aria-label={`Select ${employee.full_name}`} checked={selected.has(employee.employee_id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(employee.employee_id)) next.delete(employee.employee_id); else next.add(employee.employee_id); return next; })} /></td>
          <td className="p-3">{employee.employee_id}</td><td className="p-3">{employee.full_name}</td><td className="p-3">{employee.work_email}</td><td className="p-3">{employee.department?.department_name ?? "—"}</td><td className="p-3">{employee.hire_date ?? "—"}</td><td className="p-3"><Badge variant={employee.is_active ? "success" : "danger"}>{employee.is_active ? "Active" : "Inactive"}</Badge></td>
          <td className="p-3"><div className="flex gap-2"><Button variant="secondary" onClick={() => openEdit(employee)}>Edit</Button>{employee.is_active && <Button variant="secondary" onClick={() => void deactivate(employee)}>Deactivate</Button>}</div></td>
        </tr>) : <tr><td colSpan={columns.length + 2} className="p-6 text-center text-muted">No employees match these filters.</td></tr>}</tbody>
      </table>
    </div>
    <div className="flex items-center justify-between"><Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="text-sm text-muted">Page {page} of {pages}</span><Button variant="secondary" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>Next</Button></div>
    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="employee-form-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between"><h2 id="employee-form-title" className="text-xl font-bold">{editing ? "Edit employee" : "Create employee"}</h2><button type="button" aria-label="Close employee form" onClick={() => setDialogOpen(false)} className="rounded p-2 focus-visible:ring-2">×</button></div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {!editing && <Field label="Employee ID" value={form.employee_id} onChange={(value) => update("employee_id", value)} required maxLength={100} />}
        <Field label="Full name" value={form.full_name} onChange={(value) => update("full_name", value)} required maxLength={200} />
        <Field label="Work email" type="email" value={form.work_email} onChange={(value) => update("work_email", value)} required maxLength={254} />
        <SelectField label="Department" value={form.department_id} onChange={(value) => update("department_id", value)} options={result.departments.map((item) => [item.department_id, item.department_name])} />
        <SelectField label="Job role" value={form.role_id} onChange={(value) => update("role_id", value)} options={result.roles.map((item) => [item.role_id, item.role_title])} />
        <SelectField label="Manager" value={form.manager_id} onChange={(value) => update("manager_id", value)} options={result.managers.filter((manager) => manager.employee_id !== form.employee_id).map((item) => [item.employee_id, `${item.full_name} (${item.employee_id})`])} />
        <Field label="Work location" value={form.work_location} onChange={(value) => update("work_location", value)} maxLength={100} />
        <Field label="Work mode" value={form.work_mode} onChange={(value) => update("work_mode", value)} maxLength={100} />
        <Field label="Employment type" value={form.employment_type} onChange={(value) => update("employment_type", value)} maxLength={100} />
        <Field label="Hire date" type="date" value={form.hire_date} onChange={(value) => update("hire_date", value)} />
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create employee"}</Button></div>
      </form>
    </section></div>}
  </section>;
}

function Field({ label, value, onChange, type = "text", required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  const id = `employee-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <label htmlFor={id} className="text-sm">{label}<input id={id} type={type} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background p-2" /></label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  const id = `employee-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <label htmlFor={id} className="text-sm">{label}<select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background p-2"><option value="">None</option>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}
