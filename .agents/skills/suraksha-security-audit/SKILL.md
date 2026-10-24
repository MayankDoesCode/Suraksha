---
name: suraksha-security-audit
description: Autonomous cybersecurity, ML reliability, and DevSecOps audit agent skill for the SURAKSHA platform. Verifies CodeRabbit and DeepSource integration status, uncovers realistic vulnerabilities, audits ML datasets and pipelines, and generates actionable, evidence-based remediation plans.
---

# SURAKSHA Security Audit Agent Skill

An autonomous, multi-disciplinary agent skill for conducting comprehensive cybersecurity, ML reliability, DevSecOps, and static analysis reviews on the **SURAKSHA** platform.

```
       ┌────────────────────────────────────────────────────────┐
       │             SURAKSHA AUDIT AGENT PROTOCOL              │
       └──────────────────────────┬─────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────┐                              ┌──────────────────┐
│  A. GIT SAFETY   │                              │ B/C. CI TOOLS    │
│  • Read-only run │                              │ • CodeRabbit PR  │
│  • Preserve work │                              │ • DeepSource run │
└────────┬─────────┘                              └────────┬─────────┘
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  ▼
         ┌─────────────────────────────────────────────────┐
         │ D. APPLICATION & CLOUD SECURITY                 │
         │ • Auth/BOLA    • SQLi/SSRF   • CORS/Headers     │
         │ • Rate Limits  • Secrets     • Deps/Config      │
         └────────────────────────┬────────────────────────┘
                                  ▼
         ┌─────────────────────────────────────────────────┐
         │ E. ML RELIABILITY & PROVENANCE                  │
         │ • Domain Overlap  • Leakage  • Host-Only Recall │
         │ • Dataset Provenance         • Rule vs ML Real  │
         └────────────────────────┬────────────────────────┘
                                  ▼
         ┌─────────────────────────────────────────────────┐
         │ F. FUNCTIONAL INTEGRATION & TESTING             │
         │ • Pytest 340+  • Node Test   • Vite Build       │
         └────────────────────────┬────────────────────────┘
                                  ▼
         ┌─────────────────────────────────────────────────┐
         │ H. RANKED REPORTING & FIX PLANNING              │
         │ • P0 - P3      • Defect vs Hypo • Plan & Gate   │
         └─────────────────────────────────────────────────┘
```

---

## Protocol A: Repository & Git Safety

1. **Verify Workspace State:**
   - Always run `git status` and `git log -n 5 --oneline` before initiating analysis.
   - Confirm current working branch and remote tracking branch.
2. **Preserve User Modifications:**
   - **Never** run `git reset`, `git clean`, `git restore`, or `git checkout -- <file>` on user-modified files.
   - Untracked files and working tree edits must remain untouched.
3. **Strict Read-Only Audit Mode:**
   - The audit must run without altering application logic or configuration.
   - Do not commit directly to `main`.
   - Never push branches or merge pull requests without explicit user authorization.

---

## Protocol B: CodeRabbit Review Verification

1. **GitHub App Connection Check:**
   - Verify whether `coderabbitai[bot]` is installed on `MayankDoesCode/Suraksha`.
   - Check existing pull requests using GitHub API (`/repos/{owner}/{repo}/pulls?state=open`).
2. **Configuration Inspection:**
   - Inspect `.coderabbit.yaml` or `.coderabbit.yml` in the repository root.
   - If missing, document that CodeRabbit is operating under default fallback settings.
3. **PR Review Analysis:**
   - Query PR comments (`/repos/{owner}/{repo}/issues/{pr_number}/comments`) and reviews (`/pulls/{pr_number}/reviews`).
   - Inspect CodeRabbit run configuration: Plan, profile (e.g., `CHILL`), commit SHA, and files analyzed.
   - Distinguish PRs with minimal diffs (e.g., documentation only) where no actionable code comments could be generated.
4. **Honesty Invariant:**
   - Never claim CodeRabbit reviewed source code unless actionable review comments or clear output are visible in the API/dashboard.

---

## Protocol C: DeepSource Analysis Verification

1. **App Connection & Configuration:**
   - Check if `deepsource-io[bot]` is active on the repository.
   - Inspect `.deepsource.toml` in the repository root.
   - Check enabled analyzers (e.g., `python`, `javascript`, `secrets`, `docker`, `shell`).
   - If `.deepsource.toml` is absent, explicitly document that DeepSource runs only the minimal default `Secrets` scanner.
2. **Run Status & Report Card:**
   - Inspect latest run ID and grade from PR comments or commit check-runs.
   - Verify whether issues were flagged in Python (`bandit`, `flake8`) or JavaScript/TypeScript (`eslint`).
   - Distinguish app installation from active static analysis.
3. **Trigger Requirements:**
   - Document the documented trigger for on-demand AI review (e.g., commenting `@deepsourcebot review` on the pull request thread).

---

## Protocol D: Application Security Audit

Systematically evaluate the backend (Flask) and frontend (React/Vite) across standard vulnerability classes:

1. **Authentication & Session Management:**
   - Firebase ID token verification in `backend/app/utils/auth.py`.
   - Google public certificate caching, key ID (`kid`) resolution, and RS256 signature verification.
   - Dev token escape hatches: Ensure `ALLOW_DEV_TOKENS` is strictly disabled in production.
2. **Authorization & Tenant Isolation (IDOR/BOLA):**
   - Verify that all entity lookups (`findings`, `brands`, `monitoring jobs`) enforce tenant ownership (`owner_id == user_id`).
   - Test for null/unassigned ownership bypasses where records with `owner_id IS NULL` can be accessed by unauthorized callers.
3. **Injection & Database Queries:**
   - Verify that SQLAlchemy ORM uses parameterized queries.
   - Inspect raw SQL calls, migration scripts, and dynamic filters.
