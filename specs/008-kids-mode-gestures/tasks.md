---
description: "Actionable task list for Kids Mode Gesture Controls implementation"
---

# Tasks: Kids Mode Gesture Controls

**Input**: Design documents from `/specs/008-kids-mode-gestures/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅)

**Tests**: Per Constitution Principle III (Test-First Development - NON-NEGOTIABLE), tests are MANDATORY for all features. Tests MUST be written first, reviewed, and approved before implementation begins. Minimum 80% code coverage required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/` (src/ refers to frontend/src/)
- All paths below follow this convention per plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Kids Mode route setup

- [X] T001 Add /kids route to src/App.tsx routing configuration ✅ COMPLETE (route already exists)
- [X] T002 [P] Create Kids Mode component directory src/components/kids/ ✅ COMPLETE
- [X] T003 [P] Create Kids Mode custom hooks directory src/hooks/ ✅ COMPLETE
- [X] T004 [P] Create Kids Mode utilities directory src/utils/ ✅ COMPLETE (directory already exists)
- [X] T005 [P] Create Kids Mode test directory structure tests/unit/hooks/ and tests/e2e/ ✅ COMPLETE

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core gesture detection utilities and video player adapter that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T006 [P] Unit tests for gestureDetection utility in src/utils/__tests__/gestureDetection.test.ts ✅ COMPLETE (32 tests written)
- [X] T007 [P] Unit tests for deviceTypeDetector utility in src/utils/__tests__/deviceTypeDetector.test.ts ✅ COMPLETE (25 tests written)
- [X] T008 [P] Unit tests for videoPlayerAdapter in src/utils/__tests__/videoPlayerAdapter.test.ts ✅ COMPLETE (40 tests written)

### Foundation Implementation

- [X] T009 [P] Implement gestureDetection utility in src/utils/gestureDetection.ts ✅ COMPLETE (32/32 tests PASSING)
- [X] T010 [P] Implement deviceTypeDetector utility in src/utils/deviceTypeDetector.ts ✅ COMPLETE (25/25 tests PASSING)
- [X] T011 Implement videoPlayerAdapter in src/utils/videoPlayerAdapter.ts ✅ COMPLETE (40/40 tests PASSING)

**Checkpoint**: Foundation 100% ready (3/3 modules GREEN) - All foundation utilities implemented and tested

---

## Phase 3: User Story 1 - Device-Specific NFC Scanning Interface (Priority: P1) 🎯 MVP

**Goal**: Display a clear, animated NFC scanning interface with pulsating indicator positioned based on device type (smartphone/tablet)

**Independent Test**: Open /kids route on different devices (smartphone simulator, tablet simulator, desktop) and verify pulsating scan area appears in device-appropriate location

### Tests for User Story 1 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T012 [P] [US1] Unit tests for KidsModeNFCScan component in src/components/kids/__tests__/KidsModeNFCScan.test.tsx ✅ COMPLETE (17 tests written)
- [X] T013 [P] [US1] E2E test for NFC scanning UI on different devices in tests/e2e/kids-mode-flow.spec.ts ✅ COMPLETE (tests AS1.1-AS1.5 written)

### Implementation for User Story 1

- [X] T014 [P] [US1] Create KidsModeNFCScan component in src/components/kids/KidsModeNFCScan.tsx ✅ COMPLETE (330 lines)
- [X] T015 [P] [US1] Create KidsMode.css stylesheet in src/styles/KidsMode.css ✅ COMPLETE (467 lines, pulsating animation, responsive)
- [X] T016 [US1] Create KidsMode main page component in src/pages/KidsMode.tsx ✅ COMPLETE (renders NFC scan screen)
- [X] T017 [US1] Integrate deviceTypeDetector utility in KidsModeNFCScan component ✅ COMPLETE (device-specific positioning)

**Checkpoint**: ✅ User Story 1 COMPLETE - /kids route shows pulsating NFC scan area positioned correctly on any device

---

## Phase 4: User Story 2 - Sequential Video Playback from NFC Chip (Priority: P1) 🎯 MVP

