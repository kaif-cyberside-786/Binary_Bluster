# rules.md — PROJECT ENGINEERING RULES

**Project:** MPLADS AI Risk Monitoring & Decision Support Platform
These rules keep the project consistent, secure, explainable, and easy for the team (and AI coding agents) to build correctly and quickly. They apply to the React frontend, Node.js/Express backend, Python AI service, n8n workflows, MongoDB data model, documentation, and team collaboration.

Every rule here exists to prevent a specific, real implementation mistake. If a rule doesn't do that, it doesn't belong here.

---

## 1. Purpose

Translate the finalized `prd.md` and `architecture.md` into concrete development constraints, so that a human developer or an AI coding agent can implement features correctly without re-deriving architectural decisions from scratch each time.

## 2. Source of Truth Hierarchy

```
problem_description.md → prd.md → architecture.md → rules.md → implementation
```

`rules.md` never overrides the PRD or architecture. If an implementation need conflicts with either, that is an architecture/PRD discussion (see §21, Scope Control), not a reason to bend a rule.

## 3. Core Engineering Principles

1. **One portal, role-specific workspaces.** Same login; role determines workspace, permissions, and data visibility.
2. **Express is the sole application security boundary.** The frontend is never trusted for permissions.
3. **MongoDB is the centralized source of truth**, with collections separated by domain and connected by shared IDs.
4. **Historical data is never silently overwritten.** New versions are appended, not replaced.
5. **AI flags and recommends; authorized humans decide.** No automated chain ends in sanction, rejection, payment-stop, agency assignment, or inspection order.
6. **n8n automates background workflows only** — never authentication, RBAC, or the synchronous pre-sanction/inspection-decision path.
7. **Real and synthetic data are always distinguishable**, never silently mixed.
8. **Every material action is auditable**, and audit records are append-only.
9. **Security, explainability, and correctness matter more than adding more technology.**

---

## 4. Architecture Rules

Follow the boundaries defined in `architecture.md`. Do not silently change them.

```
React → Express → MongoDB
Express → Python AI Service
Express ↔ n8n (background only)
AI Gateway → Gemini (current) | Ollama (future)
Express → File/Object Storage (documents/evidence)
```

- React must never connect directly to MongoDB, the AI service, or file storage.
- n8n must not write directly to MongoDB; it calls Express through authenticated service credentials.
- Express remains the sole authorization boundary; AI services never mutate application state directly.
- The synchronous pre-sanction review and inspection-decision paths must not depend on n8n or the LLM being available (see §14, Error Handling).
- Binary files belong in object storage; MongoDB stores only metadata/references (`document_id`, `project_id`, `document_type`, `uploader`, `storage_ref`, `uploaded_at`).
- **Do not introduce a vector database or MongoDB Atlas Vector Search for MVP-scale duplicate detection.** Use in-process similarity computation in the Python AI service (per architecture ADR 26.3). Vector search is an explicitly deferred production-scale decision, not a "nice upgrade" to make now.
- Do not introduce microservices, message queues, caching layers, or additional cloud infrastructure the MVP does not need — the architecture is a modular monolith (Express) plus two isolated services (Python AI, n8n) by deliberate choice.

---

## 5. Project Structure

```
frontend/       React UI
backend-node/   API/business logic, auth, RBAC, orchestration
ai-service/     ML/analytics calculations
n8n/            automation workflows
data/           real/ and synthetic/ source data
tests/
docs/           PRD.md, architecture.md, rules.md, decisions/
```

Responsibilities must not be mixed across folders (e.g., no business logic living in `frontend/`, no UI logic in `backend-node/`).

**Naming:**
- IDs: explicit and consistent — `user_id`, `mp_id`, `project_id`, `agency_id`, `inspection_id`, `document_id`, `decision_id`. No vague alternatives (`id1`, `workNo`, `projectRef`) unless an existing external API already requires them.
- Collections: `snake_case` (`mp_allocation`, `project_progress`, `ai_risk_flags`, `audit_logs`).
- API routes: lowercase, noun-oriented (`/api/projects/:id/progress`), never verb-style (`/api/getProject`, `/api/fetch_all_projects`).
- Frontend components: clear, purpose-named (`ProjectRiskPanel`, `InspectionQueue`, `MinistryOverview`).
- Shared utilities, constants, and types live in one designated shared location per app (`frontend/src/utils`, `backend-node/utils`) — do not create a second copy of a utility because it was faster than importing the existing one.
- Environment variables are the only place secrets/config live (see §13).

