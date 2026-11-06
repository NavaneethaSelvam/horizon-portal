"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MINIMUM_SENSITIVE_GROUP_SIZE,
  type AnomalyCard,
  type AttritionSummary,
} from "@/lib/ai-insights-rules";

type DepartmentOption = { department_id: string; department_name: string };
type InsightsResult = {
  departmentName: string;
  attrition: AttritionSummary | null;
  anomalies: AnomalyCard[];
  disclosure: "AI-generated, for human review";
  humanReviewNotice: string;
};
type ApiResponse = {
  success: boolean;
  message?: string;
  departments?: DepartmentOption[];
  selectedDepartmentId?: string | null;
  result?: InsightsResult | null;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function AnomalyCards({ items }: { items: AnomalyCard[] }) {
  if (!items.length) {
    return (
      <p className="rounded-lg border border-border p-4 text-sm text-muted">
        No anomaly groups meet the privacy threshold for this department and period.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <Card key={`${item.source}-${item.period}-${item.reasonCategory}-${item.status}-${index}`}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>{item.reasonCategory}</CardTitle>
                <p className="mt-1 text-sm text-muted">{item.source} · {item.period}</p>
              </div>
              <Badge variant={item.source === "Payroll" ? "info" : "default"}>
                {item.source}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>AI-generated, for human review</strong></p>
            <p className="text-sm">{item.status}</p>
            <p className="text-sm text-muted">
              {item.recordCount} grouped model output records; these are not confirmed errors or fraud.
            </p>
            <p className="text-sm">
              Money at risk (aggregate; dataset does not specify currency):{" "}
              <strong>
                {item.moneyAtRiskTotal === null
                  ? "Not reported"
                  : formatAmount(item.moneyAtRiskTotal)}
              </strong>
            </p>
            {item.hasMissingMoneyAtRisk && (
              <p className="text-xs text-muted">
                Money-at-risk data is missing for one or more records in this group.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AiInsightsWorkspace() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = departmentId
      ? `?departmentId=${encodeURIComponent(departmentId)}`
      : "";
    setLoading(true);
    setError(null);
    fetch(`/api/v1/insights${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.success) {
          throw new Error(body.message ?? "Unable to load AI insights.");
        }
        return body;
      })
      .then((body) => {
        const options = body.departments ?? [];
        setDepartments(options);
        setResult(body.result ?? null);
        if (!departmentId && options.length) {
          setDepartmentId(options[0].department_id);
        }
        if (
          departmentId &&
          !options.some((department) => department.department_id === departmentId)
        ) {
          setDepartmentId("");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load AI insights.");
        setResult(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [departmentId]);

  return (
    <div className="mt-6 space-y-5">
      <div role="note" className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="space-y-1 text-sm">
          <p><strong>Human review required.</strong> AI outputs are advisory only and must not automatically determine termination, promotion, salary changes, disciplinary action, or other employment decisions.</p>
          <p>These are sample/model outputs, not verified fraud, confirmed payroll errors, or established employee risk.</p>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-2 p-4">
          <label htmlFor="insights-department" className="text-sm font-medium">
            Department
          </label>
          <select
            id="insights-department"
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 sm:max-w-md"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            disabled={!departments.length}
          >
            {!departments.length && <option value="">Loading departments…</option>}
            {departments.map((department) => (
              <option key={department.department_id} value={department.department_id}>
                {department.department_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Select one department at a time. Cross-department totals are not shown to reduce the risk of deriving suppressed groups.
          </p>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
          {error}
        </p>
      )}
      {loading && <p role="status" className="text-sm text-muted">Loading aggregate insights…</p>}
      {!loading && !error && !result && (
        <Card><CardContent className="p-5 text-sm text-muted">No insights are available.</CardContent></Card>
      )}

      {result && (
        <>
          <section aria-labelledby="attrition-heading" className="space-y-3">
            <div className="flex items-start gap-3">
              <BrainCircuit aria-hidden="true" className="mt-1 size-5 text-primary" />
              <div>
                <h2 id="attrition-heading" className="text-lg font-semibold">Attrition risk bands · {result.departmentName}</h2>
                <p className="text-sm text-muted">Aggregate sample/model band counts only. No individual scores, names, IDs, or raw reasons are shown.</p>
              </div>
            </div>
            <p><strong>AI-generated, for human review</strong></p>
            {!result.attrition?.hasData ? (
              <p className="rounded-lg border border-border p-4 text-sm text-muted">No attrition records are mapped to this department.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {result.attrition.bands.map(({ band, count, suppressed }) => (
                    <Card key={band}>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted">{band}</p>
                        <p className="mt-1 text-2xl font-bold">
                          {suppressed ? "Suppressed" : count?.toLocaleString("en-IN")}
                        </p>
                        {suppressed && <p className="mt-1 text-xs text-muted">Fewer than {MINIMUM_SENSITIVE_GROUP_SIZE} people.</p>}
                        <p className="mt-2 text-xs text-muted"><strong>AI-generated, for human review</strong></p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader><CardTitle>Top reason categories</CardTitle></CardHeader>
                  <CardContent>
                    {result.attrition.topReasons.length ? (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {result.attrition.topReasons.map(({ category, count }) => (
                          <li key={category} className="flex justify-between gap-3 rounded-md border border-border p-3 text-sm">
                            <span>{category}</span><strong>{count}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">No reason category meets the privacy threshold.</p>
                    )}
                    {result.attrition.hasSuppressedReasonGroups && (
                      <p className="mt-3 text-xs text-muted">Some reason categories are suppressed because fewer than {MINIMUM_SENSITIVE_GROUP_SIZE} people are represented.</p>
                    )}
                    <p className="mt-3 text-xs"><strong>AI-generated, for human review</strong></p>
                  </CardContent>
                </Card>
              </>
            )}
          </section>

          <section aria-labelledby="anomalies-heading" className="space-y-3">
            <div>
              <h2 id="anomalies-heading" className="text-lg font-semibold">Payroll and attendance model outputs</h2>
              <p className="text-sm text-muted">Grouped by source, period, reason category, and model status; ranked by aggregate money-at-risk where available. Groups with fewer than {MINIMUM_SENSITIVE_GROUP_SIZE} matched people are suppressed.</p>
            </div>
            <p><strong>AI-generated, for human review</strong></p>
            <AnomalyCards items={result.anomalies} />
          </section>
        </>
      )}
    </div>
  );
}
