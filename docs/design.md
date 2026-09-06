# design.md — UI/UX DESIGN SYSTEM

The design system makes the MPLADS platform feel like one official government product even when different team members build different screens.

The interface should be **simple, restrained, professional, accessible and information-first**.

The product is not a consumer app and should not look like a futuristic AI product. AI should appear as a useful government decision-support capability inside familiar administrative workflows.

---

# 5.1 UI/UX Principles

## Government First

The interface should feel appropriate for a Ministry/government portal:

- simple
- trustworthy
- formal
- predictable
- accessible
- information-first
- low visual noise

Avoid:

- flashy gradients
- excessive animations
- glassmorphism
- neon colors
- oversized illustrations
- gaming-style dashboards
- unnecessary 3D graphics
- decorative AI/robot imagery
- consumer-SaaS visual language

## One Product

All users access the same MPLADS portal. Keep the following consistent:

- header
- government/project identity
- typography
- colors
- buttons
- forms
- tables
- alerts
- spacing
- navigation behavior
- login experience

Only the post-login workspace changes according to role.

```text
MPLADS PORTAL
      |
   LOGIN
      |
 ROLE DETECTION
      |
  +---+---+---+---+---+---+
  |   |   |   |   |   |   |
 MP District State Ministry Agency Auditor Admin
```

## Simplicity Over Decoration

Every element must have a purpose.

Ask:

> Does this help an official understand data or perform an administrative action?

If not, remove it.

## Information Hierarchy

Important information must appear first:

```text
Project identity
      ↓
Current status
      ↓
Risk level
      ↓
Why flagged
      ↓
Evidence
      ↓
Recommended action
```

## Human-in-the-Loop

AI must never visually imply that it made the final government decision.

Use:

- AI analysis
- Review recommended
- Ground verification recommended
- Suggested for consideration

Avoid:

- Fraud confirmed
- AI approved
- AI rejected
- Inspection automatically ordered

---

# 5.2 Design Language

The visual language should resemble a modern but conservative Indian government portal.

**Overall feel:**

> Official + Clean + Calm + Functional

The interface can be modern, but should remain recognizably administrative.

---

# 5.3 Color System

Use a restrained government-oriented palette. These are the resolved values — teams should not invent alternates.

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#1D3A5F` (deep navy blue) | Header, navigation, primary buttons, selected states, links |
| `--color-primary-hover` | `#16304F` | Primary button/link hover |
| `--color-secondary` | `#2B6CB0` (medium blue) | Secondary emphasis, informational accents |
| `--color-background` | `#F5F6F8` (near-white gray) | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels, table surfaces |
| `--color-text` | `#1A1D21` | Primary text |
| `--color-muted` | `#5A616B` | Secondary/supporting text |
| `--color-border` | `#D8DCE1` | Dividers, input borders, table borders |
| `--color-success` | `#1E7A34` | Compliant, completed, resolved |
| `--color-warning` | `#B8860B` (amber/gold, not bright yellow) | Attention, medium risk, review required |
| `--color-error` | `#B3261E` | High risk, errors, urgent |
| `--color-info` | `#2B6CB0` | Neutral/system/AI informational messaging |
| `--color-focus` | `#0B5FFF` | Focus ring only — distinct from primary so keyboard focus is always unambiguous |

**Dark mode: No, for MVP.** This is a working administrative tool used in offices during business hours, not a consumer app used at night; dark mode adds implementation and QA cost (every status color, chart, and badge needs a second verified-contrast variant) with no stated user need in the PRD. Revisit only if user research post-launch shows a real requirement (e.g., field use in low light).

Semantic colors communicate meaning, not decoration — see §5.4.

---

# 5.4 Color Usage Rules

Color must never be the only status indicator.

Bad:

```text
Red = High Risk
```

Better:

```text
HIGH RISK
[badge/icon] 87
```

Always pair semantic color with text.

---

# 5.5 Typography

Use a highly readable sans-serif font.

```text
Font family: Inter
Fallback: Arial, sans-serif
```

| Token | Size | Usage |
|---|---|---|
| `--font-size-xl` | 28–32px | Page title |
| `--font-size-lg` | 20–24px | Section title |
| `--font-size-md` | 16–18px | Card title |
| `--font-size-base` | 14–16px | Body text, table text |
| `--font-size-sm` | 12–14px | Supporting/small text, labels |

Readability is more important than decorative typography.

---

# 5.6 Spacing

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |

Use larger spacing between sections and smaller spacing inside components. Do not create excessive whitespace that hides important government data below the fold.

**Radius:** `--radius-sm` = 4px (inputs, badges, buttons), `--radius-md` = 8px (cards, modals). No larger radii — this is a restraint, not an oversight; large rounded corners read as consumer-app styling.

**Standard sizes:** button height 40px, input height 40px, table row height 48px (56px where an action menu needs breathing room).

---

# 5.7 Layout

Authenticated workspaces use a restrained layout:

```text
+------------------------------------------------+
| Header / Government identity                    |
+--------------+-----------------------------------+
| Sidebar      | Page content                      |
|              |                                   |
| Navigation   | Dashboard / Table / Detail        |
|              |                                   |
+--------------+-----------------------------------+
```

On smaller screens:

```text
Header
  ↓
Compact navigation
  ↓
Main content
```

---

# 5.8 Common Header

Use the same base header across authenticated workspaces.

Include:

- MPLADS portal identity
- Ministry/department identity where appropriate
- current user's name
- role
- notifications
- profile/account
- logout

Example:

```text
+----------------------------------------------------+
| MPLADS Risk Monitoring Portal        🔔 User ▾      |
+----------------------------------------------------+
```

Keep it compact and administrative.

---

# 5.9 Navigation

Navigation should be role-specific. Never show every feature to every user.

## MP

```text
Dashboard
My Recommendations
My Works
Financial Overview
Compliance (SC/ST quota, timeline)
Attention
Profile
```

## District Authority

```text
Dashboard
Recommendations
AI Review
Projects
Engineering
Payments
Compliance
Risk
Inspections
Agencies
Reports
Profile
```

## State Authority

```text
Dashboard
Projects
Risk Monitor
Inspection Queue
Districts
Agencies (Suitability + Concentration)
Trends
Reports
Profile
```

## Ministry

```text
Dashboard
National Overview
States
Systemic Risk
Implementation
Accountability
Policy Insights
Reports
Profile
```

## Agency / Engineer

```text
Dashboard
Assigned Projects
Engineering
Progress
Payments
Utilization Certificates
Completion
Clarifications
Profile
```

## Auditor

```text
Dashboard
Projects
Risk History
Inspections
Decisions
Audit Logs
Reports
Profile
```

## Admin

```text
Dashboard (system health only)
Users
Roles & Jurisdiction
System Configuration
Profile
```

Admin's navigation is deliberately short: it contains only operational/system-administration items. It never includes Risk, Inspections, Decisions, Reports, or Audit Logs — matching the architecture and rules restriction that system administration must not become a backdoor into sensitive government-decision content.

---

# 5.10 Dashboard Design

Government dashboards should not become collections of oversized KPI cards.

Use this hierarchy:

```text
Page title
 ↓
Important summary
 ↓
Attention / risk
 ↓
Operational data
 ↓
Detailed tables
```

Example:

```text
DISTRICT DASHBOARD

Pending Recommendations: 18
High-Risk Projects: 6
Delayed Projects: 11

--------------------------------

AI REVIEW REQUIRED

Project A     HIGH
Project B     HIGH
Project C     MEDIUM

--------------------------------

RECENT UPDATES

Project | Progress | Payment | Risk
```

---

# 5.11 KPI Cards

KPI cards are allowed but should remain compact.

Good:

```text
HIGH-RISK PROJECTS
6
↑ 2 from previous period
```

Avoid:

- huge gradient cards
- decorative icons without meaning
- excessive animation
- unnecessary illustrations

---

# 5.12 Tables

Tables are a primary UI pattern for government operations.

Use them for:

- projects
- payments
- recommendations
- inspections
- agencies
- risk findings

Rules:

- clear column names
- useful sorting
- filters
- pagination
- row hover/focus state
- status badges
- action menu where appropriate
- responsive handling
- consistent alignment

Numeric values should be right-aligned where practical.

---

# 5.13 Project Table

Recommended columns:

```text
Project ID
Project
Category
District
Amount
Status
Risk
Last Update
Action
```

Example:

```text
PRJ-001
Road Construction
ROAD
Indore
₹35L
IN PROGRESS
HIGH
2 days ago
View
```

Do not expose every database field in the table. Use a project-detail page for full information.

---

# 5.14 Project Detail Page

This is a core product screen.

Recommended hierarchy:

```text
Project Header
      ↓
Current Status
      ↓
Risk Summary
      ↓
AI Findings
      ↓
Compliance Status (SC/ST · Timeline · Utilization Certificate)
      ↓
Original Recommendation
      ↓
Engineering Report
      ↓
Progress Timeline
      ↓
Payments
      ↓
Documents
      ↓
Inspection
      ↓
Decision History
```

The officer should understand the project without navigating through unrelated pages.

