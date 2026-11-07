# Phase 2 — Workforce Management

Phase 2 extended the portal with employee self-service, workforce operations, approval workflows, administration and audit capabilities (Tasks 6–10).

## Tasks and deliverables

6. **Leave and attendance:** leave balances, requests, holidays, reservation/approval/cancellation workflows and monthly attendance summaries.
7. **Payslips:** employee-owned payslip access, itemized earnings and deductions, and browser print/save.
8. **Notifications and announcements:** private inbox with persistent read state and shared announcements.
9. **Employee administration:** HR/Admin employee search, department filters, employee creation/editing/deactivation and CSV export.
10. **Approvals and attendance oversight:** role-scoped approval decisions, rejection reasons, prevention of self-approval and audit history for employee changes.

## Evidence and verification

- [phase2-verification.md](docs/phase2-verification.md) records implementation checks, limitations and verification status.
- Phase 1 screenshots and design evidence remain under `../phase-1/`.
- Phase 2 did not have a separate screenshot set in the repository at consolidation time.

## Application locations

Application source remains at the repository root:

- Shared page routing: `src/app/[section]/page.tsx`
- API handlers: `src/app/api/v1/leave/`, `attendance/`, `payslips/`, `notifications/`, `approvals/` and `admin/`
- UI workspaces: `src/components/phase2/` and `src/components/admin/`
- Business rules and shared server helpers: `src/lib/phase2-rules.ts` and `src/lib/server.ts`
- Database schema and migrations: `prisma/`

Main application routes: `/leave`, `/attendance`, `/payslips`, `/notifications`, `/approvals`, `/admin` and `/audit-history`.

No application source is duplicated in this phase folder.
