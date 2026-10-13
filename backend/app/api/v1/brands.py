from flask import Blueprint, request, jsonify
from backend.app.services.brand_service import BrandService

brands_bp = Blueprint("brands", __name__)
brand_service = BrandService()

@brands_bp.route("/brands", methods=["GET"])
def list_brands():
    """List brand profiles with optional search and pagination."""
    search = request.args.get("search", default=None, type=str)
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    result = brand_service.list_brands(search=search, page=page, per_page=per_page)
    return jsonify({
        "success": True,
        "data": result["items"],
        "pagination": result["pagination"]
    }), 200

@brands_bp.route("/brands", methods=["POST"])
def create_brand():
    """Register a new brand profile with verified identity assets."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    brand = brand_service.create_brand(payload)
    return jsonify({
        "success": True,
        "message": "Brand profile created successfully",
        "data": brand
    }), 201

@brands_bp.route("/brands/<string:brand_id>", methods=["GET"])
def get_brand(brand_id: str):
    """Retrieve detailed brand profile by ID."""
    brand = brand_service.get_brand(brand_id)
    return jsonify({
        "success": True,
        "data": brand
    }), 200

@brands_bp.route("/brands/<string:brand_id>", methods=["PUT"])
def update_brand(brand_id: str):
    """Update existing brand profile and associated verified assets."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    brand = brand_service.update_brand(brand_id, payload)
    return jsonify({
        "success": True,
        "message": "Brand profile updated successfully",
        "data": brand
    }), 200

@brands_bp.route("/brands/<string:brand_id>", methods=["DELETE"])
def delete_brand(brand_id: str):
    """Delete a brand profile and safely cascade delete relational records."""
    brand_service.delete_brand(brand_id)
    return jsonify({
        "success": True,
        "message": "Brand profile deleted successfully"
    }), 200

@brands_bp.route("/brands/<string:brand_id>/scan", methods=["POST"])
def scan_candidate(brand_id: str):
    """Evaluate candidate asset against brand profile and derive explainable risk score."""
    from backend.app.services.detection_service import DetectionService
    detection_service = DetectionService()
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Malformed JSON payload or empty request body",
                "details": []
            }
        }), 400

    result = detection_service.evaluate_candidate(brand_id, payload)
    return jsonify({
        "success": True,
        "data": result
    }), 200

