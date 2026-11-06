import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getUser,
  prisma,
  taskBoardAccess,
  unauthorized,
} from "@/lib/server";
import { TASK_BOARD_STATUSES } from "@/lib/task-board-rules";

type TaskIdContext = { params: Promise<{ task_id: string }> };

function taskResponse(task: {
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
  team: { team_name: string };
  sprint: { sprint_name: string };
}, assigneeName: string | null) {
  const { team, sprint, ...data } = task;
  return { ...data, team_name: team.team_name, sprint_name: sprint.sprint_name, assignee_name: assigneeName };
}

async function namedTask(task: Parameters<typeof taskResponse>[0]) {
  const assignee = task.assignee_employee_id
    ? await prisma.employee.findUnique({
        where: { employee_id: task.assignee_employee_id },
        select: { full_name: true },
      })
    : null;
  return taskResponse(task, assignee?.full_name ?? task.assignee_employee_id);
}

export async function PATCH(request: NextRequest, context: TaskIdContext) {
  const actor = await getUser(request);
  if (!actor) return unauthorized();
  const access = await taskBoardAccess(actor.employeeId, actor.role);
  if (!access) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("expectedVersion" in body) ||
    !("status" in body) ||
    typeof body.expectedVersion !== "number" ||
    !Number.isSafeInteger(body.expectedVersion) ||
    body.expectedVersion < 0 ||
    typeof body.status !== "string" ||
    !TASK_BOARD_STATUSES.includes(body.status as (typeof TASK_BOARD_STATUSES)[number])
  ) {
    return NextResponse.json(
      { success: false, message: "A valid status and expectedVersion are required." },
      { status: 400 },
    );
  }
  const expectedVersion = body.expectedVersion;
  const status = body.status;

  const { task_id } = await context.params;
  try {
    const current = await prisma.task.findFirst({
      where: { AND: [{ task_id }, access.taskWhere] },
      select: {
        task_id: true,
        team_id: true,
        sprint_id: true,
        assignee_employee_id: true,
        task_type: true,
        priority: true,
        story_points: true,
        due_date: true,
        status: true,
        version: true,
        team: { select: { team_name: true } },
        sprint: { select: { sprint_name: true } },
      },
    });
    if (!current) {
      return NextResponse.json(
        { success: false, message: "Task not found." },
        { status: 404 },
      );
    }
    const assignee = current.assignee_employee_id
      ? await prisma.employee.findUnique({
          where: { employee_id: current.assignee_employee_id },
          select: { full_name: true },
        })
      : null;
    const assigneeName = assignee?.full_name ?? current.assignee_employee_id;

    const changed = await prisma.task.updateMany({
      where: { AND: [{ task_id, version: expectedVersion }, access.taskWhere] },
      data: { status, version: { increment: 1 } },
    });
    if (!changed.count) {
      const current = await prisma.task.findFirst({
        where: { AND: [{ task_id }, access.taskWhere] },
        select: {
          task_id: true,
          team_id: true,
          sprint_id: true,
          assignee_employee_id: true,
          task_type: true,
          priority: true,
          story_points: true,
          due_date: true,
          status: true,
          version: true,
          team: { select: { team_name: true } },
          sprint: { select: { sprint_name: true } },
        },
      });
      if (!current) {
        return NextResponse.json(
          { success: false, message: "Task not found." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: "This task changed elsewhere. The latest task state is included.",
          latest: await namedTask(current),
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      task: taskResponse({ ...current, status, version: expectedVersion + 1 }, assigneeName),
    });
  } catch (error) {
    console.error("PATCH /api/v1/tasks/[task_id] failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save task status." },
      { status: 500 },
    );
  }
}
