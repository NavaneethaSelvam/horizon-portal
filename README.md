# Horizon Portal — GrowMar Aura Workforce

A responsive, role-based workforce management portal developed for the GrowMar Aura Workforce Full Stack Developer training project.

**Repository:** [NavaneethaSelvam/horizon-portal](https://github.com/NavaneethaSelvam/horizon-portal)
**Default branch:** `main`
**Completed phases:** Phase 1, Phase 2 and Phase 3

## Project overview

Horizon Portal is a Next.js application for employee self-service and workforce operations. It includes a design system, authentication and role-based access, employee management, leave and attendance workflows, payslips, approvals, payroll and finance workspaces, task coordination, capacity planning and aggregate AI-assisted insights.

The application source, database schema, migrations and tests remain at the repository root in `src/`, `prisma/` and `tests/`. The `phase-1/`, `phase-2/` and `phase-3/` folders contain phase-specific design evidence, screenshots, reports and documentation; they do not contain duplicated app source.

## Technology

- Next.js 15 App Router, React 19 and TypeScript
- Tailwind CSS v4
- Prisma ORM and SQLite for local development
- Next.js API routes
- Lucide React, next-themes and dnd-kit

## Phase 1 — UI foundation and core portal (Tasks 1–5)

- **Task 1:** Responsive UI foundation, design tokens, reusable components, light/dark themes and the design showcase.
- **Task 2:** Prisma schema, employee data and employee API foundation.
- **Task 3:** Login flow, signed session handling and role-aware access.
- **Task 4:** Responsive application shell, navigation, theme support and UI states.
- **Task 5:** Employee directory, search, department filtering, pagination and employee profiles.

Evidence and task details: [phase-1/README.md](phase-1/README.md).
Application locations: `src/app/design/`, `src/app/login/`, `src/app/employees/`, `src/app/api/v1/auth/`, `src/app/api/v1/employees/`, `src/components/`, `src/lib/` and `prisma/`.

## Phase 2 — Workforce management (Tasks 6–10)

- Leave requests, balances, holidays and attendance summaries.
- Employee payslips, notifications and announcements.
- Role-scoped approvals, employee administration and audit history.
- Server-side authorization and workflow validation.

Evidence, verification notes and task details: [phase-2/README.md](phase-2/README.md).
Application locations: the shared `src/app/[section]/page.tsx` route, `src/app/api/v1/` and the `src/components/phase2/` and `src/components/admin/` workspaces. Main routes include `/leave`, `/attendance`, `/payslips`, `/notifications`, `/approvals`, `/admin` and `/audit-history`.

## Phase 3 — Advanced workforce operations (Tasks 11–15)

- **Task 11:** Payroll console for HR and Admin.
- **Task 12:** Admin finance console for invoice and expense review.
- **Task 13:** Team task board with team/sprint filters and version-aware updates.
- **Task 14:** Workload and capacity planning with leave and overload indicators.
- **Task 15:** Aggregate AI insights with privacy suppression and human-review disclosures.

Evidence, report, screenshots and task details: [phase-3/README.md](phase-3/README.md).
Application locations: `src/app/[section]/page.tsx`, `src/app/api/v1/`, `src/components/operations/` and `src/lib/`. Main routes are `/payroll`, `/finance`, `/team-board`, `/workload-capacity` and `/insights`.

## Phase 4 — Not yet released

The company has not released Phase 4 requirements or deliverables. No Phase 4 folder or implementation is included.

## Install and run

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3 for the isolated SQLite migration/API integration tests

### Install dependencies

From the repository root:

```powershell
npm.cmd install
```

### Configure the environment

Copy `.env.example` to `.env`, then set:

- `DATABASE_URL` to the intended SQLite database.
- `SESSION_SECRET` to a random secret of at least 32 characters.

Never commit `.env` or production credentials.

### Prepare the Prisma client and database

Generate the client:

```powershell
npx.cmd prisma generate
```

Before applying migrations to any existing database, inspect its `_prisma_migrations` history and make a backup. The historical `20261020155234_map_table_names` migration drops original PascalCase tables without copying their rows. Do not apply it to a populated Phase 1 database while it is still pending without first preparing a data-preserving migration plan.

The seed process clears and reloads seeded tables. Do not run it against a database whose records must be preserved. This project setup does not require reseeding to start the application.

### Start the development server

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). To use port 3002:

```powershell
npm.cmd run dev -- --port 3002
```

### Useful checks

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run build
```

### Docker

```powershell
docker build -t horizon-portal .
docker run --env-file .env -p 3000:3000 horizon-portal
```

Apply only the migrations appropriate for the configured database before using the container; follow the database safety notes above.

## Repository structure

```text
horizon-portal/
├── phase-1/                 # Design evidence, screenshots and phase README
├── phase-2/                 # Verification documentation and phase README
├── phase-3/                 # Report, screenshots, privacy notes and phase README
├── prisma/                  # Schema, migrations, data and seed scripts
├── public/
├── src/                     # Shared Next.js application source
├── tests/
├── package.json
├── package-lock.json
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

## Data and responsible use

Supplied workforce datasets and demo credentials are for development and demonstration, not production. Review authentication, authorization, entitlement data, approval policies and database migration history before using real employee information. AI outputs are estimates for human review, are not confirmed findings and must not be the sole basis for employment decisions. See [phase-3/docs/ai-insights-privacy.md](phase-3/docs/ai-insights-privacy.md).
