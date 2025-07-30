# Decorator to protect routes based on user roles.
from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt


def role_required(*required_roles):
    """
    Decorator that requires one of the specified roles.
    Can accept multiple roles as arguments.
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            try:
                jwt_data = get_jwt()
                user_role = jwt_data.get('role')
                
                if not user_role:
                    return jsonify({"error": "No role found in token"}), 403
                
                # Check if user has any of the required roles
                if user_role not in required_roles:
                    return jsonify({
                        "error": f"Access denied. Required roles: {', '.join(required_roles)}"
                    }), 403
                
                return f(*args, **kwargs)
                
            except Exception as e:
                return jsonify({"error": "Authorization failed"}), 403
                
        return decorated_function
    return decorator

def admin_or_organizer_required(f):
    """Decorator that requires admin or organizer role"""
    return role_required("admin", "organizer")(f)

def organization_member_required(f):
    """Decorator that requires any organization member role"""
    return role_required("organizer", "team_member")(f)

def admin_only(f):
    """Decorator that requires admin role only"""
    return role_required("admin")(f)
