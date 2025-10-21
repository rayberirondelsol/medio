# Implementation Plan: Same-Origin Authentication

**Branch**: `006-backend-proxy-same-origin` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-backend-proxy-same-origin/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Express BFF (Backend-for-Frontend) proxy pattern to enable same-origin cookie authentication between React frontend and Express backend. Frontend will serve both static assets and proxy API requests to backend, eliminating cross-origin cookie issues.

## Technical Context

**Language/Version**: Node.js 18 (LTS), TypeScript 4.9.5
**Primary Dependencies**: Express 4.18, http-proxy-middleware 2.0, React 19
**Storage**: N/A (proxy layer only, uses existing backend PostgreSQL)
**Testing**: Jest + React Testing Library (unit), Playwright (E2E)
**Target Platform**: Linux containers (Fly.io), Docker development
**Project Type**: web (frontend adds server.js, backend unchanged)
**Performance Goals**: <50ms proxy overhead per request, 100 concurrent users
**Constraints**: httpOnly cookies only, no domain purchase, Docker-First
**Scale/Scope**: Single proxy server, ~100 LOC server.js, 5 E2E tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- [x] **Child Safety First**: PASS - No data collection from children. Enhances security by maintaining httpOnly cookies (immune to XSS). Same-origin more secure than cross-origin.
- [x] **Context-Driven Architecture**: PASS - No changes to React Context API. AuthContext continues to work as-is.
- [x] **Test-First Development**: PASS - E2E tests for registration/login/NFC workflows required before implementation. TDD enforced.
- [x] **Error Resilience**: PASS - Graceful error handling for proxy failures (502 Bad Gateway). Clear user-facing error messages. No Error Boundaries needed (proxy layer transparent).
- [x] **Docker-First Development**: PASS - Same server.js runs in Docker for dev/prod. Makefile commands maintained.
- [x] **NFC Security & Session Management**: PASS - No changes to NFC/session logic. Feature enables existing authenticated endpoints to work correctly.

**Technology Constraints Check**:
- [x] React 19 + TypeScript 4.9 + CRA (no ejecting) - PASS
- [x] Auth via httpOnly cookies only (no localStorage for tokens) - PASS (maintains existing approach)
- [x] Testing with Jest + React Testing Library + Playwright - PASS
- [x] Sentry configured for error tracking - PASS (existing Sentry integration)

**Violations**: None

## Project Structure

### Documentation (this feature)

```
specs/006-backend-proxy-same-origin/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (COMPLETE)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── proxy-errors.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── routes/auth.js        # UPDATE: Change cookie SameSite to 'lax'
│   └── server.js             # UPDATE: Add medio-react-app.fly.dev to ALLOWED_ORIGINS
└── tests/
    └── integration/
        └── auth.test.js      # UPDATE: Add same-origin cookie test

/ (frontend root)
├── server.js                 # NEW: Express BFF proxy server
├── package.json              # UPDATE: Add express, http-proxy-middleware
├── Dockerfile                # UPDATE: Multi-stage build for Node runtime
├── docker-compose.yml        # UPDATE: Add BACKEND_URL env var
├── src/
│   ├── components/           # NO CHANGES (transparent to frontend)
│   └── contexts/             # NO CHANGES (AuthContext works as-is)
└── tests/
    └── e2e/
        └── auth-flow.spec.ts # NEW: E2E tests for registration/login/navigation
```

**Structure Decision**: Web application with frontend BFF proxy. Frontend adds production server (`server.js`) that serves React build + proxies `/api/*` to backend. Backend requires minimal CORS/cookie updates. No new projects added (complies with Docker-First principle).

