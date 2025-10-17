# Research: Fly.io Deployment Best Practices

**Feature**: Make Medio Fully Functional on Fly.io
**Date**: 2025-10-17
**Status**: Completed

## Overview

This document consolidates research findings for deploying and operating the Medio platform on Fly.io. Since this is a deployment/operations task (not new feature development), research focuses on operational best practices, health check patterns, and deployment validation strategies.

## Research Areas

### 1. Fly.io Machine Startup and Health Checks

**Decision**: Use `flyctl machines start` to restart stopped backend machines, validate with `flyctl status` and health check monitoring.

**Rationale**:
- Backend machines are currently STOPPED (since Sept 17, 2025)
- Fly.io's `auto_start_machines = true` setting in fly.toml means machines start automatically when traffic arrives
- However, explicit manual start is safer for initial deployment validation
- Health checks (configured in fly.toml) determine when machines are added to load balancer
- Health check path: `GET /` on port 5000 (backend), `GET /` on port 8080 (frontend)

**Alternatives considered**:
- **Auto-start on first request**: Rejected because it doesn't allow pre-deployment validation. First user would experience cold start delay and potentially see errors if configuration is wrong.
- **Force redeploy with `fly deploy`**: Rejected as unnecessary. The code is already deployed; machines just need to be started and validated.

**Best practices**:
- Start machines manually: `flyctl machines start <machine-id> -a medio-backend`
- Monitor logs during startup: `flyctl logs -a medio-backend`
- Verify health checks pass: `flyctl status -a medio-backend`
- Check machine state transitions: stopped → starting → started → healthy

### 2. Environment Variable Management

**Decision**: Use `fly secrets set` for sensitive values (JWT_SECRET, SENTRY_DSN), verify with `fly secrets list`.

**Rationale**:
- FR-026 mandates: "All sensitive environment variables MUST be set via `fly secrets set` command"
- Secrets are encrypted at rest and injected as environment variables at runtime
- DATABASE_URL is automatically injected by Fly.io Postgres attachment
- NODE_ENV is set in fly.toml (public, non-sensitive)

**Alternatives considered**:
- **Plain environment variables in fly.toml**: Rejected. Secrets would be visible in git history and deployment logs.
- **.env files in Docker image**: Rejected. Violates Fly.io best practices and makes rotation difficult.

**Best practices**:
- Set secrets: `fly secrets set JWT_SECRET=<value> SENTRY_DSN=<value> -a medio-backend`
- Verify (shows names only): `fly secrets list -a medio-backend`
- Backend must validate required env vars at startup (FR-004a)
- Log descriptive error if any are missing

### 3. Database Migration Strategy

**Decision**: Run migrations as part of deployment verification using `fly ssh console` and `npm run migrate`.

**Rationale**:
- FR-006 requires successful migrations before serving traffic
- FR-006a clarifies: if migrations fail, backend marks unhealthy and fails health checks
- Migrations create/update tables: users, profiles, videos, nfc_chips, watch_sessions
- Running migrations via SSH console allows observation and manual intervention if needed

**Alternatives considered**:
- **Auto-migrate on app startup**: Rejected. If migration fails during startup, app may crash or serve traffic in broken state. Better to run migrations separately and validate before starting app.
- **Release command in fly.toml**: Fly.io supports `[deploy.release_command]` but we want explicit control for this initial deployment.

**Best practices**:
- SSH into backend machine: `fly ssh console -a medio-backend`
- Run migrations: `cd /app && npm run migrate`
- Verify tables exist: Query database or check logs
- If migrations fail: investigate logs, fix schema issues, retry
- Only after successful migrations: restart backend to serve traffic

### 4. Health Check Implementation

**Decision**: Backend `/` endpoint returns `{ status: 'ok', database: 'connected', timestamp: <ISO8601> }` when healthy, HTTP 503 when unhealthy.

**Rationale**:
- FR-002: Backend API MUST respond to health checks on port 5000 with 200 OK
- FR-003a, FR-004a, FR-006a: Backend marks unhealthy on database/env/migration failures
- Fly.io health check config in backend/fly.toml checks `GET /` every 15s
- Unhealthy machines are removed from load balancer automatically

**Alternatives considered**:
- **Separate `/health` endpoint**: Considered but rejected for simplicity. Using `/` as health check is a common pattern and reduces endpoint sprawl.
- **Always return 200 OK**: Rejected. Violates clarifications that backend should mark unhealthy on failures.

**Best practices**:
- Health endpoint checks database connectivity before responding 200 OK
- Return 503 Service Unavailable if database unreachable
- Include timestamp in response for debugging
- Fly.io removes unhealthy machines from load balancer after failed checks

### 5. Frontend-Backend CORS Configuration

**Decision**: Backend CORS middleware allows origin `https://medio-react-app.fly.dev` with credentials.

