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
- **Readiness**: Repository is clean, stable, and ready to proceed to **Phase 5: Project Management, Engineering, Progress, Payments & Documents**.

### Phase 5: Project Management, Engineering, Progress, Payments & Documents
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
  - Multipart document upload & storage infrastructure:
    - Installed `multer` dependency in `backend-node`.
    - Added `uploads/` and `*/uploads/` to `.gitignore`.
    - Configured `uploadDir` and `maxFileSizeMb` (default 10MB) in `config/env.js`.
    - Implemented `backend-node/src/middleware/upload.js` with disk-based storage outside MongoDB, MIME type filtering (PDF, PNG, JPEG, WEBP), and automatic SHA-256 cryptographic checksum hashing.
  - Data models & immutability extensions:
    - Enhanced `appendOnlyPlugin.js` with `options.allowedUpdateFields` to support controlled administrative transitions on payments while strictly blocking mutations to financial amounts, installments, or project IDs, and preventing document/record deletion.
    - Updated `ProjectPayment.js` with permitted update fields (`status`, `approved_by`, `payment_date`, `sanction_order_ref`, `voucher_number`).
    - Added `'PROGRESS'` and `'DOCUMENT'` to `AUDIT_ENTITY_TYPES` in `AuditLog.js`.
    - Synchronized `AG-PWD-01` password in `seedUsers.js` (`Agency@12345`).
  - Backend project management & sub-resource endpoints in `backend-node/src/routes/projects.js`:
    - `POST /api/projects/:projectId/engineering-reports`: Submits detailed project report versions (`v1`, `v2`, ...) with monotonic version incrementing, detailed estimates, technical sanction references, vetting agency, and audit log.
    - `GET /api/projects/:projectId/engineering-reports`: Lists versioned engineering reports in chronological order.
    - `POST /api/projects/:projectId/progress`: Appends physical progress records (`percent_complete` 0–100, stage milestones, remarks), automatically transitions project status to `IN_PROGRESS`, and records audit log.
    - `GET /api/projects/:projectId/progress`: Retrieves historical progress timeline.
    - `POST /api/projects/:projectId/payments`: Raises payment installments (`installment_number`, `amount`, initial status `PENDING`, `voucher_number`, description).
    - `GET /api/projects/:projectId/payments`: Lists payment installments with status.
    - `PATCH /api/projects/:projectId/payments/:paymentId`: District Authority (`DISTRICT_AUTHORITY`) decision endpoint to `APPROVE` or `REJECT` pending payments with mandatory substantive reason (min 5 chars), jurisdiction check, and append-only `officer_decisions` & `audit_logs`.
    - `POST /api/projects/:projectId/utilization-certificates`: Files Utilization Certificates (UC) linked to payments or projects with certified amount and audit log.
    - `GET /api/projects/:projectId/utilization-certificates`: Lists filed and draft UCs.
    - `POST /api/projects/:projectId/documents`: Multipart file upload storing binary on disk, persisting metadata and SHA-256 hash in DB, and recording audit log.
    - `GET /api/projects/:projectId/documents`: Lists project document metadata.
    - Upgraded `GET /api/projects/:projectId`: Project 360 data envelope returning project metadata, initial recommendation, decisions audit, engineering versions, progress timeline, payment installments, UCs, and document metadata. Strict Admin Isolation (403 `ADMIN_ISOLATION`).
  - Controlled document streaming & download API in `backend-node/src/routes/documents.js`:
    - `GET /api/documents/:documentId/download`: Authorized file streaming endpoint validating JWT, role, and jurisdiction scope.
    - Enforces strict Admin Isolation (403 `ADMIN_ISOLATION`) per `rules.md` §10.
    - Blocks static or unauthenticated access.
  - Frontend components & workspace integrations:
    - Created `frontend/src/components/ProjectDetailModal.jsx`: Comprehensive 6-tab Project 360 modal (Overview & MP Recommendation, Engineering DPR Versions, Physical Progress Timeline, Disbursements & Payments, UCs & Controlled Documents, Administrative Audit Trail). Includes role-scoped action triggers (DPR submission, progress logging, payment raising, UC filing, document upload, and District Authority payment approval/rejection modal).
    - Updated `frontend/src/context/AuthContext.jsx`: Improved `authFetch` to preserve `FormData` multipart boundary headers without forcing `Content-Type: application/json`.
    - Updated `frontend/src/workspaces/AgencyWorkspace.jsx`: Added "Manage 360°" action buttons to assigned works table and integrated `ProjectDetailModal` for executing agency workflows.
    - Updated `frontend/src/workspaces/DistrictWorkspace.jsx`: Added "View 360°" action button to project table and integrated `ProjectDetailModal` with live payment approval workflow.
    - Updated `frontend/src/workspaces/MPWorkspace.jsx`: Replaced basic view modal with `ProjectDetailModal` for full Project 360 visibility.
  - Automated tests & verification:
    - Added `tests/backend/projectManagementPhase5.test.js`: 9 backend integration tests covering engineering version history, estimate validation, progress logging, payment installment creation, payment approval by DA with reason, cross-jurisdiction rejection, UC filing, multipart upload with SHA-256, secure streaming download with Admin 403, and complete Project 360 aggregation.
    - Added `tests/frontend/phase5ProjectDetail.test.js`: 6 frontend tests covering component exports, 6 Project 360 tabs, API connections, and workspace integrations.
    - Unified test runner `npm test`: **94/94 tests passing** across all 12 suites (100% green).
    - Frontend build verified: `npm --prefix frontend run build` completed cleanly in ~2s with zero errors.
- **Not done / remaining**:
  - None (Phase 5 complete and verified; ready for Phase 6: Deterministic Rule Engine, Invariants & Discrepancy Detection).
  - Notes on Agency Assignment & Phase 5 Flow:
    - `seedUsers.js` synchronized with `district: 'Indore'`, `state: 'Madhya Pradesh'`, and `agency_id: 'PWD-INDORE-01'` for `AG-PWD-01`.
    - Automatically assigned `implementing_agency_id: 'PWD-INDORE-01'` on `SANCTION` decisions and backfilled existing sanctioned Indore works in database.
    - Updated `DistrictWorkspace.jsx` Review modal with an explicit "Assign Implementing Agency" selector on sanction.
    - Updated `GET /api/dashboard/agency` and `GET /api/projects` to query both `agency_id`, `user_id`, and active sanctioned works within the agency's district.
    - Resolved progress stage validation in `projects.js` and `ProjectDetailModal.jsx` to map canonical stages (`FOUNDATION`, `SUPERSTRUCTURE`, etc.) and support remarks/physical_summary fallback.
    - Live verified end-to-end: `AG-PWD-01` sees assigned works on dashboard, opens Project 360 modal, submits DPR v1, logs physical progress (auto-transitions to `IN_PROGRESS`), raises payment installment, files UC, and uploads multipart documents with authorized download.

