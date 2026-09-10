# Deployment & Operations Guide — MPLADS AI Platform

## Architecture Overview
The platform consists of three core services and a database:
1. **Frontend**: Single Page Application built with React 18 and Vite.
2. **Backend API**: Node.js / Express monolith serving REST APIs, RBAC, domain models, and orchestrating analytical queries.
3. **AI Microservice**: Python FastAPI service performing statistical anomaly detection, text similarity analysis, and LLM explanation generation.
4. **Database**: MongoDB 6+ storing all 21 central domain collections with append-only plugins on immutable registries.

---

## Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: v6.0 or higher (Standalone or Replica Set; Atlas cluster supported)
- **Python** (Optional for standalone mock mode): v3.10 or higher

---

## Environment Setup

### 1. Backend Service (`backend-node/.env`)
Copy `backend-node/.env.example` to `backend-node/.env`:
```bash
cp backend-node/.env.example backend-node/.env
```
Key configuration parameters:
- `PORT`: HTTP server port (Default: `5000`)
- `MONGODB_URI`: Connection string (e.g., `mongodb://127.0.0.1:27017/mplads`)
- `CLIENT_ORIGIN`: CORS origin (e.g., `http://localhost:5173`)
- `JWT_SECRET`: Minimum 32-character secret for access tokens
- `JWT_REFRESH_SECRET`: Minimum 32-character secret for refresh tokens
- `AI_SERVICE_URL`: URL of Python microservice (Default: `http://localhost:8000`)
- `AI_PROVIDER`: `mock` (no API key required) or `gemini` (requires `GEMINI_API_KEY`)

### 2. Frontend Application (`frontend/`)
Vite uses relative proxying or `VITE_API_BASE_URL` if cross-origin.
By default, Vite proxies `/api` directly to `http://localhost:5000`.

### 3. AI Service (`ai-service/.env`)
Copy `ai-service/.env.example` to `ai-service/.env`:
```bash
cp ai-service/.env.example ai-service/.env
```
Key parameters:
- `GEMINI_API_KEY`: API key from Google AI Studio (if using Gemini)
- `AI_PROVIDER`: `gemini`, `ollama`, or `mock`

---

## Installation & Startup

### Step 1: Install Dependencies
```bash
# Install backend dependencies
npm --prefix backend-node install

# Install frontend dependencies
npm --prefix frontend install

# (Optional) Install Python AI microservice dependencies
pip install -r ai-service/requirements.txt
```

### Step 2: Seed Initial Data
```bash
# Seed 542 real government MP allocations from MoSPI clean data
npm --prefix backend-node run load:allocations

# Seed default users across all 7 platform roles
# Automatically runs on startup, or seed demo works directly:
npm --prefix backend-node run seed:demo
```

### Step 3: Run Services

#### Development Mode
```bash
# Terminal 1: Backend API (port 5000)
npm --prefix backend-node run dev

# Terminal 2: Frontend Dev Server (port 5173)
npm --prefix frontend run dev

# Terminal 3 (Optional): AI Microservice (port 8000)
uvicorn ai-service.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Production Mode
```bash
# Build frontend production bundle
npm --prefix frontend run build

# Start backend production server
npm --prefix backend-node start
```

---

## Verification & Health Checks
- Backend Health Check: `GET http://localhost:5000/health`
  - Returns: `{"status": "ok", "database": "connected"}`
- Frontend Test Suite:
  ```bash
  node --test tests/frontend/*.test.js
  ```
- Backend Test Suite:
  ```bash
  npm --prefix backend-node test
  ```
- Frontend Production Build:
  ```bash
  npm --prefix frontend run build
  ```