---

## 6. Frontend Rules

- **Frontend visibility is never authorization.** Hiding a button or route from a role improves UX; it provides zero security. Every protected operation is re-checked server-side regardless of what the UI shows.
- Build reusable components for repeated patterns (risk panel, decision form, status badge, data table) rather than duplicating markup per screen.
- Every screen that fetches data needs an explicit loading state and an explicit error state — never a silent blank screen on failure.
- Form validation happens client-side for UX (immediate feedback) **and** server-side for correctness/security — client-side validation alone is not acceptable for anything that reaches the backend.
- Role-based UI: render only the actions/data relevant to the current role's workspace, but treat this purely as UX — the authorization decision has already been made (or will be re-made) by Express.
- Authentication state: store the access token in memory/short-lived storage, not in a way that's trivially exfiltrable by XSS (see §13 on token storage). On 401, redirect to login; do not attempt to silently retry with a stale token.
- Dashboards differ by role (§18) — do not build one generic dashboard and filter it client-side; request role-scoped data from the backend.
- Keep layouts responsive and usable on the devices district/state officials actually use (assume a mix of desktop and tablet); this is a usability requirement, not a design nice-to-have, since these are working officials, not consumers.

---

## 7. Backend Rules

- All important validation happens in Express: authentication, role, jurisdiction, project ownership/scope, amounts, dates, status transitions, payment values, inspection permissions, document permissions. Never rely on client-side validation alone.
- Keep business logic in services/controllers, not scattered across route handlers — a route handler should orchestrate (validate → call service → respond), not contain the business rule itself.
- Project state may only change through authorized backend operations; the frontend never sets an arbitrary status value directly.
- Use MongoDB transactions for any write that touches money or status across multiple documents (e.g., recording a payment must not leave `fund_utilization` or project status half-updated).
- Background jobs and external service calls (AI service, n8n, Gemini) go through a defined interface, not ad hoc calls scattered through controllers.

---

## 8. API Rules

- Frontend calls only `/api/*`. AI service endpoints (`/ai/*`) are internal-only; the browser must never call them directly unless the architecture explicitly changes and security is re-evaluated.
- Use consistent HTTP status codes — `200/201` success, `400/422` validation, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict, `500` server error. Never return `200` for a failure.
- Consistent response shape across endpoints (success payload vs. `{ error, code }` on failure) — don't invent a new response shape per route.
- Paginate list endpoints; never return an entire collection to the browser.
- Write operations that can be retried (payment creation, recommendation creation, document upload, progress submission, inspection creation) should be idempotent (idempotency key or equivalent) to avoid duplicate records on retry.
- No API versioning scheme is needed at MVP scale — don't add one speculatively.

---

## 9. Database Rules

- MongoDB is the central source of truth; AI results are derived data and must never overwrite a source record (`project_recommendations`, `engineering_reports`, `project_progress`, `project_payments`, `officer_decisions` are all write-once/append-only, never edited in place).
- The primary connector across project-related collections is `project_id`; MP-level records use `mp_id`; agency records use `agency_id`; inspections use `inspection_id`.
- Collection separation is deliberate — do not merge domains for convenience (e.g., do not add AI risk fields into `mp_allocation`, do not store engineering specs inside `project_recommendations`).
- Historical preservation: never overwrite a prior progress update, engineering report version, or the original MP recommendation. Store a new version instead.
- Use schema validation, unique/compound indexes on known query patterns (`project_id + submitted_at`, `project_id + payment_date`), and application-level relationship checks (referenced IDs must exist before a write commits) to compensate for MongoDB's lack of native foreign-key enforcement.
- Every ingested record must carry explicit provenance: `is_real_government_data: true` or `is_synthetic: true`. Never silently mix the two.
- `audit_logs` has no update/delete API for ordinary users — append-only, by design, not by convention.

