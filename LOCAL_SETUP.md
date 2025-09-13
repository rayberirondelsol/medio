# Local Development Setup

This guide explains how to set up and run the Medio application locally using Docker.

## Prerequisites

- Docker Desktop (includes Docker Engine and Docker Compose)
  - [Download for Mac](https://www.docker.com/products/docker-desktop/)
  - [Download for Windows](https://www.docker.com/products/docker-desktop/)
  - [Download for Linux](https://docs.docker.com/engine/install/)
- Make (optional, for easier command execution)
- Git

## Quick Start

### Using Make (Recommended)

If you have `make` installed, you can use these simple commands:

```bash
# Start development server with hot reloading
make dev

# Run tests
make test

# Build and run production version
make prod

# Show all available commands
make help
```

### Using Docker Compose Directly

If you don't have `make`, use Docker Compose commands:

```bash
# Start development server
docker-compose up dev

# Run tests
docker-compose --profile test up test

# Run production build
docker-compose --profile production up prod
```

## Development Workflow

### 1. Start Development Server

```bash
make dev
# or
docker-compose up dev
```

This will:
- Build the development Docker image
- Install all dependencies
- Start the React development server on http://localhost:3000
- Enable hot reloading for code changes

### 2. Run Tests

```bash
make test
# or
docker-compose --profile test up test
```

This runs the test suite in a Docker container with CI mode enabled.

### 3. Build for Production

```bash
make build
# or
docker-compose build prod
```

This creates an optimized production build using multi-stage Docker build.

### 4. Run Production Build Locally

```bash
make prod
# or
docker-compose --profile production up prod
```

This serves the production build using Nginx on http://localhost:8080

## Project Structure

```
medio/
├── src/                  # React source code
├── public/              # Static assets
├── Dockerfile           # Production Docker configuration
├── Dockerfile.dev       # Development Docker configuration
├── docker-compose.yml   # Docker Compose orchestration
├── nginx.conf          # Nginx configuration for production
├── Makefile            # Convenience commands
└── package.json        # Node.js dependencies and scripts
```

## Available Commands

### Make Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development server with hot reloading |
| `make test` | Run tests in Docker container |
| `make prod` | Run production build locally |
| `make build` | Build production Docker image |
| `make clean` | Clean up Docker containers and volumes |
| `make logs` | Show logs from running containers |
| `make shell` | Open shell in development container |
| `make install` | Install dependencies locally (without Docker) |
| `make start-local` | Start dev server locally (without Docker) |
| `make build-local` | Build production bundle locally |
| `make test-local` | Run tests locally (without Docker) |

### NPM Scripts (for local development without Docker)

```bash
npm install      # Install dependencies
npm start        # Start development server
npm test         # Run tests
npm run build    # Create production build
```

## Environment Variables

Create a `.env` file in the project root for environment-specific configuration:

```env
# Example .env file
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

## Troubleshooting

### Port Already in Use

If port 3000 or 8080 is already in use:

1. Stop the conflicting service, or
2. Change the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000"  # Change 3001 to your preferred port
   ```

### Docker Build Issues

If you encounter build issues:

```bash
# Clean Docker cache and rebuild
make clean
docker-compose build --no-cache dev
```

### File Watching Issues on Windows

If hot reloading doesn't work on Windows, ensure:
- Docker Desktop is using WSL 2 backend
- Your project is in the WSL 2 filesystem

### Permission Issues on Linux

If you encounter permission issues:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

## Testing

### Unit Tests

```bash
# Run tests in Docker
make test

# Run tests locally
npm test
```

### Interactive Testing

To run tests in watch mode locally:

```bash
npm test -- --watchAll
```

## Building for Deployment

### Docker Image

Build the production Docker image:

```bash
docker build -t medio:latest .
```

### Static Files

Build static files for deployment:

```bash
npm run build
```

The optimized production build will be in the `build/` directory.

## Additional Resources

- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Create React App Documentation](https://create-react-app.dev/)

## Support

For issues or questions, please open an issue in the GitHub repository.