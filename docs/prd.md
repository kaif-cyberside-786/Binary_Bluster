# MPLADS AI Risk Monitoring & Decision Support Platform — PRD (Revised)

**Problem Statement ID:** 26102
**Organization:** Ministry of Statistics & Programme Implementation (MoSPI)
**Department:** Data Informatics & Innovation Division (DIID)
**Category:** Software
**Theme:** Smart Automation
**Revision note:** This version corrects gaps identified against the source problem statement — see the Traceability Matrix (§25) and Changelog (§26).

---

## 1. Product Overview

A unified MPLADS portal that adds an AI-powered monitoring and decision-support layer over the existing MPLADS sanction/execution workflow. It does not replace eSAKSHI, does not sanction, reject, or stop payments, and does not decide guilt. It compares each new and ongoing work against historical and peer records, surfaces explainable risk signals, and routes the government's own **mandated 1% annual physical inspection quota** toward the highest-risk works instead of a near-random sample.

> **MP recommends → District Authority reviews with AI assistance → work is sanctioned → implementing agency executes → system monitors continuously → AI/rules detect unusual patterns → the mandated 1% inspection quota is risk-ranked → authorities review/inspect → results become historical intelligence for future comparisons.**

Core principle: **AI identifies what deserves attention. Humans decide what to do about it.**

---

## 2. Problem Statement

MPLADS moves ₹5 crore per MP per year toward locally-recommended development works, executed through District Authorities and Implementing Agencies, now digitized end-to-end on the eSAKSHI portal (live since April 2023). Digitization has not produced analysis: no one is systematically comparing the resulting lakhs of work records against each other to catch inflated cost estimates, duplicate/overlapping works, stalled projects, missing utilization certificates, or agency concentration patterns. Historically, these issues (documented by CAG in 2001 and 2011) surface only in periodic post-hoc audits, after the money is spent and corrective action is far harder than prevention would have been.

**Root cause:** information asymmetry at scale — the comparison data exists somewhere in the system, but no one is computationally comparing records against each other.

---

## 3. Problem Context

- Every MP (Lok Sabha or Rajya Sabha) recommends works to a District Authority (District Collector), which scrutinizes, prices, sanctions, and selects an Implementing Agency.
- Funds flow MoSPI → District Authority in two ₹2.5 crore installments/year, subject to unspent-balance checks.
- Guidelines mandate: SC-majority areas get ≥15% of annual entitlement recommended, ST-majority areas ≥7.5%; works should generally complete within ~1 year; States must physically inspect **at least 1% of works annually** and commission third-party audits for high-value works; unspent balances require follow-up including utilization certificates.
- CAG audits (2001, 2011) found: inflated cost estimates, ineligible works, unrefunded/unspent balances, and missing utilization certificates (₹161 crore of works in one finding).
- What's technological here: aggregation and pattern detection across records (outlier costs, duplicate detection, delay/staleness, agency concentration). What's not: who has authority to sanction, who investigates a flag, what counts as an eligible work — these remain human/administrative decisions. **AI's job is to point, not to punish.**

---

## 4. Goals

1. Surface cost-estimate anomalies at the point of sanction, before money moves.
2. Detect duplicate/overlapping works before a second payment is released for the same underlying asset.
3. Turn the existing mandated 1% physical-inspection quota into a risk-ranked 1%, using the same inspection budget more effectively.
4. Track SC/ST quota compliance and timeline norms continuously (not just at year-end) as deterministic rules.
5. Track utilization-certificate compliance to close the specific CAG-identified gap.
6. Surface agency/vendor concentration patterns for State/Ministry review.
7. Keep every AI output explainable and advisory; every material decision remains with a named human authority, logged.

## 5. Non-Goals

- Not a replacement for MPLADS/eSAKSHI, and not a live integration with the production eSAKSHI system (no access/authorization for a prototype).
- Not an autonomous fraud detector, investigator, or enforcement system — no auto-sanction, auto-rejection, or auto-payment-stoppage.
- Not a public citizen-facing transparency portal for this phase (explicitly deferred — see §21).
- Not a blockchain system, a generic chatbot, or a Kubernetes-scale deployment for the prototype.
- Not an LLM-based eligibility classifier (hallucination risk on a compliance-critical rule) — eligibility stays a rule-based picklist.

---

## 6. Target Users

