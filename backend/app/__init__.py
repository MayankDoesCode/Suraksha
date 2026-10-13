import logging
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from backend.app.config import get_config
from backend.app.database import init_db, close_db
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
    Application factory for SentinelShield REST API.
    Initializes database, CORS, routing, and centralized error handling.
    """
    app = Flask(__name__)
    config_cls = get_config(config_name)
    app.config.from_object(config_cls)

    # Set up logging
    setup_logging(app.config.get("LOG_LEVEL", "INFO"))
    logger = logging.getLogger(__name__)
    logger.info("Initializing SentinelShield API (env: %s)", config_name or os.getenv("FLASK_ENV", "development"))

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

    # Attach error handlers
    register_error_handlers(app)

    # Register versioned API blueprints
    app.register_blueprint(api_v1_bp)

    return app