### Phase 6: Compliance & Deterministic Monitoring
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - 7 deterministic rules (pure function, zero AI / LLM dependencies):
    - `REQUIRED_FIELDS` (mandatory fields & scheme eligibility per MPLADS guidelines)
    - `DOC_COMPLETENESS` (DPR and technical estimate presence for sanctioned works)
    - `UC_OVERDUE` (utilization certificate overdue tracking against 90-day CAG norm)
    - `PAYMENT_PROGRESS_MISMATCH` (financial disbursement vs physical progress gap tracking at 20% and 40% thresholds)
    - `COST_DRIFT` (latest engineering DPR estimate vs approved outlay at 10% and 25% thresholds)
    - `STALLED_PROGRESS` (timeline and progress staleness at 90-day and 180-day thresholds)
    - `SC_ST_MIX` (continuous statutory earmarking evaluation against 15% SC and 7.5% ST quotas)
  - Compliance APIs mounted at `/api/compliance`:
    - `POST /api/compliance/evaluate/:projectId` (on-demand evaluation and findings persistence to `compliance_findings`)
    - `GET /api/compliance/project/:projectId` and plural alias `GET /api/compliance/projects/:projectId` (project compliance details)
    - `GET /api/compliance/sc-st-status/:mpId` and `GET /api/compliance/mp` (continuous MP SC/ST quota evaluation)
    - `GET /api/compliance/district` (in-jurisdiction compliance review queue for District Authorities)
    - `GET /api/compliance/dashboard` (role-scoped compliance statistics and aggregated metrics)
  - Project 360 summary:
    - Integrated compliance findings and `overall_status` (`COMPLIANT`, `REVIEW_REQUIRED`, `NON_COMPLIANT`) directly into `GET /api/projects/:projectId` payload
    - Added dedicated endpoint alias `GET /api/projects/:projectId/compliance`
  - SC/ST continuous check:
    - Demographic baseline census seeder for 14 MP constituencies in `backend-node/src/utils/seedScStReference.js` (`sc_st_area_reference` collection)
    - `scStEvaluator.js` continuously computes SC and ST recommendation percentages against 15% and 7.5% statutory earmarking norms
  - District queue:
    - Dedicated district-level compliance queue returning non-compliant and review-required projects within jurisdiction
  - Admin isolation:
    - Strict 403 `ADMIN_ISOLATION` response on all `/api/compliance/*` routes per `rules.md` §10
    - Enforced cross-jurisdiction 403 `FORBIDDEN_JURISDICTION` boundaries for non-authorized collectors
  - runAll integration:
    - `tests/backend/complianceRules.test.js` added to `tests/runAll.js`
    - Full test suite verified via `npm test`: **111/111 tests passing across 13 suites** (100% green, 0 failures)
- **Not done / remaining**:
  - None (Phase 6 complete and verified).
- **Notes**:
  - Deterministic findings are strictly separated from AI risk scoring. All compliance states use `ComplianceBadge` (`COMPLIANT`, `REVIEW_REQUIRED`, `NON_COMPLIANT`) with square/dot visual markers, never `RiskBadge` pill badges. No ML or LLM models used.

### Phase 7: n8n Automation & Background Workflows
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Internal service authentication middleware (`authenticateService` in `backend-node/src/middleware/serviceAuth.js`):
    - Validates `X-Service-Token` or `Authorization: Bearer <token>` against `config.n8nServiceToken` (timing-safe comparison) or valid JWT with `role: 'SERVICE'`.
    - Strict boundary enforcement: Service identity cannot access officer transactional endpoints (`PATCH /api/projects/:id/decision`) and cannot create MP recommendations.
    - Admin Isolation maintained: Regular admin tokens cannot access `/api/internal/*` without service credentials.
    - Production env constraint: `N8N_SERVICE_TOKEN` and `N8N_WEBHOOK_SECRET` require real env in production, weak defaults for development/test only; `.env.example` contains placeholders only.
  - Internal service endpoints (`backend-node/src/routes/internal.js` mounted at `/api/internal`):
    - `GET /api/internal/status`: System and automation health telemetry (uptime, database connection, internal API status).
    - `POST /api/internal/ingestion/allocations`: Triggers idempotent CSV allocation data loader (`loadMpAllocation`), tags `is_real_government_data: true`, returns counts.
    - `GET /api/internal/projects/active`: Retrieves active works (`DISTRICT_REVIEW`, `SANCTIONED`, `IN_PROGRESS`) with pagination and jurisdiction filtering.
    - `POST /api/internal/compliance/evaluate-batch`: Evaluates compliance in batch using Phase 6 deterministic engine and returns categorized results summary (`COMPLIANT`, `REVIEW_REQUIRED`, `NON_COMPLIANT`).
    - `POST /api/internal/notifications`: Creates server-validated notifications in `notifications` collection with role/jurisdiction routing. Added `COMPLIANCE_ALERT` and `ESCALATION` to `NOTIFICATION_TYPES`.
    - `POST /api/internal/escalations`: Multi-level governance alert dispatching notifications to District Authority, State Nodal Authority, and Ministry.
    - `POST /api/internal/inspections/recommend`: Advisory recommendation shell creating `RECOMMENDED` inspection records in `inspections` collection (does not auto-assign or auto-close).
  - n8n Workflow definitions & documentation in `n8n/`:
    - `README.md`: Architecture boundaries, local CLI/Docker setup, credential configuration (`Header Auth: X-Service-Token`), workflow import steps, and stop n8n verification guide.
    - `workflows/workflow-1-data-ingestion.json`: `MPLADS — Data Ingestion` (Webhook/manual trigger -> Express API -> result logging).
    - `workflows/workflow-2-scheduled-compliance-monitor.json`: `MPLADS — Scheduled Compliance Monitor` (Cron trigger -> active works -> evaluate batch -> violation analysis). AI risk engine integration clearly stubbed for Phase 9.
    - `workflows/workflow-3-notifications-router.json`: `MPLADS — Notifications Router` (Webhook trigger -> payload formatting -> Express API).
    - `workflows/workflow-4-escalation-handler.json`: `MPLADS — Escalation Handler` (Webhook trigger -> multi-tier threshold evaluation -> Express API).
    - `workflows/workflow-5-inspection-recommendation-shell.json`: `MPLADS — Inspection Recommendation Shell` (Webhook trigger -> advisory inspection recommendation shell).
  - Test suites & verification:
    - Added `tests/backend/internalServiceAndAutomation.test.js` (15 comprehensive tests covering token validation, 401 on missing/invalid credentials, role isolation, ingestion idempotency, batch compliance, notification validation, escalation multi-tier routing, inspection shell, and core path independence).
    - Added to `tests/runAll.js`.
    - `npm test` runs **126/126 passing tests across 14 suites** (100% green, 0 failures).
    - Core path independence verified: MP recommend -> District sanction -> compliance evaluate -> Project 360 all execute synchronously without n8n running.
