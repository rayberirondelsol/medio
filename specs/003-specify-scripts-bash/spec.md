# Feature Specification: Fix Video Modal Deployment and Functionality

**Feature Branch**: `003-specify-scripts-bash`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "Fix Add Video Modal - Complete Deployment and Functionality

## Problem Statement
The 'Add Video via Link' feature (spec 002-add-video-link) is partially implemented but has critical deployment and runtime issues preventing E2E testing..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent Successfully Adds YouTube Video (Priority: P1)

As a parent, I need to add a YouTube video to my family's library so that my children can watch approved content in a safe environment.

**Why this priority**: This is the core value proposition of the feature - enabling parents to curate content. Without this working, the entire "Add Video via Link" feature (002) is non-functional in production.

**Independent Test**: Can be fully tested by opening the "Add Video" modal on the Videos page, pasting a YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ), verifying metadata auto-fills, selecting an age rating, saving, and confirming the video appears in the library. Success means the modal opens without crashes and the complete workflow succeeds.

**Acceptance Scenarios**:

1. **Given** I am on the Videos page, **When** I click "Add Video" button, **Then** the Add Video modal opens without errors or crashes
2. **Given** the modal is open, **When** I paste a valid YouTube URL, **Then** the system detects the platform and displays a loading indicator
3. **Given** metadata is fetched successfully, **When** the API returns data, **Then** title, description, and thumbnail fields auto-populate within 3 seconds
4. **Given** metadata has loaded, **When** I select an age rating and click "Add Video", **Then** the video saves successfully and appears in my library
5. **Given** the video was added, **When** I refresh the page, **Then** the video persists in the library

---

### User Story 2 - Graceful Error Handling When API Fails (Priority: P2)

As a parent, I need clear feedback when something goes wrong so that I can take corrective action or enter information manually.

**Why this priority**: Network issues and API failures are inevitable. The system must handle these gracefully without crashes, maintaining user trust and allowing task completion through manual entry.

**Independent Test**: Can be tested by simulating API failures (disconnect network, use invalid API key, exceed rate limits) and verifying the modal shows user-friendly error messages and allows manual data entry.

**Acceptance Scenarios**:

1. **Given** the platforms API fails to load, **When** the modal opens, **Then** I see a clear error message and can still access the form
2. **Given** the metadata API is unavailable, **When** I paste a video URL, **Then** I see "Unable to fetch video details automatically. You can enter the information manually below." and all form fields remain editable
3. **Given** I'm in manual entry mode, **When** I fill in title, URL, platform, and age rating manually, **Then** I can save the video successfully
4. **Given** an error occurs, **When** the condition is resolved and I retry, **Then** the error message clears and the system proceeds normally

---

### User Story 3 - Developer Deploys Changes Successfully (Priority: P3)

As a developer, I need deployed code changes to be immediately available to users so that bug fixes and new features reach production without delay or confusion.

**Why this priority**: Deployment reliability affects developer productivity and feature delivery speed. While critical for operations, it doesn't block user functionality if workarounds exist (manual deployment).

**Independent Test**: Can be tested by making a code change to AddVideoModal.tsx, deploying to production, and verifying new users (or users with cleared cache) see the updated code immediately.

**Acceptance Scenarios**:

1. **Given** I commit and push changes to master branch, **When** GitHub Actions completes deployment, **Then** new browser sessions load the updated frontend code
2. **Given** frontend deployment completes, **When** backend changes were also made, **Then** I have clear documentation on coordinating backend deployment
3. **Given** deployment succeeded, **When** users access the site, **Then** they receive the latest static assets without aggressive browser caching blocking updates
4. **Given** I make an emergency fix, **When** I deploy, **Then** users see the fix within 5 minutes without requiring manual cache clearing

---

### Edge Cases

- **Browser with aggressive caching**: Service workers or browser cache prevent new code from loading even after deployment → System uses cache-busting headers and versioning to force fresh loads
- **Platforms API returns non-array**: Backend returns null, undefined, or error object → Frontend defensive code ensures platforms state is always an array, preventing .map() crashes
- **Network timeout during metadata fetch**: Request hangs beyond 10 seconds → AbortController cancels request, user sees timeout message, manual entry remains available
- **Backend deployed but frontend isn't**: API changes break frontend expectations → Deployment documentation ensures coordinated releases or backward-compatible API changes
- **Frontend deployed but backend isn't**: Frontend expects new API endpoints that don't exist → Feature detection or graceful degradation handles missing backend capabilities
- **User opens modal while deployment is in progress**: Static assets are partially updated → Asset manifest and versioning ensure all chunks match, preventing version mismatches
- **Modal crashes on first load after deployment**: JavaScript error prevents error boundary from catching it → Top-level error boundary wraps entire app, shows recovery page

## Requirements *(mandatory)*

### Functional Requirements

**Cache Busting and Deployment**

- **FR-001**: System MUST use cache-busting techniques to ensure browsers load the latest static assets after deployment
- **FR-002**: Static asset files (JS, CSS) MUST include content-based hashes in filenames to prevent stale cache issues
- **FR-003**: index.html MUST have no-cache headers to force browsers to check for updates
- **FR-004**: Asset manifest MUST be updated atomically during deployment to prevent version mismatches between chunks
- **FR-005**: Deployment process MUST have verification step confirming new assets are accessible before marking deployment complete

**Error Resilience in Add Video Modal**

- **FR-006**: AddVideoModal MUST initialize platforms state as empty array ([]) by default, never null or undefined
- **FR-007**: System MUST wrap AddVideoModal with ErrorBoundary to catch and handle JavaScript errors gracefully
- **FR-008**: When getPlatforms() fails, system MUST set platforms to empty array and display user-friendly error message
- **FR-009**: When getPlatforms() returns non-array data, system MUST log error and treat as empty platforms list
- **FR-010**: Manual entry mode MUST be available when metadata fetch fails, with all form fields editable

**Defensive Programming**

- **FR-011**: All .map() operations on platforms array MUST be preceded by Array.isArray() check or array initialization
- **FR-012**: Error messages displayed to users MUST NOT contain stack traces or technical implementation details
- **FR-013**: All errors MUST be logged to error tracking system (Sentry) with contextual information
- **FR-014**: System MUST handle component unmounting during async operations using cleanup functions

**Deployment Coordination**

- **FR-015**: Deployment documentation MUST specify order of operations for deploying frontend and backend changes
- **FR-016**: Backend API changes MUST be backward-compatible OR documentation must specify required deployment coordination
- **FR-017**: Deployment process MUST verify both frontend and backend health endpoints before marking deployment successful

### Key Entities

- **Static Asset**: Represents a frontend file (JavaScript, CSS, images) with content-based hash for cache busting
  - Attributes: filename, content hash, MIME type, deployment timestamp
  - Relationships: Referenced by index.html via asset manifest

- **Error Boundary**: React component that catches JavaScript errors in child components
  - Attributes: error message, component stack, recovery UI
  - Relationships: Wraps AddVideoModal and other critical components

- **Platform**: Video hosting service (YouTube, Vimeo, etc.)
  - Attributes: id (UUID), name, requiresAuth flag
  - Relationships: Used by AddVideoModal for platform selection dropdown

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open Add Video modal without crashes 100% of the time, regardless of API availability
- **SC-002**: After deployment, new browser sessions load updated frontend code within 60 seconds without manual cache clearing
- **SC-003**: System handles platforms API failures gracefully, allowing manual video entry with 100% success rate
- **SC-004**: Complete YouTube video addition workflow (open modal → paste URL → auto-fill → save → verify) succeeds in under 30 seconds for 95% of attempts
- **SC-005**: Deployment verification confirms both frontend and backend updates are live before marking deployment complete
- **SC-006**: Zero ".map is not a function" errors occur in production after deployment
- **SC-007**: Error messages are user-friendly (understandable by non-technical parents) with no technical jargon or stack traces
- **SC-008**: Developers can verify deployment success within 2 minutes using documented verification steps

## Assumptions

- Browser cache behavior follows HTTP caching standards (Cache-Control, ETag headers)
- Fly.io platform respects no-cache headers and serves updated static assets immediately after deployment
- Users have JavaScript enabled (requirement for React SPA)
- GitHub Actions deployment completes successfully (no CI/CD infrastructure failures)
- Asset manifest (asset-manifest.json) is the source of truth for chunk file names
- nginx static site serving can be configured with appropriate cache headers
- Service workers (if present) can be unregistered or bypassed for new deployments
- React's code splitting (lazy loading) generates deterministic chunk hashes based on content
- Error boundaries can catch most JavaScript errors before they crash the app
- Sentry (error tracking) is configured and accessible for logging errors
- Backend /api/platforms endpoint is accessible and returns JSON array (already implemented)
- Testing environment (medio-react-app.fly.dev) mirrors production configuration
- Manual deployment of backend is acceptable if properly documented (no automation required)
- Backward compatibility is preferred over breaking changes requiring coordinated deployment

## Dependencies

- **nginx**: Web server serving static files
  - Required for: Setting cache headers, serving index.html with no-cache
  - Configuration location: nginx.conf or Dockerfile

- **Fly.io Platform**: Hosting infrastructure
  - Required for: Serving static assets, handling deployments
  - Configuration: fly.toml for both frontend and backend apps

- **GitHub Actions**: CI/CD automation
  - Required for: Automated frontend deployment
  - Configuration: .github/workflows/fly.yml

- **React Build Process**: Create React App's build system
  - Required for: Generating content-hashed chunks, asset manifest
  - No configuration changes needed (works out of box)

- **ErrorBoundary Component**: React error handling component
  - Required for: Catching JavaScript errors in AddVideoModal
  - Location: May need to be created if not exists

- **Sentry**: Error tracking service
  - Required for: Logging errors with context
  - Status: Assumed to be configured based on project setup

## Open Questions

All questions have been resolved through informed assumptions documented in the Assumptions section. No [NEEDS CLARIFICATION] markers remain.

## Out of Scope

- Automated backend deployment via CI/CD (manual deployment is acceptable)
- Service worker implementation or progressive web app (PWA) features
- Offline functionality or sync
- Rollback automation (manual rollback via Fly.io CLI is sufficient)
- A/B testing or feature flags for gradual rollout
- Monitoring/alerting beyond error logging to Sentry
- Performance optimization beyond cache busting (e.g., bundle size reduction)
- Mobile app deployment (spec focuses on web deployment only)
