# phases.doc.md — PROJECT EXECUTION PHASES

The team should complete the exit checklist for one phase before treating that phase as complete. A later phase may begin in parallel only when it does not depend on an unfinished foundation from an earlier phase.

These phases follow the finalized PRD, architecture, rules, design and memory documents.

**Standard exit checklist for every phase (see full text at the end of each phase):**

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 1: FOUNDATION, PORTAL SHELL & LANDING PAGE

Build the single common MPLADS portal foundation — both the public landing page and the technical skeleton every later phase depends on.

## Work

### Public Landing Page
- Build the public landing page.
- Explain the current MPLADS monitoring problem.
- Explain how the platform solves the problem.
- Show the AI capabilities without making exaggerated fraud claims.
- Explain the workflow: MP recommends → District reviews → AI analyzes → Official decides → Agency executes → System monitors → Inspection happens when warranted.
- Add the common Sign In CTA.

### Frontend Foundation
- Set up the React application foundation.
- Establish shared design tokens (`design.md` §5.65) and reusable components (Header, Sidebar, Button, Badge, Card, Table shell).
- Establish common header/footer patterns.

### Backend Foundation *(previously missing — required before Phase 2 can build anything)*
- Set up the Express application skeleton (routing structure, middleware pipeline).
- Establish `.env.example` and environment-variable conventions; confirm no secret is ever committed (`rules.md` §13).
- Establish consistent API response shape and HTTP status-code conventions (`rules.md` §8).
- Establish centralized error-handling middleware (`rules.md` §14) — no stack traces or internals reach the client.
- Establish basic application logging, distinct from the future audit log (`rules.md` §15).
- Establish the MongoDB connection and create the **`users`** collection with schema validation (role, jurisdiction, credential fields) — this is the one collection Phase 2 (Authentication) needs to exist first. The rest of the domain data model is built in Phase 3.

### Example

A visitor should understand:

> **The data exists. The challenge is comparing it at scale.**

and then understand the solution:

> **Historical Memory + AI Analysis + Explainable Risk + Automated Monitoring + Human Decision**

A developer opening the repo for the first time should be able to run the frontend and backend locally, hit a health-check endpoint, and see a consistent error response for a bad request — before any business feature exists.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 2: LOGIN, AUTHENTICATION, ROLE-BASED ACCESS & ADMIN USER MANAGEMENT

Build one common authentication experience, route users to role-specific workspaces after login, and give Admin the ability to actually create those users.

## Work

- Build the common login page: User ID / Official Email, Password, CAPTCHA, Sign In, Forgot Password.
- Implement bcrypt password hashing against the `users` collection created in Phase 1.
- Implement JWT authentication and refresh-token handling.
- Implement server-side CAPTCHA.
- Implement failed-login protection / lockout.
- Implement password reset.
- Implement RBAC and jurisdiction/scope checks (`rules.md` §10 — role + jurisdiction + entity-scope, every request).
- Implement role-based routing.
- Create workspace shells for: MP, District Authority, State Authority, Ministry, Implementing Agency/Engineer, Auditor, Admin.
- **Admin user management** *(previously missing)*: create/edit users, assign role and jurisdiction, deactivate accounts. This is Admin's core function and the only way any other role's account gets created — build it here, not later.
- Confirm explicitly: Admin's own screens and APIs never expose risk, decision, or audit content (`design.md` §5.32, `rules.md` §10) — administering accounts is not a backdoor into sensitive data.
- Ensure React does not become the authorization boundary — every check above is re-verified server-side.

### Role Direction

```text
MP                  → Recommend + Monitor
District Authority  → Scrutinize + Decide
Engineer / Agency    → Execute + Report
State Authority      → Supervise + Inspect
Ministry             → Policy + Supervise + Accountability
Auditor              → Review + Trace
Admin                → Operate the system (users/config only)
```

### Example

An MP and District Authority use the same login page. After authentication, the MP is routed to `/mp/*` while the District Authority is routed to `/district/*`. The District Authority can act on projects within its permitted jurisdiction; the MP cannot perform those administrative actions. An Admin can create a new District Authority account and assign it to a district — but cannot open that district's risk dashboard.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 3: CENTRALIZED DOMAIN DATA MODEL

