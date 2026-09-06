# docs/decisions/project-log.md — TEAM PROJECT LOG

This is the team's shared history — decisions made, why, and what was happening at each point. It is **not** the product specification (that's `prd.md`/`architecture.md`/`rules.md`/`design.md`/`memory.md`/`phases.doc.md`) and it is **not** the product's memory system (that's `memory.md`). This file exists so a new team member can understand why the project looks the way it does without reconstructing the conversation from scratch.

Update this file when a meaningful decision changes. Do not use it as a substitute for the actual specification documents — if something here conflicts with `architecture.md`, `architecture.md` wins, and this entry should be marked superseded.

---

## Decision Log

| Date | Decision | Reason | Impact | Owner |
|---|---|---|---|---|
| 2026-09-05 | Use MERN as primary application stack | Team is already building the application using React/Node/Express/MongoDB and wants a consistent implementation path | Frontend/backend/database responsibilities remain clear | Team |
| 2026-09-05 | Use one common MPLADS portal with role-specific workspaces | All stakeholders belong to the same system but have different responsibilities | One landing/login experience; post-login route and permissions depend on role | Team |
| 2026-09-05 | Use centralized MongoDB with separate collections | AI needs connected historical information, but data domains should not be mixed | Shared IDs connect collections such as projects, engineering, payments, risk and inspections | Team |
| 2026-09-05 | `project_id` is the primary project lifecycle link | All project-related information must refer to the same work | Recommendation, engineering, progress, payments, risk, inspection and decisions remain connected | Team |
| 2026-09-05 | Keep `mp_allocation` separate from project/work data | Allocation and work-level information represent different domains | Allocation CSV remains clean and project intelligence uses separate collections | Team |
| 2026-09-05 | Preserve the original MP recommendation separately | Engineer reports may change length, width, material, quantity or cost | AI can compare original recommendation against later technical/execution records | Team |
| 2026-09-05 | Preserve progress history instead of overwriting | Risk analysis needs the project timeline | Every progress update is stored separately | Team |
| 2026-09-05 | Use Python for numerical/statistical AI | Calculations should be deterministic and reproducible | Cost anomaly, similarity and delay analysis are not delegated blindly to an LLM | Team |
| 2026-09-05 | Gemini API is the current LLM provider | The prototype currently uses Gemini | Current implementation remains usable while the AI layer stays provider-independent | Team |
| 2026-09-05 | Keep AI provider behind an abstraction/gateway | Future deployment may require local AI | Gemini can later be replaced/supplemented by Ollama/local models | Team |
| 2026-09-05 | Use n8n for automation, not core authorization | n8n is good for workflows but should not become the backend | Scheduled monitoring, alerts, escalation and inspection automation are handled by n8n | Team |
| 2026-09-05 | Synchronous District AI review should not depend on n8n | Critical user interactions should be reliable and fast | Express can call Python AI directly; n8n handles background work | Team |
| 2026-09-05 | AI findings are advisory | Anomaly does not prove fraud | Human authority remains responsible for action | Team |
| 2026-09-05 | Separate project risk from MP attention | A project requiring review is not the same as an MP being suspicious | MP attention is a derived indicator, not an independent fraud score | Team |
| 2026-09-05 | Agency suitability and agency concentration are separate | Recommending an experienced agency can create a feedback loop | Suitability must be checked against concentration patterns | Team |
| 2026-09-05 | Use risk to prioritize the existing annual physical-inspection capacity | AI should improve inspection targeting rather than invent a new legal process | High-risk works become a priority list for authorized officials | Team |
| 2026-09-05 | Real and synthetic data must remain distinguishable | SIH testing may require controlled anomaly examples | Every record/dataset must contain source/provenance metadata | Team |
| 2026-09-06 | Government-style UI is preferred | Primary users are government officials, not consumers | UI should be simple, restrained, professional and information-first | Team |
| 2026-09-06 | Landing page is the starting implementation task | Users/judges need to understand the problem before the dashboard | Common landing page explains problem → solution → AI → workflow → trust | Team |
| 2026-09-06 | Sign-in page follows the provided government-style pattern | The supplied reference is appropriate for official users | User ID/Official Email + Password + CAPTCHA + Sign In + Forgot Password | Team |
| 2026-09-06 | PRD revised: added SC/ST quota tracking, UC tracking, agency concentration analytics, explicit 1%-inspection framing | Initial PRD draft was missing requirements clearly implied by the problem statement | See `prd.md` §26 Changelog | Team |
| 2026-09-06 | Architecture revised: added document/file storage, concrete API catalog, AI data-minimization rule; downgraded duplicate detection from Atlas Vector Search to in-process similarity for MVP | Initial architecture draft had real implementation gaps and one overengineered component | See `architecture.md` §30 Changelog | Team |
| 2026-09-06 | Rules revised: added Frontend Rules, AI Coding Agent Rules, Logging vs. Audit distinction, explicit Scope Control, Definition of Done | Initial rules draft was strong on backend/architecture rules but had no frontend or agent-specific guidance | Team |
| 2026-09-06 | Design system revised: resolved color tokens to actual hex values, added Admin nav/dashboard, added compliance-status UI pattern distinct from AI risk | Initial design draft left several placeholders unresolved and omitted the Admin role entirely | Team |
| 2026-09-06 | Memory system rescoped from a team-history document to an actual product-memory specification | The original `memory.md` was solving a different problem (team continuity) than the document is meant to answer (what the running app may persist) | This history moved here, to `docs/decisions/project-log.md` | Team |
| 2026-09-06 | Phases document revised: fixed dependency gaps (Admin user management, `users` collection before auth, AI Gateway as an explicit task) and added missing exit-checklist items | Full-project audit found several silent dependency assumptions | See `phases.doc.md` | Team |
| 2026-09-06 | Full cross-document audit performed; canonical project/inspection lifecycle states formalized in `architecture.md` (previously only implicit in `phases.doc.md`); `README.md` and this log created | Project-wide consistency pass ahead of implementation | See audit report | Team |

---

## Historical Context (superseded by current specification, kept for reference)

The sections below describe understanding at earlier points in the project. Where they conflict with the current `prd.md`/`architecture.md`, the current documents are authoritative.

### What we set out to build

A government decision-support and monitoring platform for MPLADS — not simply a dashboard, but a continuous intelligence loop:

```text
MPLADS Data → Centralized Historical Memory → AI / Analytics → Anomaly / Risk
   → Explanation → Official Review → Decision / Inspection → Ground Result
   → Historical Memory → Future Comparison
```

### Why

The original PS 26102 asks for an AI-powered system that can analyze MPLADS fund utilization and project execution to identify anomalies, unusual patterns, potential fraud indicators, inefficiencies, cost overruns, duplicate works, delayed projects, execution deviations, and non-compliance — and provide risk-based alerts, decision-support dashboards, automated compliance monitoring, and early-warning mechanisms.

### Central idea

> MPLADS data already exists; our value is connecting it and making it continuously comparable.

### Product boundaries (unchanged — now formalized in `prd.md`/`rules.md`)

AI compares, detects anomalies, calculates/receives risk signals, explains findings, summarizes evidence, and recommends review, agency suitability, and field verification. AI never declares fraud or guilt, sanctions, rejects, stops payments, automatically assigns an agency, or automatically orders an inspection or raid.

> **AI Recommends. Officials Decide.**
