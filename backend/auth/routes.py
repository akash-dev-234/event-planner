from . import auth
from flask import request, jsonify, session
from backend.auth.models import User
from backend.extensions import db


@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        try:
            data = request.get_json()  # Extract JSON data from the request
            first_name = data["first_name"]
            last_name = data["last_name"]
            email = data["email"]
            password = data["password"]
        except KeyError as e:
            return jsonify({"error": f"Missing form field: {str(e)}"}), 400
        except TypeError:
            return jsonify({"error": "Invalid JSON data"}), 400

        new_user = User(
            email=email, password=password, first_name=first_name, last_name=last_name
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully"})

    return jsonify({"message": "Register page"})


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        email = data["email"]
        password = data["password"]
        user = User.query.filter_by(email=email).first()
        if user is None:
            return jsonify({"message": "User not registered"}), 404
        if user.check_password(password):
            session["first_name"] = user.first_name
            session["last_name"] = user.last_name
            session["email"] = user.email
            return jsonify({"message": "Logged in"}), 200
        else:
            return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({"message": "Login page"})
