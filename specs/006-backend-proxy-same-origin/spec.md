# Feature Specification: Same-Origin Authentication

**Feature Branch**: `006-backend-proxy-same-origin`
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "Backend Proxy für Same-Origin Cookie Authentication - Implement reverse proxy to solve cross-origin cookie authentication issues between separate frontend and backend domains"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent Registration and Dashboard Access (Priority: P1)

As a parent, I need to register an account and immediately access my dashboard to start managing content for my children. After successful registration, I should be able to view my dashboard, navigate to different sections (Videos, Profiles, NFC Manager), and perform actions without being unexpectedly logged out or seeing authentication errors.

**Why this priority**: This is the core user entry point. Without reliable authentication after registration/login, users cannot access any features of the platform. This is the foundation for all other functionality and directly impacts "Child Safety First" principle by ensuring secure, uninterrupted parent sessions.

**Independent Test**: Can be fully tested by completing registration flow, verifying dashboard loads successfully, and confirming no 401 errors appear in browser console. Delivers immediate value by allowing parents to access the platform.

**Acceptance Scenarios**:

1. **Given** I am on the registration page, **When** I submit valid registration details (email, password, name), **Then** I should see my dashboard page without any authentication errors
2. **Given** I have just registered and am viewing my dashboard, **When** I navigate to the Videos page, **Then** the page loads successfully without requiring re-authentication
3. **Given** I am logged in and viewing my dashboard, **When** I refresh the browser page, **Then** I remain authenticated and see the dashboard content (not redirected to login)
4. **Given** I am on the login page, **When** I submit valid credentials, **Then** I am redirected to the dashboard and can immediately make authenticated API calls (e.g., fetch my videos)

---

### User Story 2 - NFC Chip Registration Workflow (Priority: P2)

As a parent, I need to register NFC chips for my children so they can safely access age-appropriate content. This workflow involves multiple steps: navigating to NFC Manager, selecting a profile, scanning/entering chip ID, and saving the association. All these steps require authenticated API calls and must work seamlessly without authentication interruptions.

**Why this priority**: NFC chip registration is a critical safety feature that enables the "Child Safety First" principle. If authentication breaks during this multi-step process, parents cannot complete the setup, leaving children without proper content restrictions. This is the primary differentiating feature of the platform.

**Independent Test**: Can be tested by logging in, navigating to NFC Manager, attempting to register a chip, and verifying all API calls succeed without 401 errors. Delivers value by enabling the core NFC-based child protection feature.

**Acceptance Scenarios**:

1. **Given** I am logged in and on the Dashboard, **When** I navigate to NFC Manager, **Then** the page loads my existing profiles and chips without authentication errors
2. **Given** I am on the NFC Manager page, **When** I click "Register New Chip" and submit chip details, **Then** the chip is successfully saved and appears in my chip list
3. **Given** I start the chip registration workflow, **When** I take 2-3 minutes to complete the form, **Then** the submission succeeds without session expiration errors
4. **Given** I have just registered a chip, **When** I navigate back to Dashboard and return to NFC Manager, **Then** my newly registered chip is still visible (persistence confirmed)

---

### User Story 3 - Extended Session Multi-Page Navigation (Priority: P3)

As a parent using the platform for an extended period, I need to navigate between different sections (Dashboard → Videos → Profiles → Settings → NFC Manager) multiple times during a single session. My authentication should persist seamlessly across all these navigation actions without unexpected logouts, allowing me to efficiently manage content and profiles.

**Why this priority**: While not as critical as initial authentication (P1) or core features (P2), session persistence across extended use is essential for good user experience. Parents should not be interrupted while managing content for multiple children, uploading videos, and configuring settings.

**Independent Test**: Can be tested by logging in and navigating through all protected routes multiple times in sequence (Dashboard → Videos → Profiles → NFC → Settings → Dashboard → repeat). Verify no 401 errors occur during 10-15 minutes of navigation. Delivers value by ensuring smooth, uninterrupted platform usage.

**Acceptance Scenarios**:

1. **Given** I am logged in and have been navigating for 10 minutes, **When** I navigate from Videos to Profiles to NFC Manager, **Then** all pages load successfully without re-authentication prompts
2. **Given** I am viewing the Settings page, **When** I open a new tab and navigate directly to /dashboard, **Then** both tabs show authenticated content without requiring login
3. **Given** I am logged in on the Dashboard, **When** I remain idle for 5 minutes and then navigate to Videos, **Then** the page loads successfully (session has not expired due to inactivity)
4. **Given** I have been using the platform for 14 minutes (near the 15-minute access token expiry), **When** I navigate to a new page, **Then** my session is refreshed automatically and I remain authenticated

