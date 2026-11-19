import { z } from "zod";
import { NextResponse } from "next/server";

export const idSchema = z.string().trim().min(1).max(100);
export const usernameSchema = z.string().trim().min(1).max(254);

export function validationError(message = "Invalid request input.") {
  return NextResponse.json(
    { success: false, message },
    { status: 422 },
  );
}

export function parseBody<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseQuery<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(1024),
}).strict();

export const assistantSchema = z.object({
  question: z.string().trim().min(1).max(500),
}).strict();

export const leaveCreateSchema = z.object({
  leave_type_code: z.string().trim().min(1).max(50),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const approvalSchema = z.object({
  request_id: idSchema,
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1000).optional(),
}).strict();

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
}).strict();

export const pageQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().max(100000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

export const employeeCreateSchema = z.object({
  employee_id: idSchema,
  full_name: z.string().trim().min(1).max(200),
  work_email: z.string().trim().email().max(254),
  department_id: z.string().trim().max(100).nullable().optional(),
  role_id: z.string().trim().max(100).nullable().optional(),
  manager_id: z.string().trim().max(100).nullable().optional(),
  work_location: z.string().trim().max(100).nullable().optional(),
  work_mode: z.string().trim().max(100).nullable().optional(),
  employment_type: z.string().trim().max(100).nullable().optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).strict();

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
}).strict();

export const taskUpdateSchema = z.object({
  status: z.string().trim().min(1).max(50).optional(),
  priority: z.string().trim().min(1).max(50).optional(),
  assignee_employee_id: z.string().trim().max(100).nullable().optional(),
  version: z.coerce.number().int().min(0).max(1000000),
}).strict();