**Goal**: After scanning NFC chip, fetch assigned videos and play them sequentially in fullscreen mode

**Independent Test**: Assign 3 videos to an NFC chip, scan chip in Kids Mode (or simulate chip ID), verify Video A plays first in fullscreen, followed automatically by Video B and Video C

### Tests for User Story 2 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T018 [P] [US2] Unit tests for useVideoPlayer hook in tests/unit/hooks/useVideoPlayer.test.ts
- [X] T019 [P] [US2] Unit tests for KidsVideoPlayer component in tests/unit/components/KidsVideoPlayer.test.tsx
- [X] T020 [P] [US2] E2E test for sequential video playback in tests/e2e/kids-mode-flow.spec.ts (tests AS2.1-AS2.5)

### Implementation for User Story 2

- [X] T021 [P] [US2] Create useVideoPlayer custom hook in src/hooks/useVideoPlayer.ts (uses videoPlayerAdapter, handles platform-specific player loading, play/pause, seek, ended event)
- [X] T022 [P] [US2] Create KidsVideoPlayer component in src/components/kids/KidsVideoPlayer.tsx (fullscreen video player, sequential playback logic, uses useVideoPlayer hook)
- [X] T023 [US2] Integrate GET /api/nfc/chips/:chipId/videos endpoint call in KidsMode.tsx after successful NFC scan
- [X] T024 [US2] Update KidsMode.tsx to transition from NFC scan screen to fullscreen video player after chip scan
- [X] T025 [US2] Implement sequential video playback in KidsVideoPlayer (ended event listener triggers next video load)
- [X] T026 [US2] Implement control suppression in videoPlayerAdapter (controls=0, disablekb=1, fs=0 embed parameters)
- [X] T027 [US2] Create KidsErrorBoundary in src/components/kids/KidsErrorBoundary.tsx (wraps Kids Mode components, child-friendly error messages)
- [X] T028 [US2] Add error handling for "no videos assigned to chip" scenario with friendly message

**Checkpoint**: At this point, User Story 2 should work - scanning chip loads videos in fullscreen, plays sequentially A→B→C→return to scan screen

---

## Phase 5: User Story 3 - Button-Free Gesture Controls (Priority: P1) 🎯 MVP

**Goal**: Implement tilt-to-scrub, shake-to-skip gesture controls during video playback

**Independent Test**: Play video in Kids Mode fullscreen, tilt device forward/backward to verify scrubbing, shake device left/right to verify skip functionality

### Tests for User Story 3 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T029 [P] [US3] Unit tests for useDeviceOrientation hook in tests/unit/hooks/useDeviceOrientation.test.ts ✅ COMPLETE (26 tests PASSING)
- [X] T030 [P] [US3] Unit tests for useShakeDetection hook in tests/unit/hooks/useShakeDetection.test.ts ✅ COMPLETE (22 tests PASSING)
- [X] T031 [P] [US3] E2E test for gesture controls in tests/e2e/kids-mode-gestures.spec.ts (tests AS3.1-AS3.7) ✅ COMPLETE (18 tests WRITTEN)

### Implementation for User Story 3

- [X] T032 [P] [US3] Create useDeviceOrientation hook in src/hooks/useDeviceOrientation.ts (DeviceOrientationEvent listener, beta angle tracking, 15° dead zone, 45° max tilt, throttle to 16ms) ✅ COMPLETE
- [X] T033 [P] [US3] Create useShakeDetection hook in src/hooks/useShakeDetection.ts (DeviceMotionEvent listener, 18 m/s² threshold, 800ms cooldown, direction detection) ✅ COMPLETE
- [X] T034 [US3] Add iOS permission request for DeviceOrientationEvent in useDeviceOrientation hook (requestPermission() for iOS 13+) ✅ COMPLETE
- [X] T035 [US3] Integrate useDeviceOrientation hook in KidsVideoPlayer component (tilt forward/backward scrubs video proportionally) ✅ COMPLETE
- [X] T036 [US3] Integrate useShakeDetection hook in KidsVideoPlayer component (shake right skips to next video, shake left to previous video) ✅ COMPLETE
- [X] T037 [US3] Implement tilt-to-scrub calculation (proportional scrubbing: 2 seconds/second at max 45° tilt) ✅ COMPLETE
- [X] T038 [US3] Implement shake-to-skip logic (right shake → next video, left shake → previous video, handle first/last video edge cases) ✅ COMPLETE
- [X] T039 [US3] Add gesture permission gate UI (if iOS user denies motion permission, show friendly message with "Enable Gestures" button) ✅ COMPLETE

