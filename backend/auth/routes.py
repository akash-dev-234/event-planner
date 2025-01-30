from datetime import timedelta
import re
from . import auth
from flask import request, jsonify, session
from backend.auth.models import User
from backend.extensions import db

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
            if role not in ["organization", "team_member", "guest", "admin"]:
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
