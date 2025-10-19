---
description: "Task list for NFC Chip Registration implementation"
---

# Tasks: NFC Chip Registration

**Input**: Design documents from `/specs/005-specify-scripts-bash/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per Constitution Principle III (Test-First Development - NON-NEGOTIABLE), tests are MANDATORY for all features. Tests MUST be written first, reviewed, and approved before implementation begins. Minimum 80% code coverage required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- Backend tests: `backend/src/routes/__tests__/`
- Frontend tests: `src/components/__tests__/`
- E2E tests: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of existing infrastructure

- [ ] T001 Verify database schema has nfc_chips table with UNIQUE constraint on chip_uid (backend/src/db/migrate.js)
- [ ] T002 [P] Verify existing validateNFCUID() and normalizeNFCUID() functions in backend/src/routes/nfc.js
- [ ] T003 [P] Verify GET /api/nfc/chips endpoint is functional (backend/src/routes/nfc.js:49)
- [ ] T004 [P] Install express-rate-limit if not present (backend/package.json)
- [ ] T005 [P] Verify Sentry configuration in backend and frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create rate limiting configuration for NFC endpoints in backend/src/middleware/rateLimiter.js (10 POST, 20 DELETE, 60 GET per 15 min)
- [ ] T007 Implement DELETE /api/nfc/chips/:chipId endpoint in backend/src/routes/nfc.js with ownership verification
- [ ] T008 Add chip count validation middleware to enforce 20 chip limit in backend/src/middleware/chipLimitValidator.js
- [ ] T009 Update backend validators to accept 8-20 hex characters (not just 14) in backend/src/routes/nfc.js
- [ ] T010 [P] Create NFCChipContext provider for React state management in frontend/src/contexts/NFCChipContext.tsx
- [ ] T011 [P] Create NFCChipErrorBoundary component in frontend/src/components/common/NFCChipErrorBoundary.tsx
- [ ] T012 [P] Create utility for NFC UID validation and formatting in frontend/src/utils/nfcValidation.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manuelle Chip-Registrierung (Priority: P1) 🎯 MVP

**Goal**: Enable parents to manually register NFC chips via form entry with chip_uid and friendly name

**Independent Test**: Parent fills form with chip_uid "04:5A:B2:C3:D4:E5:F6" and name "Bens Chip", chip appears in list and persists across sessions

### Tests for User Story 1 (MANDATORY per Constitution) ⚠️

**CONSTITUTION REQUIREMENT**: Write these tests FIRST, get them reviewed and approved, ensure they FAIL before implementation (TDD red-green-refactor cycle)

- [ ] T013 [P] [US1] Unit test for chip count validation (max 20) in backend/src/middleware/__tests__/chipLimitValidator.test.js
- [ ] T014 [P] [US1] Unit test for chip UID normalization (colons, spaces, hyphens) in backend/src/routes/__tests__/nfcValidation.test.js
- [ ] T015 [P] [US1] Unit test for label sanitization (HTML encoding, character allowlist) in backend/src/routes/__tests__/nfcValidation.test.js
- [ ] T016 [P] [US1] Integration test for POST /api/nfc/chips with valid data (returns 201) in backend/src/routes/__tests__/nfc.test.js
- [ ] T017 [P] [US1] Integration test for POST /api/nfc/chips with duplicate chip_uid (returns 409) in backend/src/routes/__tests__/nfc.test.js
- [ ] T018 [P] [US1] Integration test for POST /api/nfc/chips with invalid label (returns 400) in backend/src/routes/__tests__/nfc.test.js
- [ ] T019 [P] [US1] Integration test for POST /api/nfc/chips exceeding 20 chip limit (returns 403) in backend/src/routes/__tests__/nfc.test.js
- [ ] T020 [P] [US1] Integration test for rate limiting on POST endpoint (returns 429) in backend/src/routes/__tests__/nfc.test.js
- [ ] T021 [P] [US1] React component test for ChipRegistrationForm validation in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx
- [ ] T022 [P] [US1] React component test for ChipRegistrationForm submission in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx
- [ ] T023 [P] [US1] React component test for ChipRegistrationForm error display in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx

### Implementation for User Story 1

- [ ] T024 [US1] Apply rate limiting to POST /api/nfc/chips endpoint in backend/src/routes/nfc.js
- [ ] T025 [US1] Add chip count validation middleware to POST /api/nfc/chips route in backend/src/routes/nfc.js
- [ ] T026 [US1] Update POST /api/nfc/chips to accept 8-20 hex character UIDs in backend/src/routes/nfc.js
- [ ] T027 [US1] Add Sentry logging for registration errors to POST endpoint in backend/src/routes/nfc.js
- [ ] T028 [US1] Ensure identical 409 error messages for duplicate chips (prevent UID enumeration) in backend/src/routes/nfc.js
- [ ] T029 [US1] Create ChipRegistrationForm component with chip_uid and label fields in frontend/src/components/nfc/ChipRegistrationForm.tsx
- [ ] T030 [US1] Add form validation (chip_uid format, label length 1-50 chars) to ChipRegistrationForm
- [ ] T031 [US1] Integrate ChipRegistrationForm with NFCChipContext for submission
- [ ] T032 [US1] Create ChipList component to display registered chips in frontend/src/components/nfc/ChipList.tsx
- [ ] T033 [US1] Create NFCChipsPage that combines ChipRegistrationForm and ChipList in frontend/src/pages/NFCChipsPage.tsx
- [ ] T034 [US1] Wrap NFCChipsPage with NFCChipErrorBoundary
- [ ] T035 [US1] Add error handling and user-friendly messages for 400, 403, 409 errors
- [ ] T036 [US1] Add loading states during chip registration

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - NFC Scan Registrierung (Priority: P2)

**Goal**: Enable parents to register chips by scanning them directly using Web NFC API on supported Android devices

**Independent Test**: On NFC-capable device, parent clicks "NFC Chip Scannen" button, holds device to chip, chip_uid auto-fills, parent enters name, chip registers successfully

### Tests for User Story 2 (MANDATORY per Constitution) ⚠️

- [ ] T037 [P] [US2] Unit test for NDEFReader feature detection in frontend/src/utils/__tests__/nfcCapability.test.ts
- [ ] T038 [P] [US2] Unit test for NFC scan timeout (30 seconds) in frontend/src/utils/__tests__/nfcScanner.test.ts
- [ ] T039 [P] [US2] Unit test for NFC error handling (permission denied, disabled, invalid tag) in frontend/src/utils/__tests__/nfcScanner.test.ts
- [ ] T040 [P] [US2] React component test for NFCScanButton visibility based on device capability in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx
- [ ] T041 [P] [US2] React component test for NFCScanButton scan workflow in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx
- [ ] T042 [P] [US2] React component test for NFCScanButton error states in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx

### Implementation for User Story 2

- [ ] T043 [P] [US2] Create nfcCapability utility with NDEFReader detection in frontend/src/utils/nfcCapability.ts
- [ ] T044 [US2] Create nfcScanner utility with AbortController timeout (30s) in frontend/src/utils/nfcScanner.ts
- [ ] T045 [US2] Add error type differentiation (NotAllowedError, InvalidStateError, etc.) to nfcScanner utility
- [ ] T046 [US2] Create NFCScanButton component with loading and error states in frontend/src/components/nfc/NFCScanButton.tsx
- [ ] T047 [US2] Add device capability check to NFCScanButton (show only on Chrome/Edge Android)
- [ ] T048 [US2] Integrate NFCScanButton with nfcScanner utility for scan workflow
- [ ] T049 [US2] Add NFCScanButton to ChipRegistrationForm with auto-fill of chip_uid field
- [ ] T050 [US2] Add visual feedback during scan (animation, status messages)
- [ ] T051 [US2] Add cancel button for active NFC scans

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Chip-Verwaltung (Priority: P3)

**Goal**: Enable parents to view all registered chips and delete chips they no longer need

**Independent Test**: Parent sees list of all registered chips, clicks delete button on one chip, confirms deletion, chip disappears from list and database permanently

### Tests for User Story 3 (MANDATORY per Constitution) ⚠️

- [ ] T052 [P] [US3] Integration test for DELETE /api/nfc/chips/:chipId with valid chip (returns 204) in backend/src/routes/__tests__/nfc.test.js
- [ ] T053 [P] [US3] Integration test for DELETE with non-existent chip (returns 404) in backend/src/routes/__tests__/nfc.test.js
- [ ] T054 [P] [US3] Integration test for DELETE with chip owned by another user (returns 404) in backend/src/routes/__tests__/nfc.test.js
- [ ] T055 [P] [US3] Integration test for cascading deletion of video_nfc_mappings in backend/src/routes/__tests__/nfc.test.js
- [ ] T056 [P] [US3] Integration test for rate limiting on DELETE endpoint (returns 429) in backend/src/routes/__tests__/nfc.test.js
- [ ] T057 [P] [US3] React component test for ChipList rendering chips in frontend/src/components/nfc/__tests__/ChipList.test.tsx
- [ ] T058 [P] [US3] React component test for ChipList delete button and confirmation modal in frontend/src/components/nfc/__tests__/ChipList.test.tsx
- [ ] T059 [P] [US3] React component test for ChipList optimistic updates in frontend/src/components/nfc/__tests__/ChipList.test.tsx

### Implementation for User Story 3

- [ ] T060 [US3] Apply rate limiting to DELETE /api/nfc/chips/:chipId endpoint in backend/src/routes/nfc.js
- [ ] T061 [US3] Add Sentry logging for deletion errors to DELETE endpoint in backend/src/routes/nfc.js
- [ ] T062 [US3] Verify CASCADE deletion works for video_nfc_mappings (should already exist)
- [ ] T063 [US3] Add delete functionality to ChipList component with confirmation modal
- [ ] T064 [US3] Integrate delete with NFCChipContext for state management
- [ ] T065 [US3] Add optimistic updates (remove from UI immediately, rollback on error)
- [ ] T066 [US3] Add loading state during deletion
- [ ] T067 [US3] Add error handling for deletion failures (404, 500)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: End-to-End Testing & Integration

**Purpose**: Comprehensive E2E tests for all user workflows

- [ ] T068 [P] E2E test: Complete manual registration workflow (login → navigate → fill form → submit → verify list) in tests/e2e/nfc-chip-registration.spec.js
- [ ] T069 [P] E2E test: Duplicate chip registration blocked with error message in tests/e2e/nfc-chip-registration.spec.js
- [ ] T070 [P] E2E test: Cross-user duplicate registration (User A registers chip, User B cannot register same chip) in tests/e2e/nfc-chip-registration.spec.js
- [ ] T071 [P] E2E test: Invalid chip_uid format rejected with validation error in tests/e2e/nfc-chip-registration.spec.js
- [ ] T072 [P] E2E test: Empty/invalid label rejected with validation error in tests/e2e/nfc-chip-registration.spec.js
- [ ] T073 [P] E2E test: Maximum chip limit enforcement (register 20 chips, 21st fails with 403) in tests/e2e/nfc-chip-registration.spec.js
- [ ] T074 [P] E2E test: NFC scan workflow with mocked NDEFReader in tests/e2e/nfc-chip-registration.spec.js
- [ ] T075 [P] E2E test: Chip deletion with confirmation and persistence in tests/e2e/nfc-chip-registration.spec.js

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T076 [P] Add CSRF token validation to POST and DELETE endpoints in backend/src/middleware/csrf.js
- [ ] T077 [P] Update API documentation with new rate limits and error codes in docs/api/nfc-endpoints.md
- [ ] T078 Code review and refactoring for consistency across all NFC components
- [ ] T079 Accessibility audit (keyboard navigation, ARIA labels, screen reader support)
- [ ] T080 [P] Verify 80% code coverage requirement met (Constitution mandate) via npm run test:coverage
- [ ] T081 Security review (timing attack mitigation, UID enumeration prevention)
- [ ] T082 Performance testing (POST <2s, GET <1s, DELETE <2s)
- [ ] T083 Run quickstart.md validation workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **E2E Testing (Phase 6)**: Depends on all user stories being complete
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 form but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses ChipList from US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD red-green-refactor)
- Backend tests before backend implementation
- Frontend tests before frontend implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup verification tasks (T001-T005) can run in parallel
- All Foundational tasks marked [P] can run in parallel within Phase 2
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- All E2E tests (T068-T075) can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all backend unit tests for User Story 1 together:
Task: "Unit test for chip count validation (max 20) in backend/src/middleware/__tests__/chipLimitValidator.test.js"
Task: "Unit test for chip UID normalization (colons, spaces, hyphens) in backend/src/routes/__tests__/nfcValidation.test.js"
Task: "Unit test for label sanitization (HTML encoding, character allowlist) in backend/src/routes/__tests__/nfcValidation.test.js"

# Launch all backend integration tests for User Story 1 together:
Task: "Integration test for POST /api/nfc/chips with valid data (returns 201) in backend/src/routes/__tests__/nfc.test.js"
Task: "Integration test for POST /api/nfc/chips with duplicate chip_uid (returns 409) in backend/src/routes/__tests__/nfc.test.js"
Task: "Integration test for POST /api/nfc/chips with invalid label (returns 400) in backend/src/routes/__tests__/nfc.test.js"
Task: "Integration test for POST /api/nfc/chips exceeding 20 chip limit (returns 403) in backend/src/routes/__tests__/nfc.test.js"
Task: "Integration test for rate limiting on POST endpoint (returns 429) in backend/src/routes/__tests__/nfc.test.js"

# Launch all frontend component tests for User Story 1 together:
Task: "React component test for ChipRegistrationForm validation in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx"
Task: "React component test for ChipRegistrationForm submission in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx"
Task: "React component test for ChipRegistrationForm error display in frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all frontend unit tests for User Story 2 together:
Task: "Unit test for NDEFReader feature detection in frontend/src/utils/__tests__/nfcCapability.test.ts"
Task: "Unit test for NFC scan timeout (30 seconds) in frontend/src/utils/__tests__/nfcScanner.test.ts"
Task: "Unit test for NFC error handling (permission denied, disabled, invalid tag) in frontend/src/utils/__tests__/nfcScanner.test.ts"

# Launch all frontend component tests for User Story 2 together:
Task: "React component test for NFCScanButton visibility based on device capability in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx"
Task: "React component test for NFCScanButton scan workflow in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx"
Task: "React component test for NFCScanButton error states in frontend/src/components/nfc/__tests__/NFCScanButton.test.tsx"

# Launch parallel implementation tasks for User Story 2:
Task: "Create nfcCapability utility with NDEFReader detection in frontend/src/utils/nfcCapability.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify existing infrastructure)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (manual registration)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Manual Registration)
   - Developer B: User Story 2 (NFC Scan)
   - Developer C: User Story 3 (Chip Management)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (RED-GREEN-REFACTOR)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend already has 80% of infrastructure (UNIQUE constraints, CASCADE deletion, basic validation)
- Focus implementation effort on: DELETE endpoint, chip count limit, rate limiting, frontend components, Web NFC integration
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