| Role | Primary Responsibility |
|---|---|
| **MP** | Recommend works, monitor own constituency |
| **District Authority** | Scrutinize recommendations, review AI evidence, make the sanction decision |
| **Engineer / Implementing Agency** | Submit technical details, execute work, report progress/payments/completion |
| **State Nodal Authority** | Supervise implementation, review risk, allocate the mandated inspection quota |
| **Ministry / DIID** | Policy decisions, national supervision, accountability |
| **Auditor (incl. CAG-facing)** | Review historical records, decisions, inspections, and the audit trail |
| **Admin** *(platform-operational, not an MPLADS stakeholder)* | Users, configuration, system administration |

Out of scope for MVP: a citizen/public-facing view (secondary stakeholder in the source problem; deferred to Future Scope per §21).

---

## 7. User Roles & Permissions

### MP
Can: recommend work; view own recommendations, allocation, expenditure, progress, completed/pending works, attention items, and own SC/ST quota compliance status.
Cannot: sanction own recommendation or override administrative authority.

### District Authority — primary pre-sanction AI user
Can: review recommendations; view historical/duplicate matches; view cost benchmark; view engineering comparison; view SC/ST-quota and timeline compliance status; view agency suitability signal; approve/sanction, hold, request clarification, send for inspection, escalate.

### Engineer / Implementing Agency
Can: submit engineering report; update progress, payments, completion; upload utilization certificates and other evidence; respond to clarification requests.

### State Nodal Authority
Can: see state-wide risk-ranked work list; allocate the mandated 1% inspection quota against that ranking; assign inspections; review escalated cases; view agency concentration analytics; monitor systemic patterns.

### Ministry (DIID)
Three responsibilities: **Policy** (use aggregated evidence for guideline/process improvement), **Supervision** (national/state/district trend, utilization, completion, risk, inspection dashboards), **Accountability** (unresolved high-risk cases, escalations, inspection outcomes, decisions, audit history).

### Auditor
Can: view AI findings, risk history, decisions, inspections, status history, and the complete audit trail (read-only).

### Admin
Can: manage users, roles, and system configuration. Cannot view or alter risk scores, decisions, or audit content.

---

## 8. Current Workflow

MP recommends → District Authority scrutinizes and sanctions, selecting an Implementing Agency → funds released in two installments, subject to unspent-balance checks → Implementing Agency executes and raises payment requests, updates progress, eventually marks complete → State Nodal Department supervises, physically inspects ≥1% of works/year (today, essentially at random), commissions third-party audits for high-value works → MoSPI monitors fund flow nationally and coordinates periodic CAG audits (historically ~once a decade) — the point where most irregularities have surfaced, years after the money was spent.

## 9. Proposed Workflow

```text
MP RECOMMENDS
      ↓
DISTRICT AUTHORITY RECEIVES
      ↓
AI-ASSISTED PRE-SANCTION REVIEW (synchronous, real-time)
      ├── Historical Similarity / Duplicate Check
      ├── Cost Anomaly (peer-group benchmark)
      ├── Engineering Specification Comparison
      ├── SC/ST Quota & Timeline Compliance (rule-based)
      └── Agency Suitability (advisory)
      ↓
EXPLAINABLE RISK SCORE + REASON
      ↓
DISTRICT HUMAN DECISION
      ├── Approve/Sanction  ├── Hold  ├── Clarification  ├── Inspection  ├── Escalate
      ↓
IMPLEMENTING AGENCY EXECUTES
      ├── Progress updates  ├── Payments  ├── Utilization Certificates  ├── Completion
      ↓
CONTINUOUS MONITORING (scheduled + event-driven)
      ↓
AI / RULE ANALYSIS (delay/staleness, payment-progress mismatch, UC compliance)
      ↓
FIELD VERIFICATION RECOMMENDATION
      ↓
RISK-RANKED AGAINST THE MANDATED 1% ANNUAL INSPECTION QUOTA
      ↓
STATE AUTHORITY ASSIGNS INSPECTION
      ↓
GROUND RESULT LOGGED
      ↓
AUDIT + HISTORICAL MEMORY
      ↓
FEEDS FUTURE AI COMPARISON (peer benchmarks, duplicate corpus, agency track record)
```

---

## 10. Solution Overview