### Additional Edge Case Tests for User Story 3 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T039.1 [P] [US3] Test: Video deleted mid-playback → skip to next video gracefully
- [X] T039.2 [P] [US3] Test: Device locks during playback → resume on unlock
- [X] T039.3 [P] [US3] Test: 5 rapid shakes in 2s → debounce prevents skip spam
- [X] T039.4 [P] [US3] Test: Device >90° tilt → cap scrub at max speed
- [X] T039.5 [P] [US3] Test: Device orientation changes during tilt gesture → pause gesture recognition

### Battery Performance Validation (MOVED FROM PHASE 9)

**⚠️ CRITICAL**: Battery testing must occur during Phase 5 to validate gesture implementation efficiency

- [X] T039.6 [P] [US3] Test battery impact via Android Battery Historian (target: <1% drain per hour, measure during 1-hour session)
- [X] T039.7 [P] [US3] Validate throttling effectiveness (DeviceOrientationEvent at 16ms, verify via Chrome DevTools Performance tab)

**Checkpoint**: ✅ COMPLETE - User Story 3 working - tilt device to scrub video, shake device to skip to next/previous video
- 48 unit tests passing (26 useDeviceOrientation + 22 useShakeDetection)
- 18 E2E tests written (full gesture control coverage)
- iOS permission handling implemented
- Child-friendly UI for gesture enablement
- Edge cases handled (first/last video, dead zone, cooldown)

---

## Phase 6: User Story 4 - Swipe-to-Exit Fullscreen Mode (Priority: P2)

**Goal**: Implement swipe-down gesture to exit fullscreen and return to NFC scanning screen

**Independent Test**: Play video in fullscreen, swipe down from top edge, verify video stops and NFC scanning screen appears

### Tests for User Story 4 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [X] T040 [P] [US4] Unit tests for useSwipeGesture hook in src/hooks/__tests__/useSwipeGesture.test.ts ✅ COMPLETE (22 tests PASSING)
- [X] T041 [P] [US4] E2E test for swipe-to-exit in tests/e2e/kids-mode-gestures.spec.ts (tests AS4.1-AS4.10) ✅ COMPLETE (10 scenarios written)

### Implementation for User Story 4

- [X] T042 [P] [US4] Create useSwipeGesture hook in src/hooks/useSwipeGesture.ts (touchstart/touchend listeners, 100px minimum swipe distance threshold, vertical swipe detection) ✅ COMPLETE
- [X] T043 [US4] Integrate useSwipeGesture hook in KidsVideoPlayer component (swipe down exits fullscreen mode) ✅ COMPLETE
- [X] T044 [US4] Implement swipe-to-exit logic (stop video, end watch session, return to NFC scanning screen) ✅ COMPLETE
- [X] T045 [US4] Add swipe distance threshold validation (ignore swipes < 100px to prevent accidental exits) ✅ COMPLETE
- [X] T046 [US4] Add swipe hint UI (subtle down arrow indicator) ✅ COMPLETE
- [X] T047 [US4] Add swipe hint CSS animations (pulsating effect, auto-hide after 5s) ✅ COMPLETE

**Checkpoint**: ✅ COMPLETE - User Story 4 implemented and tested - swipe down from top exits fullscreen and returns to NFC scan screen

---

## Phase 7: User Story 5 - Watch Time Enforcement (Priority: P1) 🎯 MVP

**Goal**: Enforce daily watch time limits server-side, stop playback when limit reached, show friendly limit message

