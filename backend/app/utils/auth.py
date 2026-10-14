import logging
import time
from functools import wraps
from typing import Dict, Any, Optional, List
import requests
import jwt
from cryptography.x509 import load_pem_x509_certificate
from flask import request, jsonify, current_app, g

logger = logging.getLogger(__name__)

# Google public certificates cache for Firebase token verification
_GOOGLE_CERTS_CACHE: Dict[str, str] = {}
_GOOGLE_CERTS_EXPIRY: float = 0.0
_GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

# Standard role mapping
ROLE_NORMALIZATION = {
    "admin": "admin",
    "lead": "lead",
    "threat lead": "lead",
    "principal threat intelligence analyst": "lead",
    "analyst": "analyst",
    "security analyst": "analyst",
    "brand security analyst": "analyst",
    "viewer": "viewer",
    "read_only": "viewer",
}

def normalize_role(role_name: Optional[str]) -> str:
    """Normalize user role to standard tier: 'admin', 'lead', 'analyst', 'viewer'."""
    if not role_name:
        return "analyst"
    clean = str(role_name).strip().lower()
    return ROLE_NORMALIZATION.get(clean, "analyst")


def get_google_public_certs() -> Dict[str, str]:
    """
    Retrieve and cache Google's public certificates for Firebase token verification.
    Refreshes cache when expired.
    """
    global _GOOGLE_CERTS_CACHE, _GOOGLE_CERTS_EXPIRY
    now = time.time()
    if _GOOGLE_CERTS_CACHE and now < _GOOGLE_CERTS_EXPIRY:
        return _GOOGLE_CERTS_CACHE

    try:
        resp = requests.get(_GOOGLE_CERTS_URL, timeout=5.0)
        resp.raise_for_status()
        certs = resp.json()

        # Parse Cache-Control header for max-age, default 3600 seconds
        max_age = 3600
        cache_control = resp.headers.get("Cache-Control", "")
        for directive in cache_control.split(","):
            directive = directive.strip().lower()
            if directive.startswith("max-age="):
                try:
                    max_age = int(directive.split("=")[1])
                except (ValueError, IndexError):
                    pass

        _GOOGLE_CERTS_CACHE = certs
        _GOOGLE_CERTS_EXPIRY = now + max(60, max_age)
        return _GOOGLE_CERTS_CACHE
    except Exception as exc:
        logger.warning("Failed to fetch Google public certs for Firebase auth: %s", exc)
        if _GOOGLE_CERTS_CACHE:
            return _GOOGLE_CERTS_CACHE
        return {}


def create_dev_token(
    uid: str = "analyst-demo-001",
    email: Optional[str] = "analyst@suraksha.local",
    role: str = "admin",
    secret: Optional[str] = None,
    expires_in_sec: int = 3600,
) -> str:
    """
    Generate an HS256 development JWT for local testing and authenticated fixtures.
    """
    now = int(time.time())
    secret_key = secret or (current_app.config.get("SECRET_KEY") if current_app else "test-secret-key-32-chars-long-strictly")
    payload = {
        "sub": uid,
        "email": email,
        "role": normalize_role(role),
        "iat": now,
        "exp": now + expires_in_sec,
        "iss": "suraksha-dev-auth",
        "aud": "suraksha-api",
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


def verify_token(token: str) -> Dict[str, Any]:
    """
    Validate incoming Bearer token:
    1. In dev/testing (ALLOW_DEV_TOKENS=True): accepts HS256 dev tokens or 'demo-analyst-token'.
    2. Validates genuine RS256 Firebase ID tokens issued for FIREBASE_PROJECT_ID against Google public certs.
    """
    allow_dev = current_app.config.get("ALLOW_DEV_TOKENS", False)
    firebase_project_id = current_app.config.get("FIREBASE_PROJECT_ID", "suraksha-a5dd7")

    # 1. Handle development / demo token if allowed
    if allow_dev:
        if token == "demo-analyst-token":
            return {
                "uid": "analyst-demo-001",
                "email": "analyst@suraksha.local",
                "displayName": "Alex Mercer (Threat Lead)",
                "role": "admin",
                "auth_type": "demo",
            }

        try:
            # Check if token is HS256 dev token
            unverified_header = jwt.get_unverified_header(token)
            if unverified_header.get("alg") == "HS256":
                payload = jwt.decode(
                    token,
                    current_app.config.get("SECRET_KEY", ""),
                    algorithms=["HS256"],
                    audience="suraksha-api",
                    issuer="suraksha-dev-auth",
                )
                return {
                    "uid": payload.get("sub", "unknown"),
                    "email": payload.get("email"),
                    "role": normalize_role(payload.get("role")),
                    "auth_type": "dev_jwt",
                }
        except (jwt.PyJWTError, Exception):
            # Not an HS256 dev token or invalid HS256; proceed to Firebase verification
            pass

    # 2. Firebase ID token verification
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise ValueError(f"Malformed authentication token: {exc}")

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")

    if alg != "RS256" or not kid:
        raise ValueError("Invalid token header. Firebase tokens must use RS256 and provide a Key ID (kid).")

    certs = get_google_public_certs()
    cert_pem = certs.get(kid)
    if not cert_pem:
        raise ValueError("Token key ID (kid) does not match any current Google Firebase signing certificate.")

    try:
        cert_obj = load_pem_x509_certificate(cert_pem.encode("utf-8"))
        public_key = cert_obj.public_key()

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=firebase_project_id,
            issuer=f"https://securetoken.google.com/{firebase_project_id}",
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Authentication token has expired.")
    except jwt.InvalidTokenError as exc:
        raise ValueError(f"Invalid Firebase ID token: {exc}")

    user_uid = payload.get("sub")
    if not user_uid:
        raise ValueError("Token missing subject (sub) claim.")

    raw_role = payload.get("role") or payload.get("custom_claims", {}).get("role")
    return {
        "uid": user_uid,
        "email": payload.get("email"),
        "displayName": payload.get("name"),
        "role": normalize_role(raw_role),
        "auth_type": "firebase",
    }


def require_auth(allowed_roles: Optional[List[str]] = None):
    """
    Decorator enforcing authentication and role-based authorization on API endpoints.
    Returns 401 on missing or invalid token.
    Returns 403 on insufficient user permissions.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Missing or malformed Authorization header. Bearer token required.",
                        "details": [],
                    }
                }), 401

            token = auth_header[7:].strip()
            if not token:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Empty authentication token provided.",
                        "details": [],
                    }
                }), 401

            try:
                user_info = verify_token(token)
            except ValueError as exc:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": str(exc),
                        "details": [],
                    }
                }), 401

            # Attach authenticated user to Flask request context
            g.current_user = user_info

            # Check role-based authorization
            if allowed_roles:
                user_role = user_info.get("role", "analyst")
                normalized_allowed = [normalize_role(r) for r in allowed_roles]
                if user_role not in normalized_allowed:
                    return jsonify({
                        "success": False,
                        "error": {
                            "code": "FORBIDDEN",
                            "message": f"Action requires one of the following roles: {normalized_allowed}. Your role is '{user_role}'.",
                            "details": [],
                        }
                    }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user() -> Optional[Dict[str, Any]]:
    """Retrieve the currently authenticated user from Flask request context."""
    return getattr(g, "current_user", None)


def get_authenticated_user_optional() -> Optional[Dict[str, Any]]:
    """
    Attempt to extract and verify Bearer token if provided in request headers.
    Returns user info dictionary if valid; returns None if header is absent.
    Raises ValueError if token is provided but malformed or invalid.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    if not token:
        return None
    user_info = verify_token(token)
    g.current_user = user_info
    return user_info

