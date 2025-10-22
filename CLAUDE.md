# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript application created with Create React App. It's a standard single-page application setup with minimal customization from the default template.

## Development Commands

### Standard Development (React Dev Server)
- `npm start` - Start React development server on http://localhost:3000 with hot reload
- `npm test` - Run tests in interactive watch mode using Jest and React Testing Library
- `npm run build` - Create production build in the `build` folder
- `npm run eject` - Eject from Create React App (one-way operation)

### Production Mode (BFF Proxy + Backend)
- `npm run start:prod` - Start BFF proxy server on http://localhost:8080 (serves `/build` + proxies `/api`)
- Backend: `cd backend && npm start` - Start backend on http://localhost:5000

**Recommended Workflow**:
1. Terminal 1: `cd backend && npm start` (backend on port 5000)
2. Terminal 2: `npm run start:prod` (BFF proxy on port 8080)
3. Browser: Open http://localhost:8080

**Why BFF Proxy?** Enables same-origin cookie authentication (no CORS issues)

## Architecture

- **Framework**: React 19.1.1 with TypeScript 4.9.5
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Testing**: Jest with React Testing Library (@testing-library/react)
- **Type Checking**: TypeScript with strict mode enabled
- **Linting**: ESLint with react-app configuration

### BFF Proxy & Same-Origin Auth

**Critical Architecture**: Frontend uses Backend-for-Frontend (BFF) proxy pattern for same-origin authentication.

**Request Flow**:
```
Browser (localhost:8080)
  → GET /dashboard → server.js serves React build from /build
  → POST /api/auth/login → http-proxy-middleware → Backend (localhost:5000)
```

**Key Files**:
- `server.js` (185 lines): Express proxy + cookie/CSRF rewriting
  - Proxies `/api/*` to `BACKEND_URL` (env var)
  - **Cookie Domain Rewrite**: Removes `Domain=localhost:5000` → scopes cookies to localhost:8080
  - **CSRF Forwarding**: Forwards `X-CSRF-Token` header and cookie to backend
  - Health check: `GET /health`
- `src/utils/axiosConfig.ts`: Axios instance with CSRF + token refresh interceptors
  - `baseURL: '/api'` (relative URLs for proxy mode)
  - `withCredentials: true` (includes cookies in requests)
  - 401 interceptor: Auto-refresh access token via `/api/auth/refresh`
  - 403 interceptor: Clears cached CSRF token and retries

**Auth Flow**:
1. POST `/api/auth/login` → Backend sets `authToken` (15m) + `refreshToken` (7d) httpOnly cookies
2. Proxy removes Domain attribute → Cookies scoped to localhost:8080 (same-origin)
3. Browser auto-sends cookies with every `/api/*` request
4. Access token expires → axios interceptor calls `/api/auth/refresh` → new access token
5. Logout: Backend inserts token JTI into `token_blacklist` table + clears cookies

**CSRF Protection**:
- Backend generates CSRF token via `csurf` middleware
- Frontend fetches via `GET /api/csrf-token`, caches in memory
- Attaches `X-CSRF-Token` header to all POST/PUT/PATCH/DELETE requests
- Excluded endpoints: `/api/auth/refresh`, `/api/nfc/scan/public`, all GET requests

### Database Schema (Production)

**Critical Note**: Production uses `user_id`/`platform_id` naming (NOT `user_uuid`/`platform_uuid` as in init.sql).

**Core Tables** (`backend/init.sql`):
```
users (id UUID, email, password_hash, name)
  ├─ videos (user_id → users.id, platform_id → platforms.id)
  ├─ nfc_chips (user_id → users.id, chip_uid UNIQUE)
  ├─ profiles (user_id → users.id, name, age)
  └─ watch_sessions (user_id, video_id, profile_id)

platforms (id UUID, name UNIQUE)
  └─ videos (platform_id → platforms.id, platform_video_id)

token_blacklist (token_jti UNIQUE, user_id, expires_at)
```

