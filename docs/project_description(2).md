# SIH 2026 — Problem Statement 26102
## AI-Powered Anomaly, Fraud & Inefficiency Detection for MPLADS
### Full Strategic Analysis — MoSPI, Data Informatics & Innovation Division

> **Note on sourcing**: Every factual claim below about how MPLADS actually works is drawn from the 2023 Revised MPLADS Guidelines, PIB releases, CAG audit findings (2001, 2011), and the live eSAKSHI portal (mplads.mospi.gov.in). Anything not verifiable this way is explicitly marked **[ASSUMPTION]**. Verify current numbers (crore allocations, work counts) against the live dashboard before your final presentation, since figures change.

---

## 1. UNDERSTAND THE PROBLEM

### In plain language
Every Member of Parliament gets **₹5 crore per year** of government money that they don't spend directly — instead, they *recommend* local development works (roads, handpumps, school buildings, community halls) to their District Collector. The district then approves, funds, and gets the work built through some agency (usually a government department or a Panchayat). This has been happening since 1993, across **~790 MPs × multiple years × thousands of works each** — meaning **lakhs of individual "work" records** sit in government systems, each with a cost estimate, a sanction order, multiple payment installments, and a completion status.

The government now has a digital system (the eSAKSHI portal, live since April 2023) capturing this data in real time. But **capturing data ≠ understanding data**. Nobody is systematically looking across all these records to ask: *Is this cost estimate for a road normal, or 3x what a similar road costs elsewhere? Has this same "community hall" been sanctioned twice in two different years? Has this work been "in progress" for 4 years with no payment updates? Did the money go to a genuine local contractor or a shell entity?*

Today, this kind of checking is either not done at all, or done manually/reactively — usually only *after* a CAG audit or a media exposé flags a problem, by which point the money is already spent.

### What is the actual problem?
There is no AI/analytics layer sitting on top of MPLADS's transactional data that proactively surfaces **trends, anomalies, cost overruns, duplicate works, delays, and fraud-risk patterns** to the people who could act on them (MPs, District Authorities, State Nodal Agencies, the Ministry) *before* money is lost or misused — not just after the fact in an annual audit.

### Why does this problem exist?
- **[Known]** MPLADS involves large-scale, distributed execution: thousands of works, executed by different implementing agencies (Panchayats, PWD, municipal bodies), across every district in India, sanctioned by different District Authorities with local discretion.
- **[Known, from CAG]** Historically, the Ministry's own oversight role was described by CAG as largely limited to releasing funds, without deep responsibility for how they're used at the execution level.
- **[Reasonable assumption]** Even with the new eSAKSHI portal digitizing the workflow, the platform's design goal was fund-flow transparency (who sanctioned what, who paid what) — not automated pattern detection across the dataset. Data being *digitized* is a prerequisite for AI monitoring, but it doesn't automatically produce it.
- **Scale vs manpower mismatch**: no state nodal cell or district monitoring committee has the staff to manually cross-check thousands of cost estimates against norms, or compare works across constituencies for duplication.

### Why is it important?
Public money, meant for durable community assets (drinking water, sanitation, roads, schools) is at stake. CAG audits have repeatedly found underutilization, inadmissible works, inflated costs, and unrefunded balances (see Section 4). Left unchecked, this erodes both the intended development impact and public trust in a scheme that already faces constitutional/design criticism (separation-of-powers debate, no statutory backing).

### Who is affected?
- Citizens who don't get the promised asset (a drinking-water project that's "in progress" for years, or built substandard).
- MPs, whose recommendations get executed poorly and whose reputational and political interest is in visible, working assets.
- District Authorities and implementing agencies, who bear administrative/legal exposure if irregularities surface later.
- MoSPI/DIID, accountable to Parliament and CAG for scheme performance nationally.

### What happens if the problem is not solved?
Continuation of the historical pattern CAG has already documented: inflated cost estimates, works sanctioned for ineligible purposes, delayed work orders, unspent/unrefunded balances, and detection only after the money is gone — with corrective action (recovery, disciplinary action) far harder after the fact than prevention would have been.

### Root cause
**Information asymmetry at scale**: the data needed to spot a problem (cost estimate for Work A in District X vs. similar Work B in District Y; delay patterns; contractor/vendor repetition) exists somewhere in the system, but no one is *computationally comparing records against each other* to surface outliers. Human reviewers can inspect one file at a time; they cannot mentally hold "what's normal" across lakhs of records.

### Secondary/consequential problems
- Cost-estimate inflation goes undetected until random inspection.
- Duplicate or near-duplicate works (same location, similar scope, different names) across years/agencies.
- "Ghost" or perpetually-delayed works that quietly consume budget lines without producing an asset.
- Concentration of work awards to a small set of vendors/implementing agencies without anyone noticing the pattern.
- Districts/states with systemically slower fund utilization not being flagged for support or scrutiny.

### Which parts are technological?
Data aggregation across scheme records; statistical/ML pattern detection (outlier cost estimates, delay prediction, duplicate detection via text/geo similarity); dashboarding; alerting.

### Which parts are process/administration/human/policy?
Who has authority to sanction a work; who investigates a flagged alert; what counts as an "eligible work" under guidelines; whether a flagged case leads to action — all of this remains a human/administrative decision. **AI's job is to point, not to punish.**

### What is MoSPI actually expecting?
Per the problem statement itself: a platform that (a) analyzes sanction/expenditure/cost-estimate/progress/payment/asset data, (b) detects unusual patterns — cost overruns, duplicate works, delays, norm deviations, (c) generates **risk-based alerts** and **decision-support dashboards** for MPs/State/District/Ministry, and (d) supports compliance monitoring and early warning — i.e., a **monitoring & analytics layer**, not a replacement for the existing sanction/execution workflow.

### Root Problem → Existing Causes → Current Consequences → Desired Outcome
| Root Problem | Existing Causes | Current Consequences | Desired Outcome |
|---|---|---|---|
| No systematic anomaly detection across MPLADS data | Manual, siloed review; scale >> reviewer capacity; digitization ≠ analytics | Cost overruns, duplicate/ineligible works, stalled projects go unnoticed until audit | AI-assisted, always-on monitoring that flags risk early, with dashboards for every stakeholder level |

---

## 2. REAL-WORLD EXAMPLES

**Example 1 — The inflated cost estimate**
*Situation:* A District Authority sanctions a "community hall" costing ₹38 lakh. Similar community halls sanctioned elsewhere in comparable districts typically cost ₹18–22 lakh for the same specifications (area, material grade).
*People involved:* District Engineer (prepares estimate), District Authority (approves), Implementing Agency (executes).
*Currently:* The estimate is checked against a schedule of rates, but rarely benchmarked against *other actual sanctioned works of the same type across the country*.
*Where it breaks down:* No one at district level has visibility into what similar works cost elsewhere; there's no comparison layer.
*Data involved:* Work category, plinth area/quantity, sanctioned cost, district, date.
*Mistake/delay:* Overpayment or padded contractor margins go through unnoticed.
*Our solution:* An AI model trained on historical cost-per-unit data for each work category flags this sanction as a statistical outlier (e.g., "+73% vs. category median for comparable specification") for District/State review *before* full disbursement.

