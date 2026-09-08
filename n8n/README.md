# MPLADS Platform — n8n Background Automation Workflows

This directory contains the n8n workflow definitions and operational deployment instructions for **Phase 7: n8n Automation & Background Workflows** of the MPLADS AI Risk Monitoring & Decision Support Platform (SIH Problem Statement 26102).

---

## 1. Architectural Principles & Boundaries

As mandated by `rules.md` §6 and `architecture.md` §26.2:

1. **Background Automation Only**:
   n8n operates strictly in the background (scheduled jobs, alert dispatching, multi-tier escalation, ingestion triggers).
   n8n **never** handles user login, session issuance, RBAC checks, or transactional officer decisions.
2. **Zero Direct Database Access**:
   n8n **never** connects directly to MongoDB collections. All reads and mutations are conducted through Express internal endpoints (`/api/internal/*`) using authenticated service credentials.
3. **Core Application Independence**:
   The entire core application (MP work recommendations, District Collector review & sanction, payment processing, deterministic compliance evaluation, and Project 360) operates completely independently and remains **100% functional even when n8n is stopped or unreachable**.
4. **Advisory / Deterministic Only**:
   Background monitoring leverages **Phase 6 deterministic compliance rules**. AI risk scoring and machine learning models are reserved for Phase 8 and Phase 9.

---

## 2. Workflows Catalog

All workflow templates are located in `n8n/workflows/`:

| File | Workflow Name | Trigger | Target Endpoint | Description |
|---|---|---|---|---|
| `workflow-1-data-ingestion.json` | **MPLADS — Data Ingestion** | Webhook / Manual | `POST /api/internal/ingestion/allocations` | Ingests and normalizes MP allocation data (`data/real/mplads_allocated_clean.csv`) with `is_real_government_data: true`. |
| `workflow-2-scheduled-compliance-monitor.json` | **MPLADS — Scheduled Compliance Monitor** | Cron (Daily 02:00 UTC) | `GET /api/internal/projects/active`<br>`POST /api/internal/compliance/evaluate-batch` | Runs daily compliance evaluations across all active works. Dispatches alert payloads for review-required and non-compliant works. |
| `workflow-3-notifications-router.json` | **MPLADS — Notifications Router** | Webhook | `POST /api/internal/notifications` | Routes compliance findings to responsible authority roles (District Collector, State Nodal, Ministry). |
| `workflow-4-escalation-handler.json` | **MPLADS — Escalation Handler** | Webhook | `POST /api/internal/escalations` | Evaluates repeated compliance failures or threshold breaches, triggering multi-tier administrative escalation. |
| `workflow-5-inspection-recommendation-shell.json` | **MPLADS — Inspection Recommendation Shell** | Webhook | `POST /api/internal/inspections/recommend` | Advisory shell that creates inspection recommendations for stalled or severely non-compliant works. |

---

## 3. Quick Start & Setup

### Option A: Local Execution via `npx`
```bash
# Set environment variables
export INTERNAL_API_BASE_URL="http://localhost:5000"
export N8N_SERVICE_TOKEN="mplads_dev_n8n_service_secret_token_123"

# Start n8n
npx n8n
```
n8n web interface will be available at `http://localhost:5678`.

### Option B: Docker
```bash
docker run -it --rm \
  --name mplads-n8n \
  -p 5678:5678 \
  -e INTERNAL_API_BASE_URL="http://host.docker.internal:5000" \
  -e N8N_SERVICE_TOKEN="mplads_dev_n8n_service_secret_token_123" \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

---

## 4. Configuring Credentials in n8n

1. In the n8n UI, navigate to **Credentials** → **New Credential**.
2. Search for and select **Header Auth**.
3. Configure the credential:
   - **Credential Name**: `MPLADS Internal Service Auth`
   - **Name**: `X-Service-Token`
   - **Value**: `mplads_dev_n8n_service_secret_token_123` (or the token specified in `.env`)
4. Save the credential. Workflows imported from `n8n/workflows/` will automatically reference this credential.

---

## 5. Importing Workflows

1. In the n8n UI, go to **Workflows** → Click the `...` menu in the top right → **Import from File**.
2. Select any JSON file from `n8n/workflows/`.
3. Activate the workflow using the **Active** toggle switch in the top right corner.

---

## 6. Verifying Core Path Independence (Stop n8n Test)

To prove that core platform transactions do not depend on n8n:
1. Stop the n8n server process (`Ctrl+C` or `docker stop mplads-n8n`).
2. Log into the platform as an MP (`MP-IND-01`) and submit a new work recommendation.
3. Log into the platform as a District Authority (`DA-IND-01`) and review/sanction the work.
4. Run compliance evaluation via the Project 360 modal.
5. All operations will succeed with HTTP 200/201 and complete state transitions, verifying zero hard dependency on n8n.

