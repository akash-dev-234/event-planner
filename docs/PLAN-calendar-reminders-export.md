# Implementation Plan: Calendar View, Event Reminders & Export Guest List

**Date:** 2026-03-23
**Status:** Planned
**Priority:** High (Quick Wins)

---

## Overview

Three high-impact features that build directly on existing infrastructure:

| Feature | Scope | Backend | Frontend | New Dependencies |
|---------|-------|---------|----------|-----------------|
| Export Guest List | CSV download of event guests | 1 endpoint | 1 API method + button | None |
| Event Reminders | Scheduled 24h/1h email reminders | 1 module + scheduler init | None | APScheduler |
| Calendar View | Monthly/weekly event calendar | None | 1 page + sidebar link | @fullcalendar/* |

---

## Feature 1: Export Guest List as CSV

### Problem
Organizers need to download guest lists for logistics (printing name badges, catering counts, check-in sheets). Currently they can only view guests in the browser.

### Solution
Server-side CSV generation endpoint + frontend download button on the event detail page.

### Backend Changes

**New endpoint in `apps/backend/routes/events/invitation_routes.py`:**

```
GET /api/events/<event_id>/guest-list/export
```

- **Auth:** JWT required, organizer/admin role
- **Permission:** Event owner or admin only (mirrors existing `get_event_guest_list`)
- **Response:** `text/csv` file with `Content-Disposition: attachment`
- **Columns:** Name, Email, Status, Invited At, Responded At

### Frontend Changes

**`apps/frontend/src/lib/api.ts`:**
- Add `exportGuestListCSV(eventId)` method
- Uses `fetch` directly (blob response, not JSON)
- Creates temporary download link via `URL.createObjectURL`

**`apps/frontend/src/app/events/[id]/page.tsx`:**
- Add "Export CSV" button in the Guest List card header
- Only visible to organizers/admins (same `canEdit` guard)
- Uses `Download` icon from lucide-react

### Data Flow
```
User clicks "Export CSV"
  -> Frontend calls GET /api/events/{id}/guest-list/export with JWT
  -> Backend queries EventInvitation table
  -> Backend generates CSV in-memory (io.StringIO)
  -> Returns as file download
  -> Frontend creates blob URL and triggers download
```

---

## Feature 2: Event Reminders (Scheduled Emails)

### Problem
Guests who accept event invitations receive no reminder before the event. The database already has `reminder_24h_sent` and `reminder_1h_sent` fields on `EventInvitation`, and `send_event_reminder_email()` exists in `utils/email_helpers.py`, but no scheduler triggers them.

### Solution
APScheduler running as a background thread, checking every 15 minutes for upcoming events that need reminders.

### Backend Changes

**New dependency:** `APScheduler==3.10.4` in `requirements.txt`

**New file: `apps/backend/scheduler.py`:**
- `check_and_send_reminders()` function
- Queries events happening in ~24h and ~1h windows
- For each matching event, finds accepted invitations where reminder not yet sent
- Calls existing `send_event_reminder_email(invitation, event, hours)`
- Marks `reminder_24h_sent` / `reminder_1h_sent` = True
- Uses 2-hour overlapping windows to prevent missed reminders

**Modified: `apps/backend/app.py`:**
- Initialize scheduler after blueprint registration
- Guard against double-start in Flask debug mode (`WERKZEUG_RUN_MAIN`)
- 15-minute interval job

**New admin endpoint in `apps/backend/routes/events/routes.py`:**
```
POST /api/events/admin/trigger-reminders
```
- Admin-only manual trigger for testing
- Calls `check_and_send_reminders()` synchronously

### Reminder Logic
```
Every 15 minutes:
  now = current UTC time

  # 24-hour reminders
  For each active event where date+time is between now+23h and now+25h:
    For each accepted invitation where reminder_24h_sent = False:
      Send reminder email (subject: "Reminder: {title} is tomorrow")
      Set reminder_24h_sent = True

  # 1-hour reminders
  For each active event where date+time is between now+45min and now+1h15min:
    For each accepted invitation where reminder_1h_sent = False:
      Send reminder email (subject: "Final Reminder: {title} is in 1 hour")
      Set reminder_1h_sent = True
```

### Production Considerations
- APScheduler runs in-process (no Redis/Celery needed)
- With Gunicorn multi-worker, only one worker should run the scheduler (use `--preload` or single worker)
- Existing `send_event_reminder_email` already filters by `status == 'accepted'`

---

## Feature 3: Calendar View

### Problem
Events are displayed as a flat list. A calendar view helps users visualize event distribution across time, quickly spot conflicts, and find events by date.

### Solution
FullCalendar React component on a new `/events/calendar` page, reusing the existing `GET /api/events` endpoint with `date_from`/`date_to` parameters.

### Frontend Changes

**New dependencies:**
- `@fullcalendar/react`
- `@fullcalendar/daygrid` (month view)
- `@fullcalendar/timegrid` (week view)
- `@fullcalendar/interaction` (click/drag events)

**New page: `apps/frontend/src/app/events/calendar/page.tsx`:**
- Wrapped in `DashboardLayout` with `requireAuth={true}`
- FullCalendar component with month + week views
- On calendar navigation (month/week change), fetches events for visible date range
- Maps events to FullCalendar format: `{ id, title, start: "${date}T${time}", extendedProps }`
- Click on event navigates to `/events/{id}`
- Category color-coding on calendar events
- Filter controls: category chips + public/my_org toggle
- Link back to list view

**Modified: `apps/frontend/src/components/Sidebar.tsx`:**
- Add "Calendar" submenu item under Events (between Browse Events and Create Event)
- Uses `CalendarDays` icon from lucide-react

**Modified: `apps/frontend/src/app/events/page.tsx`:**
- Add "Calendar View" toggle button in page header (links to `/events/calendar`)

### No Backend Changes Required
The existing `GET /api/events` endpoint already supports:
- `date_from` / `date_to` parameters
- `category` filter
- `filter` parameter (public/my_org/all)

### Calendar Event Mapping
```typescript
events.map(event => ({
  id: String(event.id),
  title: event.title,
  start: `${event.date}T${event.time}`,
  backgroundColor: categoryColorMap[event.category],
  extendedProps: {
    location: event.location,
    category: event.category,
    is_public: event.is_public,
  }
}))
```

---

## Implementation Order

1. **Export Guest List** — Self-contained, no side effects, quick to verify
2. **Event Reminders** — New dependency + module, but well-isolated
3. **Calendar View** — Largest frontend change, but no backend risk

---

## Files Changed Summary

### New Files
| File | Feature |
|------|---------|
| `apps/backend/scheduler.py` | Event Reminders |
| `apps/frontend/src/app/events/calendar/page.tsx` | Calendar View |

### Modified Files
| File | Feature | Change |
|------|---------|--------|
| `apps/backend/requirements.txt` | Reminders | Add APScheduler |
| `apps/backend/app.py` | Reminders | Initialize scheduler |
| `apps/backend/routes/events/invitation_routes.py` | Export | CSV endpoint |
| `apps/backend/routes/events/routes.py` | Reminders | Admin trigger endpoint |
| `apps/frontend/package.json` | Calendar | FullCalendar deps |
| `apps/frontend/src/lib/api.ts` | Export | exportGuestListCSV method |
| `apps/frontend/src/app/events/[id]/page.tsx` | Export | Download button |
| `apps/frontend/src/app/events/page.tsx` | Calendar | View toggle button |
| `apps/frontend/src/components/Sidebar.tsx` | Calendar | Calendar nav item |

---

## Testing Plan

- [ ] Export: Create event with guests, click Export CSV, verify CSV content
- [ ] Export: Verify non-owner gets 403
- [ ] Reminders: Create event 24h from now, accept invitation, trigger manually, verify email
- [ ] Reminders: Verify reminder_24h_sent flag prevents duplicate sends
- [ ] Calendar: Navigate months, verify events load for visible range
- [ ] Calendar: Click event, verify navigation to detail page
- [ ] Calendar: Filter by category, verify calendar updates