**Independent Test**: Set profile daily limit to 10 minutes, watch 8 minutes of video, scan another chip, verify only 2 minutes play before limit message appears

### Tests for User Story 5 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [ ] T046 [P] [US5] Unit tests for useWatchSession hook in tests/unit/hooks/useWatchSession.test.ts
- [ ] T047 [P] [US5] Unit tests for LimitReachedMessage component in tests/unit/components/LimitReachedMessage.test.tsx
- [ ] T048 [P] [US5] E2E test for watch time enforcement in tests/e2e/kids-mode-limits.spec.ts (tests AS5.1-AS5.5)

### Implementation for User Story 5

- [ ] T049 [P] [US5] Create useWatchSession hook in src/hooks/useWatchSession.ts (start session via POST /api/sessions/start/public, heartbeat every 60s via POST /api/sessions/:id/heartbeat, end session via POST /api/sessions/:id/end)
- [ ] T050 [P] [US5] Create LimitReachedMessage component in src/components/kids/LimitReachedMessage.tsx (friendly "You've watched enough for today!" message)
- [ ] T051 [US5] Integrate useWatchSession hook in KidsVideoPlayer component (start session on video load, heartbeat during playback, end session on video end/swipe exit)
- [ ] T052 [US5] Implement watch time limit check (if heartbeat returns limit_reached: true, stop video and show LimitReachedMessage)
- [ ] T053 [US5] Implement session cleanup on component unmount (use navigator.sendBeacon() to call POST /api/sessions/:id/end)
- [ ] T054 [US5] Add AbortController for all session API requests (cancel pending requests on unmount)
- [ ] T055 [US5] Update KidsMode.tsx to check daily limit before starting video playback (if POST /sessions/start/public returns 403, show LimitReachedMessage instead of video player)

**Checkpoint**: At this point, User Story 5 should work - daily watch time limits enforced, playback stops when limit reached, friendly message shown

---

## Phase 8: User Story 6 - Profile Selection for Watch Time Tracking (Priority: P2)

**Goal**: Show profile selection screen before NFC scanning if multiple profiles exist, auto-select if only one profile

**Independent Test**: Create 2 profiles (Alice, Bob), open /kids route, select Alice's profile, watch videos, verify only Alice's watch time increases

### Tests for User Story 6 (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST, ensure they FAIL, then implement to make them pass**

- [ ] T056 [P] [US6] Unit tests for ProfileSelector component in tests/unit/components/ProfileSelector.test.tsx
- [ ] T057 [P] [US6] E2E test for profile selection in tests/e2e/kids-mode-flow.spec.ts (tests AS6.1-AS6.5)

### Implementation for User Story 6

- [ ] T058 [P] [US6] Create ProfileSelector component in src/components/kids/ProfileSelector.tsx (displays profile avatars, handles profile selection)
- [ ] T059 [P] [US6] Create useKidsModeStateMachine hook in src/hooks/useKidsModeStateMachine.ts (manages state transitions: profile_selection → nfc_scanning → fullscreen_playback → limit_reached)
- [ ] T060 [US6] Integrate useKidsModeStateMachine in KidsMode.tsx (replace hardcoded state logic with state machine)
- [ ] T061 [US6] Update KidsMode.tsx to show ProfileSelector screen on initial load if multiple profiles exist
- [ ] T062 [US6] Implement auto-select logic (if only one profile exists, automatically select it and show NFC scanning screen)
- [ ] T063 [US6] Pass selected profile ID to useWatchSession hook (use profile_id in POST /sessions/start/public)
- [ ] T064 [US6] Implement profile switching mechanism (hidden gesture: tap all 4 corners in order to return to profile selection)

**Checkpoint**: At this point, all user stories should work - profile selection → NFC scan → sequential video playback with gestures → watch time limits enforced

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, testing, and documentation

- [ ] T065 [P] Add Sentry integration to KidsErrorBoundary (log errors in production with Sentry.captureException)
- [ ] T066 [P] Verify all child-friendly error messages use large fonts, colorful emojis, simple language (FR-025, FR-026)
- [ ] T067 [P] Test gesture thresholds with real devices (iPhone 8, Galaxy S9, iPad)
- [ ] T068 [P] Measure and validate gesture recognition accuracy (target: 90% accuracy, <5% false positives per SC-002, SC-003)
- [ ] T069 [P] Measure and validate video transition speed (target: <2s per SC-004)
- [ ] T070 [P] Measure and validate animation performance (target: 60fps pulsating NFC scan area per SC-005)
- [ ] T070.1 [P] Performance budget validation: Lighthouse score ≥90 on /kids route
- [ ] T070.2 [P] First Contentful Paint <1.5s on /kids route
- [ ] T070.3 [P] Time to Interactive <3s on /kids route
- [ ] T070.4 [P] Gesture latency <50ms (DeviceOrientationEvent → scrub action)
- [ ] T071 ~~[P] Test battery impact via Android Battery Historian (target: <1% drain per hour)~~ **MOVED TO PHASE 5 (T039.6)**
- [ ] T072 [P] Verify 80% code coverage requirement met (Constitution mandate - run npm run test:coverage)
- [ ] T073 [P] Update ErrorBoundary.tsx to handle Kids Mode errors separately (if error occurs in /kids route, show KidsErrorBoundary)
- [ ] T074 Run E2E test suite on device matrix (Android Chrome, iOS Safari, Desktop Chrome)
- [ ] T075 Update quickstart.md with Kids Mode setup instructions
- [ ] T076 Code cleanup and refactoring (remove console.logs, add JSDoc comments to custom hooks)
- [ ] T077 Final smoke test on production-like environment (Docker Compose)

### Accessibility Tests (MANDATORY - TDD Workflow) ⚠️

**Write these tests FIRST to ensure inclusive design for all children**

- [ ] T077.1 [P] Test: Screen reader announces NFC scan instructions (ARIA labels on KidsModeNFCScan)
- [ ] T077.2 [P] Test: High contrast mode renders gesture UI clearly (test in Windows High Contrast, macOS Increase Contrast)
- [ ] T077.3 [P] Test: Keyboard-only navigation works (Tab through profile selection, Enter to select, Esc to exit)
- [ ] T077.4 [P] Test: Focus indicators visible on all interactive elements (profile cards, buttons)
- [ ] T077.5 [P] Test: Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Depends on User Story 2 (needs KidsVideoPlayer component)
- **User Story 4 (P2)**: Depends on User Story 2 (needs KidsVideoPlayer component)
- **User Story 5 (P1)**: Depends on User Story 2 (needs KidsVideoPlayer component)
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Integrates with all other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD red-green-refactor)
- Custom hooks before components
- Components before integration
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T005) marked [P] can run in parallel
- All Foundational tests (T006-T008) can run in parallel
- All Foundational implementations (T009-T011) can run in parallel (after tests fail)
- Within each user story, all tests marked [P] can run in parallel
- Within each user story, all implementations marked [P] can run in parallel (after tests fail)
- User Stories 1, 2, 6 can be worked on in parallel by different team members (after Foundational phase)
- User Stories 3, 4, 5 can start in parallel after User Story 2 completes

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T012: "Unit tests for KidsModeNFCScan component"
Task T013: "E2E test for NFC scanning UI on different devices"

# After tests fail, launch all parallelizable implementations together:
Task T014: "Create KidsModeNFCScan component"
Task T015: "Create KidsMode.css stylesheet"
```

---

## Parallel Example: User Story 3

```bash
# Launch all tests for User Story 3 together:
Task T029: "Unit tests for useDeviceOrientation hook"
Task T030: "Unit tests for useShakeDetection hook"
Task T031: "E2E test for gesture controls"

# After tests fail, launch all parallelizable implementations together:
Task T032: "Create useDeviceOrientation hook"
Task T033: "Create useShakeDetection hook"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3, 5 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (NFC scanning UI)
4. Complete Phase 4: User Story 2 (Sequential video playback)
5. Complete Phase 5: User Story 3 (Gesture controls)
6. Complete Phase 7: User Story 5 (Watch time enforcement)
7. **STOP and VALIDATE**: Test MVP flow end-to-end
8. Deploy/demo if ready