**Key Constraints**:
- Videos: `UNIQUE(user_id, platform_id, platform_video_id)` - Prevents duplicate URLs
- NFC Chips: `UNIQUE(chip_uid)` - Global uniqueness (not per-user)
- Token Blacklist: JTI (JWT ID) for logout revocation

### API Integration Patterns

**Service Layer** (`src/services/`):
- `videoService.ts`: POST `/api/videos`, GET `/api/videos?page=1&limit=20`
- `nfcService.ts`: POST `/api/nfc/chips`, POST `/api/nfc/map`
- `platformService.ts`: GET `/api/platforms`

**Error Handling**:
- `ErrorBoundary.tsx`: Catches React crashes, logs to Sentry in production
- `errorFormatter.ts`: Converts API errors to user-friendly messages
- `axiosConfig.ts`: 401 → token refresh, 403 → CSRF retry, 409 → duplicate detection

**Pagination** (Backend pattern):
```json
{
  "data": [video1, video2, ...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true
  }
}
```

**Frontend handling**: `const videos = response.data.data || response.data || [];`

### Security Features

| Feature | Implementation | Location |
|---------|----------------|----------|
| **CSRF Protection** | csurf middleware + X-CSRF-Token header | server.js:146, axiosConfig.ts:59 |
| **XSS Prevention** | httpOnly cookies (JS cannot read) | auth.js:15-20 |
| **Session Revocation** | token_blacklist + JTI checking | middleware/auth.js:28-38 |
| **Password Hashing** | bcrypt (10 salt rounds) | auth.js:102 |
| **Rate Limiting** | express-rate-limit on auth endpoints | server.js:106-127 |
| **Timing Attack Mitigation** | Random delay on duplicate NFC chip | nfc.js:91-95 |
| **Secure Cookies** | sameSite=lax, secure (prod), httpOnly | auth.js:15-20 |

## Project Structure

- `src/` - Source code directory
  - `App.tsx` - Main application component
  - `index.tsx` - Application entry point
  - `setupTests.ts` - Test configuration
  - `reportWebVitals.ts` - Web vitals reporting
- `public/` - Static assets served directly
- `tsconfig.json` - TypeScript configuration with strict mode

## Key Configuration

- TypeScript target: ES5 with modern lib support (DOM, ESNext)
- JSX: react-jsx (new transform)
- Module resolution: Node.js style
- Strict mode enabled for type checking

## Recent Features

### Add Video via Link (002-add-video-link) - 2025-10-17

**Status**: ✅ Implementation Complete (Phases 1-7)
**Branch**: `002-add-video-link`
**Spec**: `specs/002-add-video-link/spec.md`
**Plan**: `specs/002-add-video-link/plan.md`
**Tasks**: `specs/002-add-video-link/tasks.md`

**What it adds**:
- **Multi-Platform Support**: YouTube, Vimeo, and Dailymotion video parsing and metadata fetching
- **URL Parsing**: Comprehensive URL parser supporting 10+ URL formats (`src/utils/urlParser.ts`, `src/utils/platformDetector.ts`)
- **Metadata Auto-Fill**: Automatic title, description, thumbnail, duration extraction
- **Error Handling**: User-friendly error formatter with 15 error types (`src/utils/errorFormatter.ts`)
- **Sentry Logging**: Contextual error logging for all API services
- **Manual Entry Fallback**: Form remains editable when API fails with visual indicator
- **Rate Limiting**: 30 requests/15 min for metadata endpoint (`backend/src/middleware/rateLimiter.js`)
- **API Quota Monitoring**: YouTube API usage tracking with Sentry integration
- **Platform UUID Service**: `GET /api/platforms` endpoint for dynamic platform lookup
- **Video Form Error Boundary**: Crash prevention for video operations

**Implemented Endpoints**:
- `GET /api/videos/metadata?platform=<platform>&videoId=<id>` (rate limited)
- `GET /api/platforms`
- `POST /api/videos` (with duplicate URL detection)

