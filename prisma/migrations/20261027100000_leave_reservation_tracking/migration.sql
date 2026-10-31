ALTER TABLE "leave_requests" ADD COLUMN "balance_reserved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "demo_users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