Establish the full centralized MongoDB source of truth and historical memory (the `users` collection already exists from Phase 1).

## Work

Create and validate the domain-specific collections:

```text
mp_allocation
fund_utilization
work_completion
completion_rates

projects
project_recommendations
engineering_reports
project_progress
project_payments
utilization_certificates

implementing_agencies
agency_performance
agency_concentration

sc_st_area_reference

ai_risk_flags
ai_risk_scores
ai_analysis_history

inspections
officer_decisions
notifications
audit_logs

user_preferences
```

**Note on `mp_attention_scores`:** this is **not** a stored collection to build here. Per `architecture.md` §10, it is a derived/materialized view computed from `ai_risk_scores` + `work_completion` — build the aggregation query, not an independently-maintained collection. It's implemented where the MP dashboard needs it (Phase 4), not as a source-of-truth table here.

## Data Rules

- Keep collections separate by domain.
- Connect collections using: `mp_id`, `project_id`, `agency_id`, `inspection_id`, `user_id`.
- Keep `mp_allocation` separate from work/project data.
- Preserve the original MP recommendation, engineering versions, every progress update, payment history, and inspection/decision history — never overwrite.
- Add provenance metadata (`is_real_government_data` / `is_synthetic`) to every ingested record.
- Add required indexes and schema validation.
- Use MongoDB transactions where related records must remain consistent (e.g., a payment write that also updates `fund_utilization`/project status).

## Real Data

Load the available government-source allocation data into the appropriate collection. Use available real project/performance information, such as the Indore data, only in the collections it actually supports.

### Example

```text
MP-001
  ↓
mp_allocation
  ↓
projects
  ↓
PRJ-001
  ├── project_recommendations
  ├── engineering_reports
  ├── project_progress
  ├── project_payments
  ├── ai_risk_flags
  ├── ai_risk_scores
  ├── inspections
  └── officer_decisions
```

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 4: CORE DASHBOARDS, PROJECT LIFECYCLE & USER PREFERENCES

Build the basic role-based workspaces and project lifecycle before adding advanced AI.

## Work