- **Not done / remaining**:
  - None (Phase 7 complete and verified).
- **Notes**:
  - n8n is strictly background automation; never authentication, RBAC, primary DB, or final decision authority.
  - Zero direct MongoDB connections from n8n nodes; all mutations occur via Express service endpoints.
  - AI risk engine integration hooks stubbed with comments for Phase 9.

### Phase 8: Core AI — Historical Intelligence
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Stateless Python AI Analytics Microservice (`ai-service/` with FastAPI):
    - `POST /ai/cost-anomaly` (AI-01): Non-parametric statistical benchmarking (median, Q1, Q3, IQR, deviation percentage) with statistical upper fence outlier evaluation. Handles `INSUFFICIENT_DATA` when fewer than 2 peers exist.
    - `POST /ai/duplicate-check` (AI-02): In-process TF-IDF vectorization and cosine similarity over project titles, descriptions, and geographic/ward tokens. Strictly zero external vector databases or Atlas Vector Search per architecture ADR 26.3.
    - `POST /ai/spec-comparison` (AI-03): Technical sanction estimate vs original recommended outlay drift percentage and scope lexical analysis.
    - `POST /ai/delay-check` (AI-04): Rules-first execution delay and progress staleness analysis (90-day and 180-day thresholds, overdue sanction timeline).
    - `POST /ai/payment-progress-check` (AI-05): Financial disbursement percentage vs physical progress percentage gap evaluation.
    - `GET /health`: Microservice health, telemetry, and engine identification.
    - Unit tests in `ai-service/tests/`: 16 comprehensive unit tests covering all 5 signals with 100% pass rate (`npm run test:ai`).
  - Express Backend Orchestration (`backend-node/`):
    - `src/services/aiClient.js`: Internal HTTP client with configurable timeout (`AI_SERVICE_TIMEOUT_MS`) and resilient `AI_ANALYSIS_UNAVAILABLE` fallback.
    - `src/services/aiOrchestrator.js`: Gathers project data, enforces jurisdiction-filtered historical peer queries, dispatches concurrent signal evaluations to Python, persists append-only flags to `ai_risk_flags` and evaluation snapshots to `ai_analysis_history`.
    - `src/routes/ai.js` mounted at `/api/projects/:projectId/ai`:
      - `POST /api/projects/:projectId/ai/analyze`: Authenticated endpoint to trigger analysis.
      - `GET  /api/projects/:projectId/ai/findings`: Retrieves stored project risk flags.
    - Admin Isolation: Strict 403 `ADMIN_ISOLATION` response on all AI endpoints per `rules.md` §10.
    - Cross-jurisdiction: Enforced 403 `FORBIDDEN_JURISDICTION` boundaries for non-authorized collectors.
    - Project 360 payload (`GET /api/projects/:projectId`): Enriched to include `ai_findings` array.
  - Frontend UI Integration (`frontend/`):
    - `AiHistoricalIntelligencePanel.jsx`: Visualizes all 5 signals using `RiskBadge` (rounded pill) strictly separated from Phase 6 `ComplianceBadge` (square/dot) per `design.md` §5.19 & §5.39.
    - Prominent "ADVISORY ONLY" indicator and official discretion copy per `rules.md` §12.
    - Explicit `AI_ANALYSIS_UNAVAILABLE` state handling without faking LOW risk.
    - Interactive "Re-run AI Analysis" button calling backend.
    - Integrated into `ProjectDetailModal.jsx` as dedicated "AI Intelligence" tab and overview preview card.
    - Integrated into `DistrictWorkspace.jsx` Review & Sanction modal for pre-sanction scrutiny.
    - Admin isolation verified: `AdminWorkspace.jsx` contains no AI risk panels or badges.
  - Test suites & verification:
    - Added `tests/backend/aiHistoricalIntelligence.test.js`: 6 backend integration tests covering auth, Admin 403, cross-jurisdiction 403, service down fallback, flag and history persistence, and core path independence.
    - Added `tests/frontend/phase8AiIntelligence.test.js`: 7 frontend tests covering component exports, RiskBadge compliance, advisory language, unavailable states, modal tabs, and Admin isolation.
    - Added to `tests/runAll.js`.
    - Python tests: **16/16 passing**.
    - Full platform test suite `npm test`: **139/139 passing tests across 16 suites** (100% green, 0 failures).
    - Frontend build verified: `npm --prefix frontend run build` completed cleanly in ~1s with zero errors.
- **Not done / remaining**:
  - None (Phase 8 complete and verified). Phase 9 (Weighted Risk Engine, AI Gateway & Explainable AI) on hold until requested.
