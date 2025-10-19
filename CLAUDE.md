# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript application created with Create React App. It's a standard single-page application setup with minimal customization from the default template.

## Development Commands

- `npm start` - Start development server on http://localhost:3000 with hot reload
- `npm test` - Run tests in interactive watch mode using Jest and React Testing Library
- `npm run build` - Create production build in the `build` folder
- `npm run eject` - Eject from Create React App (one-way operation)

## Architecture

- **Framework**: React 19.1.1 with TypeScript 4.9.5
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Testing**: Jest with React Testing Library (@testing-library/react)
- **Type Checking**: TypeScript with strict mode enabled
- **Linting**: ESLint with react-app configuration

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
