import { NextRequest, NextResponse } from "next/server";
import { getUser, notify, prisma, unauthorized } from "@/lib/server";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.leaveRequest.findUnique({ where: { leave_request_id: id } });
      if (!item || item.employee_id !== user.employeeId) throw new Error("NOT_FOUND");
      if (item.status !== "Pending") throw new Error("NOT_PENDING");
      if (item.balance_reserved) {
        if (item.days === null || !Number.isFinite(item.days) || item.days <= 0) throw new Error("BALANCE_CONFIG");
        const balance = await tx.leaveBalance.findFirst({ where: { employee_id: item.employee_id }, orderBy: { as_of_date: "desc" } });
        if (!balance) throw new Error("BALANCE_CONFIG");
        const released = await tx.leaveBalance.updateMany({
          where: { employee_id: balance.employee_id, as_of_date: balance.as_of_date, financial_year: balance.financial_year, pending_days: { gte: item.days } },
          data: { pending_days: { decrement: item.days } },
        });
        if (!released.count) throw new Error("BALANCE_CONFIG");
      }
      const changed = await tx.leaveRequest.updateMany({ where: { leave_request_id: id, employee_id: user.employeeId, status: "Pending" }, data: { status: "Cancelled", decided_on: new Date().toISOString(), balance_reserved: false } });
      if (!changed.count) throw new Error("NOT_PENDING");
      await notify(user.employeeId, "Leave request cancelled", `Your leave request for ${item.start_date} to ${item.end_date} was cancelled.`, `leave-cancelled:${id}`, tx);
    });
    return NextResponse.json({ success: true, status: "Cancelled" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "NOT_FOUND") return NextResponse.json({ success: false, message: "Leave request not found." }, { status: 404 });
    if (reason === "NOT_PENDING") return NextResponse.json({ success: false, message: "Only pending leave requests can be cancelled." }, { status: 409 });
    if (reason === "BALANCE_CONFIG") return NextResponse.json({ success: false, message: "Unable to safely release the reserved leave balance. Contact HR." }, { status: 409 });
    return NextResponse.json({ success: false, message: "Unable to cancel leave request." }, { status: 500 });
  }
}
