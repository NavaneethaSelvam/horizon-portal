"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import {
  settleTaskMove,
  TASK_BOARD_STATUSES,
  type TaskFeedbackToast,
  type TaskToastKind,
  type TaskBoardStatus,
  type TaskBoardTask,
} from "@/lib/task-board-rules";

const TASK_STATUSES = TASK_BOARD_STATUSES;
type TaskStatus = TaskBoardStatus;
type BoardTask = TaskBoardTask;

type Pagination = { page: number; pageSize: number; total: number; pageCount: number };
type BoardResponse = {
  success: boolean;
  message?: string;
  tasks?: BoardTask[];
  teams?: { team_id: string; team_name: string }[];
  sprints?: { sprint_id: string; sprint_name: string }[];
  pagination?: Pagination;
};

function isTaskStatus(status: string | null): status is TaskStatus {
  return status !== null && TASK_STATUSES.some((value) => value === status);
}

function statusColumnId(status: TaskStatus) {
  return `column:${status}`;
}

function TaskCardContent({
  task,
  dragProps,
}: {
  task: BoardTask;
  dragProps?: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  };
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-semibold">{task.task_type || "Task"}</p>
            <p className="mt-1 break-all text-xs text-muted">{task.task_id}</p>
          </div>
          {dragProps && (
            <button
              type="button"
              className="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              aria-label={`Drag task ${task.task_id}`}
              {...dragProps.attributes}
              {...dragProps.listeners}
            >
              Move
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={task.priority === "P1" ? "danger" : task.priority === "P2" ? "warning" : "default"}>
            {task.priority ?? "Priority not set"}
          </Badge>
          <Badge variant="info">{task.story_points ?? "?"} points</Badge>
        </div>
        <p className="break-words text-xs text-muted">{task.team_name} · {task.sprint_name}</p>
        <p className="break-words text-xs text-muted">Assignee: {task.assignee_name ?? "Unassigned"}</p>
        {task.due_date && <p className="text-xs text-muted">Due {task.due_date}</p>}
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: BoardTask }) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.task_id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <TaskCardContent task={task} dragProps={{ attributes, listeners }} />
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  pendingIds,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  pendingIds: Set<string>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: statusColumnId(status) });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${status} tasks`}
      className={`w-[280px] shrink-0 rounded-xl border p-3 sm:w-[300px] ${isOver ? "border-primary bg-primary/5" : "border-border bg-surface-subtle"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{status}</h2>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((task) => task.task_id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-28 space-y-3">
          {tasks.map((task) => (
            <div key={task.task_id} className={pendingIds.has(task.task_id) ? "pointer-events-none" : ""}>
              <TaskCard task={task} />
            </div>
          ))}
          {!tasks.length && <p className="py-6 text-center text-sm text-muted">Drop tasks here</p>}
        </div>
      </SortableContext>
    </section>
  );
}

