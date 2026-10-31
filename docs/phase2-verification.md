# Horizon Portal Phase 1/2 Verification Report

Updated: 31 October 2026. This report is a chronological evidence log: dated sections record checks made at those times, and older command counts are historical rather than current results. The latest validation results are recorded in the final section. It does not represent production acceptance or a full browser end-to-end run.

Status meanings: **PASS** means code and the stated check support the requirement; **PARTIAL** means some requested behavior or verification is still missing; **BLOCKED** means authoritative input or policy is missing; **FAIL** means a reproduced defect remains. No unchecked behavior is labeled PASS.

## Phase 1 tasks

| Task | Requirement | Status | Evidence and remaining work |
|---|---|---|---|
| 1 | App starts and builds | PASS | `npm.cmd run build` passes. |
| 1 | Button, Input, Card and Badge; light/dark design showcase | PASS | Components and `/design` exist; screenshots are in `Task1_Screenshots/`. |
| 1 | Colors come from tokens; no hard-coded hex outside token source | PASS | Runtime CSS variables are generated from `design/design_tokens.json`; `rg -n --glob '!design_tokens.json' '#[0-9A-Fa-f]{3,8}\\b' src` returned no matches. |
| 1 | README setup instructions | PASS | README includes environment, migrations, test, lint, type check and run instructions. |
| 1 | Contrast review and browser visual sweep | PARTIAL | Existing light/dark screenshots are present, but no current contrast measurement or responsive browser sweep was completed. |
| 2 | Prisma schema covers source entities and relationships | PASS | Schema and migration history validate; source data counts are 441 employees, 2,469 payslips and 2,183 leave requests. |
| 2 | Seed loads source data and hashes demo passwords | PASS | Seed validates all files first and hashes `demo_password` before persistence. It clears/reloads records by design. |
| 2 | Seed runs twice safely and resulting DB counts verified | PARTIAL | Seed was not executed because it deletes/reloads database tables; source JSON counts were inspected only. |
| 2 | Employee API returns paginated data without private salary fields | PASS | API test verifies authenticated listing, expected employee data and no salary/pay fields; employee detail API also has 401/404 checks. |
| 3 | Four roles, signed HTTP-only cookie, login/logout/me | PASS | New integration test exercises Employee/Manager/HR/Admin synthetic accounts, the HTTP-only cookie, `/me`, and logout cookie clearing. |
| 3 | Wrong password and missing fields handled | PASS | Integration test verifies 401 and 400 responses. |
| 3 | Real demo credential flow and browser login | PARTIAL | Tests use synthetic hashed credentials; demo seed data contains training-only `demo_password` inputs that the seed hashes. No browser login was performed. |
| 4 | Role-aware shell and private page protection | PASS | Role-aware menu code exists; middleware tests cover private routes and Admin/HR restrictions. |
| 4 | Loading, empty, error and not-found states | PASS | Added reusable `Skeleton`, `EmptyState`, `ErrorState`, root loading UI and retained custom error/404 screens. |
| 4 | Phone layout and keyboard/focus behavior | PARTIAL | Responsive styles and a Task 4 dashboard screenshot plus Task 5 mobile screenshot exist; current keyboard/focus browser sweep is unverified. |
| 5 | Employee profile, manager and direct-report information | PASS | Profile now loads the signed-in employee's database fields. Detail API test checks manager and second-level reporting chain. |
| 5 | Search, department filter, pagination, phone layout | PASS | Directory UI and paginated API are implemented; existing screenshots are in `Task5_Screenshots/`. Search latency under one second remains unmeasured. |
| 5 | Directory/profile API do not expose salary | PASS | New integration test checks both responses for salary/pay/wage fields. |
| 5 | Same-name disambiguation and reporting chain verified for 3 source employees | PARTIAL | Directory shows employee IDs and work emails; synthetic test verifies a two-level chain, but no three-record source-data comparison was run. |

The Phase 1 evidence folders contain 12 images: Task 1 (2), Task 2 (1), Task 3 (4), Task 4 (1) and Task 5 (4). These are existing artifacts, not screenshots captured during this turn.

## Task 6 — Leave and attendance