---

## 10. Authentication & RBAC Rules

- Every protected request re-verifies: identity (JWT signature) → role → jurisdiction → whether the requested entity is inside that jurisdiction's scope → whether the action is allowed for that role. All five checks, every time — not just "is the user logged in."
- Role capabilities (kept in sync with the PRD/architecture role table — do not add capabilities here without updating those documents first):
  - **MP:** recommend, view own works/constituency. Cannot sanction own recommendation, alter AI findings, or edit District decisions.
  - **District Authority:** review, sanction, hold, request clarification, request inspection, escalate, view jurisdiction-scoped risk.
  - **Engineer/Agency:** submit technical reports, progress, payments, completion info, respond to clarification. Cannot sanction, modify AI results, or inspect their own project.
  - **State Authority:** monitor state, prioritize/assign inspections, review escalations, view state-level risk and agency concentration.
  - **Ministry:** view national/systemic patterns, policy insight, supervision, accountability. Does not get automatic per-project sanction authority.
  - **Auditor:** read-only across AI findings, decisions, inspections, audit logs.
  - **Admin:** manages users/config/operational health only. **Does not** automatically get access to risk content, officer decisions, or audit content — system administration must never become an audit bypass.
- Never trust frontend role-based hiding as the actual permission check — it is UX only (§6).
- Token/session handling: short-lived access tokens, refresh-token rotation, and store tokens in a way that limits XSS exposure (prefer httpOnly cookie for the refresh token where the deployment supports it; if an access token is held client-side, keep its lifetime short). Do not persist tokens indefinitely in plain localStorage without weighing this trade-off explicitly.

---

## 11. Government Data & Audit Rules

- Every material state-changing action must be traceable to **who → what → when → previous state → new state**: project creation, recommendation submission, engineering submission, progress update, payment action, status change, officer decision, inspection assignment/result, document upload, AI analysis generation, and any manual override/false-positive outcome.
- Distinguish `AI_ANALYSIS_COMPLETED` (a system event) from `OFFICER_SENT_FOR_INSPECTION` (a human decision) — AI activity is never logged or displayed as if it were a decision.
- No normal user, including Admin, can update or delete an audit record.
- Compliance checks (SC/ST quota, timeline norms, eligibility, utilization-certificate status) are deterministic rules, not AI — implement them as explicit, auditable logic, not model inference.

---

## 12. AI/ML Rules

**What AI can do:** identify anomalies, find similar historical works, compare structured information, produce risk signals, summarize findings, explain risk signals, generate clarification questions, provide agency-suitability recommendations (with the concentration guardrail below), recommend field verification, support trend/pattern analysis.

**What AI cannot do:** declare fraud, determine guilt, sanction, reject, stop payments, automatically assign an agency, or autonomously order inspection/enforcement.

- Correct output framing: *"Potential anomaly detected. Review recommended."* / *"Ground verification recommended."* Never: *"Fraud confirmed."* / *"Raid required."*
- **Numeric calculations are deterministic, not LLM-generated.** Peer-median deviation, similarity scores, and compliance percentages are computed by Python/backend logic; the LLM explains an already-computed number, never calculates one.
- **AI Input Rule:** the LLM receives only the minimum structured, de-identified evidence needed to explain a result (e.g., `{proposed_cost, peer_median_cost, cost_deviation_percent, duplicate_similarity}`) — never raw applicant/agency PII, never full documents, and never direct database or file-storage access. This is required, not optional, for a government financial system (architecture §15.5).
- **Do not hard-code AI outputs.** Every risk score/flag shown in the demo or in production must come from actually running the defined AI pipeline against real or planted-synthetic input — never a value written directly into the UI or a mocked response standing in for the pipeline, even under demo time pressure. Planted synthetic *input data* is fine and expected (§4/§9 provenance rules); a faked *output* is not.
- **AI failure must not silently become a safe result.** On failure, set `AI_STATUS = UNAVAILABLE` or `PENDING` and still display the deterministic information available — never let a failed call default to "low risk."
- Every AI result must answer: what was detected, compared with what, why, how strong the signal is, and what the official should consider — no bare scores.
- Agency suitability and agency concentration are separate signals — do not merge them, and do not let a suitability recommendation repeatedly reinforce the same agency without checking it against concentration first.
- Store AI result provenance (`provider`, `model/version`, `analysis_version`, `timestamp`, `input reference IDs`) so results are comparable across model changes and reviewable later.
- When an officer reviews an AI finding, record the outcome (`false_positive`, `confirmed_for_review`, `inspection_result`, etc.) for future threshold tuning — never use one officer action to silently auto-retrain a production model.
- Gemini is the current LLM provider, accessed only through the AI Gateway — never couple business logic directly to a Gemini-specific API, so a future move to Ollama/local models doesn't require touching frontend or core business logic. Do not claim the prototype is "fully local" while Gemini is in use — document it accurately.

