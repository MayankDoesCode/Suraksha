# SentinelShield — Digital Risk Protection Platform

SentinelShield is an enterprise-grade Digital Risk Protection (DRP) platform designed to discover, assess, and investigate brand impersonation, fraudulent profiles, lookalike domains, and suspicious mobile applications across digital ecosystems.

---

## Phase 1: Foundation & Advanced Architecture

Phase 1 establishes the production-ready foundation, data models, versioned REST API, modular integration boundaries, and a cybersecurity dashboard UI.

### Key Implemented Capabilities
- **Brand Identity Management**: Full CRUD lifecycle for organizational identity ground truth.
- **Relational Asset Schema**: Structured models for verified domains, official social media handles, mobile application package IDs, and authorized developer/publisher signatures with cascading deletion.
- **Deterministic Validation & Sanitization**: Strict input validation, normalization (e.g. domain syntax, scheme enforcement, `@` handle stripping), and HTTP status codes (200, 201, 400, 404, 409, 422, 500).
- **Centralized Error Handling**: Uniform JSON error responses across all endpoints without internal stack traces or secret leakage.
- **System Health Diagnostics**: Real-time `GET /api/v1/health` with live database ping and service metadata.
- **Database Migrations**: Alembic migration environment (`001_initial_schema`) with migration path to PostgreSQL.
- **Future Integration Boundaries**: Modular interfaces defined for Connectors (`connectors/base.py`), Deterministic Signal Detection (`detection/base.py`), Collection Scheduling (`monitoring/base.py`), Evidence Registries (`investigations/base.py`), and AI Provider Abstraction (`ai/base.py`).
- **Cybersecurity Dashboard**: React + Vite + Tailwind CSS dark-mode dashboard with real-time health indicator, brand management, detailed asset drawer, diagnostics view, and transparent Phase 2 roadmaps.
- **Zero-Fabrication Policy**: No fake threat alerts or simulated detections are presented as real.

---

## Project Structure

```
Suraksha/
├── .env.example                     # Environment variables template
├── .gitignore                       # Git exclusions (venv, db, node_modules, dist)
├── alembic.ini                      # Database migration configuration
├── README.md                        # Documentation and architecture guide
│
├── backend/
│   ├── alembic.ini                  # Local alembic configuration
│   ├── requirements.txt             # Python dependencies
│   ├── run.py                       # Server entry point (Flask WSGI)
│   ├── app/
│   │   ├── __init__.py              # Application factory (create_app)
│   │   ├── config.py                # Environment configuration classes
│   │   ├── database.py              # SQLAlchemy engine, session & ping
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py      # Versioned /api/v1 blueprint aggregation
│   │   │       ├── health.py        # GET /api/v1/health
│   │   │       └── brands.py        # Brand CRUD endpoints
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── brand.py             # Brand, Domain, Social, App, Publisher models
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── brand_repository.py  # Database query abstraction
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── brand_service.py     # Business rules & duplicate validation
│   │   ├── validation/
│   │   │   ├── __init__.py
│   │   │   └── brand_validator.py   # Input validation rules
│   │   ├── utils/
│   │   │   └── errors.py            # Custom exceptions & HTTP error handlers
│   │   ├── connectors/
│   │   │   ├── __init__.py
│   │   │   └── base.py              # Future connector interface contract
│   │   ├── detection/
│   │   │   ├── __init__.py
│   │   │   └── base.py              # SignalDetector & RiskEngine boundary
│   │   ├── monitoring/
│   │   │   ├── __init__.py
│   │   │   └── base.py              # Collection job scheduling boundary
│   │   ├── investigations/
│   │   │   ├── __init__.py
│   │   │   └── base.py              # Evidence artifact & correlation schema
│   │   └── ai/
│   │       ├── __init__.py
│   │       └── base.py              # Provider-independent AI assistance interface
│   ├── migrations/
│   │   ├── env.py                   # Alembic runtime environment
│   │   ├── script.py.mako           # Migration template
│   │   └── versions/
│   │       └── 001_initial_brand_schema.py # Initial database schema
│   └── tests/
│       ├── conftest.py              # Pytest fixtures & in-memory test database
│       ├── test_health.py           # Health endpoint tests
│       └── test_brands.py           # Brand CRUD & validation tests
│
└── frontend/
    ├── package.json                 # Node dependencies & build scripts
    ├── vite.config.js               # Vite configuration
    ├── tailwind.config.js           # Cybersecurity dark theme design tokens
    ├── postcss.config.js            # PostCSS configuration
    ├── index.html                   # HTML entry point with Google Fonts
    └── src/
        ├── main.jsx                 # React root render
        ├── App.jsx                  # Main dashboard layout & state machine
        ├── index.css                # Tailwind directives & cyber aesthetics
        ├── api/
        │   └── client.js            # REST client with structured error handling
        └── components/
            ├── Sidebar.jsx          # Collapsible navigation & phase badges
            ├── Header.jsx           # Real-time health pulse & actions
            ├── BrandList.jsx        # Metrics, search, profile cards, empty state
            ├── BrandModal.jsx       # Multi-asset create & edit form modal
            ├── BrandDetailDrawer.jsx# Comprehensive identity inspection drawer
            ├── DeleteConfirmModal.jsx # Cascading deletion safety confirmation
            ├── DiagnosticsView.jsx  # Live API latency, database & endpoint table
            └── PlannedModuleView.jsx# Architectural roadmaps for Phase 2 modules
```

