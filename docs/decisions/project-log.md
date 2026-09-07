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

---

## Phase Status Tracker

### Phase 1: Foundation, Portal Shell & Landing Page
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Implementation plan created and approved.
  - Proposed repo/folder structure scaffolding (`frontend/`, `backend-node/`, `ai-service/`, `n8n/`, `data/real/`, `data/synthetic/`, `tests/`).
  - Backend Express foundation, configuration, request logging, centralized safe error handling, and health check endpoint (`/api/health`).
  - `users` collection Mongoose schema & MongoDB JSON schema validation rules with 7 canonical roles and conditional jurisdiction requirements.
  - Automated backend tests for health check, 404, invalid JSON handling, and user validation rules (11 passing tests).
  - React frontend foundation with strict design tokens (`tokens.css`), global styles, and reusable shell components (Header, Sidebar, Button, Badge, Card, Table).
  - Public landing page implementing the 10-section structure from `design.md` §5.45 with honest AI framing and government visual language.
  - Frontend production build verified (`vite build` completed with 0 errors).
  - Full automated test suite (37 passing tests across backend and frontend token verification).
  - `.gitignore` configured to guarantee `.env` and `node_modules` are never committed.
- **Not done / remaining**:
  - None (Phase 1 foundation complete and verified; ready for Phase 2: Authentication & RBAC).
- **Notes**:
  - Phase 1 strictly avoided premature authentication logic and business data models per `phases_doc.md` and `rules.md`. All auth logic is deferred to Phase 2, and domain data models to Phase 3.

### Phase 2: Login, Authentication, Role-Based Access & Admin User Management
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Implementation plan created, reviewed, and approved.
  - Backend auth endpoints implemented in `backend-node/src/routes/auth.js`:
    - `GET /api/auth/captcha`: Stateless HMAC-SHA256 visual SVG challenge generator and validator.
    - `POST /api/auth/login`: User ID / Official Email lookup, bcrypt verification (cost factor 12), rate limiting (`express-rate-limit`), account lockout enforcement (5 attempts, 15m), and short-lived JWT access token + refresh token issuance.
    - `POST /api/auth/refresh`: Cryptographic refresh token rotation and session refresh.
    - `POST /api/auth/logout`: Safe server-side logout acknowledgement.
    - `POST /api/auth/forgot-password`: Constant-time uniform message dispatch, SHA-256 token hashing.
    - `POST /api/auth/reset-password`: Token verification and password update.
    - `GET /api/auth/me`: Authenticated session profile endpoint.
  - Server-side RBAC & Jurisdiction middleware in `backend-node/src/middleware/auth.js` (`authenticate`, `authorize`, `requireJurisdiction`).
  - Admin User Management API in `backend-node/src/routes/adminUsers.js`:
    - Strict Admin Isolation (`design.md` §5.32, `rules.md` §10): Admin routes manage user accounts and system configuration only. Never expose risk scores, decisions, or audit trail content.
    - Paginated list (`GET /api/admin/users`), user creation with jurisdiction hierarchy validation (`POST /api/admin/users`), detail inspection (`GET /api/admin/users/:userId`), profile updates (`PATCH /api/admin/users/:userId`), and activation/deactivation (`PATCH /api/admin/users/:userId/status`).
    - Excludes `password_hash` and `password_reset_token` from all API responses.
  - Default user account seeder in `backend-node/src/utils/seedUsers.js`: Seeds 7 default role accounts on connect if empty (`USR-MP-01`, `USR-DIST-01`, `USR-AGENCY-01`, `USR-STATE-01`, `USR-MINISTRY-01`, `USR-AUDITOR-01`, `USR-ADMIN-01`).
  - Frontend authentication architecture in `frontend/src/context/AuthContext.jsx` with automatic token attachment, session persistence, and 401 handling.
  - Dedicated login page in `frontend/src/pages/LoginPage.jsx` adhering to `design.md` §5.46 with Gov of India/MoSPI branding, SVG CAPTCHA challenge, password visibility toggle, statutory security notice (IT Act 2000), and prototype quick-fill credentials.
  - Role-based routing in `frontend/src/components/ProtectedRoute.jsx` and `App.jsx` using `react-router-dom`.
  - Minimal workspace shells for all 7 platform roles:
    - MP (`/mp/*`), District Authority (`/district/*`), Implementing Agency (`/agency/*`), State Nodal Authority (`/state/*`), Ministry (`/ministry/*`), Auditor (`/auditor/*`), Admin (`/admin/*`).
  - Admin User Management UI in `frontend/src/workspaces/AdminUserManagement.jsx` with user registry table, search & role filters, pagination, user provisioning modal with jurisdiction hierarchy validation, status deactivation modal, and prominent Admin Isolation security banner.
  - Unauthorized Access (403 Forbidden) page in `frontend/src/pages/UnauthorizedPage.jsx`.
  - Automated test suite expanded to 48 passing tests (16 backend, 32 frontend) covering health, authentication, lockout, password reset, CAPTCHA, RBAC, admin user management, design tokens, and Admin Isolation.
  - Vite production build verified (`npm --prefix frontend run build` completed in ~1s with 0 errors).
