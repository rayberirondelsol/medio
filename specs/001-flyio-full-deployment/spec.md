# Feature Specification: Make Medio Fully Functional on Fly.io

**Feature Branch**: `001-flyio-full-deployment`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "Deploy and make Medio fully functional on Fly.io"

## Clarifications

### Session 2025-10-17

- Q: What happens when database migrations fail during deployment? → A: Deployment proceeds but backend marks itself unhealthy and fails health checks
- Q: How does the system handle if environment variables are missing or misconfigured? → A: Backend fails to start, logs error listing missing variables
- Q: What happens when backend starts but cannot connect to the database? → A: Backend marks itself unhealthy and fails health checks
- Q: How should frontend behave when backend returns 502/503 errors? → A: Display friendly error messages, keep UI functional for cached data, use error boundaries to prevent crashes (aligns with Constitution Principle IV)
- Q: What happens when Fly.io health checks fail repeatedly? → A: Platform auto-removes unhealthy machines from load balancer and attempts restarts, administrators investigate via logs

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend Service Operational (Priority: P1)

As a DevOps engineer, I need to start the backend service and verify it's running correctly so that the frontend can communicate with the API.

**Why this priority**: Without a running backend, the entire application is non-functional. This is the foundational requirement that blocks all other functionality.

**Independent Test**: Can be fully tested by accessing the backend health check endpoint and verifying successful database connectivity without requiring frontend interaction.

**Acceptance Scenarios**:

1. **Given** backend machines are stopped, **When** I start the machines, **Then** both backend machines transition to "started" state
2. **Given** backend is running, **When** I access the health check endpoint (`/`), **Then** I receive a 200 OK response
3. **Given** backend is running, **When** I check the logs, **Then** I see successful database connection messages
4. **Given** backend is running, **When** Fly.io performs health checks, **Then** all health checks pass

---

### User Story 2 - User Authentication Works (Priority: P2)

As a parent, I need to be able to register and login to the Medio platform so that I can manage my family's video access.

**Why this priority**: Authentication is the gateway to all user-facing features. Without working auth, users cannot access any functionality.

**Independent Test**: Can be tested by accessing the frontend, completing registration, and logging in successfully with the newly created account.

**Acceptance Scenarios**:

1. **Given** I visit medio-react-app.fly.dev, **When** the page loads, **Then** I see the login form
2. **Given** I'm on the registration page, **When** I submit valid credentials, **Then** my account is created and I'm redirected to the dashboard
3. **Given** I have an account, **When** I login with correct credentials, **Then** I receive an httpOnly cookie and access the dashboard
4. **Given** I'm logged in, **When** I refresh the page, **Then** my session persists and I remain logged in
5. **Given** I'm on the dashboard, **When** backend is unavailable, **Then** I see a friendly error message instead of a crash

---

### User Story 3 - Core Features Accessible (Priority: P3)

As a parent, I need to access the dashboard, Kids Mode, and manage content so that I can use the platform as intended.

**Why this priority**: Once auth works, users need access to core functionality. This validates the complete end-to-end system integration.

**Independent Test**: Can be tested by logging in and navigating through dashboard, Kids Mode, and attempting to use NFC scanning functionality.

**Acceptance Scenarios**:

1. **Given** I'm logged in, **When** I view the dashboard, **Then** I see my stats (videos, profiles, NFC chips) even if counts are zero
2. **Given** I'm on the dashboard, **When** I navigate to /kids, **Then** Kids Mode page loads without errors
3. **Given** I'm in Kids Mode, **When** I attempt NFC scanning, **Then** the scanning interface appears (even if no physical NFC chip is present)
4. **Given** I'm watching a video, **When** I pause/play, **Then** the session heartbeat continues tracking watch time
5. **Given** backend sends session data, **When** the frontend receives it, **Then** the UI updates to reflect current session state

---

### Edge Cases

- **Database migration failure**: Backend starts but marks itself unhealthy, fails health checks, logs error details for investigation. No traffic is served until migrations succeed.
- **Missing/misconfigured environment variables**: Backend fails to start with clear error message listing which required variables are missing or invalid. Prevents running in broken state.
- **Database connection failure**: Backend marks itself unhealthy and fails health checks. Logs connection errors for investigation. No traffic is served until database connectivity is restored.
- **Frontend receives 502/503 errors from backend**: Frontend displays friendly error messages to users (per Constitution Principle IV: Error Resilience). UI remains functional for viewing cached data. Error boundaries prevent crashes. Users see informative messages like "Unable to connect to server" rather than blank screens or technical errors.
- **Fly.io health checks fail repeatedly**: Fly.io platform automatically removes unhealthy machines from load balancer and attempts restarts. Logs capture health check failure details. If all machines fail health checks, service becomes unavailable until issue is resolved. Administrators investigate via `flyctl logs` and `flyctl status` commands.

