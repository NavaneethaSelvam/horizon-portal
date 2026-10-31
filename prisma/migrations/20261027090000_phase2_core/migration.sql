ALTER TABLE "employees" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_requests" ADD COLUMN "rejection_reason" TEXT;
CREATE TABLE "notifications" (
  "notification_id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TEXT NOT NULL,
  "idempotency_key" TEXT,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "employees" ("employee_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");
CREATE TABLE "audit_log" (
  "audit_id" TEXT NOT NULL PRIMARY KEY,
  "actor_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "changed_field" TEXT,
  "old_value" TEXT,
  "new_value" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "employees" ("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "audit_log_employee_id_created_at_idx" ON "audit_log"("employee_id", "created_at");
