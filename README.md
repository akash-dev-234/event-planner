# Event Planner

A full-stack event planning application with AI-powered chatbot assistance built using Next.js (frontend) and Flask (backend).

## Features

- 🎯 Event Management (Create, Read, Update, Delete)
- 🤖 AI-powered Chatbot using Grok API
- 📧 Email notifications via SendGrid
- 🔐 JWT Authentication
- 🐳 Docker containerization
- 📱 Responsive UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Flask (Python), SQLite
- **AI**: Grok API integration
- **Email**: SendGrid
- **Containerization**: Docker & Docker Compose
- **Build System**: Nx Monorepo

## Prerequisites

Before you begin, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Git](https://git-scm.com/downloads)

### Required API Keys

You'll need to obtain the following API keys:

1. **Grok API Key**: Sign up at [xAI Console](https://console.x.ai/) to get your Grok API key
2. **SendGrid API Key**: Create a free account at [SendGrid](https://sendgrid.com/) and generate an API key

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd event-planner
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Open `.env` in your favorite text editor and fill in the required values:

```env
# Database Configuration (Leave as is for SQLite)
DATABASE_URI=sqlite:///database.db

# Flask Configuration (Generate random strings for these)
FLASK_SECRET_KEY=your_flask_secret_key_here_generate_a_random_string
JWT_SECRET_KEY=your_jwt_secret_key_here_generate_a_random_string

# Email Configuration (SendGrid)
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
SENDGRID_API_KEY=your_sendgrid_api_key_here
MAIL_USERNAME=your_verified_email@example.com

# Grok AI API Configuration
GROK_API_KEY=your_grok_api_key_here

# Application URLs (Leave as is for local development)
VERIFIED_EMAIL=your_verified_email@example.com
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5001
```

#### How to Generate Secret Keys

For `FLASK_SECRET_KEY` and `JWT_SECRET_KEY`, you can generate secure random strings using:

**Python:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Online Generator:**
Visit [random.org/strings](https://www.random.org/strings/) and generate a 64-character string

### 3. Start the Application

Run the application using Docker Compose:

```bash
docker compose up --build
```

This command will:
- Build both frontend and backend Docker images
- Start the backend server on port 5001
- Start the frontend server on port 3000
- Create a shared network for communication between services

### 4. Access the Application

- **Frontend**: Open your browser and go to [http://localhost:3000](http://localhost:3000)
- **Backend API**: The API will be available at [http://localhost:5001](http://localhost:5001)

## Development Setup (Without Docker)

If you prefer to run the application locally without Docker:

### Prerequisites

- Node.js 18+ 
- Python 3.11+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd apps/backend
```

2. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend:
```bash
python app.py
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd apps/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

## Project Structure

```
event-planner/
├── apps/
│   ├── backend/           # Flask backend application
│   │   ├── app.py        # Main Flask application
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── frontend/         # Next.js frontend application
│       ├── src/
│       ├── package.json
│       └── Dockerfile
├── docker-compose.yml    # Docker services configuration
├── .env.example         # Environment variables template
├── package.json         # Root package.json (Nx workspace)
└── README.md
```

## Available Scripts

In the root directory, you can run:

- `npm run frontend:serve` - Start frontend development server
- `npm run backend:serve` - Start backend development server
- `npm run build` - Build both applications
- `npm run test` - Run tests
- `npm run lint` - Lint code

## API Endpoints

The backend provides the following main endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/chat` - Chat with AI assistant

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URI` | SQLite database path | No | `sqlite:///database.db` |
| `FLASK_SECRET_KEY` | Flask session secret | Yes | - |
| `JWT_SECRET_KEY` | JWT token secret | Yes | - |
| `GROK_API_KEY` | Grok AI API key | Yes | - |
| `SENDGRID_API_KEY` | SendGrid email API key | Yes | - |
| `MAIL_USERNAME` | Verified email address | Yes | - |
| `VERIFIED_EMAIL` | Email for notifications | Yes | - |
| `FRONTEND_URL` | Frontend application URL | No | `http://localhost:3000` |
| `BACKEND_URL` | Backend API URL | No | `http://localhost:5001` |

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Make sure ports 3000 and 5001 are not being used by other applications
   - You can change the ports in `docker-compose.yml` if needed

2. **Docker build fails**
   - Ensure Docker is running
   - Try `docker compose down` then `docker compose up --build`

3. **Environment variables not loaded**
   - Verify `.env` file exists in the root directory
   - Check that all required variables are set

4. **API key errors**
   - Verify your Grok API key is valid
   - Check SendGrid API key has proper permissions

### Getting Help

If you encounter issues:

1. Check the application logs: `docker compose logs`
2. Verify your `.env` configuration
3. Ensure all required API keys are valid
4. Check that Docker is running properly

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
