from flask import Blueprint
from backend.app.api.v1.health import health_bp
from backend.app.api.v1.brands import brands_bp
from backend.app.api.v1.findings import findings_bp
from backend.app.api.v1.integrations import integrations_bp
from backend.app.api.v1.ml import ml_bp
from backend.app.api.v1.auth import auth_bp
from backend.app.api.v1.ct import ct_bp
from backend.app.api.v1.social import social_bp
from backend.app.api.v1.apps import apps_bp
from backend.app.api.v1.copilot import copilot_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Register sub-blueprints under /api/v1
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(brands_bp)
api_v1_bp.register_blueprint(findings_bp)
api_v1_bp.register_blueprint(integrations_bp)
api_v1_bp.register_blueprint(ml_bp)
api_v1_bp.register_blueprint(auth_bp)
api_v1_bp.register_blueprint(ct_bp)
api_v1_bp.register_blueprint(social_bp)
api_v1_bp.register_blueprint(apps_bp)
api_v1_bp.register_blueprint(copilot_bp)