---

# 5.15 Project Header

Example:

```text
ROAD CONSTRUCTION
PRJ-IND-001

Ward 12, Indore
MP: [name]
Implementing Agency: PWD

₹35,00,000
IN PROGRESS
```

Primary actions are visible only when the logged-in role is authorized.

---

# 5.16 Risk Presentation

Never show only a number.

Use:

```text
OVERALL RISK

87
HIGH

Why flagged
------------------------
Cost anomaly           HIGH
Historical similarity   HIGH
Specification change    MEDIUM
Payment mismatch        MEDIUM
```

Then:

**View Evidence**

---

# 5.17 AI Review Panel

Reusable component:

```text
+------------------------------------------+
| AI-ASSISTED REVIEW                        |
+------------------------------------------+
| Overall Risk        HIGH — 87             |
|                                            |
| Cost Anomaly        HIGH                  |
| Proposed: ₹63L                            |
| Peer Median: ₹22L                         |
| Deviation: +186%                          |
|                                            |
| Historical Match    HIGH                  |
| Similarity: 93%                           |
|                                            |
| Specification      MEDIUM                 |
| Length: -30%                              |
| Width: -25%                               |
|                                            |
| Recommendation                            |
| Review technical estimate and             |
| historical overlap.                       |
|                                            |
| [View Evidence]                           |
+------------------------------------------+
```

---

# 5.18 AI Status Labels

Always use explicit labels:

```text
AI ANALYSIS COMPLETE
AI ANALYSIS PENDING
AI ANALYSIS UNAVAILABLE
```

Never hide an AI failure behind a normal risk score.

---

# 5.19 Compliance Status UI

SC/ST quota, timeline, and utilization-certificate compliance are **deterministic rule outcomes, not AI findings** — give them a visually distinct treatment from the Risk/AI panel (§5.16–5.18) so officials never mistake a rule result for a model prediction.

```text
COMPLIANCE STATUS

SC/ST Quota (Annual)      ● REVIEW REQUIRED    12% of 15% target
Timeline Norm             ● COMPLIANT
Utilization Certificate   ● NON_COMPLIANT       overdue 14 days
```

Use a neutral square/dot marker (not the risk badge shape) with the same success/warning/error colors from §5.3, plus plain text status (`COMPLIANT` / `REVIEW_REQUIRED` / `NON_COMPLIANT`) — never a bare percentage or a bare color.

Placement: MP dashboard (own SC/ST quota %), District dashboard and Project Detail (all three), Auditor view (full compliance history).

---

# 5.20 Historical Comparison UI

Historical matches should be easy to compare.

Example:

```text
CURRENT PROJECT
₹63L

vs.

COMPARABLE PROJECTS

Project A    ₹21L
Project B    ₹22L
Project C    ₹23L
Project D    ₹24L
```

Duplicate candidate example:

```text
CURRENT
Community Hall — Ward 12

MATCHED
Community Hall — Ward 12
2023

Similarity: 93%
Distance: 0.8 km
```

Allow authorized users to open the matched historical project.

---

# 5.21 Engineering Comparison UI

Use side-by-side comparison.

```text
+----------------------+----------------------+
| RECOMMENDATION        | ENGINEER REPORT      |
+----------------------+----------------------+
| Length: 500m          | Length: 350m         |
| Width: 4m             | Width: 3m            |
| Material:             | Material:            |
| Bituminous            | Bituminous           |
| Cost: ₹25L            | Cost: ₹29L           |
+----------------------+----------------------+
```

Highlight differences:

```text
Length  -30%
Width   -25%
Cost    +16%
```

Differences are review signals, not automatic fraud findings.

---

# 5.22 Progress Timeline

Use a timeline for historical updates:

```text
June
20%
  │
July
40%
  │
August
45%
  │
September
90%
```

This makes abnormal jumps and reporting gaps easy to see.

---

# 5.23 Payment / Progress View

Show both dimensions together:

```text
PHYSICAL PROGRESS      30%
FINANCIAL PROGRESS     85%

⚠ SIGNIFICANT MISMATCH
```

Then show the underlying payment and progress records.

The mismatch is a review signal, not proof of wrongdoing.

---

# 5.24 Field Verification Recommendation

Use neutral and serious wording:

```text
FIELD VERIFICATION RECOMMENDED

Priority: HIGH

Signals:
• Payment/progress mismatch
• Engineering specification change
• Significant reporting gap
• Multiple risk indicators

[View Evidence]
[Assign Inspection]
[Request Clarification]
```

Do not use:

> Raid required.

---

# 5.25 Inspection Queue

For State Authority:

```text
INSPECTION PRIORITY

This list ranks works within the state's mandated annual
physical-inspection quota by risk — not at random.

Rank | Project | District | Risk | Reason | Status
1    | Road A  | Indore   | 92   | Cost + Progress | Pending
2    | Hall B  | Bhopal   | 88   | Duplicate       | Assigned
3    | Water C | Ujjain   | 84   | Delay           | Scheduled
```

The one-line explanation under the title is deliberate — it's the platform's core, judge-facing claim (risk-ranked vs. random within the same statutory quota) and should appear wherever the queue is shown, not just in a demo script.

---

# 5.26 Inspection Detail

```text
INSPECTION #INS-001

Project
Road Construction

Reason
AI-recommended field verification

Priority
HIGH

Assigned Officer
...

Date
...

Evidence
...

Ground Findings
...

Result
[No Issue]
[Review Required]
[Escalate]
```

Future mobile inspection can add:

- GPS
- timestamp
- photos
- observed measurements
- checklist

---

# 5.27 Ministry Dashboard

The Ministry workspace should be strategic rather than operational.

```text
NATIONAL OVERVIEW

States: 28
Projects: ...
Expenditure: ...
Completion: ...
High-Risk Projects: ...

--------------------------------

STATE PERFORMANCE

State        Completion    Risk
MP           68%           HIGH
...

--------------------------------

SYSTEMIC PATTERNS

⚠ Cost anomalies increasing
⚠ Delays rising in selected regions
⚠ Agency concentration requires attention

--------------------------------

POLICY INSIGHTS
```

The Ministry default view should prioritize: policy insights, national trends, state comparison, systemic risk, implementation supervision, accountability.

---

# 5.28 MP Dashboard

The MP workspace should be simpler:

```text
MY CONSTITUENCY

Allocation
₹...

Recommended
₹...

Expenditure
₹...

Completion
68%

--------------------------------

COMPLIANCE

SC/ST Quota: 12% of 15% target — REVIEW REQUIRED

--------------------------------

MY WORKS

Completed
Pending
In Progress

--------------------------------

ATTENTION

3 projects require review
5 projects delayed
```

---

# 5.29 District Dashboard

The District workspace is the most decision-oriented.

```text
DISTRICT REVIEW

Pending Recommendations     18
High-Risk Projects            6
Delayed Projects             11
Inspections Pending           4
UC Overdue                    3

--------------------------------

AI REVIEW REQUIRED

Project      Risk       Main Reason
Road A       HIGH       Cost anomaly
Hall B       HIGH       Historical match
Water C      MEDIUM     Delay

--------------------------------

RECENT UPDATES
```

---

# 5.30 Agency Dashboard

Keep it operational:

```text
MY ASSIGNED WORKS

Active: 12
Pending Updates: 3
Completion: 74%

--------------------------------

PROJECT
Status
Progress
Payment
Utilization Certificate Status
Next Required Update
```

Do not expose unrelated confidential risk information about other agencies.

---

# 5.31 Auditor Dashboard

Focus on traceability:

```text
AUDIT OVERVIEW

Recent decisions
Risk changes
Inspection results
Document uploads
Status changes

--------------------------------

PROJECT HISTORY

[View complete timeline]
```

Auditors should be able to reconstruct the project lifecycle.

---

# 5.32 Admin Dashboard

Admin's dashboard is operational/system-health only — it must never surface project risk, decisions, or audit content.

```text
SYSTEM OVERVIEW

Active Users: ...
Pending User Approvals: ...
System Health: OK
Background Job Failures (last 24h): ...

--------------------------------

USER MANAGEMENT

[Manage Users]  [Manage Roles & Jurisdiction]  [System Configuration]
```

This is a deliberate contrast with every other dashboard in this document — the absence of risk/compliance/decision content here is the point, not an oversight.

---

# 5.33 Agency Intelligence: Suitability vs. Concentration

These are two distinct analytics (PRD §12.7–12.8) and must look distinct — never combine them into one "agency score."

**Suitability (advisory, District-facing, per new project):**

```text
SUGGESTED AGENCIES (advisory)

PWD              91
Panchayat        74
Pvt. Contractor  68

Final selection remains with the District Authority.
```

**Concentration (State/Ministry-facing, systemic view):**

```text
AGENCY WORK-SHARE — Indore District, 2026

PWD              42%  ⚠ above concentration threshold
Panchayat        31%
Others (6)       27%
```

Suitability uses a ranked list with scores; Concentration uses a share/percentage view with a threshold flag — the visual difference reinforces that one is a per-project recommendation and the other is a systemic pattern.

---

