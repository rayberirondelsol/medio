# Implementation Plan: Kids Mode Gesture Controls

**Branch**: `008-kids-mode-gestures` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-kids-mode-gestures/spec.md`

---

## Summary

Implement a child-friendly video playback interface at `/kids` route with device-specific NFC scanning UI, sequential video playback from registered NFC chips, and button-free gesture controls (tilt to scrub, shake to skip, swipe to exit). Integrate with existing profile system to enforce daily watch time limits and track watch sessions.

**Key Technical Decisions** (from research phase):
- **Tilt Detection**: DeviceOrientationEvent.beta with 15° dead zone, 45° max tilt, throttled to 60fps
- **Shake Detection**: DeviceMotionEvent with 18 m/s² threshold (child-optimized), 800ms cooldown
- **Video Playback**: YouTube IFrame API, Vimeo Player SDK, Dailymotion SDK (controls hidden via embed params)
- **Fullscreen**: Browser Fullscreen API on container div, orientation lock supported
- **Session Tracking**: 60-second heartbeat interval with `sendBeacon()` cleanup
- **NFC Strategy**: Web NFC API for Android Chrome, manual entry fallback for iOS/desktop

**Estimated Timeline**: 5-7 days (40-56 hours)

---

## Technical Context

**Language/Version**: TypeScript 4.9.5, React 19.1.1, Node.js 16+
**Primary Dependencies**: lodash (throttle/debounce), @vimeo/player, react-youtube, YouTube IFrame API, Dailymotion SDK
**Storage**: PostgreSQL 14+ (existing schema, no new tables)
**Testing**: Jest 29 + React Testing Library + Playwright
**Target Platform**: Web browsers (Chrome 89+, Safari 13+, mobile + desktop)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 60fps gesture recognition, <2s video transitions, <50ms gesture latency
**Constraints**: <1% battery drain per hour, 90% gesture accuracy, <5% false positive rate
**Scale/Scope**: 6 user stories, 30 functional requirements, 8 new components, 7 custom hooks, 3 API endpoints (existing)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with Medio Constitution v1.0.0:

- ✅ **Child Safety First**:
  - Daily watch time limits enforced server-side (FR-020)
  - Profile-based tracking prevents sibling quota sharing (FR-019)
  - No direct data collection from children (sessions tied to parent account)
  - Age-appropriate content enforced via existing video library curation
  - **Compliance**: Full

- ✅ **Context-Driven Architecture**:
  - Kids Mode uses existing React Context (AuthContext for parent account, ProfileContext for selected profile)
  - No Redux, Zustand, or external state management introduced
  - **Compliance**: Full

- ✅ **Test-First Development**:
  - All custom hooks require unit tests BEFORE implementation (TDD red-green-refactor)
  - E2E tests for complete flow (profile selection → NFC scan → video playback → limit enforcement)
  - Minimum 80% code coverage enforced
  - **Compliance**: Full (TDD workflow mandatory in tasks.md)

- ✅ **Error Resilience**:
  - KidsErrorBoundary wraps all Kids Mode components (FR-025)
  - AbortController for all API requests (session start, heartbeat, end)
  - Graceful degradation when sensors unavailable (fallback to button controls)
  - Network errors return user to NFC scanning screen (FR-029)
  - **Compliance**: Full

- ✅ **Docker-First Development**:
  - Feature uses existing Docker Compose setup (postgres + backend + frontend proxy)
  - No host-specific dependencies (all browser APIs)
  - `make dev` workflow unchanged
  - **Compliance**: Full

- ✅ **NFC Security & Session Management**:
  - NFC chip UIDs validated server-side (existing, spec 005)
  - Session heartbeat mechanism: 60-second intervals (FR-019)
  - Session cleanup via `navigator.sendBeacon()` on unmount
  - Daily limits enforced server-side with tamper-proof tracking (FR-020)
  - **Compliance**: Full

**Technology Constraints Check**:
- ✅ React 19 + TypeScript 4.9 + CRA (no ejecting)
- ✅ Auth via httpOnly cookies only (Kids Mode uses existing auth, no new tokens)
- ✅ Testing with Jest + React Testing Library + Playwright
- ✅ Sentry configured for error tracking (ErrorBoundary logs to Sentry in production)

**Violations**: None

---

## Project Structure

### Documentation (this feature)

```
specs/008-kids-mode-gestures/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (COMPLETE)
├── research.md          # Technical research (COMPLETE - 1955 lines)
├── data-model.md        # Data entities & relationships (COMPLETE)
├── quickstart.md        # Developer onboarding guide (COMPLETE)
├── contracts/
│   ├── kids-mode-api.yaml        # OpenAPI spec for endpoints (COMPLETE)
│   └── gesture-interfaces.ts     # TypeScript type contracts (COMPLETE)
├── checklists/
│   └── requirements.md           # Requirements checklist (COMPLETE)
└── tasks.md             # Actionable tasks (PENDING - created by /speckit.tasks)
```

### Source Code (repository root)

**Option 2: Web application** (frontend + backend)

```
backend/
├── src/
│   ├── routes/
│   │   ├── nfc.js                    # ✅ EXISTING - GET /api/nfc/chips/:chipId/videos
│   │   └── sessions.js               # ✅ EXISTING - POST /api/sessions/start/public, /heartbeat, /end
│   ├── middleware/
│   │   └── rateLimiter.js            # ✅ EXISTING - Rate limiting
│   └── services/
│       ├── youtubeService.js         # ✅ EXISTING - YouTube API integration
│       ├── vimeoService.js           # ✅ EXISTING - Vimeo API integration
│       └── dailymotionService.js     # ✅ EXISTING - Dailymotion API integration
├── init.sql                          # ✅ EXISTING - Schema with sequence_order column
└── tests/
    └── integration/
        └── kids-mode-api.test.js     # 🆕 NEW - Kids Mode API tests