The platform reads the same sanction/cost/payment/progress data as it's entered and, without changing who has legal authority to approve or reject, injects explainable risk signals at the moment of sanction and continuously during execution. Its single clearest, most demoable claim: **the state's existing, legally-mandated 1% physical inspection requirement is picked almost at random today; this platform makes it risk-ranked instead — same inspection budget, better targeting.**

---

## 11. Core Features

**Must Have (MVP)**
- Sanction entry/review flow with real-time AI risk panel
- Cost-Estimate Anomaly Detection
- Historical Duplicate/Overlap Detection
- Explainable Risk-Score Aggregation (interpretable model or weighted sum — never a black box)
- Risk-ranked Inspection Prioritization, explicitly tied to the statutory 1% inspection quota
- SC/ST Quota & Timeline Compliance tracking (deterministic rules)
- Role-based auth (MP/District/State/Ministry/Agency/Auditor/Admin), RBAC, audit trail
- District & State dashboards

**Should Have**
- Engineering Specification Comparison (recommendation vs. engineer report vs. completion)
- Payment/Progress Consistency check
- Utilization Certificate compliance tracking
- Agency/Vendor Concentration Analytics (district/state, per year)
- Ministry national dashboard with trend charts
- MP constituency view
- Notification on new high-risk flag

**Could Have**
- Delay/staleness *prediction* (ML, beyond the simple staleness rule) — only if enough historical outcome data exists
- Agency Suitability recommendation (advisory only, with an explicit guardrail against reinforcing concentration)
- Fund-utilization forecasting (simple time-series projection)
- Local/offline LLM (Ollama) as a Gemini alternative
- Mobile field-inspection interface (GPS, photos, checklist)

**Out of Scope (this prototype)**
- Live eSAKSHI integration (no access/authorization)
- Public/citizen transparency portal
- Blockchain, generic chatbot, Kubernetes-scale infra
- LLM-based eligibility/category classification
- Any automatic sanction, rejection, payment-stoppage, or agency-selection action

---

## 12. AI/ML Features

Every feature below states why AI (vs. plain rules) is justified, per the source problem statement's explicit instruction to avoid "AI for AI's sake."

### 12.1 Cost-Estimate Anomaly Detection — 🟢 Must Have
- **Problem:** inflated/unrealistic cost estimates go through unchecked because no one benchmarks against peer works.
- **Input:** work category, specification/quantity, sanctioned cost, district/region, date.
- **Technique:** peer-group statistical outlier detection (robust z-score / IQR / Isolation Forest where warranted) within category+region peer groups.
- **Output:** anomaly score + explanation ("+X% vs. category median for comparable specification").
- **Why AI over a fixed rule:** a flat threshold can't account for category, region, and material-price variation; peer-group comparison adapts automatically.
- **Users:** District Authority (pre-sanction), State (review).

### 12.2 Historical Duplicate/Overlap Detection — 🟢 Must Have
- **Problem:** the same underlying asset gets sanctioned twice under different wording/agency.
- **Input:** work description text, location/ward/GPS, category, dates.
- **Technique:** text-similarity (TF-IDF or sentence embeddings) + geo/ward proximity matching.
- **Output:** ranked list of likely-duplicate pairs with similarity score.
- **Why AI over exact-match rules:** free-text descriptions vary in wording for the same asset; exact-match would miss most real duplicates.
- **Users:** District Authority (pre-sanction), State (review).

### 12.3 Explainable Risk-Score Aggregation & Inspection Ranking — 🟢 Must Have
- **Problem:** only 1% of works get physically inspected, chosen without risk information.
- **Input:** outputs of 12.1, 12.2, 12.4, 12.5, and rule-engine flags.
- **Technique:** a weighted sum or a shallow interpretable model (e.g., logistic regression / gradient-boosted trees with SHAP explanations). **Deep/black-box models are explicitly excluded here** — explainability to a non-technical district official is the priority.
- **Output:** ranked "top-N works to inspect" list sized against the state's actual mandated 1% quota, with a comparison metric (risk-ranked hit-rate vs. a random-sample baseline on planted anomalies, for demo purposes).
- **Users:** State Nodal Authority (allocates inspection quota), Ministry (national view).

### 12.4 Engineering Specification Comparison — 🟡 Should Have
- **Problem:** technical submissions can materially deviate from what was recommended and sanctioned, changing cost-per-unit without anyone noticing.
- **Input:** MP recommendation specs vs. engineer report vs. completion report (length/width/quantity/material/cost).
- **Technique:** deterministic diffing + anomaly threshold on cost-per-unit deviation.
- **Output:** flagged deviation with side-by-side comparison.
- **Users:** District Authority, Auditor.

