# Horizon Portal — GrowMar Aura Workforce

A responsive, role-based workforce management portal developed as part of the GrowMar Aura Workforce Full Stack Developer training project.

**Project:** Aura Workforce – Horizon Portal  
**Track:** Full Stack Developer  
**Repository:** [NavaneethaSelvam/horizon-portal](https://github.com/NavaneethaSelvam/horizon-portal)  
**Branch:** `main`  
**Project Phases:** Phase 1, Phase 2, Phase 3

---

## Project Overview

Horizon Portal is a Next.js application designed to support workforce management operations through a responsive interface, reusable design system, database integration, authentication, role-based access, employee management, leave and attendance workflows, payroll, finance, task planning, workload monitoring, and AI-assisted insights.

The project was developed incrementally across three phases:

- **Phase 1 (Tasks 1–5):** UI foundation, design system, database integration, authentication, application shell, and employee directory.
- **Phase 2 (Tasks 6–10):** Workforce self-service, attendance, approvals, payslips, notifications, administration, and audit capabilities.
- **Phase 3 (Tasks 11–15):** Payroll console, finance console, team task board, workload and capacity planning, and AI insights.

---

## Technology Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma ORM
- SQLite (local development database)
- Next.js API routes
- Node.js
- Lucide React
- next-themes
- dnd-kit (drag-and-drop interactions)

---

# Phase 1 — UI Foundation and Core Portal

## Task 1 — UI Foundation and Design System

- Application foundation and responsive layout.
- Centralised design tokens.
- Reusable UI components.
- Light and dark theme support.
- Design showcase page.

## Task 2 — Database and Employee API

- Prisma database integration.
- Database schema and employee data.
- Employee API foundation.
- Seed and validation improvements.

## Task 3 — Authentication and Role Login

- Login interface and authentication flow.
- Role-aware access and navigation.
- Session handling and authentication-related UI.

## Task 4 — Application Shell and UI States

- Main portal navigation.
- Sidebar and responsive layout.
- Application interface and UI states.
- Theme support.

## Task 5 — Employee Directory

- Employee directory interface.
- Employee listing and related UI.
- Directory integration with the portal.

### Phase 1 Screenshots

The repository maintains task screenshots in the following folders:

- `Task1_Screenshots/`
- `Task2_Screenshots/`
- `Task3_Screenshots/`
- `Task4_Screenshots/`
- `Task5_Screenshots/`

Refer to the corresponding folders for visual implementation evidence.

---

# Phase 2 — Workforce Management

Phase 2 extended the existing portal with employee self-service, workforce operations, approval workflows, administration, and audit capabilities.

## Main Features

### Leave Management

- Employee leave balance overview.
- Leave application and request history.
- Leave types and holiday information.
- Pending, approved, and rejected request handling.
- Leave balance reservation and release logic.
- Pending request cancellation.

### Attendance

- Attendance workspace.
- Role-scoped monthly attendance summaries.
- Attendance information based on available source records.

### Payslips

- Employee-owned payslip access.
- Itemised payroll values.
- Browser print and save functionality.

### Notifications

- Private notification inbox.
- Persistent read state.
- Shared announcements.

### Approvals

- HR/Admin organization-wide approval visibility within permissions.
- Manager access restricted to eligible direct reports and assigned team members.
- Approval and rejection workflows.
- Rejection reason handling.
- Prevention of self-approval.

### Employee Administration

- HR/Admin employee search.
- Department filtering.
- Employee creation and editing.
- Employee deactivation.
- Filtered CSV export.

### Audit History

- HR/Admin-only employee change history.
- Field filtering and pagination.
- Audit visibility for administrative changes.

## Phase 2 Main Routes

| Route | Purpose |
|---|---|
| `/leave` | Leave balances, requests, holidays and history |
| `/attendance` | Monthly attendance summaries |
| `/payslips` | Employee payslip workspace |
| `/notifications` | Notification inbox |
| `/approvals` | Role-based approval workspace |
| `/admin` | Employee administration |
| `/audit-history` | Employee change history |

### Phase 2 API Routes

- `GET/POST /api/v1/leave`
- `GET /api/v1/payslips`
- `GET /api/v1/payslips/{run_id}`
- `GET /api/v1/attendance`
- `GET /api/v1/admin/audit-history`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/read`
- `GET/POST /api/v1/admin/employees`
- `PATCH /api/v1/admin/employees/{id}`
- `GET/POST /api/v1/approvals`

### Phase 2 Data and Implementation Notes

- Pending leave requests reserve the relevant category balance.
- Approval moves reserved days to used days.
- Rejection releases the reserved balance.
- LOP does not consume paid leave balance.
- The supplied balance dataset contains CL, SL and EL entitlement columns. Other paid leave categories require authoritative entitlement data before they can be supported.
- Demo users and workforce datasets are intended for development and demonstration, not production.

### Phase 2 Verification

Detailed implementation and verification notes are maintained in:

`docs/phase2-verification.md`

This document includes test commands, data limitations, verification notes, and outstanding considerations.

---

# Phase 3 — Advanced Workforce Operations

Phase 3 added five operational modules to extend workforce visibility, task coordination, capacity planning, and AI-assisted reporting.

## Task 11 — Payroll Console

- Developed a dedicated payroll management workspace.
- Added payroll run overview and status information.
- Restricted access to authorised HR and Admin roles.
- Kept payroll management separate from employee payslip viewing.

**Route:** `/payroll`

## Task 12 — Finance Console

- Developed a finance workspace for invoice management.
- Added invoice overview.
- Implemented invoice search and status filtering.
- Restricted finance operations to Admin users.

**Route:** `/finance`

## Task 13 — Team Task Board

- Developed a Kanban-style team task board.
- Added five task columns:
  - To Do
  - In Progress
  - Blocked
  - Done
  - Cancelled
- Implemented drag-and-drop task movement using dnd-kit.
- Added team and sprint filters.
- Implemented optimistic updates with rollback on failure.
- Added version-based conflict handling to protect concurrent updates.
- Added task API endpoints and task visibility rules.

**Main route:** `/tasks`

**API routes:**
- `GET/POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{task_id}`

## Task 14 — Workload & Capacity

- Developed a workload and capacity dashboard.
- Added team and sprint filters.
- Displayed employee workload and approved leave information.
- Added sprint workload totals and capacity estimates.
- Included overload warnings to identify workload imbalance.
- Used recent sprint velocity data where sufficient valid history was available.

**Route:** `/workload`

**API route:** `GET /api/v1/workload`

## Task 15 — AI Insights

- Developed an AI-assisted insights workspace for HR and Admin.
- Added department-level attrition-risk summaries.
- Added grouped anomaly insights.
- Included aggregate financial-risk information where available.
- Implemented small-group privacy suppression.
- Avoided exposing employee names, IDs, and individual prediction records in the default dashboard.
- Included human-review disclosures for AI-generated outputs.

**Route:** `/insights`

**API route:** `GET /api/v1/insights`

### AI Privacy and Responsible Use

- AI outputs are estimates for human review.
- Model outputs are not confirmed fraud findings or confirmed payroll errors.
- Attrition-risk estimates are not established employee outcomes.
- AI insights must not be used as the sole basis for employment decisions.
- Sensitive individual-level information is not displayed in the default insights workspace.

Additional documentation:

`docs/ai-insights-privacy.md`

---

## Phase 3 Screenshots

Phase 3 screenshots are maintained in:

`docs/phase3-screenshots/`

| Task | Screenshot |
|---|---|
| Task 11 – Payroll Console | `task11-payroll console.png` |
| Task 12 – Finance Console | `task12-finance console.png` |
| Task 13 – Team Task Board | `task13-team board.png` |
| Task 14 – Workload & Capacity | `task14-worked capacity.png` |
| Task 15 – AI Insights | `task15-ai insights.png` |

---

## Reports

The Phase 3 report is available in the repository:

[FullStack_Navaneetha_Phase3_Report.pdf](docs/phase3-report/FullStack_Navaneetha_Phase3_Report.pdf)

Previous phase reports should be linked here when their exact repository paths are confirmed.

---

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Git
- Python 3 (used by isolated SQLite migration/API integration tests)
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

On Windows PowerShell, if script execution blocks npm:

```powershell
npm.cmd install
```

### Environment Configuration

Copy `.env.example` to `.env`.

Configure:

- `DATABASE_URL`
- `SESSION_SECRET`

Use a random session secret of at least 32 characters. Never commit `.env` or production credentials.

### Database Setup

The application uses Prisma ORM and SQLite for local development.

Generate the Prisma client:

```powershell
npx.cmd prisma generate
```

Before running migrations:

1. Inspect the target database's `_prisma_migrations` history.
2. Back up the existing database.
3. Confirm that pending migrations are safe for the target data.

**Important database safety note:** The historical `20261020155234_map_table_names` migration drops original PascalCase tables without copying their rows. Do not apply it to a populated Phase 1 database where it is still pending without first preparing a data-preserving migration plan.

The seed process reloads supplied demo datasets and clears existing seeded tables before inserting them. Use it only with a disposable development database. It is not a production migration or a safe way to preserve local records.

### Run the Development Server

```powershell
npm.cmd run dev
```

Open:

`http://localhost:3000`

---

## Quality Checks

Run linting:

```powershell
npm.cmd run lint
```

Run tests:

```powershell
npm.cmd test
```

Run TypeScript validation:

```powershell
npx.cmd tsc --noEmit
```

Run a production build:

```powershell
npm.cmd run build
```

Run these checks against the current code before reporting new validation results.

### Recorded Phase 3 Validation

The last recorded Phase 3 validation included:

- Automated test suite: 60 tests passed.
- TypeScript validation passed.
- ESLint validation passed.
- Production build passed.
- Git whitespace validation passed.
- Browser verification of the new modules.
- Role-based visibility checks for AI Insights.
- Mobile responsiveness check at 360px.
- Manual drag-and-drop verification for the Team Task Board.

These are recorded implementation results and should be re-run when validating a newer revision.

---

## Docker

Build the application:

```bash
docker build -t horizon-portal .
```

Run the container:

```bash
docker run --env-file .env -p 3000:3000 horizon-portal
```

Apply the appropriate database migrations to the configured database before starting the container. Follow the database safety notes above.

---

## Security Notes

- Never commit passwords, access tokens, API keys, or production credentials.
- Keep local `.env` files out of version control.
- Use mock or appropriately sanitised data for demonstrations.
- Review authentication and authorisation before using the application with real employee information.
- Restrict access to sensitive employee, payroll, finance, and AI-related information.
- Do not treat AI-generated insights as confirmed findings.

---

## Project Structure

```text
horizon-portal/
├── docs/
│   ├── phase3-report/
│   ├── phase3-screenshots/
│   ├── ai-insights-privacy.md
│   └── phase2-verification.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   └── [section]/
│   ├── components/
│   │   ├── layout/
│   │   └── operations/
│   ├── lib/
│   └── middleware.ts
├── tests/
├── package.json
└── README.md
```

---

## Repository

**GitHub:** https://github.com/NavaneethaSelvam/horizon-portal

**Default branch:** `main`

**Repository visibility:** Public

---

## Project Status

The Horizon Portal project has been developed through three phases:

- Phase 1 — UI foundation and core portal.
- Phase 2 — Workforce management and employee operations.
- Phase 3 — Advanced workforce operations and AI-assisted insights.

Source code, task screenshots, implementation documentation, and the Phase 3 report are maintained in this repository.

For production use, verify the database migration history, entitlement data, approval escalation policies, security configuration, and browser workflows against the organisation's requirements.

**Developed as part of the GrowMar Aura Workforce Full Stack Developer training project.**