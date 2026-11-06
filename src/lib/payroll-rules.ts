export type PayrollRunSummary = {
  run_id: string;
  period_start: string | null;
  period_end: string | null;
  pay_date: string | null;
  employees_paid: number | null;
  total_gross: number | null;
  total_net: number | null;
  status: string | null;
};

export type PayrollStatusFilter = "all" | "paid" | "pending" | "other";

export function payrollStatusVariant(
  status: string | null | undefined,
): "success" | "warning" {
  const normalized = status?.trim().toUpperCase();
  return normalized === "PAID" || normalized === "COMPLETED"
    ? "success"
    : "warning";
}

export function filterPayrollRuns(
  runs: PayrollRunSummary[],
  search: string,
  statusFilter: PayrollStatusFilter,
): PayrollRunSummary[] {
  const query = search.trim().toLowerCase();

  return runs.filter((run) => {
    const matchesSearch =
      !query ||
      [run.run_id, run.period_start ?? "", run.period_end ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    const status = run.status?.trim().toUpperCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && status === "PAID") ||
      (statusFilter === "pending" && status === "POSTED - PAYMENT PENDING") ||
      (statusFilter === "other" &&
        status !== "PAID" &&
        status !== "POSTED - PAYMENT PENDING");

    return matchesSearch && matchesStatus;
  });
}

function sumProvided(values: (number | null)[]): number | null {
  if (values.some((value) => value === null || !Number.isFinite(value))) {
    return null;
  }
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function summarizePayrollRuns(runs: PayrollRunSummary[]) {
  return {
    runCount: runs.length,
    paidCount: runs.filter(
      (run) => run.status?.trim().toUpperCase() === "PAID",
    ).length,
    pendingCount: runs.filter(
      (run) =>
        run.status?.trim().toUpperCase() === "POSTED - PAYMENT PENDING",
    ).length,
    totalGross: sumProvided(runs.map((run) => run.total_gross)),
    totalNet: sumProvided(runs.map((run) => run.total_net)),
  };
}
