import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { availableLeaveBalance, countLeaveDays, hasSufficientBalance, isIsoDate, netPayMatches, safeCsvCell } from "../src/lib/phase2-rules";

test("paid leave counts weekdays and excludes supplied holidays", () => {
  assert.equal(countLeaveDays("2026-10-26", "2026-10-30", false, ["2026-10-28"]), 4);
});

test("unpaid leave uses calendar days and rejects invalid or reversed dates", () => {
  assert.equal(countLeaveDays("2026-10-30", "2026-11-01", true, []), 3);
  assert.throws(() => countLeaveDays("2026-02-30", "2026-03-01", false, []), /INVALID_DATES/);
  assert.throws(() => countLeaveDays("2026-11-01", "2026-10-30", true, []), /INVALID_DATES/);
});

test("pending leave reservations cannot exceed available balance", () => {
  assert.equal(hasSufficientBalance(10, 7, 3), true);
  assert.equal(hasSufficientBalance(10, 7, 4), false);
  assert.equal(hasSufficientBalance(10, 0, 0), false);
});

test("available leave cards subtract pending reservations for their own leave type", () => {
  const requests = [
    { leave_type_code: "CL", status: "Pending", days: 3 },
    { leave_type_code: "CL", status: "Cancelled", days: 2 },
    { leave_type_code: "SL", status: "Pending", days: 1 },
  ];
  assert.equal(availableLeaveBalance(10, requests, "CL"), 7);
  assert.equal(availableLeaveBalance(5, requests, "SL"), 4);
  assert.equal(availableLeaveBalance(null, requests, "EL"), null);
});

test("employee hire dates require a real ISO calendar date", () => {
  assert.equal(isIsoDate("2024-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2026-13-01"), false);
});

test("CSV fields quote values and neutralize formula prefixes", () => {
  assert.equal(safeCsvCell("=1+1"), "\"'=1+1\"");
  assert.equal(safeCsvCell("  =1+1"), "\"'  =1+1\"");
  assert.equal(safeCsvCell("O\"Brien"), "\"O\"\"Brien\"");
});

test("at least three supplied payslips reconcile gross less deductions to net", () => {
  const file = path.join(process.cwd(), "prisma", "data", "03_Data_Pack", "payslips.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as Array<{employee_id:string;gross_pay:number;total_deductions:number;net_pay:number}>;
  const samples = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (row.net_pay != null && row.gross_pay != null && row.total_deductions != null && !samples.has(row.employee_id)) samples.set(row.employee_id, row);
  assert.ok(samples.size >= 3, "source data must include three employee payslips");
  for (const [employeeId, row] of [...samples.entries()].slice(0, 3)) {
    assert.ok(netPayMatches(row.gross_pay, row.total_deductions, row.net_pay), `payslip arithmetic must reconcile for source employee ${employeeId}`);
  }
});
