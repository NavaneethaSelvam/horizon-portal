
import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  managerAssignedEmployeeIds,
  notify,
  prisma,
  unauthorized,
  forbidden,
} from "@/lib/server";

export async function GET(request: NextRequest) {
  const actor = await getUser(request);

  if (!actor) return unauthorized();

  if (!["ADMIN", "HR", "MANAGER"].includes(actor.role)) {
    return forbidden();
  }

  const month = new URL(request.url).searchParams.get("month");

  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json(
      {
        success: false,
        message: "Month must use YYYY-MM format.",
      },
      { status: 400 }
    );
  }

  // Managers can review only requests from their assigned employees.
  // Admin and HR retain their authorized broader access.
  const employeeIds =
    actor.role === "MANAGER"
      ? await managerAssignedEmployeeIds(actor.employeeId)
      : undefined;

  const employeeFilter =
    employeeIds !== undefined
      ? { employee_id: { in: employeeIds } }
      : {};

  const attendanceWhere = {
    ...employeeFilter,
    ...(month
      ? { period_end_date: { startsWith: month } }
      : {}),
  };

  const decisionWhere = {
    status: { in: ["Approved", "Rejected", "Cancelled"] },
    ...employeeFilter,
  };

  const [requests, recentDecisions, attendance] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: "Pending",
        ...employeeFilter,
      },
      include: {
        employee: {
          select: {
            employee_id: true,
            full_name: true,
            manager_id: true,
            department: true,
          },
        },
        leave_type: true,
      },
      orderBy: { applied_on: "asc" },
    }),

    prisma.leaveRequest.findMany({
      where: decisionWhere,
      include: {
        employee: {
          select: {
            employee_id: true,
            full_name: true,
            manager_id: true,
            department: true,
          },
        },
        leave_type: true,
      },
      orderBy: { decided_on: "desc" },
      take: 50,
    }),

    prisma.attendanceMonthly.findMany({
      where: attendanceWhere,
      orderBy: { period_end_date: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    success: true,
    actor_employee_id: actor.employeeId,
    requests,
    recent_decisions: recentDecisions,
    attendance,
  });
}

export async function POST(request: NextRequest) {
  const actor = await getUser(request);

  if (!actor) return unauthorized();

  if (!["ADMIN", "HR", "MANAGER"].includes(actor.role)) {
    return forbidden();
  }

  const body = await request.json().catch(() => null);

  if (
    typeof body?.request_id !== "string" ||
    !["approve", "reject"].includes(body?.decision)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid decision." },
      { status: 400 }
    );
  }

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim().slice(0, 1000)
      : "";

  if (body.decision === "reject" && !reason) {
    return NextResponse.json(
      {
        success: false,
        message: "A rejection reason is required.",
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.leaveRequest.findUnique({
        where: { leave_request_id: body.request_id },
        include: { employee: true },
      });

      if (!item) throw new Error("NOT_FOUND");

      // Prevent self-approval.
      if (item.employee_id === actor.employeeId) {
        throw new Error("SELF");
      }

      if (item.status !== "Pending") {
        throw new Error("DECIDED");
      }

      // Recheck Manager access at decision time.
      if (actor.role === "MANAGER") {
        const assignedIds = await managerAssignedEmployeeIds(
          actor.employeeId,
          tx
        );

        if (!assignedIds.includes(item.employee_id)) {
          throw new Error("SCOPE");
        }
      }

      const approving = body.decision === "approve";
      const amount = item.days ?? 0;
      const code = item.leave_type_code;

      const balanceField =
        code === "CL"
          ? "cl_balance"
          : code === "SL"
            ? "sl_balance"
            : code === "EL"
              ? "el_balance"
              : null;

      const usedField =
        code === "CL"
          ? "cl_used"
          : code === "SL"
            ? "sl_used"
            : code === "EL"
              ? "el_used_fy"
              : null;

      if (approving && code !== "LOP" && !balanceField) {
        throw new Error("BALANCE_CONFIG");
      }

      if (
        (item.balance_reserved || (approving && code !== "LOP")) &&
        (!Number.isFinite(amount) || amount <= 0)
      ) {
        throw new Error("BALANCE_CONFIG");
      }

      if (item.balance_reserved || (approving && balanceField && usedField)) {
        const balance = await tx.leaveBalance.findFirst({
          where: { employee_id: item.employee_id },
          orderBy: { as_of_date: "desc" },
        });

        if (!balance) throw new Error("BALANCE_CONFIG");
        if (
          item.balance_reserved &&
          (balance.pending_days === null ||
            !Number.isFinite(balance.pending_days) ||
          balance.pending_days < amount)
        ) {
          throw new Error("BALANCE_CONFIG");
        }

        const where = {
          employee_id: balance.employee_id,
          as_of_date: balance.as_of_date,
          financial_year: balance.financial_year,
          ...(item.balance_reserved
            ? { pending_days: { gte: amount } }
            : {}),
          ...(approving && balanceField
            ? { [balanceField]: { gte: amount } }
            : {}),
        };

        const data: Record<string, unknown> = {
          ...(item.balance_reserved
            ? { pending_days: { decrement: amount } }
            : {}),
          ...(approving && balanceField && usedField
            ? {
                [balanceField]: { decrement: amount },
                [usedField]: { increment: amount },
              }
            : {}),
        };

        const result = await tx.leaveBalance.updateMany({
          where,
          data,
        });

        if (!result.count) {
          throw new Error(approving ? "BALANCE" : "BALANCE_CONFIG");
        }
      }

      const changed = await tx.leaveRequest.updateMany({
        where: {
          leave_request_id: item.leave_request_id,
          status: "Pending",
        },
        data: {
          status: approving ? "Approved" : "Rejected",
          approver_id: actor.employeeId,
          decided_on: new Date().toISOString(),
          rejection_reason: approving ? null : reason,
          balance_reserved: false,
        },
      });

      if (!changed.count) throw new Error("DECIDED");

      await notify(
        item.employee_id,
        `Leave request ${body.decision}d`,
        approving
          ? "Your leave request was approved."
          : `Your leave request was rejected: ${reason}`,
        `leave-decision:${item.leave_request_id}`,
        tx
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Leave request not found." },
        { status: 404 }
      );
    }

    if (message === "SELF" || message === "SCOPE") {
      return forbidden();
    }

    if (message === "DECIDED") {
      return NextResponse.json(
        {
          success: false,
          message: "This request has already been decided.",
        },
        { status: 409 }
      );
    }

    if (message === "BALANCE") {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient leave balance.",
        },
        { status: 409 }
      );
    }

    if (message === "BALANCE_CONFIG") {
      return NextResponse.json(
        {
          success: false,
          message:
            "A balance is not configured for this leave type; HR must resolve the source balance first.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process decision.",
      },
      { status: 500 }
    );
  }
}
