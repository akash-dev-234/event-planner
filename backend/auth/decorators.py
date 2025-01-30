# Decorator to protect routes based on user roles.
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from flask import jsonify


def role_required(required_role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user = (
                get_jwt_identity()
            )  # Get the current user's identity from the JWT
            if current_user["role"] != required_role:
                return (
                    jsonify({"error": "Access denied: insufficient permissions"}),
                    403,
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator
