import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeAnomalies,
  summarizeAttrition,
  type AnomalyInput,
  type AttritionInput,
} from "../src/lib/ai-insights-rules";

test("attrition summaries aggregate bands and generalized reason categories", () => {
  const rows: AttritionInput[] = [
    ...Array.from({ length: 5 }, (_, index) => ({
      employeeKey: `EMP-HIGH-${index}`,
      riskBand: "High",
      reasons: ["Low engagement score (1.0/5)", "Pay is 0.90x the role midpoint", null],
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      employeeKey: `EMP-LOW-${index}`,
      riskBand: "Low",
      reasons: ["Total experience years (31.8)", null, null],
    })),
    {
      employeeKey: "EMP-PRIVATE-1",
      riskBand: "Medium",
      reasons: ["Wfh share 3m (0.9)", null, null],
    },
  ];
  const result = summarizeAttrition(rows);

  assert.deepEqual(result.bands, [
    { band: "High", count: 5, suppressed: false },
    { band: "Medium", count: null, suppressed: true },
    { band: "Low", count: 6, suppressed: false },
  ]);
  assert.deepEqual(result.topReasons, [
    { category: "Experience profile", count: 6 },
    { category: "Compensation position", count: 5 },
    { category: "Engagement", count: 5 },
  ]);
  assert.equal(result.hasSuppressedReasonGroups, true);
  const serialized = JSON.stringify(result);
  for (const privateValue of ["EMP-HIGH", "31.8", "0.90x", "1.0/5", "Wfh share"]) {
    assert.equal(serialized.includes(privateValue), false);
  }
  assert.equal("total" in result, false);
});

test("attrition suppression uses distinct people and hides groups smaller than five", () => {
  const rows: AttritionInput[] = Array.from({ length: 5 }, () => ({
    employeeKey: "SAME-EMPLOYEE",
    riskBand: "High",
    reasons: ["Low engagement score"],
  }));
  const result = summarizeAttrition(rows);
  assert.equal(result.bands[0].count, null);
  assert.equal(result.bands[0].suppressed, true);
  assert.deepEqual(result.topReasons, []);
});

test("anomaly cards group safe categories, sum known amounts, rank descending and suppress small groups", () => {
  const inputs: AnomalyInput[] = [
    ...Array.from({ length: 5 }, (_, index) => ({
      employeeKey: `PAY-EMP-${index}`,
      source: "payroll_monthly_features",
      period: "2026-09-01",
      reasonCode: "GROSS_ABOVE_NORM",
      flagged: true,
      moneyAtRisk: index === 0 ? null : 100 * index,
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      employeeKey: `ATT-EMP-${index}`,
      source: "attendance_monthly_features",
      period: "2026-08-01",
      reasonCode: "NO_ATTENDANCE",
      flagged: true,
      moneyAtRisk: null,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      employeeKey: `SMALL-EMP-${index}`,
      source: "payroll_monthly_features",
      period: "2026-07-01",
      reasonCode: "ZERO_PAY",
      flagged: true,
      moneyAtRisk: 9999,
    })),
  ];
  const result = summarizeAnomalies(inputs);
  assert.equal(result.length, 2);
  assert.equal(result[0].source, "Payroll");
  assert.equal(result[0].reasonCategory, "Pay variance");
  assert.equal(result[0].period, "2026-09");
  assert.equal(result[0].moneyAtRiskTotal, 1000);
  assert.equal(result[0].hasMissingMoneyAtRisk, true);
  assert.equal(result[0].status, "Model flagged — requires human review");
  assert.equal(result[1].source, "Attendance");
  assert.equal(result[1].moneyAtRiskTotal, null);
  assert.equal(result[1].hasMissingMoneyAtRisk, true);

  const serialized = JSON.stringify(result);
  for (const privateValue of [
    "PAY-EMP",
    "ATT-EMP",
    "SMALL-EMP",
    "GROSS_ABOVE_NORM",
    "NO_ATTENDANCE",
    "record_id",
    "employee_id",
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
  assert.equal(serialized.includes("9999"), false);
});

test("anomaly groups without enough identifiable subjects or with missing status are safely handled", () => {
  const result = summarizeAnomalies([
    ...Array.from({ length: 5 }, (_, index) => ({
      employeeKey: `EMP-${index}`,
      source: "unrecognized-source",
      period: null,
      reasonCode: "unrecognized-private-code",
      flagged: null,
      moneyAtRisk: null,
    })),
    { employeeKey: null, source: null, period: null, reasonCode: null, flagged: null, moneyAtRisk: null },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].source, "Other");
  assert.equal(result[0].period, "Period not provided");
  assert.equal(result[0].reasonCategory, "Other model category");
  assert.equal(result[0].status, "Model status unavailable");
  assert.equal(result[0].moneyAtRiskTotal, null);
  assert.equal(JSON.stringify(result).includes("unrecognized-private-code"), false);
});
