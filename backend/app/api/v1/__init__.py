from flask import Blueprint
from backend.app.api.v1.health import health_bp
from backend.app.api.v1.brands import brands_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Register sub-blueprints under /api/v1
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(brands_bp)
