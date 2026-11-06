export const TASK_BOARD_STATUSES = [
  "To Do",
  "In Progress",
  "Blocked",
  "Done",
  "Cancelled",
] as const;

export type TaskBoardStatus = (typeof TASK_BOARD_STATUSES)[number];

export type TaskBoardTask = {
  task_id: string;
  team_id: string;
  sprint_id: string;
  assignee_employee_id: string | null;
  task_type: string | null;
  priority: string | null;
  story_points: number | null;
  due_date: string | null;
  status: string | null;
  version: number;
  team_name: string;
  sprint_name: string;
  assignee_name: string | null;
};

export type TaskMoveResult =
  | { kind: "success"; task: TaskBoardTask }
  | { kind: "conflict"; task: TaskBoardTask }
  | { kind: "failure" };

export type TaskToastKind = "success" | "error";
export type TaskFeedbackToast = {
  id: number;
  kind: TaskToastKind;
  message: string;
};

export function hasActiveTaskToast(
  toasts: TaskFeedbackToast[],
  kind: TaskToastKind,
  message: string,
): boolean {
  return toasts.some((toast) => toast.kind === kind && toast.message === message);
}

export function settleTaskMove(
  tasks: TaskBoardTask[],
  previous: TaskBoardTask,
  result: TaskMoveResult,
): TaskBoardTask[] {
  const task = result.kind === "failure" ? previous : result.task;
  return tasks.map((current) => current.task_id === previous.task_id ? task : current);
}