| Requirement | Status | Evidence / limitation |
|---|---|---|
| 6.1 Inspect/extend leave types, balances, requests and holidays | PARTIAL | Existing structures are retained. Only CL/SL/EL balances are present; paid ML/BL requests are rejected until authoritative balances are supplied. |
| 6.2 Use monthly attendance schema and source records | PASS | The existing `AttendanceMonthly` model and `attendance_monthly.json` are used; no duplicate attendance table, write API, migration or seed was added for the Attendance page. |
| 6.3 Employee leave balance cards | PASS | Screen displays available CL/SL/EL balances after subtracting that category's pending requests. |
| 6.4 Leave application form | PASS | Form sends type, range and reason to authenticated API. |
| 6.5 Required fields, date order and business validation | PASS | API tests cover invalid dates, required reason and working-day counting; paid leave excludes weekends and listed holidays, LOP counts calendar days. |
| 6.6 Server balance, overlap and concurrent reservation checks | PASS | API tests cover insufficient balance, overlap and two concurrent duplicate applications; one request is persisted and one reservation remains. |
| 6.7 | Pending/approved/rejected/cancelled history status | PASS | Employee history renders persisted status badges; API integration verifies decision/cancellation status from a fresh GET. |
| 6.8 Holiday and approved-leave monthly calendar | PASS | Month grid displays employee approved leave and source holidays. |
| 6.9 Latest monthly attendance summary | PASS | Latest record is returned and shown; empty state is present. |
| 6.10 Loading/empty/success/error states | PASS | Screen/API paths include loading, empty, success and error states. |
| 6.11 Ownership/isolation | PASS | Session derives employee ID; API response tested against another employee’s records. |
| 6.12 | Business rule/API tests | PARTIAL | Unit/API tests cover date math, balance, overlap, duplicate concurrent request, approval, rejection and cancellation. No database fault-injection rollback test. |
| 6.13 | Cancel pending leave, release reservation, retain history | PARTIAL | Isolated API test verifies ownership, repeated-cancel rejection, pending balance release, notification, persistence and exclusion from pending approvals. Browser action was not exercised. |

## Task 7 — Payslips

| Requirement | Status | Evidence / limitation |
|---|---|---|
| 7.1 Existing payslip/run schema and data | PASS | Existing Prisma models and supplied `payslips.json`/`payroll_runs.json` are used. |
| 7.2 Authenticated `GET /api/v1/payslips` | PASS | Route returns current employee’s slips; HR/Admin can specify another employee. |
| 7.3 `GET /api/v1/payslips/{run_id}` | PASS | Owner access tested; another employee’s-only run returns 403; missing run returns 404. |
| 7.4 Monthly list and detailed view | PARTIAL | Monthly list and expandable itemization are present; there is no separate dedicated detail page. |
| 7.5 Earnings, deductions, net pay | PASS | Itemized earnings/deductions and totals shown. |
| 7.6 INR formatting | PASS | Uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. |
| 7.7 A4 print styling | PASS | `@page` A4 print stylesheet and print/save action exist. |
| 7.8 Server-side ownership / 403 | PASS | Tests cover employee list/detail owner, other employee access and missing record. |
| 7.9 Net pay for three employees | PASS | Test checks gross less deductions for three distinct source employees; all reconcile within ₹0.01. |
| 7.10 Unauthorized/missing/owner cases | PASS | API suite covers 401 list request, 403 cross-owner, 404 missing and successful owner detail. |
| 7.11 No public salary exposure | PASS | Payslip APIs require session and use scoped selects; no client seed bundle was added. |

## Task 8 — Notifications and announcements

| Requirement | Status | Evidence / limitation |
|---|---|---|
| 8.1 Persistent notifications table | PASS | Indexed `notifications` model and migration. |
| 8.2 Announcements from source JSON | PASS | Existing safe seed loader reads supplied `announcements.json`; GET reads seeded announcement table. |
| 8.3 Authenticated notification GET | PASS | Session-required API returns own inbox and unread count. |
| 8.4 Mark-read POST | PASS | Owner-scoped update endpoint. |
| 8.5 Private notification ownership | PASS | Cross-user read returns 404; another employee’s inbox is absent. |
| 8.6 Bell and unread count | PASS | Shell links to inbox and refreshes count after read/action. |
| 8.7 Notifications page | PASS | Distinct unread/read cards and announcement section. |
| 8.8 Reusable `notify()` helper | PASS | Supports idempotency keys; approval notification shares the database transaction. |
| 8.9 Notify on leave submission | PASS | Leave submit calls helper after persisted request. |
| 8.10 Read persistence | PASS | API test marks own notification, reloads, and verifies persisted read flag/count. |
| 8.11 Retry duplication handling | PARTIAL | Upsert prevents duplicates when a stable idempotency key is supplied; clients do not submit keys for leave application requests. |

## Task 9 — Employee administration