---

## Setup & Running Instructions

### 1. Prerequisites
- **Python 3.10+** (tested with Python 3.14.6)
- **Node.js 18+** & **npm 9+** (tested with Node v22.14.0)

### 2. Backend Setup
```bash
# Navigate to project root
cd Suraksha

# (Optional) Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run database migrations
python -m alembic upgrade head

# Start Flask backend server
python backend/run.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### 3. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd Suraksha/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend runs on `http://127.0.0.1:5173`.*

---

## Testing & Verification Commands

### Backend Automated Test Suite
```bash
# Run pytest with verbose output
python -m pytest backend/tests -v
```
**Test Results:**
- `backend/tests/test_health.py::test_health_check_returns_healthy` **PASSED**
- `backend/tests/test_brands.py::test_create_and_get_brand_profile` **PASSED**
- `backend/tests/test_brands.py::test_list_brands_with_pagination_and_search` **PASSED**
- `backend/tests/test_brands.py::test_update_brand_profile` **PASSED**
- `backend/tests/test_brands.py::test_delete_brand_profile_cascades` **PASSED**
- `backend/tests/test_brands.py::test_duplicate_brand_name_returns_409` **PASSED**
- `backend/tests/test_brands.py::test_validation_errors` **PASSED**
- `backend/tests/test_brands.py::test_get_nonexistent_brand_returns_404` **PASSED**
*8 passed in 0.22s*

### Frontend Production Build Check
```bash
cd frontend
npm run build
```
**Build Results:**
- `✓ 1918 modules transformed.`
- `dist/index.html (1.14 kB)`
- `dist/assets/index-BHsam0SB.css (20.40 kB)`
- `dist/assets/index-O7u_BAaA.js (291.91 kB)`
- `✓ built in 1.10s`

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System and database connectivity status |
| `GET` | `/api/v1/brands` | List brand profiles (supports `?search=`, `?page=`, `?per_page=`) |
| `POST` | `/api/v1/brands` | Register a new brand with verified domains, handles, packages |
| `GET` | `/api/v1/brands/<id>` | Retrieve full brand profile and relational assets |
| `PUT` | `/api/v1/brands/<id>` | Update brand profile and synchronize asset relationships |
| `DELETE` | `/api/v1/brands/<id>` | Permanently delete brand profile and cascade delete child assets |

---

## Security & Deployment Considerations
- **No Hardcoded Secrets**: Secrets are loaded from `.env` via `python-dotenv`.
- **Request Limits**: Enforces 5MB max payload size (`MAX_CONTENT_LENGTH`).
- **URL Sanitization**: Logo and profile URLs strictly validate schemes (`http://`, `https://`) and hostnames, blocking dangerous schemes like `javascript:`.
- **Production Migration Path**: To migrate from SQLite to PostgreSQL, update `DATABASE_URL=postgresql://user:pass@host:5432/dbname` in `.env` and execute `python -m alembic upgrade head`.
- **Local Development Notice**: Authentication and access tokens are omitted in Phase 1; this platform is configured for local development and requires reverse proxy / OAuth2 authentication before public deployment.

---

## Phase 2 Roadmap
Upon approval, Phase 2 will introduce:
1. **Source Connectors**: Official Graph/REST API integrations and Certificate Transparency stream ingestion.
2. **Deterministic Detection Signals**: Name distance algorithms (Levenshtein, Jaro-Winkler) and lookalike domain generation (bitsquatting, typosquatting, IDN homoglyphs).
3. **Background Job Orchestration**: Celery/Redis or APScheduler workers for non-blocking collections.
4. **Evidence Registry**: Immutable snapshot captures with cryptographic hashes.
5. **AI Copilot (Groq / LangSmith)**: Evidence summarization and investigation briefing without black-box fraud verdicts.