---

### Edge Cases

- **Session Expiration During Form Submission**: What happens when a parent spends 16+ minutes filling out a long video upload form and the access token expires before submission? How does the system handle this to prevent data loss?
- **Network Interruptions**: How does the system behave if the network connection is lost mid-request? Does the authentication state remain valid when connectivity is restored?
- **Multiple Tab Authentication**: What happens when a user has the app open in 3 browser tabs, logs out in one tab, but continues using the other two tabs? Are all tabs properly synchronized?
- **Cross-Browser Session Isolation**: If a parent logs in with Chrome and then opens the app in Firefox, do they need to log in again? (Expected: yes, but confirm cookies are properly scoped)
- **Development vs Production Parity**: Do developers experience the same authentication behavior in local development as users do in production? Are there any environment-specific authentication quirks?
- **Token Refresh Failure**: What happens if the refresh token expires (after 7 days of inactivity) while the user is actively using the app? How is this communicated to the user?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain user authentication across all API requests after successful login or registration without requiring manual token management by the client
- **FR-002**: System MUST NOT return 401 Unauthorized errors for authenticated requests when the user has a valid session (access token not expired or refresh token available)
- **FR-003**: Users MUST be able to complete multi-step workflows (e.g., NFC chip registration, video upload with metadata) without authentication interruptions or requiring re-login
- **FR-004**: System MUST ensure authentication credentials are transmitted securely and automatically with each API request without exposing them to client-side JavaScript
- **FR-005**: System MUST support both development environment (local) and production environment (deployed) with consistent authentication behavior and minimal configuration differences
- **FR-006**: System MUST handle authentication failures gracefully by providing clear error messages to users (e.g., "Session expired, please log in again") rather than cryptic 401 errors
- **FR-007**: System MUST maintain session persistence for the configured session duration (15 minutes for access tokens, 7 days for refresh tokens) without premature expiration
- **FR-008**: System MUST automatically refresh access tokens when they expire (within the 15-minute window) if a valid refresh token exists, without requiring user action
- **FR-009**: System MUST handle API request routing transparently so that frontend code can use relative paths (e.g., `/api/videos`) in both development and production
- **FR-010**: System MUST log proxy errors and authentication failures with sufficient detail for debugging while not exposing sensitive information to clients

### Key Entities *(included because feature involves authentication state)*

- **User Session**: Represents an authenticated user's active session, including access token (short-lived, 15 min), refresh token (long-lived, 7 days), and user identity (id, email, name). Sessions are automatically created on login/registration and destroyed on logout.
- **API Request**: Any HTTP request from the frontend to backend services that requires authentication. Must carry authentication credentials automatically without frontend intervention. Includes requests for videos, profiles, NFC chips, user data, etc.
- **Authentication State**: The current authentication status of a user (authenticated vs unauthenticated), tracked by the presence of valid tokens. This state must be consistent across all browser tabs and survive page refreshes within the session duration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete full registration and login flow without any authentication errors appearing in browser console (0% occurrence of 401 errors immediately after successful authentication)
- **SC-002**: NFC chip registration workflow completes end-to-end in a single session with 100% success rate (no authentication interruptions between workflow steps)
- **SC-003**: Users can navigate between all protected pages (Dashboard, Videos, Profiles, NFC Manager, Settings) without authentication interruptions or unexpected logouts (100% session retention during normal navigation patterns)
- **SC-004**: Authentication persists for the full configured session duration (15 minutes of inactivity for access token, 7 days for refresh token) with automatic token refresh occurring transparently when access token expires
- **SC-005**: Development environment mirrors production authentication behavior with zero environment-specific authentication bugs or configuration issues
- **SC-006**: Users experience zero data loss due to authentication expiration during form submissions (sessions refresh automatically before expiry during active use)
- **SC-007**: Platform handles 100 concurrent authenticated users navigating and making API calls without authentication-related failures or degraded performance

## Assumptions

