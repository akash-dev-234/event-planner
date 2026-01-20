# Database Schema

## Overview

The application uses SQLAlchemy ORM with SQLite (development) or PostgreSQL (production).

**Database Location:** `apps/backend/instance/database.db`

---

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│       User          │       │    Organization     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │───┐   │ id (PK)             │
│ first_name          │   │   │ name (UNIQUE)       │
│ last_name           │   │   │ description         │
│ email (UNIQUE)      │   │   │ created_at          │
│ password            │   └──>│ deleted_at          │
│ role                │       └─────────────────────┘
│ organization_id (FK)│───────────────┘      │
│ pending_organizer   │                      │
│ created_at          │                      │
└─────────────────────┘                      │
         │                                   │
         │ creates                           │ has
         ▼                                   ▼
┌─────────────────────┐       ┌─────────────────────┐
│       Event         │       │ OrganizationInvite  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ title               │       │ email               │
│ description         │       │ role                │
│ date                │       │ organization_id (FK)│
│ time                │       │ is_accepted         │
│ location            │       │ created_at          │
│ is_public           │       │ expires_at          │
│ organization_id (FK)│       └─────────────────────┘
│ user_id (FK)        │
│ created_at          │
│ updated_at          │
│ deleted_at          │
└─────────────────────┘
         │
         │ has
         ▼
┌─────────────────────┐
│  EventInvitation    │
├─────────────────────┤
│ id (PK)             │
│ event_id (FK)       │
│ guest_email         │
│ guest_name          │
│ status              │
│ invitation_token    │
│ created_at          │
│ responded_at        │
│ reminder_24h_sent   │
│ reminder_1h_sent    │
└─────────────────────┘
```

---

## Models

### User

Stores all user accounts in the system.

```python
class User(db.Model):
    __tablename__ = 'users'
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY | Auto-increment ID |
| first_name | String(100) | NOT NULL | User's first name |
| last_name | String(100) | NOT NULL | User's last name |
| email | String(120) | UNIQUE, NOT NULL | Login email |
| password | String(255) | NOT NULL | Bcrypt hashed password |
| role | Enum(UserRole) | NOT NULL, DEFAULT=GUEST | User role |
| organization_id | Integer | FK(organizations.id), NULL | Current organization |
| pending_organizer_approval | Boolean | DEFAULT=False | Awaiting admin approval |
| created_at | DateTime | DEFAULT=now | Registration timestamp |

**Relationships:**
- `organization` → Organization (many-to-one)
- `events` → Event (one-to-many, as organizer)

**Methods:**
- `check_password(password)` → bool
- `generate_token()` → JWT string
- `generate_reset_token()` → URL-safe token
- `verify_reset_token(token)` → User or None

---

### UserRole (Enum)

```python
class UserRole(enum.Enum):
    ADMIN = "admin"
    ORGANIZER = "organizer"
    TEAM_MEMBER = "team_member"
    GUEST = "guest"
```

---

### Organization

Stores organizations that group users and events.

```python
class Organization(db.Model):
    __tablename__ = 'organizations'
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY | Auto-increment ID |
| name | String(100) | UNIQUE, NOT NULL | Organization name |
| description | Text | NULL | Organization description |
| created_at | DateTime | DEFAULT=now | Creation timestamp |
| deleted_at | DateTime | NULL | Soft delete timestamp |

**Relationships:**
- `users` → User (one-to-many)
- `events` → Event (one-to-many)
- `invitations` → OrganizationInvitation (one-to-many)

**Methods:**
- `soft_delete()` → Sets deleted_at
- `restore()` → Clears deleted_at
- `to_dict()` → Dictionary representation
- `get_active()` → Query for non-deleted orgs

---

### Event

Stores event information.

```python
class Event(db.Model):
    __tablename__ = 'events'
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY | Auto-increment ID |
| title | String(150) | NOT NULL | Event title |
| description | Text | NULL | Event description |
| date | Date | NOT NULL | Event date |
| time | String(10) | NOT NULL | Event time (HH:MM) |
| location | String(255) | NOT NULL | Event location |
| is_public | Boolean | DEFAULT=False | Public visibility |
| organization_id | Integer | FK(organizations.id), NOT NULL | Owning organization |
| user_id | Integer | FK(users.id), NOT NULL | Event creator |
| created_at | DateTime | DEFAULT=now | Creation timestamp |
| updated_at | DateTime | NULL | Last update timestamp |
| deleted_at | DateTime | NULL | Soft delete timestamp |

**Relationships:**
- `organization` → Organization (many-to-one)
- `organizer` → User (many-to-one)
- `invitations` → EventInvitation (one-to-many)