frontend/ (src/)
├── pages/
│   └── KidsMode.tsx                  # 🆕 NEW - Main Kids Mode page (/kids route)
├── components/
│   ├── common/
│   │   └── ErrorBoundary.tsx         # ✅ EXISTING - Wrap Kids Mode
│   └── kids/
│       ├── KidsModeNFCScan.tsx       # 🆕 NEW - NFC scanning UI with pulsating indicator
│       ├── KidsVideoPlayer.tsx       # 🆕 NEW - Fullscreen video player with gestures
│       ├── ProfileSelector.tsx       # 🆕 NEW - Profile selection screen
│       ├── LimitReachedMessage.tsx   # 🆕 NEW - Daily limit message
│       └── KidsErrorBoundary.tsx     # 🆕 NEW - Kids-specific error boundary
├── hooks/
│   ├── useDeviceOrientation.ts       # 🆕 NEW - Tilt gesture detection
│   ├── useShakeDetection.ts          # 🆕 NEW - Shake gesture detection
│   ├── useSwipeGesture.ts            # 🆕 NEW - Swipe gesture detection
│   ├── useVideoPlayer.ts             # 🆕 NEW - Platform-agnostic video player
│   ├── useWatchSession.ts            # 🆕 NEW - Session tracking with heartbeat
│   └── useKidsModeStateMachine.ts    # 🆕 NEW - State machine for Kids Mode flow
├── utils/
│   ├── videoPlayerAdapter.ts         # 🆕 NEW - Unified player (YouTube/Vimeo/Dailymotion)
│   ├── gestureDetection.ts           # 🆕 NEW - Gesture threshold calculations
│   └── deviceTypeDetector.ts         # 🆕 NEW - Smartphone vs tablet vs desktop
├── styles/
│   └── KidsMode.css                  # 🆕 NEW - Kids Mode-specific styles
└── App.tsx                           # ✅ MODIFY - Add /kids route

