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

## Phase 4 — Release (deployment prepared; account setup pending)

- **Task 16:** HR assistant available throughout the signed-in portal, matching the seeded HR FAQ, using the current user's own leave and payslip records, and refusing other employees' pay questions.
- The assistant uses the seeded `hr_faq` and `chatbot_responses` datasets. Personal lookups are resolved server-side from the authenticated session; employee names or IDs supplied in chat are never used to select a record.
- Focused assistant tests cover ten FAQ questions, personal-intent routing, refusal detection and safe fallback behavior.

### Task 17 — Hosting choice and deployment setup

Pricing and limits checked on 2026-11-17 against the providers' official pages:

| Option | Free limits and sleep behavior | Database size | Approx. monthly price |
| --- | --- | --- | --- |
| **Vercel Hobby + Neon Free (selected for this training demo)** | Vercel includes 100 GB monthly data transfer and has no always-on web service to sleep. Neon Free gets 100 compute-hours and 5 GB network transfer per project; idle compute scales to zero after 5 minutes and wakes on a query. | Neon: 1 GB per project | $0 while within quotas. Vercel Hobby is intended for personal, non-commercial use. |
| Render Free web + Free Postgres | Web service: 512 MB RAM, sleeps after 15 minutes idle, and shares 750 free instance-hours per workspace/month. | 1 GB; free database expires after 30 days | $0; unsuitable for a durable demo database. |
| Render Starter web + paid Postgres | Web service stays available; smallest listed web and database instances are 512 MB and 256 MB RAM. | Storage is billed separately (currently $0.30/GB-month). | About $13/month before storage: $7 web + $6 database. |

Sources: [Vercel pricing](https://vercel.com/pricing), [Neon pricing](https://neon.com/pricing), [Render free services](https://render.com/docs/free), and [Render pricing](https://render.com/pricing).

**Decision:** use Vercel Hobby + Neon Free for the public training/demo release. They avoid Render Free's 30-day database expiry and keep the Next.js UI and API on one origin. This is not a production SLA: Neon can suspend compute after its monthly quota is exhausted, and Vercel Hobby is not for commercial workloads. Upgrade before using this for a real company service.

The production PostgreSQL schema and initial baseline migration live under `prisma/postgresql/`; the root SQLite schema/migrations remain the local development and test setup. The build generates the PostgreSQL client and runs `prisma migrate deploy` on Vercel. Seed the new hosted database exactly once with `npm run seed:production`; the seed clears/reloads data, so never rerun it on a database with records to preserve.

Before calling the deployment live:

1. Connect this GitHub repository to Vercel; its Git integration should deploy pushes to `main`.
2. Create a Neon project and configure `DATABASE_URL` (pooled connection), `DIRECT_URL` (direct connection for migrations), and a random `SESSION_SECRET` of at least 32 characters in Vercel. Use a separate Neon branch for Preview deployments. `vercel.json` skips Prisma's automatic SQLite client generation during install; the build generates the PostgreSQL client explicitly. Never commit or paste secrets into chat.
3. Confirm role permissions and same-origin HTTPS cookies on the live site. First check: (a) the secure session cookie is set and sent to the same host, (b) API calls target the deployed origin and any CORS credentials allow only the exact origin (never `*`), and (c) database URLs stay server-side, use TLS, and Preview traffic does not touch production data.
4. Sign in as Admin, HR, Manager and Employee; complete one permitted workflow as each role and confirm restricted menus/routes and clear error states.

The hosted database, GitHub-to-Vercel connection, live role smoke tests and screenshots are still pending account authorization; no live URL is claimed yet.

Tasks 18–20 will be documented as they are completed.

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

The root SQLite schema is used for local development and tests. Generate it with:

```powershell
npm.cmd run generate:local
```

`npm.cmd run dev`, `npm.cmd test` and `npm.cmd run seed` use the currently generated client; run `npm.cmd run generate:local` after a production build before returning to SQLite. Production builds generate from `prisma/postgresql/schema.prisma`; `npm.cmd run seed:production` uses that client and must only be run against the newly created hosted database. Prisma writes both generated clients to the same package location, so stop the local dev server before switching schemas on Windows.

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