# 5.34 Information Density by Role

```text
MP
↓
Simple + constituency-focused

District
↓
Detailed + action-oriented

State
↓
Risk + inspection-oriented

Ministry
↓
Aggregated + strategic

Agency
↓
Execution-oriented

Auditor
↓
History + accountability-oriented

Admin
↓
System-operational only
```

Do not use one dashboard design for everyone.

---

# 5.35 Forms

Government forms should be structured and clear.

Rules:

- clear labels above fields
- required fields marked
- related fields grouped
- minimal help text
- no unnecessary multi-step wizard
- validation close to the field
- preserve values after validation errors

Example:

```text
Project Name *
[________________________]

Estimated Cost *
[ ₹ ____________________ ]

Category *
[ Select category        ]

District *
[ Select district        ]
```

---

# 5.36 Form Validation

Bad:

> Something went wrong.

Better:

> Estimated cost must be greater than ₹0.

Better:

> Please select a project category.

Engineering example:

> Length must be a positive number.

---

# 5.37 Buttons

Use a consistent hierarchy.

### Primary

One main action per screen:

- Sign In
- Submit Recommendation
- Save Progress
- Assign Inspection

### Secondary

- Cancel
- Back
- View Evidence

### Sensitive

- Escalate
- Reject
- Delete

Require confirmation for consequential actions.

---

# 5.38 Decision Confirmation

For important actions:

```text
Confirm Decision

Action:
Send Project PRJ-001 for inspection

Reason:
Potential payment/progress mismatch

[Cancel] [Confirm]
```

Avoid ambiguous confirmations.

---

# 5.39 Status Badges

Use consistent labels, mapped directly from the canonical states in `architecture.md` §10.1 — the badge is a display label, never a re-invented status:

**Project status badges** (`projects.status`):

```text
RECOMMENDED        ← MP_RECOMMENDED
UNDER REVIEW        ← DISTRICT_REVIEW
CLARIFICATION       ← CLARIFICATION_REQUIRED / HELD
SANCTIONED          ← SANCTIONED
IN PROGRESS         ← IN_PROGRESS
COMPLETED           ← COMPLETED
INSPECTION REQUIRED ← INSPECTION_REQUIRED
ESCALATED           ← ESCALATED
```

**Inspection status badges** (`inspections.status`): `RECOMMENDED`, `PENDING DECISION`, `ASSIGNED`, `SCHEDULED`, `IN PROGRESS`, `COMPLETED`, `RESULT RECORDED`.

**Inspection result** (a separate field, set only once an inspection reaches `RESULT_RECORDED`): `NO ISSUE`, `REVIEW REQUIRED`, `ESCALATE`.

**Risk badges** (not a status — a finding): `HIGH RISK`, `MEDIUM RISK`, `LOW RISK`.

**Compliance badges** (§5.19, visually distinct shape from risk badges): `COMPLIANT`, `REVIEW REQUIRED`, `NON COMPLIANT`.

Status badges must always contain text. Compliance badges (§5.19) use the square/dot marker shape; risk badges use the rounded pill shape — the shapes themselves are a secondary, non-color cue distinguishing rule outcomes from AI findings.

---

# 5.40 Alerts and Notifications

Notifications should be short and actionable.

Good:

> **Project PRJ-001 requires review. Cost anomaly detected.**

Good:

> **Inspection recommended for Project PRJ-015.**

Bad:

> Something happened to your project.

Clicking should open the relevant project/event.

---

# 5.41 Empty States

Example:

```text
No pending inspections

There are currently no projects
awaiting inspection assignment.
```

Avoid unnecessary illustrations.

---

# 5.42 Loading States

Use:

- skeleton tables
- compact spinners
- disabled submit state
- component-level loading

For AI:

```text
AI ANALYSIS IN PROGRESS...
Comparing historical project data.
```

---

# 5.43 Error States

Examples:

```text
Unable to load project information.
Please try again.
```

AI:

```text
AI analysis is temporarily unavailable.
The available project data is still shown.
```

Never show a normal low-risk state when AI actually failed.

---

# 5.44 AI Loading Experience

For a project review:

```text
Analyzing project...

✓ Project data loaded
✓ Historical records compared
✓ Cost benchmark calculated
● Generating explanation
```

This communicates progress without unnecessary animation.

---

# 5.45 Landing Page Visual Structure

```text
Header
   ↓
Hero
   ↓
The Problem
   ↓
How Our Solution Helps
   ↓
AI Capabilities
   ↓
How It Works
   ↓
Who Uses It
   ↓
Trust / Human Decision
   ↓
Sign In CTA
   ↓
Footer
```