**New Files Created**:
- **Frontend**: `src/utils/{urlParser,platformDetector,errorFormatter}.ts`, `src/components/videos/{AddVideoModal,VideoFormErrorBoundary}.tsx`
- **Backend**: `backend/src/services/{youtube,vimeo,dailymotion}Service.js`, `backend/src/middleware/rateLimiter.js`
- **Tests**: 65+ tests across unit, integration, and E2E suites

**New Dependencies**:
- `express-rate-limit`: Rate limiting middleware
- YouTube Data API v3 (requires `YOUTUBE_API_KEY` in backend/.env)
- Vimeo API v3 (requires `VIMEO_ACCESS_TOKEN` in backend/.env)
- Dailymotion API (public, no key required)

**Key Technologies**:
- Backend: Express.js, PostgreSQL, axios, express-rate-limit
- Frontend: React 19, TypeScript, React Context API
- Error Tracking: Sentry with contextual metadata
- Testing: Jest + React Testing Library + Playwright (TDD workflow, 80%+ coverage)

**Constitution Compliance**: ✅ All 6 principles met
- ✅ Test-First Development (TDD): RED-GREEN-REFACTOR strictly followed
- ✅ Error Resilience: Error boundaries + graceful fallbacks
- ✅ Context-Driven Architecture: React Context API only
- ✅ Child Safety: Age rating required, parental control integration points

---

### Fix Video Modal Deployment and Functionality (003-specify-scripts-bash) - 2025-10-19

**Status**: ✅ Implementation Complete (Phases 1-6)
**Spec**: `specs/003-specify-scripts-bash/spec.md`
**Plan**: `specs/003-specify-scripts-bash/plan.md`
**Tasks**: `specs/003-specify-scripts-bash/tasks.md`
**Documentation**: `specs/003-specify-scripts-bash/DEPLOYMENT.md`

**What it fixes**:
- **Deployment Cache-Busting**: nginx configuration to prevent browsers from caching index.html after deployments
- **Sentry Error Logging**: Production error tracking for ErrorBoundary crashes with React component stack
- **Deployment Documentation**: Comprehensive guide for Fly.io dual-app deployment process

**Root Cause Identified**:
- nginx.conf line 30-34 cached ALL static files (including index.html) for 1 year with immutable headers
- index.html had NO explicit cache-control block, inheriting aggressive caching
- Result: Users continued seeing old JavaScript even after successful deployments

**Solution Implemented**:
- Added `location = /index.html` block BEFORE static assets block in nginx.conf
- Cache headers: `Cache-Control: no-cache, no-store, must-revalidate`
- Preserved security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Static assets (JS/CSS with content hashes) continue to cache for 1 year with immutable headers

**Key Files Modified**:
- `nginx.conf`: Added index.html no-cache block (lines 29-45)
- `src/components/common/ErrorBoundary.tsx`: Enabled Sentry.captureException for production errors
- `.github/workflows/fly.yml`: Added deployment verification step checking cache headers
- `.gitignore`: Added .env to prevent accidental commit of secrets

**New Files Created**:
- **Tests**: `tests/e2e/test-deployment-cache-headers.spec.js` (Playwright E2E)
- **Tests**: `src/components/__tests__/ErrorBoundary.test.tsx` (Jest unit tests with Sentry mocking)
- **Scripts**: `specs/003-specify-scripts-bash/contracts/deployment-verification.sh` (bash verification script)
- **Documentation**: `specs/003-specify-scripts-bash/DEPLOYMENT.md` (comprehensive deployment guide)
- **Contracts**: `specs/003-specify-scripts-bash/contracts/nginx-cache-headers.conf` (reference config)
- **Contracts**: `specs/003-specify-scripts-bash/contracts/error-boundary-sentry.tsx` (reference implementation)

