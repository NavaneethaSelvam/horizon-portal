export const MINIMUM_SENSITIVE_GROUP_SIZE = 5;
export const UNMAPPED_DEPARTMENT_ID = "UNMAPPED";

export type AttritionInput = {
  employeeKey: string;
  riskBand: string | null;
  reasons: (string | null)[];
};

export type AttritionSummary = {
  hasData: boolean;
  bands: {
    band: "High" | "Medium" | "Low";
    count: number | null;
    suppressed: boolean;
  }[];
  topReasons: { category: string; count: number }[];
  hasSuppressedReasonGroups: boolean;
};

export type AnomalyInput = {
  employeeKey: string | null;
  source: string | null;
  period: string | null;
  reasonCode: string | null;
  flagged: boolean | null;
  moneyAtRisk: number | null;
};

export type AnomalyCard = {
  source: "Payroll" | "Attendance" | "Other";
  period: string;
  reasonCategory: string;
  status: string;
  recordCount: number;
  moneyAtRiskTotal: number | null;
  hasMissingMoneyAtRisk: boolean;
};

export function attritionReasonCategory(reason: string | null): string {
  const normalized = reason?.trim().toLowerCase() ?? "";
  if (normalized.includes("engagement")) return "Engagement";
  if (normalized.includes("experience") || normalized.includes("tenure")) {
    return "Experience profile";
  }
  if (
    normalized.includes("wfh") ||
    normalized.includes("remote") ||
    normalized.includes("work arrangement")
  ) {
    return "Work arrangement";
  }
  if (
    normalized.includes("pay") ||
    normalized.includes("salary") ||
    normalized.includes("compensation")
  ) {
    return "Compensation position";
  }
  return "Other model factors";
}

function distinctSubjectCount(records: { employeeKey: string }[]) {
  return new Set(records.map((record) => record.employeeKey)).size;
}

export function summarizeAttrition(rows: AttritionInput[]): AttritionSummary {
  const supportedBands = ["High", "Medium", "Low"] as const;
  const bands = supportedBands.map((band) => {
    const records = rows.filter((row) => row.riskBand === band);
    const count = distinctSubjectCount(
      records.map((row) => ({ employeeKey: row.employeeKey })),
    );
    const suppressed = count < MINIMUM_SENSITIVE_GROUP_SIZE;
    return { band, count: suppressed ? null : count, suppressed };
  });

  const subjectsByReason = new Map<string, Set<string>>();
  for (const row of rows) {
    const categories = new Set(row.reasons.filter(Boolean).map(attritionReasonCategory));
    for (const category of categories) {
      const subjects = subjectsByReason.get(category) ?? new Set<string>();
      subjects.add(row.employeeKey);
      subjectsByReason.set(category, subjects);
    }
  }
  const allReasons = [...subjectsByReason.entries()];
  const visibleReasons = allReasons
    .filter(([, subjects]) => subjects.size >= MINIMUM_SENSITIVE_GROUP_SIZE)
    .map(([category, subjects]) => ({ category, count: subjects.size }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return {
    hasData: rows.length > 0,
    bands,
    topReasons: visibleReasons.slice(0, 5),
    hasSuppressedReasonGroups: allReasons.some(
      ([, subjects]) => subjects.size < MINIMUM_SENSITIVE_GROUP_SIZE,
    ),
  };
}

function anomalySource(source: string | null): AnomalyCard["source"] {
  if (source === "payroll_monthly_features") return "Payroll";
  if (source === "attendance_monthly_features") return "Attendance";
  return "Other";
}

function anomalyReasonCategory(reasonCode: string | null): string {
  switch (reasonCode) {
    case "NO_ATTENDANCE":
    case "LONG_UNPAID_ABSENCE":
    case "PATTERN_SHIFT":
    case "FREQUENT_LATE":
      return "Attendance pattern";
    case "NEGATIVE_NET_PAY":
    case "GROSS_ABOVE_NORM":
    case "GROSS_BELOW_EXPECTED":
    case "ZERO_PAY":
      return "Pay variance";
    case "OVERTIME_ABOVE_CAP":
      return "Overtime review";
    case "PF_NOT_DEDUCTED":
      return "Payroll compliance";
    case "STATISTICAL_OUTLIER":
      return "Statistical outlier";
    default:
      return "Other model category";
  }
}

function anomalyStatus(flagged: boolean | null): string {
  if (flagged === true) return "Model flagged — requires human review";
  if (flagged === false) return "Not flagged by model";
  return "Model status unavailable";
}

function displayPeriod(period: string | null): string {
  if (!period) return "Period not provided";
  const match = period.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  return match ? `${match[1]}-${match[2]}` : "Period not provided";
}

export function summarizeAnomalies(rows: AnomalyInput[]): AnomalyCard[] {
  const groups = new Map<
    string,
    {
      source: AnomalyCard["source"];
      period: string;
      reasonCategory: string;
      status: string;
      employeeKeys: Set<string>;
      recordCount: number;
      moneyAtRiskTotal: number;
      knownMoneyCount: number;
      hasMissingMoneyAtRisk: boolean;
    }
  >();

  for (const row of rows) {
    const source = anomalySource(row.source);
    const period = displayPeriod(row.period);
    const reasonCategory = anomalyReasonCategory(row.reasonCode);
    const status = anomalyStatus(row.flagged);
    const key = JSON.stringify([source, period, reasonCategory, status]);
    const group = groups.get(key) ?? {
      source,
      period,
      reasonCategory,
      status,
      employeeKeys: new Set<string>(),
      recordCount: 0,
      moneyAtRiskTotal: 0,
      knownMoneyCount: 0,
      hasMissingMoneyAtRisk: false,
    };
    if (row.employeeKey) group.employeeKeys.add(row.employeeKey);
    group.recordCount++;
    if (row.moneyAtRisk === null || !Number.isFinite(row.moneyAtRisk)) {
      group.hasMissingMoneyAtRisk = true;
    } else {
      group.moneyAtRiskTotal += row.moneyAtRisk;
      group.knownMoneyCount++;
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter((group) => group.employeeKeys.size >= MINIMUM_SENSITIVE_GROUP_SIZE)
    .map((group) => ({
      source: group.source,
      period: group.period,
      reasonCategory: group.reasonCategory,
      status: group.status,
      recordCount: group.recordCount,
      moneyAtRiskTotal: group.knownMoneyCount ? group.moneyAtRiskTotal : null,
      hasMissingMoneyAtRisk: group.hasMissingMoneyAtRisk,
    }))
    .sort((a, b) => {
      if (a.moneyAtRiskTotal === null) return b.moneyAtRiskTotal === null ? 0 : 1;
      if (b.moneyAtRiskTotal === null) return -1;
      return b.moneyAtRiskTotal - a.moneyAtRiskTotal;
    });
}