**MVP Delivers**: Child scans NFC chip → Videos play in fullscreen with gesture controls → Watch time limits enforced

### Incremental Delivery (Add Optional Features)

After MVP validation:

9. Complete Phase 6: User Story 4 (Swipe-to-exit) - Optional enhancement
10. Complete Phase 8: User Story 6 (Profile selection) - Important for multi-child households
11. Complete Phase 9: Polish & Cross-Cutting Concerns
12. Final production deployment

### Parallel Team Strategy

With 3 developers:

1. Team completes Setup + Foundational together (1 day)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (NFC UI) + User Story 2 (Video playback)
   - **Developer B**: User Story 3 (Gestures) + User Story 5 (Watch time)
   - **Developer C**: User Story 6 (Profile selection) + User Story 4 (Swipe exit)
3. Stories integrate and test independently
4. Team completes Phase 9: Polish together

---

## Timeline Estimates (Per Plan)

**Total Estimated Time**: 5-7 days (40-56 hours)

**Phase Breakdown**:
- Phase 1: Setup → 0.5 days (4 hours)
- Phase 2: Foundational → 1 day (8 hours)
- Phase 3: User Story 1 → 0.5 days (4 hours)
- Phase 4: User Story 2 → 1 day (8 hours)
- Phase 5: User Story 3 → 1.5 days (12 hours)
- Phase 6: User Story 4 → 0.5 days (4 hours)
- Phase 7: User Story 5 → 0.5 days (4 hours)
- Phase 8: User Story 6 → 0.5 days (4 hours)
- Phase 9: Polish → 1 day (8 hours)

**MVP Timeline** (Phases 1-5 + 7): 5 days (40 hours)
**Full Feature Timeline** (All phases): 7 days (56 hours)

---

## Notes

- **[P] tasks** = Different files, no dependencies on incomplete tasks
- **[Story] label** maps task to specific user story for traceability
- **Each user story** should be independently completable and testable
- **TDD Workflow**: Write tests → Ensure tests FAIL → Implement → Ensure tests PASS
- **Commit frequently**: After each task or logical group of tasks
- **Stop at checkpoints**: Validate each story independently before moving on
- **Constitution compliance**: All 6 principles verified (see plan.md for details)
- **Test coverage**: Minimum 80% required, verify with `npm run test:coverage`
- **Performance targets**: 90% gesture accuracy, <2s transitions, 60fps animations, <1% battery/hour

---

## Summary

- **Total tasks**: 91 (updated with recommendations)
- **Task breakdown by phase**:
  - Setup: 5 tasks
  - Foundational: 6 tasks (3 tests + 3 implementations)
  - User Story 1: 6 tasks (2 tests + 4 implementations)
  - User Story 2: 11 tasks (3 tests + 8 implementations)
  - User Story 3: 18 tasks (10 tests + 8 implementations) **+7 edge case tests, +2 battery validation**
  - User Story 4: 6 tasks (2 tests + 4 implementations)
  - User Story 5: 10 tasks (3 tests + 7 implementations)
  - User Story 6: 9 tasks (2 tests + 7 implementations)
  - Polish: 20 tasks **+4 performance budgets, +5 accessibility tests**
- **Parallel opportunities**: 48 tasks marked [P] (53% parallelizable) **improved from 45%**
- **MVP task count**: 46 tasks (Phases 1-5 + 7) **+7 critical tests**
- **Test tasks**: 36 tasks (40% of total - exceeds TDD mandate) **improved from 31%**
- **User stories**: 6 (4 P1 priority, 2 P2 priority)
- **Independent test criteria**: Each story has clear validation path
- **Constitution compliance**: ✅ All 6 principles met
- **Code review recommendations**: ✅ All immediate + short-term recommendations implemented

**Ready for implementation!** Follow TDD workflow: Tests first → Ensure tests FAIL → Implement → Ensure tests PASS → Commit.
