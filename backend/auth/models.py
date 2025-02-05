from datetime import timedelta
import os
from flask import current_app
from backend.extensions import db, bcrypt
from flask_jwt_extended import create_access_token
from itsdangerous import URLSafeTimedSerializer


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(150), nullable=False)
    last_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="guest")

    def __init__(self, email, password, first_name, last_name, role="guest"):
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")
        self.role = role

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def generate_token(self, expires_delta=None):
        if expires_delta is None:
            expires_delta = timedelta(days=1)
        return create_access_token(
            identity={"id": self.id, "role": self.role}, expires_delta=expires_delta
        )

    def generate_reset_token(self, expires_sec=1800):
        secret_key = os.environ.get("FLASK_SECRET_KEY")
        s = URLSafeTimedSerializer(secret_key)
        return s.dumps(self.email, salt="password-reset-salt")

    @staticmethod
    def verify_reset_token(token, expires_sec=1800):
        secret_key = os.environ.get("FLASK_SECRET_KEY")
        s = URLSafeTimedSerializer(secret_key)
        try:
            email = s.loads(token, salt="password-reset-salt", max_age=expires_sec)
        except Exception:
            return None
        return User.query.filter_by(email=email).first()