**Methods:**
- `soft_delete()` → Sets deleted_at
- `to_dict()` → Dictionary representation
- `get_active()` → Query for non-deleted events
- `get_public_events()` → Query for public events
- `get_organization_events(org_id)` → Query for org events

---

### EventInvitation

Stores external guest invitations for events.

```python
class EventInvitation(db.Model):
    __tablename__ = 'event_invitations'
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY | Auto-increment ID |
| event_id | Integer | FK(events.id), NOT NULL | Related event |
| guest_email | String(120) | NOT NULL | Guest's email |
| guest_name | String(200) | NOT NULL | Guest's name |
| status | String(20) | DEFAULT='pending' | pending/accepted/declined |
| invitation_token | String(100) | UNIQUE, NOT NULL | RSVP token |
| created_at | DateTime | DEFAULT=now | Invitation sent time |
| responded_at | DateTime | NULL | Response timestamp |
| reminder_24h_sent | Boolean | DEFAULT=False | 24h reminder sent |
| reminder_1h_sent | Boolean | DEFAULT=False | 1h reminder sent |

**Relationships:**
- `event` → Event (many-to-one)

**Methods:**
- `to_dict()` → Dictionary representation

---

### OrganizationInvitation

Stores pending invitations to join organizations.

```python
class OrganizationInvitation(db.Model):
    __tablename__ = 'organization_invitations'
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY | Auto-increment ID |
| email | String(120) | NOT NULL | Invitee email |
| role | Enum(UserRole) | NOT NULL | Offered role |
| organization_id | Integer | FK(organizations.id), NOT NULL | Target organization |
| is_accepted | Boolean | DEFAULT=False | Acceptance status |
| created_at | DateTime | DEFAULT=now | Invitation timestamp |
| expires_at | DateTime | NOT NULL | Expiry (7 days) |

**Relationships:**
- `organization` → Organization (many-to-one)

---

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | ix_users_email | email | Fast email lookup |
| organizations | ix_organizations_name | name | Fast name lookup |
| events | ix_events_date | date | Date-based queries |
| events | ix_events_organization | organization_id | Org event lookup |
| event_invitations | ix_event_inv_token | invitation_token | Token lookup |
| event_invitations | ix_event_inv_event | event_id | Event guest list |

---

## Migrations

Migrations are managed with Flask-Migrate (Alembic).

```bash
# Create a new migration
flask db migrate -m "Description"

# Apply migrations
flask db upgrade

# Rollback one migration
flask db downgrade
```

**Migration Files Location:** `apps/backend/migrations/versions/`

---

## Soft Delete Pattern

Organizations and Events implement soft deletes:

```python
# Soft delete (preserves data)
organization.deleted_at = datetime.utcnow()
db.session.commit()

# Query only active records
active_orgs = Organization.query.filter(
    Organization.deleted_at.is_(None)
).all()

# Restore
organization.deleted_at = None
db.session.commit()
```

---

## Common Queries

### Get user's organization events
```python
events = Event.query.filter(
    Event.organization_id == user.organization_id,
    Event.deleted_at.is_(None)
).order_by(Event.date.asc()).all()
```

### Get public upcoming events
```python
from datetime import date
events = Event.query.filter(
    Event.is_public == True,
    Event.deleted_at.is_(None),
    Event.date >= date.today()
).order_by(Event.date.asc()).all()
```

### Get event with guest counts
```python
from sqlalchemy import func

event = Event.query.get(event_id)
guest_counts = db.session.query(
    EventInvitation.status,
    func.count(EventInvitation.id)
).filter(
    EventInvitation.event_id == event_id
).group_by(EventInvitation.status).all()
```

### Get organization members sorted by role
```python
from sqlalchemy import case

role_order = case(
    (User.role == UserRole.ORGANIZER, 1),
    (User.role == UserRole.TEAM_MEMBER, 2),
    else_=3
)

members = User.query.filter(
    User.organization_id == org_id
).order_by(role_order, User.first_name).all()
```

---

## Future Schema Changes (Planned)

### Event Categories
```python
class EventCategory(enum.Enum):
    CONFERENCE = "conference"
    MEETUP = "meetup"
    WORKSHOP = "workshop"
    SOCIAL = "social"
    OTHER = "other"

# Add to Event model
category = db.Column(db.Enum(EventCategory), default=EventCategory.OTHER)
```

### Event Capacity
```python
# Add to Event model
max_capacity = db.Column(db.Integer, nullable=True)
```

### User Profile
```python
# Add to User model
avatar_url = db.Column(String(500), nullable=True)
phone = db.Column(String(20), nullable=True)
bio = db.Column(Text, nullable=True)
notification_preferences = db.Column(JSON, default={})
```
