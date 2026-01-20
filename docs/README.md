# Event Planner - Documentation

A comprehensive event management application built with Flask (backend) and Next.js (frontend).

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System design, tech stack, folder structure |
| [Features](./FEATURES.md) | Feature tracking - completed & pending |
| [API Reference](./API.md) | All API endpoints with examples |
| [Database Schema](./DATABASE.md) | Models, relationships, constraints |
| [Roadmap](./ROADMAP.md) | Implementation phases & priorities |

## Project Overview

**Event Planner** is a full-stack event management solution that enables organizations to create, manage, and track events with comprehensive RSVP functionality.

### Core Capabilities

- **Multi-tenant Organizations**: Create organizations with team members and role-based access
- **Event Management**: Create public/private events with guest invitations
- **RSVP System**: Token-based RSVP for external guests (no account required)
- **Role-Based Access**: Admin, Organizer, Team Member, Guest roles
- **Email Notifications**: Automated emails for invitations, reminders, approvals

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Redux Toolkit, Tailwind CSS |
| Backend | Flask, SQLAlchemy, Flask-JWT-Extended |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Email | SendGrid API |
| AI | Groq API (llama-3.1-8b-instant) |

### Project Status

```
Feature Completion: 58% (31/53 features)
├── Core MVP:       100% (18/18)
├── Expected:        46% (12/26)
└── Nice-to-Have:    11% (1/9)
```

See [FEATURES.md](./FEATURES.md) for detailed breakdown.

## Getting Started

### Backend Setup
```bash
cd apps/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
python app.py
```

### Frontend Setup
```bash
cd apps/frontend
npm install
npm run dev
```

### Environment Variables

**Backend** (`apps/backend/.env`):
```
FLASK_SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
SENDGRID_API_KEY=your-sendgrid-key
VERIFIED_EMAIL=your-verified-email
FRONTEND_URL=http://localhost:3000
GROK_API_KEY=your-groq-api-key
```

**Frontend** (`apps/frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Contributing

1. Check [FEATURES.md](./FEATURES.md) for pending features
2. Review [ROADMAP.md](./ROADMAP.md) for priorities
3. Follow existing code patterns documented in [ARCHITECTURE.md](./ARCHITECTURE.md)
