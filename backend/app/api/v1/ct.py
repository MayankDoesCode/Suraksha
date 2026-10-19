from flask import Blueprint, jsonify

from backend.app.utils.auth import get_current_user, require_auth

ct_bp = Blueprint("ct", __name__)


@ct_bp.route("/ct/status", methods=["GET"])
@require_auth(allowed_roles=["admin", "lead", "analyst", "viewer"])
def ct_status():
    from backend.app.intel.ct_stream import get_stream
    return jsonify({"success": True, "data": get_stream().status()}), 200


@ct_bp.route("/ct/start", methods=["POST"])
@require_auth(allowed_roles=["admin", "lead", "analyst"])
def ct_start():
    """Replay the bundled CT file against all brands. Returns immediately; poll /ct/status."""
    from backend.app.intel.ct_stream import get_stream
    s = get_stream()
    user = get_current_user() or {}
    started = s.start(owner_id=None if user.get("role") == "admin" else user.get("uid"))
    return jsonify({"success": True, "data": {"started": started, **s.status()}}), 202
