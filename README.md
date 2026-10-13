# SURAKSHA — AI-Assisted Digital Risk Protection Platform

> **Detect. Verify. Protect.**  
> An enterprise-grade Digital Risk Protection (DRP) platform designed to discover, assess, and mitigate brand impersonation, fraudulent social profiles, lookalike domains, and rogue mobile applications.

[![Tests](https://img.shields.io/badge/backend%20tests-38%20passed-emerald)](file:///c:/Users/MAYANK/OneDrive/Desktop/Suraksha/backend/tests)
[![Vite Build](https://img.shields.io/badge/frontend%20build-passing-emerald)](file:///c:/Users/MAYANK/OneDrive/Desktop/Suraksha/frontend)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.14-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

---

## 1. Executive Overview & Architecture

SURAKSHA provides real-time brand abuse detection by ingesting external ecosystem signals, comparing them deterministically against verified organizational assets (ground truth), excluding authorized corporate identities, and scoring residual threats with explainable mathematical models.

### System Architecture Diagram

```mermaid
flowchart TD
    subgraph UI ["SURAKSHA Cyber Dashboard (React 18 + Tailwind)"]
        Dashboard["Brand Profiles & Assets"]
        AppGuard["Mobile App Guard"]
        SocialWatch["Social Impersonation Watch"]
        ThreatExp["Threat Intelligence Explorer"]
        Diagnostics["Diagnostics & Integrations Telemetry"]
    end

    subgraph API ["REST API Layer (Flask 3.1 WSGI)"]
        HealthEndpoint["/api/v1/health"]
        BrandEndpoints["/api/v1/brands"]
        FindingEndpoints["/api/v1/findings"]
        ProviderEndpoints["/api/v1/brands/:id/scan-provider"]
        IntegrationsEndpoint["/api/v1/integrations/status"]
    end

    subgraph Core ["Platform Core Engine"]
        Registry["Connector Registry"]
        ScanOrchestrator["Scan Service"]
        DetectionEngine["Detection Engine (App & Social)"]
        SimilaritySvc["Name Similarity (Levenshtein + Token)"]
        Scheduler["Monitoring Scheduler (Locks + Jobs)"]
    end

    subgraph Providers ["External Data Providers"]
        AppleAPI["Apple App Store (iTunes Search API)\n[LIVE • OPERATIONAL]"]
        TwitterAPI["Twitter / X API v2\n[REQUIRES X_BEARER_TOKEN]"]
        RedditAPI["Reddit API\n[REQUIRES OAUTH SCRIPT]"]
    end

    subgraph Storage ["Persistence Layer"]
        Repo["Threat & Brand Repositories"]
        DB[(Persistent Database\nSQLite / PostgreSQL)]
    end

    UI -->|REST JSON| API
    API --> Core
    ScanOrchestrator --> Registry
    Registry --> AppleAPI
    Registry --> TwitterAPI
    Registry --> RedditAPI
    ScanOrchestrator --> DetectionEngine
    DetectionEngine --> SimilaritySvc
    ScanOrchestrator --> Repo
    Repo --> DB
```

---

## 2. Implemented Capabilities Across Phases

### Phase 1: Foundation & Brand Identity Ground Truth
- **Brand CRUD**: Complete lifecycle management for organizations.
- **Relational Asset Whitelist**: Verified domains, official social handles, mobile package identifiers, and developer signatures.
- **Strict Input Validation**: Syntax enforcement for domains, handles, and URLs.
- **Centralized Error Handling**: Structured JSON error formatting with uniform HTTP status codes.

### Phase 2: Explainable Detection Engine
- **Deterministic Multi-Signal Evaluation**: Title similarity, package ID mismatch, unauthorized publisher detection, and description authority keyword analysis.
- **Mathematical Bounding**: Explainable score engine strictly normalized between 0.0 and 100.0, mapped to `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` severity tiers.
- **Zero Hallucination**: No unverified or simulated threat alerts are persisted.

### Phase 3: Threat Intelligence Explorer & Triage
- **Central Findings Database**: Persists candidates with complete relational evidence records and explainable signals.
- **Triage Lifecycles**: Review status management (`NEW`, `UNDER_INVESTIGATION`, `CONFIRMED_THREAT`, `FALSE_POSITIVE`, `RESOLVED`).
- **Data Provenance Filter**: Clear visual distinction between live provider discoveries and analyst sample submissions.

### Phase 4: Real External Data Provider Integration
- **Apple App Store (iTunes API)**:
  - Authorized access via Apple's official Search API.
  - Queries live iOS app listings matching brand keywords.
  - Normalizes real bundle IDs, seller names, and `apps.apple.com` store URLs.
  - Designated with `is_sample: False` and `detection_source: "itunes_app_store"`.
- **Twitter / X API v2 Connector**:
  - Implemented according to official Twitter v2 specifications.
  - Strict OAuth 2.0 Bearer Token authentication.
  - Clearly marked `not_configured` when credentials are absent.
  - **Zero-Scraping Policy**: Unauthenticated page scraping or bot evasion is strictly blocked.
- **Official Asset Exclusion Pipeline**:
  - Verified package IDs (e.g. `com.microsoft.Office.Outlook`) are identified and excluded before findings are saved.
- **Repeat Scan Deduplication**:
  - In-place updates for existing candidate findings. Zero duplicate database rows created on repeated scans.
- **Monitoring Scheduler**:
  - Background batch scheduler with per-brand execution locks (`threading.Lock`) preventing concurrent scans.

### Phase 5: End-to-End Verification & Production Readiness
- **Unified Production Serving**: Flask automatically serves the compiled Vite SPA bundle from `frontend/dist` when present, enabling single-origin deployment with zero CORS friction.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` with persistent PostgreSQL database.
- **Verified Zero Secret Leakage**: No environment variables, private keys, or credentials leaked in bundles, logs, or API responses.

---

## 3. External Data Providers Status

| Provider | Asset Type | Status | Auth Method | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Apple App Store (iTunes API)** | Mobile Applications | **OPERATIONAL (LIVE)** | Public Authorized REST API | Live search by brand, bundle ID extraction, developer validation, store URLs |
| **Twitter / X API v2** | Social Profiles | **NOT CONFIGURED** | OAuth 2.0 Bearer Token | User search, handle impersonation, bio analysis (Requires `X_BEARER_TOKEN`) |
| **Reddit API** | Social Accounts | **NOT CONFIGURED** | Script OAuth App | User lookup, community search (Requires `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`) |

> **Note on Social Monitoring**: SURAKSHA strictly adheres to platform terms of service. X/Twitter search requires an approved developer account with v2 Bearer Token read access. In the absence of credentials, the platform transparently reports the provider as unconfigured.

---

## 4. Local Quickstart

### Prerequisites
- Python 3.11+ (tested on Python 3.11 and Python 3.14)
- Node.js 18+ and npm

### 1. Clone & Configure Environment
```bash
git clone https://github.com/MayankDoesCode/Suraksha.git
cd Suraksha

# Copy environment variables template
cp .env.example .env
```

### 2. Backend Setup
```bash
# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend development server
python backend/run.py
```
Backend API will be running at `http://127.0.0.1:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend development dashboard will open at `http://127.0.0.1:5173`.

---

## 5. Production Deployment

### Option A: Docker Compose with PostgreSQL (Recommended)
SURAKSHA includes a production `docker-compose.yml` that provisions a persistent PostgreSQL database and the unified Gunicorn application:

```bash
docker-compose up --build -d
```
Access the application at `http://localhost:5000`. Data is persisted across restarts in the `postgres_data` volume.

### Option B: Cloud PaaS (Render / Railway / Fly.io)
1. **Render**: Use the included `render.yaml` Blueprint:
   - Connect repository to Render.
   - Blueprint provisions a managed PostgreSQL database and a Web Service running Gunicorn.
2. **Environment Variables on Host**:
   - `FLASK_ENV=production`
   - `SECRET_KEY=<generate-secure-random-key>`
   - `DATABASE_URL=postgresql://user:password@host:5432/dbname`
   - `ITUNES_STORE_COUNTRY=US`
   - `ITUNES_API_TIMEOUT=10`
   - `X_BEARER_TOKEN=<optional-for-twitter>`

---

## 6. Environment Variables Reference

| Variable Name | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `FLASK_ENV` | No | `development` | Environment mode (`development`, `testing`, `production`) |
| `PORT` | No | `5000` | Port for the backend API |
| `HOST` | No | `127.0.0.1` | Network host interface |
| `DATABASE_URL` | No | `sqlite:///sentinelshield.db` | SQLAlchemy connection string (`sqlite:///...` or `postgresql://...`) |
| `SECRET_KEY` | Production | Dev default | Session encryption key (mandatory in production) |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Allowed CORS origins (comma-separated) |
| `ITUNES_STORE_COUNTRY` | No | `US` | Store country code for Apple iTunes search |
| `ITUNES_API_TIMEOUT` | No | `10` | Timeout in seconds for Apple iTunes API requests |
| `X_BEARER_TOKEN` | Optional | `None` | Twitter / X API v2 OAuth 2.0 Bearer Token |
| `X_API_TIMEOUT` | No | `10` | Timeout in seconds for Twitter API requests |

---

## 7. Automated Test Suite & Build Verification

### Backend Tests
```bash
python -m pytest -v
```
**Results**:
- **38 passed in 1.57s**
- Covers brand CRUD, Apple iTunes API retrieval, network timeouts, rate limit responses (`429`), malformed payloads, Twitter v2 authentication checks, official asset exclusions, mathematical score limits, and repeat scan deduplication.

### Frontend Production Build
```bash
cd frontend
npm run build
```
**Results**:
- Vite v6 production bundle built cleanly in ~2.0s with zero lint or bundling errors.

---

## 8. Hackathon Demo Walkthrough

1. **Step 1: Brand Ground Truth Setup**
   - Navigate to **Brand Profiles**.
   - Create a verified organization (e.g. `Microsoft`).
   - Add verified official app: `ios_app_store`, identifier: `com.microsoft.Office.Outlook`.
2. **Step 2: Trigger Live Apple Store Scan**
   - Navigate to **Mobile App Guard**.
   - Select `Microsoft` from the target brand selector.
   - Observe the live provider badge: `Apple App Store (iTunes API) • OPERATIONAL • LIVE`.
   - Click **Run Live App Store Scan**.
   - Backend queries Apple's live API in real time.
3. **Step 3: Verify Official Whitelist Exclusion**
   - The verified official app (`Microsoft Outlook`) is excluded automatically with explanation:  
     `"Exact match against verified official mobile app package ID 'com.microsoft.Office.Outlook'"`.
   - Zero threat records created for the official application.
4. **Step 4: Inspect Threats in Threat Intelligence Explorer**
   - Navigate to **Threat Intelligence Explorer**.
   - View persisted suspicious findings with green `Apple Store` provenance badges and live store URLs.
   - Filter by **Live External Providers** tab.
5. **Step 5: Triage & Persist Review Status**
   - Click a finding to open the triage drawer.
   - Click **Confirm Threat**. Status updates to `CONFIRMED_THREAT`.
   - Refresh the page: status persists in the database.
6. **Step 6: Repeat Scan Deduplication**
   - Re-run the live scan in Mobile App Guard.
   - Verify total findings count in Threat Intelligence Explorer remains identical (no duplicate rows created).
7. **Step 7: System Diagnostics & Compliance**
   - Navigate to **System Diagnostics**.
   - View live API latency, database ping, and provider configuration telemetry with zero secret leakage.

---

## 9. Data Provenance & Limitations

1. **Live Provider vs Sample Data**:
   - Every finding carries an immutable `is_sample` flag and `detection_source` tag.
   - Candidates retrieved from Apple are marked `is_sample=False, detection_source="itunes_app_store"`.
2. **Social Monitoring Limitations**:
   - Twitter / X API requires a paid Basic tier or elevated research account for read access.
   - Without `X_BEARER_TOKEN`, live social querying is disabled to respect platform policies.
3. **Scan Execution Model**:
   - Public store APIs do not provide real-time webhooks or streaming sockets.
   - Scans run on-demand or at scheduled intervals via the built-in scheduler.

---

## 10. Production Deployment Guide (Render)

SURAKSHA is packaged for zero-downtime, single-origin production deployment on Render using multi-stage Docker or native WSGI with PostgreSQL.

### Architecture on Render
- **Single Origin**: Gunicorn serves both the versioned Flask REST API (`/api/v1`) and the compiled Vite React Single Page Application (`/`) from a single container, eliminating cross-origin (CORS) complexity and mixed-content issues.
- **Persistent Database**: Render Managed PostgreSQL instance with automatic connection string wiring.
- **Safe Migrations**: `alembic upgrade head` executes automatically prior to Gunicorn boot, ensuring schema integrity without data loss.
- **Zero Secret Exposure**: Zero hardcoded credentials. All runtime keys are ingested via environment variables.

### Option A: 1-Click Blueprint Deployment (Recommended)
1. Push your repository to GitHub.
2. In the Render Dashboard, click **New +** > **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml` to provision:
   - `suraksha-db`: Free-tier PostgreSQL database.
   - `suraksha-platform`: Docker web service with `/api/v1/health` health check.
4. Click **Apply**.

### Option B: Manual Dashboard Provisioning

#### Step 1: Create PostgreSQL Database
1. In Render Dashboard, click **New +** > **PostgreSQL**.
2. Name: `suraksha-db`
3. Database: `suraksha_db`
4. User: `suraksha`
5. Region: Choose your preferred region (e.g. `Oregon (US West)` or `Frankfurt (EU Central)`).
6. Plan: **Free**
7. Click **Create Database**.
8. Once provisioned, copy the **Internal Database URL** (`postgres://...`).

#### Step 2: Create Web Service
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `suraksha-platform`
   - **Region**: Same region as your database.
   - **Branch**: `main`
   - **Runtime**: **Docker** (Render uses the root `Dockerfile`).
   - **Plan**: **Free**
4. Under **Advanced** > **Health Check Path**, enter: `/api/v1/health`.
5. Under **Environment Variables**, add:
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: *(click Generate or enter a secure 32+ character random string)*
   - `DATABASE_URL`: *(paste the Internal Database URL from Step 1)*
   - `ITUNES_STORE_COUNTRY`: `US`
   - `ITUNES_API_TIMEOUT`: `10`
   - `X_BEARER_TOKEN`: *(optional, leave blank if not using Twitter v2)*
6. Click **Create Web Service**.

### Post-Deployment Verification Checklist
- **Health Check**: `GET https://<your-service>.onrender.com/api/v1/health` returns `200 OK` with `"status": "healthy"`.
- **SPA UI**: Visit `https://<your-service>.onrender.com/` in your browser.
- **Live Scan**: Navigate to Mobile App Guard and trigger a live Apple App Store scan for your configured brand.

---

## License

MIT License. Designed and built for digital risk protection and brand security.
