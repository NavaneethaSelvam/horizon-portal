import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getUser,
  prisma,
  taskBoardAccess,
  unauthorized,
} from "@/lib/server";

const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const actor = await getUser(request);
  if (!actor) return unauthorized();
  const access = await taskBoardAccess(actor.employeeId, actor.role);
  if (!access) return forbidden();

  const params = new URL(request.url).searchParams;
  const page = parsePositiveInteger(params.get("page"), 1);
  const pageSize = parsePositiveInteger(params.get("pageSize"), 50);
  if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json(
      { success: false, message: "Invalid page or pageSize. Page size must be at most 100." },
      { status: 400 },
    );
  }
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    return NextResponse.json(
      { success: false, message: "Page is outside the supported range." },
      { status: 400 },
    );
  }

  const teamId = params.get("teamId")?.trim() || null;
  const sprintId = params.get("sprintId")?.trim() || null;
  const where = {
    AND: [
      access.taskWhere,
      ...(teamId ? [{ team_id: teamId }] : []),
      ...(sprintId ? [{ sprint_id: sprintId }] : []),
    ],
  };

  try {
    const [total, tasks, teams, sprints] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: [{ task_id: "asc" }],
        skip: offset,
        take: pageSize,
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
      }),
      prisma.team.findMany({
        where: access.teamWhere,
        orderBy: { team_name: "asc" },
        select: { team_id: true, team_name: true },
      }),
      prisma.sprint.findMany({
        where: { tasks: { some: access.taskWhere } },
        orderBy: { sprint_id: "asc" },
        select: { sprint_id: true, sprint_name: true },
      }),
    ]);
    const assigneeIds = [...new Set(tasks.map((task) => task.assignee_employee_id).filter((id): id is string => Boolean(id)))];
    const assignees = assigneeIds.length
      ? await prisma.employee.findMany({
          where: { employee_id: { in: assigneeIds } },
          select: { employee_id: true, full_name: true },
        })
      : [];
    const assigneeNames = new Map(assignees.map((employee) => [employee.employee_id, employee.full_name]));

    return NextResponse.json(
      {
        success: true,
        tasks: tasks.map(({ team, sprint, ...task }) => ({
          ...task,
          team_name: team.team_name,
          sprint_name: sprint.sprint_name,
          assignee_name: task.assignee_employee_id ? assigneeNames.get(task.assignee_employee_id) ?? task.assignee_employee_id : null,
        })),
        teams,
        sprints,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/v1/tasks failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load tasks." },
      { status: 500 },
    );
  }
}
