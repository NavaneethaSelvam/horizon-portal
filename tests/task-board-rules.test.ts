import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasActiveTaskToast,
  settleTaskMove,
  TASK_BOARD_STATUSES,
  type TaskBoardTask,
} from "../src/lib/task-board-rules";

const task: TaskBoardTask = {
  task_id: "TASK-1",
  team_id: "T-1",
  sprint_id: "SP-1",
  assignee_employee_id: null,
  task_type: "Feature",
  priority: "P1",
  story_points: 3,
  due_date: null,
  status: "To Do",
  version: 0,
  team_name: "Platform",
  sprint_name: "Sprint 1",
  assignee_name: null,
};

test("board statuses cover all five source task columns", () => {
  assert.deepEqual(TASK_BOARD_STATUSES, ["To Do", "In Progress", "Blocked", "Done", "Cancelled"]);
});

test("failed optimistic task moves roll back to the previous task state", () => {
  const optimistic = { ...task, status: "Done" };
  const settled = settleTaskMove([optimistic], task, { kind: "failure" });
  assert.deepEqual(settled, [task]);
});

test("successful optimistic task moves accept persisted server state", () => {
  const persisted = { ...task, status: "Done", version: 1 };
  assert.deepEqual(settleTaskMove([{ ...task, status: "Done" }], task, { kind: "success", task: persisted }), [persisted]);
});

test("version conflicts reconcile to the latest server state", () => {
  const latest = { ...task, status: "Blocked", version: 2 };
  assert.deepEqual(settleTaskMove([{ ...task, status: "Done" }], task, { kind: "conflict", task: latest }), [latest]);
});

test("active task notifications suppress duplicate messages without conflating kinds", () => {
  const active = [{ id: 1, kind: "success" as const, message: "Task TASK-1 moved to Done successfully." }];
  assert.equal(hasActiveTaskToast(active, "success", active[0].message), true);
  assert.equal(hasActiveTaskToast(active, "error", active[0].message), false);
  assert.equal(hasActiveTaskToast(active, "success", "Task TASK-2 moved to Done successfully."), false);
});