### 12.5 Payment/Progress Consistency Check — 🟡 Should Have
- **Problem:** financial progress (money paid) can outrun or misalign with physical progress (work actually done).
- **Input:** reported physical-progress %, payment-utilization %, timeline elapsed.
- **Technique:** rule-based threshold + optional simple statistical model if enough historical outcome data exists.
- **Output:** mismatch flag with the two percentages and the gap.
- **Users:** District/State Authority.

### 12.6 Delay/Staleness Detection — 🟡 Should Have (rule) / 🟢 Could Have (ML upgrade)
- **Base rule (not AI):** `days_since_last_update > threshold` given elapsed time vs. expected ~1-year duration.
- **Optional ML upgrade** (only with sufficient historical outcome data): a delay-risk classifier using agency track record, category, season, district as features.
- **Users:** District/State Authority.

### 12.7 Agency/Vendor Concentration Analytics — 🟡 Should Have
- **Problem:** a small set of agencies can absorb a disproportionate share of work value in a district without anyone noticing (Example: 40% of works to 3 contractors).
- **Input:** agency ID, work value, district, year.
- **Technique:** aggregation + concentration metric (Herfindahl-style share). This is analytics/statistics, explicitly **not deep-learning AI** — labeled as such to avoid AI-washing, matching the source's own framing.
- **Output:** concentration score per district/state/year, flagged above a statistical threshold.
- **Users:** State Nodal Authority, Ministry.

### 12.8 Implementing-Agency Suitability (advisory) — 🔵 Could Have
- **Problem:** District Authorities lack visibility into which eligible agency has the best track record for a given work type/scale.
- **Input:** agency completion rate, delay history, cost-deviation history, inspection outcomes, category experience.
- **Technique:** simple scoring/ranking model.
- **Output:** ranked suggestion (e.g., "PWD: 91, Panchayat: 74") — **advisory only**; District Authority makes the final selection.
- **Guardrail:** the recommendation must not be allowed to systematically concentrate future work on the same top-ranked agency — cap or flag repeated top-recommendations to the same agency, so this feature doesn't itself create the concentration pattern flagged in 12.7.

### 12.9 SC/ST Quota & Timeline Compliance — 🔴 Deterministic rule, not AI
- Rule: MPs' cumulative annual recommendations must reach ≥15% toward SC-majority areas and ≥7.5% toward ST-majority areas; works should generally complete within the guideline norm (~1 year).
- Tracked continuously (not reconciled only at year-end), on the MP and District dashboards.
- **Why not AI:** this is fixed-percentage/date arithmetic; encoding it as ML would be both wasteful and less auditable.

### 12.10 Utilization Certificate Compliance — 🔴 Deterministic rule, not AI
- Rule: flag any work with disbursed funds and no utilization certificate filed within the expected window.
- Directly closes the CAG-documented gap (₹161 crore of works with missing UCs, 2001 finding).

**Explicitly not built:** LLM-based auto-classification of "eligible work category" (hallucination risk on a compliance-critical decision; handled instead as a rule-based picklist at data entry).

---

## 13. Functional Requirements

- Sanction entry form triggers a synchronous AI risk check before the District Authority can record a decision.
- Every risk flag must display: what was detected, what it was compared against, why (contributing signals), how strong (score/similarity/confidence), and a recommendation — never a bare number.
- District/State/Ministry/MP/Agency/Auditor each get a role-specific dashboard (see §16, Solution Overview retained from prior draft, unchanged).
- Officer decisions (approve/hold/clarify/inspect/escalate) are mandatory before a sanction can proceed past AI-flagged review; each decision is logged with reason and prior/new state.
- Data-quality checks run before any record enters AI analysis; malformed records get a visible data-quality flag, never a silent pass-through into a model.

## 14. Non-Functional Requirements

- Every AI-influenced decision path must remain human-terminated: no auto-sanction, auto-rejection, or auto-payment-stoppage.
- Explainability is a hard requirement for the risk-aggregation model (§12.3) — interpretable methods only.
- Role separation must be enforced server-side (backend is the authorization boundary; the frontend is never trusted for permissions).
- The architecture should not require the LLM provider (Gemini) for any numeric calculation — the analytics/rules engine computes; the LLM only explains.
- The system must clearly and permanently distinguish real government-sourced data from synthetic/demo data (see §17) — never silently mixed.

