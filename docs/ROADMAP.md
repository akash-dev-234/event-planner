# Implementation Roadmap

This document outlines the phased implementation plan for completing the Event Planner application.

---

## Current State

```
Overall Progress: ████████████░░░░░░░░ 58%

Core MVP:         ████████████████████ 100% (18/18)
Expected:         █████████░░░░░░░░░░░  46% (12/26)
Nice-to-Have:     █░░░░░░░░░░░░░░░░░░░  11% (1/9)
```

---

## Phase 1: MVP Polish (Quick Wins)

**Goal:** Complete essential features that users expect from any event management tool.

**Priority:** P0 - Critical

| # | Feature | Complexity | Backend | Frontend | Status |
|---|---------|:----------:|:-------:|:--------:|:------:|
| 1 | Event Search | Low | 2h | 2h | Not Started |
| 2 | Event Date Filters | Low | 1h | 2h | Not Started |
| 3 | Event Categories | Low | 1h | 2h | Not Started |
| 4 | Event Capacity | Low | 2h | 2h | Not Started |
| 5 | User Profile Page | Low | 1h | 3h | Not Started |

### Implementation Details

#### 1. Event Search
**Backend Changes:**
- Add `search` query parameter to `GET /events`
- Search across title, description, location using `ILIKE`

**Frontend Changes:**
- Add search input to events list page
- Debounced search with 300ms delay
- Clear search button

#### 2. Event Date Filters
**Backend Changes:**
- Add `date_from` and `date_to` query parameters
- Filter events by date range

**Frontend Changes:**
- Date range picker component
- Quick filters: Today, This Week, This Month

#### 3. Event Categories
**Backend Changes:**
- Add `EventCategory` enum to models
- Add `category` field to Event model
- Migration for new column

**Frontend Changes:**
- Category dropdown in create/edit forms
- Category filter chips on events list
- Category badge on event cards

#### 4. Event Capacity
**Backend Changes:**
- Add `max_capacity` field to Event model
- Check capacity before accepting RSVP
- Return capacity info in event responses

**Frontend Changes:**
- Capacity input in create/edit forms
- "X spots left" indicator on event cards
- "Event Full" state handling

#### 5. User Profile Page
**Frontend Changes:**
- New `/profile` page
- Display user info (name, email, role, organization)
- Edit profile form (name)
- Password change form

---

## Phase 2: Production Ready

**Goal:** Features required for real-world deployment and daily use.

**Priority:** P1 - High

| # | Feature | Complexity | Backend | Frontend | Status |
|---|---------|:----------:|:-------:|:--------:|:------:|
| 1 | Calendar View | High | 0h | 8h | Not Started |
| 2 | Attendee Check-in | Medium | 3h | 4h | Not Started |
| 3 | Event Reminders | High | 6h | 2h | Not Started |
| 4 | Export Attendees | Low | 2h | 2h | Not Started |
| 5 | Event Cancellation | Low | 2h | 2h | Not Started |

### Implementation Details

#### 1. Calendar View
**Dependencies:** None

**Frontend Changes:**
- Install `react-big-calendar` or `fullcalendar`
- Calendar page with month/week/day views
- Click event to view details
- Drag to create (future enhancement)

#### 2. Attendee Check-in
**Backend Changes:**
- Add `checked_in` and `checked_in_at` to EventInvitation
- New endpoint: `POST /events/{id}/check-in/{invitation_id}`
- Bulk check-in endpoint

**Frontend Changes:**
- Check-in toggle on guest list
- Check-in stats display
- Bulk check-in option

#### 3. Event Reminders
**Backend Changes:**
- Set up Celery with Redis
- Scheduled tasks for 24h and 1h reminders
- Update `reminder_sent` fields

**Infrastructure:**
- Redis server
- Celery worker process
- Celery beat scheduler

#### 4. Export Attendees
**Backend Changes:**
- New endpoint: `GET /events/{id}/export`
- Generate CSV with guest details
- Support for filtered export (status)

