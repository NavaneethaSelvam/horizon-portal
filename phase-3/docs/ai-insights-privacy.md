# AI Insights privacy and use decision

The Insights workspace presents aggregate outputs from sample/model datasets. It is not a live inference system and is not evidence that an employee has a performance issue, that fraud occurred, or that payroll is incorrect.

## Attrition summaries

Attrition risk is shown only as department-filtered High/Medium/Low aggregate counts and generalized reason categories. The workspace does not display employee names, employee IDs, prediction IDs, individual scores, or raw model reasons. Raw reasons can embed personal measurements such as experience, engagement, work arrangement, or relative pay, so the interface maps them to broad categories instead.

Sensitive groups with fewer than five distinct people are suppressed. Reason-category groups use the same threshold. The API requires a single department selection and does not provide an all-department total or a total-count field; this avoids exposing a total that could be subtracted from filtered counts to recover a hidden group. Suppressed values are not exposed in the response as counts.

## Payroll and attendance model outputs

Anomaly results are grouped by department, source, period, generalized reason category, and model status. Cards are ordered by aggregate `money_at_risk` where available. They do not expose employee names or IDs, source record IDs, anomaly scores, model versions, or raw reason text. A group is shown only when at least five distinct non-null employee identifiers are represented. For Unmapped groups, this threshold is based on five distinct source employee identifiers, without trying to resolve those identities. Missing money-at-risk data is explicitly labeled as not reported; the dashboard does not interpret it as zero.

Department association is derived only through an exact `employee_id` match to an Employee record and that employee's valid `department_id`. A missing employee, null department, or invalid department reference is treated as **Unmapped**. No department is inferred from other fields.

## Human review

Every AI output section and anomaly card is labeled **AI-generated, for human review**. Outputs are advisory only and must not automatically determine termination, promotion, salary changes, disciplinary action, or any other employment decision. Any follow-up must be independently reviewed by an authorized human using appropriate source records and policy.