### MP Dashboard
Build: allocation, recommended amount, expenditure, completed/pending works, completion rate, project status, attention items, and the **`mp_attention_scores` derived view** (computed here from `ai_risk_scores` + `work_completion`, per Phase 3's note — not a stored collection).

### District Authority Dashboard
Build: pending recommendations, projects, current statuses, basic financial information, initial review queue.

### State Dashboard
Build: state project overview, basic counts, initial risk placeholder, inspection placeholder.

### Ministry Dashboard
Build: national overview, state overview, implementation summary.

### Agency Dashboard
Build: assigned projects, project status, pending updates.

### Auditor Dashboard
Build: project history, decision/inspection history entry points.

### Admin Dashboard
Build: system health / user status only (`design.md` §5.32) — no risk, decision, or audit content.

### User Preferences *(previously missing — the one feature `memory.md` actually calls for)*
- Implement `user_preferences` (sidebar collapsed state, per-screen table filters/sort/page-size).
- Owned by the individual user; failure to load defaults gracefully (`memory.md` §18) — never blocks dashboard load.

## Project Lifecycle

Implement the canonical state machine defined in `architecture.md` §10.1:

```text
MP_RECOMMENDED
      ↓
DISTRICT_REVIEW
      ↓
CLARIFICATION_REQUIRED / HELD
      ↓
SANCTIONED
      ↓
IN_PROGRESS
      ↓
COMPLETED
```

Support: `INSPECTION_REQUIRED`, `ESCALATED`. All state transitions must be authorized by Express. Use `design.md` §5.39 for the corresponding UI badge labels — don't invent new display states that don't map back to this enumeration.

## Example

A new MP recommendation appears in the District review queue. The District Authority can open the project and see its basic identity, cost, location and current status. The District Authority's sidebar stays collapsed the way they left it last session.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 5: PROJECT MANAGEMENT, ENGINEERING, PROGRESS, PAYMENTS & DOCUMENTS

Build the detailed project information that later powers AI analysis.

## Work

### Project Recommendations
Create/read, preserve the original MP recommendation, validate required fields.

### Engineering Reports
Submit technical reports, preserve versions, record submitter and timestamp; store length, width, height, quantity, material, specifications, cost.

### Progress
Submit updates, preserve history, store physical progress, support milestones/status.

### Payments
Store individual payment records, preserve history, validate amounts, connect every payment to `project_id`.

### Utilization Certificates
Store UC records, track submission/status, identify overdue/incomplete UCs.

### Documents
Controlled upload for UCs, evidence, sanction orders; binary content in object storage, metadata/reference in MongoDB (`architecture.md` §14); type/size validation server-side; every fetch goes through an authorized endpoint, never a public URL.

### Example

```text
Recommendation
500m × 4m
₹25L

Engineer Report v1
500m × 4m
₹25L

Engineer Report v2
350m × 3m
₹29L
```

All versions remain available for comparison.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 6: COMPLIANCE & DETERMINISTIC MONITORING

Implement rules that can be evaluated without an LLM — this comes before AI (Phase 8) because it's the platform's clearest "we know what's not AI" capability and doesn't depend on any AI infrastructure.

## Work

Build compliance checks for: project eligibility, required fields/documentation, timeline conditions, utilization-certificate status, SC/ST quota monitoring, other configurable scheme norms.

Output states: `COMPLIANT`, `REVIEW_REQUIRED`, `NON_COMPLIANT`.

## SC/ST Monitoring
Use `sc_st_area_reference` to calculate the applicable recommendation mix continuously (not year-end only) and flag configured thresholds.

## Financial Deterministic Checks
Implement: allocation totals, utilization ratios, completion rate, payment totals, payment/progress calculations, amount consistency.

## Rule
Do not call deterministic checks AI — they must be visually and architecturally distinct from AI findings (`design.md` §5.19).

### Example

```text
Payment = ₹30L
Physical Progress = 30%

→ Payment/progress mismatch signal
```

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 7: n8n AUTOMATION & BACKGROUND WORKFLOWS

Connect the application to automated background workflows.

## Work

### Workflow 1 — Data Ingestion
```text
CSV → Parse → Validate → Normalize → MongoDB → Ingestion Log
```
Fully buildable and testable now.

### Workflow 2 — Scheduled Monitoring
```text
Schedule → Active Projects → Progress + Payments → Rules / AI where needed → Risk Update → Alert
```
**Dependency note:** the *rules* portion (compliance checks from Phase 6) is buildable now. The *AI* portion ("Risk Update") depends on the Risk Engine from Phase 9 — build the scheduling and rule-based path here, and wire the AI-triggered path in once Phase 9 lands. Do not attempt to call an AI risk endpoint that doesn't exist yet.

### Workflow 3 — Notifications
Route alerts using severity, role, jurisdiction, project responsibility. Buildable now against Phase 6's rule-based flags; extended once AI flags exist.

### Workflow 4 — Escalation
```text
Project Risk → District → State → Ministry where systemic/appropriate
```
Same dependency note as Workflow 2 — the escalation *mechanism* is buildable now; risk-triggered escalation is wired in after Phase 9.

### Workflow 5 — Inspection Workflow
```text
Risk / Inspection Recommendation → Authorized Authority → Assignment → Inspection → Result → Audit
```
Depends on Phase 9 (risk) and Phase 13 (inspection queue) for its trigger; the workflow shell can be built now.

## Critical Rule

n8n must not become: authentication, RBAC, primary database, application authorization, or final decision authority. The synchronous District pre-sanction path works without n8n:

```text
React → Express → Python AI → Gemini → MongoDB
```

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 8: CORE AI — HISTORICAL INTELLIGENCE

Build the first AI capabilities that directly address the PS 26102 problem.

## AI-01: Cost Anomaly
> Is the proposed cost unusual compared with comparable historical projects?

Implement peer-group creation, median, IQR, deviation, optional anomaly model.

```text
Peer median = ₹22L
New proposal = ₹63L
Deviation ≈ +186%
```

## AI-02: Historical Repeat / Duplicate Detection
> Has a similar work already been done at the same or nearby location?

Use semantic similarity, project category, location, ward, district, historical date.

**Implementation note:** compute similarity **in-process** in the Python AI service (TF-IDF/embeddings + cosine similarity) for MVP scale. Do **not** introduce MongoDB Atlas Vector Search or any vector database here — that's an explicitly deferred production-scale decision (`architecture.md` ADR 26.3, `rules.md` §4). The demo dataset is small enough that in-process comparison is both sufficient and more reliable to deploy.

Output: *"Possible repeated/overlapping work."*

## AI-03: Engineering Comparison
> Did the technical report materially change the original recommendation?

Compare length, width, quantity, material, scope, specifications, cost, cost per unit.

## AI-04: Delay / Staleness
Detect long update gaps, delayed projects, abnormal progress trajectories. Start with deterministic rules before adding ML prediction.

## AI-05: Payment / Progress Anomaly
Compare physical progress vs. financial progress.

*(Engineering Comparison and Payment/Progress Anomaly together cover what would otherwise be a redundant "Execution Consistency" feature — per `prd.md`'s changelog, that's intentionally not a separate item here.)*

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 9: RISK ENGINE, AI GATEWAY & EXPLAINABLE AI

Combine individual signals into an actionable project-level risk view, and put the proper abstraction in front of the LLM before wiring anything else to it.

## Work

Store individual findings in `ai_risk_flags`, current combined risk in `ai_risk_scores`, historical calculations in `ai_analysis_history`.

## Risk Inputs
```text
Cost anomaly, Duplicate risk, Specification deviation,
Payment anomaly, Delay, Compliance, Historical pattern
```

## Risk Output
`LOW` / `MEDIUM` / `HIGH` with score, level, contributing signals, explanation.

```text
Risk: 87 HIGH

Cost anomaly          32
Duplicate              27
Specification          18
Payment mismatch       10
```

## AI Gateway *(previously missing as an implementation step)*
- Build the AI Gateway abstraction now, before wiring Gemini into anything else — business logic and the frontend call the Gateway, never Gemini directly, so a future move to Ollama/local models touches only the Gateway (`architecture.md` §13, ADR 26.4).
- Implement the **AI data-minimization rule** (`architecture.md` §15.5, `rules.md` §12): only structured, de-identified evidence (e.g., `{proposed_cost, peer_median_cost, cost_deviation_percent}`) is ever sent through the Gateway — never raw applicant/agency PII, never full documents.

```text
Structured signals → AI Gateway → Gemini (today) / Ollama (future) → Explanation
```

Gemini must not have direct database access and must not become the source of truth for numeric calculations.

## AI Failure
If AI fails: `AI_ANALYSIS_UNAVAILABLE` or `AI_ANALYSIS_PENDING`. Do not silently show LOW risk.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 10: DISTRICT AI REVIEW & HUMAN DECISION

Connect AI findings to the actual administrative review workflow.

## Work

District Authority opens a recommendation and sees: Project, Status, Cost, Historical matches, Cost benchmark, Engineering comparison, Compliance, Agency intelligence, Risk, Explanation, Evidence.

Actions: Approve/Sanction, Hold, Request Clarification, Send for Inspection, Escalate. AI cannot perform the final action.

### Example

```text
New Road          ₹63L
Historical median  ₹22L
Similar project    93%
Engineering deviation  Detected
Overall risk       HIGH — 87

Recommendation: Review technical estimate and historical overlap.
```

The District Authority decides the next step.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 11: CONTINUOUS EXECUTION MONITORING

Extend intelligence from pre-sanction review to post-sanction execution.

## Work

```text
Engineer → Express → project_progress → Monitoring
   → Payments + Previous Progress + Engineering
   → Delay / Consistency Analysis → Risk Update
```

Monitor delays, stale updates, payment/progress mismatch, engineering changes, abnormal progress jumps, unusual completion patterns, evidence inconsistencies where evidence exists.

## Hierarchical Information Flow

```text
Engineer / Agency → District Authority → AI Analysis
   → State Authority if required → Ministry if systemic/appropriate
```

### Example

Engineer reports 90% complete. System finds payment = 96%, previous progress = 45%, timeline delayed → **Ground verification recommended.**

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 12: AGENCY INTELLIGENCE & EFFICIENCY

Build supporting intelligence around implementing agencies.

## Work

### Agency Performance
Analyze completion, delay, cost deviation, inspection outcomes, comparable project count, category experience, project scale.

### Agency Suitability
```text
Eligible agencies → Comparable historical performance
  → Suitability ranking → Concentration check → Advisory recommendation
```

### Agency Concentration
Monitor project-count share, financial-value share, district concentration, category concentration, recurring concentration patterns.

## Important

Keep Agency Suitability and Agency Concentration separate (`design.md` §5.33) — never merge into one "agency score." Agency suitability remains advisory and must be capped/flagged if it would repeatedly reinforce the same agency (the concentration guardrail from `prd.md` §12.8).

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 13: FIELD VERIFICATION & INSPECTION INTELLIGENCE

Connect risk detection to real-world physical verification — and explicitly to the statutory mandate this platform is upgrading.

## Work

### Field Verification Recommendation
Use signals such as payment/progress mismatch, engineering deviation, reporting gap, unusual completion information, historical overlap, multiple high-risk indicators. Output: *"Ground verification recommended."*

### Inspection Queue

State/District sees a risk-ranked list, explicitly framed against the state's mandated annual physical-inspection quota (`design.md` §5.25) — not a generic priority list:

```text
Rank | Project | Risk | Reason | Status
1    | Road A  | 92   | Cost + Progress | Pending
2    | Hall B  | 88   | Duplicate       | Assigned
3    | Water C | 84   | Delay           | Scheduled
```

### Inspection Lifecycle
Per `architecture.md` §10.1 (canonical):
```text
RECOMMENDED → PENDING_DECISION → ASSIGNED → SCHEDULED
   → IN_PROGRESS → COMPLETED → RESULT_RECORDED
```
Result (set at `RESULT_RECORDED`): `NO_ISSUE` / `REVIEW_REQUIRED` / `ESCALATE` — a separate field from lifecycle status.

### Annual Inspection Capacity
```text
Eligible works → Risk ranking → Applicable annual inspection capacity
   → Priority list → Authorized authority → Inspection
```

The platform prioritizes risk within the existing legal 1% inspection requirement; it does not autonomously order enforcement.

### Future Field Interface
May include GPS, timestamp, photos, checklist, observed measurements, ground result (Future Scope, not MVP).

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 14: MINISTRY SYSTEMIC INTELLIGENCE & ACCOUNTABILITY

Build the strategic national monitoring layer.

## Work

### National Trends
State comparison, expenditure trends, completion trends, risk trends, delay trends.

### Systemic Risk
```text
Project → District → State → National
```
Identify recurring cost anomalies, recurring duplicate patterns, agency concentration, payment/progress mismatches, worsening delays, recurring compliance issues.

### Ministry Responsibilities
- **Policy Decision:** use system-wide evidence to identify policy/process improvement opportunities.
- **Supervise Implementation:** monitor state and district implementation patterns.
- **Ensure Accountability:** monitor unresolved cases, escalations, inspection outcomes, decisions, audit history.

AI may summarize aggregated structured evidence. Final policy decisions remain human.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 15: AUDIT, TRACEABILITY & QUALITY ASSURANCE

Make the platform traceable and reliable.

## Work

### Audit
Record material events: project creation, recommendation, engineering submission, progress, payment, status transition, officer decision, inspection assignment/result, document actions, AI analysis events.

Keep `AI_ANALYSIS_COMPLETED` (system event) separate from `OFFICER_SENT_FOR_INSPECTION` (human decision) — AI activity is never logged or displayed as if it were a decision.

### Traceability
Use `request_id` / `correlation_id` where useful for tracing a request across Express → Python AI → n8n.

### Source-of-Truth Validation
Confirm: source collections remain authoritative; AI collections remain derived; historical records remain reconstructable; no normal API (including Admin's) can overwrite audit history.

### Quality Tests
Test authentication, permissions, jurisdiction, validation, duplicate data, AI failure, n8n failure, project transitions, payment consistency, inspection lifecycle, audit history — per `rules.md` §17.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE 16: FINAL UI POLISH, SIH DEMO & DEPLOYMENT

Prepare the platform for the SIH demonstration and future deployment.

## Work

### UI
Verify simple government-site visual language, common components, consistent design tokens, readable tables, clear forms, responsive behavior, accessibility (`design.md` §5.48), clear AI wording, no unnecessary animation.

### Demo Data
Prepare clearly marked synthetic cases for: cost anomaly, duplicate/repeat work, engineering deviation, payment/progress mismatch, delay, field-verification recommendation.

**Critical rule:** every demo risk flag must come from actually running the real pipeline (Phases 8–9) against this planted synthetic *input* data — never a hard-coded output value standing in for the pipeline, even under demo time pressure (`rules.md` §12). Planted input is fine and expected; a faked output is not.

### Demo Flow
```text
Landing Page → Common Login → District Authority → Recommendation
   → Historical Comparison → Cost Anomaly → Engineering Difference
   → Risk Explanation → District Decision → Engineer Update
   → Monitoring → Field Verification Recommendation
   → State Inspection Queue (framed against the 1% mandate) → Audit Trail
```

### Deployment
Prepare environment variables, `.env.example`, build process, MongoDB configuration, Gemini configuration, n8n credentials, AI Gateway configuration, backup/recovery approach, application logs, monitoring.

## Exit Checklist

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

---

# PHASE DEPENDENCY OVERVIEW

```text
PHASE 1   Foundation, Portal Shell & Landing Page
             ↓
PHASE 2   Authentication, RBAC & Admin User Management
             ↓
PHASE 3   Centralized Domain Data Model
             ↓
PHASE 4   Dashboards, Lifecycle & User Preferences
             ↓
PHASE 5   Engineering + Progress + Payments + Documents
             ↓
PHASE 6   Compliance + Deterministic Monitoring
             ↓
PHASE 7   n8n Automation (ingestion/notifications now; AI-triggered parts after Phase 9)
             ↓
PHASE 8   Core Historical AI
             ↓
PHASE 9   Risk Engine + AI Gateway + Explainability
             ↓
PHASE 10  District Review + Decision
             ↓
PHASE 11  Continuous Monitoring
             ↓
PHASE 12  Agency Intelligence
             ↓
PHASE 13  Field Verification + Inspection
             ↓
PHASE 14  Ministry Systemic Intelligence
             ↓
PHASE 15  Audit + Quality
             ↓
PHASE 16  Demo + Deployment
```

---

# Critical MVP Path

The team does not need every Phase 12–16 feature completed before the first strong SIH demonstration.

```text
Foundation (Phase 1) → Login + RBAC + Admin (Phase 2) → Central Data Model (Phase 3)
 → Dashboards + Lifecycle (Phase 4) → Projects/Engineering/Progress/Payments (Phase 5)
 → Compliance Rules (Phase 6) → Cost Anomaly + Duplicate Detection (Phase 8)
 → Risk Engine + AI Gateway (Phase 9) → District Decision (Phase 10)
 → Monitoring (Phase 11) → Field Verification Recommendation (Phase 13, inspection-queue portion)
 → Audit (Phase 15, core logging only)
```

Advanced capabilities — deeper agency intelligence (Phase 12), Ministry systemic dashboards (Phase 14), predictive delay models, mobile inspection, local LLM deployment — can follow without changing this core path.

---

# Phase Completion Rule

A phase is complete only when all six exit checks are satisfied:

☐ Requirements completed
☐ Code reviewed
☐ Feature tested
☐ Security/permissions verified where applicable
☐ Documentation/memory updated where applicable
☐ No known blocking issues

A feature that only works locally but has not been tested, reviewed, security-checked, and documented is **not complete**.

---

# Final Execution Principle

> **Build the smallest complete end-to-end government workflow first, then add intelligence to it.**

Do not build isolated AI features with no connection to:

```text
real/project data → government workflow → official decision → audit/history
```

The final product must demonstrate:

> **Data → Historical Memory → AI Analysis → Explainable Risk → Human Decision → Execution → Monitoring → Inspection → Ground Result → Historical Memory**