### Phase 9: Risk Engine, AI Gateway & Explainable AI
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Provider-Neutral AI Gateway (`ai-service/app/gateway/`):
    - `gemini_adapter.py`: Production adapter calling Google Generative AI (Gemini 1.5 Flash) with strict data minimization prompt, advisory copy enforcement, and fallback handling.
    - `ai_gateway.py`: Gateway interface routing requests dynamically across `gemini`, `ollama`, and deterministic `mock` fallback.
    - `schemas.py` & `main.py`: Added `POST /ai/explain` endpoint accepting de-identified evidence and returning structured explanation and confidence score.
    - 3 unit tests in `ai-service/tests/test_gateway.py` (total 19 Python unit tests passing).
  - Deterministic Explainable Weighted Risk Engine (`backend-node/`):
    - `src/config/riskWeights.js`: Centralized risk weight configuration (Cost: 0.25, Duplicate: 0.25, Spec: 0.15, Payment Progress: 0.15, Delay: 0.10, Compliance: 0.10, Historical: 0.00) summing exactly to 1.0. Canonical risk level thresholds: `LOW` (0–39), `MEDIUM` (40–74), `HIGH` (75–100).
    - `src/services/riskEngine.js`: Normalization layer converting raw findings into 0-100 scores, computing weighted contributions, selecting top contributors, and producing strictly de-identified evidence payloads.
    - `src/services/aiGateway.js`: Express gateway wrapper forwarding to Python service with offline graceful fallback to deterministic rule-based explanations.
    - `src/services/aiOrchestrator.js`: Integrated Phase 9 multi-signal risk aggregation into `analyzeProject`, saving combined score in `ai_risk_scores`, granular flags in `ai_risk_flags`, and audit trail in `ai_analysis_history`. Added `getProjectRisk` and `getProjectRiskHistory`.
    - `src/routes/risk.js` mounted at `/api/projects/:projectId/risk`:
      - `GET  /api/projects/:projectId/risk`: Returns current evaluated project risk score and top contributors.
      - `GET  /api/projects/:projectId/risk/history`: Retrieves chronological risk score history.
      - `GET  /api/projects/:projectId/risk/flags`: Retrieves individual risk flags.
      - `POST /api/projects/:projectId/risk/analyze`: Triggers full end-to-end evaluation.
    - Enforced 403 `ADMIN_ISOLATION` on all risk endpoints (`rules.md` §10) and cross-district boundaries (`FORBIDDEN_JURISDICTION`).
    - Enriched Project 360 payload (`GET /api/projects/:projectId`) with `current_risk`.
  - Frontend UI Integration (`frontend/`):
    - `AiReviewPanel.jsx`: Complete risk assessment interface featuring:
      - Prominent `RiskBadge` with score pill and risk level (`LOW`: 0–39, `MEDIUM`: 40–74, `HIGH`: 75–100).
      - Explicit AI status pill (`AI ANALYSIS COMPLETE`, `AI ANALYSIS PENDING`, `AI ANALYSIS UNAVAILABLE`).
      - Advisory indicator: *"Advisory Only — Administrative Discretion Required"*.
      - `RiskBreakdown`: Visual progress bars for contributing factors with weights and points.
      - Natural language explanation narrative card with provider attribution.
      - Accessible expandable JSON evidence drawer (`aria-expanded`) showing exact de-identified evidence tokens.
    - Integrated into `ProjectDetailModal.jsx` (AI tab) and `DistrictWorkspace.jsx` (Review & Sanction modal).
    - Verified strict Admin Isolation: `AdminWorkspace.jsx` does not expose risk panels or scores.
  - Automated Tests:
    - `tests/backend/riskEnginePhase9.test.js`: 9 tests verifying risk weights, thresholds, normalization, multi-signal aggregation, data minimization, AI Gateway fallback, 403 Admin Isolation, 403 cross-jurisdiction isolation, and end-to-end persistence. All 9 pass.
    - `tests/frontend/phase9RiskPanel.test.js`: 8 tests verifying component exports, RiskBadge usage, status labels, advisory wording, evidence drawer, modal integration, and Admin isolation. All 8 pass.
    - Frontend unit test suite: **59/59 tests passing**.
    - Python AI microservice test suite: **19/19 tests passing**.
    - Production build: `npm --prefix frontend run build` completes in 2.38s with 0 errors.
- **Not done / remaining**:
  - None (Phase 9 complete and verified). Ready for Phase 10: District Authority AI Review UX & Inspection Queue.
- **Notes**:
  - Express is the sole authorization and persistence boundary. React and n8n never call the Python microservice directly.
  - Gemini receives zero PII, personal tokens, or raw documents; only de-identified numbers, percentages, and category labels are passed to the AI Gateway.
  - Advisory language strictly observed throughout UI and AI Gateway; system never produces *"Fraud confirmed"* or automatic sanctions/rejections.

### Phase 10: District AI Review & Human Decision
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Backend Domain Model & Decision Pipeline (`backend-node/`):
    - `src/models/Project.js`: Added canonical status enums `INSPECTION_REQUESTED`, `ESCALATED`, and `REJECTED`.
    - `src/models/OfficerDecision.js`: Extended with 5 canonical decision types (`SANCTION`, `HOLD`, `REQUEST_CLARIFICATION`, `ORDER_INSPECTION`, `ESCALATE`), decision snapshot fields (`risk_analysis_id`, `risk_score_at_decision`, `risk_level_at_decision`, `supporting_note`), and alias mappings (`APPROVE` -> `SANCTION`, `INSPECTION` -> `ORDER_INSPECTION`).
    - `src/routes/projects.js`:
      - `GET /api/projects/:projectId/review`: End-to-end District Authority review package aggregating the complete Section 25 10-part hierarchy (Project Metadata & Recommendation, Deterministic Compliance, Historical Duplicates, Cost Benchmark IQR Deviation, Engineering Comparison DPR drift, Phase 9 Composite AI Risk Assessment & explainable component breakdown, Non-Binding AI Advisory Recommendation, Accessible Evidence Drawer, Prior Decision History, and Human Decision Action Panel metadata). Protected by RBAC allowing `DISTRICT_AUTHORITY`, `STATE_NODAL_AUTHORITY`, `MINISTRY`, and read-only `AUDITOR`.
      - `PATCH /api/projects/:projectId/decision`: Official administrative human decision submission. Enforces mandatory justification (min 5 chars), agency selection for `SANCTION`, valid state transitions, 403 `ADMIN_ISOLATION` per `rules.md` §10, 403 Auditor read-only restriction, 403 Cross-Jurisdiction boundaries, and records immutable `OfficerDecision` documents and `AuditLog` entries.
      - Enforced strict Human-in-the-Loop guarantees: AI risk scores are non-binding advisory signals; high scores (e.g. 82 or 95) NEVER automatically reject, hold, or sanction a project without human officer action.
  - Frontend UI Integration (`frontend/`):
    - `DistrictReviewModal.jsx`: Complete Section 25 District Authority review interface featuring 10-section hierarchy, 5 canonical decision buttons (`Approve / Sanction`, `Hold`, `Request Clarification`, `Send for Inspection`, `Escalate`), confirmation modal with agency assignment and mandatory reason validation, non-binding advisory disclaimers, and Auditor read-only state.
    - `DistrictWorkspace.jsx`: Mounted `DistrictReviewModal` into the district pre-sanction review workflow.
    - `ProjectDetailModal.jsx`: Enhanced decisions tab with risk context snapshot badges (`risk_score_at_decision`, `risk_level_at_decision`), officer notes, and transition cards.
  - Automated Tests & Verification:
    - `tests/backend/districtReviewDecisionPhase10.test.js`: **21/21 passing** across 6 suites (Review package aggregation, 5 canonical actions, aliases, validations, RBAC/Admin isolation, append-only history & human-in-the-loop safeguards).
    - `tests/frontend/phase10DistrictReview.test.js`: **7/7 passing** (Section 25 hierarchy, 5 buttons, confirmation modal, Auditor read-only, Admin isolation, DistrictWorkspace mounting, and ProjectDetailModal risk snapshots).
    - `tests/backend/riskEnginePhase9.test.js`: **9/9 passing** (Phase 9 regression).
    - `tests/frontend/phase9RiskPanel.test.js`: **8/8 passing** (Phase 9 regression).
    - `tests/backend/aiHistoricalIntelligence.test.js`: **6/6 passing** (Phase 8 regression).
    - `tests/frontend/phase8AiIntelligence.test.js`: **7/7 passing** (Phase 8 regression).
    - All Frontend Test Suites (`tests/frontend/*.test.js`): **66/66 passing** across 7 test files.
    - Python AI microservice test suite: **19/19 passing** (`Ran 19 tests in 0.024s, OK`).
    - Frontend production build (`npm --prefix frontend run build`): **Passes cleanly in 1.02s with 0 errors**.
