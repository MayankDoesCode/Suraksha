import logging
from flask import jsonify

logger = logging.getLogger(__name__)

class AppException(Exception):
    """Base exception for application-level managed errors."""
    def __init__(self, message: str, status_code: int = 400, code: str = "BAD_REQUEST", details: list = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or []

    def to_dict(self):
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }

class ValidationError(AppException):
    """Raised when request payload fails validation checks."""
    def __init__(self, message: str = "Input validation failed", details: list = None):
        super().__init__(message, status_code=422, code="VALIDATION_ERROR", details=details)

class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404, code="NOT_FOUND", details=[])

class ConflictError(AppException):
    """Raised when an operation conflicts with existing state (e.g., duplicate names)."""
    def __init__(self, message: str = "Resource conflict detected", details: list = None):
        super().__init__(message, status_code=409, code="CONFLICT_ERROR", details=details)

class UnauthorizedError(AppException):
    """Raised when authentication credentials are required or invalid."""
    def __init__(self, message: str = "Authentication required", details: list = None):
        super().__init__(message, status_code=401, code="UNAUTHORIZED", details=details)

class ForbiddenError(AppException):
    """Raised when authenticated user has insufficient permissions to access a resource."""
    def __init__(self, message: str = "Access forbidden", details: list = None):
        super().__init__(message, status_code=403, code="FORBIDDEN", details=details)


def register_error_handlers(app):
    """Attach centralized JSON error handlers to Flask app."""

    @app.errorhandler(AppException)
    def handle_app_exception(error):
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": getattr(error, "description", "Malformed request"),
                "details": []
            }
        }), 400

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": getattr(error, "description", "The requested endpoint was not found"),
                "details": []
            }
        }), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "The HTTP method is not supported for this route",
                "details": []
            }
        }), 405

    @app.errorhandler(413)
    def handle_payload_too_large(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": "The request payload exceeds the allowed size limit",
                "details": []
            }
        }), 413

    @app.errorhandler(429)
    def handle_rate_limit_exceeded(error):
        limit_desc = getattr(error, "description", "Rate limit exceeded")
        return jsonify({
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Rate limit exceeded. Please try again later.",
                "details": [str(limit_desc)] if limit_desc else []
            }
        }), 429

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        logger.error("Unhandled server exception: %s", str(error), exc_info=True)
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact system administrator.",
                "details": []
            }
        }), 500

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        logger.error("Uncaught exception: %s", str(error), exc_info=True)
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal error occurred while processing your request.",
                "details": []
            }
        }), 500
