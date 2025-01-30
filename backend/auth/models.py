from datetime import timedelta
from backend.extensions import db, bcrypt
from flask_jwt_extended import create_access_token


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
        # The correct order is: check_password_hash(stored_hash, password_to_check)
        return bcrypt.check_password_hash(self.password, password)

    def generate_token(self, expires_delta=None):
        if expires_delta is None:
            expires_delta = timedelta(days=1)  # Default expiration time of 1 day
        return create_access_token(
            identity={"id": self.id, "role": self.role}, expires_delta=expires_delta
        )
