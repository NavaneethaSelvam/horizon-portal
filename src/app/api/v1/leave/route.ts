
import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  notify,
  prisma,
  unauthorized,
} from "@/lib/server";
import {
  countLeaveDays,
  hasSufficientBalance,
  isIsoDate,
} from "@/lib/phase2-rules";

const currentBalance = (
  balance: {
    cl_balance: number | null;
    sl_balance: number | null;
    el_balance: number | null;
  },
  code: string,
) => {
  switch (code) {
    case "CL":
      return balance.cl_balance;
    case "SL":
      return balance.sl_balance;
    case "EL":
      return balance.el_balance;
    default:
      return null;
  }
};

const jsonError = (
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) =>
  NextResponse.json(
    { success: false, message, ...extra },
    { status },
  );

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return unauthorized();

    const [
      requests,
      balances,
      types,
      holidays,
      attendance,
    ] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employee_id: user.employeeId },
        include: { leave_type: true },
        orderBy: { applied_on: "desc" },
      }),
      prisma.leaveBalance.findFirst({
        where: { employee_id: user.employeeId },
        orderBy: { as_of_date: "desc" },
      }),
      prisma.leaveType.findMany({
        orderBy: { leave_type_name: "asc" },
      }),
      prisma.holiday.findMany({
        orderBy: { holiday_date: "asc" },
      }),
      prisma.attendanceMonthly.findMany({
        where: { employee_id: user.employeeId },
        orderBy: { period_end_date: "desc" },
        take: 1,
      }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      balances,
      types,
      holidays,
      attendance: attendance[0] ?? null,
    });
  } catch (error) {
    console.error("GET /api/v1/leave failed:", error);
    return jsonError("Unable to load leave data.", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);

  const code =
    typeof body?.leave_type_code === "string"
      ? body.leave_type_code.trim()
      : "";

  const start =
    typeof body?.start_date === "string"
      ? body.start_date
      : "";

  const end =
    typeof body?.end_date === "string"
      ? body.end_date
      : "";

  const reason =
    typeof body?.reason === "string"
      ? body.reason.trim()
      : "";

  if (!code) {
    return jsonError("Choose a leave type.", 400);
  }

  if (!isIsoDate(start)) {
    return jsonError("Enter a valid start date.", 400);
  }

  if (!isIsoDate(end) || end < start) {
    return jsonError(
      "End date must be on or after the start date.",
      400,
    );
  }

  if (!reason || reason.length > 1000) {
    return jsonError(
      "Enter a reason of 1 to 1000 characters.",
      400,
    );
  }

  try {
    const type = await prisma.leaveType.findUnique({
      where: { leave_type_code: code },
    });

    if (!type) {
      return jsonError("Invalid leave type.", 400);
    }

    // Detect an identical pending request first.
    const exactDuplicate = await prisma.leaveRequest.findFirst({
      where: {
        employee_id: user.employeeId,
        leave_type_code: code,
        start_date: start,
        end_date: end,
        status: "Pending",
      },
      select: { leave_request_id: true },
    });

    if (exactDuplicate) {
      return jsonError(
        "This request is already pending. Check Request History; do not submit it again.",
        409,
        { request_id: exactDuplicate.leave_request_id },
      );
    }

    const unpaid =
      type.pay_type === "Unpaid" || code === "LOP";

    const holidays = unpaid
      ? []
      : await prisma.holiday.findMany({
          where: {
            holiday_date: {
              gte: start,
              lte: end,
            },
          },
          select: { holiday_date: true },
        });

    let days: number;

    try {
      days = countLeaveDays(
        start,
        end,
        unpaid,
        holidays.map((holiday) => holiday.holiday_date),
      );
    } catch {
      return jsonError("Choose a valid date range.", 400);
    }

    if (days <= 0) {
      return jsonError(
        "The selected period contains no working days.",
        400,
      );
    }

    // Validate the employee's available paid-leave balance.
    if (!unpaid) {
      const balance = await prisma.leaveBalance.findFirst({
        where: { employee_id: user.employeeId },
        orderBy: { as_of_date: "desc" },
      });

      if (
        !balance ||
        currentBalance(balance, code) === null ||
        balance.pending_days === null ||
        !Number.isFinite(balance.pending_days) ||
        balance.pending_days < 0
      ) {
        return jsonError(
          `A paid-leave balance is not configured for ${type.leave_type_name}, or its reservation cannot be tracked. Contact HR or choose a configured leave type.`,
          409,
        );
      }

      const reserved = await prisma.leaveRequest.aggregate({
        where: {
          employee_id: user.employeeId,
          leave_type_code: code,
          status: "Pending",
        },
        _sum: { days: true },
      });

      if (
        !hasSufficientBalance(
          currentBalance(balance, code) ?? Number.NaN,
          reserved._sum.days ?? 0,
          days,
        )
      ) {
        return jsonError("Insufficient leave balance.", 409);
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      // Prevent overlapping pending or approved requests.
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          employee_id: user.employeeId,
          status: { in: ["Pending", "Approved"] },
          start_date: { lte: end },
          end_date: { gte: start },
        },
      });

      if (overlap) {
        if (
          overlap.status === "Pending" &&
          overlap.leave_type_code === code &&
          overlap.start_date === start &&
          overlap.end_date === end
        ) {
          throw new Error(
            `DUPLICATE:${overlap.leave_request_id}`,
          );
        }

        throw new Error("OVERLAP");
      }

      if (!unpaid) {
        const balance = await tx.leaveBalance.findFirst({
          where: { employee_id: user.employeeId },
          orderBy: { as_of_date: "desc" },
        });

        if (
          !balance ||
          currentBalance(balance, code) === null ||
          balance.pending_days === null ||
          !Number.isFinite(balance.pending_days) ||
          balance.pending_days < 0
        ) {
          throw new Error("NO_BALANCE");
        }

        const reserved = await tx.leaveRequest.aggregate({
          where: {
            employee_id: user.employeeId,
            leave_type_code: code,
            status: "Pending",
          },
          _sum: { days: true },
        });

        if (
          !hasSufficientBalance(
            currentBalance(balance, code) ?? Number.NaN,
            reserved._sum.days ?? 0,
            days,
          )
        ) {
          throw new Error("BALANCE");
        }

        await tx.leaveBalance.update({
          where: {
            employee_id_as_of_date_financial_year: {
              employee_id: user.employeeId,
              as_of_date: balance.as_of_date,
              financial_year: balance.financial_year,
            },
          },
          data: {
            pending_days: { increment: days },
          },
        });
      }

      const leaveRequest = await tx.leaveRequest.create({
        data: {
          leave_request_id: `LR-${crypto.randomUUID()}`,
          employee_id: user.employeeId,
          leave_type_code: code,
          start_date: start,
          end_date: end,
          days,
          reason,
          status: "Pending",
          balance_reserved: !unpaid,
          applied_on: new Date().toISOString(),
        },
        include: { leave_type: true },
      });

      await notify(
        user.employeeId,
        "Leave request submitted",
        `Your ${type.leave_type_name} request for ${start} to ${end} is pending review.`,
        `leave-submitted:${leaveRequest.leave_request_id}`,
        tx,
      );

      return leaveRequest;
    });

    return NextResponse.json(
      { success: true, request: created },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message.startsWith("DUPLICATE:")) {
      return jsonError(
        "This request is already pending. Check Request History.",
        409,
        { request_id: message.slice("DUPLICATE:".length) },
      );
    }

    if (message === "OVERLAP") {
      return jsonError(
        "These dates overlap an existing pending or approved leave request.",
        409,
      );
    }

    if (message === "BALANCE") {
      return jsonError("Insufficient leave balance.", 409);
    }

    if (message === "NO_BALANCE") {
      return jsonError(
        `A paid-leave balance is not configured for this leave type.`,
        409,
      );
    }

    console.error("POST /api/v1/leave failed:", error);

    return jsonError(
      "Unable to submit leave request. Check the server logs.",
      500,
    );
  }
}
