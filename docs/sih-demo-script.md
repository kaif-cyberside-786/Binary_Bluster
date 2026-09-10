# SIH Problem Statement 26102 — End-to-End Demo Script & Presentation Guide

## Platform Overview
**MPLADS AI Risk Monitoring & Decision Support Platform**
- **Objective:** Proactive detection of cost anomalies, duplicates, milestone delays, and disbursement-progress mismatches while preserving human administrative authority.
- **Governing Axiom:** *AI is strictly advisory — only authorized officers make statutory administrative decisions.*
- **Security & Data Integrity:** Append-only immutable historical memory, 7-role RBAC, and strict Admin Isolation (admins configure system/users but have zero access to risk scores, project decisions, or audit contents).

---

## 1. Demo Credentials Table

All demo accounts share the standard password: **`Demo@12345`**

| Platform Role | Official User ID | Quick-Fill Button | Role / Designation | Jurisdiction Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Member of Parliament** | `MP-IND-01` | `USR-MP-01` | Hon. Member of Parliament (Indore) | Constituency (Indore, MP) |
| **District Authority** | `DA-IND-01` | `USR-DIST-01` | District Collector & Magistrate | District (Indore, MP) |
| **Implementing Agency** | `AG-PWD-01` | `USR-AGENCY-01` | Executive Engineer (PWD Division 1) | Agency (`PWD-INDORE-01`) |
| **State Nodal Authority** | `SA-MP-01` | `USR-STATE-01` | State Nodal Officer (Planning Dept) | State (Madhya Pradesh) |
| **Ministry Central** | `MIN-DIID-01` | `USR-MINISTRY-01`| Director (DIID, MoSPI, New Delhi) | National (Pan-India) |
| **Auditor (CAG)** | `AUD-CAG-01` | `USR-AUDITOR-01` | Senior Audit Officer (Central Audit) | National (Read-Only Audit) |
| **System Admin** | `ADMIN001` | `USR-ADMIN-01` | Technical Director (NIC/MoSPI) | Platform Admin (Restricted) |

> [!NOTE]
> On the login screen (`/login`), click any quick-fill button at the bottom of the card to automatically fill credentials and CAPTCHA.

---

## 2. Click-by-Click Presentation Walkthrough

### Step 1: Member of Parliament (`USR-MP-01`) — Recommendation & Outlay Tracking
1. **Navigate & Log In**: Go to `http://localhost:5173/login`, click **`MP (Indore)`**, then click **Sign In**.
2. **Dashboard Overview**:
   - Note the **Constituency Financial Breakdown**: Annual Statutory Entitlement (₹5.00 Cr), Cumulative Allocation (₹14.70 Cr), and Sanctioned Outlay.
   - Point out **Sanctioned Outlay Consistency**: Outlay values in KPI cards match approved works in the works table.
3. **Propose New Work**:
   - Switch to **Recommend Work** tab.
   - Fill title: `Installation of Solar Water Purification Unit, Ward 25`.
   - Category: `Drinking Water`. Estimated Cost: `₹24,00,000`.
   - Click **Submit Recommendation**. Work transitions immediately into the official District Review Queue.

---

### Step 2: District Collector (`USR-DIST-01`) — AI Risk Intelligence & Sanction Decision
1. **Switch User**: Click Logout, then click **`District Authority`** quick-fill and Sign In.
2. **Review Pending Works Inventory**:
   - Click on **Pending Review Queue**.
   - Notice the two flagged demo proposals:
     - `PRJ-DEMO-COST-01`: *High-Capacity Deep Tube Well* (₹98.5L proposed).
     - `PRJ-DEMO-DUP-01`: *Multi-Purpose Community Hall Construction* (Vijay Nagar Ward 12).
3. **Inspect Cost Anomaly (`PRJ-DEMO-COST-01`)**:
   - Click **Review & Sanction**.
   - Review Tab 2 (AI Risk Analysis): Explain that the platform benchmarked the proposed cost against real peer works in Indore (`Drinking Water`), flagging a **5.3x cost outlier** with statistically severe variance (z-score > 3.5).
   - Point out the **Statutory Advisory Notice**: *"AI findings are advisory only. District Collector holds sole statutory sanction authority."*
   - Scroll to **Administrative Decision**:
     - Select **Request Clarification** or **Hold**.
     - Enter Substantive Reason: `"Detailed rate justification required for 5.3x peer variance before consideration."`
     - Click **Confirm Decision**. Decision is committed to the append-only audit trail.