**Example 2 — The work that never finishes**
*Situation:* A road repair work is sanctioned in 2022, first installment paid, marked "in progress." By 2026 it's still "in progress," no further payment update, no completion certificate.
*People involved:* Implementing Agency (should update status), District Authority (monitors), MP's office (interested in visible delivery).
*Currently:* Someone would need to notice the constituency's dashboard shows a 4-year-old "in progress" item — usually only happens if someone manually scans the list or a citizen complains.
*Data involved:* Sanction date, expected completion (guidelines: generally 1 year), last update date, payment history.
*Mistake:* Silent fund lock-up; asset never delivered.
*Our solution:* A simple rule + ML-refined "stale work" detector flags any work exceeding expected duration with no recent activity, ranked by risk (money already disbursed vs. not).

**Example 3 — The duplicate/near-duplicate work**
*Situation:* Two works — "Construction of RCC road near Govt. School, Ward 4" (2023) and "RCC Road Ward 4 near School" (2024) — are sanctioned a year apart, in the same location, by different implementing agencies.
*People involved:* Two different District Authority officials (possibly across a district transition or agency handover), each unaware of the other's sanction.
*Currently:* No cross-check against prior years' work descriptions/geo-location before sanctioning a new one.
*Data involved:* Work description text, GPS/location, ward, work category, sanctioning year.
*Mistake:* Double-funding of effectively the same asset.
*Our solution:* Text-similarity + geo-proximity matching flags likely duplicates at sanction time, before the second payment is released.

**Example 4 — The vendor concentration pattern**
*Situation:* Across a district, 40% of MPLADS works over three years are executed by the same three contractors/agencies, well above what would be expected from open, competitive allocation.
*People involved:* District Authority, Implementing Agencies.
*Currently:* No one aggregates "who got how much work" across years to see concentration.
*Data involved:* Implementing agency/vendor ID, work value, year, district.
*Mistake:* Potential favoritism or cartelization goes unexamined.
*Our solution:* A concentration/network-analysis dashboard for State Nodal Authorities showing vendor share over time, flagged if beyond a statistical threshold — for human review, not automatic penalty.

**Example 5 — SC/ST quota non-compliance**
*Situation:* Guidelines require MPs to recommend ≥15% of entitlement for SC-majority areas and ≥7.5% for ST-majority areas annually.
*People involved:* MP's office, District Authority tracking compliance.
*Currently:* This is a rule that can be checked with basic arithmetic, not AI — but currently may only be reconciled at year-end rather than tracked continuously.
*Our solution:* Simple **rule-based** (not AI) real-time compliance tracker on the dashboard — flagged here to show we correctly identify what does *not* need AI.

---

## 3. CURRENT SYSTEM — HOW IT WORKS TODAY

**[Known, from guidelines/eSAKSHI]**

1. **MP** recommends a work to the **District Authority (District Collector)** of a district in their state (Lok Sabha MP: own constituency; Rajya Sabha MP: any district(s) in state of election; Nominated MPs: any district in any one state).
2. **District Authority** scrutinizes the proposal, prepares/approves a cost estimate, checks eligibility against guidelines, and issues a **sanction order**, choosing an **Implementing Agency** (Panchayati Raj Institutions preferred).
3. Funds (₹5 crore/year/MP, released in two ₹2.5 crore installments by GoI directly to the District Authority, subject to unspent-balance/utilization checks) flow from **MoSPI → District Authority**.
4. **Implementing Agency** executes the work and raises **vendor payment requests** on the eSAKSHI portal at various execution stages, per the sanction order.
5. Implementing Agency updates **work progress** on the portal; on final payment, marks the work **"complete."**
6. **State Nodal Department** supervises overall scheme implementation in the state; constitutes monitoring committees; is required to physically inspect at least 1% of works annually and commission third-party audits for high-value works.
7. **MoSPI (Central Nodal Agency/DIID)** monitors fund flow nationally, conducts annual reviews, publishes progress reports, and coordinates CAG-approved audits.
8. **CAG** performs periodic performance audits (historically ~every decade) — this is where most publicly known irregularities have surfaced.

Data is stored on the eSAKSHI web portal (introduced April 2023), updated by each stakeholder through their own login (MP recommendation, District sanction, Implementing Agency progress/payment).

**Decisions are made at**: District Authority level (sanction), State level (monitoring committee inspections), Ministry level (fund release, policy).
**What happens when something goes wrong**: historically, addressed reactively via CAG performance audits years after execution (2001, 2011 audits cited below), not in real time.

---

## 4. CURRENT SYSTEM — PROS AND CONS

### Advantages
- Real, structured digital data now exists in one national portal (eSAKSHI) — a major improvement over pre-2023 fragmented, paper-based tracking. This is *exactly* the precondition your AI layer needs.
- Clear accountability chain (MP recommends, District sanctions/executes, State supervises, Centre funds/audits).
- Statutory-adjacent safeguards already exist: mandatory 1% physical inspection by states, third-party audits for high-value works, CAG audits, non-lapsable but trackable funds.
- Established, well-documented guidelines (2023 revision) defining eligible works, timelines, and quota requirements — giving you clean **rules** to encode.

### Problems / Limitations
| Limitation | Why it happens | Impact | How our solution addresses it |
|---|---|---|---|
| No cross-record comparison (cost norms) | Each sanction reviewed in isolation by local officials | Inflated estimates undetected (CAG found excess payments from under-specified material use) | ML outlier detection on cost-per-unit vs. category/region benchmarks |
| Reactive, not real-time monitoring | Formal audits happen periodically (years apart) | Money already spent before irregularity found | Continuous, automated alerting as data enters the portal |
| No duplicate/overlap detection | No text/geo cross-referencing tooling exists at district level | Same asset possibly double-funded | NLP + geo-similarity duplicate detector |
| Manual, capacity-limited inspection (only 1% mandated) | State monitoring committees can't inspect every work | 99% of works get no independent physical check | AI-based risk scoring to prioritize *which* 1% (or more) gets inspected — smarter sampling, not just random |
| Stalled/delayed works hard to spot in aggregate | No systematic "days since sanction with no progress update" tracking surfaced to decision-makers | Funds locked in non-performing works for years (CAG has flagged large unspent/unrefunded balances historically) | Delay-prediction + staleness alerts on dashboards |
| Unspent-balance and utilization-certificate follow-up is manual | CAG (2001 report) found DCs not obtaining utilisation certificates for works worth ₹161 crore | Fund leakage/administrative gaps persist unnoticed | Automated utilization-certificate/compliance tracking (rule-based) + AI risk flag for chronic non-compliance patterns |
| No systemic view of vendor/agency concentration | No aggregation tooling across years/districts | Potential favoritism/cartelization invisible | Vendor-concentration analytics for State/Ministry dashboards |