## 15. Data Requirements

Core entities (adapted from the existing MongoDB-oriented model, corrected):

- `users`, `mp_allocation`, `fund_utilization`, `work_completion`, `completion_rates`
- `projects`, `project_recommendations`, `engineering_reports`, `project_progress`, `project_payments`
- `utilization_certificates` *(new — closes the CAG gap; linked to project_payments)*
- `sc_st_area_reference` *(new — static reference data: SC/ST-majority classification per constituency/ward, needed for the quota rule)*
- `implementing_agencies`, `agency_performance`
- `agency_concentration` *(new — derived/materialized view: work-value share per agency per district/year)*
- `ai_risk_flags`, `ai_risk_scores`, `ai_analysis_history`
- MP-level attention indicators — implemented as a **derived/materialized view** over `ai_risk_scores` + `work_completion` (not an independently-maintained collection, to avoid a second source of truth)
- `inspections`, `officer_decisions`, `notifications`, `audit_logs`

Data source, validation, and consumption per entity should follow the existing "real vs. synthetic" discipline (§17) and be connected via shared identifiers (`mp_id`, `project_id`, `agency_id`, `inspection_id`, `user_id`).

## 16. Data Flow

Sanction entry → data-quality check → rule engine (SC/ST quota, timeline, eligibility) → AI engine (cost anomaly, duplicate check, engineering comparison) → explainable risk score attached → District/State human review → decision recorded → status update → dashboards refresh → on execution, progress/payment/UC updates re-trigger monitoring → delay/mismatch/UC-compliance checks → field-verification recommendation → ranked against the state's 1% inspection quota → inspection outcome logged → feeds historical memory for future peer-group comparisons.

## 17. Real vs. Synthetic Data

Unchanged from the prior draft — this was a strength of the original PRD and is preserved:
- **Real:** available government-source data (allocation CSV, any available MPLADS-derived project/performance data), tagged `is_real_government_data: true`.
- **Synthetic:** used only for controlled SIH demonstration (planted inflated-cost case, repeat/overlap case, delay case, engineering-deviation case, payment/progress-mismatch case, UC-missing case), tagged `is_synthetic: true`.
- Never silently mixed.

## 18. Validation & Verification

Deterministic pre-AI validation: missing amounts, duplicate project IDs, duplicate constituency records, invalid location, missing dates, inconsistent status, invalid financial values. Bad data produces a visible data-quality flag, never a silent pass into AI scoring.

## 19. Approval Workflow

MP recommends → District Authority reviews AI evidence → District decides (Approve / Hold / Clarification / Inspection / Escalate) → decision + reason logged → on approval, Implementing Agency executes → completion requires progress, final payment, and utilization certificate before a work is marked fully closed. AI never substitutes for this chain at any step.

## 20. Notifications

Event-triggered (in-app + optional email) on: new high-risk flag, SC/ST quota threshold approaching/breached, overdue utilization certificate, stale/delayed work crossing threshold, inspection assignment, escalation.

## 21. Monitoring & Tracking

Continuous, event-driven (on new data) and scheduled (periodic scan of active works) monitoring for delay/staleness, payment-progress mismatch, and UC compliance. Systemic aggregation rolls project-level findings up to district → state → national patterns (e.g., road costs trending up across districts, delays increasing in a state, recurring UC non-compliance, agency concentration trends) for Ministry-level policy use.

*Citizen/public transparency view: explicitly deferred to Future Scope — not built in this phase, consistent with keeping the MVP tight.*

## 22. Reporting & Analytics

Role-specific dashboards (MP, District, State, Ministry, Agency, Auditor) as previously specified, each fed by the same underlying data with different aggregation/detail level. Ministry dashboard adds national trend charts (cost trend by category/region, delay trend by state) and an export path for CAG-style review.

## 23. Audit Trail

Append-only log of every sanction, flag, decision, and inspection action (user, role, action, entity, timestamp, reason, old/new state). Auditor role has read-only access to the complete trail. This is not AI — it must be a complete, tamper-evident record.

## 24. Security & Access Control