4. **Inspect Duplicate Detection (`PRJ-DEMO-DUP-01`)**:
   - Open review for `PRJ-DEMO-DUP-01`.
   - Review Tab 2: Show the **Duplicate Overlap** warning detecting 92% textual and geographical overlap with existing sanctioned project `PRJ-DEMO-DUP-00` (*Construction of Multi-Purpose Community Hall at Vijay Nagar, Ward 12*).
   - Select **Hold Recommendation** with note: `"Duplicate proposal overlapping with ongoing work PRJ-DEMO-DUP-00."`

---

### Step 3: Implementing Agency (`USR-AGENCY-01`) — Execution & Progress
1. **Switch User**: Logout and Sign In as **`Agency (RES)`**.
2. **Assigned Works**:
   - View assigned works under agency mandate.
   - Inspect ongoing projects, view milestone requirements, and submit technical progress updates.

---

### Step 4: Execution Monitoring & Payment Mismatch Detection
1. **Inspect `PRJ-DEMO-PAY-01`** (*Development of Paver Block Roads in Khajrana Area*):
   - Status: `IN_PROGRESS`. Sanctioned Cost: ₹45,00,000.
   - Physical Progress: 15% (Foundation stage).
   - Disbursed Payments: ₹40,00,000 (88.9%).
   - Point out the **Payment vs Progress Mismatch flag**: Severe divergence where fund disbursement exceeds physical milestone delivery by 73.9%, triggering high supervisory priority.
2. **Inspect `PRJ-DEMO-DELAY-01`** (*Construction of Health Sub-Centre Building, Rau Sector 4*):
   - Physical Progress: 20%.
   - Last reported update: 190 days ago.
   - Point out the **Delay / Milestone Staleness flag**: Stagnant progress exceeding the 180-day SLA.

---

### Step 5: State Nodal Authority (`USR-STATE-01`) — Statutory 1% Quota & Inter-District Oversight
1. **Switch User**: Logout and Sign In as **`State Nodal`**.
2. **State Overview**:
   - Confirm clean sidebar navigation without duplicate labels.
   - View the **1% Annual Physical Inspection Quota** tracking bar mandated by MPLADS Guidelines §5.2.
   - Point out **District Comparisons** contrasting execution rates and risk indices across Madhya Pradesh districts.

---

### Step 6: Auditor (`USR-AUDITOR-01`) — Append-Only Immutable Traceability
1. **Switch User**: Logout and Sign In as **`Auditor`**.
2. **Audit Ledger**:
   - View the live audit stream.
   - Point out the **AI Events ≠ Human Decisions separation** (`rules.md` §12, Phase 15):
     - `[⚙️ System / AI Event]`: `AI_ANALYSIS_COMPLETED` with actor `SYSTEM`.
     - `[👤 Human Officer Decision]`: `OFFICER_HOLD`, `OFFICER_SANCTION` with official actor IDs.
   - Demonstrate that Audit records cannot be modified, deleted, or cleared via any API endpoint.

---

### Step 7: Ministry DIID (`USR-MINISTRY-01`) — Pan-India Systemic Intelligence
1. **Switch User**: Logout and Sign In as **`Ministry (DIID)`**.
2. **Central Portfolio Metrics**:
   - **Total Monitored Works**: Accurately aggregates platform-wide works with honest status breakdown.
   - **Value-at-Risk (VaR)**: Deduplicated portfolio exposure (High Risk + Non-Compliant projects).
   - **Geographic Breakdown**: State-by-state project counts and risk ratios.
   - **Agency Concentration (HHI)**: Herfindahl-Hirschman Index highlighting vendor dependency.
   - **Supervisory Attention List**: Transparent 4-factor formula ranking areas needing central ministry review.

---

### Step 8: Admin Isolation (`USR-ADMIN-01`) — Security Governance
1. **Switch User**: Logout and Sign In as **`Admin (Restricted)`**.
2. **Demonstrate Admin Isolation (`rules.md` §10)**:
   - Admin manages user provisioning, jurisdiction assignments, and account lockouts.
   - **Zero Business Data**: Notice the Admin workspace contains **no project details, no risk scores, and no audit trails**.
   - Attempting to query `/api/projects`, `/api/audit`, or `/api/systemic` as Admin returns strict HTTP 403 `ADMIN_ISOLATION`.

---

## 3. Seed & Reset Instructions

To reset demo data at any time before a presentation:
```bash
# In backend-node directory:
npm run seed:demo
```
This re-seeds all synthetic works, recalculates mathematical risk indicators, and refreshes the audit trail in under 10 seconds.

