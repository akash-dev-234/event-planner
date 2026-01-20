# Feature Tracking

This document tracks all features - completed, in progress, and planned.

---

## Summary

| Category | Completed | Total | Progress |
|----------|:---------:|:-----:|:--------:|
| Core MVP | 18 | 18 | 100% |
| Expected Features | 12 | 26 | 46% |
| Nice-to-Have | 1 | 9 | 11% |
| **Overall** | **31** | **53** | **58%** |

---

## Completed Features

### Authentication & Authorization

| # | Feature | Description | Files |
|---|---------|-------------|-------|
| 1 | User Registration | Email/password signup with validation | `routes/auth/routes.py` |
| 2 | User Login | JWT-based authentication | `routes/auth/routes.py` |
| 3 | Password Reset | Email token-based reset flow | `routes/auth/routes.py` |
| 4 | Role-Based Access | Admin, Organizer, Team Member, Guest | `decorators.py` |
| 5 | Organizer Approval | Admin approves organizer requests | `routes/auth/routes.py` |
| 6 | Protected Routes | Frontend route guards | `components/RouteGuard.tsx` |

### Organization Management

| # | Feature | Description | Files |
|---|---------|-------------|-------|
| 7 | Create Organization | Organizers can create orgs | `routes/organizations/routes.py` |
| 8 | Update Organization | Edit org name/description | `routes/organizations/routes.py` |
| 9 | Delete Organization | Soft delete with recovery | `routes/organizations/routes.py` |
| 10 | Member Management | Add, remove, change roles | `routes/organizations/routes.py` |
| 11 | Organization Invitations | Email invites with 7-day expiry | `routes/organizations/routes.py` |
| 12 | Leave Organization | Members can leave | `routes/organizations/routes.py` |

### Event Management

| # | Feature | Description | Files |
|---|---------|-------------|-------|
| 13 | Create Event | Title, date, time, location, visibility | `routes/events/routes.py` |
| 14 | Update Event | Edit all event fields | `routes/events/routes.py` |
| 15 | Delete Event | Soft delete events | `routes/events/routes.py` |
| 16 | Event Visibility | Public vs private to organization | `routes/events/routes.py` |
| 17 | Guest Invitations | Invite external guests by email | `routes/events/invitation_routes.py` |
| 18 | Event RSVP | Token-based accept/decline | `routes/events/invitation_routes.py` |

### User Interface

| # | Feature | Description | Files |
|---|---------|-------------|-------|
| 19 | User Dashboard | Stats, quick actions | `app/dashboard/page.tsx` |
| 20 | Admin Dashboard | Organizer request management | `app/admin/organizer-requests/page.tsx` |
| 21 | Events List | View events with filters | `app/events/page.tsx` |
| 22 | Event Detail | View event information | `app/events/[id]/page.tsx` |
| 23 | Create Event Form | Event creation wizard | `app/events/create/page.tsx` |

### Infrastructure

| # | Feature | Description | Files |
|---|---------|-------------|-------|
| 24 | Email Notifications | SendGrid integration | `utils/email_helpers.py` |
| 25 | Redux State Management | Auth, events, org slices | `lib/redux/` |
| 26 | Database Migrations | Alembic setup | `migrations/` |
| 27 | AI Chat Assistant | Groq API integration | `routes/chat/routes.py` |

---

## Pending Features

### High Priority (Essential for Complete MVP)

| # | Feature | Description | Complexity | Priority |
|---|---------|-------------|:----------:|:--------:|
| 1 | Event Search | Search by title, description | Medium | P0 |
| 2 | Event Filters | Filter by date range, location | Medium | P0 |
| 3 | Calendar View | Monthly/weekly calendar display | High | P0 |
| 4 | Event Categories | Tags like conference, meetup, workshop | Low | P0 |
| 5 | Event Capacity | Max attendees setting | Low | P0 |
| 6 | User Profile Page | View/edit profile information | Low | P0 |
| 7 | Attendee Check-in | Mark guests as checked in | Medium | P1 |
| 8 | Event Reminders | Scheduled 24h/1h reminder emails | High | P1 |