- **Not done / remaining**:
  - None (Phase 10 complete and verified). Ready for Phase 11: 1% Physical Inspection Engine & Verification Loop.
- **Notes**:
  - Decisions are strictly append-only; an immutable historical record with full risk snapshot is preserved.
  - Admin Isolation remains 100% intact: Admin accounts receive HTTP 403 `ADMIN_ISOLATION` on both review and decision endpoints.
  - Human-in-the-loop is strictly upheld: AI never auto-decides; only authorized District Authority officials can execute administrative status transitions.

### Phase 11: Continuous Execution Monitoring
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Backend Execution Monitoring Service (`backend-node/src/services/executionMonitoringService.js`):
    - Implemented `evaluateProjectExecution(projectId, requestingUser)` calculating execution telemetry:
      - Financial disbursed percentage vs physical progress percentage.
      - Discrepancy gap percentage calculation (`financial_disbursed_pct - physical_progress_pct`) per PRD §12.5 & §12.6.
      - Mismatch severity categorization: `LOW` (<= 15%), `MEDIUM` (15%–30%), `HIGH` (> 30%).
      - Progress jump detection: abnormal surges (> 50% in <= 14 days without intermediate milestones) and unverified completion claims.
      - Timeline delay & staleness tracking (> 60 days without progress reports on active works).
      - DPR engineering estimate drift comparison.
      - Advisory recommendations (`NORMAL_MONITORING`, `MONITORING_ALERT`, `GROUND_VERIFICATION_RECOMMENDED`).
    - Persists append-only flags to `ai_risk_flags` and updates composite risk score in `ai_risk_scores`.
    - Dispatches server-validated notifications in `notifications` collection with hierarchical tiers (District on MEDIUM/HIGH, State on HIGH).
    - `getActiveMonitoringQueue(user, filters)` returning jurisdiction-scoped active works queue with optional `mismatched_only` filter.
  - Backend Express Ingestion Triggers & Routes (`backend-node/src/routes/projects.js`):
    - `GET /api/projects/monitoring/active`: Returns active works monitoring queue scoped by user jurisdiction (District / State / Ministry / Auditor).
    - `GET /api/projects/:projectId/monitoring`: Returns complete execution monitoring telemetry package.
    - `POST /api/projects/:projectId/monitoring/evaluate`: Allows authorized officials to trigger on-demand execution re-evaluation.
    - Automatic ingestion trigger in `POST /api/projects/:projectId/progress`: Runs execution evaluation upon progress reports and attaches `data.monitoring`.
    - Automatic disbursement trigger in `PATCH /api/projects/:projectId/payments/:paymentId`: Runs execution evaluation upon payment approval/disbursement.
    - Strict Admin Isolation enforced on all monitoring endpoints: HTTP 403 `ADMIN_ISOLATION` per `rules.md` §10.
  - Frontend UI Integration (`frontend/`):
    - `ExecutionMonitoringCard.jsx`: Dedicated post-sanction execution monitoring card featuring:
      - Comparison bars for Physical Progress (%) and Financial Disbursed (%).
      - Discrepancy gap badge with color-coded severity.
      - Abnormal jump warning banner and days since last progress indicator.
      - Advisory disclaimer box (*"Advisory Only — Administrative Discretion Required"*).
      - On-demand "Refresh Monitoring" action invoking `/evaluate`.
    - `ProjectDetailModal.jsx`: Embedded `ExecutionMonitoringCard` at the top of the Physical Progress tab for active works (`SANCTIONED`, `IN_PROGRESS`, `TECHNICAL_SANCTION_PENDING`, `INSPECTION_REQUESTED`, `HELD`).
  - Automated Tests & Verification:
    - `tests/backend/executionMonitoringPhase11.test.js`: **15/15 passing** across 4 suites (Execution Analysis Engine, Express Ingestion Triggers & API Surface, Multi-Tier Governance & Hierarchical Alerts, Admin Isolation & Human-in-the-Loop Safeguards).
    - `tests/frontend/phase11ExecutionMonitoring.test.js`: **6/6 passing** (Component exports, API endpoints, gauge rendering, advisory disclaimer, modal integration, Admin isolation).
    - Full unified test suite (`node tests/runAll.js`): **205/205 passing across 31 test suites**.
    - Frontend production build (`npm run build:frontend`): **Passes cleanly in 1.11s with 0 errors**.
- **Not done / remaining**:
  - None for Phase 11.
- **Notes**:
  - Express is the sole authorization and persistence boundary.
  - AI remains strictly advisory per `rules.md` §12: high mismatch never automatically holds, suspends, or cancels a project.
  - Admin isolation verified: Admins receive 403 `ADMIN_ISOLATION` and cannot access execution monitoring data.

