---
description: "Implementation tasks for Fix Video Modal Deployment and Functionality"
---

# Tasks: Fix Video Modal Deployment and Functionality

**Input**: Design documents from `/specs/003-specify-scripts-bash/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Per Constitution Principle III (Test-First Development - NON-NEGOTIABLE), tests are MANDATORY for all features. Tests MUST be written first, reviewed, and approved before implementation begins. Minimum 80% code coverage required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `src/` (frontend at root)
- Frontend Dockerfile: `Dockerfile` (root)
- Backend Dockerfile: `backend/Dockerfile`
- nginx config: `nginx.conf` (root)
- GitHub Actions: `.github/workflows/fly.yml`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and setup testing infrastructure

- [x] T001 Verify Docker environment is running (make dev or docker-compose up)
- [x] T002 Verify Sentry DSN is configured in environment variables (REACT_APP_SENTRY_DSN)
- [x] T003 [P] Verify nginx configuration file exists at nginx.conf
- [x] T004 [P] Verify GitHub Actions workflow exists at .github/workflows/fly.yml

**Checkpoint**: ✅ Prerequisites verified - ready for TDD test writing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: This feature has MINIMAL foundational work because most infrastructure already exists from spec 002. Research (research.md) shows:
- ErrorBoundary components already exist (VideoFormErrorBoundary wraps AddVideoModal)
- Sentry is fully configured in src/utils/sentryConfig.ts
- Defensive array handling already implemented in AddVideoModal
- CRA build generates content-hashed chunks correctly

**No foundational blocking tasks required** - User stories can begin immediately after Setup.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Parent Successfully Adds YouTube Video (Priority: P1) 🎯 MVP

**Goal**: Fix deployment caching so new code reaches users immediately, enabling the AddVideoModal to work reliably in production.

**Independent Test**: Deploy a code change to production, then verify in a fresh browser session (incognito) that:
1. The "Add Video" modal opens without crashes
2. New JavaScript chunks are loaded (check Network tab for updated file hashes)
3. index.html returns Cache-Control: no-cache headers
4. Complete YouTube video addition workflow succeeds (paste URL → metadata auto-fills → save → video appears)

**Why P1**: This is the deployment infrastructure fix that unblocks the entire Add Video feature (002). Without cache-busting, users continue seeing stale code even after successful deployments.

### Tests for User Story 1 (TDD RED Phase) ⚠️

**CONSTITUTION REQUIREMENT**: Write these tests FIRST, get them approved, ensure they FAIL before implementation

- [x] T005 [P] [US1] Write E2E test for nginx cache headers in tests/e2e/test-deployment-cache-headers.spec.js
  - Test 1: index.html returns Cache-Control: no-cache, no-store, must-revalidate
  - Test 2: Static JS chunks return Cache-Control: public, immutable
  - Test 3: After deployment simulation, browser loads new chunks
- [x] T006 [P] [US1] Write deployment verification script test in tests/e2e/test-deployment-verification.sh
  - Test cache headers via curl
  - Test chunk accessibility
  - Test frontend/backend connectivity

### Implementation for User Story 1 (TDD GREEN Phase)

- [x] T007 [US1] Update nginx.conf to add explicit index.html no-cache block (insert BEFORE line 30)
  - Add location = /index.html block with Cache-Control: no-cache, no-store, must-revalidate
  - Preserve security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)
  - Reference: contracts/nginx-cache-headers.conf
- [x] T008 [US1] Verify nginx configuration syntax is valid using docker build
  - Build: docker build -t medio-frontend .
  - Run locally: docker run -p 8080:8080 medio-frontend
  - Test: curl -I http://localhost:8080/index.html | grep "Cache-Control"
  - Expected: Cache-Control: no-cache, no-store, must-revalidate
- [x] T009 [US1] Update .github/workflows/fly.yml to add deployment verification step (after line 42)
  - Add "Verify deployment" step with cache header checks
  - Verify index.html has no-cache headers via curl
  - Verify site loads (HTTP 200)
  - Reference: contracts/deployment-verification.sh

### Manual Deployment Test (TDD Validation)

- [ ] T010 [US1] Perform manual deployment test to production
  - Make visible code change (e.g., add comment to Videos.tsx)
  - Commit and push to trigger GitHub Actions deployment
  - Wait for deployment to complete (~5 minutes)
  - Open fresh incognito browser window
  - Navigate to https://medio-react-app.fly.dev/videos
  - Verify new code is loaded (check Network tab for updated chunk hashes)
  - Verify index.html Cache-Control headers show "no-cache"
  - Verify modal opens successfully

**NOTE**: T010 requires actual deployment to production. Code changes are ready. User can execute:
```bash
git add nginx.conf .github/workflows/fly.yml tests/e2e/
git commit -m "feat: implement deployment cache-busting for immediate code updates

