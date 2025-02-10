from datetime import datetime, timedelta, timezone
from enum import Enum
import os
from backend.extensions import db, bcrypt
from flask_jwt_extended import create_access_token
from itsdangerous import URLSafeTimedSerializer


class UserRole(Enum):
    ADMIN = "admin"
    ORGANIZER = "organizer"
    TEAM_MEMBER = "team_member"
    GUEST = "guest"


class Organization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(
        db.String(150), nullable=False, unique=True
    )  # Organization name must be unique
    description = db.Column(
        db.Text, nullable=True
    )  # Optional description of the organization
    users = db.relationship(
        "User", backref="organization", lazy=True
    )  # Relationship to users
    events = db.relationship(
        "Event", backref="organization", lazy=True
    )  # Relationship to events

    def __init__(self, name, description=None):
        self.name = name
        self.description = description


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(150), nullable=False)
    last_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), nullable=False, default=UserRole.GUEST)
    organization_id = db.Column(
        db.Integer, db.ForeignKey("organization.id"), nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    events = db.relationship("Event", backref="organizer", lazy=True)

    def __init__(
        self,
        email,
        password,
        first_name,
        last_name,
        organization_id,
        role="guest",
    ):
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")
        self.role = role
        if role == UserRole.ADMIN:
            self.organization_id = None
        else:
            self.organization_id = organization_id

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


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(255), nullable=False)
    is_public = db.Column(db.Boolean, default=False)
    time = db.Column(db.Time, nullable=False)
    organization_id = db.Column(
        db.Integer, db.ForeignKey("organization.id"), nullable=False
    )  # Required for events
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )  # Required for events

    def __init__(
        self,
        title,
        description,
        date,
        location,
        is_public,
        time,
        organization_id,
        user_id,
    ):
        self.title = title
        self.description = description
        self.date = date
        self.location = location
        self.is_public = is_public
        self.time = time
        self.organization_id = organization_id  # Set the organization ID
        self.user_id = user_id  # Set the user ID (organizer)
