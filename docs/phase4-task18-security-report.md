# Phase 4 Task 18 — Security Hardening Report

## Audit scope and inventory

The audit inspected the actual source under `src/app/api/v1/`. The verified inventory is **21 route files** and **24 exported HTTP handlers**. No database reset, seed, migration, production connection, commit, push, or deploy was performed.

## Changes completed

- Login rate limiting now uses an atomic Upstash Redis fixed-window script: 10 attempts per 15 minutes, with expiry set only on the first increment.
- Upstash non-2xx responses, network failures, timeouts, malformed JSON, and malformed counters fail closed and are converted by login to HTTP 503.
- Missing production Upstash configuration returns HTTP 503; development/test may use the existing in-memory limiter.
- Rate-limit responses return HTTP 429 with the Redis TTL in `Retry-After`.
- Login no longer trusts arbitrary `x-forwarded-for` values; it uses the platform-provided request IP when available and otherwise uses a shared safe fallback.
- Security-event logs do not include client IPs, passwords, tokens, or secrets.
- `pretest` now generates the SQLite Prisma client from `prisma/schema.prisma`. `scripts/build.mjs` remains the production PostgreSQL generation path.
- Added focused tests for missing Upstash configuration, Upstash failure/malformed responses, and the 10-attempt local limiter boundary. Existing integration coverage verifies invalid credentials return HTTP 401.

## Authentication and authorization

Protected API handlers require a verified session. Session verification checks JWT signature, expiry, role consistency, active user status, linked employee status, and the 32-character minimum `SESSION_SECRET` requirement. Role and ownership checks were reviewed for employee, manager, HR, and admin paths, including self-approval prevention and manager direct-report/team scope.

The employee profile, payslip, leave, notification, and task routes enforce server-side ownership or role scope before returning or mutating records. Cross-employee access is denied; no UI-only authorization was relied upon.

## Input validation

Zod remains pinned to **4.6.7**. User-controlled bodies, query values, and path identifiers use bounded schemas or equivalent bounded checks. Strict schemas are used for login, assistant, leave, approvals, employee changes, and task updates. Malformed JSON is handled safely, and validation failures return HTTP 422 with generic messages. Date formats are checked before domain date rules run.

## Cookies and headers

The session cookie is HttpOnly, `SameSite=Lax`, path `/`, secure in production, and expires after eight hours. Logout and invalid sessions clear it. Configured headers include `X-Content-Type-Options: nosniff`, strict-origin referrer policy, restrictive Permissions-Policy, CSP with `frame-ancestors 'none'`, and production HSTS. Live deployed-header verification remains pending because no production environment was accessed.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| API inventory | **PASS** | 21 route files, 24 handlers counted from source |
| TypeScript | **PASS** | `npx.cmd tsc --noEmit`, 0 diagnostics |
| ESLint | **PASS** | `npx.cmd eslint .`, 0 errors reported |
| Production build | **PASS** | `npm.cmd run build` generated PostgreSQL Prisma Client and completed the Next.js production build |
| Diff whitespace | **PASS** | `git diff --check`, no whitespace errors |
| Zod version | **PASS** | `zod@4.6.7` remains pinned |
| Automated tests | **PENDING** | `npm.cmd test` ran local Prisma generation, then all 10 test workers failed before loading tests because Node 24.21.0 raised `uv_os_get_passwd returned ENOMEM` from `tsx`; no assertions executed |

The test failure is an environment/runtime blocker, not a Prisma datasource error. The pretest generation step confirms the intended SQLite client path; the production build confirms the PostgreSQL client path.

## Final 10-item checklist

1. **PASS** — 21 route files and 24 handlers inventoried.
2. **PASS** — Protected endpoints require verified sessions.
3. **PASS** — Role, ownership, manager scope, and self-approval checks reviewed.
4. **PASS** — Employee/payroll/leave/notification/task IDOR protections are server-side.
5. **PASS** — Zod 4.6.7 validation and generic HTTP 422 handling are present.
6. **PASS** — Session cookie flags, expiry, logout clearing, and secret minimum are enforced.
7. **PASS** — Security headers are configured in source; live production verification is pending.
8. **PASS** — Login limiter fails closed, uses 10/15-minute fixed windows, and avoids spoofable forwarded headers.
9. **PENDING** — Full automated regression assertions could not run because of the Node/tsx ENOMEM runtime failure.
10. **PENDING** — Production Upstash variables and live rate-limit/header checks require deployment configuration and manual verification.

## Final status

Task 18 implementation is complete in source, but final verification is **partially complete** until the test suite is rerun under a functioning Node runtime and production Upstash/HTTPS checks are performed. Phase 1–3 behavior was preserved by the targeted changes; the full regression suite could not execute in this environment, so that claim remains pending automated confirmation.