## Requirements *(mandatory)*

### Functional Requirements

**Backend Deployment**

- **FR-001**: System MUST start both backend machines on Fly.io and transition them from "stopped" to "started" state
- **FR-002**: Backend API MUST respond to health checks on port 5000 with 200 OK status
- **FR-003**: Backend MUST successfully establish connection to PostgreSQL database (medio-backend-db)
- **FR-003a**: If database connection fails, backend MUST mark itself unhealthy and fail health checks until connectivity is restored
- **FR-004**: System MUST configure environment variables: DATABASE_URL, JWT_SECRET, NODE_ENV=production, SENTRY_DSN
- **FR-004a**: Backend MUST validate all required environment variables at startup and fail with descriptive error if any are missing
- **FR-005**: Backend MUST log startup sequence including database connection status

**Database Setup**

- **FR-006**: System MUST execute database migrations successfully to create or update required tables
- **FR-006a**: If migrations fail, backend MUST mark itself unhealthy and fail health checks until issue is resolved
- **FR-007**: System MUST create the following tables if they don't exist: users, profiles, videos, nfc_chips, watch_sessions
- **FR-008**: Database connection pooling MUST be configured correctly to handle concurrent requests
- **FR-009**: System MUST optionally seed initial data if database is empty (admin user, sample data)

**Frontend-Backend Integration**

- **FR-010**: Frontend MUST use REACT_APP_API_URL environment variable pointing to https://medio-backend.fly.dev
- **FR-011**: Backend MUST configure CORS to allow requests from https://medio-react-app.fly.dev
- **FR-012**: Authentication flow MUST complete end-to-end (registration → login → dashboard)
- **FR-013**: Backend MUST set httpOnly cookies with Secure and SameSite=Strict flags for auth tokens

**Core Features**

- **FR-014**: Users MUST be able to register new accounts with email and password
- **FR-015**: Users MUST be able to login with credentials and receive session cookie
- **FR-016**: Dashboard MUST load and display user statistics (videos count, profiles count, NFC chips count)
- **FR-017**: Kids Mode page MUST be accessible at /kids route without errors
- **FR-018**: NFC scanning interface MUST render (even if no physical chip is available)
- **FR-019**: Video playback functionality MUST be accessible
- **FR-020**: Session tracking with heartbeat mechanism MUST function correctly

**Monitoring and Health**

- **FR-021**: Backend MUST expose health check endpoint at `/` returning 200 OK when healthy
- **FR-022**: Sentry error tracking MUST be configured and operational in production
- **FR-023**: Fly.io health checks MUST pass for both frontend and backend services
- **FR-024**: System MUST provide accessible logs via `flyctl logs -a medio-backend` and `flyctl logs -a medio-react-app`

**Environment Parity**

- **FR-025**: Production deployment MUST use the same Docker images and configuration as local development (per Constitution Principle V)
- **FR-026**: All sensitive environment variables MUST be set via `fly secrets set` command
- **FR-027**: Database URL MUST be automatically injected from Fly.io Postgres service connection string

### Key Entities

- **Backend Service**: Fly.io application with two machines, state (stopped/started), health status, logs
- **Frontend Service**: Fly.io application with two machines, state (started), health status
- **Database Service**: PostgreSQL database with tables (users, profiles, videos, nfc_chips, watch_sessions)
- **Environment Variables**: Configuration values (DATABASE_URL, JWT_SECRET, NODE_ENV, SENTRY_DSN, REACT_APP_API_URL)
- **User Account**: Registered user with email, password hash, authentication session
- **Health Check**: Periodic verification of service availability and responsiveness

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can visit https://medio-react-app.fly.dev and see the login page loading within 3 seconds
- **SC-002**: A user can register a new account and complete the flow in under 2 minutes
- **SC-003**: A logged-in user can access the dashboard and see stats within 5 seconds
- **SC-004**: Backend health check endpoint (`/`) returns 200 OK response within 1 second
- **SC-005**: Backend logs show successful database connections with zero connection errors
- **SC-006**: Fly.io health checks pass 100% of the time for a 15-minute observation period
- **SC-007**: Frontend makes successful API calls to backend with zero 502/503 errors
- **SC-008**: Kids Mode page loads without console errors or crashed components
- **SC-009**: System handles 10 concurrent user login attempts without degradation
- **SC-010**: Database queries execute in under 500ms for dashboard data retrieval

### Assumptions

- Fly.io account has sufficient credits or active billing to run machines
- Database (medio-backend-db) already exists and is accessible
- Frontend was rebuilt with correct REACT_APP_API_URL before deployment
- JWT_SECRET and SENTRY_DSN values are available and valid
- No breaking changes exist in the current codebase that prevent successful deployment