### Medium Priority (Expected Features)

| # | Feature | Description | Complexity | Priority |
|---|---------|-------------|:----------:|:--------:|
| 9 | Event Images | Upload banner/thumbnail | Medium | P2 |
| 10 | Registration Forms | Custom fields for attendees | High | P2 |
| 11 | Waitlist | Queue when capacity reached | Medium | P2 |
| 12 | Event Cancellation | Cancel with notifications | Low | P2 |
| 13 | Export Attendees | CSV/Excel download | Low | P2 |
| 14 | Notification Preferences | Email opt-in/out settings | Medium | P2 |
| 15 | Activity Logs | Audit trail of actions | Medium | P2 |
| 16 | Duplicate Event | Copy event to create similar | Low | P2 |

### Low Priority (Nice-to-Have)

| # | Feature | Description | Complexity | Priority |
|---|---------|-------------|:----------:|:--------:|
| 17 | Virtual Events | Zoom/Meet integration | Medium | P3 |
| 18 | Ticketing | Paid events with Stripe | High | P3 |
| 19 | Multi-Language | i18n support | High | P3 |
| 20 | Analytics Dashboard | Attendance metrics, trends | High | P3 |
| 21 | Mobile App/PWA | Native mobile experience | High | P3 |
| 22 | QR Code Check-in | Generate QR for entry | Low | P3 |
| 23 | Event Templates | Save/reuse configurations | Medium | P3 |
| 24 | Bulk Import | CSV upload for events | Medium | P3 |
| 25 | Recurring Events | Weekly/monthly recurrence | High | P3 |
| 26 | Public Org Pages | Shareable landing pages | Medium | P3 |

---

## Technical Debt & Simplifications

### Can Be Simplified

| Item | Current State | Recommendation |
|------|---------------|----------------|
| Single-Org Constraint | Users limited to one org | Either remove limitation or simplify logic |
| Dual Role System | System + org level roles | Consolidate to single role model |
| Reminder Fields | DB fields exist, no scheduler | Remove fields or implement scheduler |

### Technical Debt

| Item | Issue | Impact |
|------|-------|--------|
| No test coverage | No unit/integration tests | High risk for regressions |
| SQLite in dev | Not production-ready | Need PostgreSQL migration |
| Hardcoded frontend URL | In email templates | Should be configurable |
| No rate limiting | API vulnerable to abuse | Security risk |
| No request logging | No API request logs | Debugging difficulty |

---

## Feature Dependencies

```
Calendar View
    └── requires: Event date/time (done)

Event Reminders
    └── requires: Celery/Redis setup (not done)
    └── requires: Reminder fields (done)

Waitlist System
    └── requires: Event Capacity (not done)

Export Attendees
    └── requires: Guest list (done)

Analytics Dashboard
    └── requires: Event data (done)
    └── requires: Check-in data (not done)
```

---

## Implementation Notes

### Adding Event Categories

```python
# models.py - Add EventCategory enum
class EventCategory(enum.Enum):
    CONFERENCE = "conference"
    MEETUP = "meetup"
    WORKSHOP = "workshop"
    SOCIAL = "social"
    OTHER = "other"

# Add to Event model
category = db.Column(db.Enum(EventCategory), default=EventCategory.OTHER)
```

### Adding Event Capacity

```python
# models.py - Add to Event model
max_capacity = db.Column(db.Integer, nullable=True)  # null = unlimited

# routes/events/routes.py - Check capacity before accepting RSVP
accepted_count = EventInvitation.query.filter_by(
    event_id=event.id,
    status='accepted'
).count()
if event.max_capacity and accepted_count >= event.max_capacity:
    return jsonify({"error": "Event is at capacity"}), 400
```

### Adding Search

```python
# routes/events/routes.py - Add search parameter
search = request.args.get('search', '')
query = Event.get_active()
if search:
    query = query.filter(
        db.or_(
            Event.title.ilike(f'%{search}%'),
            Event.description.ilike(f'%{search}%'),
            Event.location.ilike(f'%{search}%')
        )
    )
```