---

## 5. STAKEHOLDER ANALYSIS

| Stakeholder | Role | Currently does | Problems faced | Info needed | How solution helps |
|---|---|---|---|---|---|
| Member of Parliament (MP) / office | Recommends works | Submits recommendations to DC | No visibility into whether their constituency's works are progressing normally vs. flagged elsewhere | Status of own constituency's works, risk flags, comparison to peer constituencies | Personalized dashboard with risk/delay alerts for their own works |
| District Authority (District Collector) | Sanctions, selects IA, releases funds | Reviews & approves proposals, issues sanction orders | No comparison tooling; manual estimate review; workload | Cost benchmark, duplicate-check, compliance status | AI flags at sanction time before approval |
| Implementing Agency (Panchayat/PWD/Municipal body) | Executes work, raises payment requests | Executes, updates portal | Progress-reporting burden; delays sometimes go unflagged | Own pending tasks, payment status | Dashboard for own work list, deadline reminders |
| State Nodal Department | Supervises state-wide implementation, mandatory 1% inspections, monitoring committee | Coordinates state monitoring, inspections, third-party audits | Can't manually decide *which* works most need the limited inspection capacity | Prioritized risk list of works to inspect | AI-ranked inspection priority list |
| MoSPI / DIID (Ministry) | Policy, fund release, national monitoring, CAG coordination | Releases funds, compiles national reports | No proactive, real-time national risk view; relies on periodic audits | National trend dashboard, state/district comparison, systemic risk indicators | National anomaly & trend dashboard, early-warning system |
| CAG / Auditors | Independent performance audit | Periodic deep-dive audits (years apart) | Huge manual sampling effort | Pre-flagged high-risk cases to sample | AI-prioritized audit sample lists (decision support only) |
| Citizens/public | Beneficiaries | Can view eSAKSHI public dashboard | Limited insight into "is this normal or a problem" | Simple, transparent status of local works | Optional public-facing transparency view (careful scoping) |

### Primary user
State Nodal Authorities and District Authorities (they act on flags day-to-day) — plus **Ministry (DIID)** as the platform owner/final decision-maker for systemic action.

### Secondary users
MPs (visibility into own constituency), CAG/auditors (prioritized sampling), citizens (transparency, optional).

### Final decision maker
Concerned administrative authority at the relevant level (District/State/Ministry) — **never the AI**. AI flags; humans decide.

### Who generates the data?
MPs (recommendations), District Authorities (sanctions), Implementing Agencies (progress/payments).

### Who consumes the data?
All levels above, plus your AI/analytics engine.

### Who is responsible when something goes wrong?
The sanctioning/administrative authority per existing guidelines — your platform does not change legal accountability, only visibility.

---

## 6. USER JOURNEYS

**District Authority Official**
Login → View pending sanction requests → For each, see AI-generated cost-benchmark + duplicate-check flag → Approve/reject/seek clarification → Track sanctioned works → Receive stale/delay alerts → Mark inspection outcomes.
*Pain points:* time pressure, no comparison data today. *AI helps at:* pre-sanction check, ongoing delay monitoring.

**State Nodal Authority**
Login → View state-wide risk dashboard (works ranked by anomaly score) → Allocate limited inspection capacity to top-risk works → Track third-party audit status → View vendor-concentration analytics → Escalate high-risk cases to Ministry.

**MP / MP's office**
Login → View own constituency's works → See status + any flags → View SC/ST quota compliance (rule-based) → Track fund utilization %.

**Ministry (DIID) official**
Login → National dashboard: trend analysis (cost inflation trends by category/region, delay trends by state), top flagged cases across states → Drill into any state/district → Export report for CAG coordination.

---

## 7. WHAT SHOULD OUR PROJECT ACTUALLY BUILD?

### Core Product
A **monitoring & decision-support analytics layer** that sits alongside (not replacing) the existing MPLADS sanction/execution workflow. It ingests scheme data (sanctions, cost estimates, payments, progress, completion), runs a set of explainable anomaly/pattern-detection models, and surfaces **risk-scored alerts and dashboards** tailored to each stakeholder level — while leaving all approval/investigation authority with humans.

### Modules
1. **Authentication & Role Management** — MP / District / State / Ministry / Auditor roles. *(Not AI.)*
2. **Data Ingestion Layer** — imports/simulates MPLADS-style records (sanction, cost, payment, progress). *(Not AI.)*
3. **Rule-Based Compliance Engine** — SC/ST quota tracking, timeline compliance (1-year norm), eligible-work-category checks. *(Not AI — deterministic rules from guidelines.)*
4. **AI Anomaly & Risk Engine** — cost-outlier detection, duplicate-work detection, delay/staleness prediction, vendor-concentration analysis. *(This is the AI core.)*
5. **Risk-Based Alerts** — generated from Module 4, routed to the right stakeholder level. *(Rule-based routing on top of AI scores.)*
6. **Dashboards** — role-specific views (MP / District / State / Ministry). *(Not AI, but AI-fed.)*
7. **Inspection Prioritization** — ranked list feeding the mandated 1% physical-inspection process.
8. **Audit Trail / Logs** — every sanction, flag, and action recorded immutably. *(Not AI.)*
9. **Reports/Export** — for CAG-style review. *(Not AI.)*

---

## 8. WHERE SHOULD WE USE AI?

### A. Cost-Estimate Anomaly Detection 🟢 Must Have
- **Problem it solves:** Inflated/unrealistic cost estimates going through unchecked.
- **Input:** Work category, specifications/quantity, sanctioned cost, district, date.
- **Technique:** Statistical outlier detection (Isolation Forest / robust z-score on cost-per-unit within category+region peer groups) — simple, explainable, doesn't need deep learning.
- **Output:** Anomaly score + "this is X% above category median" explanation.
- **Who uses it:** District Authority (pre-sanction), State (review).
- **Why AI > pure rules:** A fixed threshold ("flag if >₹X") can't account for category, region, and material-price variation; a peer-group statistical model adapts automatically.
- **Feasibility:** High — this is the most demo-friendly, explainable feature.
- **Data needed:** Historical/simulated cost records per category. eSAKSHI public dashboard + your own synthetic dataset (see Section 24 on data risk).

### B. Duplicate/Overlapping Work Detection 🟢 Must Have
- **Input:** Work description text, location (ward/GPS if available), category, dates.
- **Technique:** Text similarity (TF-IDF/embeddings + cosine similarity) combined with geo/ward proximity.
- **Output:** Ranked list of likely-duplicate work pairs with similarity score.
- **Why AI:** Free-text descriptions vary in wording for the same underlying asset — simple exact-match rules would miss most real duplicates.
- **Feasibility:** High; classic, well-understood NLP technique, easy to demo convincingly.

