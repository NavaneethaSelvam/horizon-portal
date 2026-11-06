import { NextRequest, NextResponse } from "next/server";
import { getUser, prisma, unauthorized, forbidden } from "@/lib/server";
import {
  summarizeAnomalies,
  summarizeAttrition,
  UNMAPPED_DEPARTMENT_ID,
  type AnomalyInput,
  type AttritionInput,
} from "@/lib/ai-insights-rules";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: NextRequest) {
  const actor = await getUser(request);
  if (!actor) return unauthorized();
  if (actor.role !== "ADMIN" && actor.role !== "HR") return forbidden();

  const requestedDepartmentId =
    new URL(request.url).searchParams.get("departmentId")?.trim() || null;

  try {
    const departments = await prisma.department.findMany({
      orderBy: { department_name: "asc" },
      select: { department_id: true, department_name: true },
    });
    const departmentIds = new Set(departments.map((department) => department.department_id));
    if (
      requestedDepartmentId &&
      requestedDepartmentId !== UNMAPPED_DEPARTMENT_ID &&
      !departmentIds.has(requestedDepartmentId)
    ) {
      return errorResponse("Department not found.", 404);
    }
    const selectedDepartment = requestedDepartmentId
      ? requestedDepartmentId === UNMAPPED_DEPARTMENT_ID
        ? { department_id: UNMAPPED_DEPARTMENT_ID, department_name: "Unmapped" }
        : departments.find((department) => department.department_id === requestedDepartmentId) ?? null
      : null;
    if (!selectedDepartment) {
      return NextResponse.json({
        success: true,
        departments: [
          ...departments,
          { department_id: UNMAPPED_DEPARTMENT_ID, department_name: "Unmapped" },
        ],
        selectedDepartmentId: null,
        result: null,
      });
    }

    const anomalyRows = await prisma.aiAnomalyResult.findMany({
      select: {
        employee_id: true,
        source_dataset: true,
        period: true,
        reason_code: true,
        flagged: true,
        money_at_risk: true,
      },
    });
    const employeeIds = [
      ...new Set(
        anomalyRows
          .map((row) => row.employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId)),
      ),
    ];
    const employees = employeeIds.length
      ? await prisma.employee.findMany({
          where: { employee_id: { in: employeeIds } },
          select: { employee_id: true, department_id: true },
        })
      : [];
    const employeeDepartments = new Map(
      employees.map((employee) => [
        employee.employee_id,
        employee.department_id && departmentIds.has(employee.department_id)
          ? employee.department_id
          : null,
      ]),
    );
    const unmapped = (row: (typeof anomalyRows)[number]) =>
      !row.employee_id || !employeeDepartments.get(row.employee_id);

    const attritionRows =
      selectedDepartment.department_id === UNMAPPED_DEPARTMENT_ID
        ? []
        : await prisma.aiAttritionRisk.findMany({
            where: { department_id: selectedDepartment.department_id },
            select: {
              employee_id: true,
              risk_band: true,
              top_reason_1: true,
              top_reason_2: true,
              top_reason_3: true,
            },
          });
    const attritionInput: AttritionInput[] = attritionRows.map((row) => ({
      employeeKey: row.employee_id ?? "",
      riskBand: row.risk_band,
      reasons: [row.top_reason_1, row.top_reason_2, row.top_reason_3],
    }));
    const scopedAnomalies: AnomalyInput[] = anomalyRows
      .filter((row) =>
        selectedDepartment.department_id === UNMAPPED_DEPARTMENT_ID
          ? unmapped(row)
          : row.employee_id &&
            employeeDepartments.get(row.employee_id) === selectedDepartment.department_id,
      )
      .map((row) => ({
        employeeKey: row.employee_id,
        source: row.source_dataset,
        period: row.period,
        reasonCode: row.reason_code,
        flagged: row.flagged,
        moneyAtRisk: row.money_at_risk,
      }));

    return NextResponse.json({
      success: true,
      departments: [
        ...departments,
        { department_id: UNMAPPED_DEPARTMENT_ID, department_name: "Unmapped" },
      ],
      selectedDepartmentId: selectedDepartment.department_id,
      result: {
        departmentName: selectedDepartment.department_name,
        attrition:
          selectedDepartment.department_id === UNMAPPED_DEPARTMENT_ID
            ? null
            : summarizeAttrition(attritionInput),
        anomalies: summarizeAnomalies(scopedAnomalies),
        disclosure: "AI-generated, for human review",
        humanReviewNotice:
          "AI outputs are advisory only and must not automatically determine termination, promotion, salary changes, disciplinary action, or other employment decisions.",
      },
    });
  } catch (error) {
    console.error("Unable to load aggregate AI insights.", error);
    return errorResponse("Unable to load AI insights.", 500);
  }
}
