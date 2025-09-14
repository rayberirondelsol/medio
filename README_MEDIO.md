# Medio - Kids Video Platform with Parental Controls

A modern web platform that allows parents to control and manage their children's video watching experience through NFC chip activation and time limits.

## Features

### For Parents
- **Secure Login**: Parent accounts with authentication
- **Video Library Management**: Add and organize videos from YouTube (and other platforms)
- **Child Profiles**: Create profiles for each child with daily watch time limits
- **NFC Chip Management**: Register and link NFC chips to specific videos
- **Time Controls**: Set maximum watch times per video and daily limits per child
- **Dashboard**: Monitor watch time and activity across all profiles
- **Modern UI**: Clean, Netflix-inspired interface with dark mode support

### For Kids
- **No Login Required**: Direct access to kid mode
- **NFC Activation**: Scan NFC chips to start videos (simulation available for testing)
- **Automatic Time Limits**: Videos stop automatically when time limits are reached
- **Kid-Friendly Interface**: Colorful, simple interface designed for young children
- **Safe Environment**: No access to unauthorized content

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **React Router** for navigation
- **Axios** for API calls
- **Framer Motion** for animations
- **React Icons** for UI icons

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** for password hashing
- **Express Validator** for input validation

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for multi-container orchestration
- **Nginx** for production reverse proxy

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 16+ (for local development)
- Make (optional, for using Makefile commands)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd medio
```

2. Set up the environment:
```bash
# Using Make
make setup

# Or manually
npm install
cd backend && npm install && cd ..
docker-compose -f docker-compose.full.yml up -d postgres
cd backend && npm run migrate && npm run seed && cd ..
```

3. Start the development environment:
```bash
# Using Docker Compose (recommended)
docker-compose -f docker-compose.full.yml up

# Or using Make
make dev
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Kids Mode: http://localhost:3000/kids

### Demo Credentials
After running the seed script, you can login with:
- **Email**: demo@medio.app
- **Password**: demo123

Test NFC chips available:
- CHIP001 - Blue Dinosaur Card
- CHIP002 - Pink Unicorn Card  
- CHIP003 - Green Robot Card

## Development

### Project Structure
```
medio/
├── src/                    # React frontend source
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   └── App.tsx            # Main app component
├── backend/               # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── db/           # Database configuration
│   └── package.json
├── docker-compose.full.yml # Full stack Docker config
└── Makefile.medio         # Development commands
```

### Available Commands

```bash
# Development
make dev          # Start full development stack
make frontend-dev # Start only frontend
make backend-dev  # Start only backend
make postgres-only # Start only PostgreSQL

# Database
make db-migrate   # Run database migrations
make db-seed      # Seed database with demo data

# Testing
make test         # Run all tests

# Cleanup
make clean        # Remove all dependencies and containers
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new parent account
- `POST /api/auth/login` - Login parent account

#### Videos
- `GET /api/videos` - Get all videos (authenticated)
- `POST /api/videos` - Add new video (authenticated)
- `PUT /api/videos/:id` - Update video (authenticated)
- `DELETE /api/videos/:id` - Delete video (authenticated)

#### Profiles
- `GET /api/profiles` - Get child profiles (authenticated)
- `POST /api/profiles` - Create child profile (authenticated)
- `PUT /api/profiles/:id` - Update profile (authenticated)
- `DELETE /api/profiles/:id` - Delete profile (authenticated)

#### NFC Management
- `GET /api/nfc/chips` - Get registered chips (authenticated)
- `POST /api/nfc/chips` - Register new chip (authenticated)
- `POST /api/nfc/map` - Link video to chip (authenticated)
- `POST /api/nfc/scan` - Scan chip (public, for kids mode)

#### Sessions
- `POST /api/sessions/start` - Start watch session
- `POST /api/sessions/end` - End watch session
- `POST /api/sessions/heartbeat` - Check session status

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Frontend
REACT_APP_API_URL=http://localhost:5000/api

# Backend
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medio
DB_USER=medio
DB_PASSWORD=medio_password
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
```

### Database Schema
The PostgreSQL database includes tables for:
- Users (parents)
- Profiles (children)
- Videos
- Platforms (YouTube, Netflix, etc.)
- NFC Chips
- Video-NFC Mappings
- Watch Sessions
- Daily Watch Time Tracking

## Features Roadmap

### Current Features
- ✅ Parent authentication
- ✅ Video management
- ✅ Child profiles
- ✅ NFC chip registration
- ✅ Video-chip linking
- ✅ Time limits
- ✅ Kids mode interface
- ✅ NFC simulation for testing
- ✅ Session tracking

### Future Enhancements
- [ ] Real NFC support (requires HTTPS and compatible devices)
- [ ] YouTube API integration for better video search
- [ ] Netflix/Prime Video integration
- [ ] Weekly/monthly watch reports
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Voice commands for kids
- [ ] Parental PIN for exiting kids mode
- [ ] Content recommendations based on age
- [ ] Offline video support

## Security Considerations

- JWT tokens for authentication
- Bcrypt password hashing
- Input validation on all endpoints
- Rate limiting on API endpoints
- CORS configuration for frontend access
- SQL injection prevention with parameterized queries
- XSS protection with React's built-in escaping

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the GitHub repository.