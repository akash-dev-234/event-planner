# Decorator to protect routes based on user roles.
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps
from flask import jsonify


def role_required(required_role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            jwt_data = get_jwt()
            user_role = jwt_data.get('role')
            
            if not user_role or user_role != required_role:
                return (
                    jsonify({"error": "Access denied: insufficient permissions"}),
                    403,
                )
            return fn(*args, **kwargs)
        return wrapper
    return decorator
