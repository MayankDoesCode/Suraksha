# Security overview

**Authentication:** Firebase ID tokens, RS256 only, verified against Google's public certificates with audience, issuer, expiry and subject checks. Dev/demo tokens are disabled in production (`ALLOW_DEV_TOKENS=false`).
**Authorization:** role checks (`admin`, `lead`, `analyst`) on every write route; brands and findings are scoped to their owner.
**Startup guardrails:** production refuses to start with a missing/short `SECRET_KEY` or a wildcard CORS origin.
**Abuse control:** per-route rate limits (default 200/min, ML 30/min, AI 15/min), including the public copilot routes.
**Outbound requests:** webhooks only reach public addresses (loopback/private/metadata blocked, redirects off); all fetches have timeouts.
**Response headers:** CSP (HTML), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, HSTS over HTTPS, `Cache-Control: no-store` on the API.
**Errors:** internal exception text is logged, never returned to clients.
**Data:** parameterised SQLAlchemy queries only; no `eval`/`exec`/`pickle` of user input; request body capped at 5 MB.
**Supply chain:** `pip-audit` reports no known vulnerabilities in `backend/requirements.txt`; gitleaks runs in CI.
**Known limits:** the public copilot routes are unauthenticated by design (rate-limited); CSP allows inline scripts for the runtime config tag; a single-user rate-limit store (`memory://`) resets on restart unless `RATELIMIT_STORAGE_URI` points to Redis.
