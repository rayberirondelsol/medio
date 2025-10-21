# Local Development Setup

## Quick Start (Docker)

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Git

### 1. Start All Services
```bash
# Start PostgreSQL database
docker-compose up postgres -d

# Wait for database to be ready (check with docker-compose logs postgres)

# Start backend API
docker-compose up backend -d

# Or start everything at once
docker-compose up -d
```

### 2. Verify Services
```bash
# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Check backend health
curl http://localhost:5000/api/health

# Check database
docker exec -it medio-postgres psql -U medio -d medio -c "\dt"
```

### 3. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (DELETES ALL DATA)
docker-compose down -v
```

## Local Development (Without Docker)

### 1. Start PostgreSQL Only
```bash
docker-compose up postgres -d
```

### 2. Configure Backend
Update `backend/.env`:
```env
DATABASE_URL=postgresql://medio:medio_dev_password@localhost:5432/medio
PORT=5000
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=dev_session_secret_change_in_production_min_64_chars_required
JWT_SECRET=dev_jwt_secret_change_in_production_min_64_chars_required
```

### 3. Start Backend Locally
```bash
cd backend
npm install
npm run dev
```

### 4. Start Frontend Development Server
```bash
# In root directory
npm install
npm start
# App runs on http://localhost:3000
```

### 5. Test Proxy Setup
```bash
# Build frontend
npm run build

# Start proxy server
node server.js
# Proxy runs on http://localhost:8080
```

## Running Tests

### Unit Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
npm test
```

### E2E Tests
```bash
# Make sure services are running first
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

## Database Management

### Reset Database
```bash
# Stop and remove database volume
docker-compose down postgres
docker volume rm medio_postgres_data

# Start fresh
docker-compose up postgres -d
```

### Access Database Console
```bash
docker exec -it medio-postgres psql -U medio -d medio
```

### View Tables
```sql
\dt                 -- List all tables
\d users           -- Describe users table
SELECT * FROM users LIMIT 10;
```

### Manual SQL Execution
```bash
docker exec -i medio-postgres psql -U medio -d medio < your-script.sql
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5432
netstat -ano | findstr :5432

# Kill the process or change the port in docker-compose.yml
```

### Database Connection Refused
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Ensure DATABASE_URL is correct
echo $DATABASE_URL
```

### Backend Won't Start
```bash
# Check backend logs
docker-compose logs backend

# Rebuild backend container
docker-compose build backend
docker-compose up backend
```

## Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Min 64 characters for session encryption
- `JWT_SECRET`: Min 64 characters for JWT signing
- `FRONTEND_URL`: Frontend URL for CORS

### Optional Variables
- `YOUTUBE_API_KEY`: For YouTube metadata fetching
- `VIMEO_ACCESS_TOKEN`: For Vimeo metadata fetching
- `SENTRY_DSN`: For error tracking

## Project Structure
```
medio/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   ├── init.sql          # Database schema
│   └── package.json
├── src/                  # React frontend
├── docker-compose.yml    # Local development setup
├── server.js            # BFF proxy server
└── DEVELOPMENT.md       # This file
```
