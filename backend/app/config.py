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
    PLATFORM_NAME = "SentinelShield"
    API_VERSION = "v1"

class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    DEBUG = True
    LOG_LEVEL = "DEBUG"

class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    TESTING = True
    DEBUG = True
    DATABASE_URL = "sqlite:///:memory:"
    LOG_LEVEL = "WARNING"

class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    DEBUG = False
    LOG_LEVEL = "INFO"
    # In production, require an explicit SECRET_KEY
    SECRET_KEY = os.getenv("SECRET_KEY")

CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

def get_config(env_name: str | None = None) -> Type[BaseConfig]:
    """Retrieve config class based on environment name."""
    if not env_name:
        env_name = os.getenv("FLASK_ENV", "development").lower()
    return CONFIG_MAP.get(env_name, DevelopmentConfig)