### Phase 12: Agency Intelligence & Efficiency
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Database Seeding & Master Registry (`backend-node/src/utils/seedAgencies.js`):
    - Seeds public executing agencies (`PWD-INDORE-01`, `RES-INDORE-01`, `CPWD-INDORE-01`, `MP-RDC-01`, `IMC-INDORE-01`).
    - Seeds baseline performance records (`completion_rate`, `avg_delay_days`, `cost_deviation_avg_percentage`, `adverse_inspection_count`, `performance_score`).
    - Seeds baseline concentration statistics (`share_of_value_percentage`, `herfindahl_index_contribution`, `is_concentration_flagged`).
    - Wired into server startup in `backend-node/server.js`.
  - Backend Domain Service (`backend-node/src/services/agencyIntelligenceService.js`):
    - Implemented Product 1: Agency Suitability advisory ranking with multi-factor scoring (completion rate 25%, delay penalty 20%, cost deviation penalty 20%, inspection outcomes 15%, category match 20%).
    - Implemented statutory Concentration Guardrail (`PRD §12.8`): flags agencies with >35% district work share (`concentration_warning: true`), applies score penalty (-16 points), and caps top-recommendation to prevent reinforcing single-agency monopolies.
    - Implemented Product 2: Agency Concentration analytics (`PRD §12.7`, `design.md` §5.33) calculating work-share %, value-share %, Herfindahl-Hirschman Index (HHI), and threshold flags (>35% value share).
    - Preserves architectural separation: Two distinct products, never merged into a single "agency score".
    - Resilient offline fallback guarantee: Deterministic Node calculations run seamlessly when Python microservice is offline.
  - Express API Layer (`backend-node/src/routes/agencies.js`):
    - Mounted at `/api/agencies`.
    - `GET /api/agencies` (jurisdiction-scoped list).
    - `GET /api/agencies/:id` (profile details).
    - `GET /api/agencies/:id/performance` (performance metrics, 403 `ADMIN_ISOLATION`).
    - `POST /api/agencies/suitability` (advisory ranking, 403 `ADMIN_ISOLATION`).
    - `GET /api/agencies/concentration` (systemic analytics & HHI, 403 `ADMIN_ISOLATION`).
  - Python AI Microservice (`ai-service`):
    - Added Pydantic schemas in `app/schemas.py` (`AgencySuitabilityRequest`, `AgencyConcentrationRequest`, etc.).
    - Created `app/services/agency_service.py` with `analyze_agency_suitability` and `analyze_agency_concentration`.
    - Mounted `POST /ai/agency-suitability` and `POST /ai/agency-concentration` in `app/main.py`.
    - Added client dispatch methods in `backend-node/src/services/aiClient.js`.
  - Frontend UI Components:
    - `AgencySuitabilityCard.jsx`: Advisory ranking per project with statutory disclaimer, expandable factor breakdown, concentration guardrail alert banner, and "Select Agency" action that ONLY pre-fills the sanction form (never auto-sanctions or skips officer decisions).
    - `AgencyConcentrationPanel.jsx`: Systemic work-share and financial-value distribution with Herfindahl Index gauge and threshold warning badges (>35% share).
    - `DistrictReviewModal.jsx`: Embedded `AgencySuitabilityCard` directly in the Sanction confirmation workflow.
    - `StateWorkspace.jsx`: Embedded `AgencyConcentrationPanel` with dedicated navigation item.
    - `MinistryWorkspace.jsx`: Embedded `AgencyConcentrationPanel` with dedicated navigation item.
    - `AgencyWorkspace.jsx`: Added Performance Track Record scorecard tab with live benchmark metrics.
  - Automated Tests & Verification:
    - `tests/backend/agencyIntelligencePhase12.test.js`: **11/11 passing** across 5 suites.
    - `tests/frontend/phase12AgencyIntelligence.test.js`: **10/10 passing**.
    - Unified test suite (`npm test` / `node tests/runAll.js`): **231/231 passing across 38 suites**.
    - Frontend production build (`npm run build:frontend`): **Passes cleanly in 1.32s with 0 errors**.
- **Not done / remaining**:
  - None for Phase 12.
- **Notes**:
  - Two separate products strictly preserved: Suitability (ranked advisory score per project) vs. Concentration (systemic work-share % and HHI).
  - Suitability is advisory only per `rules.md` §12: District Collector retains sole selection authority.
  - Concentration guardrail enforced in service logic per `prd.md` §12.8.
  - Admin Isolation verified: Admins receive 403 `ADMIN_ISOLATION` on all agency performance, suitability, and concentration endpoints.

### Phase 13: Field Verification & Inspection Queue
- **Status**: Complete
- **Exit Checklist**:
  - [x] Requirements completed
  - [x] Code reviewed
  - [x] Feature tested
  - [x] Security/permissions verified where applicable
  - [x] Documentation/memory updated where applicable
  - [x] No known blocking issues
- **Done**:
  - Backend Canonical Inspection Model Extended (`backend-node/src/models/Inspection.js`):
    - Extended schema with `priority_score`, `recommendation_source` (`AI_RISK`, `COMPLIANCE_NON_COMPLIANT`, `EXECUTION_ANOMALY`, `OFFICER_RECOMMENDATION`, `ANNUAL_QUOTA_SELECTION`, `CITIZEN_COMPLAINT`, `SYSTEMIC_ALERT`), `quota_year`, `state`, `district`, `assigned_by`, `assigned_officer_name`, `assigned_at`, `scheduled_date`, `scheduled_by`, `scheduled_at`, `completed_date`, `completed_by`, `completed_at`, `result_recorded_by`, `result_recorded_at`, `evidence_document_ids`, `remarks`, `findings_summary`, `audit_trail`.
    - Added compound index `{ state: 1, district: 1, status: 1, priority_score: -1 }`.
    - Canonical 7-stage lifecycle strictly enforced: `RECOMMENDED` -> `PENDING_DECISION` -> `ASSIGNED` -> `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED` -> `RESULT_RECORDED`.
    - Canonical result recording outcomes strictly enforced: `NO_ISSUE`, `REVIEW_REQUIRED`, `ESCALATE`.
    - Re-exported enum constants in `backend-node/src/models/index.js`.
  - Backend Inspection Queue Service (`backend-node/src/services/inspectionQueueService.js`):
    - `calculateInspectionPriority(...)`: Blends Phase 9 AI Risk (40%), Phase 6 Compliance (25%), Phase 11 Execution mismatch (20%), and Officer trigger (15%). Maps composite score (0-100) to tiers: `URGENT` (>=75), `HIGH` (50-74), `MEDIUM` (25-49), `ROUTINE` (<25).
    - `buildInspectionQueue(...)`: Generates jurisdiction-scoped prioritized inspection queue with dynamic sorting.
    - `recommendInspection(...)`: Idempotent recommendation upsert protecting against duplicate active inspections for the same project.
    - `assignInspection(...)`: Human officer assignment validating inspector existence and recording audit trail.
    - `scheduleInspection(...)`: Human officer visit scheduling with date validation.
    - `transitionInspection(...)`: Strict canonical state machine validator preventing invalid lifecycle skips.
    - `recordResult(...)`: Human officer inspection outcome recording (`NO_ISSUE`, `REVIEW_REQUIRED`, `ESCALATE`) with findings summary and evidence document IDs, updating project `inspection_status` without auto-closing or auto-sanctioning.
    - `quotaStats(...)`: Real-time aggregation of eligible works, statutory targets (10% District DA per guidelines, 1% State SNA per §5.2), completed count, remaining count, and progress % computed strictly from live DB records.
  - Backend Express API Routes (`backend-node/src/routes/inspections.js`):
    - Mounted at `/api/inspections`.
    - `GET /api/inspections`: Jurisdiction-filtered inspection queue (District, State, Ministry, Auditor).
    - `GET /api/inspections/quota`: Live statutory inspection quota metrics.
    - `GET /api/inspections/:inspectionId`: Detailed inspection record with audit trail.
    - `POST /api/inspections/recommend`: Manually or programmatically triggers an inspection recommendation.
    - `PATCH /api/inspections/:inspectionId/assign`: Human officer assigns an inspection.
    - `PATCH /api/inspections/:inspectionId/status`: Human officer transitions lifecycle status.
    - `POST /api/inspections/:inspectionId/result`: Human officer records final field verification outcome.
    - Strict Admin Isolation enforced across all inspection endpoints: HTTP 403 `ADMIN_ISOLATION` per `rules.md` §10.
    - Auditor read-only enforcement: HTTP 403 `FORBIDDEN_ROLE` on all write endpoints.
    - Cross-jurisdiction boundary enforcement: HTTP 403 `FORBIDDEN_JURISDICTION`.
  - Integration with Phase 10 Decision Workflow & Project 360 (`backend-node/src/routes/projects.js`):
    - `ORDER_INSPECTION` decision in Phase 10 seamlessly invokes `inspectionQueueService.recommendInspection(projectId, 'OFFICER_RECOMMENDATION', req.user, ...)`.
    - `GET /api/projects/:projectId` includes historical and active `inspections` array for Project 360 view.
  - Frontend UI Components & Workspaces (`frontend/`):
    - `InspectionQueueCard.jsx`: Reusable full-featured inspection queue component with:
      - Composite priority score badge (`URGENT`, `HIGH`, `MEDIUM`, `ROUTINE`).
      - Canonical lifecycle status badge.
      - Dynamic filter bar (priority tier, status, search).
      - Interactive human-in-the-loop action modals: Assign Officer, Schedule Visit, Record Findings (`NO_ISSUE`, `REVIEW_REQUIRED`, `ESCALATE`).
      - Advisory and statutory notice banners.
    - `DistrictWorkspace.jsx`: Embedded `InspectionQueueCard` under dedicated `inspections` section with 10% statutory quota progress.
    - `StateWorkspace.jsx`: Integrated live 1% State inspection quota statutory metrics card and statewide inspection queue.
    - `ProjectDetailModal.jsx`: Added dedicated `Field Inspections` tab displaying complete inspection lifecycle history and findings.
    - `DistrictReviewModal.jsx`: Enhanced `ORDER_INSPECTION` action button with clear user confirmation feedback.
  - Automated Tests & Verification:
    - `tests/backend/inspectionQueuePhase13.test.js`: **25/25 passing** (Priority calculation, idempotency/anti-duplication, canonical state transitions, result recording, statutory quotas, admin isolation, auditor read-only, cross-jurisdiction).
    - `tests/frontend/inspectionQueuePhase13Frontend.test.js`: **10/10 passing** (Component rendering, filters, priority badges, modal workflows, state and district workspace integration, project detail integration, admin isolation).
    - Phase 8-12 regression suites: all passing.
    - Python AI Service: **20/20 passing** (`py -m unittest discover -s ai-service/tests`).
    - Frontend Production Build: **Passes cleanly with 0 errors**.