| Requirement | Status | Evidence / limitation |
|---|---|---|
| 9.1 Reuse employees/departments/roles | PASS | Existing models and relations are used. |
| 9.2 TanStack Table | PARTIAL | Custom accessible table supplies sorting/filter/pagination/selection; TanStack is not installed. |
| 9.3 Sorting, department filter, text search, pagination | PASS | Server API supports these; synthetic integration tests check filter/sort/page behavior. |
| 9.4 Create/edit forms | PASS | Accessible dialog form covers employee/contact/org fields. |
| 9.5 React Hook Form/Zod | PARTIAL | Dependencies are absent; native client constraints and explicit server validation are used. |
| 9.6 Client/server validation | PASS | Required name/email/ID, lengths, date format, references and manager cycles are checked server side; HTML constraints are also present. |
| 9.7 Bulk selection/CSV export | PASS | Selection spans pages; CSV exports selected rows or all current filtered rows. |
| 9.8 CSV matches selection/filter | PARTIAL | Export fetches every page under current server filters and intersects selected IDs. Logic is implemented but no browser-download integration test. |
| 9.9 CSV formula injection | PASS | Formula/control prefixes are neutralized; unit tests cover direct and whitespace-prefixed formulas. |
| 9.10 Audit log | PASS | Indexed persistent model and migration. |
| 9.11 Actor/action/employee/field/old/new/time | PASS | API creates per-field transactional records; tests verify create/update/deactivate values. |
| 9.12 Audit writes in transaction | PASS | Create/edit and audit are in the same Prisma transaction; integration tests exercise both. |
| 9.13 HR/Admin page and API access | PASS | Admin API enforces roles; middleware redirects unauthorized Employee page requests to `/` while preserving role checks. |
| 9.14 Employee role receives 403 | PASS | GET/POST/PATCH admin endpoints tested as Employee. |
| 9.15 Confirm before deactivation | PASS | Confirmation dialog uses browser confirmation; deactivation also revokes employee sessions server side. Confirmation itself was not browser-automated. |
| 9.16 Create/edit/validation/export/audit/access tests | PARTIAL | Create/edit/validation/filter/sort/pagination/audit/access tests pass; CSV download selection and deactivate UI confirmation lack browser automation. |

## Task 10 — Approvals and attendance oversight

| Requirement | Status | Evidence / limitation |
|---|---|---|
| 10.1 Pending leave queue | PASS | Queue route returns pending only. |
| 10.2 Managers restricted to assigned teams | PASS | Uses direct `manager_id` links and all team-lead `team_id` task assignments; synthetic multi-team test passes. |
| 10.3 HR visibility | PASS | HR queue test includes outside-team pending request. |
| 10.4 Approve/reject actions | PASS | POST decision API and UI actions. |
| 10.5 Rejection reason required | PASS | Missing reason test returns 400. |
| 10.6 Server-side decision validation | PASS | Role, pending status, employee scope and request existence checked server side. |
| 10.7 No self-approval | PASS | Manager’s own request returns 403; Employee cannot use decision API. |
| 10.8 Transactional status/balance update | PASS | Approval/rejection balance tests pass; notification is in same transaction. |
| 10.9 Duplicate/repeated decision prevention | PASS | Sequential and concurrent decision tests permit one transition and one notification. |
| 10.10 Decision notifications | PASS | Tested once for approve and reject. |
| 10.11 Team attendance for selected month | PASS | Month selector filters the authenticated team/HR attendance endpoint; integration test checks month selection and manager scope. |
| 10.12 Manager scope/self/notification tests | PASS | Integration suite covers manager team boundaries, self-approval and notifications. |
| 10.13 Reject reason/repeated/unauthorized tests | PASS | API tests cover each case. |
| 10.14 Manager absence fallback | BLOCKED | No automatic fallback or reassignment policy is implemented. HR/Admin have broader queue access by role; the organization must confirm any manager-absence escalation policy. |
| 10.15 | Employee-to-manager leave workflow | PARTIAL | API integration submits a request, confirms manager queue scope, approves it, then verifies status, balance movement and notifications. Full browser interaction/refresh remains unverified. |
| 10.16 | Show completed decisions with latest persisted status | PARTIAL | API returns recent team-scoped decisions and tests verify approved/rejected/cancelled statuses. Manager Approvals and its recent-decisions table rendered in the local browser; live decision actions and post-decision browser refresh remain unverified. |

## Additional route verification from the expanded checklist

