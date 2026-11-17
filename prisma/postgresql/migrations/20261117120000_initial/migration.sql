-- CreateTable
CREATE TABLE "departments" (
    "department_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "cost_center" TEXT,
    "description" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL,
    "department_id" TEXT,
    "role_title" TEXT NOT NULL,
    "level" INTEGER,
    "grade" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "employees" (
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "work_email" TEXT NOT NULL,
    "department_id" TEXT,
    "role_id" TEXT,
    "manager_id" TEXT,
    "work_location" TEXT,
    "work_mode" TEXT,
    "employment_type" TEXT,
    "hire_date" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "run_id" TEXT NOT NULL,
    "period_start" TEXT,
    "period_end" TEXT,
    "pay_date" TEXT,
    "employees_paid" INTEGER,
    "total_gross" DOUBLE PRECISION,
    "total_net" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "payroll_item_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period_start" TEXT,
    "period_end" TEXT,
    "calendar_days" INTEGER,
    "lop_days" DOUBLE PRECISION,
    "payable_days" DOUBLE PRECISION,
    "basic" DOUBLE PRECISION,
    "hra" DOUBLE PRECISION,
    "conveyance" DOUBLE PRECISION,
    "medical" DOUBLE PRECISION,
    "special_allowance" DOUBLE PRECISION,
    "overtime_pay" DOUBLE PRECISION,
    "variable_pay" DOUBLE PRECISION,
    "gross_pay" DOUBLE PRECISION,
    "pf_employee" DOUBLE PRECISION,
    "esi_employee" DOUBLE PRECISION,
    "professional_tax" DOUBLE PRECISION,
    "tds" DOUBLE PRECISION,
    "other_deductions" DOUBLE PRECISION,
    "total_deductions" DOUBLE PRECISION,
    "net_pay" DOUBLE PRECISION,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("payroll_item_id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "leave_type_code" TEXT NOT NULL,
    "leave_type_name" TEXT NOT NULL,
    "pay_type" TEXT,
    "annual_quota_days" DOUBLE PRECISION,
    "prorated_for_joiners" BOOLEAN,
    "carry_forward_allowed" BOOLEAN,
    "max_carry_forward_days" DOUBLE PRECISION,
    "policy_note" TEXT,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("leave_type_code")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "employee_id" TEXT NOT NULL,
    "as_of_date" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "cl_entitlement" DOUBLE PRECISION,
    "cl_used" DOUBLE PRECISION,
    "cl_balance" DOUBLE PRECISION,
    "sl_entitlement" DOUBLE PRECISION,
    "sl_used" DOUBLE PRECISION,
    "sl_balance" DOUBLE PRECISION,
    "el_used_fy" DOUBLE PRECISION,
    "el_balance" DOUBLE PRECISION,
    "pending_days" DOUBLE PRECISION,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("employee_id","as_of_date","financial_year")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "leave_request_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "leave_type_code" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "days" DOUBLE PRECISION,
    "reason" TEXT,
    "status" TEXT,
    "applied_on" TEXT,
    "approver_id" TEXT,
    "decided_on" TEXT,
    "rejection_reason" TEXT,
    "balance_reserved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("leave_request_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "idempotency_key" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "audit_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "changed_field" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "holiday_date" TEXT NOT NULL,
    "holiday_name" TEXT NOT NULL,
    "holiday_type" TEXT,
    "weekday" TEXT,
    "falls_on_weekend" BOOLEAN,
    "calendar_note" TEXT,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("holiday_date")
);

-- CreateTable
CREATE TABLE "ai_anomaly_results" (
    "result_id" TEXT NOT NULL,
    "source_dataset" TEXT,
    "record_id" TEXT,
    "employee_id" TEXT,
    "period" TEXT,
    "anomaly_score" DOUBLE PRECISION,
    "flagged" BOOLEAN,
    "reason_code" TEXT,
    "reason_text" TEXT,
    "money_at_risk" DOUBLE PRECISION,
    "model_version" TEXT,
    "scored_at" TEXT,

    CONSTRAINT "ai_anomaly_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "ai_attrition_risk" (
    "prediction_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "department_id" TEXT,
    "as_of_date" TEXT,
    "risk_score_12m" DOUBLE PRECISION,
    "risk_band" TEXT,
    "top_reason_1" TEXT,
    "top_reason_2" TEXT,
    "top_reason_3" TEXT,
    "model_version" TEXT,
    "model_note" TEXT,

    CONSTRAINT "ai_attrition_risk_pkey" PRIMARY KEY ("prediction_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "announcement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "posted_on" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "attendance_monthly" (
    "employee_id" TEXT NOT NULL,
    "period_end_date" TEXT NOT NULL,
    "scheduled_days" INTEGER,
    "present_days" INTEGER,
    "wfh_days" INTEGER,
    "paid_leave_days" DOUBLE PRECISION,
    "unpaid_absence_days" DOUBLE PRECISION,
    "late_arrivals" INTEGER,
    "avg_hours_worked" DOUBLE PRECISION,
    "overtime_hours" DOUBLE PRECISION,
    "attendance_rate" DOUBLE PRECISION,

    CONSTRAINT "attendance_monthly_pkey" PRIMARY KEY ("employee_id","period_end_date")
);

-- CreateTable
CREATE TABLE "chatbot_responses" (
    "intent" TEXT NOT NULL,
    "response_template" TEXT NOT NULL,
    "requires_login" BOOLEAN,
    "allowed_roles" TEXT,
    "backend_or_service_call" TEXT,
    "on_failure" TEXT,
    "policy_note" TEXT,

    CONSTRAINT "chatbot_responses_pkey" PRIMARY KEY ("intent")
);

-- CreateTable
CREATE TABLE "clients" (
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "industry" TEXT,
    "country" TEXT,
    "payment_terms_days" INTEGER,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "demo_users" (
    "username" TEXT NOT NULL,
    "label" TEXT,
    "employee_id" TEXT,
    "full_name" TEXT,
    "role" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "demo_users_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" TEXT NOT NULL,
    "expense_date" TEXT,
    "category_account" TEXT,
    "vendor_id" TEXT,
    "bill_reference" TEXT,
    "description" TEXT,
    "department_id" TEXT,
    "amount_excl_gst" DOUBLE PRECISION,
    "gst_rate_percent" DOUBLE PRECISION,
    "gst_amount" DOUBLE PRECISION,
    "total_amount" DOUBLE PRECISION,
    "due_date" TEXT,
    "paid_date" TEXT,
    "status" TEXT,
    "payment_mode" TEXT,
    "submitted_by" TEXT,
    "approved_by" TEXT,
    "ledger_entry_id" TEXT,
    "payment_ledger_entry_id" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "hr_faq" (
    "faq_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "policy_source" TEXT,

    CONSTRAINT "hr_faq_pkey" PRIMARY KEY ("faq_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "client_id" TEXT,
    "invoice_date" TEXT,
    "due_date" TEXT,
    "service_line_account" TEXT,
    "currency" TEXT,
    "subtotal" DOUBLE PRECISION,
    "gst_rate_percent" DOUBLE PRECISION,
    "gst_amount" DOUBLE PRECISION,
    "total_amount" DOUBLE PRECISION,
    "amount_paid" DOUBLE PRECISION,
    "balance_due" DOUBLE PRECISION,
    "status" TEXT,
    "last_payment_date" TEXT,
    "po_number" TEXT,
    "carried_in_from_prior_period" BOOLEAN,
    "created_by" TEXT,
    "created_at" TEXT,
    "ledger_entry_id" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "sprint_id" TEXT NOT NULL,
    "sprint_name" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "working_days" INTEGER,
    "financial_year" TEXT,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("sprint_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "sprint_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "assignee_employee_id" TEXT,
    "task_type" TEXT,
    "priority" TEXT,
    "story_points" DOUBLE PRECISION,
    "created_date" TEXT,
    "started_date" TEXT,
    "due_date" TEXT,
    "completed_date" TEXT,
    "status" TEXT,
    "reopened_count" INTEGER,
    "cycle_time_days" DOUBLE PRECISION,
    "is_overdue_at_cutoff" BOOLEAN,
    "completed_on_time" BOOLEAN,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "department_id" TEXT,
    "team_lead_employee_id" TEXT,
    "active_members" INTEGER,
    "planning_cadence" TEXT,
    "board_tool" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "vendor_id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "primary_expense_account" TEXT,
    "payment_terms_days" INTEGER,
    "city" TEXT,
    "gst_registration" TEXT,
    "is_active" BOOLEAN,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_work_email_key" ON "employees"("work_email");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_employee_id_created_at_idx" ON "audit_log"("employee_id", "created_at");

-- CreateIndex
CREATE INDEX "tasks_team_id_sprint_id_task_id_idx" ON "tasks"("team_id", "sprint_id", "task_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_employee_id_task_id_idx" ON "tasks"("assignee_employee_id", "task_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("run_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_code_fkey" FOREIGN KEY ("leave_type_code") REFERENCES "leave_types"("leave_type_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("sprint_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("team_id") ON DELETE RESTRICT ON UPDATE CASCADE;