export function TeamTaskBoard() {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [teams, setTeams] = useState<BoardResponse["teams"]>([]);
  const [sprints, setSprints] = useState<BoardResponse["sprints"]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, total: 0, pageCount: 0 });
  const [teamId, setTeamId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [toasts, setToasts] = useState<TaskFeedbackToast[]>([]);
  const requestId = useRef(0);
  const nextToastId = useRef(0);
  const activeToastKey = useRef<string | null>(null);
  const activeToastId = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const showToast = useCallback((kind: TaskToastKind, toastMessage: string) => {
    const key = `${kind}:${toastMessage}`;
    if (activeToastKey.current === key) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = ++nextToastId.current;
    activeToastKey.current = key;
    activeToastId.current = id;
    setToasts([{ id, kind, message: toastMessage }]);
    const timeout = setTimeout(() => {
      if (activeToastId.current !== id) return;
      activeToastKey.current = null;
      activeToastId.current = null;
      toastTimer.current = null;
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, kind === "success" ? 4500 : 7000);
    toastTimer.current = timeout;
  }, []);

  const dismissToast = useCallback((id: number) => {
    if (activeToastId.current !== id) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    activeToastKey.current = null;
    activeToastId.current = null;
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const loadTasks = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
    });
    if (teamId) params.set("teamId", teamId);
    if (sprintId) params.set("sprintId", sprintId);

    try {
      const response = await fetch(`/api/v1/tasks?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as BoardResponse;
      if (!response.ok || !payload.success || !payload.pagination) {
        throw new Error(payload.message ?? "Unable to load tasks.");
      }
      if (requestId.current !== currentRequest) return;
      setTasks(payload.tasks ?? []);
      setTeams(payload.teams ?? []);
      setSprints(payload.sprints ?? []);
      setPagination(payload.pagination);
    } catch (error) {
      if (requestId.current === currentRequest) {
        setMessage(error instanceof Error ? error.message : "Unable to load tasks.");
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sprintId, teamId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const tasksByStatus = useMemo(() => {
    const grouped = new Map<TaskStatus, BoardTask[]>(TASK_STATUSES.map((status) => [status, []]));
    for (const task of tasks) {
      if (isTaskStatus(task.status)) grouped.get(task.status)?.push(task);
    }
    return grouped;
  }, [tasks]);

  function resolveTargetStatus(over: DragEndEvent["over"]): TaskStatus | null {
    if (!over) return null;
    if (over.id.toString().startsWith("column:")) {
      const candidate = over.id.toString().slice("column:".length);
      return isTaskStatus(candidate) ? candidate : null;
    }
    const target = tasks.find((task) => task.task_id === over.id);
    return target && isTaskStatus(target.status) ? target.status : null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!event.over) return;
    const task = tasks.find((item) => item.task_id === event.active.id);
    const targetStatus = resolveTargetStatus(event.over);
    if (!task || !targetStatus || task.status === targetStatus || pendingIds.has(task.task_id)) return;

    const previous = task;
    setPendingIds((current) => new Set(current).add(task.task_id));
    setTasks((current) => current.map((item) => item.task_id === task.task_id ? { ...item, status: targetStatus } : item));

    try {
      const response = await fetch(`/api/v1/tasks/${encodeURIComponent(task.task_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, expectedVersion: task.version }),
      });
      const payload = await response.json() as { success: boolean; message?: string; task?: BoardTask; latest?: BoardTask };
      if (response.status === 409 && payload.latest) {
        setTasks((current) => settleTaskMove(current, previous, { kind: "conflict", task: payload.latest! }));
        showToast(
          "error",
          `Task ${task.task_id} was updated elsewhere. Its latest status (${payload.latest.status ?? "unknown"}) has been restored.`,
        );
        return;
      }
      if (!response.ok || !payload.success || !payload.task) {
        throw new Error(payload.message ?? "Unable to save task status.");
      }
      setTasks((current) => settleTaskMove(current, previous, { kind: "success", task: payload.task! }));
      showToast("success", `Task ${task.task_id} moved to ${targetStatus} successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save task status.";
      setTasks((current) => settleTaskMove(current, previous, { kind: "failure" }));
      showToast("error", message);
      return;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(task.task_id);
        return next;
      });
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-muted">Drag a task to change its status. Changes are saved immediately.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Team
          <select
            value={teamId}
            onChange={(event) => {
              setTeamId(event.currentTarget.value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            className="h-11 min-w-0 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="">All permitted teams</option>
            {teams?.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Sprint
          <select
            value={sprintId}
            onChange={(event) => {
              setSprintId(event.currentTarget.value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            className="h-11 min-w-0 rounded-md border border-border bg-surface px-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="">All permitted sprints</option>
            {sprints?.map((sprint) => <option key={sprint.sprint_id} value={sprint.sprint_id}>{sprint.sprint_name}</option>)}
          </select>
        </label>
      </div>

      {message && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          <span>{message}</span>
          <button type="button" className="font-semibold underline" onClick={() => void loadTasks()}>Reload tasks</button>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-lg flex-col gap-2 sm:bottom-6">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              aria-live={toast.kind === "error" ? "assertive" : "polite"}
              className={`flex items-start gap-3 rounded-lg border p-4 text-sm shadow-lg ${
                toast.kind === "success"
                  ? "border-success/40 bg-surface text-success"
                  : "border-danger/40 bg-surface text-danger"
              }`}
            >
              {toast.kind === "success" ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              ) : (
                <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              )}
              <p className="min-w-0 flex-1 break-words">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded p-1 hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading && <p role="status" className="text-sm text-muted">Loading tasks…</p>}
      {!loading && !tasks.length && !message && (
        <EmptyState title="No tasks found" description="No tasks match the selected team and sprint filters." />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveTask(tasks.find((task) => task.task_id === active.id) ?? null)}
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="flex w-max items-start gap-3">
            {TASK_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={tasksByStatus.get(status) ?? []}
                pendingIds={pendingIds}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{activeTask ? <div className="w-[280px] opacity-90"><TaskCardContent task={activeTask} /></div> : null}</DragOverlay>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Showing {tasks.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} tasks
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
            className="rounded-md border border-border px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="self-center text-muted">Page {pagination.page} of {Math.max(pagination.pageCount, 1)}</span>
          <button
            type="button"
            disabled={pagination.page >= pagination.pageCount || loading}
            onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
            className="rounded-md border border-border px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