| Route | Status | Evidence and remaining work |
|---|---|---|
| `/` | PARTIAL | Quick actions point to implemented routes; overview values are labeled sample/demo. Browser navigation was not available for this verification. |
| `/profile` | PARTIAL | Reads only the signed-in employee's employment fields and is read-only; no salary fields are selected. Actual page render/browser review remains pending. |
| `/employees` and `/employees/{id}` | PARTIAL | Directory links to an authenticated detail route with manager/direct-report details and no compensation fields. Source DB has 441 employees; no records were fabricated. Browser click-through remains pending. |
| `/payroll` | PARTIAL | Middleware and server page restrict access to Admin/HR; route reads source payroll-run periods, totals and statuses. Browser render/access check remains pending. |
| `/finance` | PARTIAL | Admin-only middleware/server guard; route reads source invoice/client data with search and status filtering. Browser render/access check remains pending. |
| `/team-board` | PARTIAL | Admin/Manager-only route reads source tasks and applies manager team/direct-report scope. Browser scope/render check remains pending. |
| `/attendance` | PARTIAL | Dedicated monthly Attendance page and role-scoped read API are implemented. Integration tests verify Employee ownership, Manager team scope, HR/Admin access, month filtering and empty records. An unauthenticated browser request correctly redirected to `/login`; authenticated desktop/mobile visual review remains unverified. |
| `/insights` | PARTIAL | Reads supplied risk/anomaly datasets, labels output as training data, scopes managers to assigned employees; no live AI claim. Browser render remains pending. |
| `/assistant` | PARTIAL | FAQ search/chat uses configured HR FAQ rows and states no live AI/external service is connected. Browser interaction remains pending. |
| `/login` | PARTIAL | Dedicated login page and auth API exist; four-role synthetic login and invalid-credential tests pass. Browser form interaction remains pending. |

## Data, quality and outstanding requirements

- Source data: 441 employees; 440 valid manager links; 16 teams; 409 distinct task assignees; 441 employee balance rows. Six leave types include CL/SL/EL/ML/BL/LOP. The source contains 5 ML and 53 BL requests, but its balance file and Prisma schema only have CL/SL/EL fields; all 441 rows have these three values and no ML/BL fields. Do not invent those balances; ML/BL need authoritative HR entitlements before paid leave can be enabled.
- Team membership has no direct employee-team table. Code uses documented source assignments (`employees.manager_id`, `teams.team_lead_employee_id`, and `tasks.team_id`/`assignee_employee_id`) and does not broaden managers to all employees.
- Seed script remains destructive (deletes existing seeded tables before reload) and was not run.
- The local database already had `demo_users.is_active`, although the migration history did not. Migration `20261027100000_leave_reservation_tracking` partially ran (the reservation column was applied; account column pre-existed), then was safely marked applied after column inspection. `20261027110000_employee_email_unique` applied successfully after confirming no duplicate source/database emails. A pristine migration-chain test database is built from migration SQL and the latest migration is applied with Prisma.
- No Phase 2 screenshot evidence was captured. Existing Phase 1 screenshots are inventoried above; they predate the current code changes and do not count as current browser acceptance.
- A browser follow-up read the Chrome accessibility tree at `http://localhost:3002/leave`. It showed a signed-in Employee page, leave form, an existing Pending request, and Cancel control. No submit/cancel/approve/reject action was taken and no screenshot was captured. Navigating to `/approvals` failed with `coordinate input geometry is unavailable`; no live request was changed.
- A second website check started the current dev server on port 3010, but the in-app browser timed out against both `localhost` and the server's displayed network interface; local HTTP requests were denied by the execution environment's socket permissions. No page interaction or data change occurred, and that dev server was stopped.
- User-reported `Cannot find module './vendor-chunks/jose.js'` traced to stale/incomplete generated development output: `.next/server/app/[section]/page.js` was a dev bundle requesting the absent vendor chunk. Removed only `.next`, completed a clean production build, and verified `node -e "require('./.next/server/app/[section]/page.js')"` loads the route bundle. Restart any existing `next dev` process so it recompiles from the clean cache.
- Follow-up runtime overlay `[object Event]` was investigated while a dev server already occupied port 3002. The shared `.next` folder contained a dev `[section]` route bundle (`isDev=true`) alongside production build output, confirming dev/build cache collision. `next.config.ts` now sends development artifacts to `.next-dev`; `.gitignore` and ESLint global ignores exclude that generated folder. The active dev server recreated `.next-dev/server/app/[section]/page.js` and `.next-dev/server/vendor-chunks/jose.js`; a clean production build then passed in `.next`. The browser showed the home page without the overlay after the configuration reload, but the `/leave` route was not conclusively retested, so that browser item remains PARTIAL.
- At that earlier checkpoint, browser checks still included responsive sizing, keyboard/focus behavior, login, create/edit dialogs, CSV content/selection, print preview, and deactivation confirmation. The current local verification below supersedes completed checks; live leave submission and approval/rejection, print preview, deactivation confirmation, and a full accessibility audit remain unverified.