### C. Stalled/Delayed Work Prediction 🟡 Good to Have
- **Input:** Sanction date, expected duration (guideline norm ~1 year), payment installment history, last-update recency.
- **Technique:** Can start rule-based ("no update in N months + <1 year elapsed" = simple flag); upgrade to a classifier predicting delay-risk using features like agency track record, category, season, district if you have enough data.
- **Why AI adds value over pure rules (only if you have real historical outcome data):** predicting *which currently-active* works are likely to stall, not just flagging ones already stale.
- **Feasibility:** Medium — genuinely useful, but be honest in your demo about whether it's ML-based or a well-designed rule engine if data is thin.

### D. Vendor/Implementing-Agency Concentration Analysis 🟡 Good to Have
- **Input:** Agency ID, work value, district, year.
- **Technique:** Simple aggregation + concentration metrics (e.g., Herfindahl-index-style share); optionally graph analysis if agency-contractor-official relationships are modeled.
- **Why AI-ish:** Borderline — mostly statistics/analytics, not "AI" in the deep sense, but valuable and defensible to show.
- **Feasibility:** High, low complexity.

### E. Risk-Score Aggregation & Prioritized Inspection Ranking 🟢 Must Have
- **Input:** Outputs of A–D combined per work.
- **Technique:** Weighted scoring model (explainable — a simple weighted sum or a shallow, interpretable model like logistic regression/gradient-boosted trees with SHAP explanations) — **avoid black-box deep learning here**, since explainability matters most for a government compliance tool.
- **Output:** Ranked "top N works to inspect" list for State authorities' mandated 1% inspection.
- **Why AI:** Combines multiple weak signals into one actionable ranking better than any single rule.

### F. NLP-based Compliance Text Check 🔴 Avoid for SIH Prototype
- E.g., trying to auto-classify whether a work description matches an "eligible work category" via LLM. Interesting, but hallucination-risk and hard to validate reliably in a demo; guideline eligibility is better handled as a **rule-based category picklist** at data-entry time.

### G. Predictive Fund Utilization Forecasting 🟡 Good to Have
- **Input:** Historical disbursement/utilization pace per MP/district.
- **Technique:** Simple time-series projection (e.g., linear trend/ARIMA) to forecast year-end utilization %, flag districts trending toward under-utilization.
- **Feasibility:** Medium; nice for Ministry-level dashboard but not core to fraud detection story — keep secondary.

---

## 9. AI FEATURE PRIORITIZATION

| AI Feature | Problem Impact | Innovation | Feasibility | Demo Value | Data Requirement | Priority |
|---|---:|---:|---:|---:|---:|---|
| Cost-Estimate Anomaly Detection | 9 | 6 | 9 | 9 | Medium | 🟢 1 |
| Duplicate Work Detection | 8 | 7 | 8 | 9 | Low-Medium | 🟢 2 |
| Risk-Score Aggregation & Inspection Ranking | 8 | 7 | 7 | 8 | Medium | 🟢 3 |
| Stalled/Delay Prediction | 7 | 5 | 7 | 7 | Low | 🟡 4 |
| Vendor Concentration Analytics | 6 | 5 | 8 | 6 | Low | 🟡 5 |
| Fund Utilization Forecasting | 5 | 4 | 7 | 5 | Medium | 🟡 6 |

### If only 1: **Cost-Estimate Anomaly Detection.** Most directly answers "detect fraud/inefficiency," is explainable to a non-technical judge in one sentence, and is genuinely hard to do well without ML.
### If 2: Add **Duplicate Work Detection** — visually dramatic in a demo ("look, the system caught two work orders for the same road"), and structurally different technique (NLP+geo) showing technical range.
### If 3: Add **Risk-Score Aggregation & Inspection Ranking** — this is what ties A and B (and any others) into the actual government workflow (the mandated 1% inspection), making your project look like a real *decision-support system*, not just a set of disconnected ML demos.

---

## 10. WHAT SHOULD NOT BE AI?

- **Authentication/RBAC** — standard auth (JWT/session-based), not AI. AI here would be pure risk with zero benefit.
- **Sanction workflow/approval routing** — deterministic business logic per guidelines (who can approve what).
- **SC/ST quota and timeline compliance checks** — these are *fixed percentage/date rules* in the guidelines; encoding them as ML would be both wasteful and less auditable than simple arithmetic.
- **Fund-release calculations** (₹2.5 crore installments, unspent-balance checks) — exact arithmetic, not prediction.
- **Audit logs** — must be complete, tamper-evident records, not probabilistic.
- **Notifications** — simple triggers off status changes/thresholds.

**Why this matters for a judge:** A government financial-compliance system needs bright, explainable lines wherever legal/procedural correctness is required. Overusing "AI" for things that are actually deterministic government rules signals you don't understand the domain — and it's also a real risk (an ML model could "learn" the wrong quota threshold from biased data). Rules stay rules; AI is reserved for genuine pattern-detection-in-data problems where hard rules can't capture what's "normal."

---

## 11. PROPOSED SOLUTION

**Current System → Problem → Proposed Intervention → New Workflow → Result**
The existing eSAKSHI-style fund-flow workflow (MP recommends → District sanctions → IA executes/pays → periodic audit) has no analytics layer, so risk surfaces only at rare audits. We add a parallel **AI Risk & Monitoring Layer** that reads the same data as it's entered (sanction, cost, payment, progress) and, without altering who approves what, injects **risk flags at the moment of sanction and continuously during execution**, visible on role-based dashboards, feeding the *existing* mandated inspection and audit processes with a prioritized, evidence-backed list instead of blind/random sampling.

| Current Approach | Our Approach |
|---|---|
| Manual, isolated cost review | AI peer-group cost-benchmarking at sanction time |
| No duplicate cross-check | Automated NLP+geo duplicate detection |
| Random/fixed 1% inspection sampling | Risk-ranked inspection prioritization |
| Reactive, periodic (years-apart) audits | Continuous, real-time risk monitoring |
| Fragmented visibility (each level sees only its own layer) | Unified role-based dashboards across MP/District/State/Ministry |
| Compliance checks reconciled late/manually | Real-time rule-based compliance tracking (SC/ST quota, timelines) |

---

## 12. HOW OUR SOLUTION SOLVES THE PROBLEM

**Problem:** District officials cannot manually compare each cost estimate against national norms.
**Feature:** Cost-Estimate Anomaly Detection.
**Technology:** Peer-group statistical outlier model (Isolation Forest/robust z-score).
**Outcome:** Overpriced sanctions flagged before/at approval for a second look.

**Problem:** Same asset gets sanctioned twice under different wording.
**Feature:** Duplicate Work Detection.
**Technology:** Text embedding similarity + geo-proximity matching.
**Outcome:** Likely duplicates surfaced to District/State before double-payment.

**Problem:** Only 1% of works get physically inspected, chosen without risk information.
**Feature:** Risk-Score Aggregation & Inspection Ranking.
**Technology:** Explainable weighted/interpretable scoring model combining all AI signals.
**Outcome:** The mandated inspection capacity is spent on the highest-risk 1%, not a random 1%.

