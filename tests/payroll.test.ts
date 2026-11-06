import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterPayrollRuns,
  payrollStatusVariant,
  summarizePayrollRuns,
  type PayrollRunSummary,
} from "../src/lib/payroll-rules";

const runs: PayrollRunSummary[] = [
  {
    run_id: "PR-2026-08",
    period_start: "2026-08-01",
    period_end: "2026-08-31",
    pay_date: "2026-09-01",
    employees_paid: 429,
    total_gross: 1000,
    total_net: 900,
    status: "PAID",
  },
  {
    run_id: "PR-2026-09",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    pay_date: null,
    employees_paid: 444,
    total_gross: 2000,
    total_net: 1800,
    status: "POSTED - PAYMENT PENDING",
  },
];

test("paid payroll runs use a successful status badge", () => {
  assert.equal(payrollStatusVariant("PAID"), "success");
  assert.equal(payrollStatusVariant("paid"), "success");
  assert.equal(payrollStatusVariant(" Completed "), "success");
});

test("pending and unknown payroll statuses remain warnings", () => {
  assert.equal(payrollStatusVariant("POSTED - PAYMENT PENDING"), "warning");
  assert.equal(payrollStatusVariant("PROCESSING"), "warning");
  assert.equal(payrollStatusVariant(""), "warning");
  assert.equal(payrollStatusVariant(null), "warning");
  assert.equal(payrollStatusVariant(undefined), "warning");
});

test("payroll search matches run IDs and either period date", () => {
  assert.deepEqual(filterPayrollRuns(runs, "pr-2026-08", "all"), [runs[0]]);
  assert.deepEqual(filterPayrollRuns(runs, "2026-09-30", "all"), [runs[1]]);
});

test("payroll status filters separate paid, pending and other statuses", () => {
  assert.deepEqual(filterPayrollRuns(runs, "", "paid"), [runs[0]]);
  assert.deepEqual(filterPayrollRuns(runs, "", "pending"), [runs[1]]);
  const other = { ...runs[0], run_id: "OTHER", status: "Draft" };
  assert.deepEqual(filterPayrollRuns([...runs, other], "", "other"), [other]);
});

test("payroll summaries aggregate supplied run totals without masking missing amounts", () => {
  assert.deepEqual(summarizePayrollRuns(runs), {
    runCount: 2,
    paidCount: 1,
    pendingCount: 1,
    totalGross: 3000,
    totalNet: 2700,
  });
  assert.equal(summarizePayrollRuns([{ ...runs[0], total_net: null }]).totalNet, null);
});
