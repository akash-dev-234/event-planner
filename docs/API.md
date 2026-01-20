# API Reference

Base URL: `http://localhost:5000/api`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### Register User
```
POST /auth/register
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "guest"  // or "organizer" (requires admin approval)
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "guest"
  }
}
```

---

### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "token": "eyJ...",
  "user": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "guest",
    "organization_id": null
  },
  "pending_invitations": 0
}
```

---

### Forgot Password
```
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset email sent"
}
```

---

### Reset Password
```
POST /auth/reset-password/<token>
```

**Request Body:**
```json
{
  "password": "NewSecurePass456!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password has been reset successfully"
}
```

---

### Get Profile
```
GET /auth/profile
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "organizer",
  "organization_id": 1
}
```

---

### Get My Invitations
```
GET /auth/my-invitations
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "invitations": [
    {
      "id": 1,
      "organization": {
        "id": 1,
        "name": "Tech Corp"
      },
      "role": "team_member",
      "expires_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

---

### Accept Organization Invitation
```
POST /auth/accept-invitation
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "invitation_id": 1
}
```

**Response:** `200 OK`
```json
{
  "message": "Invitation accepted successfully",
  "organization_id": 1
}
```

---

### Admin: Get Organizer Requests
```
GET /auth/admin/organizer-requests
```
**Auth Required:** Yes (Admin only)

**Response:** `200 OK`
```json
{
  "pending_requests": [
    {
      "id": 5,
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "created_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

### Admin: Approve Organizer Request
```
POST /auth/admin/organizer-requests/<user_id>/approve
```
**Auth Required:** Yes (Admin only)

**Response:** `200 OK`
```json
{
  "message": "Organizer request approved"
}
```

---

### Admin: Reject Organizer Request
```
POST /auth/admin/organizer-requests/<user_id>/reject
```
**Auth Required:** Yes (Admin only)

**Response:** `200 OK`
```json
{
  "message": "Organizer request rejected"
}
```

---

## Event Endpoints

### Create Event
```
POST /events/create
```
**Auth Required:** Yes (Organizer/Admin)

**Request Body:**
```json
{
  "title": "Annual Conference 2024",
  "description": "Our biggest event of the year",
  "date": "2024-06-15",
  "time": "09:00",
  "location": "Convention Center, NYC",
  "is_public": true
}
```

**Response:** `201 Created`
```json
{
  "message": "Event created successfully",
  "event": {
    "id": 1,
    "title": "Annual Conference 2024",
    "description": "Our biggest event of the year",
    "date": "2024-06-15",
    "time": "09:00",
    "location": "Convention Center, NYC",
    "is_public": true,
    "organization_id": 1,
    "user_id": 1
  }
}
```

---

### Get Events
```
GET /events?filter=public&offset=0&limit=50
```
**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| filter | string | `public`, `my_org`, `all` (admin only) |
| offset | int | Pagination offset (default: 0) |
| limit | int | Items per page (default: 50) |

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": 1,
      "title": "Annual Conference 2024",
      "description": "Our biggest event of the year",
      "date": "2024-06-15",
      "time": "09:00",
      "location": "Convention Center, NYC",
      "is_public": true,
      "organization": {
        "id": 1,
        "name": "Tech Corp"
      },
      "organizer": {
        "id": 1,
        "name": "John Doe"
      }
    }
  ],
  "total": 1
}
```

---

### Get Event by ID
```
GET /events/<event_id>
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "event": {
    "id": 1,
    "title": "Annual Conference 2024",
    "description": "Our biggest event of the year",
    "date": "2024-06-15",
    "time": "09:00",
    "location": "Convention Center, NYC",
    "is_public": true,
    "organization": { "id": 1, "name": "Tech Corp" },
    "organizer": { "id": 1, "name": "John Doe" }
  }
}
```

---

### Update Event
```
PUT /events/<event_id>
```
**Auth Required:** Yes (Creator/Org Organizer/Admin)

**Request Body:**
```json
{
  "title": "Updated Conference Title",
  "description": "Updated description",
  "date": "2024-06-20",
  "time": "10:00",
  "location": "New Venue",
  "is_public": false
}
```

**Response:** `200 OK`
```json
{
  "message": "Event updated successfully",
  "event": { ... }
}
```

---

### Delete Event
```
DELETE /events/<event_id>
```
**Auth Required:** Yes (Creator/Org Organizer/Admin)

**Response:** `200 OK`
```json
{
  "message": "Event deleted successfully"
}
```

---

### Invite Guests to Event
```
POST /events/<event_id>/invite-guests
```
**Auth Required:** Yes (Creator/Org Organizer)

**Request Body:**
```json
{
  "guests": [
    { "email": "guest1@example.com", "name": "Guest One" },
    { "email": "guest2@example.com", "name": "Guest Two" }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Invitations sent successfully",
  "invited_count": 2
}
```

---

### Get Guest List
```
GET /events/<event_id>/guest-list
```
**Auth Required:** Yes (Creator/Org Organizer)

**Response:** `200 OK`
```json
{
  "guests": [
    {
      "id": 1,
      "guest_email": "guest1@example.com",
      "guest_name": "Guest One",
      "status": "accepted",
      "responded_at": "2024-01-12T14:30:00Z"
    },
    {
      "id": 2,
      "guest_email": "guest2@example.com",
      "guest_name": "Guest Two",
      "status": "pending",
      "responded_at": null
    }
  ]
}
```

---

### RSVP to Event (Public)
```
GET /events/rsvp/<token>?response=accepted
```
**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| response | string | `accepted` or `declined` |

**Response:** `200 OK`
```json
{
  "message": "Thank you for your response",
  "event": {
    "title": "Annual Conference 2024",
    "date": "2024-06-15",
    "time": "09:00",
    "location": "Convention Center, NYC"
  },
  "response": "accepted"
}
```

---

## Organization Endpoints

### Create Organization
```
POST /organization/create
```
**Auth Required:** Yes (Organizer role)

**Request Body:**
```json
{
  "name": "Tech Innovators",
  "description": "A community of tech enthusiasts"
}
```

**Response:** `201 Created`
```json
{
  "message": "Organization created successfully",
  "organization": {
    "id": 1,
    "name": "Tech Innovators",
    "description": "A community of tech enthusiasts"
  }
}
```

---

### List Organizations (Admin)
```
GET /organization/list?filter=active
```
**Auth Required:** Yes (Admin only)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| filter | string | `active`, `deleted`, `all` |

**Response:** `200 OK`
```json
{
  "organizations": [
    {
      "id": 1,
      "name": "Tech Innovators",
      "description": "A community of tech enthusiasts",
      "member_count": 5
    }
  ]
}
```

---

### Get Organization
```
GET /organization/<org_id>
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "organization": {
    "id": 1,
    "name": "Tech Innovators",
    "description": "A community of tech enthusiasts",
    "members": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "organizer"
      }
    ]
  }
}
```

---

### Update Organization
```
PUT /organization/<org_id>
```
**Auth Required:** Yes (Organizer only)

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "message": "Organization updated successfully"
}
```

---

### Delete Organization
```
DELETE /organization/<org_id>
```
**Auth Required:** Yes (Organizer only)

**Response:** `200 OK`
```json
{
  "message": "Organization deleted successfully"
}
```

---

### Invite User to Organization
```
POST /organization/<org_id>/invite
```
**Auth Required:** Yes (Organizer only)

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "team_member"  // or "organizer"
}
```

**Response:** `200 OK`
```json
{
  "message": "Invitation sent successfully"
}
```

---

### Get Organization Members
```
GET /organization/<org_id>/members
```
**Auth Required:** Yes (Org members)

**Response:** `200 OK`
```json
{
  "members": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "organizer"
    }
  ]
}
```

---

### Remove Member
```
DELETE /organization/<org_id>/members/<member_id>
```
**Auth Required:** Yes (Organizer only)

**Response:** `200 OK`
```json
{
  "message": "Member removed successfully"
}
```

---

### Change Member Role
```
PUT /organization/<org_id>/members/<member_id>/role
```
**Auth Required:** Yes (Organizer only)

**Request Body:**
```json
{
  "role": "organizer"  // or "team_member"
}
```

**Response:** `200 OK`
```json
{
  "message": "Member role updated successfully"
}
```

---

### Leave Organization
```
POST /organization/leave
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Successfully left organization"
}
```

---

### Get Pending Invitations
```
GET /organization/<org_id>/invitations
```
**Auth Required:** Yes (Organizer only)

**Response:** `200 OK`
```json
{
  "invitations": [
    {
      "id": 1,
      "email": "pending@example.com",
      "role": "team_member",
      "expires_at": "2024-01-17T12:00:00Z"
    }
  ]
}
```

---

## Chat Endpoints

### Send Message
```
POST /chat/message
```
**Auth Required:** Yes (Org members only)

**Request Body:**
```json
{
  "message": "How do I create an event?"
}
```

**Response:** `200 OK`
```json
{
  "response": "To create an event, navigate to the Events page and click 'Create Event'..."
}
```

---

### Health Check
```
GET /chat/health
```
**Auth Required:** No

**Response:** `200 OK`
```json
{
  "status": "healthy"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Missing or invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred"
}
```
