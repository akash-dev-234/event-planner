# Event Planner

A full-stack event planning application with AI-powered chatbot assistance built using Next.js (frontend) and Flask (backend).

## Live Demo

- **Frontend**: [https://event-planner-frontend.vercel.app](https://event-planner-frontend.vercel.app)
- **Backend**: [https://event-planner-t35d.onrender.com](https://event-planner-t35d.onrender.com)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `eventplanner@yopmail.com` | `AdminPass123@` |
| Organizer | `john.doe@techinnovators.com` | `OrganizerPass123@` |
| Guest | `guest1@example.com` | `GuestPass123@` |

## Features

- Event Management (Create, Read, Update, Delete)
- Organization Management with Role-based Access
- AI-powered Chatbot using Groq API
- Email Notifications via SendGrid
- JWT Authentication
- Guest Invitation System with RSVP
- Docker Containerization
- Responsive UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Redux Toolkit
- **Backend**: Flask (Python), SQLAlchemy, psycopg3
- **Database**: PostgreSQL (Supabase)
- **AI**: Groq API integration
- **Email**: SendGrid
- **Deployment**: Vercel (Frontend), Render (Backend), Supabase (Database)
- **Build System**: Nx Monorepo

## Project Structure

```
event-planner/
├── apps/
│   ├── backend/           # Flask backend application
│   │   ├── app.py         # Main Flask application
│   │   ├── models.py      # Database models
│   │   ├── routes/        # API routes
│   │   ├── seed_data.py   # Database seeding script
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── frontend/          # Next.js frontend application
│       ├── src/
│       │   ├── app/       # Next.js App Router pages
│       │   ├── components/ # Reusable UI components
│       │   ├── lib/       # Utilities, API client, Redux store
│       │   └── hooks/     # Custom React hooks
│       ├── package.json
│       └── Dockerfile
├── docker-compose.yml     # Docker services configuration
├── package.json           # Root package.json (Nx workspace)
└── README.md
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/akash-dev-234/event-planner.git
cd event-planner
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install
```

### 3. Backend Setup

```bash
cd apps/backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

### 4. Frontend Setup

```bash
cd apps/frontend

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:5001" > .env.local
```

### 5. Run the Application

**Backend** (from `apps/backend` with venv activated):
```bash
python app.py
```

**Frontend** (from project root):
```bash
npm run frontend:serve
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5001](http://localhost:5001)

### 6. Seed Demo Data

```bash
cd apps/backend
source venv/bin/activate
python seed_data.py
```

## Environment Variables

### Backend (`apps/backend/.env`)

```env
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Flask Configuration
FLASK_APP=app.py
FLASK_SECRET_KEY=your-secret-key

# JWT
JWT_SECRET_KEY=your-jwt-secret

# Email (SendGrid)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
SENDGRID_API_KEY=your-sendgrid-api-key
MAIL_USERNAME=apikey
VERIFIED_EMAIL=your-verified-email@domain.com

# Groq AI API
GROK_API_KEY=your-groq-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (`apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

## Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `apps/backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
4. Add environment variables (DATABASE_URL, JWT_SECRET_KEY, etc.)
5. Use Supabase **Session mode** (port 5432) for IPv4 compatibility

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
2. Configure:
   - **Root Directory**: `apps/frontend`
   - **Framework**: Next.js
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL

### Database (Supabase)

1. Create a project on [Supabase](https://supabase.com)
2. Use **US East** region for best performance with Render
3. Get connection string from Settings > Database > Connection Pooling (Session mode, port 5432)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/forgot-password` - Request password reset

### Events
- `GET /api/events` - List events
- `POST /api/events/create` - Create event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/invite-guests` - Invite guests

### Organizations
- `POST /api/organization/create` - Create organization
- `GET /api/organization/:id` - Get organization
- `POST /api/organization/:id/invite` - Invite member

### Chat
- `POST /api/chat/message` - Chat with AI assistant

## Available Scripts

```bash
# Frontend
npm run frontend:serve    # Start dev server
npm run frontend:build    # Production build
npm run frontend:lint     # Lint code

# Backend (from apps/backend with venv)
python app.py             # Start dev server
python seed_data.py       # Seed database
```

## Docker Development

```bash
# Start all services
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Troubleshooting

### Database Connection Issues
- Ensure using **Session mode** (port 5432) for IPv4 compatibility
- Check DATABASE_URL is properly URL-encoded if password has special characters

### CORS Errors
- Verify `FRONTEND_URL` is set correctly in backend environment
- Check the frontend URL matches exactly (including protocol)

### Slow Response Times
- Ensure backend and database are in same region (both US or both Asia)
- Use cron-job.org to keep Render free tier awake

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