- **Assumption 1**: The backend API already supports cookie-based authentication with httpOnly cookies (confirmed by existing `backend/src/routes/auth.js` implementation)
- **Assumption 2**: The backend supports CORS configuration and can be configured to accept requests from the frontend domain (confirmed by existing CORS setup in `backend/src/server.js`)
- **Assumption 3**: Both frontend and backend are deployed on HTTPS in production (required for secure cookies with `secure: true` flag)
- **Assumption 4**: Browser support for standard cookie handling is sufficient (targeting modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Assumption 5**: The frontend uses relative API paths that can be routed without hardcoded backend URLs (allowing for flexible routing configuration)
- **Assumption 6**: Network latency between frontend and backend is acceptable for an additional routing hop in production (estimated <50ms overhead)

## Constraints

- **Constraint 1**: Solution must work with existing cookie-based authentication system (cannot change to different auth mechanism like localStorage tokens, as this violates "Child Safety First" principle requiring httpOnly cookies)
- **Constraint 2**: Must maintain backward compatibility with existing frontend code that uses `/api/*` paths (no breaking changes to API call patterns)
- **Constraint 3**: Development environment must remain simple to set up (single `npm start` or Docker command should work for developers)
- **Constraint 4**: Production deployment must work within current Fly.io infrastructure (cannot require purchasing new domain or significantly changing deployment architecture)
- **Constraint 5**: Must comply with "Docker-First Development" principle (both development and production must use containerized setup)
- **Constraint 6**: Must maintain "Test-First Development" principle (E2E tests for authentication flow must be written and passing before production deployment)

## Dependencies

- **Dependency 1**: Backend API must be deployed and accessible at a known URL (currently `medio-backend.fly.dev`)
- **Dependency 2**: Backend CORS configuration must be updated to allow requests from the frontend domain (requires backend deployment before frontend can test)
- **Dependency 3**: Frontend build process must generate static assets that can be served alongside the routing mechanism
- **Dependency 4**: HTTPS certificates must be properly configured in production for secure cookie transmission (handled by Fly.io infrastructure)
- **Dependency 5**: E2E testing infrastructure (Playwright) must be able to test authentication flows with cookie-based auth

## Constitution Compliance

This feature directly supports the following constitutional principles:

- ✅ **Child Safety First**: Maintains httpOnly cookies for authentication, which are immune to XSS attacks. This protects parent accounts that control children's content access. Same-origin authentication is more secure than cross-origin cookie sharing.

- ✅ **Context-Driven Architecture**: No changes to React Context API. The AuthContext continues to work as-is, simply making API calls that now succeed due to proper cookie handling.

- ✅ **Test-First Development (NON-NEGOTIABLE)**: E2E tests for full authentication flow (registration → dashboard → NFC workflow) must be written and approved before implementation. Minimum 80% code coverage enforced.

- ✅ **Error Resilience**: Includes graceful error handling for routing failures, authentication expiration, and network issues. Clear user-facing error messages instead of cryptic 401 errors.

- ✅ **Docker-First Development**: Solution must work in Docker containers for both development and production. Make commands (`make dev`, `make prod`) must start the entire stack including routing.

## Out of Scope

The following are explicitly **not** included in this feature:

- ❌ Changing authentication mechanism from cookies to different storage (e.g., localStorage, sessionStorage)
- ❌ Implementing OAuth2/SSO integration
- ❌ Adding multi-factor authentication (MFA)
- ❌ Purchasing or configuring custom domain (e.g., app.medio.com)
- ❌ Changing backend authentication logic or token generation
- ❌ Adding new authentication-related UI components (login/register forms remain unchanged)
- ❌ Implementing "Remember Me" functionality beyond existing 7-day refresh token
- ❌ Adding session management UI for users to see/revoke active sessions
- ❌ Implementing device fingerprinting or advanced session security
- ❌ Adding rate limiting for authentication endpoints (already exists in backend)

## Risks

- **Risk 1 - Additional Latency**: Routing API requests through the frontend adds a network hop. **Mitigation**: Routing should add <50ms latency, which is acceptable for this use case. Monitor performance in production.

- **Risk 2 - Routing Complexity**: Managing routing configuration for development vs production could introduce bugs. **Mitigation**: Use environment variables and thorough E2E testing across both environments.

- **Risk 3 - Debugging Difficulty**: API errors might be harder to debug with an additional routing layer. **Mitigation**: Implement comprehensive logging at the routing layer with request/response tracking.

- **Risk 4 - Deployment Order Dependency**: Frontend and backend must be deployed in correct order (backend CORS first, then frontend). **Mitigation**: Document deployment procedure clearly and include checks in CI/CD pipeline.

- **Risk 5 - Cookie Scoping Issues**: Cookies might not work correctly if domain/path configuration is wrong. **Mitigation**: Test cookie behavior thoroughly in production-like environment before full deployment.
