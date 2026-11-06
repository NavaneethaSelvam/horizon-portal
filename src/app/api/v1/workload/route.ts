import { NextRequest, NextResponse } from "next/server";
import {
  forbidden,
  getUser,
  prisma,
  taskBoardAccess,
  unauthorized,
} from "@/lib/server";
import { calculateWorkload, type WorkloadSprint, type WorkloadTask } from "@/lib/workload-rules";

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: NextRequest) {
  const actor = await getUser(request);
  if (!actor) return unauthorized();
  const access = await taskBoardAccess(actor.employeeId, actor.role);
  if (!access) return forbidden();

  const params = new URL(request.url).searchParams;
  const requestedSprintId = params.get("sprintId")?.trim() || null;
  const requestedTeamId = params.get("teamId")?.trim() || null;

  try {
    const teams = await prisma.team.findMany({
      where: access.teamWhere,
      orderBy: { team_name: "asc" },
      select: { team_id: true, team_name: true },
    });
    if (requestedTeamId && !teams.some((team) => team.team_id === requestedTeamId)) {
      return failure("Team not found in your permitted task scope.", 404);
    }

    const teamConstraint = requestedTeamId ? [{ team_id: requestedTeamId }] : [];
    const visibleTasksWhere = { AND: [access.taskWhere, ...teamConstraint] };
    const sprints = await prisma.sprint.findMany({
      where: { tasks: { some: visibleTasksWhere } },
      orderBy: [{ start_date: "desc" }, { sprint_id: "desc" }],
      select: {
        sprint_id: true,
        sprint_name: true,
        start_date: true,
        end_date: true,
        working_days: true,
      },
    });
    const selectedSprint =
      sprints.find((sprint) => sprint.sprint_id === requestedSprintId) ?? sprints[0];
    if (!selectedSprint) {
      return NextResponse.json({
        success: true,
        teams,
        sprints: [],
        selectedSprint: null,
        result: null,
      });
    }

    const currentRows = await prisma.task.findMany({
      where: { AND: [visibleTasksWhere, { sprint_id: selectedSprint.sprint_id }] },
      orderBy: [{ assignee_employee_id: "asc" }, { task_id: "asc" }],
      select: {
        task_id: true,
        sprint_id: true,
        team_id: true,
        assignee_employee_id: true,
        status: true,
        story_points: true,
        team: { select: { team_name: true } },
      },
    });
    const employeeIds = [
      ...new Set(
        currentRows
          .map((task) => task.assignee_employee_id)
          .filter((employeeId): employeeId is string => employeeId !== null),
      ),
    ];

    const historyRows =
      employeeIds.length && selectedSprint.start_date
        ? await prisma.task.findMany({
            where: {
              AND: [
                access.taskWhere,
                { assignee_employee_id: { in: employeeIds } },
                { sprint: { start_date: { lt: selectedSprint.start_date } } },
                ...teamConstraint,
              ],
            },
            orderBy: [{ sprint_id: "asc" }, { task_id: "asc" }],
            select: {
              task_id: true,
              sprint_id: true,
              team_id: true,
              assignee_employee_id: true,
              status: true,
              story_points: true,
              team: { select: { team_name: true } },
            },
          })
        : [];
    const employees =
      employeeIds.length > 0
        ? await prisma.employee.findMany({
            where: { employee_id: { in: employeeIds } },
            select: { employee_id: true, full_name: true },
          })
        : [];
    const employeeNames = new Map(
      employees.map((employee) => [employee.employee_id, employee.full_name]),
    );
    const historicalSprintIds = [...new Set(historyRows.map((task) => task.sprint_id))];
    const historicalSprints =
      historicalSprintIds.length > 0
        ? await prisma.sprint.findMany({
            where: { sprint_id: { in: historicalSprintIds } },
            select: {
              sprint_id: true,
              sprint_name: true,
              start_date: true,
              end_date: true,
              working_days: true,
            },
          })
        : [];
    const historyStarts = historicalSprints
      .map((sprint) => sprint.start_date)
      .filter((date): date is string => date !== null);
    const leaveStart = historyStarts.length
      ? historyStarts.sort((a, b) => a.localeCompare(b))[0]
      : selectedSprint.start_date;
    const leaves =
      employeeIds.length && leaveStart && selectedSprint.end_date
        ? await prisma.leaveRequest.findMany({
            where: {
              employee_id: { in: employeeIds },
              status: "Approved",
              start_date: { lte: selectedSprint.end_date },
              end_date: { gte: leaveStart },
            },
            select: {
              leave_request_id: true,
              employee_id: true,
              start_date: true,
              end_date: true,
              status: true,
              leave_type_code: true,
            },
          })
        : [];
    const holidays =
      leaveStart && selectedSprint.end_date
        ? await prisma.holiday.findMany({
            where: {
              holiday_date: {
                gte: leaveStart,
                lte: selectedSprint.end_date,
              },
            },
            select: { holiday_date: true, holiday_name: true, holiday_type: true },
          })
        : [];

    const toWorkloadTask = (
      task: (typeof currentRows)[number] | (typeof historyRows)[number],
    ): WorkloadTask => ({
      task_id: task.task_id,
      sprint_id: task.sprint_id,
      team_id: task.team_id,
      team_name: task.team.team_name,
      assignee_employee_id: task.assignee_employee_id,
      assignee_name: task.assignee_employee_id
        ? employeeNames.get(task.assignee_employee_id) ?? null
        : null,
      status: task.status,
      story_points: task.story_points,
    });
    const result = calculateWorkload(
      selectedSprint as WorkloadSprint,
      currentRows.map(toWorkloadTask),
      historyRows.map(toWorkloadTask),
      historicalSprints as WorkloadSprint[],
      leaves,
      holidays,
    );

    return NextResponse.json({
      success: true,
      teams,
      sprints,
      selectedSprint: selectedSprint.sprint_id,
      result,
    });
  } catch (error) {
    console.error("Unable to load workload capacity data.", error);
    return failure("Unable to load workload data.", 500);
  }
}
