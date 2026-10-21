-- CreateTable
CREATE TABLE "Department" (
    "department_id" TEXT NOT NULL PRIMARY KEY,
    "department_name" TEXT NOT NULL,
    "cost_center" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Role" (
    "role_id" TEXT NOT NULL PRIMARY KEY,
    "department_id" TEXT,
    "role_title" TEXT NOT NULL,
    "level" TEXT,
    "grade" TEXT,
    CONSTRAINT "Role_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department" ("department_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
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
    CONSTRAINT "Employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department" ("department_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role" ("role_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "Employee" ("employee_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
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
CREATE TABLE "Payslip" (
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
    CONSTRAINT "Payslip_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "PayrollRun" ("run_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payslip_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveType" (
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
CREATE TABLE "LeaveBalance" (
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
    CONSTRAINT "LeaveBalance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
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
    CONSTRAINT "LeaveRequest_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_leave_type_code_fkey" FOREIGN KEY ("leave_type_code") REFERENCES "LeaveType" ("leave_type_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holiday" (
    "holiday_date" TEXT NOT NULL PRIMARY KEY,
    "holiday_name" TEXT NOT NULL,
    "holiday_type" TEXT,
    "weekday" TEXT,
    "falls_on_weekend" BOOLEAN,
    "calendar_note" TEXT
);

-- CreateTable
CREATE TABLE "AiAnomalyResult" (
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
CREATE TABLE "AiAttritionRisk" (
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
CREATE TABLE "Announcement" (
    "announcement_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "posted_on" TEXT
);

-- CreateTable
CREATE TABLE "AttendanceMonthly" (
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
CREATE TABLE "ChatbotResponse" (
    "intent" TEXT NOT NULL PRIMARY KEY,
    "response_template" TEXT NOT NULL,
    "requires_login" BOOLEAN,
    "allowed_roles" TEXT,
    "backend_or_service_call" TEXT,
    "on_failure" TEXT,
    "policy_note" TEXT
);

-- CreateTable
CREATE TABLE "Client" (
    "client_id" TEXT NOT NULL PRIMARY KEY,
    "client_name" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT,
    "payment_terms_days" INTEGER
);

-- CreateTable
CREATE TABLE "DemoUser" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "employee_id" TEXT,
    "full_name" TEXT,
    "role" TEXT,
    "password_hash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
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
CREATE TABLE "Faq" (
    "faq_id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "policy_source" TEXT
);

-- CreateTable
CREATE TABLE "Invoice" (
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
    CONSTRAINT "Invoice_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("client_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sprint" (
    "sprint_id" TEXT NOT NULL PRIMARY KEY,
    "sprint_name" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "working_days" INTEGER,
    "financial_year" TEXT
);

-- CreateTable
CREATE TABLE "Task" (
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
    CONSTRAINT "Task_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "Sprint" ("sprint_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team" ("team_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "team_id" TEXT NOT NULL PRIMARY KEY,
    "team_name" TEXT NOT NULL,
    "department_id" TEXT,
    "team_lead_employee_id" TEXT,
    "active_members" INTEGER,
    "planning_cadence" TEXT,
    "board_tool" TEXT
);

-- CreateTable
CREATE TABLE "Vendor" (
    "vendor_id" TEXT NOT NULL PRIMARY KEY,
    "vendor_name" TEXT NOT NULL,
    "primary_expense_account" TEXT,
    "payment_terms_days" INTEGER,
    "city" TEXT,
    "gst_registration" TEXT,
    "is_active" BOOLEAN
);