The landing page should remain official and simple.

Avoid:

- giant AI illustrations
- robot imagery
- dark futuristic themes
- excessive motion
- oversized decorative cards

---

# 5.46 Login Page Visual Style

Keep it extremely simple.

```text
+--------------------------------+
| MPLADS                          |
| Risk Monitoring Portal          |
|                                 |
| Sign in to your account         |
|                                 |
| User ID / Official Email        |
| [________________________]      |
|                                 |
| Password                        |
| [________________________]      |
|                                 |
| CAPTCHA                         |
| [ image ] [ field ]             |
|                                 |
| [ Sign In ]                     |
|                                 |
| Forgot Password                 |
+--------------------------------+
```

It should feel like an official administrative portal.

---

# 5.47 Responsive Design

The system is primarily a desktop government application but must remain usable on smaller screens.

### Desktop

- sidebar
- wide tables
- two-column detail sections

### Tablet

- collapsible sidebar
- reduced columns
- stacked detail blocks

### Mobile

- compact navigation
- stacked content
- horizontal scroll for complex tables
- large touch targets
- simplified future inspection interface

Do not force desktop dashboards into tiny mobile layouts.

---

# 5.48 Accessibility

Target accessible behavior consistent with WCAG 2.1 AA.

Requirements:

- contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (18px+/bold 14px+) and for meaningful UI borders/icons — verify every token pairing in §5.3 against this, not just the primary/background pair
- full keyboard navigation for every interactive element
- visible focus states using `--color-focus`, distinct from hover/selected states
- semantic HTML (real buttons, real form labels, real table markup — not divs styled to look like them)
- every input has an associated, visible label — never placeholder-only
- descriptive button text ("Assign Inspection," not "Submit")
- status never communicated by color alone (§5.4)
- accessible, field-adjacent error messages (§5.36)
- reasonable touch targets (minimum 40×40px) on responsive layouts
- respect `prefers-reduced-motion` for any transition beyond a simple fade/hover

---

# 5.49 Internationalization

**Decision: English-only for MVP.** The PRD does not require multilingual support, and building translation infrastructure now would be scope the product doesn't need (see `rules.md` §21, Scope Control). This is a stated decision, not an oversight.

For forward-compatibility at near-zero cost: avoid concatenating translatable strings from fragments in code, and keep UI text out of image assets. This costs nothing now and avoids a costly rework if multilingual support becomes a real requirement later — it does not mean building a translation-key system now.

---

# 5.50 Charts

Use charts only when they communicate a pattern better than a table.

Good:

- completion trend
- expenditure trend
- risk trend
- state comparison
- agency performance

Every chart should have:

- title
- units
- period
- readable labels
- accessible summary where practical

Do not build a chart simply because data exists.

---

# 5.51 Risk Visualization

Suggested operational levels:

```text
LOW       0–39
MEDIUM   40–74
HIGH     75–100
```

Show:

- score
- level
- contributing signals
- trend where available

The risk score is not a probability of fraud unless a validated model explicitly supports that interpretation.

---

# 5.52 Data Visualization Rules

Always label:

- rupees
- percentages
- dates
- project counts
- days

Use consistent units:

```text
₹ lakh
₹ crore
%
days
```

Do not distort chart scales to exaggerate small differences.

---

# 5.53 Document UI

Documents should be presented as a simple list:

```text
DOCUMENTS

Engineering Report v2
PDF
Uploaded 05 Sep
Uploaded by Engineer

Utilization Certificate
PDF
Uploaded 07 Sep

Inspection Evidence
3 photos
```

Actions:

```text
View
Download
```

Only authorized users can access them.

---

# 5.54 Audit Timeline UI

A timeline is useful for project history:

```text
05 Sep
Engineer submitted engineering report v2

06 Sep
AI analysis updated risk from 63 → 81

07 Sep
District Authority requested clarification

10 Sep
Engineer submitted clarification

12 Sep
Project moved to inspection review
```

Each event should show: actor, role, action, timestamp, reason where applicable.

---

# 5.55 Information Architecture by Role

## MP

```text
My Constituency
 → Recommendations
 → Works
 → Finance
 → Compliance
 → Attention
```

## District

```text
Review
 → Recommendations
 → AI Review
 → Projects
 → Engineering
 → Finance
 → Compliance
 → Inspections
```

## State

```text
Monitor
 → Risk
 → Districts
 → Inspections
 → Agencies (Suitability + Concentration)
 → Trends
```

## Ministry

```text
Supervise
 → National
 → States
 → Systemic Risk
 → Accountability
 → Policy
```

## Agency