bcrypt password hashing, JWT + refresh tokens, server-side CAPTCHA, failed-login tracking and lockout, rate limiting, RBAC enforced server-side, secure secrets management, input validation, complete audit logging. Backend (not frontend) is the sole authorization boundary. Encryption at rest/in transit, government SSO integration, and formal backup/recovery are described in the architecture but not over-engineered for a hackathon prototype.

## 25. Problem → Solution Traceability Matrix

| Problem / Pain Point | Root Cause | Proposed Solution | Feature | User | Expected Impact |
|---|---|---|---|---|---|
| Inflated cost estimates go undetected | No cross-record cost comparison at sanction time | Peer-group cost benchmarking | Cost-Estimate Anomaly Detection (§12.1) | District Authority, State | Overpriced sanctions flagged before/at approval |
| Same asset double-funded under different wording | No text/geo cross-check before sanctioning | NLP + geo-proximity matching | Duplicate/Overlap Detection (§12.2) | District Authority, State | Duplicates caught before second payment |
| Only 1% of works inspected, chosen near-randomly | No risk information available to prioritize limited inspection capacity | Explainable weighted risk score feeding the existing 1% mandate | Risk-Score Aggregation & Inspection Ranking (§12.3) | State Nodal Authority | Same inspection budget targeted at highest-risk works |
| Technical submissions silently deviate from what was recommended | No systematic comparison across the recommendation→engineering→completion chain | Spec-diff comparison | Engineering Specification Comparison (§12.4) | District Authority, Auditor | Material deviations surfaced for review |
| Payment pace outruns physical progress | No systematic cross-check of the two data streams | Progress/payment consistency check | Payment/Progress Consistency (§12.5) | District/State Authority | Early flag on possible ground-truth mismatch |
| Funds silently locked in stalled works for years | No systematic "days since last update" tracking surfaced to decision-makers | Staleness rule + optional delay-risk model | Delay/Staleness Detection (§12.6) | District/State Authority | Early corrective action while still possible |
| Favoritism/cartelization in agency selection goes unexamined | No aggregation of "who got how much work" across years | Concentration-index analytics | Agency Concentration Analytics (§12.7) | State Authority, Ministry | Concentration patterns surfaced for human review |
| SC/ST quota compliance reconciled only at year-end | No continuous tracking against the guideline percentages | Continuous rule-based tracker | SC/ST Quota Compliance (§12.9) | MP, District Authority | Real-time compliance visibility, not year-end surprise |
| Utilization certificates not obtained for disbursed funds (CAG, ₹161 crore finding) | No automated UC follow-up | Rule-based UC compliance tracker | Utilization Certificate Compliance (§12.10) | District Authority, Auditor | Closes a specifically documented fund-leakage gap |
| Ministry lacks a proactive, real-time national risk view | Reliance on periodic post-hoc audits | National trend/systemic dashboard | Ministry Dashboard, Systemic Intelligence (§22) | MoSPI/DIID | Early-warning at policy level, not just after CAG audits |

---

## 26. Changelog from Prior Draft

- **Added:** SC/ST quota compliance tracker (§12.9), utilization certificate tracking (§12.10, §15), agency concentration analytics (§12.7), explicit statutory 1% inspection framing throughout (§10–§12.3, §21).
- **Modified:** Risk-score aggregation now explicitly requires an interpretable method, not a bare score (§12.3); Agency Suitability now carries a concentration-reinforcement guardrail (§12.8); n8n scoped to background/scheduled automation only, removed from the synchronous pre-sanction path for demo reliability; `mp_attention_scores` redefined as a derived view rather than an independent collection (§15).
- **Removed/merged:** "Execution Consistency" as a standalone AI feature — folded into Engineering Specification Comparison and Payment/Progress Consistency, since it restated both.
- **Clarified as Out of Scope (not silently omitted):** citizen/public transparency view; live eSAKSHI integration; blockchain; generic chatbot; LLM-based eligibility classification.
- **Preserved as-is (already correct):** real-vs-synthetic data discipline, human-in-the-loop decision chain, role structure, audit trail design, explainability requirement for individual flags, anti-overbuilding guidance.

---

## 27. Technical Considerations

