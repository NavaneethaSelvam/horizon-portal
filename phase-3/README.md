# Phase 3 — Advanced Workforce Operations

Phase 3 added payroll, finance, team task coordination, workload/capacity planning and AI-assisted insights (Tasks 11–15).

## Tasks and deliverables

11. **Payroll console:** payroll-run summaries and status information for authorized HR/Admin users.
12. **Finance console:** invoice and expense review, search/filter workflows and Admin-only access.
13. **Team task board:** Kanban workflow, team/sprint filters, drag-and-drop and version-aware updates.
14. **Workload and capacity:** sprint/team workload summaries, approved leave, capacity estimates and overload indicators.
15. **AI insights:** aggregate attrition/anomaly summaries, small-group privacy suppression and human-review disclosures.

## Evidence and documentation

- Report: [FullStack_Navaneetha_Phase3_Report.pdf](report/FullStack_Navaneetha_Phase3_Report.pdf)
- Screenshots: `screenshots/` (Tasks 11–15)
- Privacy guidance: [ai-insights-privacy.md](docs/ai-insights-privacy.md)

## Application locations

Application source remains at the repository root:

- Shared page routing: `src/app/[section]/page.tsx`
- APIs: `src/app/api/v1/tasks/`, `workload/` and `insights/`
- Workspaces: `src/components/operations/`
- Business rules: `src/lib/ai-insights-rules.ts`, `finance-rules.ts`, `payroll-rules.ts`, `task-board-rules.ts` and `workload-rules.ts`
- Tests: `tests/`
- Phase 3 data and task-board migration: `prisma/`

Main application routes: `/payroll`, `/finance`, `/team-board`, `/workload-capacity` and `/insights`.

No application source is duplicated in this phase folder.