```text
Execute
 → Assigned Works
 → Engineering
 → Progress
 → Payments
 → Utilization Certificates
 → Completion
```

## Auditor

```text
Audit
 → Projects
 → Risk History
 → Decisions
 → Inspections
 → Logs
```

## Admin

```text
Administer
 → Users
 → Roles & Jurisdiction
 → System Configuration
```

---

# 5.56 User Preferences / Memory

Kept deliberately minimal — this is a working tool, not a personalized consumer product.

Store, per user, only:

- sidebar collapsed/expanded state
- last-used table filters/sort/page-size per screen (session or lightweight persisted preference)
- theme: not applicable (no dark mode, §5.3)
- language: not applicable (English-only, §5.49)

Do not store: browsing history beyond the above, personal usage analytics, or anything that would make the product feel like it's "learning" the user for personalization purposes. Preferences are UI convenience only and carry zero authorization weight (per `rules.md` §6/§10 — frontend state is never a security boundary).

---

# 5.57 Microcopy Rules

Use formal, direct language.

Prefer:

> Review required

> Request clarification

> Ground verification recommended

> Inspection assigned

> Payment/progress mismatch detected

Avoid:

> Uh-oh!

> Something suspicious!

> AI caught fraud!

> Great job!

The system should sound like a government administrative portal.

---

# 5.58 AI Language Rules

Preferred:

> Possible duplicate work detected.

> Cost is significantly above the comparable peer benchmark.

> Technical deviation identified.

> Ground verification recommended.

> Review recommended.

Avoid:

> This is definitely fraud.

> This person is corrupt.

> The project is fake.

> AI has proved misconduct.

---

# 5.59 AI Recommendation Confirmation

For consequential AI recommendations:

```text
AI Recommendation

Ground verification recommended.

This recommendation is based on:
• progress/payment mismatch
• technical deviation
• reporting gap

The final inspection decision remains with
the authorized authority.

[Review Evidence]
[Assign Inspection]
```

---

# 5.60 Government Branding

Do not invent official seals, emblems or government logos.

Use only:

- approved project branding/assets
- supplied department identity assets
- text-based Ministry identification where appropriate

The product should look official without falsely claiming to be a live government production portal.

---

# 5.61 Iconography

Use a small, consistent icon set.

Useful concepts:

- dashboard
- projects
- finance
- risk
- compliance
- inspection
- documents
- notifications
- profile
- settings

Icons support meaning but should not replace labels.

---

# 5.62 Animation

Keep animation minimal.

Allowed:

- hover
- focus
- dropdown
- drawer
- subtle transition
- loading indicator

Avoid:

- animated dashboards
- moving charts
- bouncing alerts
- particle backgrounds
- artificial AI "thinking" animations that slow the user down

Respect `prefers-reduced-motion` (§5.48).

---

# 5.63 Search and Filtering

Use search only where it improves an operational task.

Project list:

```text
Search project ID / project name

Filter:
District
Category
Status
Risk
Compliance
Agency
Date
```

A general global search is not required for MVP.

---

# 5.64 Responsive Tables

Desktop:

```text
Project | District | Agency | Cost | Risk | Status | Action
```

Mobile:

```text
Project card
   ├── District
   ├── Cost
   ├── Risk
   └── Status
```

Do not reduce table fonts until they become unreadable.

---

# 5.65 Design Tokens (Reference Summary)

All values are defined once, in §5.3 (color), §5.5 (typography), §5.6 (spacing/radius/sizing) — this section exists only as a single lookup table so implementers don't have to hunt across sections.

```text
--color-primary        #1D3A5F
--color-primary-hover  #16304F
--color-secondary      #2B6CB0
--color-background     #F5F6F8
--color-surface        #FFFFFF
--color-text           #1A1D21
--color-muted          #5A616B
--color-border         #D8DCE1
--color-success        #1E7A34
--color-warning        #B8860B
--color-error          #B3261E
--color-info           #2B6CB0
--color-focus          #0B5FFF

--space-1  4px    --space-6  24px
--space-2  8px    --space-8  32px
--space-3  12px   --space-12 48px
--space-4  16px

--radius-sm  4px
--radius-md  8px

--font-size-sm    12–14px
--font-size-base  14–16px
--font-size-md    16–18px
--font-size-lg    20–24px
--font-size-xl    28–32px
```

Team members reuse these values; no screen-specific hex codes, spacing numbers, or font sizes.

---

# 5.66 Reusable Components

Build shared components before duplicating screens:

```text
Header
Sidebar
Breadcrumb
PageHeader
KpiCard
StatusBadge
RiskBadge
ComplianceBadge
DataTable
FilterBar
Modal
ConfirmDialog
FormField
FileUpload
AiReviewPanel
RiskBreakdown
AgencySuitabilityList
AgencyConcentrationChart
Timeline
NotificationItem
EmptyState
ErrorState
LoadingState
```

`ComplianceBadge` and `RiskBadge` are separate components, not variants of one badge, so their distinct visual shape (§5.39) is enforced structurally rather than left to per-screen styling choices.

---

# 5.67 Component Reuse Rule

Before creating something like:

```text
ProjectRiskCardV2
```

check whether existing components can solve it.

Avoid near-duplicate components with slightly different styling.

---

# 5.68 Common Design Patterns

## Create

```text
Page
 ↓
Form
 ↓
Validation
 ↓
Submit
 ↓
Success
```

## Review

```text
Entity
 ↓
Evidence
 ↓
AI analysis
 ↓
Decision
```

## Monitoring

```text
Dashboard
 ↓
Alert
 ↓
Detail
 ↓
Action
```

## Inspection

```text
Risk
 ↓
Recommendation
 ↓
Assignment
 ↓
Inspection
 ↓
Result
```

---

# 5.69 Role-Specific Visual Priority

## MP

```text
Projects
Financial progress
Compliance
Completion
Attention
```

## District

```text
Pending recommendations
AI risk
Compliance
Engineering
Decisions
```

## State

```text
High risk
Inspection
Agency concentration
District comparison
Systemic patterns
```

## Ministry

```text
National trends
Systemic risk
Implementation
Accountability
Policy
```

## Agency

```text
Assigned work
Progress
Payments
Utilization certificates
Required actions
```

## Auditor

```text
History
Decisions
Risk evolution
Inspection
Audit
```

## Admin

```text
User status
System health
Configuration
```

---

# 5.70 Design Do / Don't

| Do | Don't |
|---|---|
| Use clear labels | Use clever labels |
| Use compact information hierarchy | Use oversized cards |
| Use restrained government colors | Use neon/gradient-heavy styling |
| Show risk reasons | Show only a risk number |
| Give compliance results a distinct shape from risk badges | Let a rule-based result look like an AI finding |
| Use tables for operational data | Turn everything into charts |
| Use consistent components | Duplicate UI patterns |
| Show human decision points | Imply AI made the decision |
| Keep navigation predictable | Hide core actions |
| Design desktop-first and responsive | Force tiny desktop tables onto phones |
| Make errors actionable | Show generic errors |
| Give Admin only operational data | Let Admin see risk/audit content |

---

# 5.71 Design Review Checklist

## Visual consistency

- [ ] Same base header across workspaces
- [ ] Same typography
- [ ] Same button system
- [ ] Same status badges (risk shape ≠ compliance shape)
- [ ] Same spacing tokens
- [ ] Same form patterns

## Government feel

- [ ] Simple
- [ ] Professional
- [ ] Restrained
- [ ] No unnecessary decoration
- [ ] No consumer-SaaS styling
- [ ] No exaggerated AI visuals

## Accessibility

- [ ] Keyboard accessible
- [ ] Contrast ≥ 4.5:1 (normal text) / 3:1 (large text, meaningful borders/icons)
- [ ] Labels present on every input
- [ ] Focus states visible and distinct
- [ ] Status not color-only
- [ ] Clear, field-adjacent error messages

## AI

- [ ] AI findings clearly labeled
- [ ] Evidence available
- [ ] Recommendation language calibrated
- [ ] Human decision clearly shown
- [ ] AI failure visible, never silently "low risk"

## Compliance

- [ ] SC/ST quota, timeline, UC status shown where relevant, visually distinct from AI risk
- [ ] Agency suitability and concentration visually distinct from each other

## Roles

- [ ] Admin dashboard/nav contains no risk, decision, or audit content
- [ ] Every role in the PRD has a defined nav + dashboard here

## Data

- [ ] Currency consistently formatted
- [ ] Percentages clearly labeled
- [ ] Dates consistent
- [ ] Tables paginated
- [ ] No unnecessary fields shown

---

# 5.72 Final Design Principle

> **The MPLADS portal should look like a trustworthy government administrative system first and an AI product second.**

AI should make the system **smarter**, not visually louder.

The ideal feeling is:

```text
Simple
   +
Official
   +
Clear
   +
Evidence-driven
   +
Action-oriented
```

A government official should be able to open the system and immediately understand:

> **What is happening?**

> **What needs my attention?**

> **Why is it flagged?**

> **What evidence supports it?**

> **What action can I take?**

That is the design standard for the entire product.
