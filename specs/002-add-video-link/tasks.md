---
description: "Task list for Add Video via Link feature implementation"
---

# Tasks: Add Video via Link

**Input**: Design documents from `/specs/002-add-video-link/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per Constitution Principle III (Test-First Development - NON-NEGOTIABLE), tests are MANDATORY for all features. Tests MUST be written first, reviewed, and approved before implementation begins. Minimum 80% code coverage required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- Paths shown below follow existing Medio project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for the feature

- [x] T001 [P] Create database migration for unique constraint on (family_id, video_url) in backend/migrations/
- [x] T002 [P] Create database migration for indexes (family_id, platform_id, added_date) in backend/migrations/
- [x] T003 [P] Add YOUTUBE_API_KEY to backend/.env.example with documentation
- [x] T004 [P] Install/verify axios is available in backend package.json
- [x] T005 [P] Verify React Context API setup in frontend (no new dependencies needed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create GET /api/platforms endpoint in backend/src/routes/platforms.js
- [x] T007 [P] Create Platform service for UUID lookups in backend/src/services/platformService.js
- [x] T008 [P] Update videos route to accept UUID for platform_id in backend/src/routes/videos.js
- [x] T009 [P] Add server-side URL validation helper in backend/src/utils/urlValidator.js
- [x] T010 [P] Add duplicate video URL check in backend/src/routes/videos.js (catch unique constraint violation)
- [x] T011 [P] Create base error boundary component in frontend/src/components/common/ErrorBoundary.tsx
- [x] T012 [P] Create platform service for fetching UUIDs in frontend/src/services/platformService.ts
- [x] T013 [P] Add VideoMetadata TypeScript types in frontend/src/types/video.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Public YouTube Video (Priority: P1) 🎯 MVP

**Goal**: Enable parents to add a public YouTube video by pasting its URL, with automatic metadata fetching

**Independent Test**: Open "Add Video" modal, paste valid YouTube URL (https://www.youtube.com/watch?v=dQw4w9WgXcQ), see metadata auto-fill within 3 seconds, select age rating, click "Add Video", verify video appears in library

### Tests for User Story 1 (MANDATORY per Constitution) ⚠️

**CONSTITUTION REQUIREMENT**: Write these tests FIRST, get them reviewed and approved, ensure they FAIL before implementation (TDD red-green-refactor cycle)

- [x] T014 [P] [US1] Unit test for YouTube URL parsing in frontend/tests/unit/utils/urlParser.test.ts
- [x] T015 [P] [US1] Unit test for YouTube platform detection in frontend/tests/unit/utils/platformDetector.test.ts
- [x] T016 [P] [US1] Unit test for YouTube service API client in backend/tests/unit/services/youtubeService.test.js
- [x] T017 [P] [US1] Integration test for GET /api/videos/metadata?platform=youtube in backend/tests/integration/videoMetadata.test.js
- [x] T018 [P] [US1] Integration test for POST /api/videos with YouTube video in backend/tests/integration/videos.test.js
- [x] T019 [P] [US1] Integration test for GET /api/platforms in backend/tests/integration/platforms.test.js
- [x] T020 [US1] E2E test for full YouTube video add flow in frontend/tests/e2e/add-video-link.spec.ts

### Implementation for User Story 1

- [x] T021 [P] [US1] Create URL parser utility for YouTube formats in frontend/src/utils/urlParser.ts
- [x] T022 [P] [US1] Create platform detector utility in frontend/src/utils/platformDetector.ts
- [x] T023 [US1] Create YouTube service with Data API v3 integration in backend/src/services/youtubeService.js
- [x] T024 [US1] Create GET /api/videos/metadata endpoint in backend/src/routes/videos.js
- [x] T025 [US1] Update AddVideoModal to handle URL paste and platform detection in frontend/src/components/videos/AddVideoModal.tsx
- [x] T026 [US1] Add metadata fetch service method in frontend/src/services/videoService.ts
- [x] T027 [US1] Implement auto-fill logic in AddVideoModal on metadata fetch success in frontend/src/components/videos/AddVideoModal.tsx
- [x] T028 [US1] Add loading spinner during metadata fetch in frontend/src/components/videos/AddVideoModal.tsx
- [x] T029 [US1] Add AbortController for request cancellation on unmount in frontend/src/components/videos/AddVideoModal.tsx
- [x] T030 [US1] Implement 10-second timeout for metadata fetch in frontend/src/services/videoService.ts
- [x] T031 [US1] Add age rating validation before save in frontend/src/components/videos/AddVideoModal.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - can add YouTube videos with auto-filled metadata

---

## Phase 4: User Story 2 - Handle URL Variations and Platform Detection (Priority: P2)

**Goal**: Support multiple URL formats from YouTube, Vimeo, and Dailymotion (youtu.be, vimeo.com/ID, dai.ly, etc.)

**Independent Test**: Paste different URL formats (youtu.be/ID, youtube.com/embed/ID, vimeo.com/ID, dai.ly/ID) and verify each is correctly parsed and metadata is fetched

### Tests for User Story 2 (MANDATORY per Constitution) ⚠️

- [x] T032 [P] [US2] Unit test for YouTube short URL (youtu.be) parsing in frontend/tests/unit/utils/urlParser.test.ts
- [x] T033 [P] [US2] Unit test for YouTube embed URL parsing in frontend/tests/unit/utils/urlParser.test.ts
- [x] T034 [P] [US2] Unit test for Vimeo URL parsing in frontend/tests/unit/utils/urlParser.test.ts
- [x] T035 [P] [US2] Unit test for Dailymotion URL parsing (both formats) in frontend/tests/unit/utils/urlParser.test.ts
- [x] T036 [P] [US2] Unit test for Vimeo service API client in backend/tests/unit/services/vimeoService.test.js
- [x] T037 [P] [US2] Unit test for Dailymotion service API client in backend/tests/unit/services/dailymotionService.test.js
- [x] T038 [P] [US2] Integration test for GET /api/videos/metadata?platform=vimeo in backend/tests/integration/videoMetadata.test.js
- [x] T039 [P] [US2] Integration test for GET /api/videos/metadata?platform=dailymotion in backend/tests/integration/videoMetadata.test.js
- [x] T040 [US2] E2E test for Vimeo video add flow in frontend/tests/e2e/add-video-link.spec.ts
- [x] T041 [US2] E2E test for Dailymotion video add flow in frontend/tests/e2e/add-video-link.spec.ts

### Implementation for User Story 2

- [x] T042 [P] [US2] Extend urlParser to support YouTube short URLs (youtu.be) in frontend/src/utils/urlParser.ts
- [x] T043 [P] [US2] Extend urlParser to support YouTube embed URLs in frontend/src/utils/urlParser.ts
- [x] T044 [P] [US2] Extend urlParser to support Vimeo URLs in frontend/src/utils/urlParser.ts
- [x] T045 [P] [US2] Extend urlParser to support Dailymotion URLs (dailymotion.com and dai.ly) in frontend/src/utils/urlParser.ts
- [x] T046 [P] [US2] Extend platformDetector to detect Vimeo in frontend/src/utils/platformDetector.ts
- [x] T047 [P] [US2] Extend platformDetector to detect Dailymotion in frontend/src/utils/platformDetector.ts
- [x] T048 [P] [US2] Create Vimeo service with API integration in backend/src/services/vimeoService.js
- [x] T049 [P] [US2] Create Dailymotion service with API integration in backend/src/services/dailymotionService.js
- [x] T050 [US2] Update GET /api/videos/metadata to route to Vimeo service in backend/src/routes/videos.js
- [x] T051 [US2] Update GET /api/videos/metadata to route to Dailymotion service in backend/src/routes/videos.js
- [x] T052 [US2] Update AddVideoModal to auto-select platform dropdown based on detection in frontend/src/components/videos/AddVideoModal.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - can add videos from YouTube, Vimeo, Dailymotion with various URL formats

---

## Phase 5: User Story 3 - Graceful Error Handling (Priority: P3)

**Goal**: Provide clear, actionable error messages for invalid URLs, private videos, API failures, duplicates, and timeouts

**Independent Test**: Trigger error conditions (invalid URL, private video URL, disconnect network, duplicate URL) and verify friendly error messages appear in modal (no crashes)

### Tests for User Story 3 (MANDATORY per Constitution) ⚠️

- [ ] T053 [P] [US3] Unit test for invalid URL validation in frontend/tests/unit/utils/urlParser.test.ts
- [ ] T054 [P] [US3] Unit test for error message formatting in frontend/tests/unit/utils/errorFormatter.test.ts
- [ ] T055 [P] [US3] Integration test for private video error handling in backend/tests/integration/videoMetadata.test.js
- [ ] T056 [P] [US3] Integration test for duplicate URL detection in backend/tests/integration/videos.test.js
- [ ] T057 [P] [US3] Integration test for API quota exceeded error in backend/tests/integration/videoMetadata.test.js
- [ ] T058 [US3] E2E test for invalid URL error message in frontend/tests/e2e/add-video-link.spec.ts
- [ ] T059 [US3] E2E test for duplicate video warning flow in frontend/tests/e2e/add-video-link.spec.ts
- [ ] T060 [US3] E2E test for timeout error handling in frontend/tests/e2e/add-video-link.spec.ts

### Implementation for User Story 3

- [ ] T061 [P] [US3] Create error formatter utility for user-friendly messages in frontend/src/utils/errorFormatter.ts
- [ ] T062 [P] [US3] Add Sentry error logging to YouTube service in backend/src/services/youtubeService.js
- [ ] T063 [P] [US3] Add Sentry error logging to Vimeo service in backend/src/services/vimeoService.js
- [ ] T064 [P] [US3] Add Sentry error logging to Dailymotion service in backend/src/services/dailymotionService.js
- [ ] T065 [US3] Add invalid URL error handling in AddVideoModal in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T066 [US3] Add private video error handling (show friendly message) in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T067 [US3] Add API failure error handling (show manual entry message) in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T068 [US3] Add timeout error handling in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T069 [US3] Add duplicate URL detection and warning modal in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T070 [US3] Wrap AddVideoModal with Error Boundary in frontend/src/components/videos/VideoFormErrorBoundary.tsx
- [ ] T071 [US3] Handle unique constraint violation in backend with user-friendly error in backend/src/routes/videos.js
- [ ] T072 [US3] Add error state clearing on URL change in frontend/src/components/videos/AddVideoModal.tsx

**Checkpoint**: All error scenarios now handled gracefully - no crashes, clear messages, manual fallback always available

---

## Phase 6: User Story 4 - Manual Entry Fallback (Priority: P4)

**Goal**: Allow manual video information entry when automatic metadata fetching fails

**Independent Test**: Simulate API failure, verify all form fields remain editable, manually fill in title/description, confirm video saves successfully

### Tests for User Story 4 (MANDATORY per Constitution) ⚠️

- [ ] T073 [P] [US4] Unit test for manual entry mode state in frontend/tests/unit/components/AddVideoModal.test.tsx
- [ ] T074 [P] [US4] Integration test for POST /api/videos with manually entered data in backend/tests/integration/videos.test.js
- [ ] T075 [US4] E2E test for manual entry after API failure in frontend/tests/e2e/add-video-link.spec.ts
- [ ] T076 [US4] E2E test for manual entry for unsupported platform in frontend/tests/e2e/add-video-link.spec.ts

### Implementation for User Story 4

- [ ] T077 [US4] Ensure form fields remain editable after API failure in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T078 [US4] Add manual entry mode indicator in UI in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T079 [US4] Validate manually entered data before save in frontend/src/components/videos/AddVideoModal.tsx
- [ ] T080 [US4] Allow save with partial metadata (manual mode) in backend/src/routes/videos.js

**Checkpoint**: All user stories complete - feature fully functional with auto-fetch + manual fallback

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

- [ ] T081 [P] Add rate limiting middleware to /api/videos/metadata endpoint in backend/src/middleware/rateLimiter.js
- [ ] T082 [P] Add API quota monitoring/logging for YouTube API in backend/src/services/youtubeService.js
- [ ] T083 [P] Update CLAUDE.md with feature status in CLAUDE.md
- [ ] T084 [P] Verify 80% code coverage requirement met (Constitution mandate) using npm run test:coverage
- [ ] T085 [P] Run frontend linting (npm run lint) and fix any issues
- [ ] T086 [P] Run backend linting (npm run lint) and fix any issues
- [ ] T087 [P] Test Docker build succeeds (make build or docker-compose build)
- [ ] T088 Run quickstart.md validation scenarios in specs/002-add-video-link/quickstart.md
- [ ] T089 Security review: verify API keys not exposed, httpOnly cookies used
- [ ] T090 Performance review: verify metadata fetch < 2s for 95% of requests (SC-002)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 utilities but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds error handling to US1+US2 flows but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Provides fallback for US1+US2+US3 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD red-green-refactor)
- Utilities/helpers before services
- Services before endpoints
- Backend endpoints before frontend integration
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- Tasks T001-T005 can all run in parallel (different files, no dependencies)

**Foundational Phase (Phase 2)**:
- Tasks T007-T013 can all run in parallel after T006 completes
- T006 (GET /api/platforms) should complete first as it's needed for testing

**User Story 1 Tests**:
- Tasks T014-T019 can all run in parallel (different test files)
- T020 (E2E) should run after unit/integration tests pass

**User Story 1 Implementation**:
- Tasks T021-T022 can run in parallel (frontend utilities)
- T023-T024 can run in parallel (backend services)
- T025-T031 should run sequentially (all modify AddVideoModal)

**User Story 2 Tests**:
- Tasks T032-T039 can all run in parallel (different test files)
- T040-T041 (E2E) should run after unit/integration tests pass

**User Story 2 Implementation**:
- Tasks T042-T047 can all run in parallel (extend utilities)
- Tasks T048-T049 can run in parallel (backend services)
- T050-T052 should run sequentially (modify existing files)

**User Story 3 Tests**:
- Tasks T053-T057 can all run in parallel (different test files)
- T058-T060 (E2E) should run after unit/integration tests pass

**User Story 3 Implementation**:
- Tasks T062-T064 can run in parallel (add Sentry to services)
- T065-T072 should run sequentially (all modify AddVideoModal or related files)

**User Story 4 Tests**:
- Tasks T073-T074 can run in parallel
- T075-T076 (E2E) should run after unit/integration tests pass

**Polish Phase (Phase 7)**:
- Tasks T081-T087 can all run in parallel (different files, independent checks)
- T088-T090 should run sequentially (validation and review)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (after writing them):
Task: "Unit test for YouTube URL parsing in frontend/tests/unit/utils/urlParser.test.ts"
Task: "Unit test for YouTube platform detection in frontend/tests/unit/utils/platformDetector.test.ts"
Task: "Unit test for YouTube service API client in backend/tests/unit/services/youtubeService.test.js"
Task: "Integration test for GET /api/videos/metadata?platform=youtube in backend/tests/integration/videoMetadata.test.js"
Task: "Integration test for POST /api/videos with YouTube video in backend/tests/integration/videos.test.js"
Task: "Integration test for GET /api/platforms in backend/tests/integration/platforms.test.js"

# After tests fail (red), launch utility implementations together:
Task: "Create URL parser utility for YouTube formats in frontend/src/utils/urlParser.ts"
Task: "Create platform detector utility in frontend/src/utils/platformDetector.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migrations, environment setup)
2. Complete Phase 2: Foundational (GET /api/platforms, base error boundary, platform service)
3. Complete Phase 3: User Story 1 (YouTube only with auto-fetch)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Can add YouTube video with URL paste
   - Metadata auto-fills within 2 seconds
   - Video appears in library after save
5. Deploy/demo if ready

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational → Platform endpoints ready
2. **MVP**: Add User Story 1 → Test independently → Deploy/Demo (YouTube videos working!)
3. **Multi-Platform**: Add User Story 2 → Test independently → Deploy/Demo (Vimeo + Dailymotion working!)
4. **Error Resilience**: Add User Story 3 → Test independently → Deploy/Demo (Graceful errors, duplicates handled)
5. **Fallback**: Add User Story 4 → Test independently → Deploy/Demo (Manual entry always works)
6. **Polish**: Complete Phase 7 → Production ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (YouTube auto-fetch)
   - **Developer B**: User Story 2 (Multi-platform support)
   - **Developer C**: User Story 3 (Error handling)
   - **Developer D**: User Story 4 (Manual fallback)
3. Stories complete and integrate independently
4. Team completes Polish phase together

---

## Notes

- **[P]** tasks = different files, no dependencies - can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD CRITICAL**: Verify tests fail (red) before implementing (green), then refactor
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Constitution Compliance**: 80% test coverage mandatory, Context API only, Docker-first, Error Boundaries required
- **API Keys**: YOUTUBE_API_KEY must stay in backend environment, never expose to frontend
- **Platform UUIDs**: Always fetch from GET /api/platforms, never hardcode
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3 (User Story 1)**: 18 tasks (7 tests + 11 implementation)
- **Phase 4 (User Story 2)**: 21 tasks (10 tests + 11 implementation)
- **Phase 5 (User Story 3)**: 20 tasks (8 tests + 12 implementation)
- **Phase 6 (User Story 4)**: 8 tasks (4 tests + 4 implementation)
- **Phase 7 (Polish)**: 10 tasks
- **TOTAL**: 90 tasks

**Test Coverage**: 29 test tasks + 61 implementation tasks = 32% of tasks are tests (exceeds typical 20-30% ratio for comprehensive TDD)

**Parallel Opportunities**: 45+ tasks marked [P] can run in parallel within their phases

**MVP Scope** (Phases 1-3): 31 tasks - Estimated 2-3 days for experienced developer following TDD workflow

**Full Feature** (All phases): 90 tasks - Estimated 5-7 days as noted in quickstart.md
