export type WorkloadSprint = {
  sprint_id: string;
  sprint_name: string;
  start_date: string | null;
  end_date: string | null;
  working_days: number | null;
};

export type WorkloadTask = {
  task_id: string;
  sprint_id: string;
  team_id: string;
  team_name: string;
  assignee_employee_id: string | null;
  assignee_name: string | null;
  status: string | null;
  story_points: number | null;
};

export type WorkloadLeave = {
  leave_request_id: string;
  employee_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  leave_type_code: string;
};

export type WorkloadHoliday = {
  holiday_date: string;
  holiday_name: string;
  holiday_type: string | null;
};

export type WorkloadMetric = {
  knownPoints: number;
  unknownTasks: number;
};

export type WorkloadEmployee = {
  employee_id: string;
  employee_name: string;
  team_names: string[];
  open: WorkloadMetric;
  planned: WorkloadMetric;
  completed: WorkloadMetric;
  leave_periods: {
    leave_request_id: string;
    leave_type_code: string;
    start_date: string;
    end_date: string;
    affected_working_days: number;
  }[];
  approved_leave_working_days: number;
  available_working_days: number;
  capacity: number | null;
  historical_velocity: number | null;
  history_sprint_count: number;
  history_sprints_with_unknown_completed_points: number;
  has_sufficient_history: boolean;
  overload: number | null;
};

export type WorkloadResult = {
  sprint: WorkloadSprint & {
    calculated_working_days: number;
    working_day_mismatch: boolean;
  };
  summary: {
    planned: WorkloadMetric;
    completed: WorkloadMetric;
    open: WorkloadMetric;
  };
  employees: WorkloadEmployee[];
  holiday_policy: {
    applicable_type: "National";
    uncertain: WorkloadHoliday[];
  };
};

export const OPEN_TASK_STATUSES = ["To Do", "In Progress", "Blocked"] as const;
export const MINIMUM_HISTORY_SPRINTS = 3;
export const MAX_HISTORY_SPRINTS = 5;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addMetricPoint(metric: WorkloadMetric, points: number | null) {
  if (points === null || !Number.isFinite(points)) {
    metric.unknownTasks++;
  } else {
    metric.knownPoints += points;
  }
}

function emptyMetric(): WorkloadMetric {
  return { knownPoints: 0, unknownTasks: 0 };
}

function includedHolidayDates(holidays: WorkloadHoliday[], start: string, end: string) {
  return new Set(
    holidays
      .filter(
        (holiday) =>
          holiday.holiday_type?.trim().toUpperCase() === "NATIONAL" &&
          holiday.holiday_date >= start &&
          holiday.holiday_date <= end &&
          isIsoDate(holiday.holiday_date),
      )
      .map((holiday) => holiday.holiday_date),
  );
}

export function getWorkingDates(
  start: string,
  end: string,
  holidays: WorkloadHoliday[],
): string[] {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return [];
  const holidayDates = includedHolidayDates(holidays, start, end);
  const dates: string[] = [];
  const day = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  for (; day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holidayDates.has(date)) dates.push(date);
  }
  return dates;
}