- **Notes**:
  - Distinction between Risk Score and Inspection Priority preserved: Phase 9 Risk Score remains authoritative; Phase 13 Inspection Priority blends Risk, Compliance, Execution, and Officer triggers into an actionable operational queue.
  - Human-in-the-loop strictly enforced: AI recommends candidates, but human officers assign, schedule, conduct visits, and record results.
  - Admin Isolation verified: Admins receive 403 `ADMIN_ISOLATION` and cannot access inspection records.

## Phase 14: Ministry Systemic Intelligence & Portfolio Analytics (SIH Problem Statement 26102 / PARAKH)
- **Status**: Complete
- **Date**: 2026-09-10
- **Implemented Features**:
  - Systemic Intelligence Service (`backend-node/src/services/systemicIntelligenceService.js`):
    - RBAC & Jurisdiction validation (`_validateScope`):
      - `MINISTRY`: Full Pan-India national visibility with optional `?state=` and `?year=` drilldowns.
      - `STATE_NODAL_AUTHORITY`: Strictly bound to authenticated State from JWT (`user.jurisdiction.state`). Attempting to request another state via `?state=` returns HTTP 403 `FORBIDDEN_JURISDICTION`.
      - `ADMIN`: Strict Admin Isolation returning HTTP 403 `ADMIN_ISOLATION` on all systemic business intelligence endpoints per `rules.md` §10.
      - `DISTRICT_AUTHORITY`, `MP`, `IMPLEMENTING_AGENCY`: Returns HTTP 403 `FORBIDDEN_ROLE`.
      - `AUDITOR`: Read-only access within authorized jurisdiction scope.
    - Value-at-Risk & Portfolio Overview (`getPortfolioOverview`):
      - Aggregates total monitored outlay, active and completed project counts.
      - Calculates Value-at-Risk: `high_risk_value`, `non_compliant_value`, and deduplicated union `total_at_risk_value` with `at_risk_percentage` (preventing double-counting for projects that are simultaneously HIGH risk and NON_COMPLIANT).
      - Phase 9 authoritative risk distribution (`LOW`, `MEDIUM`, `HIGH`, `UNASSESSED`) and `high_risk_rate`.
      - Full canonical 10-status project lifecycle distribution.
    - Geographic Breakdown (`getGeographicBreakdown`):
      - Grouping dimension `STATE` for Ministry (national rollup) and `DISTRICT` for State (district comparative breakdown).
      - Computes project counts, total outlay, average risk score, high-risk count, non-compliant count, and completed count per region.
    - Sectoral & Category Expenditure Patterns (`getCategoryPatterns`):
      - Rollup across canonical MPLADS categories (`Drinking Water`, `Education`, `Electricity`, `Health & Family Welfare`, `Irrigation`, `Other Public Facilities`, `Roads & Bridges`, `Sanitation`).
      - Aggregates total outlay, category outlay share %, project count, and high-risk project rate per category.
    - Systemic Agency Concentration (`getAgencyConcentrationSystemic`):
      - Integrates Phase 12 agency intelligence to compute Herfindahl-Hirschman Index (HHI) and concentration guardrails (>35% outlay threshold).
      - Strictly isolates systemic portfolio concentration from District-level agency suitability ranking.
    - Inspection System Health (`getInspectionSystemHealth`):
      - Aggregates canonical 7-stage field inspection lifecycle tally (`RECOMMENDED`, `PENDING_DECISION`, `ASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `RESULT_RECORDED`).
      - Ground verification outcome distribution (`NO_ISSUE`, `REVIEW_REQUIRED`, `ESCALATE`).
      - State 1% physical inspection quota tracking under Guidelines §5.2.
    - Systemic Attention List (`getAttentionList`):
      - Transparent 4-factor supervisory formula:
        $$\text{AttentionScore} = 0.40 \times \text{HighRiskRate} + 0.25 \times \text{NonCompliantRate} + 0.20 \times \text{ExecutionGapRate} + 0.15 \times \text{InspectionEscalationRate}$$
      - Deterministic ranking with human-interpretable risk drivers.
  - Backend Systemic Routes (`backend-node/src/routes/systemic.js` mounted at `/api/systemic` in `backend-node/src/routes/index.js`):
    - `GET /api/systemic/overview`
    - `GET /api/systemic/geographic`
    - `GET /api/systemic/categories`
    - `GET /api/systemic/agency-concentration`
    - `GET /api/systemic/inspections`
    - `GET /api/systemic/attention`
    - All routes enforce authentication, RBAC, Admin Isolation (403), State boundary validation (403), and read-only non-mutating safety.
  - Frontend Components & Workspaces (`frontend/`):
    - `SystemicOverviewPanel.jsx`: Top-line KPI summary cards, Value-at-Risk exposure, Phase 9 risk distribution, canonical lifecycle breakdown, and supervisory advisory disclaimer banner.
    - `SystemicGeographicPanel.jsx`: Regional comparative breakdown (State-by-State or District-by-District), dynamic state drill-down dropdown with reset option.
    - `SystemicCategoryPanel.jsx`: Cross-category expenditure table with outlay shares, counts, and category risk rates.
    - `SystemicInspectionHealthPanel.jsx`: 7-stage lifecycle display, ground verification outcome breakdown, and State 1% statutory quota progress bar.
    - `SystemicAttentionList.jsx`: Ranked supervisory priority table with transparent formula badge, score bar, priority tiers (`CRITICAL`, `ELEVATED`, `MONITOR`, `ROUTINE`), and key systemic drivers.
    - `MinistryWorkspace.jsx`: Connected all 8 navigation items (`overview`, `geographic`, `categories`, `agency-concentration`, `inspections`, `attention`, `projects`, `alerts`) mounting systemic panels.
    - `StateWorkspace.jsx`: Connected all 8 navigation items with State-scoped context (`user.jurisdiction.state`).
  - Automated Tests & Verification:
    - `tests/backend/systemicIntelligencePhase14.test.js`: **25/25 passing** (all 25 backend criteria verified).
    - `tests/frontend/systemicIntelligencePhase14Frontend.test.js`: **10/10 passing** (all 10 frontend criteria verified).
    - Unified test suite (`node tests/runAll.js`): **301/301 passing across 42 suites with 0 failures**.
    - Python AI Service (`py -m unittest discover -s ai-service/tests`): **20/20 passing**.
    - Frontend Production Build (`npm --prefix frontend run build`): **Passes with 0 errors in 2.25s (76 modules transformed)**.
- **Notes & Core Invariants Preserved**:
  - Supervisory/Advisory Only: Phase 14 intelligence is strictly observational and advisory for policy decisions. The AI never auto-sanctions, auto-holds, or alters project states.
  - Authoritative Risk Score: Phase 9 AI Risk Score (`LOW`, `MEDIUM`, `HIGH`) remains the sole authoritative project risk indicator. No parallel or competing risk scores created.
  - Admin Isolation: Administrators receive HTTP 403 `ADMIN_ISOLATION` on all systemic business intelligence endpoints and panels per `rules.md` §10.

## Phase 15: Audit, Traceability & Quality Assurance (SIH Problem Statement 26102)
- **Status**: Complete
- **Date**: 2026-09-10
- **Done Checklist**:
  - [x] **AI Events ≠ Human Decisions Separation** (`rules.md` §12, `phases_doc.md` Phase 15):
    - Added `event_type` (`'HUMAN'`, `'SYSTEM'`), `actor_user_id`, and `request_id` to `AuditLog` schema (`backend-node/src/models/AuditLog.js`).
    - Extended `AUDIT_ENTITY_TYPES` to include `'AI_ANALYSIS'`, `'SUITABILITY'`, and `'COMPLIANCE'`.
    - Automated background operations and degraded telemetry (`AI_ANALYSIS_COMPLETED`, `AI_ANALYSIS_UNAVAILABLE`, `SUITABILITY_CALCULATED`) are strictly logged with `event_type: 'SYSTEM'` and `actor_user_id: 'SYSTEM'`.
    - Administrative actions (`PROJECT_RECOMMENDED`, `OFFICER_SANCTION`, `PAYMENT_APPROVED`, etc.) are logged with `event_type: 'HUMAN'` and the officer's `user_id`.
  - [x] **Write-Once Append-Only Immutability** (`rules.md` §9, `architecture.md` §10.1):
    - Applied Mongoose `appendOnlyPlugin` to `AuditLog` model to reject any in-place updates or deletions at the database layer.
    - Router-level guards return HTTP 403 `IMMUTABLE_RECORD` on all mutation methods (`PUT`, `PATCH`, `DELETE`) for `/api/audit/*` and `/api/projects/:id/audit`.
    - Direct `POST /api/audit` is blocked with HTTP 403 `IMMUTABLE_RECORD` to guarantee that audit events are generated solely via domain service hooks.
  - [x] **Request Correlation & End-to-End Traceability**:
    - Request correlation ID (`req.id` / `X-Request-Id`) is threaded through middleware into audit records for end-to-end operational traceability.
    - Project 360 payload (`GET /api/projects/:projectId`) returns the full chronological `audit_trail` array.
    - Dedicated `GET /api/projects/:projectId/audit` returns the ordered audit trail with full event context.
  - [x] **Strict Admin Isolation & Jurisdictional RBAC** (`rules.md` §10):
    - `GET /api/audit` and `GET /api/projects/:id/audit` strictly block administrators with HTTP 403 `ADMIN_ISOLATION`.
    - Cross-jurisdiction boundary checks enforce HTTP 403 `FORBIDDEN_JURISDICTION` for District and State authorities accessing projects outside their mandate.
    - Dedicated read-only access enabled for `AUDITOR` across system-wide logs and project audit trails.
  - [x] **Frontend Transparency & User Experience** (`frontend/`):
    - `ProjectDetailModal.jsx`: Added dedicated Audit tab with filter pills (`All Events`, `Human Decisions`, `System / AI Events`), visual distinction badges (`[👤 Human Officer Decision]` vs `[⚙️ System / AI Event]`), relative/absolute timestamps, and statutory compliance notice.
    - `AuditorWorkspace.jsx`: Integrated live audit ledger connected to `/api/audit` with filterable actor, action, and event type views.
  - [x] **Verification & Regression Testing**:
    - Backend Suite: `tests/backend/auditTraceabilityPhase15.test.js` — **14/14 passing (100%)**.
    - Frontend Suite: `tests/frontend/phase15AuditTraceability.test.js` — **8/8 passing (100%)**.
    - Frontend Production Build: **Passes cleanly with 0 errors**.
- **Notes & Governance Guarantees**:
  - Human-in-the-Loop: AI recommendations never masquerade as official administrative determinations. All UI screens clearly differentiate advisory telemetry from statutory executive decisions.
  - Teammate-Delivered Foundation: Reused and verified interoperability with teammate-delivered Phase 13 (Field Verification) and Phase 14 (Ministry Systemic Intelligence).
  - Next Phase Guardrail: Phase 16 remains unstarted per instructions.


