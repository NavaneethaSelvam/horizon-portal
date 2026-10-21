
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      take: 25,
      orderBy: {
        employee_id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Employees API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch employees",
      },
      { status: 500 }
    );
  }
}