4. **SSRF & Network Interactions:**
   - Inspect external URL fetchers (`backend/app/detection/visual.py`, `backend/app/services/webhook_service.py`).
   - Verify IP validation guards (`_is_public_host`, `_is_public_url`).
   - Test for Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding vulnerabilities between socket resolution and HTTP requests.
5. **CORS & Security Headers:**
   - Ensure wildcard `*` CORS is rejected when `supports_credentials=True`.
   - Inspect production CORS allowlist for insecure entries (`https://localhost`).
   - Verify CSP, HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
6. **Rate Limiting & DoS Protection:**
   - Inspect `Flask-Limiter` configurations on all endpoints under `backend/app/api/v1/`.
   - Identify unthrottled CPU-intensive routes (e.g. ML inference, perceptual hashing, permutation generation).
7. **Secrets & Sensitive Data Exposure:**
   - Check git history and tracked files for committed API keys, Firebase service accounts, or private configurations.
   - Verify that public client config endpoints (`/auth/config`) never expose server credentials.

### Required Finding Format:
For every discovered vulnerability, document:
- **Title & Severity:** (Critical, High, Medium, Low)
- **Confidence:** (High, Medium, Low)
- **Location:** File path and line numbers
- **Evidence:** Exact code snippet
- **Reproduction Steps:** Step-by-step reproduction command/request
- **Realistic Impact:** Concrete adversarial scenario
- **Remediation:** Drop-in code fix
- **Regression Test:** Test case ensuring the issue cannot reoccur

---

## Protocol E: ML Reliability Audit

1. **Dataset Provenance & Class Imbalance:**
   - Check training data sources (e.g., UCI PhiUSIIL, OTX/Tranco, InstaFake).
   - Verify sample counts, positive/negative ratios, and license compliance (e.g. CC BY-NC 4.0).
2. **Data Leakage & Train/Test Separation:**
   - Inspect splitting methodology: Verify that splits use **registrable domain grouping** (`GroupShuffleSplit`), not host or random splits.
   - Test for overlap between training root domains and external evaluation sets.
3. **Syntactic Leakage & Format-Shortcut Analysis:**
   - Compare performance between raw URL inputs and canonical hostnames.
   - Benchmark against a "format-only shortcut" baseline (length, slashes, hyphens) to reveal whether high scores stem from dataset formatting asymmetry.
4. **Model Loading & Runtime Version Compatibility:**
   - Inspect `backend/app/ml/artifact_compat.py`.
   - Check `scikit-learn` and `joblib` runtime versions against the versions embedded in `.joblib` artifacts.
   - Verify graceful degradation to heuristic rules when an artifact version mismatch occurs.
5. **Rule-Based vs Genuine ML Realities:**
   - Inspect manifests (`url_phishing_manifest.json`, `social_fake_manifest.json`, `mobile_app_manifest.json`).
   - If a component has `"trained": false` or lacks labelled ground-truth data, explicitly document that it is **rule-based**. Never misrepresent deterministic heuristics as trained ML models.

---

## Protocol F: Functional & Integration Audit

Trace data from ingestion to dashboard display:
```
Target Asset / URL / App / Profile
  │
  ▼
External Connectors / API Input
  │
  ▼
Detection Engine (Visual Hash, Confusables, Lexical Rules)
  │
  ▼
ML Advisory Inference (URL Phishing, Social Metadata)
  │
  ▼
Database Persistence (Alembic ORM, Tenant Scoping)
  │
  ▼
REST API Blueprint (/api/v1/)
  │
  ▼
Frontend Dashboard & Evidence Manifest (Takedown Notices)
```

1. **Execute Backend Test Suite:**
   ```powershell
   .\.venv\Scripts\python -m pytest backend/tests -q
   ```
2. **Execute Frontend Test Suite:**
   ```powershell
   cd frontend; npm test
   ```
3. **Execute Production Frontend Build:**
   ```powershell
   cd frontend; npm run build
   ```
4. **Document Execution State:**
   - Report tests executed, tests passed, tests skipped, and any tests blocked by missing external credentials.

---

## Protocol G: Integration Limits & Boundary Protocol

1. **Authentication & Human Approval Boundaries:**
   - If an operation requires GitHub 2FA, DeepSource dashboard login, Firebase console changes, or payment approval, stop at that boundary.
   - Provide the exact URL, command, or action required by the account owner.
2. **No Faked Successes:**
   - Never simulate or assume a tool succeeded without viewing direct command output, API response, or DOM state.
3. **No Disruptive Pull Requests:**
   - Do not push commits or open dummy PRs merely to trigger bot webhooks.

---

## Protocol H: Prioritization, Reporting & Fix Planning

1. **Severity Classification:**
   - **P0 (Critical):** Immediate production compromise, remote code execution, active credential leakage.
   - **P1 (High):** Cross-tenant authorization bypass (BOLA/IDOR), committed secrets, critical detection bypass.
   - **P2 (Medium):** SSRF rebinding risks, missing endpoint rate limiting, ML format leakage, detection rule flaws.
   - **P3 (Low):** Minor configuration hygiene, overly broad CORS, code quality/lint recommendations.
2. **Defect Classification:**
   - **Confirmed Defect:** Empirically verified with reproducible code evidence.
   - **Potential Defect:** Unverified hypothesis requiring additional live fixtures.
   - **Code Quality:** Best-practice or maintainability improvement.
   - **False Positive:** Automated scanner alert deemed safe after manual analysis.
3. **Fix Planning Lock:**
   - Do not begin modifying code until the prioritized fix plan is reviewed and approved by the user.
   - Each proposed fix must specify: files to change, risk of regression, required tests, rollback strategy, and acceptance criteria.