**Rationale**:
- FR-011: Backend MUST configure CORS to allow requests from frontend
- FR-013: Backend sets httpOnly cookies with Secure and SameSite=Strict flags
- CORS must allow credentials for cookie-based auth to work

**Alternatives considered**:
- **Allow all origins (`*`)**: Rejected. Security violation. Opens CSRF vulnerabilities.
- **Multiple allowed origins**: Not needed. Single frontend deployment.

**Best practices**:
- CORS config: `cors({ origin: 'https://medio-react-app.fly.dev', credentials: true })`
- Cookie config: `httpOnly: true, secure: true, sameSite: 'strict'`
- Frontend axios config: `withCredentials: true`

### 6. Deployment Validation Strategy

**Decision**: Three-phase validation: (1) Backend operational, (2) Auth works, (3) Core features accessible.

**Rationale**:
- Aligns with spec's three prioritized user stories (P1, P2, P3)
- Incremental validation catches issues early
- Constitution Principle III: Tests MUST be used as deployment validation gates

**Validation checklist**:
1. **P1 - Backend Operational**:
   - `flyctl status -a medio-backend` shows machines "started"
   - `flyctl logs -a medio-backend` shows successful database connection
   - `curl https://medio-backend.fly.dev/` returns 200 OK
   - Fly.io health checks passing

2. **P2 - Auth Works**:
   - Visit `https://medio-react-app.fly.dev` → login form visible
   - Register new test account → success, redirected to dashboard
   - Login with test account → cookie set, dashboard accessible
   - Refresh page → session persists

3. **P3 - Core Features**:
   - Dashboard shows stats (even if zeros)
   - Navigate to `/kids` → Kids Mode loads without errors
   - NFC scanning interface renders
   - No console errors in browser dev tools

**Alternatives considered**:
- **Automated E2E test suite**: Ideal but not required for this deployment. Tests exist (Playwright) but running them against production requires test data setup.
- **Manual testing only**: Rejected. Constitution mandates tests as gates. At minimum, run existing test suites locally.

### 7. Error Handling and Resilience

**Decision**: Implement comprehensive error boundaries, request cancellation, and friendly error messages per Constitution Principle IV.

**Rationale**:
- Clarification #4: Frontend displays friendly error messages when backend returns 502/503
- Constitution Principle IV: "API unavailability MUST result in friendly messages, not blank screens"
- Error boundaries already exist (verified), need validation they work

**Best practices**:
- Error boundaries wrap all route components
- Axios requests use AbortController for cancellation
- Frontend shows messages like "Unable to connect to server" instead of crashes
- Sentry captures and reports errors for monitoring

### 8. Fly.io Region and Scaling Configuration

**Decision**: Use existing configuration: `iad` region, `auto_stop_machines = stop`, `min_machines_running = 0`.

**Rationale**:
- Current config allows machines to stop when idle (cost optimization)
- `auto_start_machines = true` means they wake on traffic
- For initial deployment with limited traffic, this is appropriate
- Can adjust scaling later based on usage patterns

**Alternatives considered**:
- **Keep machines always running (`min_machines_running = 2`)**: Rejected for cost reasons during initial deployment phase. Can enable later for production.
- **Different region**: Current `iad` (US East) is acceptable. No requirement to change.

**Best practices**:
- Monitor cold start times during auto-start
- If cold starts impact UX, increase `min_machines_running`
- Consider adding health check `grace_period` to allow warmup

## Summary of Decisions

| Decision Area | Chosen Approach | Key Rationale |
|---------------|-----------------|---------------|
| Machine startup | Manual start with `flyctl machines start` | Allows validation before serving traffic |
| Secrets management | `fly secrets set` for sensitive values | Encryption, secure injection, easy rotation |
| Database migrations | Manual via SSH console, then validate | Explicit control, observable, fail-safe |
| Health checks | `GET /` returns 200 OK when healthy, 503 when not | Database connectivity validation, auto-removal from LB |
| CORS configuration | Single origin with credentials | Security, cookie-based auth support |
| Validation strategy | Three-phase: backend → auth → features | Incremental, aligns with user stories |
| Error handling | Error boundaries + friendly messages | Constitution Principle IV compliance |
| Scaling config | Auto-stop/start, 0 min machines | Cost-optimized for initial deployment |

## References

- Fly.io Documentation: https://fly.io/docs/
- Fly.io Health Checks: https://fly.io/docs/reference/configuration/#services-http_checks
- Fly.io Secrets Management: https://fly.io/docs/reference/secrets/
- Fly.io Postgres: https://fly.io/docs/postgres/
- Medio Constitution v1.0.0: `.specify/memory/constitution.md`
- Feature Specification: `specs/001-flyio-full-deployment/spec.md`

