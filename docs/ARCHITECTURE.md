# System Architecture

## Overview

Event Planner follows a classic client-server architecture with a React/Next.js frontend communicating with a Flask REST API backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Next.js    │  │   Redux     │  │   React Components      │  │
│  │  App Router │  │   Toolkit   │  │   (Tailwind CSS)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST (JSON)
                              │ JWT Bearer Token
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Flask     │  │  Flask-JWT  │  │   SQLAlchemy ORM        │  │
│  │   Routes    │  │  Extended   │  │   (Models)              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │   SQLite    │    │  SendGrid   │    │  Groq API   │
   │  Database   │    │   Email     │    │  (AI Chat)  │
   └─────────────┘    └─────────────┘    └─────────────┘
```

## Directory Structure

```
event-planner/
├── apps/
│   ├── backend/                    # Flask API Server
│   │   ├── app.py                  # Application entry point
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── extensions.py           # Flask extensions
│   │   ├── decorators.py           # Auth decorators
│   │   ├── routes/
│   │   │   ├── auth/
│   │   │   │   └── routes.py       # Authentication endpoints
│   │   │   ├── events/
│   │   │   │   ├── routes.py       # Event CRUD endpoints
│   │   │   │   └── invitation_routes.py  # Guest invitations
│   │   │   ├── organizations/
│   │   │   │   └── routes.py       # Organization endpoints
│   │   │   └── chat/
│   │   │       └── routes.py       # AI chat endpoint
│   │   ├── utils/
│   │   │   ├── email_helpers.py    # Email utilities
│   │   │   └── validators.py       # Input validation
│   │   ├── migrations/             # Alembic migrations
│   │   └── instance/
│   │       └── database.db         # SQLite database
│   │
│   └── frontend/                   # Next.js Application
│       ├── src/
│       │   ├── app/                # Next.js App Router pages
│       │   │   ├── (auth)/         # Auth pages (login, signup, reset)
│       │   │   ├── admin/          # Admin dashboard
│       │   │   ├── dashboard/      # User dashboard
│       │   │   ├── events/         # Event pages
│       │   │   ├── event-rsvp/     # Public RSVP page
│       │   │   ├── organizations/  # Organization pages
│       │   │   └── invitations/    # User invitations
│       │   ├── components/         # Reusable components
│       │   │   └── ui/             # Base UI components
│       │   ├── lib/
│       │   │   ├── api.ts          # API client
│       │   │   └── redux/          # Redux store & slices
│       │   ├── types/              # TypeScript types
│       │   └── hooks/              # Custom React hooks
│       └── public/                 # Static assets
│
└── docs/                           # Documentation
```

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Frontend │     │ Backend  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Login Request  │                │                │
     │───────────────>│                │                │
     │                │ POST /api/auth/login            │
     │                │───────────────>│                │
     │                │                │ Verify User    │
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │                │                │
     │                │  JWT Token     │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ Store in Cookie│                │
     │                │ & Redux State  │                │
     │  Redirect      │                │                │
     │<───────────────│                │                │
     │                │                │                │
     │ Protected Page │                │                │
     │───────────────>│                │                │
     │                │ GET /api/events│                │
     │                │ Authorization: │                │
     │                │ Bearer <token> │                │
     │                │───────────────>│                │
     │                │                │ Verify JWT     │
     │                │                │ Check Roles    │
     │                │   Data         │                │
     │                │<───────────────│                │
     │   Render Page  │                │                │
     │<───────────────│                │                │
```

## Role-Based Access Control

### Role Hierarchy

```
ADMIN (System-wide)
  │
  └── Can approve organizer requests
  └── Can view all events/organizations
  └── Cannot be invited to organizations

ORGANIZER (Organization-level)
  │
  └── Can create organizations
  └── Can create events
  └── Can invite/remove members
  └── Can manage member roles

TEAM_MEMBER (Organization-level)
  │
  └── Can view organization events
  └── Can use AI chat
  └── Cannot create events

GUEST (Default)
  │
  └── Can view public events
  └── Can request organizer role
  └── Can accept org invitations
```

### Permission Matrix

| Action                    | Guest | Team Member | Organizer | Admin |
|---------------------------|:-----:|:-----------:|:---------:|:-----:|
| View public events        |   ✓   |      ✓      |     ✓     |   ✓   |
| View org events           |   -   |      ✓      |     ✓     |   ✓   |
| Create events             |   -   |      -      |     ✓     |   ✓   |
| Edit own events           |   -   |      -      |     ✓     |   ✓   |
| Create organization       |   -   |      -      |     ✓     |   ✓   |
| Invite to organization    |   -   |      -      |     ✓     |   -   |
| Remove members            |   -   |      -      |     ✓     |   -   |
| Use AI chat               |   -   |      ✓      |     ✓     |   -   |
| Approve organizer reqs    |   -   |      -      |     -     |   ✓   |
| View all events           |   -   |      -      |     -     |   ✓   |

## API Design Patterns

### Response Format

**Success Response:**
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error description"
}
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Decorators Used

```python
@jwt_required()                    # Requires valid JWT
@role_required(UserRole.ADMIN)     # Requires specific role
@admin_or_organizer_required()     # Requires admin or organizer
@organization_member_required()    # Requires org membership
```

## State Management (Frontend)

### Redux Slices

```
store/
├── authSlice        # User auth state, login/logout
├── eventsSlice      # Events list and CRUD
├── organizationSlice # Organization data
└── toastSlice       # Notification messages
```

### Data Flow

```
Component → Dispatch Action → Async Thunk → API Call → Update State → Re-render
```

## Email System

### Email Types

| Type | Trigger | Template |
|------|---------|----------|
| Password Reset | Forgot password request | HTML with reset link |
| Org Invitation (Registered) | Invite existing user | Login link |
| Org Invitation (New) | Invite unregistered user | Signup link |
| Organizer Request | User requests organizer role | Notification to admins |
| Request Approved/Rejected | Admin decision | Status notification |
| Event Invitation | Invite external guest | Accept/Decline buttons |

### SendGrid Integration

```python
# Email sending pattern
sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
message = Mail(
    from_email=VERIFIED_EMAIL,
    to_emails=recipient,
    subject=subject,
    html_content=html_template
)
sg.send(message)
```

## Database Patterns

### Soft Deletes

Organizations and Events use soft delete:
```python
deleted_at = db.Column(db.DateTime, nullable=True)

@staticmethod
def get_active():
    return Model.query.filter(Model.deleted_at.is_(None))
```

### Relationships

```
User ──────┬──────> Organization (belongs to one)
           │
           └──────> Event (created many)

Organization ────> Event (has many)
                   │
Event ────────────> EventInvitation (has many)

Organization ────> OrganizationInvitation (has many)
```

## Security Measures

1. **Password Hashing**: Bcrypt with salt
2. **JWT Tokens**: 24-hour expiry, secure cookie storage
3. **CORS**: Configured for frontend origin only
4. **Input Validation**: All inputs validated before processing
5. **Role Checks**: Decorator-based on all protected routes
6. **SQL Injection Prevention**: SQLAlchemy ORM parameterized queries
