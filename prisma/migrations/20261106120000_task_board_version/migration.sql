ALTER TABLE "tasks" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "tasks_team_id_sprint_id_task_id_idx" ON "tasks"("team_id", "sprint_id", "task_id");

CREATE INDEX "tasks_assignee_employee_id_task_id_idx" ON "tasks"("assignee_employee_id", "task_id");