---

## 13. Security Rules

- Never commit secrets: passwords, API keys (including `GEMINI_API_KEY`), JWT secrets, database URIs, n8n service tokens/webhook secrets. Commit `.env.example` only, never `.env`.
- Never place any of the above in frontend code.
- Sanitize/validate all user input server-side, including against MongoDB operator injection (e.g., reject or strip `$`-prefixed keys from user-supplied query/update objects) — NoSQL injection is a real risk with a document database accepting JSON input directly.
- File uploads: allowlist type (PDF/JPEG/PNG for MVP) and size; never serve files from a public bucket URL — every fetch goes through an authorized Express endpoint; every upload/fetch is audit-logged.
- Rate-limit authentication and other sensitive endpoints; enforce login lockout after repeated failures; use server-side CAPTCHA on login.
- Token storage per §10; treat XSS prevention (output encoding, no unsanitized HTML injection) as a baseline frontend requirement given tokens are involved.
- Dependency security: check that a new package is maintained and doesn't introduce known vulnerabilities before adding it (see §19).
- Never log passwords, tokens, API keys, or full financial account details, even at debug level.

---

## 14. Error Handling Rules

| Situation | Bad | Better |
|---|---|---|
| Validation failure | "Something went wrong" | "Please enter a valid project cost." |
| Auth failure | Error 500 | "Incorrect User ID or password." |
| Authorization failure | "Not allowed" | "You do not have permission to access this project." |
| AI unavailable | Silently shows Risk = LOW | "AI analysis is temporarily unavailable. Structured project information is still shown." |
| Missing data | AI proceeds anyway | "Required project information is missing; risk analysis is pending." |
| DB unavailable | Partial write | Fails fast, no partial state (use transactions for multi-document writes) |
| Duplicate submission | Silently rejected | Surfaced as a duplicate-detection flag for human review, not a hard block |

- Never expose stack traces, internal paths, or secrets to the end user; log the detail server-side, return a safe message client-side.
- The decision path (sanction review, inspection decision) must never be blocked by an AI or n8n failure — degrade to deterministic information only, per §12.

---

## 15. Logging & Monitoring Rules

**Application logs** (operational/debugging — request latency, error rates, failed logins, DB errors, AI-service latency/failures, n8n workflow success/failure) are **not the same thing** as **audit logs** (who/what/when/prev-state/new-state for material business actions, §11). Do not conflate the two: an application log rotates/expires and is for debugging; an audit log is permanent and is for accountability.

- Log: errors, important business events (sanction, inspection assignment, escalation), authentication events, AI processing outcomes (success/failure, not full evidence payloads), external integration failures.
- Do not log: passwords, tokens, API keys, full financial account numbers, or raw LLM prompts/responses containing anything beyond the already-minimized structured evidence.
- AI-service and n8n observability (latency, failure rate, retry count) is an application-log concern; it does not belong in `audit_logs`.

---

## 16. File & Document Rules

