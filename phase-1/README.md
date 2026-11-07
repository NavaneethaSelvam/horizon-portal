# Phase 1 — UI Foundation and Core Portal

Phase 1 delivered the core application, design system, database/employee API foundation, authentication, application shell and employee directory (Tasks 1–5).

## Tasks and deliverables

1. **UI foundation and design system:** responsive layout, central design tokens, reusable UI components, light/dark theme and design showcase.
2. **Database and employee API:** Prisma schema and initial migrations, employee data integration, seed support and employee endpoints.
3. **Authentication and role login:** login experience, signed session cookie and role-aware access.
4. **Application shell and UI states:** navigation, responsive portal layout, theme support, loading/error/empty states.
5. **Employee directory:** employee listing, search, department filtering, pagination and employee profile details.

## Evidence

- Runtime design-token source: `design/design_tokens.json` (kept in this phase folder and imported by the shared app).
- Screenshots: `screenshots/Task1_Screenshots/` through `screenshots/Task5_Screenshots/`.
- The Phase 1–2 verification log is maintained in [phase-2/docs/phase2-verification.md](../phase-2/docs/phase2-verification.md).

## Application locations

Application source remains at the repository root:

- `src/app/design/`, `src/app/login/`, `src/app/employees/`, `src/app/dashboard/`
- `src/components/ui/`, `src/components/layout/`, `src/components/employees/`
- `src/app/api/v1/auth/` and `src/app/api/v1/employees/`
- `src/middleware.ts`, `src/lib/` and `prisma/`

No application source is duplicated in this phase folder.
