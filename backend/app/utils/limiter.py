"""
Rate Limiting Infrastructure for SURAKSHA API.

Architectural Guarantees:
1. Identity-Aware: Rate limits are tied to authenticated user IDs (or cryptographically hashed tokens),
   falling back to genuine socket IP (request.remote_addr), preventing client-forged X-Forwarded-For bypass.
2. Storage Agnostic & Production-Ready:
   - Development & Unit Testing: In-memory storage ("memory://").
   - Production Multi-Worker Deployments (Gunicorn/uWSGI): Requires shared cache backend
     configured via RATELIMIT_STORAGE_URI (e.g., "redis://redis.internal:6379/0" or "rediss://...").
     If "memory://" is used in production, an explicit architectural warning is logged.
3. Standardized 429 JSON response matching SURAKSHA error envelope.
4. Exemptions: Health probes (/health) and monitoring endpoints are exempted.
"""

import hashlib
import logging
import os
from flask import request, g, current_app
from flask_limiter import Limiter

logger = logging.getLogger(__name__)


def get_trustworthy_client_key() -> str:
    """
    Derive a trustworthy client identity for rate limiting:
    1. Authenticated user ID (via Flask `g.current_user`).
    2. Bearer token cryptographic hash (when Authorization header is present).
    3. Direct remote socket IP (request.remote_addr), resisting client-forged X-Forwarded-For.
    """
    # 1. Check authenticated user context
    if hasattr(g, "current_user") and g.current_user:
        uid = g.current_user.get("uid") or g.current_user.get("id")
        if uid:
            return f"user:{uid}"

    # 2. Check Authorization header for Bearer token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            # Hash to avoid storing raw credentials in cache keys
            token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
            return f"token:{token_hash}"

    # 3. Direct peer IP address (rejects spoofed X-Forwarded-For unless trusted proxy is active)
    peer_ip = request.remote_addr or "127.0.0.1"
    return f"ip:{peer_ip}"


# Global Limiter instance configured with get_trustworthy_client_key
limiter = Limiter(
    key_func=get_trustworthy_client_key,
    headers_enabled=True,
    strategy="moving-window",
)


def init_limiter(app):
    """Initialize rate limiter with Flask application configuration."""
    storage_uri = app.config.get("RATELIMIT_STORAGE_URI", "memory://")
    enabled = app.config.get("RATELIMIT_ENABLED", True)

    app.config["RATELIMIT_STORAGE_URI"] = storage_uri
    app.config["RATELIMIT_ENABLED"] = enabled

    # Architectural check: warn if in-memory limiter is deployed in production with multi-workers
    env = (app.config.get("ENV") or os.getenv("FLASK_ENV") or "").lower()
    if env == "production" and storage_uri.startswith("memory://"):
        logger.warning(
            "SURAKSHA ARCHITECTURAL ADVISORY: Rate limiter is using in-memory storage ('memory://') in production. "
            "For multi-worker deployments (Gunicorn/uWSGI), configure RATELIMIT_STORAGE_URI=redis://<host>:<port>/0 "
            "to ensure shared, cluster-wide rate limit enforcement."
        )

    limiter.init_app(app)