**Frontend Changes:**
- Export button on guest list
- Format selection (CSV)

#### 5. Event Cancellation
**Backend Changes:**
- New endpoint: `POST /events/{id}/cancel`
- Send cancellation emails to all guests
- Update event status

**Frontend Changes:**
- Cancel button with confirmation
- Cancellation reason input
- Visual cancelled state

---

## Phase 3: Growth Features

**Goal:** Features that enhance user experience and enable scaling.

**Priority:** P2 - Medium

| # | Feature | Complexity | Backend | Frontend | Status |
|---|---------|:----------:|:-------:|:--------:|:------:|
| 1 | Event Images | Medium | 4h | 4h | Not Started |
| 2 | Waitlist | Medium | 4h | 3h | Not Started |
| 3 | Notification Preferences | Medium | 3h | 4h | Not Started |
| 4 | Activity Logs | Medium | 4h | 4h | Not Started |
| 5 | Duplicate Event | Low | 1h | 2h | Not Started |

### Implementation Details

#### 1. Event Images
**Backend Changes:**
- File upload endpoint
- Image storage (local or S3)
- Image URL field in Event model

**Frontend Changes:**
- Image upload in event form
- Image preview
- Fallback placeholder

#### 2. Waitlist
**Dependencies:** Event Capacity

**Backend Changes:**
- Add `is_waitlisted` to EventInvitation
- Auto-promote from waitlist when spot opens
- Waitlist notification emails

**Frontend Changes:**
- Join waitlist button
- Waitlist position display
- Waitlist management for organizers

---

## Phase 4: Advanced Features

**Goal:** Premium features for power users and enterprise needs.

**Priority:** P3 - Low

| # | Feature | Complexity | Status |
|---|---------|:----------:|:------:|
| 1 | Recurring Events | High | Not Started |
| 2 | Virtual Events | Medium | Not Started |
| 3 | Ticketing/Payments | High | Not Started |
| 4 | Analytics Dashboard | High | Not Started |
| 5 | Multi-Language | High | Not Started |
| 6 | QR Code Check-in | Low | Not Started |

---

## Technical Debt Backlog

| Item | Priority | Effort |
|------|:--------:|:------:|
| Add unit tests (backend) | High | 16h |
| Add integration tests | High | 16h |
| Add E2E tests (Playwright) | Medium | 8h |
| PostgreSQL migration | High | 4h |
| Add rate limiting | High | 2h |
| Add request logging | Medium | 2h |
| API documentation (OpenAPI) | Low | 4h |
| Error monitoring (Sentry) | Medium | 2h |
| CI/CD pipeline | High | 8h |

---

## Recommended Implementation Order

### Sprint 1 (Week 1-2)
- [ ] Event Search
- [ ] Event Date Filters
- [ ] Event Categories
- [ ] User Profile Page

### Sprint 2 (Week 3-4)
- [ ] Event Capacity
- [ ] Calendar View (basic)
- [ ] Export Attendees

### Sprint 3 (Week 5-6)
- [ ] Attendee Check-in
- [ ] Event Cancellation
- [ ] Duplicate Event

### Sprint 4 (Week 7-8)
- [ ] Event Reminders (Celery setup)
- [ ] Notification Preferences
- [ ] Unit Tests

### Sprint 5 (Week 9-10)
- [ ] Event Images
- [ ] Waitlist System
- [ ] Activity Logs

---

## Success Metrics

| Metric | Current | Target |
|--------|:-------:|:------:|
| Feature Completion | 58% | 85% |
| Test Coverage | 0% | 70% |
| API Response Time | N/A | <200ms |
| User Satisfaction | N/A | >4.0/5 |

---

## Notes

- Priorities may shift based on user feedback
- Each feature should include documentation updates
- All new endpoints need tests before merge
- UI changes should follow existing design patterns
