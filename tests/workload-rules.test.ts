import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWorkload,
  getWorkingDates,
  type WorkloadHoliday,
  type WorkloadLeave,
  type WorkloadSprint,
  type WorkloadTask,
} from "../src/lib/workload-rules";

const sprint = (id: string, start: string, end: string, workingDays = 10): WorkloadSprint => ({
  sprint_id: id,
  sprint_name: id,
  start_date: start,
  end_date: end,
  working_days: workingDays,
});

const task = (
  id: string,
  sprintId: string,
  status: string | null,
  storyPoints: number | null,
  employee = "E-1",
): WorkloadTask => ({
  task_id: id,
  sprint_id: sprintId,
  team_id: "T-1",
  team_name: "Team One",
  assignee_employee_id: employee,
  assignee_name: "Employee One",
  status,
  story_points: storyPoints,
});

const leave = (
  id: string,
  start: string,
  end: string,
  status = "Approved",
  employee = "E-1",
): WorkloadLeave => ({
  leave_request_id: id,
  employee_id: employee,
  start_date: start,
  end_date: end,
  status,
  leave_type_code: "AL",
});

test("classifies all task statuses into planned, completed and open totals", () => {
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-30"),
    [
      task("TODO", "S-CURRENT", "To Do", 1),
      task("PROGRESS", "S-CURRENT", "In Progress", 2),
      task("BLOCKED", "S-CURRENT", "Blocked", 3),
      task("DONE", "S-CURRENT", "Done", 4),
      task("CANCELLED", "S-CURRENT", "Cancelled", 5),
    ],
    [],
    [],
    [],
    [],
  );
  assert.deepEqual(result.summary.planned, { knownPoints: 10, unknownTasks: 0 });
  assert.deepEqual(result.summary.completed, { knownPoints: 4, unknownTasks: 0 });
  assert.deepEqual(result.summary.open, { knownPoints: 6, unknownTasks: 0 });
  assert.deepEqual(result.employees[0].planned, { knownPoints: 10, unknownTasks: 0 });
});

test("intersects leave with sprint dates, excludes weekends and applicable National holidays", () => {
  const holidays: WorkloadHoliday[] = [
    { holiday_date: "2026-10-19", holiday_name: "National", holiday_type: "National" },
    { holiday_date: "2026-10-20", holiday_name: "Regional", holiday_type: "Regional" },
    { holiday_date: "2026-10-21", holiday_name: "Optional", holiday_type: "Optional" },
  ];
  assert.deepEqual(
    getWorkingDates("2026-10-17", "2026-10-24", holidays),
    ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"],
  );
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-23", 4),
    [task("T1", "S-CURRENT", "To Do", 1)],
    [],
    [],
    [leave("LR-1", "2026-10-17", "2026-10-20")],
    holidays,
  );
  assert.equal(result.employees[0].approved_leave_working_days, 1);
  assert.equal(result.employees[0].leave_periods[0].start_date, "2026-10-19");
  assert.equal(result.employees[0].leave_periods[0].end_date, "2026-10-20");
  assert.equal(result.sprint.calculated_working_days, 4);
  assert.equal(result.sprint.working_day_mismatch, false);
  assert.deepEqual(result.holiday_policy.uncertain.map((holiday) => holiday.holiday_type), [
    "Regional",
    "Optional",
  ]);
});

test("deduplicates overlapping approved leave and ignores non-approved leave", () => {
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-30"),
    [task("T1", "S-CURRENT", "To Do", 1)],
    [],
    [],
    [
      leave("LR-1", "2026-10-20", "2026-10-22"),
      leave("LR-2", "2026-10-22", "2026-10-23"),
      leave("LR-PENDING", "2026-10-26", "2026-10-27", "Pending"),
    ],
    [],
  );
  assert.equal(result.employees[0].approved_leave_working_days, 4);
  assert.equal(result.employees[0].available_working_days, 6);
  assert.deepEqual(result.employees[0].leave_periods.map((period) => period.affected_working_days), [3, 1,]);
});

test("reports missing story points and leaves overload indeterminate", () => {
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-30"),
    [
      task("KNOWN", "S-CURRENT", "To Do", 3),
      task("UNKNOWN", "S-CURRENT", "Done", null),
    ],
    [],
    [],
    [],
    [],
  );
  assert.deepEqual(result.summary.planned, { knownPoints: 3, unknownTasks: 1 });
  assert.deepEqual(result.summary.completed, { knownPoints: 0, unknownTasks: 1 });
  assert.equal(result.employees[0].overload, null);
});

test("excludes and reports historical velocity when completed points are missing", () => {
  const historySprints = [
    sprint("S-1", "2026-08-03", "2026-08-14"),
    sprint("S-2", "2026-08-17", "2026-08-28"),
    sprint("S-3", "2026-08-31", "2026-09-11"),
  ];
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-30"),
    [task("CURRENT", "S-CURRENT", "To Do", 2)],
    [
      task("DONE-1", "S-1", "Done", 10),
      task("DONE-2", "S-2", "Done", 20),
      task("DONE-3", "S-3", "Done", null),
    ],
    historySprints,
    [],
    [],
  );
  assert.equal(result.employees[0].history_sprint_count, 2);
  assert.equal(result.employees[0].history_sprints_with_unknown_completed_points, 1);
  assert.equal(result.employees[0].capacity, null);
});

test("requires three valid prior sprints and calculates median velocity capacity and overload", () => {
  const historySprints = [
    sprint("S-1", "2026-08-03", "2026-08-14"),
    sprint("S-2", "2026-08-17", "2026-08-28"),
    sprint("S-3", "2026-08-31", "2026-09-11"),
  ];
  const historyTasks = historySprints.map((entry, index) =>
    task(`DONE-${entry.sprint_id}`, entry.sprint_id, "Done", (index + 1) * 10),
  );
  const current = sprint("S-CURRENT", "2026-10-19", "2026-10-30");
  const currentTask = task("CURRENT", current.sprint_id, "To Do", 20);
  const insufficient = calculateWorkload(
    current,
    [currentTask],
    historyTasks.slice(0, 2),
    historySprints.slice(0, 2),
    [],
    [],
  );
  assert.equal(insufficient.employees[0].capacity, null);
  assert.equal(insufficient.employees[0].has_sufficient_history, false);

  const sufficient = calculateWorkload(
    current,
    [currentTask],
    historyTasks,
    historySprints,
    [leave("LR-1", "2026-10-19", "2026-10-20")],
    [],
  );
  assert.equal(sufficient.employees[0].historical_velocity, 2);
  assert.equal(sufficient.employees[0].available_working_days, 8);
  assert.equal(sufficient.employees[0].capacity, 16);
  assert.equal(sufficient.employees[0].overload, 4);
});

test("flags a mismatch between configured and calculated sprint working days", () => {
  const result = calculateWorkload(
    sprint("S-CURRENT", "2026-10-19", "2026-10-30", 9),
    [],
    [],
    [],
    [],
    [],
  );
  assert.equal(result.sprint.calculated_working_days, 10);
  assert.equal(result.sprint.working_day_mismatch, true);
});
