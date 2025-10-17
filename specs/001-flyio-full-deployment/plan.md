# Implementation Plan: Make Medio Fully Functional on Fly.io

**Branch**: `001-flyio-full-deployment` | **Date**: 2025-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-flyio-full-deployment/spec.md`

**Note**: This plan is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This plan addresses deployment operations to restore full functionality of the Medio platform on Fly.io. The backend service (medio-backend) has been stopped since September 17, 2025, preventing all user-facing functionality. The technical approach involves:

1. Starting stopped backend machines
2. Validating environment configuration and database connectivity
3. Running database migrations to ensure schema is current
4. Verifying frontend-backend integration
5. Confirming health checks pass for both services
6. Testing end-to-end user flows (authentication, dashboard, Kids Mode)

This is a deployment/operations task with no new feature development. The focus is on operational excellence: ensuring services start correctly, fail gracefully, and provide clear diagnostic information when issues occur.

## Technical Context

**Language/Version**:
- **Frontend**: React 19.1.1 with TypeScript 4.9.5
- **Backend**: Node.js (version determined by Dockerfile)

**Primary Dependencies**:
- **Frontend**: Create React App 5.0.1, React Router DOM 6.20.1, Axios 1.6.2, Sentry React 10.11.0, Framer Motion 11.18.0
- **Backend**: Express 4.18.2, PostgreSQL (pg 8.11.3), JWT (jsonwebtoken 9.0.2), bcryptjs 2.4.3, Sentry Node 10.11.0

**Storage**:
- PostgreSQL database (medio-backend-db) on Fly.io
- Tables: users, profiles, videos, nfc_chips, watch_sessions

**Testing**:
- **Frontend**: Jest + React Testing Library + Playwright (E2E)
- **Backend**: Jest + Supertest

**Target Platform**:
- Fly.io (iad region)
- **Frontend**: Nginx serving static React build (port 8080)
- **Backend**: Express API server (port 5000)
- **Database**: Fly.io Postgres

**Project Type**: Web application (separate frontend and backend)

**Performance Goals**:
- Page load: <3 seconds
- Health check response: <1 second
- API response time: <500ms (p95)
- Database query time: <500ms

**Constraints**:
- Backend machines currently STOPPED (since Sept 17)
- Frontend already deployed and running
- Database exists and is accessible
- Environment variables must be configured via `fly secrets set`
- Constitution mandates Docker-First Development (Principle V)
- Constitution mandates Error Resilience (Principle IV)
- Must maintain environment parity (dev/staging/prod)

**Scale/Scope**:
- 2 backend machines
- 2 frontend machines (already running)
- 1 PostgreSQL database
- Initial deployment (limited production traffic expected)
- 5 database tables (users, profiles, videos, nfc_chips, watch_sessions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- [x] **Child Safety First**: This is a deployment task with NO new data collection or feature changes. Existing child safety mechanisms (NFC validation, session management) are preserved as-is. No constitution violations.

- [x] **Context-Driven Architecture**: This is a deployment task with NO frontend state management changes. Existing React Context architecture is preserved. No constitution violations.

- [x] **Test-First Development**: This is a deployment/operations task, NOT feature development. However, deployment verification MUST include running existing test suites: `npm run validate` (frontend) and `npm test` (backend). Tests serve as deployment validation gates.

- [x] **Error Resilience**: This plan ENHANCES error resilience by implementing:
  - Health check validation before serving traffic
  - Environment variable validation at startup
  - Database connection validation with health check integration
  - Frontend error boundaries (validation only, no changes)
  - Aligned with clarifications: backend marks unhealthy on failures

- [x] **Docker-First Development**: This plan uses Docker for deployment (Fly.io uses Docker images). Backend Dockerfile exists. Frontend Dockerfile exists. Deployment uses same images as dev environment per FR-025. Constitution compliant.

- [x] **NFC Security & Session Management**: This is a deployment task with NO changes to NFC or session logic. Existing server-side validation and heartbeat mechanisms are preserved. No constitution violations.

**Technology Constraints Check**:
- [x] React 19 + TypeScript 4.9 + CRA (no ejecting) - VERIFIED: package.json confirms versions, no ejection planned
- [x] Auth via httpOnly cookies only (no localStorage for tokens) - VERIFIED: No auth changes in this deployment task
- [x] Testing with Jest + React Testing Library + Playwright - VERIFIED: Test frameworks in place, used for validation
- [x] Sentry configured for error tracking - VERIFIED: @sentry/react and @sentry/node dependencies present

**Violations**: NONE - This is a deployment task that preserves existing architecture and enhances operational resilience.

## Project Structure

### Documentation (this feature)

```
specs/001-flyio-full-deployment/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── checklists/
│   └── requirements.md  # Spec quality validation (PASSED)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT yet created)
```

### Source Code (repository root)

```
medio/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express app entry point
│   │   ├── db/
│   │   │   ├── migrate.js      # Database migration script
│   │   │   ├── pool.js         # PostgreSQL connection pool
│   │   │   └── seed.js         # Initial data seeding
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authentication
│   │   │   └── error-handler.js # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js         # Registration/login endpoints
│   │   │   ├── profiles.js     # Profile management
│   │   │   ├── videos.js       # Video CRUD operations
│   │   │   ├── nfc.js          # NFC chip scanning
│   │   │   └── sessions.js     # Watch session tracking
│   │   └── utils/
│   │       ├── sentry.js       # Sentry error tracking
│   │       └── logger.js       # Winston logging
│   ├── Dockerfile              # Backend container definition
│   ├── fly.toml                # Fly.io backend config
│   └── package.json            # Backend dependencies
├── src/                        # Frontend React application
│   ├── components/             # React components
│   ├── pages/                  # Route pages (Login, Dashboard, Kids Mode)
│   ├── services/               # API client (axios)
│   └── contexts/               # React Context providers (Auth, Theme, Loading)
├── Dockerfile                  # Frontend container definition (Nginx)
├── fly.toml                    # Fly.io frontend config
├── package.json                # Frontend dependencies
└── docker-compose.yml          # Local dev environment (Docker-First principle)
```

**Structure Decision**: Web application (Option 2 from template). The codebase has separate frontend (React SPA) and backend (Express API) with independent deployment configurations. Both services are deployed to Fly.io as separate applications with distinct fly.toml configs.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No violations detected. This deployment task preserves existing architecture and complies with all constitutional principles.