**Problem:** Funds silently locked in stalled works for years.
**Feature:** Delay/Staleness Alerts.
**Technology:** Rule engine + optional ML delay-risk classifier.
**Outcome:** Early flag while corrective action (reallocation, escalation) is still possible.

---

## 13. SYSTEM ARCHITECTURE

### Frontend
React (role-based dashboards; charts via Recharts/D3) — fast to build, good for a jury-facing demo with clean data visualizations.

### Backend
Python (FastAPI) — because your AI models (scikit-learn/pandas) live naturally in the same language; avoids an extra service-to-service hop for a hackathon timeline. Node.js/Express is a fine alternative if your team is stronger there — the AI engine can still be a separate Python microservice.

### Database
PostgreSQL — relational integrity matters here (sanctions, payments, foreign keys to works/agencies); works well for both transactional records and analytical queries.

### AI/ML Layer
A separate Python service (scikit-learn for anomaly detection, sentence-transformers or TF-IDF for duplicate detection) exposed via internal REST API, called by the backend when new records are ingested or on-demand from dashboards.

### APIs
Backend REST APIs for CRUD (sanctions, payments, progress) + AI-service APIs (`/score-cost`, `/check-duplicate`, `/risk-rank`).

### Authentication
Role-based JWT auth (MP / District / State / Ministry / Auditor roles), mirroring the real eSAKSHI stakeholder model.

### File/document storage
Object storage (e.g., S3-compatible/local for demo) for sanction orders, utilization certificates, inspection photos.

### Notification system
Simple event-triggered notifications (in-app + optional email) when a new high-risk flag is generated.

### Analytics
Pre-aggregated views/materialized queries feeding dashboard charts (trend lines, state comparisons).

### Audit/logging
Append-only action log (who viewed/approved/flagged what, when) — critical to explain to judges as a government-trust feature.

```text
Users (MP / District / State / Ministry / Auditor)
   ↓
Frontend (React dashboards)
   ↓
Backend/API (FastAPI)
   ↓
Business Logic
   ├── PostgreSQL (sanctions, payments, works, users)
   ├── Document Storage (sanction orders, UCs)
   ├── AI/ML Engine (cost-anomaly, duplicate-detect, risk-rank)
   ├── Notification Service (flag alerts)
   └── Analytics/Reporting (dashboards, exports)
```

---

## 14. DATA FLOW

**Sanction entry → Validation (rules: eligibility, quota) → Database → AI Processing (cost-anomaly + duplicate check) → Risk Score → District/State Review (human) → Decision (approve/hold/investigate) → Status Update → Dashboard refresh**

- Data enters via District Authority sanction form (or bulk import from a simulated eSAKSHI-style dataset for the demo).
- Rule engine validates eligibility/quota/timeline compliance instantly.
- AI engine scores cost anomaly + checks for duplicates against existing work records.
- Combined risk score attached to the work record.
- District/State official sees the flag on their dashboard; decides to approve, hold, or escalate.
- Decision + any inspection outcome is logged; dashboards update for MP/State/Ministry views.

---

## 15. DATABASE / DATA MODEL (core entities)

- **Users** (id, role, district/state/constituency, credentials)
- **MPs** (id, constituency, house — LS/RS, state)
- **Works** (id, MP_id, district_id, category, description, location/geo, sanctioned_cost, sanction_date, expected_completion, status)
- **Implementing_Agencies** (id, name, type, district)
- **Payments** (id, work_id, installment_no, amount, date)
- **Progress_Updates** (id, work_id, date, status, notes)
- **AI_Risk_Flags** (id, work_id, flag_type [cost/duplicate/delay/vendor], score, explanation, created_at)
- **Inspections** (id, work_id, inspector, date, outcome)
- **Audit_Log** (id, user_id, action, entity, timestamp)

**Relationships:** MP → many Works; District → many Works; Work → many Payments/Progress_Updates/AI_Risk_Flags; Implementing_Agency → many Works.

---

## 16. UI / DASHBOARD DESIGN (priority screens)

**1. District Sanction Review Screen**
- User: District Authority. Purpose: review a new work recommendation before sanctioning.
- Key info: cost estimate, AI cost-anomaly score + explanation, duplicate-check result.
- Actions: approve / hold / request clarification.
- AI component: live anomaly + duplicate score at point of decision.
- Why judges should see it: this is the "aha" moment — AI intervening *before* money moves, not after.

**2. State Risk Dashboard**
- User: State Nodal Authority.
- Key info: ranked list of highest-risk active works statewide; district comparison; vendor concentration chart.
- Actions: assign to inspection list.
- Why judges see it: shows the platform turning many individual flags into a prioritized, actionable statewide view — core "decision support" value.

**3. Ministry National Dashboard**
- Key info: national trend charts (cost trends by category, delay trends by state), top flagged cases, utilization %.
- Why judges see it: demonstrates scale and the "trend analysis/early warning" language directly from the problem statement.

**4. MP Constituency View**
- Key info: own works' status, flags, SC/ST quota compliance.
- Why: shows the platform serves *all* named stakeholders, not just enforcement.

**5. Duplicate Detection Detail View**
- Shows two flagged works side-by-side (description, location map, similarity score) — visually compelling, easy for judges to instantly "get."

---

## 17. PROTOTYPE SCOPE

**MUST BUILD:** Sanction entry + review flow; cost-anomaly model + explanation; duplicate-detection model; risk score aggregation; District & State dashboards; basic auth/roles; audit log.

**SHOULD BUILD:** Ministry national dashboard with trend charts; MP constituency view; inspection prioritization list; notification on new high-risk flag.

**NICE TO HAVE:** Delay/staleness prediction; vendor concentration analytics; fund-utilization forecasting; public transparency view.

**DO NOT BUILD:** Real integration with the live eSAKSHI portal (no access/authorization); blockchain-anything (irrelevant, adds nothing); a generic LLM chatbot bolted on for its own sake; deep-learning duplicate detection when TF-IDF/embeddings suffice; building a full document-management system.

---

## 18. 5–7 MINUTE SIH DEMO STRATEGY

- **0:00–0:45 — Problem:** "MPLADS moves ₹5 crore per MP per year, across thousands of works nationally. CAG audits have repeatedly found inflated costs, duplicate works, and stalled projects — but only *after* the money is gone."
- **0:45–1:30 — Current System:** Walk through MP → District → Implementing Agency → periodic audit, show where the blind spot is (no comparison layer, only 1% physically inspected, and that 1% chosen without risk data).
- **1:30–2:00 — Our Solution (one sentence):** "We built an AI risk layer that flags overpriced, duplicate, and stalled MPLADS works in real time, and turns the mandated 1% inspection into a smart, risk-ranked 1%."
- **2:00–4:30 — Live Prototype:** District official enters/reviews a new sanction → AI cost-anomaly flag appears live with explanation → show the duplicate-detection catch on a second work → show it land on the State risk dashboard, ranked.
- **4:30–5:30 — AI Deep-Dive:** Briefly explain *how* the cost model works (peer-group comparison, not a black box) and show the duplicate-matching logic — emphasize explainability.
- **5:30–6:15 — Impact:** Show before/after: "1% inspected randomly" vs. "1% inspected by risk rank" — a concrete, demonstrable efficiency gain.
- **6:15–7:00 — Innovation + Future Scope:** Mention integration path with the live eSAKSHI portal via API, extensibility to other MP/MLA local-area schemes, and human-in-the-loop design as the core trust principle.

