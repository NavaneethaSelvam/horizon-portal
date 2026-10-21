/*
  Warnings:

  - You are about to drop the `AiAnomalyResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AiAttritionRisk` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Announcement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AttendanceMonthly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatbotResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DemoUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Faq` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Holiday` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveBalance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayrollRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payslip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sprint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vendor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AiAnomalyResult";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AiAttritionRisk";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Announcement";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AttendanceMonthly";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChatbotResponse";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Client";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DemoUser";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Department";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Employee";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Expense";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Faq";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Holiday";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Invoice";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LeaveBalance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LeaveRequest";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LeaveType";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PayrollRun";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Payslip";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Role";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sprint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Team";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Vendor";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "departments" (
    "department_id" TEXT NOT NULL PRIMARY KEY,
    "department_name" TEXT NOT NULL,
    "cost_center" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL PRIMARY KEY,
    "department_id" TEXT,
    "role_title" TEXT NOT NULL,
    "level" TEXT,
    "grade" TEXT,
    CONSTRAINT "roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("department_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "employee_id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "work_email" TEXT NOT NULL,
    "department_id" TEXT,
    "role_id" TEXT,
    "manager_id" TEXT,
    "work_location" TEXT,
    "work_mode" TEXT,
    "employment_type" TEXT,
    "hire_date" TEXT,
    CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("department_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employees_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("role_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees" ("employee_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "run_id" TEXT NOT NULL PRIMARY KEY,
    "period_start" TEXT,
    "period_end" TEXT,
    "pay_date" TEXT,
    "employees_paid" INTEGER,
    "total_gross" REAL,
    "total_net" REAL,
    "status" TEXT
);

-- CreateTable
CREATE TABLE "payslips" (
    "payroll_item_id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period_start" TEXT,
    "period_end" TEXT,
    "calendar_days" INTEGER,
    "lop_days" REAL,
    "payable_days" REAL,
    "basic" REAL,
    "hra" REAL,
    "conveyance" REAL,
    "medical" REAL,
    "special_allowance" REAL,
    "overtime_pay" REAL,
    "variable_pay" REAL,
    "gross_pay" REAL,
    "pf_employee" REAL,
    "esi_employee" REAL,
    "professional_tax" REAL,
    "tds" REAL,
    "other_deductions" REAL,
    "total_deductions" REAL,
    "net_pay" REAL,
    CONSTRAINT "payslips_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs" ("run_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leave_types" (
    "leave_type_code" TEXT NOT NULL PRIMARY KEY,
    "leave_type_name" TEXT NOT NULL,
    "pay_type" TEXT,
    "annual_quota_days" REAL,
    "prorated_for_joiners" BOOLEAN,
    "carry_forward_allowed" BOOLEAN,
    "max_carry_forward_days" REAL,
    "policy_note" TEXT
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "employee_id" TEXT NOT NULL,
    "as_of_date" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "cl_entitlement" REAL,
    "cl_used" REAL,
    "cl_balance" REAL,
    "sl_entitlement" REAL,
    "sl_used" REAL,
    "sl_balance" REAL,
    "el_used_fy" REAL,
    "el_balance" REAL,
    "pending_days" REAL,

    PRIMARY KEY ("employee_id", "as_of_date", "financial_year"),
    CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "leave_request_id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "leave_type_code" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "days" REAL,
    "reason" TEXT,
    "status" TEXT,
    "applied_on" TEXT,
    "approver_id" TEXT,
    "decided_on" TEXT,
    CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "leave_requests_leave_type_code_fkey" FOREIGN KEY ("leave_type_code") REFERENCES "leave_types" ("leave_type_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "holidays" (
    "holiday_date" TEXT NOT NULL PRIMARY KEY,
    "holiday_name" TEXT NOT NULL,
    "holiday_type" TEXT,
    "weekday" TEXT,
    "falls_on_weekend" BOOLEAN,
    "calendar_note" TEXT
);

-- CreateTable
CREATE TABLE "ai_anomaly_results" (
    "result_id" TEXT NOT NULL PRIMARY KEY,
    "source_dataset" TEXT,
    "record_id" TEXT,
    "employee_id" TEXT,
    "period" TEXT,
    "anomaly_score" REAL,
    "flagged" BOOLEAN,
    "reason_code" TEXT,
    "reason_text" TEXT,
    "money_at_risk" REAL,
    "model_version" TEXT,
    "scored_at" TEXT
);

-- CreateTable
CREATE TABLE "ai_attrition_risk" (
    "prediction_id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT,
    "department_id" TEXT,
    "as_of_date" TEXT,
    "risk_score_12m" REAL,
    "risk_band" TEXT,
    "top_reason_1" TEXT,
    "top_reason_2" TEXT,
    "top_reason_3" TEXT,
    "model_version" TEXT,
    "model_note" TEXT
);

-- CreateTable
CREATE TABLE "announcements" (
    "announcement_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "posted_on" TEXT
);

-- CreateTable
CREATE TABLE "attendance_monthly" (
    "employee_id" TEXT NOT NULL,
    "period_end_date" TEXT NOT NULL,
    "scheduled_days" INTEGER,
    "present_days" INTEGER,
    "wfh_days" INTEGER,
    "paid_leave_days" REAL,
    "unpaid_absence_days" REAL,
    "late_arrivals" INTEGER,
    "avg_hours_worked" REAL,
    "overtime_hours" REAL,
    "attendance_rate" REAL,

    PRIMARY KEY ("employee_id", "period_end_date")
);

-- CreateTable
CREATE TABLE "chatbot_responses" (
    "intent" TEXT NOT NULL PRIMARY KEY,
    "response_template" TEXT NOT NULL,
    "requires_login" BOOLEAN,
    "allowed_roles" TEXT,
    "backend_or_service_call" TEXT,
    "on_failure" TEXT,
    "policy_note" TEXT
);

-- CreateTable
CREATE TABLE "clients" (
    "client_id" TEXT NOT NULL PRIMARY KEY,
    "client_name" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT,
    "payment_terms_days" INTEGER
);

-- CreateTable
CREATE TABLE "demo_users" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "employee_id" TEXT,
    "full_name" TEXT,
    "role" TEXT,
    "password_hash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" TEXT NOT NULL PRIMARY KEY,
    "expense_date" TEXT,
    "category_account" TEXT,
    "vendor_id" TEXT,
    "bill_reference" TEXT,
    "description" TEXT,
    "department_id" TEXT,
    "amount_excl_gst" REAL,
    "gst_rate_percent" REAL,
    "gst_amount" REAL,
    "total_amount" REAL,
    "due_date" TEXT,
    "paid_date" TEXT,
    "status" TEXT,
    "payment_mode" TEXT,
    "submitted_by" TEXT,
    "approved_by" TEXT,
    "ledger_entry_id" TEXT,
    "payment_ledger_entry_id" TEXT
);

-- CreateTable
CREATE TABLE "hr_faq" (
    "faq_id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "policy_source" TEXT
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" TEXT NOT NULL PRIMARY KEY,
    "invoice_number" TEXT NOT NULL,
    "client_id" TEXT,
    "invoice_date" TEXT,
    "due_date" TEXT,
    "service_line_account" TEXT,
    "currency" TEXT,
    "subtotal" REAL,
    "gst_rate_percent" REAL,
    "gst_amount" REAL,
    "total_amount" REAL,
    "amount_paid" REAL,
    "balance_due" REAL,
    "status" TEXT,
    "last_payment_date" TEXT,
    "po_number" TEXT,
    "carried_in_from_prior_period" BOOLEAN,
    "created_by" TEXT,
    "created_at" TEXT,
    "ledger_entry_id" TEXT,
    CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("client_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sprints" (
    "sprint_id" TEXT NOT NULL PRIMARY KEY,
    "sprint_name" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "working_days" INTEGER,
    "financial_year" TEXT
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "team_id" TEXT NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "assignee_employee_id" TEXT,
    "task_type" TEXT,
    "priority" TEXT,
    "story_points" REAL,
    "created_date" TEXT,
    "started_date" TEXT,
    "due_date" TEXT,
    "completed_date" TEXT,
    "status" TEXT,
    "reopened_count" INTEGER,
    "cycle_time_days" REAL,
    "is_overdue_at_cutoff" BOOLEAN,
    "completed_on_time" BOOLEAN,
    CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints" ("sprint_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("team_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "team_id" TEXT NOT NULL PRIMARY KEY,
    "team_name" TEXT NOT NULL,
    "department_id" TEXT,
    "team_lead_employee_id" TEXT,
    "active_members" INTEGER,
    "planning_cadence" TEXT,
    "board_tool" TEXT
);

-- CreateTable
CREATE TABLE "vendors" (
    "vendor_id" TEXT NOT NULL PRIMARY KEY,
    "vendor_name" TEXT NOT NULL,
    "primary_expense_account" TEXT,
    "payment_terms_days" INTEGER,
    "city" TEXT,
    "gst_registration" TEXT,
    "is_active" BOOLEAN
);