- Binary files (utilization certificates, inspection photos, sanction orders, evidence) live in object storage; MongoDB stores metadata only (§4, §9).
- Allowed types for MVP: PDF, JPEG, PNG, with a size limit enforced server-side.
- Malware/virus scanning is a stated **production** requirement, not an MVP blocker — MVP relies on type/size validation plus authenticated-fetch-only access; do not claim more than that is implemented.
- Files are never publicly accessible by default; every download passes through Express authorization; every upload and authorized fetch is auditable (§11).
- Document lifecycle: uploads are append-only (a corrected UC is a new upload referencing the same payment, not an overwrite of the prior file).

---

## 17. Testing Rules

Focus on critical functionality, not 100% coverage.

- **Unit tests:** cost-anomaly calculation, duplicate-similarity scoring, engineering-comparison diffing, payment/progress mismatch logic, SC/ST and UC compliance rules.
- **Integration tests:** project creation → AI analysis; engineering report → comparison; progress update → monitoring; risk → notification; risk → inspection queue; decision → audit record.
- **End-to-end tests:** the critical user journeys — MP recommends → District reviews AI evidence → District decides → Agency executes → risk changes → State inspects → result recorded.
- **Security tests:** authentication, RBAC/jurisdiction enforcement, and that Admin cannot read risk/audit content.
- **AI failure-mode tests:** confirm `AI_STATUS = UNAVAILABLE`/`PENDING` never silently becomes a low-risk result.
- **AI evaluation:** report against a labeled/planted synthetic dataset (cases tested, true detections, false positives, false negatives, threshold used) — never claim an accuracy figure without a defined test set and method.

---

## 18. Git & Collaboration Rules

- Focused commits with clear messages (`feat: add engineering report comparison`, `fix: enforce district project authorization`) — not `update`, `final`, `final2`.
- One feature/fix per pull request; no unrelated changes bundled in.
- Code review checklist: naming conventions followed, no secrets, validation exists, role permissions enforced, errors handled, tests added where practical, docs updated if behavior changed, and — the one architecture-specific question — *does this change respect the architecture boundaries in §4?*
- Update `docs/PRD.md`, `docs/architecture.md`, `docs/rules.md`, or `docs/decisions/` whenever architecture, database relationships, roles, APIs, AI models, or n8n workflows change.

---

## 19. Dependency Management

Before adding a package, answer:
1. Does the current stack already solve this?
2. Is it actively maintained and trusted?
3. Does it add meaningful value proportional to its complexity?
4. Is it compatible with the architecture (§4) — e.g., does it require infrastructure the MVP doesn't need?

Do not add a dependency because it's popular. Do not add a vector database, message queue, or caching layer speculatively (§4).

---

## 20. AI Coding Agent Rules

These rules apply specifically to AI coding agents (e.g., Claude Code) working on this codebase, in addition to everything above.

**Before changing code:**
- Inspect the existing implementation of the relevant area before writing anything new.
- Re-read the relevant section(s) of `prd.md` and `architecture.md` for the feature in question.
- Reuse existing patterns, components, and utilities rather than creating parallel ones.

**When implementing a feature:**
- Verify the feature exists in the PRD (§21, Scope Control) before building it.
- Follow the architecture's component boundaries (§4) and existing project conventions (§5).
- Implement the smallest correct change that satisfies the requirement — not the most general or most extensible version of it.

**When an implementation need conflicts with the architecture:**
- Do **not** silently change the architecture or introduce a new service/technology to make it easier.
- Identify the conflict explicitly, explain it, propose the specific change needed, and wait for approval before proceeding, per §21.

**Avoid, always:**
- Unnecessary refactoring of unrelated code.
- Duplicate utilities or components where an existing one already does the job.
- Random/unjustified new dependencies (§19).
- Hard-coded values where configuration or computed values belong (and never hard-coded AI outputs, §12).
- Fake/mock logic left in a production code path (test doubles belong in tests only).
- Bypassing authorization checks "temporarily."
- Skipping error handling to move faster.
- Overengineering — building for a scale or flexibility need the PRD/architecture doesn't state.

---

## 21. Scope Control