function approvedLeaveDates(
  employeeId: string,
  sprint: WorkloadSprint,
  leaves: WorkloadLeave[],
  holidays: WorkloadHoliday[],
) {
  if (!sprint.start_date || !sprint.end_date) {
    return { dates: new Set<string>(), periods: [] as WorkloadEmployee["leave_periods"] };
  }
  const workingDates = new Set(getWorkingDates(sprint.start_date, sprint.end_date, holidays));
  const dates = new Set<string>();
  const periods: WorkloadEmployee["leave_periods"] = [];

  for (const leave of [...leaves].sort(
    (a, b) =>
      (a.start_date ?? "").localeCompare(b.start_date ?? "") ||
      a.leave_request_id.localeCompare(b.leave_request_id),
  )) {
    if (
      leave.employee_id !== employeeId ||
      leave.status !== "Approved" ||
      !leave.start_date ||
      !leave.end_date ||
      !isIsoDate(leave.start_date) ||
      !isIsoDate(leave.end_date) ||
      leave.end_date < sprint.start_date ||
      leave.start_date > sprint.end_date
    ) {
      continue;
    }

    const from = leave.start_date < sprint.start_date ? sprint.start_date : leave.start_date;
    const to = leave.end_date > sprint.end_date ? sprint.end_date : leave.end_date;
    const affectedDates = getWorkingDates(from, to, holidays)
      .filter((date) => workingDates.has(date))
      .filter((date) => !dates.has(date));
    for (const date of affectedDates) dates.add(date);
    periods.push({
      leave_request_id: leave.leave_request_id,
      leave_type_code: leave.leave_type_code,
      start_date: from,
      end_date: to,
      affected_working_days: affectedDates.length,
    });
  }
  return { dates, periods };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function addTaskToSummary(
  summary: WorkloadResult["summary"],
  task: WorkloadTask,
) {
  if (task.status !== "Cancelled") addMetricPoint(summary.planned, task.story_points);
  if (task.status === "Done") addMetricPoint(summary.completed, task.story_points);
  if (OPEN_TASK_STATUSES.includes(task.status as (typeof OPEN_TASK_STATUSES)[number])) {
    addMetricPoint(summary.open, task.story_points);
  }
}

export function calculateWorkload(
  selectedSprint: WorkloadSprint,
  currentTasks: WorkloadTask[],
  historyTasks: WorkloadTask[],
  historicalSprints: WorkloadSprint[],
  leaves: WorkloadLeave[],
  holidays: WorkloadHoliday[],
): WorkloadResult {
  const sprintDates =
    selectedSprint.start_date && selectedSprint.end_date
      ? getWorkingDates(selectedSprint.start_date, selectedSprint.end_date, holidays)
      : [];
  const configuredWorkingDays =
    typeof selectedSprint.working_days === "number" &&
    Number.isFinite(selectedSprint.working_days)
      ? selectedSprint.working_days
      : null;
  const summary: WorkloadResult["summary"] = {
    planned: emptyMetric(),
    completed: emptyMetric(),
    open: emptyMetric(),
  };
  const employeeMap = new Map<
    string,
    {
      name: string;
      teams: Set<string>;
      open: WorkloadMetric;
      planned: WorkloadMetric;
      completed: WorkloadMetric;
    }
  >();

  for (const task of currentTasks) {
    addTaskToSummary(summary, task);
    if (!task.assignee_employee_id) continue;
    let employee = employeeMap.get(task.assignee_employee_id);
    if (!employee) {
      employee = {
        name: task.assignee_name ?? task.assignee_employee_id,
        teams: new Set<string>(),
        open: emptyMetric(),
        planned: emptyMetric(),
        completed: emptyMetric(),
      };
      employeeMap.set(task.assignee_employee_id, employee);
    }
    employee.teams.add(task.team_name);
    if (task.status !== "Cancelled") addMetricPoint(employee.planned, task.story_points);
    if (task.status === "Done") addMetricPoint(employee.completed, task.story_points);
    if (OPEN_TASK_STATUSES.includes(task.status as (typeof OPEN_TASK_STATUSES)[number])) {
      addMetricPoint(employee.open, task.story_points);
    }
  }

  const sprintById = new Map(historicalSprints.map((sprint) => [sprint.sprint_id, sprint]));
  const employees = [...employeeMap.entries()].map(([employeeId, employee]) => {
    const leave = approvedLeaveDates(employeeId, selectedSprint, leaves, holidays);
    const availableDays = Math.max(0, sprintDates.length - leave.dates.size);
    const historyBySprint = new Map<string, WorkloadTask[]>();
    for (const task of historyTasks) {
      if (task.assignee_employee_id !== employeeId) continue;
      const historySprint = sprintById.get(task.sprint_id);
      if (
        !historySprint?.start_date ||
        !selectedSprint.start_date ||
        historySprint.start_date >= selectedSprint.start_date
      ) {
        continue;
      }
      const tasks = historyBySprint.get(task.sprint_id) ?? [];
      tasks.push(task);
      historyBySprint.set(task.sprint_id, tasks);
    }

    const historyUnknownPointSprintCount = [...historyBySprint.values()].filter((tasks) =>
      tasks.some(
        (task) =>
          task.status === "Done" &&
          (task.story_points === null || !Number.isFinite(task.story_points)),
      ),
    ).length;
    const historyRates = [...historyBySprint.entries()]
      .map(([sprintId, tasks]) => {
        const sprint = sprintById.get(sprintId)!;
        if (sprint.start_date === null || sprint.end_date === null) return null;
        const plannedParticipation = tasks.some((task) => task.status !== "Cancelled");
        const completedTasks = tasks.filter((task) => task.status === "Done");
        if (
          !plannedParticipation ||
          completedTasks.some((task) => task.story_points === null || !Number.isFinite(task.story_points))
        ) {
          return null;
        }
        const workdays = getWorkingDates(sprint.start_date, sprint.end_date, holidays).length;
        const leaveDays = approvedLeaveDates(employeeId, sprint, leaves, holidays).dates.size;
        const available = Math.max(0, workdays - leaveDays);
        if (!available) return null;
        const completed = completedTasks.reduce((total, task) => total + (task.story_points ?? 0), 0);
        return { sprint, rate: completed / available };
      })
      .filter((entry): entry is { sprint: WorkloadSprint; rate: number } => entry !== null)
      .sort((a, b) => (b.sprint.start_date ?? "").localeCompare(a.sprint.start_date ?? ""))
      .slice(0, MAX_HISTORY_SPRINTS);

    const hasEnoughHistory = historyRates.length >= MINIMUM_HISTORY_SPRINTS;
    const velocity = hasEnoughHistory
      ? median(historyRates.map((entry) => entry.rate))
      : null;
    const capacity = velocity === null ? null : velocity * availableDays;

    return {
      employee_id: employeeId,
      employee_name: employee.name,
      team_names: [...employee.teams].sort((a, b) => a.localeCompare(b)),
      open: employee.open,
      planned: employee.planned,
      completed: employee.completed,
      leave_periods: leave.periods.sort((a, b) => a.start_date.localeCompare(b.start_date)),
      approved_leave_working_days: leave.dates.size,
      available_working_days: availableDays,
      capacity,
      historical_velocity: velocity,
      history_sprint_count: historyRates.length,
      history_sprints_with_unknown_completed_points: historyUnknownPointSprintCount,
      has_sufficient_history: hasEnoughHistory,
      overload:
        capacity === null || employee.planned.unknownTasks > 0
          ? null
          : Math.max(0, employee.planned.knownPoints - capacity),
    };
  }).sort((a, b) => a.employee_name.localeCompare(b.employee_name));

  const uncertainHolidays =
    selectedSprint.start_date && selectedSprint.end_date
      ? holidays.filter(
          (holiday) =>
            holiday.holiday_type?.trim().toUpperCase() !== "NATIONAL" &&
            holiday.holiday_date >= selectedSprint.start_date! &&
            holiday.holiday_date <= selectedSprint.end_date!,
        )
      : [];

  return {
    sprint: {
      ...selectedSprint,
      calculated_working_days: sprintDates.length,
      working_day_mismatch:
        configuredWorkingDays !== null && configuredWorkingDays !== sprintDates.length,
    },
    summary,
    employees,
    holiday_policy: { applicable_type: "National", uncertain: uncertainHolidays },
  };
}