- **Not done / remaining**:
  - None (Phase 2 complete and verified; ready for Phase 3: Core Business Domain, Recommendation Engine & Deterministic Rule Engine).
- **Notes**:
  - Zero domain collections (`projects`, `allocations`, `risk`, `inspections`, `audit_logs`) were created in Phase 2 per boundary rules. Only the existing `users` collection is used. Express acts as the sole authorization boundary.

### Phase 3: Centralized Domain Data Model
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Implementation plan created, reviewed, and approved.
  - Append-only immutability plugin created in `backend-node/src/models/plugins/appendOnlyPlugin.js`:
    - Enforces write-once / append-only invariants on historical records (`pre('save')` on existing docs, `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `findOneAndRemove`).
  - Created Mongoose schemas and models for all 21 central domain collections in `backend-node/src/models/`:
    - Financial & Allocation Domain: `mp_allocation`, `fund_utilization`, `work_completion`, `completion_rates`.
    - Project Lifecycle Domain: `projects`, `project_recommendations` (append-only), `engineering_reports` (append-only), `project_progress` (append-only), `project_payments` (append-only), `utilization_certificates` (append-only).
    - Agency Domain: `implementing_agencies`, `agency_performance`, `agency_concentration`.
    - Reference Domain: `sc_st_area_reference`.
    - AI & Risk Domain: `ai_risk_flags` (append-only), `ai_risk_scores`, `ai_analysis_history` (append-only).
    - Inspection & Governance Domain: `inspections`, `officer_decisions` (append-only), `notifications`, `audit_logs` (append-only), `user_preferences`, `documents` (append-only).
    - Central barrel export `backend-node/src/models/index.js` exporting all models and canonical enums (`PROJECT_STATUS`, `INSPECTION_STATUS`, `RISK_LEVEL`, etc.).
  - MongoDB database-level validation schemas created in `backend-node/src/models/schemas/`:
    - `mpAllocationMongoSchema.json`
    - `projectMongoSchema.json`
    - `inspectionMongoSchema.json`
    - `auditLogMongoSchema.json`
  - Idempotent real government data loader implemented in `backend-node/src/utils/loadMpAllocation.js` and standalone CLI script `backend-node/scripts/loadAllocations.js`:
    - Parses `data/real/mplads_allocated_clean.csv`.
    - Skips invalid row 108 (missing amount) with clear logging.
    - Generates stable compound MP IDs (`MP-${state}-${constituency}-${srNo}`) guaranteeing uniqueness and idempotency across repeated loads.
    - Successfully loaded 542 real government MP allocation records with `is_real_government_data: true`.
    - Integrated automatic seeding in `backend-node/server.js` on startup when collection is empty.
  - Multi-document ACID transaction helper implemented in `backend-node/src/utils/transaction.js` (`withTransaction` with graceful standalone MongoDB fallback).
  - Minimal read-only allocation API endpoints implemented in `backend-node/src/routes/allocations.js`:
    - `GET /api/allocations`: Paginated allocation records with search by MP name, constituency, or state.
    - `GET /api/allocations/:mpId`: Retrieve single MP allocation record by MP ID.
  - Automated test suites expanded to 59 passing tests across 7 suites:
    - Added `tests/backend/domainModels.test.js` (schema validations, enum restrictions, status lifecycle, append-only write/delete rejection).
    - Added `tests/backend/allocationLoader.test.js` (real CSV ingestion, row 108 skip, idempotency, pagination, constituency search, 404 handling).
    - Updated `package.json` with `npm run load:allocations` script and integrated tests into `tests/runAll.js`.
- **Not done / remaining**:
  - None (Phase 3 complete and verified; ready for Phase 4: Core Dashboards, Project Lifecycle & User Preferences).
- **Notes**:
  - `mp_attention_scores` is intentionally NOT created as a collection. Per `architecture.md` and `rules.md`, MP attention is a derived indicator computed on-the-fly or cached in a materialized view, not a standalone database collection or fraud score.
  - Shared IDs (`mp_id`, `project_id`, `agency_id`, `inspection_id`, `user_id`) connect domain collections without premature coupling.

### Phase 4: Core Dashboards, Project Lifecycle & User Preferences
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Implementation plan created, reviewed, and approved.
  - Backend project lifecycle endpoints in `backend-node/src/routes/projects.js`:
    - `POST /api/projects/recommendation`: MP recommendation creation atomically creating `projects`, write-once `project_recommendations`, and `audit_logs` in `withTransaction`. Initial status `DISTRICT_REVIEW`.
    - `GET /api/projects`: Paginated, scoped project listing with role and geographic jurisdiction filtering (`MP` sees own, `DISTRICT_AUTHORITY` sees district, `STATE_NODAL_AUTHORITY` sees state, `ADMIN` receives 403 Forbidden per Admin Isolation).
    - `GET /api/projects/:projectId`: Scoped project detail view with original recommendation and decision audit trail.
    - `PATCH /api/projects/:projectId/decision`: Authorized administrative decisions (`SANCTION`, `HOLD`, `REQUEST_CLARIFICATION`, `MARK_IN_PROGRESS`, `MARK_COMPLETED`) enforcing mandatory substantive reasons (min 5 chars), status transition guards, and creating append-only `officer_decisions` and `audit_logs` in `withTransaction`.
  - Role-based dashboard aggregation endpoints in `backend-node/src/routes/dashboard.js`:
    - `GET /api/dashboard/mp`: Constituency overview with real allocation from `mp_allocation`, project counts, financial totals, and derived runtime `mp_attention_scores` (empty-safe, no stored collection).
    - `GET /api/dashboard/district`: District Collector review queue, workload counts, and 10% statutory physical inspection tracking.
    - `GET /api/dashboard/state`: State Nodal Authority multi-district rollups and 1% inspection tracking.
    - `GET /api/dashboard/ministry`: National pan-India overview, state breakdown, and aggregate outlay.
    - `GET /api/dashboard/agency`: Assigned execution works and status breakdown.
    - `GET /api/dashboard/auditor`: Read-only audit indicators and decision log.
    - `GET /api/dashboard/admin`: System telemetry (status, uptime, database state, memory) and user counts only. Strict Admin Isolation (zero risk/decisions/audit content).
  - User Preferences in `backend-node/src/routes/userPreferences.js` and `backend-node/src/models/UserPreference.js`:
    - Extended `UserPreference` schema with `sidebar_collapsed` and `custom_settings`.
    - `GET /api/user/preferences`: Retrieve user preferences with system defaults.
    - `PATCH /api/user/preferences`: Non-blocking persistence for `sidebar_collapsed`, `table_page_size`, and custom settings for authenticated user.
  - Frontend Workspace upgrades across all 7 platform roles in `frontend/src/workspaces/`:
    - `MPWorkspace.jsx`: Real government allocation card (₹14.70 Cr Indore), "+ Recommend New Work" modal, "My Recommendations" table, and derived attention card.
    - `DistrictWorkspace.jsx`: Pending review queue, "Review & Decide" modal with Sanction / Hold / Clarification actions and mandatory reason field, filterable projects inventory table.
    - `StateWorkspace.jsx`, `MinistryWorkspace.jsx`, `AgencyWorkspace.jsx`, `AuditorWorkspace.jsx`, `AdminWorkspace.jsx`: Real dashboard metrics, canonical status badges, and isolation notices.
    - `PreferencesContext.jsx` and `WorkspaceLayout.jsx`: Persistent sidebar collapse state and table page sizing without blocking render.
    - Canonical `StatusBadge` styling preserved per `design.md` §5.39 (`MP_RECOMMENDED`, `DISTRICT_REVIEW`, `CLARIFICATION_REQUIRED`, `HELD`, `SANCTIONED`, `IN_PROGRESS`, `COMPLETED`).
  - Test suites:
    - `tests/backend/projectLifecycle.test.js`: Lifecycle creation, jurisdiction boundaries, decision transitions, reason enforcement, and admin isolation.
    - `tests/backend/dashboardAndPreferences.test.js`: Role dashboards, derived attention, admin isolation, and user preferences persistence.
    - `tests/frontend/phase4Workspaces.test.js`: Workspace component rendering, canonical badges, and preferences context.
    - Updated `tests/runAll.js` runner with all Phase 4 suites.
    - Frontend production build verified (`vite build` clean in ~1s with 0 errors).
    - Manual verification on user machine completed and confirmed: MP created recommendation -> District reviewed & sanctioned -> District metrics updated -> Admin isolation verified.
- **Not done / remaining**:
  - None (Phase 4 complete and verified; ready for Phase 5: Project Management, Engineering, Progress, Payments & Documents).
- **Notes**:
  - Seed test passwords synchronized in `seedUsers.js` (`ADMIN001 / Admin@12345`, `MP-IND-01 / MpPass@12345`, `DA-IND-01 / Collector@12345`).
  - Admin Isolation verified: System Administrator has zero access to project business data, AI risk scores, official decisions, or audit trail content.

### Phases 1–4 Documentation Compliance Audit
- **Date**: 2026-09-07
- **Audit Verdict**: **ON TRACK** (Zero critical architectural gaps; 79/79 automated tests passing across 10 suites; frontend build clean)
- **Scope Audited**: Phases 1–4 against `phases_doc.md`, `architecture.md`, `design.md`, `rules.md`, `memory.md`, and `prd.md`.
- **Summary of Findings**:
  - **Phase 1 (Foundation)**: Design tokens, shell components, landing page (`design.md` §5.45), `users` schema, health check, centralized error handler, and standardized API response envelope (`rules.md` §8) verified.
  - **Phase 2 (Auth & RBAC)**: Login, bcrypt hashing, JWT access/refresh rotation, server-side SVG CAPTCHA, 5-attempt account lockout, password reset, 7 role workspaces, and Admin user management verified. Express serves as the sole authorization boundary.
  - **Phase 3 (Domain Data Model)**: 23 collections/models established, write-once append-only plugin enforced, canonical status enums intact, 542 real MP allocation records loaded with `is_real_government_data: true`, and `mp_attention_scores` confirmed as a runtime-derived view rather than a stored collection.
  - **Phase 4 (Lifecycle & Dashboards)**: Canonical project state transitions (`DISTRICT_REVIEW → SANCTIONED / HELD / CLARIFICATION`), mandatory 5-character reason enforcement, write-once `officer_decisions` and `audit_logs`, jurisdiction-scoped dashboards for all 7 roles, non-blocking `user_preferences`, and strict Admin Isolation across backend and frontend verified.
- **Readiness**: Repository is clean, stable, and ready to proceed to **Phase 5: Project Management, Engineering, Progress, Payments & Documents**. Phase 5 has NOT been started.