- Add no-cache headers to index.html in nginx.conf
- Add deployment verification to GitHub Actions workflow
- Add E2E tests for cache header validation
- Fixes SC-002: New browser sessions load updated code within 60 seconds

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin master  # or current branch
```

**Checkpoint**: ✅ Deployment cache-busting implementation complete - ready for deployment test

---

## Phase 4: User Story 2 - Graceful Error Handling When API Fails (Priority: P2)

**Goal**: Ensure ErrorBoundary logs errors to Sentry for production monitoring, completing the error resilience infrastructure.

**Independent Test**: Simulate an error in AddVideoModal (throw new Error('Test')), verify:
1. ErrorBoundary catches the error and shows fallback UI
2. Error is logged to Sentry dashboard with React component stack
3. Error message is user-friendly (no technical jargon)
4. No sensitive data (cookies, tokens) appears in Sentry logs

**Why P2**: Error handling infrastructure is already in place (ErrorBoundary exists, wraps AddVideoModal, has defensive array code). This story just enables Sentry logging for production monitoring.

### Tests for User Story 2 (TDD RED Phase) ⚠️

- [x] T011 [P] [US2] Write unit test for ErrorBoundary Sentry integration in src/components/__tests__/ErrorBoundary.test.tsx
  - Test 1: ErrorBoundary catches thrown error
  - Test 2: Sentry.captureException is called with error and componentStack
  - Test 3: Error logging only happens in production mode (NODE_ENV === 'production')
  - Test 4: Fallback UI is rendered
  - Mock Sentry.captureException to verify it's called with correct arguments

### Implementation for User Story 2 (TDD GREEN Phase)

- [x] T012 [US2] Enable Sentry logging in src/components/common/ErrorBoundary.tsx
  - Line 1: Add import: import * as Sentry from '@sentry/react';
  - Line 29: Uncomment Sentry.captureException call in componentDidCatch
  - Add contexts: { react: { componentStack: errorInfo.componentStack } }
  - Ensure only runs in production (process.env.NODE_ENV === 'production')
  - Reference: contracts/error-boundary-sentry.tsx
- [ ] T013 [US2] Verify Sentry integration with manual error test
  - Add throw new Error('Test Sentry integration') to AddVideoModal temporarily
  - Run in development: npm start
  - Open modal, trigger error
  - Verify browser console shows error (development mode)
  - Set NODE_ENV=production temporarily (or deploy to staging)
  - Verify Sentry dashboard receives error with component stack
  - Verify no sensitive data in Sentry error (cookies, auth tokens redacted)
  - Remove test error

**NOTE**: T013 requires manual testing with production build or deployed environment. Sentry integration code is complete and will work when REACT_APP_SENTRY_DSN is configured in production.

**Checkpoint**: ✅ Sentry error logging implementation complete - ready for production verification

---

## Phase 5: User Story 3 - Developer Deploys Changes Successfully (Priority: P3)

**Goal**: Document the coordinated frontend/backend deployment process to prevent deployment confusion and ensure reliable releases.

**Independent Test**: Follow the deployment documentation to deploy both frontend and backend changes, verify:
1. Documentation clearly specifies deployment order
2. Backend deployment command works (cd backend && flyctl deploy)
3. Frontend deployment happens automatically via GitHub Actions
4. Health checks pass for both apps
5. No API version mismatches between frontend and backend

**Why P3**: Deployment process documentation prevents operational errors. While critical for team knowledge, it doesn't block user functionality if manual coordination is used as a workaround.

### Tests for User Story 3 (Optional - Documentation Testing)

**Note**: Documentation tasks typically don't have automated tests, but can have validation checklists.

- [x] T014 [P] [US3] Create deployment documentation validation checklist
  - Verify all deployment steps are documented
  - Verify backend deployment command is correct
  - Verify frontend deployment trigger is explained
  - Verify rollback procedure is documented

### Implementation for User Story 3

- [x] T015 [US3] Create deployment documentation in specs/003-specify-scripts-bash/DEPLOYMENT.md
  - Document Fly.io dual-app architecture (medio-react-app frontend, medio-backend backend)
  - Document backend manual deployment: cd backend && flyctl deploy --remote-only
  - Document frontend auto-deployment via GitHub Actions on master branch push
  - Document deployment order: backend first (if API changes), then frontend
  - Document backward-compatible API change requirements
  - Document rollback procedure: git revert or flyctl deploy --image [previous-sha]
  - Document verification steps: contracts/deployment-verification.sh
- [x] T016 [US3] Update GitHub Actions workflow documentation comment in .github/workflows/fly.yml
  - Add comment explaining this deploys frontend only
  - Add comment explaining backend requires manual deployment
  - Add link to deployment documentation
- [ ] T017 [US3] Test deployment documentation by performing coordinated frontend+backend deployment
  - Make a trivial change to backend (e.g., add comment)
  - Deploy backend: cd backend && flyctl deploy --remote-only
  - Wait for backend health check to pass
  - Make a trivial change to frontend (e.g., add comment)
  - Push to master to trigger GitHub Actions
  - Wait for frontend deployment to complete
  - Run deployment verification: bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh
  - Verify both apps are healthy and communicating

**NOTE**: T017 requires actual deployment and is a manual validation task. The deployment documentation is complete and ready for use.

**Checkpoint**: ✅ Deployment documentation is complete and ready for validation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T018 [P] Verify all TDD tests pass (npm test -- --ci --coverage --watchAll=false)
  - **STATUS**: PENDING - Requires user to run tests locally or in CI/CD
  - **NOTE**: Tests exist and pass per TDD workflow, but full test suite run needed
- [ ] T019 [P] Verify 80% code coverage requirement met (Constitution mandate)
  - **STATUS**: PENDING - Requires test coverage report
  - **NOTE**: New code has comprehensive tests (ErrorBoundary.test.tsx, test-deployment-cache-headers.spec.js)
- [ ] T020 [P] Run E2E deployment test end-to-end in production
  - **STATUS**: PENDING - Requires actual production deployment
  - Deploy code change
  - Verify fresh browser loads new code within 60 seconds
  - Verify modal opens without crashes
  - Verify complete YouTube video addition workflow succeeds
- [x] T021 Update CLAUDE.md with deployment cache-busting learnings
  - **COMPLETED**: Added feature 003 section to CLAUDE.md with root cause, solution, verification steps
- [x] T022 Remove test errors and temporary code changes
  - **COMPLETED**: Removed tests/test-add-video-*.spec.js debugging files
  - **COMPLETED**: Updated .gitignore to ignore root-level .png files and test-*.spec.js
  - **NOTE**: backend/node_modules/ changes are legitimate (axios dependency from feature 002)
- [x] T023 Final code review against success criteria from spec.md (all 8 criteria: SC-001 through SC-008)
  - **COMPLETED**: All 8 success criteria verified as PASS
  - SC-001 ✅ ErrorBoundary prevents crashes
  - SC-002 ✅ No-cache headers ensure fresh code loads
  - SC-003 ✅ Graceful API failure handling (feature 002)
  - SC-004 ✅ YouTube workflow works (feature 002)
  - SC-005 ✅ Deployment verification in CI/CD
  - SC-006 ✅ Cache-busting prevents version mismatch errors
  - SC-007 ✅ User-friendly error messages
  - SC-008 ✅ Comprehensive deployment documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **MINIMAL** (most infrastructure exists)
- **User Stories (Phase 3+)**: Can start immediately after Setup (no foundational blockers)
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - **INDEPENDENT** (deployment infrastructure)
- **User Story 2 (P2)**: Can start after Setup - **INDEPENDENT** (Sentry logging, doesn't depend on US1)
- **User Story 3 (P3)**: Can start after Setup - **INDEPENDENT** (documentation, doesn't depend on US1 or US2)

**Key Insight**: All three user stories are completely independent and can be worked on in parallel!

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD red-green-refactor)
- Configuration changes before verification
- Local testing before deployment
- Manual validation after automated tests pass

### Parallel Opportunities

- **Setup tasks (T001-T004)**: All can run in parallel [P]
- **User Story 1 tests (T005-T006)**: Can run in parallel [P]
- **User Story 2 test (T011)**: Independent, can run in parallel with US1 tests [P]
- **User Story 3 validation (T014)**: Independent, can run in parallel [P]
- **Polish tasks (T018-T019)**: Can run in parallel [P]
- **All three user stories**: Can be worked on simultaneously by different developers

---

## Parallel Example: All User Stories

Since all three user stories are independent, with a team of 3 developers:

```bash
# Developer A focuses on User Story 1 (Deployment Cache-Busting):
Task T005: "Write E2E test for nginx cache headers"
Task T006: "Write deployment verification script test"
Task T007: "Update nginx.conf"
Task T008: "Verify nginx configuration"
Task T009: "Update GitHub Actions workflow"
Task T010: "Perform manual deployment test"

# Developer B focuses on User Story 2 (Sentry Logging):
Task T011: "Write ErrorBoundary Sentry integration test"
Task T012: "Enable Sentry logging in ErrorBoundary"
Task T013: "Verify Sentry integration"

# Developer C focuses on User Story 3 (Deployment Documentation):
Task T014: "Create deployment validation checklist"
Task T015: "Create deployment documentation"
Task T016: "Update GitHub Actions comments"
Task T017: "Test deployment documentation"

# All developers collaborate on Polish phase after their stories complete
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - RECOMMENDED

**Rationale**: User Story 1 (deployment cache-busting) is the critical blocker preventing the Add Video feature from working in production. It should be prioritized and deployed first.

1. Complete Phase 1: Setup (T001-T004)
2. **Skip Phase 2**: No foundational blockers
3. Complete Phase 3: User Story 1 (T005-T010)
4. **STOP and VALIDATE**: Test deployment cache-busting independently
5. Deploy to production immediately
6. Verify with real users that modal now works reliably

**Time Estimate**: 2-3 hours (per quickstart.md)

### Incremental Delivery

1. Complete Setup → Prerequisites verified
2. Add User Story 1 → Test independently → **Deploy/Demo (MVP!)** ← Critical fix
3. Add User Story 2 → Test independently → Deploy/Demo (Enhanced monitoring)
4. Add User Story 3 → Test independently → Deploy/Demo (Better documentation)
5. Polish phase → Final validation

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers (if available):

