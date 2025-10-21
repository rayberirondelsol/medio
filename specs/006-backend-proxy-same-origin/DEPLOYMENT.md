# Deployment Guide - Feature 006: Same-Origin Authentication

**Feature**: BFF Proxy for Same-Origin Cookie Authentication
**Branch**: `006-backend-proxy-same-origin`
**Date**: 2025-10-21
**Status**: Ready for Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment Order](#deployment-order)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment (Fly.io)](#production-deployment-flyio)
7. [Environment Variables](#environment-variables)
8. [Health Checks](#health-checks)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)
11. [Deployment Checklist](#deployment-checklist)

---

## Overview

This feature implements a **Backend-for-Frontend (BFF) Proxy** pattern to enable same-origin cookie-based authentication. The proxy eliminates cross-origin authentication issues by serving both the React frontend and proxying API requests through a single origin.

### Key Benefits

- ✅ **Same-Origin Cookies**: Browser and backend share the same origin (no cross-domain issues)
- ✅ **Simplified Auth**: httpOnly cookies work seamlessly without CORS complications
- ✅ **Security**: No tokens in localStorage, immune to XSS attacks
- ✅ **Production Ready**: Sentry integration, health checks, startup validation

---

## Architecture

```
Browser (localhost:8080)
    │
    ├─── GET /dashboard ──────────────> Frontend (React SPA)
    │                                    served from /build
    │
    └─── POST /api/auth/login ────────> BFF Proxy (Express)
                                             │
                                             └──> Backend API (localhost:5000)
                                                  /api/auth/login

Cookies: Domain=localhost:8080 (Same-Origin) ✅
```

### Components

1. **Frontend (React)**: Built with Create React App, uses relative URLs (`/api`)
2. **BFF Proxy (Express + http-proxy-middleware)**: Runs on port 8080
   - Serves static React build from `/build`
   - Proxies `/api/*` requests to backend
   - Handles cookie forwarding and rewriting
3. **Backend API (Node.js)**: Runs on port 5000, provides REST API

---

## Deployment Order

⚠️ **CRITICAL**: Always deploy in this order to avoid errors.

### 1. Backend First (if API changes)

```bash
cd backend
flyctl deploy --remote-only
```

**Why First**: If backend changes include new endpoints or breaking changes, frontend needs them available when it deploys.

**Verification**: `curl https://medio-backend.fly.dev/api/health`

### 2. Frontend Second (with BFF Proxy)

```bash
# From project root
flyctl deploy
```

**Why Second**: Frontend depends on backend endpoints. Deploy after backend is ready.

**Verification**: `curl https://medio-react-app.fly.dev/health`

### 3. Post-Deployment Verification

```bash
# Test authentication flow
curl -c cookies.txt https://medio-react-app.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Verify cookies were set
cat cookies.txt

# Test authenticated request
curl -b cookies.txt https://medio-react-app.fly.dev/api/auth/me
```

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

1. **Install Dependencies**

```bash
# Frontend dependencies (includes proxy deps)
npm install

# Backend dependencies
cd backend && npm install
```

2. **Configure Environment Variables**

```bash
# Copy example files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env
REACT_APP_API_URL=        # Leave empty for proxy mode
BACKEND_URL=http://localhost:5000
PORT=8080
NODE_ENV=development
```

3. **Start Services**

```bash
# Terminal 1: Start PostgreSQL (if not running)
# docker-compose up postgres

# Terminal 2: Start Backend
cd backend && npm start
# Backend runs on http://localhost:5000

# Terminal 3: Start Frontend Proxy
npm run start:prod
# Proxy runs on http://localhost:8080
```

4. **Verify Setup**

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check proxy health
curl http://localhost:8080/health

# Open browser
open http://localhost:8080
```

---

## Docker Deployment

### Build Images

```bash
# Build frontend with BFF proxy
docker build -t medio-frontend:latest .

# Build backend
cd backend && docker build -t medio-backend:latest .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Verify services
curl http://localhost:8080/health
curl http://localhost:5000/api/health

# Stop services
docker-compose down
```

### Docker Architecture

```yaml
services:
  postgres:5432    # Database
  backend:5000     # API Server
  frontend:8080    # BFF Proxy + React App
```

**Internal Network**: `backend:5000` accessible from frontend container via Docker network.

---

## Production Deployment (Fly.io)

### Prerequisites

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Verify apps exist
flyctl apps list | grep medio
```

### Deployment Steps

#### Step 1: Deploy Backend

```bash
cd backend

# Review configuration
cat fly.toml

# Deploy
flyctl deploy --remote-only

# Monitor deployment
flyctl logs

# Verify
curl https://medio-backend.fly.dev/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-21T..."
}
```

#### Step 2: Deploy Frontend (with BFF Proxy)

```bash
cd ..  # Back to project root

# Review configuration
cat fly.toml

# Verify environment variables
flyctl secrets list

# Build locally first (optional - Fly.io will build remotely)
npm run build

# Deploy
flyctl deploy

# Monitor deployment
flyctl logs

# Verify
curl https://medio-react-app.fly.dev/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "medio-frontend-proxy",
  "backend": "https://medio-backend.fly.dev",
  "environment": "production",
  "timestamp": "2025-10-21T...",
  "uptime": 123.456
}
```

#### Step 3: Test Production Flow

```bash
# Open in browser
open https://medio-react-app.fly.dev

# Test registration
# 1. Navigate to /register
# 2. Create new account
# 3. Verify redirect to /dashboard
# 4. Check browser DevTools:
#    - Network tab: No 401 errors
#    - Application > Cookies: authToken and refreshToken present
```

---

## Environment Variables

### Frontend (.env)

```bash
# Proxy Mode Configuration
NODE_ENV=production
BACKEND_URL=https://medio-backend.fly.dev
PORT=8080

# Optional: Sentry Error Tracking
SENTRY_DSN=https://your-project@sentry.io/123456

# Development Only
REACT_APP_API_URL=  # Leave empty for proxy mode
```

### Backend (backend/.env)

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/medio

# CORS - must include frontend proxy URL
CORS_ORIGINS=https://medio-react-app.fly.dev

# Auth Secrets (min 64 chars)
JWT_SECRET=your-secure-jwt-secret-min-64-chars
SESSION_SECRET=your-secure-session-secret-min-64-chars

# API Keys (optional)
YOUTUBE_API_KEY=your-youtube-key
VIMEO_ACCESS_TOKEN=your-vimeo-token
```

### Fly.io Secrets Management

```bash
# Set secrets for frontend
flyctl secrets set BACKEND_URL=https://medio-backend.fly.dev
flyctl secrets set SENTRY_DSN=https://...

# Set secrets for backend
cd backend
flyctl secrets set DATABASE_URL=postgresql://...
flyctl secrets set JWT_SECRET=...
flyctl secrets set SESSION_SECRET=...
```

---

## Health Checks

### Frontend Proxy Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "service": "medio-frontend-proxy",
  "backend": "https://medio-backend.fly.dev",
  "environment": "production",
  "timestamp": "2025-10-21T14:49:04.140Z",
  "uptime": 123.456
}
```

**Monitoring**: Fly.io automatically monitors this endpoint (configured in `fly.toml`).

### Backend Health Check

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-21T..."
}
```

---

## Troubleshooting

### Problem: 502 Bad Gateway

**Symptoms**: Proxy returns 502 when calling `/api/*` endpoints.

**Causes**:
1. Backend is down or unreachable
2. `BACKEND_URL` misconfigured
3. Network connectivity issues

**Solutions**:
```bash
# Check backend is running
curl https://medio-backend.fly.dev/api/health

# Check BACKEND_URL environment variable
flyctl ssh console
echo $BACKEND_URL

# Check proxy logs
flyctl logs --app medio-react-app
# Look for: [PROXY ERROR] ECONNREFUSED

# Verify fly.toml configuration
cat fly.toml | grep BACKEND_URL
```

### Problem: 401 Unauthorized After Login

**Symptoms**: User logs in successfully but gets 401 on next API request.

**Causes**:
1. Cookies not being set (check Set-Cookie headers)
2. Cookies being sent to wrong domain
3. SameSite cookie attribute blocking cookies

**Solutions**:
```bash
# Check Set-Cookie headers in browser DevTools
# Network tab > /api/auth/login > Response Headers

# Expected:
# Set-Cookie: authToken=...; Path=/; HttpOnly; SameSite=Lax
# Set-Cookie: refreshToken=...; Path=/; HttpOnly; SameSite=Lax

# Check cookies are stored
# Application tab > Cookies > https://medio-react-app.fly.dev

# Verify CORS configuration in backend
# CORS_ORIGINS must include frontend URL
```

### Problem: Frontend Shows Old Version

**Symptoms**: Deployment succeeded but users see old frontend code.

**Causes**:
1. Browser cache not cleared
2. CDN caching index.html
3. Service worker caching old version

**Solutions**:
```bash
# Check cache headers
curl -I https://medio-react-app.fly.dev/index.html | grep -i cache

# Expected:
# Cache-Control: no-cache, no-store, must-revalidate

# Force browser refresh
# Chrome/Firefox: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Clear service worker cache
# DevTools > Application > Service Workers > Unregister
```

### Problem: Proxy Crashes on Startup

**Symptoms**: `flyctl logs` shows proxy crashing immediately.

**Causes**:
1. `BACKEND_URL` not set in production
2. Missing dependencies (@sentry/node, express, http-proxy-middleware)
3. Build files missing in `/app/build`

**Solutions**:
```bash
# Check startup validation error
flyctl logs | grep "FATAL ERROR"

# Verify BACKEND_URL is set
flyctl secrets list

# Check build directory exists
flyctl ssh console
ls -la /app/build

# Verify dependencies installed
flyctl ssh console
npm list express http-proxy-middleware @sentry/node
```

---

## Rollback Procedures

### Rollback Frontend

```bash
# Option 1: Rollback via Fly.io
flyctl releases list
flyctl releases rollback <version-number>

# Option 2: Git revert + redeploy
git log --oneline
git revert <commit-hash>
git push origin master
# GitHub Actions will auto-deploy
```

### Rollback Backend

```bash
cd backend

# Option 1: Rollback via Fly.io
flyctl releases list
flyctl releases rollback <version-number>

# Option 2: Git revert + manual deploy
git log --oneline
git revert <commit-hash>
git push origin master
flyctl deploy --remote-only
```

### Emergency Rollback (Both Services)

```bash
# Rollback backend first
cd backend
flyctl releases rollback

# Then rollback frontend
cd ..
flyctl releases rollback

# Verify both services
curl https://medio-backend.fly.dev/api/health
curl https://medio-react-app.fly.dev/health
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All E2E tests passing locally
- [ ] No console errors in browser DevTools
- [ ] Backend health check returns 200 OK
- [ ] Frontend health check returns 200 OK
- [ ] Environment variables configured correctly
- [ ] CORS origins include production frontend URL
- [ ] Database migrations applied (if any)
- [ ] Sentry DSN configured (optional)
- [ ] Review CHANGELOG for breaking changes

### Deployment Process

- [ ] Deploy backend first (if API changes)
- [ ] Wait for backend deployment to complete (2-3 min)
- [ ] Verify backend health: `curl https://medio-backend.fly.dev/api/health`
- [ ] Deploy frontend with BFF proxy
- [ ] Wait for frontend deployment to complete (5-7 min)
- [ ] Verify frontend health: `curl https://medio-react-app.fly.dev/health`

### Post-Deployment Verification

- [ ] Open app in browser: `https://medio-react-app.fly.dev`
- [ ] Test registration flow:
  - [ ] Register new user
  - [ ] Verify redirect to dashboard
  - [ ] Check cookies set (Application > Cookies)
  - [ ] No 401 errors in Network tab
- [ ] Test login flow:
  - [ ] Login with existing user
  - [ ] Verify authentication works
  - [ ] Navigate between pages (Dashboard → Videos → Profiles)
  - [ ] No 401 errors during navigation
- [ ] Check Sentry for errors (first 10 minutes)
- [ ] Monitor Fly.io metrics for unusual activity
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)

### Post-Deployment Monitoring

- [ ] Monitor Sentry for 24 hours
- [ ] Check Fly.io logs for proxy errors
- [ ] Monitor backend logs for auth failures
- [ ] Review health check metrics
- [ ] User feedback collection (if applicable)

### Rollback Decision Criteria

Rollback if any of these occur:
- ❌ 5+ Sentry errors in first 10 minutes
- ❌ 401 authentication errors reported by users
- ❌ Health checks failing
- ❌ Proxy returning 502 Bad Gateway
- ❌ Critical functionality broken (login, registration)

---

## Performance Targets

- **Proxy Overhead**: <50ms per request
- **Health Check Response**: <100ms
- **Frontend Load Time**: <2s (first load)
- **Backend API Response**: <200ms (p95)
- **Cookie Authentication**: 100% success rate

---

## Support

- **Documentation**: `specs/006-backend-proxy-same-origin/`
- **E2E Tests**: `tests/e2e/auth-registration-proxy.spec.ts`
- **Logs**: `flyctl logs --app medio-react-app`
- **Monitoring**: Sentry Dashboard (if configured)

---

**Last Updated**: 2025-10-21
**Version**: 1.0.0
**Author**: Feature 006 Implementation Team