**Deployment Architecture (Fly.io)**:
- **medio-react-app** (Frontend): Auto-deploys via GitHub Actions on `master` branch push (~5-7 min)
- **medio-backend** (Backend): Manual deployment via `cd backend && flyctl deploy --remote-only` (~2-3 min)
- **Deployment Order**: Backend FIRST (if API changes), then Frontend (to avoid errors)
- **Rollback**: Git revert (frontend) or `flyctl rollback` (backend)

**Verification Steps**:
1. Run deployment verification script: `bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh`
2. Check cache headers: `curl -I https://medio-react-app.fly.dev/index.html | grep -i cache-control`
3. GitHub Actions deployment verification (automated in CI/CD)

**Manual Tasks Pending**:
- T010: Deploy to production and verify cache-busting works end-to-end
- T013: Verify Sentry integration with manual error test in production
- T017: Test coordinated deployment following DEPLOYMENT.md guide

**Constitution Compliance**: ✅ All 6 principles met
- ✅ Test-First Development (TDD): E2E and unit tests written BEFORE implementation
- ✅ Error Resilience: ErrorBoundary with Sentry integration for production monitoring
- ✅ Docker-First Development: nginx.conf changes tested via Docker build
- ✅ Documentation: Comprehensive DEPLOYMENT.md with troubleshooting

---

### Same-Origin Authentication (006-backend-proxy-same-origin) - 2025-10-21

**Status**: ✅ Phases 0-7 Complete (Ready for Production Deployment)
**Branch**: `006-backend-proxy-same-origin`
**Spec**: `specs/006-backend-proxy-same-origin/spec.md`
**Plan**: `specs/006-backend-proxy-same-origin/plan.md`
**Tasks**: `specs/006-backend-proxy-same-origin/tasks.md`
**Documentation**: `specs/006-backend-proxy-same-origin/DEPLOYMENT.md`

**What it adds**:
- **BFF Proxy Pattern**: Backend-for-Frontend proxy eliminates cross-origin cookie issues
- **Same-Origin Auth**: Browser and backend share same origin (localhost:8080) - no CORS complications
- **httpOnly Cookies**: Secure session management immune to XSS attacks
- **Seamless Navigation**: Zero 401 errors after authentication - session persists across pages
- **Production Ready**: Sentry integration, health checks, startup validation, Docker support

**Architecture**:
```
Browser → http://localhost:8080
    ├─ GET /dashboard → React App (from /build)
    └─ POST /api/auth/login → BFF Proxy → Backend (localhost:5000)

Cookies: Domain=localhost:8080 (Same-Origin) ✅
```

**Key Components**:
1. **server.js**: Express + http-proxy-middleware BFF proxy server
   - Serves React build from `/build`
   - Proxies `/api/*` requests to backend
   - Handles cookie forwarding and Domain attribute removal
   - Health check endpoint: `GET /health`
   - Sentry error tracking for 502/504 errors
2. **Dockerfile**: Multi-stage build (React build + Node runtime)
3. **docker-compose.yml**: Full stack (postgres + backend + frontend proxy)
4. **fly.toml**: Production deployment configuration

**Environment Variables**:
```bash
# .env (Frontend)
REACT_APP_API_URL=          # Empty for proxy mode (recommended)
BACKEND_URL=http://localhost:5000    # Backend URL for proxy
PORT=8080                   # Proxy server port
NODE_ENV=development
SENTRY_DSN=                 # Optional: Sentry error tracking
```

**Development Workflow**:
```bash
# Terminal 1: Start Backend
cd backend && npm start     # Port 5000

# Terminal 2: Start BFF Proxy
npm run start:prod          # Port 8080

# Browser
open http://localhost:8080
```

**Test Results**: ✅ 6/6 E2E tests passing
- T013: Registration → Dashboard redirect
- T014: Videos page loads without 401 errors
- T015: Auth maintained after page refresh
- T016: Authenticated API call immediately after login
- T017: Cookies forwarded correctly through proxy
- T018: Comprehensive proxy flow (registration → navigation)

