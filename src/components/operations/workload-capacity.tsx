"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkloadMetric, WorkloadResult } from "@/lib/workload-rules";

type Option = { team_id: string; team_name: string };
type SprintOption = {
  sprint_id: string;
  sprint_name: string;
  start_date: string | null;
  end_date: string | null;
  working_days: number | null;
};
type ApiResponse = {
  success: boolean;
  message?: string;
  teams?: Option[];
  sprints?: SprintOption[];
  selectedSprint?: string | null;
  result?: WorkloadResult | null;
};

function points(metric: { knownPoints: number; unknownTasks: number }) {
  return `${metric.knownPoints.toLocaleString()} known${metric.unknownTasks ? ` · ${metric.unknownTasks} unestimated` : ""}`;
}

function dateRange(start: string, end: string) {
  return start === end ? start : `${start} – ${end}`;
}

export function WorkloadCapacity() {
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [teams, setTeams] = useState<Option[]>([]);
  const [sprintId, setSprintId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [result, setResult] = useState<WorkloadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (sprintId) query.set("sprintId", sprintId);
    if (teamId) query.set("teamId", teamId);
    setLoading(true);
    setError(null);
    fetch(`/api/v1/workload?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.success) {
          throw new Error(body.message ?? "Unable to load workload data.");
        }
        return body;
      })
      .then((body) => {
        setTeams(body.teams ?? []);
        setSprints(body.sprints ?? []);
        setResult(body.result ?? null);
        if (body.selectedSprint && body.selectedSprint !== sprintId) {
          setSprintId(body.selectedSprint);
        } else if (sprintId && !(body.sprints ?? []).some((sprint) => sprint.sprint_id === sprintId)) {
          setSprintId(body.sprints?.[0]?.sprint_id ?? "");
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Unable to load workload data.");
        setResult(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sprintId, teamId]);

  return (
    <div className="mt-6 space-y-5">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Sprint
            <select
              aria-label="Select sprint"
              className="min-h-11 w-full rounded-md border border-border bg-background px-3"
              value={sprintId}
              onChange={(event) => setSprintId(event.target.value)}
            >
              {!sprints.length && <option value="">No visible sprints</option>}
              {sprints.map((sprint) => (
                <option key={sprint.sprint_id} value={sprint.sprint_id}>
                  {sprint.sprint_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Team
            <select
              aria-label="Filter by team"
              className="min-h-11 w-full rounded-md border border-border bg-background px-3"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
            >
              <option value="">All permitted teams</option>
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary-soft/30">
        <CardHeader><CardTitle className="text-base">How capacity is estimated</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Historical velocity = completed story points ÷ available working days.</p>
          <p>Estimated capacity = median of up to 5 recent valid sprint velocities × available working days.</p>
          <p>Available working days = max(0, calculated sprint working days − unique approved leave weekdays).</p>
          <p>Overload = max(0, planned points − capacity). Leave never changes assigned story points.</p>
          <p className="text-muted">At least 3 valid historical sprints are required. National holidays are treated as applicable; Regional and Optional holidays are not deducted because employee applicability or opt-in data is unavailable.</p>
        </CardContent>
      </Card>

      {error && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">{error}</p>}
      {loading && <p role="status" className="text-sm text-muted">Loading workload…</p>}
      {!loading && !error && !result && (
        <Card><CardContent className="p-6 text-center text-sm text-muted">No task sprints are visible in your permitted scope.</CardContent></Card>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{result.sprint.sprint_name}</h2>
              <p className="text-sm text-muted">
                {result.sprint.start_date && result.sprint.end_date
                  ? dateRange(result.sprint.start_date, result.sprint.end_date)
                  : "Sprint dates unavailable"}
              </p>
            </div>
            <Badge variant={result.sprint.working_day_mismatch ? "warning" : "default"}>
              {result.sprint.calculated_working_days} calculated working days
            </Badge>
          </div>

          {result.sprint.working_day_mismatch && (
            <div role="status" className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Sprint is configured for {result.sprint.working_days ?? "an unspecified number of"} working days, but the calendar calculation gives {result.sprint.calculated_working_days}. Capacity uses the calendar calculation.
            </div>
          )}
          {result.holiday_policy.uncertain.length > 0 && (
            <div role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              Regional/Optional holiday applicability is unknown and these dates were not deducted:{" "}
              {result.holiday_policy.uncertain.map((holiday) => `${holiday.holiday_date} (${holiday.holiday_name})`).join(", ")}.
            </div>
          )}

          <section aria-label="Sprint points summary" className="grid gap-3 sm:grid-cols-3">
            {([
              ["Planned", result.summary.planned],
              ["Completed", result.summary.completed],
              ["Open", result.summary.open],
            ] as [string, WorkloadMetric][]).map(([label, metric]) => (
              <Card key={label as string}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{points(metric)} pts</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section aria-label="Employee workload" className="grid gap-4 xl:grid-cols-2">
            {result.employees.map((employee) => (
              <Card key={employee.employee_id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="break-words text-base">{employee.employee_name}</CardTitle>
                      <p className="mt-1 flex items-start gap-1 break-words text-xs text-muted">
                        <Users aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                        {employee.team_names.join(", ") || "Team not assigned"}
                      </p>
                    </div>
                    {employee.overload !== null && employee.overload > 0 && (
                      <Badge variant="danger">Overloaded by {employee.overload.toFixed(1)} pts</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted">Open:</span> {points(employee.open)} pts</p>
                    <p><span className="text-muted">Planned:</span> {points(employee.planned)} pts</p>
                    <p><span className="text-muted">Completed:</span> {points(employee.completed)} pts</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted">Available days:</span> {employee.available_working_days}</p>
                    <p><span className="text-muted">Capacity:</span> {employee.capacity === null ? "Not enough history" : `${employee.capacity.toFixed(1)} pts`}</p>
                    <p><span className="text-muted">Median velocity:</span> {employee.historical_velocity === null ? "Not enough history" : `${employee.historical_velocity.toFixed(2)} pts/day`}</p>
                    <p><span className="text-muted">History:</span> {employee.history_sprint_count} / 3 minimum valid sprints</p>
                  </div>
                  {employee.planned.unknownTasks > 0 && (
                    <p className="sm:col-span-2 text-xs text-warning">Overload cannot be determined precisely while planned tasks have missing story points.</p>
                  )}
                  {employee.history_sprints_with_unknown_completed_points > 0 && (
                    <p className="sm:col-span-2 text-xs text-warning">{employee.history_sprints_with_unknown_completed_points} historical sprint(s) with completed tasks missing story points were excluded from the velocity baseline.</p>
                  )}
                  <div className="sm:col-span-2 border-t border-border pt-3">
                    <p className="font-medium">Approved leave · {employee.approved_leave_working_days} affected working days</p>
                    {employee.leave_periods.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-muted">
                        {employee.leave_periods.map((leave) => (
                          <li key={leave.leave_request_id}>
                            {leave.leave_type_code}: {dateRange(leave.start_date, leave.end_date)} · {leave.affected_working_days} unique weekdays
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1 text-sm text-muted">No approved leave overlapping this sprint.</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!result.employees.length && (
              <Card><CardContent className="p-6 text-center text-sm text-muted">No assigned employees have tasks matching these filters.</CardContent></Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