- **Data store:** if MongoDB is retained (as in the working prototype) for schema flexibility across heterogeneous engineering-report shapes, apply schema validation and multi-document transactions for any write touching money or status (payments, sanction state) to preserve the referential integrity a financial-audit system needs. PostgreSQL remains a valid alternative if the team prioritizes relational guarantees over schema flexibility.
- **Automation (n8n):** used for background/scheduled workflows (ingestion, scheduled scans, notifications, escalation) — not placed in the synchronous pre-sanction AI call, to avoid introducing a live-demo failure point.
- **AI service layer:** separate Python service (scikit-learn / TF-IDF or embeddings) behind an internal REST API; Gemini (or a future local model via an AI-gateway abstraction) used only for natural-language explanation of already-computed results — never for the underlying numeric calculation.
- **Frontend:** React, role-based workspaces under a single portal (`/mp/*`, `/district/*`, `/state/*`, `/agency/*`, `/ministry/*`, `/auditor/*`, `/admin/*`).

## 28. Risks & Mitigations

- **False positives** from legitimate regional cost variation (hill/remote terrain) — mitigated by regional peer-grouping, not a single national threshold.
- **False negatives** from fraud designed to stay within "normal-looking" numbers — acknowledged as a known limitation of outlier detection; not oversold in the demo.
- **Data scarcity/bias** if reference data skews toward one state — disclosed honestly to judges rather than hidden.
- **n8n or third-party service failure during live demo** — mitigated by keeping the synchronous demo path (sanction → AI flag) independent of n8n.
- **Agency-suitability feature reinforcing concentration** — mitigated by the guardrail in §12.8.
- **Over-claiming impact** — all measurable outcomes (§29) are reported against a controlled/synthetic planted-anomaly dataset, never as real-world fraud-reduction claims.

## 29. Success Metrics

- Precision/recall of high-risk flags against a planted-anomaly test dataset.
- Number of duplicate-work pairs correctly detected in a sample dataset.
- Inspection targeting improvement: risk-ranked sample vs. random sample, measured against planted anomalies within the same simulated 1% quota size (the core, honest, demonstrable KPI).
- Reduction in manual sanction-review time with vs. without the AI risk panel (measured in-demo).
- SC/ST quota and utilization-certificate compliance visibility achieved in real time vs. the previous year-end-only reconciliation (qualitative KPI — no invented national percentage).

## 30. MVP Scope

**Phase 1 — Foundation:** landing page, common sign-in, auth/RBAC, central data store, `mp_allocation`, MP dashboard.
**Phase 2 — Core AI:** projects/recommendations, historical duplicate search, cost anomaly, SC/ST quota + timeline compliance rules, explainable risk engine, District dashboard.
**Phase 3 — Workflow:** background automation (scheduled scans/notifications), officer decisions, State dashboard, inspection queue explicitly tied to the 1% mandate, audit trail.
**Phase 4 — Differentiators:** engineering comparison, payment/progress consistency, utilization-certificate tracking, agency concentration analytics, field-verification recommendation.
**Phase 5 — Advanced (post-SIH-prototype):** delay-risk ML upgrade, agency suitability (advisory), fund-utilization forecasting, local/offline LLM, mobile field-inspection module, citizen transparency view.

## 31. Future Scope

Live eSAKSHI API integration; extensibility to other MP/MLA local-area development schemes; mobile inspection app; local/offline LLM via an AI-gateway abstraction; public transparency dashboard (carefully scoped); fund-utilization forecasting.

## 32. SIH Demo Strategy

1. Open the landing page; state the problem in one sentence (₹5 crore/MP/year, lakhs of records, no comparison layer, only 1% inspected and picked essentially at random).
2. Sign in as District Authority; open a new MP recommendation.
3. Live AI panel: cost anomaly ("+X% vs. category median") and duplicate match ("Y% similarity to a 2023 work") appear in real time.
4. District Authority reviews the explanation, holds the sanction pending clarification — emphasize this is a human decision, not an automatic block.
5. Switch to State dashboard: show the same work at the top of the risk-ranked list, and explicitly state "this is the state's mandated 1% inspection quota — today chosen almost at random, here chosen by risk."
6. Show the before/after comparison metric: risk-ranked vs. random sample hit-rate against planted anomalies.
7. Briefly show SC/ST quota compliance and a utilization-certificate flag, to demonstrate "we know what should stay rule-based, not AI."
8. Close on the human-in-the-loop principle and the honest data disclosure (synthetic + real, clearly labeled).

---

## Core Product Principle

> **AI identifies what deserves attention — including tying that attention directly to the government's own existing 1% inspection mandate. Humans decide what to do about it.**