## Attendance page restoration — 31 October 2026

- Git history and available checkpoint snapshots contain no dedicated `/attendance` route or sidebar entry. Earlier Phase 2 code showed the latest monthly record on Leave and team attendance inside Approvals; neither was a standalone page. The pre-addition dynamic section router and role-aware sidebar likewise had no Attendance entry, so the page was not removed by a recorded checkpoint or commit.
- Added `/attendance` through the existing dynamic section router and sidebar. The link is available to Employee, Manager, HR and Admin roles; middleware and the server-rendered route require a valid session.
- Added read-only `GET /api/v1/attendance`, backed by the existing `AttendanceMonthly` model. Employees receive only their own rows; Managers use the existing `managerAssignedEmployeeIds` scope; HR/Admin can read organization records. Month values are validated and missing records return an empty list. No attendance write API, database table, seed or migration was added.
- The page shows monthly source metrics (present, paid leave, unpaid absence, WFH and other stored fields) with summary cards, month selection, loading, empty and error states. It does not infer unavailable daily statuses or calculate absent records from totals.
- The API integration test passes for ownership, team scope, HR/Admin visibility, month selection and empty data. The production build includes the dynamic section router and `/api/v1/attendance`. The live unauthenticated route check redirected to `/login`; authenticated desktop/mobile browser layout review remains unverified.

## Commands and results

| Command | Result |
|---|---|
| `npm.cmd test` | PASS — 19 tests (13 API integration, 6 rule/data assertions), including attendance ownership/team scope/month selection, auth, leave/approval workflows and data assertions |
| `npx.cmd prisma validate` | PASS — schema valid; Prisma warns `package.json#prisma` will be deprecated in Prisma 7 |
| `npx.cmd prisma generate` | PASS — generated client used for checks |
| `npx.cmd prisma migrate deploy` | PASS after safe resolution of pre-existing local schema drift |
| `npx.cmd prisma migrate status` | PASS — schema up to date |
| `npx.cmd tsc --noEmit` | PASS — no diagnostics |
| `npm.cmd run lint` | PASS — no lint diagnostics |
| `npm.cmd run build` | PASS — optimized build completed, 17 static pages generated and dynamic/API routes compiled. Sandboxed attempts hit Windows `.next/types` EPERM; retry outside the restricted sandbox passed. Next.js warns its ESLint plugin is not detected. |
| `rg -n --glob '!design_tokens.json' '#[0-9A-Fa-f]{3,8}\\b' src` | PASS — zero raw hex color matches outside token source |
| `python -c "import json,pathlib; p=pathlib.Path('prisma/data/03_Data_Pack'); d={n:json.loads((p/f'{n}.json').read_text(encoding='utf-8')) for n in ['employees','payslips','leave_requests','leave_balances','teams','tasks','attendance_monthly']}; print({k:len(v) for k,v in d.items()}); print(sorted({k for row in d['leave_balances'] for k in row if 'balance' in k or 'entitlement' in k or k.endswith('_used')}))"` | PASS — source counts: 441 employees, 2,469 payslips, 2,183 leave requests, 441 balances, 16 teams, 4,844 tasks and 2,469 attendance rows. The balance-field output confirms CL/SL/EL only. |
| `node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); Promise.all([p.employee.count(), p.payrollRun.count(), p.invoice.count(), p.team.count(), p.task.count(), p.aiAttritionRisk.count(), p.aiAnomalyResult.count(), p.faq.count()]).then((counts) => console.log(JSON.stringify({employees:counts[0],payrollRuns:counts[1],invoices:counts[2],teams:counts[3],tasks:counts[4],attritionRows:counts[5],anomalyRows:counts[6],faqRows:counts[7]}))).finally(() => p.$disconnect())'` | PASS — read-only configured DB counts: 441 employees, 18 payroll runs, 743 invoices, 16 teams, 4,844 tasks, 430 attrition rows, 405 anomaly rows and 30 FAQ rows. |
| `git diff --check` | PASS (line-ending conversion warnings only) |

## Setup

