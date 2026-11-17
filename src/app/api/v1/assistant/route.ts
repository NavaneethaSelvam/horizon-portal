import { NextRequest, NextResponse } from "next/server";
import {
  findBestFaq,
  getPersonalAssistantIntent,
  getStaticResponseIntent,
  isCompensationQuestion,
  isExplicitlyAboutAnotherPerson,
  isSharedEmployeeNameQuestion,
} from "@/lib/assistant-rules";
import { getUser, prisma, unauthorized } from "@/lib/server";

const fallbackAnswer =
  "I couldn't find that in the HR help topics. Please contact HR if you need more help.";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function formatDays(value: number | null | undefined) {
  return value === null || value === undefined ? "not available" : String(value);
}

function isAllowedForRole(allowedRoles: string | null, role: string) {
  return !allowedRoles || allowedRoles.split(",").map((item) => item.trim()).includes("ALL") ||
    allowedRoles.split(",").map((item) => item.trim()).includes(role);
}

async function getIntentResponse(intent: string) {
  return prisma.chatbotResponse.findUnique({ where: { intent } });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return unauthorized();

  const body: unknown = await request.json().catch(() => null);
  const question =
    typeof body === "object" && body !== null && "question" in body &&
    typeof body.question === "string"
      ? body.question.trim()
      : "";
  if (!question || question.length > 500) {
    return jsonError("Enter a question of 1 to 500 characters.", 400);
  }

  try {
    if (isSharedEmployeeNameQuestion(question)) {
      return NextResponse.json({
        success: true,
        answer: "I won't select an employee by name because names can be shared. I use only your signed-in account for personal answers; an authorized HR lookup should use the approved employee-ID workflow.",
      });
    }

    if (
      isCompensationQuestion(question) &&
      isExplicitlyAboutAnotherPerson(question)
    ) {
      const refusal = await getIntentResponse("salary_of_other");
      return NextResponse.json({
        success: true,
        answer: refusal?.response_template
          ? `${refusal.response_template} Names can be shared, so I won't look up another employee by name.`
          :
          "Sorry, I cannot share another person's pay. Names can be shared, so I won't look up another employee by name.",
      });
    }

    const personalIntent = getPersonalAssistantIntent(question);
    if (personalIntent) {
      const intent = await getIntentResponse(personalIntent);
      if (intent?.requires_login === false) {
        return NextResponse.json({ success: true, answer: intent.response_template });
      }
      if (intent && !isAllowedForRole(intent.allowed_roles, user.role)) {
        return NextResponse.json({
          success: true,
          answer: intent.on_failure ?? fallbackAnswer,
        });
      }

      if (personalIntent === "leave_balance") {
        const balance = await prisma.leaveBalance.findFirst({
          where: { employee_id: user.employeeId },
          orderBy: { as_of_date: "desc" },
          select: { cl_balance: true, sl_balance: true, el_balance: true },
        });
        if (!balance) {
          return NextResponse.json({
            success: true,
            answer: intent?.on_failure ?? "Your leave balance is not available right now. Please contact HR.",
          });
        }
        const answer = intent?.response_template
          .replace("{cl}", formatDays(balance.cl_balance))
          .replace("{sl}", formatDays(balance.sl_balance))
          .replace("{el}", formatDays(balance.el_balance)) ??
          `Your current leave balances are ${formatDays(balance.cl_balance)} CL, ${formatDays(balance.sl_balance)} SL and ${formatDays(balance.el_balance)} EL days.`;
        return NextResponse.json({ success: true, answer });
      }

      const payslip = await prisma.payslip.findFirst({
        where: { employee_id: user.employeeId },
        orderBy: [{ period_end: "desc" }, { payroll_item_id: "desc" }],
        select: {
          period_start: true,
          period_end: true,
          net_pay: true,
          payroll_run: { select: { status: true } },
        },
      });
      if (!payslip) {
        return NextResponse.json({
          success: true,
          answer: intent?.on_failure ?? "Your latest payslip is not available right now. Please contact HR.",
        });
      }
      const month = payslip.period_end ?? payslip.period_start ?? "the latest period";
      const answer = intent?.response_template
        .replace("{month}", month)
        .replace("{status}", payslip.payroll_run.status ?? "available") ??
        `Your latest payslip is for ${month}.`;
      const payDetails = payslip.net_pay === null
        ? ""
        : ` Your net pay was ${payslip.net_pay.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        })}.`;
      return NextResponse.json({ success: true, answer: `${answer}${payDetails}` });
    }

    const staticIntentName = getStaticResponseIntent(question);
    if (staticIntentName) {
      const intent = await getIntentResponse(staticIntentName);
      if (intent && isAllowedForRole(intent.allowed_roles, user.role)) {
        return NextResponse.json({
          success: true,
          answer: intent.response_template,
        });
      }
    }

    if (/^(hi|hello|hey|good morning|good afternoon)\b/i.test(question)) {
      const greeting = await getIntentResponse("greet");
      if (greeting) {
        return NextResponse.json({ success: true, answer: greeting.response_template });
      }
    }

    const faqs = await prisma.faq.findMany({
      select: { question: true, answer: true, category: true },
      orderBy: { faq_id: "asc" },
    });
    const match = findBestFaq(question, faqs);
    if (!match && isCompensationQuestion(question)) {
      const refusal = await getIntentResponse("salary_of_other");
      return NextResponse.json({
        success: true,
        answer: refusal?.response_template ??
          "Sorry, I can only help with your own pay information. Names can be shared, and I won't look up another employee by name.",
      });
    }
    return NextResponse.json({
      success: true,
      answer: match?.answer ?? fallbackAnswer,
    });
  } catch (error) {
    console.error("POST /api/v1/assistant failed:", error);
    return jsonError("Unable to answer right now. Please try again or contact HR.", 500);
  }
}