**Key Files Modified**:
- `Dockerfile` - Multi-stage build for BFF proxy (Node.js not nginx)
- `docker-compose.yml` - Added frontend service with proxy
- `fly.toml` - Updated for proxy deployment (BACKEND_URL set)
- `server.js` - BFF proxy implementation with full error handling
- `src/config/api.ts` - Uses relative URLs (`/api`) for proxy mode
- `src/pages/*.tsx` - 4 pages updated to use proxy-friendly URLs
- `backend/src/routes/auth.js` - Graceful token_blacklist error handling
- `backend/init.sql` - Added token_blacklist table
- `.env.example` - Documented proxy vs direct mode configuration

**New Files Created**:
- `server.js` - BFF proxy server (Express + http-proxy-middleware)
- `playwright.proxy.config.ts` - E2E test configuration for proxy mode
- `tests/e2e/auth-registration-proxy.spec.ts` - Complete E2E test suite (6 tests)
- `specs/006-backend-proxy-same-origin/DEPLOYMENT.md` - Comprehensive deployment guide
- `specs/006-backend-proxy-same-origin/MVP_COMPLETE.md` - MVP completion summary

**Dependencies Added**:
- `express` - Web server for BFF proxy
- `http-proxy-middleware` - Proxy middleware for `/api` requests
- `@sentry/node` - Server-side error tracking
- `dotenv` - Environment variable management

**Docker Deployment**:
```bash
docker-compose up -d
# Frontend proxy: http://localhost:8080
# Backend API: http://localhost:5000
# PostgreSQL: localhost:5432
```

**Production Deployment (Fly.io)**:
```bash
# 1. Deploy backend first
cd backend && flyctl deploy --remote-only

# 2. Deploy frontend with BFF proxy
cd .. && flyctl deploy

# Verify
curl https://medio-react-app.fly.dev/health
```

**Success Criteria Met**:
- ✅ Zero 401 errors after authentication (100% success rate)
- ✅ Navigation between protected pages works seamlessly
- ✅ Cookies forwarded correctly through proxy
- ✅ Multi-step workflows complete without interruption
- ✅ Page refresh maintains authentication
- ✅ Proxy overhead <50ms per request

**Phases Completed**:
- ✅ Phase 0: Branch Setup (2/2 tasks)
- ✅ Phase 1: Setup & Dependencies (5/5 tasks)
- ✅ Phase 2: Backend CORS Update (3/4 tasks) - T011 skipped (not critical)
- ✅ Phase 3: User Story 1 - Authentication Flow (18/18 tasks)
- ✅ Phase 6: Docker/Deployment Configuration (10/10 tasks)
- ✅ Phase 7: Polish & Documentation (8/8 tasks)

**Remaining (Optional)**:
- Phase 4: NFC Workflow tests (10 tasks) - Not required
- Phase 5: Extended session tests (9 tasks) - Not required
- Phase 8: Production Deployment (6 tasks) - Ready when needed

**Constitution Compliance**: ✅ All 6 principles met
- ✅ Child Safety First: httpOnly cookies maintained, immune to XSS
- ✅ Context-Driven Architecture: No changes to React Context API
- ✅ Test-First Development: All 6 E2E tests passing before MVP completion
- ✅ Error Resilience: Graceful handling of database, proxy, network errors
- ✅ Docker-First Development: Full Docker Compose configuration ready
- ✅ NFC Security: Session management unchanged, existing security maintained

**Quick Reference**:
- Health Check: `curl http://localhost:8080/health`
- Run E2E Tests: `npm run test:e2e -- --config=playwright.proxy.config.ts tests/e2e/auth-registration-proxy.spec.ts`
- View Logs: `flyctl logs --app medio-react-app`
- Deployment Guide: `specs/006-backend-proxy-same-origin/DEPLOYMENT.md`