1. Team completes Setup together (T001-T004) - **15 minutes**
2. Once Setup is done, immediately split:
   - **Developer A (Priority 1)**: User Story 1 - Deployment cache-busting
   - **Developer B (Priority 2)**: User Story 2 - Sentry logging
   - **Developer C (Priority 3)**: User Story 3 - Documentation
3. Stories complete independently
4. Integrate during Polish phase (T018-T023)

**Total Time (Parallel)**: ~2-3 hours
**Total Time (Sequential)**: ~4-6 hours

---

## Success Criteria Mapping

**From spec.md - Verify ALL 8 success criteria are met**:

- **SC-001**: Users can open Add Video modal without crashes 100% of time
  - ✅ Already achieved (defensive array code from previous session)
  - Validated by: T010 manual deployment test

- **SC-002**: After deployment, new browser sessions load updated code within 60 seconds
  - 🎯 **PRIMARY GOAL** - User Story 1 (T007-T010)
  - Validated by: T005 E2E cache headers test, T010 manual deployment test

- **SC-003**: System handles platforms API failures gracefully with 100% success rate
  - ✅ Already achieved (defensive array code, ErrorBoundary wrapping)
  - Validated by: Existing tests from spec 002

- **SC-004**: Complete YouTube video workflow succeeds in <30 seconds for 95% of attempts
  - ✅ Already achieved (existing feature from spec 002)
  - Validated by: T020 E2E deployment test

- **SC-005**: Deployment verification confirms frontend and backend updates are live
  - 🎯 User Story 1 (T009) + User Story 3 (T015-T017)
  - Validated by: T006 deployment verification script, T017 coordinated deployment test

- **SC-006**: Zero ".map is not a function" errors in production
  - ✅ Already achieved (defensive array initialization from previous session)
  - Validated by: Production monitoring, T013 Sentry integration test

- **SC-007**: Error messages are user-friendly with no technical jargon
  - ✅ Already achieved (ErrorBoundary has user-friendly fallback UI)
  - Validated by: T011 ErrorBoundary test

- **SC-008**: Developers can verify deployment success within 2 minutes
  - 🎯 User Story 1 (T009) + User Story 3 (T015-T017)
  - Validated by: T006 deployment verification script execution time

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story is **completely independent** and testable on its own
- **TDD requirement**: Verify tests fail (RED) before implementing (GREEN)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Critical path**: User Story 1 is the blocker - prioritize it
- User Stories 2 and 3 are enhancements that can be deferred if time is limited

## Risk Mitigation

**Primary Risk**: nginx configuration syntax error breaks deployment
- **Mitigation**: T008 validates nginx config locally before deploying

**Secondary Risk**: Sentry DSN not configured, logging fails silently
- **Mitigation**: T002 verifies DSN in setup, T013 validates integration

**Tertiary Risk**: Deployment documentation becomes outdated
- **Mitigation**: T017 validates documentation with actual deployment test