Copy `.env.example` to `.env`, set `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters, run `npx prisma migrate deploy`, then `npm install`, `npm test`, and `npm run dev`. Do not run `npm run seed` on a database whose records must be preserved.

## Programme submission items

- The official Phase 1/Phase 2 instructions request one PDF report per phase, Git tags and pushes, adding `fobesitech` as a collaborator for a private repository, and uploading the PDFs through the programme site. These external/submission actions have not been performed. The earlier user instruction explicitly prohibited commits, pushes and Git tags; no collaboration-permission change or programme-site upload was requested in this task.
- Phase 2 still needs live leave submission and manager decision browser evidence, print/deactivation confirmation checks, authoritative ML/BL entitlement data, and the organization's manager-absence approval rule before it can be marked complete.

## Modified files

- Configuration/design/docs: `.env.example`, `.gitignore`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `README.md`, `design/design_tokens.json`, `docs/phase2-verification.md`.
- Database: `prisma/schema.prisma`, `prisma/migrations/20261027090000_phase2_core/migration.sql`, `prisma/migrations/20261027100000_leave_reservation_tracking/migration.sql`, `prisma/migrations/20261027110000_employee_email_unique/migration.sql`.
- Application/auth: `src/app/[section]/page.tsx`, `src/app/employees/[id]/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/components/design-token-styles.tsx`, `src/components/ui/states.tsx`, `src/components/employees/employee-directory.tsx`, `src/components/layout/portal-shell.tsx`, `src/middleware.ts`, `src/app/api/v1/auth/login/route.ts`, `src/app/api/v1/auth/me/route.ts`, `src/app/api/v1/employees/route.ts`, `src/app/api/v1/employees/[id]/route.ts`.
- Additional read-only workspaces: `src/components/operations/workspace-tables.tsx`, `src/components/assistant/assistant-chat.tsx`.
- New Phase 2 APIs: `src/app/api/v1/admin/employees/route.ts`, `src/app/api/v1/admin/employees/[id]/route.ts`, `src/app/api/v1/approvals/route.ts`, `src/app/api/v1/attendance/route.ts`, `src/app/api/v1/leave/route.ts`, `src/app/api/v1/leave/[id]/route.ts`, `src/app/api/v1/notifications/route.ts`, `src/app/api/v1/notifications/[id]/read/route.ts`, `src/app/api/v1/payslips/route.ts`, `src/app/api/v1/payslips/[run_id]/route.ts`.
- New UI/helpers/tests: `src/components/admin/employee-management.tsx`, `src/components/phase2/phase2-workspace.tsx`, `src/components/phase2/attendance-workspace.tsx`, `src/lib/server.ts`, `src/lib/phase2-rules.ts`, `tests/phase2-api.test.ts`, `tests/phase2-rules.test.ts`, `tests/bootstrap-migration-db.py`.

No commit, push, reset or tag operation was performed.

## Historical local verification — 30 October 2026

The target was the Horizon Portal checkout at `D:\growmar-portal\horizon-portal`; no external website was opened. The production build completed and the local dev server was subsequently restarted with `npm.cmd run dev -- --hostname 127.0.0.1 --port 3002`. This is historical evidence and does not assert that a dev server is still running.

### Browser and workflow status

| Workflow | Status | Current evidence / limitation |
|---|---|---|
| Unauthorized page redirect | PASS | `src/middleware.ts` still redirects authenticated users without the required role to `/` and keeps the existing role allowlists. The middleware test checks the 307 redirect location for protected pages; the page-level redirect does not weaken API authorization. |
| Manager Approvals loading | PASS | An authenticated read-only request as a Manager returned `/api/v1/auth/me` 200 and `/api/v1/approvals` 200. The approvals response contained an in-scope pending request, recent decisions and attendance rows; the measured API response was about 0.98 seconds warm and 5.38 seconds during a cold development compile. In the browser, the initial “Loading…” state was observed before the async request settled and the request later rendered. No persistent hang was reproduced. This points to the normal client loading state plus dev-server cold compilation, not a failed approvals response; no approvals API change was warranted. |
| Employee leave submission | BLOCKED | No new leave request was created in the user's database during this verification. The isolated API suite verifies submission, but that is not browser verification against the live account. |
| Employee leave history | PASS | The leave page rendered persisted leave history and statuses during the prior local browser run; a fresh read-only `/api/v1/leave` request for the real Employee account returned 200 with 14 requests. |
| Correct manager pending-request visibility | PASS | The actual Manager approvals API returned an in-scope pending request; the local browser page rendered the queue after its loading request completed. No decision was made. |
| Manager approve/reject workflow | BLOCKED | No live request was approved or rejected. The API workflow tests use an isolated temporary database and are not represented as a live browser workflow. |
| Payslip viewing | PASS | The local browser rendered the signed-in employee's payslip periods and earnings/deduction summaries; a fresh read-only `/api/v1/payslips` request for the real Employee account returned 200 with 6 records. |
| Payslip print / save as PDF | BLOCKED | Print preview was not opened. |
| Notifications | PARTIAL | The local browser rendered the signed-in account's notifications and announcement section; a fresh `/api/v1/notifications` request returned 200. The dev-server log recorded successful notification read-state requests during browser verification. The notification's prior state is unknown; no attempt was made to reverse the write. This historical activity means the report cannot claim that no user data was ever changed during all earlier work. |
| HR/Admin employee management | PASS | HR/Admin pages rendered employee management with the source employee list; fresh read-only HR and Admin API requests both returned 200 with 441 total employees. No record was edited. |
| CSV export | PASS | The browser export generated a CSV blob for the filtered Engineering results: 167 data rows, the expected header, and Engineering department values throughout. No employee records were changed. |
| Deactivation confirmation | BLOCKED | Deactivation was not initiated; no real employee was deactivated. |
| Responsive layout and mobile navigation | PASS | Local browser checks at 375px, 768px and desktop widths showed no horizontal page overflow on the checked routes. The mobile menu opened and Escape closed it. |
| Accessibility | PARTIAL | The checked pages had a main landmark and one page heading; interactive controls and links had accessible names in the DOM inspection. This is not a full WCAG audit, screen-reader test, contrast measurement or automated accessibility-suite result. |

### Commands run in this verification

| Command | Actual result |
|---|---|
| `npm.cmd test` | PASS — 18 tests passed, 0 failed. Includes auth, role gating, manager queue scope, leave APIs, approval/rejection on the isolated test DB, and CSV escaping. |
| `npx.cmd tsc --noEmit` | PASS — exit code 0; no diagnostics. |
| `npx.cmd eslint src/middleware.ts` | PASS — exit code 0; no diagnostics. |
| `npm.cmd run build` | PASS — optimized build completed and generated all 16 static pages. Next.js emitted its existing ESLint-plugin detection warning. |

These results supersede earlier statements that the middleware route-gate test expected a 403 for page navigation: page requests now intentionally redirect (307) while API authorization continues to return 401/403 as appropriate. The report does not claim that live leave submission, approval/rejection, print preview, deactivation confirmation, or a full accessibility audit was completed.


## Re-audit addendum — 27 October 2026

- The Apply for Leave 409 issue is clearer now: exact duplicate pending submissions return the existing request ID and a message that it was already saved; overlapping pending/approved dates still correctly return 409.
- Added owner-only `PATCH /api/v1/leave/{id}` cancellation for Pending requests. Status change, reserved-balance release, and notification are transactional. The Leave UI confirms cancellation, disables repeated clicks while it is in flight, and updates history only after success.
- Approvals now presents recent Approved, Rejected, and Cancelled decisions in addition to the pending queue. Manager recent-decision results retain the existing employee/team scope.
- Payroll source audit: 2,469/2,469 source payslips satisfy gross minus deductions equals net. No payroll amounts were changed.
- Re-audit commands: `npm.cmd test` passed 18/18; `npm.cmd run lint` passed; `npx.cmd tsc --noEmit` passed; `npx.cmd prisma validate` passed (with the package.json Prisma config deprecation warning); `npm.cmd run build` passed after retrying outside the restricted sandbox; `git diff --check` found no whitespace errors (line-ending warnings only).
- API lifecycle integration tests use isolated temporary SQLite data and verify submission, manager queueing, approval/rejection, saved statuses, duplicate-decision guards, cancellation ownership, balance release, notification and cancellation removal from pending approvals. Browser-level mutation and refresh checks remain PARTIAL because the only authenticated browser window showed the user's actual pending request; it was left unchanged.
- Existing overview figures are labelled sample/demo; Team Board, Payroll and Finance are read-only views of supplied records; AI Insights is a training dataset and HR Assistant searches the FAQ dataset, not a live AI service.
- Outstanding blockers: HR must supply authoritative ML/BL balance rules and the organization must confirm any approval escalation policy. No manager-absence policy is inferred or implemented. Browser checks for approvals actions, login, admin dialogs/export/confirmation, print preview, keyboard and responsive layouts remain to be completed.

## Audit History access — 31 October 2026

- Added read-only `GET /api/v1/admin/audit-history` and the `/audit-history` page, reusing the existing `audit_log` table.
- Both the API and page enforce HR/Admin access. Employee and Manager API requests return 403; unauthenticated API requests return 401.
- The response selects only audit metadata, actor name/ID and employee name/ID. Old/new values are included only for allowlisted employee fields; unknown fields are labeled `Sensitive field` and their values are omitted. Create (`*`) snapshots are filtered to the same allowlist.
- Filters include employee ID, action and field. Results are ordered newest first, paginated, and capped at 100 rows per request. The UI provides loading, error, empty, desktop-table and mobile-card states.
- Isolated integration tests cover HR/Admin access, Employee/Manager/anonymous denial, filtering, pagination, actor/employee display and redaction of password/session-token values.
- Verification: `npm.cmd test` passed 21/21, `npx.cmd tsc --noEmit` passed, `npm.cmd run lint` passed, and `npm.cmd run build` passed with a temporary one-worker setting to accommodate low available system memory. That temporary build setting was removed afterward. No database reset or seed was performed.

## Tasks 6–10 readiness follow-up — 31 October 2026

- Read-only inspection of `prisma/dev.db` found 441 leave-balance rows with CL/SL/EL and shared pending-day columns only; no ML/BL balance columns. Existing ML/BL request history is not an authoritative entitlement source. The supplied maternity FAQ explicitly identifies its handbook as fictional training data. ML/BL therefore remain unavailable for new paid applications and cannot be approved while their balance model is unsupported.
- Confirmed and fixed a Task 6 missing-data defect: paid requests now fail before creation if their shared pending reservation balance is null, non-finite, or negative. Approval and cancellation require a positive request day count and enough recorded pending days before releasing a reservation; approval status and balance changes remain transactional. Regression tests verify null reservations and under-recorded reservations do not create/decide requests, change leave balances, or send decision notifications.
- ML/BL rejection integration checks now compare CL/SL/EL and pending-day values before and after the rejected requests to prove they do not consume another category.
- Removed temporary client-console logging that dumped the leave API error response and request details.
- ML/BL entitlement/carry-forward/eligibility rules and employee opening balances remain pending authoritative HR/company data. Manager-absence approval fallback also remains pending company policy; no policy was inferred or changed.
- No development data was created, reset, seeded, or modified. Automated mutation checks used the isolated temporary integration database.

## Safe pre-submission verification — 31 October 2026

This review made targeted code fixes and updated `README.md` and this report. It did not run seed/reset commands, apply migrations to the configured database, or stage/commit/push files. API integration tests used an isolated temporary database.

| Check | Result |
|---|---|
| `npm.cmd test` | PASS — 24 tests passed, 0 failed, including leave-balance reservation display and unlinked-account login regressions. API integration tests used an isolated temporary SQLite database. |
| `npx.cmd tsc --noEmit` | PASS — exit code 0, no diagnostics. |
| `npx.cmd eslint . --concurrency off` | PASS — full repository lint completed with no diagnostics. The default `npm.cmd run lint` encountered a host memory exhaustion during this review; the single-process full lint passed. |
| `npx.cmd prisma validate` | PASS — schema valid. Prisma emitted the existing `package.json#prisma` deprecation warning. |
| `npm.cmd run build` | PASS — production build completed; all 18/18 static-generation steps succeeded and the route manifest was emitted. Next.js emitted the existing ESLint-plugin detection warning. |
| `git diff --check` | PASS — no whitespace errors; Git reported existing LF/CRLF conversion warnings. |
| Local database/migration inspection | PASS for this review — read-only inspection found 441 employees, no duplicate work-email groups, and a successful record for each current migration. The reservation migration has one rolled-back attempt and one successful attempt. No migration, seed, reset or write was run against the configured database. |

