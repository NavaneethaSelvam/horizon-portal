
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import Link from "next/link";

type Department = {
  department_id: string;
  department_name: string;
};

type Employee = {
  employee_id: string;
  full_name: string;
  work_email: string;
  department: Department | null;
  role: {
    role_title: string;
    level: number | null;
  } | null;
  work_location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  hire_date: string | null;
  manager: {
    employee_id: string;
    full_name: string;
  } | null;
};

type DirectoryResponse = {
  success: boolean;
  data?: Employee[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  departments?: Department[];
  message?: string;
};

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function avatarColor(name: string) {
  const colors = [
    "bg-orange-100 text-orange-800",
    "bg-blue-100 text-blue-800",
    "bg-violet-100 text-violet-800",
    "bg-emerald-100 text-emerald-800",
    "bg-rose-100 text-rose-800",
    "bg-amber-100 text-amber-900",
  ];

  const hash = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return colors[hash % colors.length];
}

export function EmployeeDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchFromUrl = searchParams.get("search") ?? "";
  const departmentFromUrl = searchParams.get("department") ?? "";
  const pageFromUrl = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState(searchFromUrl);
  const [department, setDepartment] = useState(departmentFromUrl);
  const [page, setPage] = useState(
    Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    setSearch(searchFromUrl);
    setDepartment(departmentFromUrl);
    setPage(
      Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1
    );
  }, [searchFromUrl, departmentFromUrl, pageFromUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      } else {
        params.delete("search");
      }

      if (department) {
        params.set("department", department);
      } else {
        params.delete("department");
      }

      params.set("page", String(page));

      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();

      if (nextQuery !== currentQuery) {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, department, page, pathname, router, searchParams]);

  const fetchEmployees = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });

    if (searchFromUrl.trim()) {
      params.set("search", searchFromUrl.trim());
    }

    if (departmentFromUrl) {
      params.set("department", departmentFromUrl);
    }

    try {
      const response = await fetch(`/api/v1/employees?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = (await response.json()) as DirectoryResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load employees. Please try again."
        );
      }

      if (currentRequest !== requestId.current) return;

      setEmployees(result.data ?? []);
      setDepartments(result.departments ?? []);
      setTotal(result.pagination?.total ?? 0);
      setTotalPages(result.pagination?.totalPages ?? 0);
    } catch (fetchError) {
      if (currentRequest !== requestId.current) return;

      setEmployees([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load employees. Please try again."
      );
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [searchFromUrl, departmentFromUrl, page, reloadKey]);

  useEffect(() => {
    void fetchEmployees();

    return () => {
      requestId.current += 1;
    };
  }, [fetchEmployees]);

  function updatePage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), Math.max(totalPages, 1)));
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
        <label className="relative block">
          <span className="sr-only">Search employees</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, employee ID or email..."
            className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by department</span>
          <select
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item.department_id} value={item.department_id}>
                {item.department_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {loading
            ? "Loading employee directory..."
            : `${total.toLocaleString()} employees found`}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Users className="size-4" />
          <span>Organisation directory</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/30"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div
          role="status"
          className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-border text-sm text-muted"
        >
          <LoaderCircle className="size-5 animate-spin" />
          Loading employees...
        </div>
      )}

      {!loading && !error && employees.length === 0 && (
        <EmptyState title="No employees found" description="Try another search term or choose a different department." action={<button type="button" onClick={() => { setSearch(""); setDepartment(""); setPage(1); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/30">Clear filters</button>} />
      )}

      {!loading && !error && employees.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {employees.map((employee) => (
                <article
                  key={employee.employee_id}
                  className="flex flex-col gap-3 p-4 transition hover:bg-muted/20 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(employee.full_name)}`}
                      aria-hidden="true"
                    >
                      {initials(employee.full_name)}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold"><Link href={`/employees/${encodeURIComponent(employee.employee_id)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{employee.full_name}</Link></h2>
                      <p className="mt-0.5 text-xs text-muted">
                        {employee.employee_id}
                      </p>
                      <a
                        href={`mailto:${employee.work_email}`}
                        className="mt-1 block truncate text-sm text-primary hover:underline"
                      >
                        {employee.work_email}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:w-[42%]">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">Department</p>
                      <p className="mt-1 truncate font-medium">
                        {employee.department?.department_name ?? "Not assigned"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {employee.role?.role_title ?? "Role not assigned"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-muted">Location</p>
                      <p className="mt-1 truncate font-medium">
                        {employee.work_location ?? "Not specified"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {employee.work_mode ?? "Work mode not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="sm:w-36 sm:text-right">
                    <p className="text-xs text-muted">Reports to</p>
                    <p className="mt-1 text-sm font-medium">
                      {employee.manager?.full_name ?? "No manager"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {employee.employment_type ?? "Employment not specified"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Page {page} of {Math.max(totalPages, 1)}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updatePage(page - 1)}
                disabled={page <= 1 || loading}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => updatePage(page + 1)}
                disabled={page >= totalPages || loading}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
