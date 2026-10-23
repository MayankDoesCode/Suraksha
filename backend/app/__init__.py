import logging
import os
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv

from backend.app.config import get_config
from backend.app.database import init_db, close_db
from backend.app.utils.limiter import init_limiter
from backend.app.utils.errors import register_error_handlers
from backend.app.api.v1 import api_v1_bp

# Preload environment variables from .env
load_dotenv()

def setup_logging(log_level: str = "INFO"):
    """Configure structured console logging."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

def create_app(config_name: str | None = None) -> Flask:
    """
    Application factory for SURAKSHA REST API.
    Initializes database, CORS, routing, and centralized error handling.
    """
    app = Flask(__name__)
    config_cls = get_config(config_name)
    app.config.from_object(config_cls)

    # Set up logging
    setup_logging(app.config.get("LOG_LEVEL", "INFO"))
    logger = logging.getLogger(__name__)
    logger.info("Initializing SURAKSHA API (env: %s)", config_name or os.getenv("FLASK_ENV", "development"))

    # Initialize database
    init_db(app.config["DATABASE_URL"])
    app.teardown_appcontext(close_db)

    # Enable CORS for frontend clients
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Security response headers (defense in depth; API responses are never cached)
    _csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https:; "
        "frame-src https://*.firebaseapp.com https://accounts.google.com; "
        "worker-src 'self'; manifest-src 'self'; object-src 'none'; "
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )

    @app.after_request
    def add_security_headers(resp):
        h = resp.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        h.setdefault("Cross-Origin-Resource-Policy", "same-site")
        if request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https":
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if request.path.startswith("/api/"):
            h.setdefault("Cache-Control", "no-store")
        elif "text/html" in (resp.content_type or ""):
            h.setdefault("Content-Security-Policy", _csp)
        h.pop("Server", None)
        return resp

    # Initialize rate limiting
    init_limiter(app)

    # Attach error handlers
    register_error_handlers(app)

    # Register versioned API blueprints
    app.register_blueprint(api_v1_bp)

    # Optional unified SPA serving for production deployments
    dist_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
    )
    if os.path.isdir(dist_dir):
        from flask import send_from_directory, abort

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path.startswith("api"):
                # Pass through to API 404 handler
                abort(404)
            if path and os.path.exists(os.path.join(dist_dir, path)):
                return send_from_directory(dist_dir, path)

            # Serve index.html with runtime public configuration injected
            index_path = os.path.join(dist_dir, "index.html")
            try:
                with open(index_path, "r", encoding="utf-8") as f:
                    html_content = f.read()

                project_id = (
                    app.config.get("FIREBASE_PROJECT_ID")
                    or os.getenv("VITE_FIREBASE_PROJECT_ID")
                    or os.getenv("FIREBASE_PROJECT_ID")
                    or "suraksha-a5dd7"
                )
                api_key = os.getenv("VITE_FIREBASE_API_KEY", "")
                auth_domain = os.getenv("VITE_FIREBASE_AUTH_DOMAIN") or (f"{project_id}.firebaseapp.com" if project_id else "")
                storage_bucket = os.getenv("VITE_FIREBASE_STORAGE_BUCKET") or (f"{project_id}.firebasestorage.app" if project_id else "")
                app_id = os.getenv("VITE_FIREBASE_APP_ID", "")
                sender_id = os.getenv("VITE_FIREBASE_MESSAGING_SENDER_ID", "")
                measurement_id = os.getenv("VITE_FIREBASE_MEASUREMENT_ID", "")
                firestore_db = os.getenv("VITE_FIREBASE_FIRESTORE_DATABASE_ID", "(default)")

                import json
                client_config = {
                    "apiKey": api_key,
                    "authDomain": auth_domain,
                    "projectId": project_id,
                    "storageBucket": storage_bucket,
                    "messagingSenderId": sender_id,
                    "appId": app_id,
                    "measurementId": measurement_id,
                    "firestoreDatabaseId": firestore_db,
                }
                config_script = f'<script id="__suraksha_config_tag">window.__SURAKSHA_CONFIG__ = {json.dumps(client_config)};</script>'

                if "</head>" in html_content:
                    html_content = html_content.replace("</head>", f"{config_script}\n</head>", 1)
                else:
                    html_content = config_script + html_content

                from flask import Response
                return Response(html_content, mimetype="text/html")
            except Exception:
                return send_from_directory(dist_dir, "index.html")

    return app