Every feature should trace to **Problem → PRD → Architecture**. If a feature or enhancement doesn't clearly trace to one of those documents:
- Do not silently implement it.
- Note it as a possible future enhancement (and where it would fit — MVP Phase 5 or Future Scope) rather than building it now.
- If it seems genuinely necessary despite not being in scope, raise it as a documentation gap (§20's conflict-resolution flow) rather than quietly adding it.

This applies equally to "nice to have while I'm in this file" additions and to entire new features.

---

## 22. MVP vs. Production

**Build now (MVP/SIH):** landing → login → RBAC → MongoDB core → projects → cost-anomaly + duplicate detection (in-process similarity) → explainable risk engine → District/State dashboards → SC/ST + timeline + UC compliance rules → inspection queue tied to the 1% mandate → audit trail → n8n for background monitoring only.

**Defer to production:** Atlas Vector Search (or a dedicated vector DB) once corpus size justifies it, local/offline LLM as the data-sovereignty default, mobile field-inspection app, fund-utilization forecasting, live eSAKSHI integration, horizontally-scaled service deployment.

**Never build, at any stage of this project:** blockchain, a generic chatbot bolted on for its own sake, autonomous AI sanction/rejection/payment-stop/agency-assignment, or an LLM-based eligibility classifier replacing the deterministic picklist.

Do not force production-scale complexity into the prototype; do not take a shortcut that makes the prototype fundamentally incompatible with the architecture it's supposed to demonstrate (e.g., don't hard-code a role check that would need to be rewritten, not extended, for a second role).

---

## 23. Code Quality

- Prioritize readability and honest naming over cleverness.
- Type/validate inputs at every boundary (API request bodies, AI-service responses, environment variables).
- Comments explain intent, reasoning, or non-obvious constraints — not what the code already visibly does. `// increment counter` above `counter++` is noise; `// retry once because the AI service occasionally times out on cold start` earns its place.
- Avoid duplication of logic across the frontend, backend, and AI service — if a calculation needs to exist in two places, that's a signal something belongs in a shared location instead.

---

## 24. Definition of Done

A feature is not done because the UI works. It is done when:

- [ ] It corresponds to an actual PRD requirement (or an approved, documented exception per §21).
- [ ] It follows the architecture's component boundaries (§4) — no bypassed layers, no new services introduced without a documented decision.
- [ ] Server-side validation and authorization are implemented (never validation/authorization in the frontend alone).
- [ ] Error and failure states are handled per §14 (including AI/n8n unavailability where relevant).
- [ ] Required audit events are recorded (§11).
- [ ] Tests are added where practical (§17), covering at least the critical path.
- [ ] No secrets are committed (§13).
- [ ] No unnecessary dependencies were introduced (§19).
- [ ] No unrelated code was changed in the same commit/PR (§18).
- [ ] Documentation is updated if architecture, roles, APIs, or AI behavior changed (§18).
- [ ] Historical/source records were not overwritten, and real/synthetic data provenance is intact (§9).

---

## 25. Final Project Rules

The whole team (and every AI coding agent) should be able to recite these from memory:

1. One portal, role-specific workspaces.
2. Express controls access and business logic.
3. MongoDB is the centralized source of truth; AI results are derived, never overwrite source data.
4. Separate collections, connected through IDs.
5. Historical data is never silently overwritten.
6. Python performs analytical AI/ML; the LLM only explains already-computed evidence.
7. Gemini is the current provider behind an AI Gateway that supports a future local model — and only de-identified structured evidence ever reaches it.
8. n8n automates background workflows, never core authorization or transactional decisions.
9. AI flags and recommends; authorized humans decide — and AI outputs are never hard-coded.
10. An anomaly is not automatically fraud.
11. Field verification is recommended by AI, never autonomously ordered.
12. Agency suitability is advisory and must be checked against concentration.
13. Real and synthetic data are always distinguishable.
14. Every material action is auditable, and audit logs are append-only.
15. Vector search, microservices, and extra cloud infrastructure are deferred until the architecture says the MVP actually needs them.
16. Security, explainability, and correctness matter more than adding more technology.
