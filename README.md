# MPLADS AI Risk Monitoring & Decision Support Platform

SIH Problem Statement 26102 — a monitoring and decision-support layer alongside the existing MPLADS sanction/execution workflow. It compares new and ongoing works against historical and peer records, surfaces explainable risk signals, and helps the state's existing mandated 1% annual physical-inspection quota target the highest-risk works instead of a near-random sample.

**Core principle: AI identifies what deserves attention. Humans decide what to do about it.**

## Where to look

| Question | Document |
|---|---|
| What real-world problem are we solving, and for whom? | `problem_description.md` |
| What must the product do? | `prd.md` |
| How is the system technically structured? | `architecture.md` |
| What engineering rules must code follow? | `rules.md` |
| How should the product look and behave? | `design.md` |
| What may the app remember about a user/session? | `memory.md` |
| What order do we build things in? | `phases.doc.md` |
| Why did we make a specific past decision? | `docs/decisions/project-log.md` |

Read them in that order the first time. After that, treat them as reference — each phase in `phases.doc.md` names which of the others it depends on.

## Stack

- **Frontend:** React, one portal with role-based workspaces (MP, District Authority, State Authority, Ministry, Implementing Agency/Engineer, Auditor, Admin)
- **Backend:** Node.js + Express — the sole authorization boundary
- **Database:** MongoDB, centralized, schema-validated, transaction-protected for financial/status writes
- **AI/ML:** Python service (statistical/ML analysis) + Gemini (current LLM, explanation-only) behind an AI Gateway that also supports a future local model
- **Automation:** n8n, background workflows only — never authentication, RBAC, or the synchronous decision path
- **File storage:** S3-compatible object storage for utilization certificates, evidence, and documents

## Non-negotiables (see `rules.md` for the full list)

1. Every protected action is authorized server-side — frontend visibility is never security.
2. AI flags and recommends; a named human authority decides. No AI output is ever hard-coded, and no AI failure silently becomes "low risk."
3. Historical/source records are never overwritten — new versions are appended.
4. Real and synthetic data are always distinguishable, never silently mixed.
5. Vector databases, microservices, message queues, and other infrastructure the MVP doesn't need are deferred to production, not built speculatively now.

## Getting started

```text
frontend/       React UI
backend-node/   API/business logic, auth, RBAC, orchestration
ai-service/     ML/analytics calculations
n8n/            automation workflows
data/           real/ and synthetic/ source data
tests/
docs/           this documentation set, plus docs/decisions/
```

Follow `phases.doc.md` for build order — start at Phase 1. Each phase has an exit checklist; don't treat a phase as done until it's satisfied.
