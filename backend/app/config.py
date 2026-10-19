import os
import logging
from typing import Type

class BaseConfig:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "sentinelshield-dev-secret-key-change-in-prod")
    DEBUG = False
    TESTING = False
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///sentinelshield.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
        if origin.strip()
    ]
    
    # Request limits (5MB)
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # Platform metadata
    PLATFORM_NAME = "SURAKSHA"
    API_VERSION = "v1"

    # Authentication & Security
    FIREBASE_PROJECT_ID = (
        os.getenv("FIREBASE_PROJECT_ID")
        or os.getenv("VITE_FIREBASE_PROJECT_ID")
        or "suraksha-a5dd7"
    )
    ALLOW_DEV_TOKENS = False

    # External Data Providers
    ITUNES_STORE_COUNTRY = os.getenv("ITUNES_STORE_COUNTRY", "US")
    ITUNES_API_TIMEOUT = float(os.getenv("ITUNES_API_TIMEOUT", "10.0"))
    X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")
    X_API_TIMEOUT = float(os.getenv("X_API_TIMEOUT", "10.0"))

    # Groq AI Investigation Provider
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "15.0"))
    GROQ_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "2"))

    # LangSmith Tracing & Observability
    LANGSMITH_TRACING = os.getenv("LANGSMITH_TRACING", "false").lower() in ("true", "1")
    LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY")
    LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "suraksha-investigations")
    LANGSMITH_ENDPOINT = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")

    # API Rate Limiting Configuration
    # Note: For multi-worker production deployments (Gunicorn), set RATELIMIT_STORAGE_URI
    # to a shared Redis backend: redis://<host>:<port>/0 or rediss://...
    RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("true", "1")
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "200 per minute")
    RATELIMIT_SCAN = os.getenv("RATELIMIT_SCAN", "10 per minute")
    RATELIMIT_AI = os.getenv("RATELIMIT_AI", "15 per minute")
    RATELIMIT_ML = os.getenv("RATELIMIT_ML", "30 per minute")

class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    DEBUG = True
    LOG_LEVEL = "DEBUG"
    ALLOW_DEV_TOKENS = True

class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    TESTING = True
    DEBUG = True
    DATABASE_URL = "sqlite:///:memory:"
    LOG_LEVEL = "WARNING"
    ALLOW_DEV_TOKENS = True
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"

class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    DEBUG = False
    LOG_LEVEL = "INFO"
    # In production, require an explicit SECRET_KEY
    SECRET_KEY = os.getenv("SECRET_KEY")
    # Strict production CORS origins (no wildcards)
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "https://suraksha-platform.onrender.com").split(",")
        if origin.strip()
    ]
    ALLOW_DEV_TOKENS = os.getenv("ALLOW_DEV_TOKENS", "false").lower() in ("true", "1")
    # In production, use Redis storage if provided, else fallback to memory:// with warning
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", os.getenv("REDIS_URL", "memory://"))

CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

def validate_production_config(config_cls: Type[BaseConfig]) -> None:
    """
    Enforce security guardrails for production environments.
    Raises ValueError immediately if secrets are missing or set to insecure defaults.
    """
    secret = getattr(config_cls, "SECRET_KEY", None)
    if not secret or secret == "sentinelshield-dev-secret-key-change-in-prod" or len(secret) < 32:
        raise ValueError(
            "CRITICAL SECURITY CONFIGURATION ERROR: Production startup aborted. "
            "SECRET_KEY must be explicitly defined and have at least 32 characters in production."
        )

    cors_origins = getattr(config_cls, "CORS_ORIGINS", [])
    if "*" in cors_origins:
        raise ValueError(
            "CRITICAL SECURITY CONFIGURATION ERROR: Production startup aborted. "
            "CORS_ORIGINS must not use wildcard '*' when credentials are supported."
        )

def get_config(env_name: str | None = None) -> Type[BaseConfig]:
    """Retrieve config class based on environment name."""
    if not env_name:
        env_name = os.getenv("FLASK_ENV", "development").lower()
    config_cls = CONFIG_MAP.get(env_name, DevelopmentConfig)
    if env_name == "production" or config_cls is ProductionConfig:
        validate_production_config(config_cls)
    return config_cls
