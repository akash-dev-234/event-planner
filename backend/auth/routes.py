from datetime import timedelta
import os
import re
from flask_jwt_extended import get_jwt_identity, get_jwt, jwt_required
from flask_mail import Message
from backend.auth.decorators import role_required
from . import auth
from flask import request, jsonify
from backend.auth.models import Organization, User, UserRole
from backend.extensions import db, mail, bcrypt
from sqlalchemy import func

# re is a built-in Python module that provides support for working with regular expressions (regex).
# Regular expressions are a powerful tool for matching patterns in strings,
# allowing you to search, replace, and manipulate text based on specific patterns.


# Function to validate email format
def is_valid_email(email):
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(email_regex, email) is not None


# Function to validate password strength
# Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters
def is_strong_password(password):
    return (
        len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[!@#$%^&*(),.?\":{}|<>]", password)
    )


@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        try:
            data = request.get_json()  # Extract JSON data from the request
            first_name = data["first_name"]
            last_name = data["last_name"]
            email = data["email"]
            password = data["password"]
            role = data.get("role", "guest")  # Default to guest if not provided
            # Validate role
            if role not in UserRole:
                return jsonify({"error": "Invalid role specified."}), 400
        except KeyError as e:
            return jsonify({"error": f"Missing form field: {str(e)}"}), 400
        except TypeError:
            return jsonify({"error": "Invalid JSON data"}), 400

        # Validate email format
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        # Validate password strength
        if not is_strong_password(password):
            return (
                jsonify(
                    {
                        "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
                    }
                ),
                400,
            )

        new_user = User(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            organization_id=None,
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully"}), 201

    return jsonify({"message": "Register page"})


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        # Validate email and password
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if user is None:
            return jsonify({"message": "User not registered"}), 404

        # Validate password
        if not user.check_password(password):
            return jsonify({"message": "Invalid credentials"}), 401
        # timedelta is a class in Python's datetime module that represents a duration, the difference between two dates or times.
        # It is commonly used to perform arithmetic with dates and times, such as adding or subtracting time intervals.
        token = user.generate_token(timedelta(hours=2))  # Example of generating a token
        return jsonify({"message": "Logged in", "token": token}), 200

    return jsonify({"message": "Login page"})


@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    print("Forgot password route hit")
    data = request.get_json()
    email = data.get("email")

    print(f"MAIL_DEFAULT_SENDER: {os.environ.get('MAIL_USERNAME')}")

    # Validate email format
    if not email or not is_valid_email(email):
        return jsonify({"message": "Invalid email format."}), 400

    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify({"message": "User with this email does not exist."}), 404

    # Generate a password reset token
    token = user.generate_reset_token()
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    # Send email with the reset token
    msg = Message(
        "Password Reset Request",
        sender=os.environ.get("VERIFIED_EMAIL"),
        recipients=[email],
    )
    msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px;">Hello,</p>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #007bff; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">{reset_url}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This email was sent by Event Planner. Please do not reply to this email.
            </p>
        </div>
        """
    try:
        mail.send(msg)
    except Exception as e:
        return jsonify({"message": f"Failed to send email: {str(e)}"}), 500

    return (
        jsonify({"message": "A password reset link has been sent to your email."}),
        200,
    )


@auth.route("/reset-password/<token>", methods=["POST","GET"])
def reset_password(token):
    data = request.get_json()
    new_password = data.get("password")

    # Validate the new password
    if not new_password or not is_strong_password(new_password):
        return (
            jsonify(
                {
                    "error": "Password must be at least 8 characters long and include uppercase, lowercase, numeric, and special characters."
                }
            ),
            400,
        )

    # Verify the reset token
    user = User.verify_reset_token(token)
    if user is None:
        return jsonify({"error": "Invalid or expired token."}), 400

    if user.check_password(new_password):
        return (
            jsonify({"error": "New password cannot be the same as the old password."}),
            400,
        )

    # Update the user's password
    user.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()

    return jsonify({"message": "Your password has been updated!"}), 200


@auth.route("/create-organization", methods=["POST"])
@role_required("organizer")
def create_organization():
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        name = data.get("name")
        description = data.get("description")

        if not name:
            return jsonify({"error": "Organization name is required"}), 400
            
        if name.strip() == "":
            return jsonify({"error": "Organization name cannot be empty or just whitespace"}), 400

        # Use the new check_name_exists method
        if Organization.check_name_exists(name):
            return jsonify({
                "error": "An organization with this name already exists"
            }), 409

        new_organization = Organization(
            name=name,
            description=description
        )
        db.session.add(new_organization)
        user.organization_id = new_organization.id
        db.session.commit()
        
        return jsonify({
            "message": "Organization created successfully!",
            "organization": new_organization.to_dict()
        }), 201
        
    except Exception as e:
        print("Error in create_organization:", str(e))
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@auth.route("/organizations/<string:filter_type>", methods=["GET"])
@jwt_required()
def get_organizations(filter_type='all'):
    """
    Get organizations based on filter type.
    Filter types:
    - all: All organizations
    - active: Only active organizations
    - deleted: Only deleted organizations
    """
    try:
        if filter_type not in ['all', 'active', 'deleted']:
            return jsonify({
                "error": "Invalid filter type. Must be 'all', 'active', or 'deleted'"
            }), 400
        
        # Get organizations based on filter type
        if filter_type == 'all':
            organizations = Organization.query.all()
        elif filter_type == 'active':
            organizations = Organization.get_active().all()
        else:  # deleted
            organizations = Organization.query.filter(
                Organization.deleted_at.isnot(None)
            ).all()
        
        return jsonify({
            "message": "Organizations retrieved successfully",
            "filter_type": filter_type,
            "count": len(organizations),
            "organizations": [org.to_dict() for org in organizations] #It's a shorthand way of saying 
                                                                      #"take each organization in the list and 
                                                                      # convert it to a dictionary using its to_dict() method".
        }), 200
        
    except Exception as e:
        print("Error in get_organizations:", str(e))
        return jsonify({
            "error": "Failed to retrieve organizations",
            "details": str(e)
        }), 500

# Add a default route for all organizations
@auth.route("/organizations", methods=["GET"])
@jwt_required()
def get_all_organizations():
    """Default route that returns all active organizations"""
    return get_organizations('active')