---

## 19. REALISTIC DEMO SCENARIO

**Starting state:** Two works exist in the demo database for District X — a road project (2023) and a "similar" road recommendation just submitted (2024) at a notably higher cost.
**User 1 action:** District Authority official opens the new sanction request.
**AI action:** System shows: (a) cost is 65% above category median for the district's road-works, (b) 82% text+location similarity to the 2023 work.
**System response:** Work is auto-tagged "High Risk" and routed to the State dashboard's top of the ranked list.
**User 2 action:** State Nodal Authority views the ranked list, selects this work for physical inspection instead of a randomly chosen low-risk one.
**Decision:** Inspection outcome logged; District Authority holds the sanction pending clarification.
**Final result:** Ministry dashboard shows one fewer "unreviewed high-risk" case, contributing to the national risk trend chart.

---

## 20. JUDGE PERSPECTIVE

**Why select this project?** It targets a real, government-issued problem statement with a specific, explainable AI mechanism tied directly to the stated ask (anomaly/fraud/inefficiency detection), and demonstrates human-in-the-loop design appropriate for a public-finance system.

**Why reject it?** If it looks like "another dashboard" without a convincing live AI moment, or if the AI is a black box no one can explain.

**What makes it look like a simple CRUD site?** Pure data entry/display screens without a visible, explainable AI decision happening in the demo.

**What makes it look innovative?** The peer-group cost-anomaly benchmarking (adaptive, not fixed-threshold), the duplicate-work catch, and turning "random 1% inspection" into "risk-ranked 1% inspection" — a concrete, quantifiable improvement to an existing mandated process.

**Likely technical questions:** "What algorithm powers the anomaly detection, and why that one?" "How do you avoid false positives flooding officials with noise?" "Is this real MPLADS data or synthetic?"

**Likely AI questions:** "How do you explain a flag to a non-technical district official?" "What happens if the model is wrong — false accusation risk?" "How would you retrain this as more data comes in?"

**Likely data questions:** "Where does your training data come from — is eSAKSHI data public?" "How do you handle regional cost variation (say, hill states vs. plains)?"

**Likely scalability questions:** "Can this handle all ~790 MPs × years of data?" "How do you scale the duplicate-detection text-similarity search — it's O(n²) naively?" (Have an answer: use approximate nearest-neighbor search / vector index for production scale.)

**Likely security questions:** "How do you prevent an official from suppressing their own flags?" (Answer: audit-logged, role-separated visibility — District can't hide a flag from State/Ministry.)

**Feasibility questions:** "Is this buildable in the SIH timeframe?" — Yes, answer honestly: core anomaly + duplicate detection with a synthetic/public dataset is a well-scoped, feasible prototype.

**Government adoption questions:** "How would this integrate with the live eSAKSHI system?" — Answer: as an API-based analytics layer reading from eSAKSHI's database/exports, not a replacement, minimizing migration risk.

---

## 21. INNOVATION

- **Genuine Innovation:** Peer-group, adaptive cost-anomaly benchmarking specific to MPLADS work categories (most existing govt. dashboards show status, not statistical risk).
- **Useful Engineering:** Clean role-based architecture mirroring the real 4-tier stakeholder structure (MP/District/State/Ministry).
- **AI Innovation:** Combining cost-anomaly + duplicate-detection + delay signals into one explainable risk score feeding the *existing* mandated inspection quota — this reuses/upgrades a real process rather than inventing a parallel one.
- **Process Innovation:** Converting a fixed, largely random 1% inspection mandate into a risk-prioritized 1% — a concrete, low-friction adoption path since it doesn't require changing any guideline, only *which* works get chosen.

**Main selling points (pick 2–3):** (1) adaptive cost-anomaly detection, (2) risk-ranked inspection prioritization tied to the *existing* 1% mandate, (3) explainability/human-in-the-loop design throughout.

---

## 22. MEASURABLE IMPACT (prototype-realistic KPIs)

- % of synthetic/test high-risk works correctly flagged vs. planted anomalies (precision/recall on your test dataset).
- Reduction in "manual comparison effort" — e.g., time to review a sanction with vs. without the AI flag panel (measurable in your own demo timing).
- Number of duplicate-work pairs detected in a sample dataset.
- Improvement in inspection targeting: risk-ranked sample vs. random sample, measured against your planted anomalies (a controlled, honest comparison — not a real-world claim).

*(Avoid inventing national-scale % fraud-reduction numbers — you cannot substantiate those without real deployment data.)*

---

## 23. SECURITY & GOVERNMENT REQUIREMENTS

**Demonstrate in prototype:** role-based access control, audit trail of every sanction/flag/decision, human-in-the-loop approval (AI never auto-rejects a work).

**Explain, don't fully build:** encryption at rest/in transit, formal backup/recovery procedures, integration-level authentication with government SSO — describe the approach, don't over-engineer for a hackathon prototype.

**AI explainability:** every flag must show *why* (e.g., "+65% vs. category median," "82% similarity to Work #X") — never a bare score with no reason, since that's what a government official (and a judge) will not trust.

---

## 24. AI RISKS AND LIMITATIONS

- **False positives:** legitimate cost variation (remote/hill terrain, material price differences) could be flagged as anomalous — mitigate with regional peer-grouping, not a single national threshold.
- **False negatives:** sophisticated fraud designed to stay within "normal-looking" numbers won't be caught by outlier detection alone.
- **Data scarcity/bias:** if your training/reference data is thin or unrepresentative (e.g., mostly one state), the model's "normal" will be skewed — be upfront about this limitation with judges.
- **Explainability limits:** anything beyond simple statistical/interpretable models becomes harder to justify to a district official who must act on it — hence avoiding black-box deep learning for the core risk score.
- **Government decision-making risk:** an unexplained AI flag could unfairly stall a legitimate project or, worse, be used to justify a predetermined decision — this is why every flag must be advisory, logged, and reviewable, never binding.

**Handling principle:** **AI recommends/flags → authorized officer makes the final decision**, and that decision (with reasoning) is itself logged for accountability — the AI never sanctions, rejects, or releases funds by itself.

---

## 25. IMPLEMENTATION PLAN — 6-Member Team

- **Member 1 — Frontend/UI:** React dashboards (District/State/Ministry/MP views), charts.
- **Member 2 — Backend/API:** FastAPI CRUD for works/payments/sanctions, auth, role routing.
- **Member 3 — Database:** PostgreSQL schema, seed/synthetic MPLADS-style dataset generation (critical — this unblocks everyone else).
- **Member 4 — AI/ML:** Cost-anomaly model, duplicate-detection model, risk-score aggregation.
- **Member 5 — Integration:** Connects AI service ↔ backend ↔ frontend, notification triggers, end-to-end flow.
- **Member 6 — Research/Domain/Presentation:** Owns MPLADS guideline accuracy, builds the demo dataset's "planted anomalies," prepares the pitch/demo script, judge Q&A prep.

**Build first:** the synthetic dataset (Member 3) and basic sanction-entry-to-dashboard flow (Members 1+2), because the AI models (Member 4) need real-shaped data to demo against, and Integration (Member 5) needs a working skeleton to plug into.

---

## 26. DEVELOPMENT ROADMAP

- **Phase 1 — Core Foundation:** DB schema, auth/roles, synthetic dataset generator.
- **Phase 2 — Main Workflow:** Sanction entry/review screens, basic CRUD end-to-end.
- **Phase 3 — AI:** Cost-anomaly + duplicate-detection models, tested against planted anomalies in synthetic data.
- **Phase 4 — Dashboard/Analytics:** Risk-ranked lists, trend charts, role-based views.
- **Phase 5 — Integration:** Wire AI service into the sanction flow live (not just offline scoring).
- **Phase 6 — Testing:** Validate flags against known planted-anomaly cases; fix false-positive noise.
- **Phase 7 — Demo Prep:** Script the Section 19 scenario end-to-end, rehearse timing, prepare Q&A answers from Section 20.

**Priority:** a working end-to-end flow (sanction → AI flag → dashboard) with 2 solid AI features beats 5 half-built AI features.

---

## 27. FINAL RECOMMENDATION

**Our project should basically be:** "An AI-powered risk-monitoring layer for MPLADS that flags overpriced, duplicate, and stalled works in real time, and turns the mandated 1% physical inspection into a risk-prioritized 1%."

**Primary Users:** District Authorities, State Nodal Authorities, MoSPI/DIID, with visibility extended to MPs and auditors.

**Main Problem:** MPLADS data is now digitized (eSAKSHI) but not analyzed — irregularities (inflated costs, duplicate works, stalled projects) surface only in rare, after-the-fact audits.

**Main Solution:** A monitoring/analytics layer that reads the same sanction/payment/progress data as it's entered, applies explainable anomaly-detection models, and routes risk-scored alerts to the right stakeholder level — without touching who has legal authority to approve or reject.

**Top 3 Features:** (1) Cost-estimate anomaly detection, (2) Duplicate-work detection, (3) Risk-ranked inspection prioritization.

**Top AI Feature:** Cost-Estimate Anomaly Detection.

**Best Demo Flow:** Section 19's scenario — new sanction request flagged live for cost + duplicate risk, surfaces on the State risk-ranked dashboard, drives a real inspection decision.

**Biggest Innovation:** Converting the existing mandated-but-random 1% inspection into a risk-prioritized 1% — improving a real government process without requiring a guideline change.

**Biggest Risk:** Over-claiming AI accuracy/impact without real deployment data — mitigate by being explicit that prototype numbers are demonstrated on a controlled/synthetic dataset with planted anomalies, not real-world fraud-reduction claims.

**What We Should NOT Build:** live eSAKSHI integration, blockchain, generic chatbot, black-box deep-learning risk scoring, a full document-management system.

**What Will Impress SIH Judges:** a live, explainable AI flag happening in front of them (not a static chart); honest acknowledgment of what's rule-based vs. AI; a clear tie-back to the *existing* 1% inspection mandate rather than an invented new process.

---

## 28. FINAL 60-SECOND EXPLANATION

"MPLADS lets every MP direct ₹5 crore a year toward local development works — roads, schools, water projects — through their District Collector. It's a great scheme on paper, but CAG audits have repeatedly found the same problems for over two decades: inflated cost estimates, duplicate works quietly double-funded, and projects that stay 'in progress' for years while the money sits locked. The reason this keeps happening is simple — nobody is comparing thousands of individual work records against each other in real time; irregularities only surface in periodic audits, years after the money's gone. We built an AI-powered risk layer that sits on top of the existing MPLADS workflow. The moment a work is proposed, our system checks its cost estimate against similar works nationally, checks whether it's a near-duplicate of something already sanctioned, and tracks whether active works are quietly stalling. Every flag comes with a clear explanation — never a black-box score — because the district officer, not the AI, makes the final call. And instead of inventing a new process, we plug straight into something that already exists: states are required to physically inspect 1% of works every year. Today that 1% is picked almost randomly. Our system ranks it by actual risk. Same inspection budget, smarter targeting, earlier detection — before the money, not after the audit."

---

## 29. SUPPLEMENTARY FEATURE — AI-GOVERNED CROWDSOURCED SOCIAL AUDIT (CITIZEN VERIFICATION) MODULE

> **Status: optional extension, not core scope.** Everything in Sections 1–28 stands on its own as a complete, demoable prototype. This module addresses a *different* blind spot — physical vs. financial discrepancy — and should only be added if the team has bandwidth beyond the Section 17 "MUST BUILD" list. It is scoped here honestly, including where it needs to be cut down to survive a hackathon timeline.

### In plain language
Everything built in Sections 1–28 checks the *paperwork* — cost estimates, sanction records, payment trails. None of it checks whether the asset described on paper actually exists, was built to spec, or still works. A "completed" ₹20 lakh community hall could be a half-built shell, or nothing at all, and the financial anomaly engine would have no way to know — the numbers on the sanction and payment records could look perfectly normal. This module closes that gap by letting the people who live near an MPLADS asset — the only people who can actually see it — report its real, on-ground condition, and uses AI to filter that citizen input for spam, bias, and political sabotage before it ever reaches an official.

### What problem it solves
The "Physical vs. Financial Discrepancy" problem: official records can show a work as sanctioned, paid, and complete while the real-world asset is missing, damaged, or never built. Today this is only caught by the same rare CAG audits and mandatory-but-thin 1% physical inspections that Section 4 already identifies as a core limitation of the current system.

### Core objective
Cross-reference official completion reports and milestone photographs (uploaded by Implementing Agencies) against real-time, geo-verified visual evidence submitted by nearby citizens, using AI to flag semantic and structural mismatches — while keeping every escalation decision advisory, exactly as Section 24's human-in-the-loop principle already requires for the rest of the platform.

### System workflow

**Phase 1 — Discovery & Geo-Fencing**
- Citizens authenticate via a lightweight progressive web app (PWA) using mobile OTP.
- The app requests device GPS and renders a localized map of MPLADS assets sanctioned within a fixed radius (e.g., 2 km) of the citizen's current location.
- Citizens can see the asset's official status: funds disbursed, reported physical-progress %, and the Implementing Agency's own milestone photographs — full transparency before they report anything.

**Phase 2 — Ground-Truth Submission**
- The citizen selects an asset and categorizes its actual state: *Functional*, *Incomplete/Damaged*, or *Ghost Asset / Does Not Exist*.
- The app disables the device photo gallery and forces a **live in-app camera capture only**, to reduce (not eliminate — see Risks below) the chance of doctored or historical images being submitted.
- EXIF metadata (GPS coordinates, timestamp) is extracted and locked at the moment of capture.

### Technical architecture — 3-tier AI verification engine

**Tier 1 — Geospatial Anti-Spoofing**
- Computes Haversine distance between the asset's official sanctioned coordinates and the citizen's live EXIF GPS.
- **Validation rule:** submissions beyond a configured threshold (e.g., 100 m) are auto-rejected as a spatial mismatch before any human or AI review — a citizen can only report on an asset they are physically standing near.
- **Feasibility:** High. This is straightforward coordinate math and the most reliable tier in the pipeline.

**Tier 2 — Computer Vision Mismatch Detection**
- Geo-validated submissions are passed through a scene-classification model to check whether the photographed scene plausibly matches the sanctioned asset category (e.g., official record says "constructed community shed," photo classifies as "barren field" → discrepancy flag).
- For assets reported "Damaged," the model additionally looks for visible defects (cracks, exposed rebar, missing components).
- **Feasibility caveat (be upfront about this in a demo):** a generic pretrained classifier (MobileNet/ResNet on ImageNet-style classes) is not trained on MPLADS-specific categories like "community shed" and won't reliably make this distinction out of the box. The realistic hackathon-scoped version of this tier is a **zero-shot image–text similarity check** (e.g., CLIP-style: does this photo's embedding match the asset category's text description embedding better than it matches an "empty/incomplete site" description?) rather than a trained defect-detection model. Fine-grained structural-defect detection (cracks, exposed rebar, stolen components) is a genuinely hard, specialized CV problem with no ready-made MPLADS-labeled dataset — scope this as future work, not a demoed capability, the same way Section 8-F treats NLP eligibility-checking as "avoid for prototype."

**Tier 3 — Dynamic Trust & Consensus Scoring**
- No single citizen report triggers action. Reports are aggregated using a discrepancy index that weighs unique reporting users, geospatial confidence, and CV confidence together, so one hostile actor can't move the needle alone.

### Escalation matrix

| Discrepancy Index | Time Window | System Action | Dashboard Status |
|---|---|---|---|
| Level 1 (1 report) | N/A | Logged in backend; no alert generated | `Monitor` |
| Level 2 (2–3 unique reports) | 14 days | AI tags the project for secondary review; alerts local Nodal Officer | `Elevated Risk` |
| Level 3 (4+ unique reports + CV mismatch) | 14 days | **Escalated to mandatory human review by the District Authority within a fixed SLA; auto-generates a Show-Cause Notice for response** | `CRITICAL: Mismatch` |

> **Correction from the original spec:** the original design had Level 3 auto-freeze the next vendor payment tranche. That's an automated financial action, not a flag — it breaks the same "AI recommends, a named human decides" principle this whole platform is built on (Section 24), and it's the first thing a judge who has read your own Section 24 will catch as inconsistent. Levels 2 and 3 here route to human officers on a fixed timeline instead; only a human-authorized hold freezes a tranche.

### Threat model & mitigation

| Threat | Mitigation | Residual risk to disclose |
|---|---|---|
| A contractor pays people to falsely report a completed asset as "Damaged" to extort repair funds | CV model finds no visible damage in the photos; low CV confidence lowers the discrepancy index, forcing manual review instead of any automatic fund action | Consensus scoring raises the cost of this attack but doesn't require the CV model to be highly accurate to be gamed at small scale |
| Political rivals submit photos of a different, broken asset to frame a sanctioned project as a failure | Tier 1 geo-fencing + forced live capture rejects photos not taken at the sanctioned coordinates | EXIF/GPS data on a phone can be spoofed by a sufficiently motivated user (fake-GPS apps, jailbroken devices); "live capture only" raises the bar but does not make this attack impossible — say so plainly rather than presenting Tier 1 as airtight |

### Why this belongs — and what it isn't
This module is a **ground-truth verification layer**, complementary to, not a replacement for, the financial-anomaly engine in Sections 1–28: the core platform asks "does the paperwork look normal?", this module asks "does the physical world match the paperwork?" Both blind spots are ones CAG has separately flagged historically — inflated/irregular cost records on one hand, and non-existent or substandard assets on the other.

### Prior art — be upfront about this with judges
The core loop here (citizen submits a geo-tagged photo complaint against a specific government-funded asset, routed to an official for review) is **not new** in Indian e-governance, and a judge may recognize it immediately:
- **Meri Sadak** (Ministry of Rural Development, for PMGSY rural roads) already lets citizens submit geo-located photo complaints against a named road asset, routed to State Quality Coordinators.
- **MGNREGA Social Audits** are a statutorily mandated (Section 17 of the MGNREGA Act) citizen-verification mechanism for a comparable rural-works scheme, though conducted offline via gram sabhas rather than an app.
- **Swachhata-MoHUA** uses a similar geo-tagged citizen photo complaint pattern for sanitation infrastructure.

None of these, as far as could be verified, does **automated CV-based cross-checking of the citizen's photo against the official record**, or **multi-user probabilistic consensus scoring** before an alert is generated — they route every citizen submission to a human reviewer. That combination is the genuinely new part of this module, and it's the framing to lead with: *"we're extending an established citizen-verification pattern the government already uses elsewhere, and adding automated visual cross-verification on top of it"* — not presenting geo-tagged citizen photo reporting itself as a new idea.

### If you build this: scope for a hackathon
**Build:** Tier 1 geo-fencing (Haversine check), the citizen-facing PWA submission flow, the consensus-scoring aggregation logic, and Tier 2 as a zero-shot image–text similarity check rather than a trained defect classifier.
**Do not attempt in this timeframe:** fine-grained structural defect detection (rebar/cracks/missing components), any automated fund-freezing action, OS-level anti-GPS-spoofing (not available without native device attestation APIs you won't have access to).
**Say plainly in the demo:** which tier is genuinely AI-driven (Tier 2's semantic match) versus deterministic (Tier 1's distance check, Tier 3's weighted counting) — the same rules-vs-AI honesty that Section 10 already applies to the core platform.

---

# OUR NORTH STAR

- **Build for one clear moment:** a live, explainable AI flag happening in front of the judges — not a pile of static dashboards.
- **Never let AI decide** — it flags, ranks, and explains; a named human authority always makes the call.
- **Stay honest about data** — use synthetic/planted anomalies on realistic MPLADS-shaped data, and say so plainly; don't fabricate national-impact numbers.
- **Tie every feature to an existing government process** (the 1% inspection mandate, the sanction workflow) — don't invent parallel bureaucracy.
- **Keep rules as rules** — SC/ST quotas, timelines, eligibility checks are deterministic; only use AI where "normal" genuinely can't be defined by a fixed threshold.
- **Two or three AI features, done deeply and explainably**, beat five shallow ones.
- **Rehearse the story, not the screens** — Problem → Blind spot → AI catch → Human decision → Better-targeted outcome, told as one continuous narrative.