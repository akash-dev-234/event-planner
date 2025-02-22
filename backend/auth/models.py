from datetime import datetime, timedelta, timezone
from enum import Enum
import os
from backend.extensions import db, bcrypt
from flask_jwt_extended import create_access_token
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import func


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
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    deleted_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, name, description=None):
        self.name = name
        self.description = description

    def soft_delete(self):
        """Mark the organization as deleted"""
        self.deleted_at = datetime.now(timezone.utc)

    @property
    def is_deleted(self):
        """Check if the organization is deleted"""
        return self.deleted_at is not None

    def to_dict(self):
        """Convert organization object to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'is_deleted': self.is_deleted
        }

    @classmethod
    def get_active(cls):
        """Get all non-deleted organizations"""
        return cls.query.filter(cls.deleted_at.is_(None))

    @classmethod
    def check_name_exists(cls, name):
        """Check if an active organization with the given name exists"""
        return cls.query.filter(
            func.lower(cls.name) == func.lower(name),
            cls.deleted_at.is_(None)
        ).first() is not None


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
        
        # Create additional claims for user data
        additional_claims = {
            "user_id": self.id,
            "role": self.role
        }
        
        # Use email as the subject (must be a string)
        return create_access_token(
            identity=self.email,  # String identity
            expires_delta=expires_delta,
            additional_claims=additional_claims  # Add user data as additional claims
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