tests/
├── unit/
│   ├── hooks/
│   │   ├── useDeviceOrientation.test.ts      # 🆕 NEW - Unit tests for tilt detection
│   │   ├── useShakeDetection.test.ts         # 🆕 NEW - Unit tests for shake detection
│   │   ├── useSwipeGesture.test.ts           # 🆕 NEW - Unit tests for swipe detection
│   │   ├── useVideoPlayer.test.ts            # 🆕 NEW - Unit tests for video player
│   │   └── useWatchSession.test.ts           # 🆕 NEW - Unit tests for session tracking
│   └── utils/
│       ├── videoPlayerAdapter.test.ts        # 🆕 NEW - Unit tests for player adapter
│       └── gestureDetection.test.ts          # 🆕 NEW - Unit tests for gesture calculations
└── e2e/
    ├── kids-mode-flow.spec.ts                # 🆕 NEW - E2E: Full Kids Mode flow
    ├── kids-mode-gestures.spec.ts            # 🆕 NEW - E2E: Gesture interactions
    └── kids-mode-limits.spec.ts              # 🆕 NEW - E2E: Watch time enforcement
```

**Structure Decision**: Web application (Option 2) selected because this is a React frontend + Node.js backend project. Frontend changes are UI-focused (new `/kids` route + components), backend changes are minimal (existing endpoints used, no new routes required).

**File Count**:
- 🆕 **New files**: 21 (8 components, 7 hooks, 3 utils, 3 styles, 8 tests, 1 route)
- ✅ **Modified files**: 2 (App.tsx for route, ErrorBoundary.tsx for Kids-specific handling)
- ✅ **Existing files used as-is**: 8 (backend routes, services, database schema)

---

## Complexity Tracking

*No Constitution violations. This section is empty.*

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ COMPLETE

All technical unknowns resolved in [research.md](./research.md). Key decisions documented:

### Decision 1: Tilt Detection (DeviceOrientationEvent.beta)
- **Approach**: Beta angle (-180° to 180°) for front-to-back tilt
- **Thresholds**: 15° dead zone, 45° max tilt, proportional scrubbing (2 seconds/second at max tilt)
- **Performance**: Throttle to 16ms (60fps) using lodash.throttle
- **iOS Permission**: Requires `DeviceOrientationEvent.requestPermission()` on iOS 13+
- **Rationale**: Most intuitive for children (physical metaphor of tilting forward/backward)

### Decision 2: Shake Detection (DeviceMotionEvent.acceleration)
- **Approach**: X-axis acceleration threshold with multi-sample consistency check
- **Thresholds**: 18 m/s² (child-optimized, 50% higher than adult standard)
- **Cooldown**: 800ms debounce prevents double-triggers (reduces from 35% to 1.2%)
- **Direction**: Average X-axis sign over 150ms window (96% accuracy)
- **Rationale**: Children shake more vigorously than adults; higher threshold reduces false positives

### Decision 3: Fullscreen Video Playback (iframe Player APIs)
- **Approach**: YouTube IFrame API, Vimeo Player SDK, Dailymotion Player API
- **Control Suppression**: `controls=0`, `disablekb=1`, `fs=0` embed parameters
- **Autoplay Strategy**: Start muted, unmute after user gesture (NFC scan tap)
- **Sequential Playback**: `ended` event listener triggers next video load
- **Rationale**: Platforms don't provide direct video files; iframe APIs offer programmatic control

### Decision 4: NFC Web API Strategy
- **Primary**: Web NFC API (NDEFReader) for Android Chrome/Edge 89+
- **Fallback**: Manual chip UID entry for iOS Safari, desktop browsers
- **Future Enhancement**: QR code scanner for iOS (optional, spec mentions)
- **Rationale**: 45% of users get native NFC experience, 100% get functional fallback

### Decision 5: Watch Session Management
- **Heartbeat Interval**: 60 seconds (balance between accuracy and battery impact)
- **Cleanup Mechanism**: `navigator.sendBeacon()` on component unmount (reliable, per Constitution VI)
- **Daily Limit Check**: Every heartbeat returns `limit_reached` boolean
- **Rationale**: Server-side enforcement prevents client-side tampering, heartbeat provides real-time limit detection

**Research Artifacts**:
- [research.md](./research.md) - 1,955 lines covering all 4 technical areas
- [data-model.md](./data-model.md) - Complete entity relationships, no schema changes required
- [contracts/kids-mode-api.yaml](./contracts/kids-mode-api.yaml) - OpenAPI 3.0 spec for 3 endpoints
- [contracts/gesture-interfaces.ts](./contracts/gesture-interfaces.ts) - 38 TypeScript interfaces
- [quickstart.md](./quickstart.md) - Developer onboarding guide with code examples

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Data Model

**Key Findings** (from [data-model.md](./data-model.md)):
1. ✅ **No new database tables required** - Kids Mode is a UI layer over existing infrastructure
2. ✅ **Schema changes already applied** - `video_nfc_mappings.sequence_order` added in spec 007
3. ✅ **Existing entities leveraged**: profiles, nfc_chips, videos, watch_sessions, daily_watch_time
4. ✅ **State machines defined**: Kids Mode session state + video playback state
5. ✅ **API contracts defined**: 3 endpoints (all existing, documented in OpenAPI spec)

**Entity Relationships**:
```
User → Profile (1:many)
User → NFC Chip (1:many)
User → Video (1:many)
NFC Chip → Video (many:many via video_nfc_mappings with sequence_order)
Profile → Watch Session (1:many)
Profile → Daily Watch Time (1:many)
```

### API Contracts

**Endpoints Used by Kids Mode**:

1. **GET /api/nfc/chips/:chipId/videos**
   - Returns videos ordered by `sequence_order` (1, 2, 3, ...)
   - Used after successful NFC scan to load video playlist
   - Status: ✅ Existing (spec 007)

2. **POST /api/sessions/start/public**
   - Starts watch session with profile_id, video_id, chip_uid
   - Returns `session_id`, `remaining_minutes`, `daily_limit_minutes`
   - Returns 403 if daily limit already reached
   - Status: ✅ Existing (public endpoint, CSRF token only)

3. **POST /api/sessions/:sessionId/heartbeat**
   - Sends heartbeat every 60 seconds during playback
   - Returns `elapsed_seconds`, `remaining_minutes`, `limit_reached`
   - Frontend stops playback if `limit_reached === true`
   - Status: ✅ Existing

4. **POST /api/sessions/:sessionId/end**
   - Ends session with `stopped_reason` and `final_position_seconds`
   - Called on video completion, swipe exit, or limit reached
   - Uses `navigator.sendBeacon()` on component unmount
   - Status: ✅ Existing

**OpenAPI Spec**: [contracts/kids-mode-api.yaml](./contracts/kids-mode-api.yaml)

### TypeScript Interfaces

**38 interfaces defined** in [contracts/gesture-interfaces.ts](./contracts/gesture-interfaces.ts):

**Gesture Detection**:
- `OrientationData`, `TiltState`, `MotionData`, `ShakeGesture`, `SwipeGesture`
- `GestureConfig` with default thresholds

**Video Playback**:
- `IVideoPlayer` (platform-agnostic interface)
- `SequencedVideo`, `VideoPlaybackContext`
- `VideoPlayerState` (idle, loading, playing, paused, scrubbing, transitioning, ended, error)

**Session Management**:
- `WatchSession`, `SessionHeartbeatResponse`, `EndSessionRequest`, `EndSessionResponse`
- `StoppedReason` enum (7 values)

**Kids Mode State Machine**:
- `KidsModeState` (6 states), `KidsModeContext`, `KidsModeAction` (9 action types)

**Custom Hook Return Types**:
- `UseDeviceOrientationReturn`, `UseShakeDetectionReturn`, `UseSwipeGestureReturn`
- `UseVideoPlayerReturn`, `UseWatchSessionReturn`

**Error Types**:
- `GesturePermissionError`, `GestureNotSupportedError`
- `VideoLoadError`, `VideoPlaybackError`
- `SessionLimitReachedError`, `SessionNotFoundError`

---

## Phase 2: Implementation Phases

**Status**: ⏳ PENDING (tasks.md to be generated by `/speckit.tasks`)

### Phase 2.0: Foundation (Hooks & Utilities)

**Duration**: 1.5 days (12 hours)

**Tasks**:
1. Install dependencies (lodash, @vimeo/player, react-youtube)
2. Create `useDeviceOrientation.ts` with iOS permission handling
3. Create `useShakeDetection.ts` with 18 m/s² threshold + 800ms cooldown
4. Create `useSwipeGesture.ts` with touch event handling
5. Create `gestureDetection.ts` utility (threshold calculations)
6. Create `deviceTypeDetector.ts` utility (smartphone/tablet/desktop)
7. Write unit tests for all hooks (TDD - tests BEFORE implementation)

**Dependencies**: None (foundation layer)

**Deliverables**:
- 3 custom hooks with unit tests (>80% coverage)
- 2 utility modules with unit tests
- lodash added to package.json

---

### Phase 2.1: Video Player Adapter Layer

**Duration**: 1 day (8 hours)

**Tasks**:
1. Create `IVideoPlayer` interface implementation
2. Create `YouTubePlayerAdapter` (YouTube IFrame API wrapper)
3. Create `VimeoPlayerAdapter` (Vimeo Player SDK wrapper)
4. Create `DailymotionPlayerAdapter` (Dailymotion SDK wrapper)
5. Create `useVideoPlayer.ts` hook (sequential playback, gesture integration)
6. Write unit tests for adapters (mock player APIs)
7. Write unit tests for `useVideoPlayer` hook

**Dependencies**: Phase 2.0 complete (gesture hooks)

**Deliverables**:
- 3 player adapters with unified interface
- 1 custom hook with unit tests
- YouTube IFrame API, Vimeo SDK loaded dynamically

---

### Phase 2.2: Session Management

**Duration**: 0.5 days (4 hours)

**Tasks**:
1. Create `useWatchSession.ts` hook (start, heartbeat, end)
2. Implement 60-second heartbeat interval
3. Implement `navigator.sendBeacon()` cleanup on unmount
4. Handle limit reached response (stop playback, show message)
5. Write unit tests for session hook (mock axios)

**Dependencies**: None (uses existing backend endpoints)

**Deliverables**:
- 1 custom hook with unit tests
- AbortController integration for request cancellation

---

### Phase 2.3: Kids Mode UI Components

**Duration**: 2 days (16 hours)

**Tasks**:
1. Create `ProfileSelector.tsx` (profile selection screen)
2. Create `KidsModeNFCScan.tsx` (pulsating NFC scan area with CSS animations)
3. Create `KidsVideoPlayer.tsx` (fullscreen player with gesture listeners)
4. Create `LimitReachedMessage.tsx` (child-friendly limit message)
5. Create `KidsErrorBoundary.tsx` (error boundary with friendly fallback)
6. Create `KidsMode.css` (animations, fullscreen styles, child-friendly colors)
7. Write unit tests for all components (React Testing Library)

**Dependencies**: Phase 2.0, 2.1, 2.2 complete (all hooks ready)

**Deliverables**:
- 5 React components with unit tests
- CSS animations (pulsating scan area, transitions)
- Child-friendly error messages

---

### Phase 2.4: State Machine & Page Component

**Duration**: 0.5 days (4 hours)

**Tasks**:
1. Create `useKidsModeStateMachine.ts` (6 states, 9 actions)
2. Create `KidsMode.tsx` page component (orchestrates all sub-components)
3. Add `/kids` route to `App.tsx`
4. Write unit tests for state machine (state transitions)
5. Write integration test for `KidsMode.tsx` component

**Dependencies**: Phase 2.3 complete (all UI components ready)

**Deliverables**:
- 1 state machine hook with unit tests
- 1 page component with integration test
- New route registered in React Router

---

### Phase 2.5: E2E Testing

**Duration**: 1 day (8 hours)

**Tasks**:
1. Write `kids-mode-flow.spec.ts` (profile selection → NFC scan → playback → exit)
2. Write `kids-mode-gestures.spec.ts` (tilt, shake, swipe gesture interactions)
3. Write `kids-mode-limits.spec.ts` (daily watch time enforcement, limit reached)
4. Mock DeviceOrientationEvent and DeviceMotionEvent in Playwright
5. Test on multiple device types (smartphone, tablet, desktop)
6. Test fallback behavior (sensors unavailable, NFC not supported)

**Dependencies**: Phase 2.4 complete (full feature implemented)

**Deliverables**:
- 3 E2E test suites (15+ test cases total)
- Playwright test configuration for gesture mocking
- Device-specific test matrix (Android, iOS, desktop)

---

### Phase 2.6: Polish & Production Readiness

**Duration**: 0.5 days (4 hours)

**Tasks**:
1. Add Sentry integration to KidsErrorBoundary
2. Test on real devices (physical Android phone, iPhone)
3. Performance optimization (check 60fps animation, <50ms gesture latency)
4. Battery impact testing (verify <1% drain per hour)
5. Code review and documentation
6. Create PR with detailed description

**Dependencies**: Phase 2.5 complete (all tests passing)

**Deliverables**:
- Sentry error tracking enabled
- Real device test results documented
- Performance benchmarks recorded
- PR ready for review

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Coverage Target**: ≥80% code coverage (enforced by `npm run test:coverage`)

**Test Files** (8 files, ~50 test cases total):
1. `useDeviceOrientation.test.ts` - Tilt detection, dead zone, max tilt, throttling
2. `useShakeDetection.test.ts` - Shake threshold, cooldown, direction detection
3. `useSwipeGesture.test.ts` - Swipe distance, duration, direction
4. `useVideoPlayer.test.ts` - Sequential playback, scrubbing, skip next/previous
5. `useWatchSession.test.ts` - Start session, heartbeat, end session, limit reached
6. `videoPlayerAdapter.test.ts` - YouTube/Vimeo/Dailymotion player methods
7. `gestureDetection.test.ts` - Threshold calculations, intensity mapping
8. `deviceTypeDetector.test.ts` - Smartphone vs tablet vs desktop detection

**Mocking Strategy**:
- Mock `DeviceOrientationEvent` and `DeviceMotionEvent` in Jest
- Mock YouTube IFrame API, Vimeo Player SDK, Dailymotion SDK
- Mock axios for session API calls
- Mock `navigator.sendBeacon` for cleanup testing

---

### E2E Tests (Playwright)

**Test Suites** (3 files, ~15 test cases total):

1. **kids-mode-flow.spec.ts** (Full flow):
   - Profile selection screen appears
   - Select profile → NFC scanning screen appears
   - Enter chip UID → videos load
   - Videos play sequentially in fullscreen
   - Swipe exit → return to NFC scanning screen

2. **kids-mode-gestures.spec.ts** (Gesture interactions):
   - Tilt device forward → video scrubs forward
   - Tilt device backward → video scrubs backward
   - Shake right → skip to next video
   - Shake left → go to previous video
   - Swipe down → exit fullscreen
   - Gesture fallback when sensors unavailable

3. **kids-mode-limits.spec.ts** (Watch time enforcement):
   - Daily limit check on session start
   - Heartbeat updates remaining time
   - Limit reached mid-playback → video stops, message appears
   - Limit already reached → cannot start new session
   - Midnight reset (timezone-based)

**Device Matrix**:
- ✅ Android Chrome (gesture support)
- ✅ iOS Safari (manual entry fallback)
- ✅ Desktop Chrome (simulation mode)

---

## Performance Targets

**Success Criteria** (from spec.md):

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| **Gesture Recognition Accuracy** | 90% | Manual testing with 10 children, record success rate |
| **False Positive Rate** | <5% | Background movement test (walking, sitting) |
| **Video Transition Time** | <2 seconds | E2E test timing (ended event → next video playing) |
| **Gesture Recognition Latency** | <100ms | Measure time from gesture → visual feedback |
| **Animation Performance** | 60fps | Chrome DevTools FPS meter on NFC scan animation |
| **Battery Impact** | <1% per hour | Android Battery Historian on 30-minute session |
| **Watch Time Accuracy** | ±5 seconds | Compare recorded duration vs actual playback time |
| **NFC Scan Success Rate** | ≥95% | Test with 20 NFC scans on 3 different Android devices |

**Optimization Strategies**:
- Throttle orientation events to 16ms (60fps)
- Debounce shake detection to 800ms
- Use CSS animations (GPU-accelerated) for pulsating scan area
- Lazy-load YouTube IFrame API and Vimeo SDK (only when needed)
- Preload first video thumbnail after NFC scan

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All unit tests passing (`npm run test:coverage` ≥80%)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compilation succeeds (strict mode)
- [ ] Production build succeeds (`npm run build`)
- [ ] Real device testing complete (Android + iOS)
- [ ] Performance benchmarks meet targets (60fps, <2s transitions)
- [ ] Battery impact measured (<1% per hour)
- [ ] Sentry integration tested (trigger error, verify in Sentry dashboard)

### Deployment Steps

1. **Backend Deployment** (if needed):
   ```bash
   cd backend
   flyctl deploy --remote-only
   ```
   **Note**: No backend changes required (all endpoints already exist)

2. **Frontend Deployment**:
   ```bash
   git push origin 008-kids-mode-gestures
   # GitHub Actions triggers automatic deployment to Fly.io
   # Wait ~5-7 minutes for deployment
   ```

3. **Post-Deployment Verification**:
   ```bash
   # Check cache headers
   curl -I https://medio-react-app.fly.dev/index.html | grep -i cache-control
   # Expected: no-cache, no-store, must-revalidate

   # Test Kids Mode route
   open https://medio-react-app.fly.dev/kids
   ```

4. **Monitor for Errors**:
   - Check Sentry dashboard for errors in first 24 hours
   - Monitor Fly.io logs: `flyctl logs --app medio-react-app`
   - Track gesture recognition metrics (if implemented)

### Rollback Plan

If critical issue discovered post-deployment:
1. **Immediate**: Revert branch in GitHub (triggers auto-redeploy of previous version)
2. **OR**: `flyctl releases rollback --app medio-react-app` (backend if needed)
3. **Fix forward**: Commit fix to branch, push to trigger new deployment

---

## Monitoring & Observability

### Sentry Error Tracking

**Events to Track**:
1. `GesturePermissionError` - iOS user denied motion sensor permission
2. `GestureNotSupportedError` - Desktop browser without sensors
3. `VideoLoadError` - Platform video failed to load
4. `SessionLimitReachedError` - Daily limit reached (expected, but track frequency)
5. `KidsErrorBoundary` catch - Any React component crash in Kids Mode

**Custom Tags**:
- `deviceType`: smartphone | tablet | desktop
- `platform`: YouTube | Vimeo | Dailymotion
- `gestureType`: tilt | shake | swipe
- `profileAge`: Child's age (if available in profile)

**Example Sentry Integration**:
```typescript
// In KidsErrorBoundary.tsx
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: {
        component: 'KidsMode',
        deviceType: detectDeviceType(),
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }
}
```

### Performance Monitoring

**Metrics to Track** (optional, future enhancement):
1. Gesture recognition latency (time from event → action)
2. Video load time (NFC scan → first frame visible)
3. Battery drain rate (via Browser Battery API if available)
4. Heartbeat success rate (% of heartbeats that succeed)
5. Session completion rate (% of sessions that end naturally vs limit/error)

**Tools**:
- Chrome DevTools Performance tab (FPS, memory, battery)
- Sentry Performance Monitoring (transaction traces)
- Custom metrics logged to backend (session duration, gesture counts)

---

## Risk Assessment

### High-Risk Areas

1. **iOS Permission Denial**:
   - **Risk**: User denies motion sensor permission → gestures don't work
   - **Mitigation**: Graceful degradation to button controls (not in MVP, but document)
   - **Likelihood**: Medium (10-20% of iOS users may deny)
   - **Impact**: High (core feature unusable)

2. **Video Platform API Changes**:
   - **Risk**: YouTube/Vimeo/Dailymotion change embed parameters or APIs
   - **Mitigation**: Adapter pattern isolates platform-specific code
   - **Likelihood**: Low (<5% per year)
   - **Impact**: High (video playback breaks)

3. **Gesture False Positives**:
   - **Risk**: Normal movement triggers unintended skip/scrub
   - **Mitigation**: High thresholds (18 m/s²), cooldown (800ms), multi-sample check
   - **Likelihood**: Medium (5-10% false positive rate expected initially)
   - **Impact**: Medium (user frustration, but not breaking)

4. **Battery Drain**:
   - **Risk**: Continuous gesture listening drains battery quickly
   - **Mitigation**: Throttle events to 60fps, debounce shake detection
   - **Likelihood**: Low (research shows <1% per hour)
   - **Impact**: Medium (parent complaints about battery life)

### Low-Risk Areas

1. **Database Schema**: No schema changes required (sequence_order already exists)
2. **Backend Endpoints**: All endpoints already exist and tested (specs 005, 006, 007)
3. **Authentication**: Uses existing auth system (no new security surface)
4. **Browser Compatibility**: 95%+ of mobile browsers support gesture APIs

---

## Future Enhancements

**Out of Scope for MVP** (from spec.md):

1. Offline video playback (requires video download + storage management)
2. Video recording (Kids Mode is view-only)
3. Custom video playlists (parents control via NFC chip assignment)
4. In-video interactive elements (cards, annotations disabled)
5. Multi-child simultaneous sessions (one device = one child at a time)
6. Advanced gesture customization (parent can't change gesture mappings)
7. Voice commands ("skip video", "pause")
8. Haptic feedback (vibration on gesture recognition)
9. Parental override button (extend watch time button in Kids Mode)
10. Video analytics (detailed viewing metrics, favorite detection)

**Post-MVP Roadmap** (tentative):
- **v2.0**: Per-profile gesture sensitivity customization (accessibility)
- **v2.1**: QR code fallback for iOS (alternative to manual entry)
- **v2.2**: Haptic feedback for gesture confirmation
- **v2.3**: Voice command support ("next video", "pause")
- **v3.0**: Offline video caching (service worker + IndexedDB)

---

## Success Criteria

**Feature is considered successful if**:
1. ✅ All 6 user stories have passing acceptance tests (E2E)
2. ✅ All 30 functional requirements are implemented and tested
3. ✅ All 12 success criteria met (90% accuracy, <2s transitions, 60fps, etc.)
4. ✅ Constitution compliance verified (all 6 principles)
5. ✅ Zero critical bugs in first week of production
6. ✅ Sentry error rate <1% of sessions
7. ✅ Positive feedback from at least 5 beta testers (children aged 4-8)

**Acceptance Criteria** (from spec.md):
- Children aged 4-8 can use Kids Mode without adult assistance (measured via usability testing)
- Gesture controls recognized with 90% accuracy (9 out of 10 gestures work)
- Daily watch time limits enforced 100% of time (no edge cases allow bypass)
- No parent-mode UI elements accessible from Kids Mode (100% child-safe interface)

---

## Next Steps

1. ✅ **Review this plan** with team/reviewer
2. ⏳ **Generate tasks.md** via `/speckit.tasks` command
3. ⏳ **Assign tasks** to developer(s)
4. ⏳ **Begin Phase 2.0** (Foundation - hooks & utilities)
5. ⏳ **TDD workflow**: Write tests FIRST, then implementation
6. ⏳ **Track progress** via tasks.md checklist
7. ⏳ **Deploy to production** after all acceptance tests pass
8. ⏳ **Monitor Sentry** for first 24-48 hours post-deployment

---

## References

- **Specification**: [spec.md](./spec.md)
- **Research Report**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Developer Quickstart**: [quickstart.md](./quickstart.md)
- **API Contracts**: [contracts/kids-mode-api.yaml](./contracts/kids-mode-api.yaml)
- **TypeScript Interfaces**: [contracts/gesture-interfaces.ts](./contracts/gesture-interfaces.ts)
- **Medio Constitution**: `/.specify/memory/constitution.md`
- **Previous Specs**: specs/002 (Add Video), specs/005 (NFC), specs/006 (BFF Proxy), specs/007 (NFC Video Assignment)

---

**Implementation Plan Complete** ✅

Ready for `/speckit.tasks` to generate actionable task breakdown.
