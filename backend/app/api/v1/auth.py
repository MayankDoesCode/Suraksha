import os
from flask import Blueprint, jsonify, current_app

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/config", methods=["GET"])
def get_auth_config():
    """
    Expose public client-side Firebase web configuration to the frontend application.
    Security Invariant: NEVER exposes private service account keys or server secrets.
    """
    project_id = (
        current_app.config.get("FIREBASE_PROJECT_ID")
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

    is_configured = bool(api_key and project_id and app_id)

    return jsonify({
        "success": True,
        "is_configured": is_configured,
        "config": {
            "apiKey": api_key,
            "authDomain": auth_domain,
            "projectId": project_id,
            "storageBucket": storage_bucket,
            "messagingSenderId": sender_id,
            "appId": app_id,
            "measurementId": measurement_id,
            "firestoreDatabaseId": firestore_db,
        }
    }), 200