The three Phase 2 migrations do not drop or delete data; the isolated integration test exercises them on a disposable database. However, the pre-existing `20261020155234_map_table_names` migration drops all original PascalCase tables and creates lowercase tables without copying rows. It is safe only when those legacy tables are empty (as in the fresh migration test); if it is pending for a populated Phase 1 database, deploying the full chain would lose data. Inspect migration history and back up any target before deployment. The reservation migration's rolled-back attempt and the unique-email index's assumption of unique existing data are also reasons to inspect target history/data rather than rerunning or marking migrations blindly.

Phase 1 regression is **PARTIAL / NOT VERIFIED IN BROWSER**: the build and automated API/middleware tests passed, and the current router retains the profile, employee directory, payroll, finance, team-board, insights and assistant sections; login remains in its dedicated route. The dynamic section router was substantially rewritten, and current Phase 1 visual/theme/keyboard/responsive behavior was not retested; the old screenshots predate these changes.

The checklist in this report is based on the requirements supplied for this review and the repository's source data; no separate official GrowMar policy specification was provided. Remaining external confirmations are authoritative ML/BL entitlement/opening-balance data and the organization's approval escalation policy. No manager-absence fallback is implemented. Live browser checks remain pending for leave submission/decisions, payslip print, deactivation confirmation and current responsive/accessibility behavior. A prior historical browser verification changed a notification's read state, with its prior state unknown; this review did not make further database changes.
