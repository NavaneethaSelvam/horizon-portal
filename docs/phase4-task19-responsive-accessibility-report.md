# Phase 4 Task 19 — Responsive and accessibility audit

Audit date: 2026-11-20

## Scope

The local authenticated application was checked at 360px, 768px, and 1366px across the main portal routes: home, directory, leave, attendance, payslips, employee administration, audit history, approvals, payroll, finance, team board, workload, insights, assistant, and profile.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Horizontal overflow | PASS | No route reported `document.documentElement.scrollWidth > innerWidth` at the three tested widths. |
| Mobile navigation | PASS | Sidebar is hidden at 360px; the menu button opens it with `aria-expanded="true"`, and Escape closes it. |
| Tables and grids | PASS | Responsive table/card variants rendered without page-level overflow; wide data remains inside scroll containers where applicable. |
| Keyboard focus | PASS | Main links and controls are reachable by Tab and receive visible outlines. |
| Mobile menu focus | FIXED | Closed mobile navigation is now inert and focus returns to the menu trigger after Escape/backdrop close. |
| Form labels and names | PASS | Automated DOM scan found no unnamed `a`, `button`, `input`, `select`, or `textarea` controls on the dashboard. |
| Image alternatives | PASS (scope) | No HTML `<img>` elements were present in the tested authenticated UI; decorative icons are SVG components. |
| Token contrast | PASS (tested pairs) | Primary/white 5.18:1, muted/background 4.59:1, success/white 5.02:1, warning/white 5.02:1, danger/white 6.47:1, info/white 5.93:1. |
| Production build | PASS | `npm.cmd run build` completed successfully. |
| TypeScript | PASS | `npx.cmd tsc --noEmit` completed successfully. |
| Lint | PASS | `npm.cmd run lint` completed successfully. |
| Automated tests | PASS | `npm.cmd test`: 84 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. |

## Test bootstrap portability

The 22 `spawnSync python ENOENT` failures were caused by the Windows environment not exposing `python`, `python3`, or `py` on PATH. The test bootstrap now uses [`scripts/run-bootstrap-migration-db.cjs`](../scripts/run-bootstrap-migration-db.cjs) to try `py -3`, `python`, and `python3` in a platform-aware order. When no Python executable is available, it uses Node's built-in `node:sqlite` to reproduce the existing migration-bootstrap behavior. The existing [`tests/bootstrap-migration-db.py`](../tests/bootstrap-migration-db.py) remains the first-choice implementation when Python is available.

## Lighthouse and live deployment

No Lighthouse scores are recorded because no live deployment URL is available in the repository or shared browser session. The project README explicitly says that the hosted database, Vercel connection, live role smoke tests, and screenshots are pending authorization. The Lighthouse CLI is also not installed locally. Performance, Accessibility, Best Practices, and SEO therefore remain **not verified**, rather than being claimed as 90+.

## Real device

No physical phone was available to this audit. The mobile check was performed with a 360px browser viewport only; this is not a substitute for real-device testing.

## Largest measured performance opportunity

The production build reports 103kB shared first-load JavaScript and a 164kB first load for the shared section route. No before/after Lighthouse run was available, so a largest speed gain is not claimed. The next evidence-based step is a live Lighthouse run followed by route-level bundle and image optimization if Performance is below 90.
