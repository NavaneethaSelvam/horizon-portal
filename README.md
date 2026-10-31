# Horizon Portal — GrowMar Aura Workforce

A responsive workforce portal developed as part of the GrowMar Aura Workforce training project.

## Project Overview

Horizon Portal is a Next.js application designed to provide a foundation for a workforce management system, including a design system, database integration, authentication, role-based access, application navigation, and an employee directory.

## Technology Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite (local development database)
- Next.js API routes
- Lucide React
- next-themes

## Phase 1 Tasks

### Task 1 — UI Foundation and Design System
- Application foundation and responsive layout
- Centralised design tokens
- Reusable UI components
- Light and dark theme support
- Design showcase page

### Task 2 — Database and Employee API
- Prisma database integration
- Database schema and employee data
- Employee API foundation
- Seed and validation improvements

### Task 3 — Authentication and Role Login
- Login interface and authentication flow
- Role-aware access and navigation
- Session handling and authentication-related UI

### Task 4 — Application Shell and UI States
- Main portal navigation
- Sidebar and responsive layout
- Application interface and UI states
- Theme support

### Task 5 — Employee Directory
- Employee directory interface
- Employee listing and related UI
- Directory integration with the portal

Refer to the source code and screenshots for the implementation details of each task.

## Screenshots

The repository contains screenshots organised by task:

- `Task1_Screenshots/`
- `Task2_Screenshots/`
- `Task3_Screenshots/`
- `Task4_Screenshots/`
- `Task5_Screenshots/`

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Git
- Python 3 (the isolated SQLite migration/API integration tests use the standard library)
- VS Code (recommended)

### Installation

Clone the repository:

```bash
git clone https://github.com/NavaneethaSelvam/horizon-portal.git
cd horizon-portal
```

Install dependencies:

```bash
npm install
```

On Windows PowerShell, if script execution blocks npm, use:

```powershell
npm.cmd install
```

### Environment Configuration

Copy `.env.example` to `.env`. Set `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters. Never use the example value outside local development, and do not commit `.env`.

### Database Setup

The application uses the existing Prisma schema and SQLite database. The Phase 2 migrations are additive; generate the client with `npx prisma generate`. Before running `npx prisma migrate deploy`, inspect the target database's `_prisma_migrations` history and take a backup. The historical `20261020155234_map_table_names` migration drops the original PascalCase tables without copying their rows, so do not apply it to a populated Phase 1 database where it is still pending; resolve that migration history with a data-preserving plan first. `npm run seed` reloads the supplied demo datasets and clears existing seeded tables before inserting them, so use it only on a disposable development database. It is not a production migration or safe for preserving local records.

### Run the Development Server

```bash
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

Run linting:

```bash
npm.cmd run lint
```

Run unit checks:

```powershell
npm.cmd test
```

Run a production build:

```bash
npm.cmd run build
```

Run the TypeScript check:

```bash
npx.cmd tsc --noEmit
```

Run these checks and review their output before reporting results. Detailed verification is recorded in [docs/phase2-verification.md](docs/phase2-verification.md).

## Phase 2 API and routes

- `/leave` — self-service balances, requests, holidays and latest attendance summary.
- `/attendance` — role-scoped monthly attendance summaries from existing attendance records.
- `/payslips` — employee-owned payslips, itemized values and browser print/save.
- `/notifications` — private inbox, persistent read state and shared announcements.
- `/admin` — HR/Admin employee search, department filter, create/edit/deactivate and filtered CSV export.
- `/audit-history` — HR/Admin-only employee change history with field filtering and pagination.
- `/approvals` — HR/Admin queue; managers are limited to direct reports and team members represented by assigned tasks.
- `GET/POST /api/v1/leave`, `GET /api/v1/payslips`, `GET /api/v1/payslips/{run_id}`.
- `GET /api/v1/attendance`, `GET /api/v1/admin/audit-history`.
- `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`.
- `GET/POST /api/v1/admin/employees`, `PATCH /api/v1/admin/employees/{id}`, `GET/POST /api/v1/approvals`.

Leave requests reserve their category's available balance while pending; approval moves the reserved days to used, and rejection releases the reservation. The supplied balance data only has CL, SL and EL columns; other paid leave categories are blocked until the source balance model provides their entitlement. LOP does not consume a paid leave balance. HR/Admin can review the organization-wide approval queue under their role permissions, while Managers are limited to assigned employees. No automatic manager-absence fallback or reassignment policy is implemented; confirm the approval escalation policy with the organization before production use.

The demo users and workforce datasets are provided for development. Configure demo accounts through the supplied data pack and seed process; passwords are hashed before storage. Do not use demo credentials or seeded employee/salary data in production.

Docker builds the existing application with `docker build -t horizon-portal .` and runs it with `docker run --env-file .env -p 3000:3000 horizon-portal`. Apply database migrations against the configured database before starting the container.

## Verification status

Phase 1 Tasks 1–5 and Phase 2 Tasks 6–10 are assessed requirement by requirement in [docs/phase2-verification.md](docs/phase2-verification.md), including test commands, data blockers and remaining browser checks. Phase 2 is not fully accepted: authoritative ML/BL balances, browser-level verification and organizational approval escalation policy remain outstanding; no manager-absence fallback is implemented.

## Repository

GitHub: https://github.com/NavaneethaSelvam/horizon-portal

Default branch: `main`

Repository visibility: Public

## Security Notes

- Never commit passwords, access tokens, API keys, or production credentials.
- Keep local `.env` files out of version control.
- Use mock or appropriately sanitised data for demonstrations.
- Review authentication and authorisation before using the application with real employee information.

## Project Status

Phase 1 implementation work and task screenshots are maintained in this repository. Refer to the source code, commits, and task screenshots for implementation evidence.

**Note:** Features and verification status should be confirmed against the current source code and local test results before production use.
