# Developer Quickstart: Kids Mode Gesture Controls

**Feature**: Kids Mode Gesture Controls
**Branch**: `008-kids-mode-gestures`
**Estimated Implementation Time**: 5-7 days (40-56 hours)

## Quick Links

- **Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research Report**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/kids-mode-api.yaml](./contracts/kids-mode-api.yaml)
- **TypeScript Interfaces**: [contracts/gesture-interfaces.ts](./contracts/gesture-interfaces.ts)

---

## What You're Building

A child-friendly video playback interface at `/kids` route with:
- ✅ Device-specific NFC scanning UI (pulsating visual indicator)
- ✅ Sequential video playback from registered NFC chips
- ✅ **Button-free gesture controls**:
  - Tilt device → scrub through video
  - Shake device → skip to next/previous video
  - Swipe down → exit fullscreen mode
- ✅ Profile-based daily watch time enforcement
- ✅ Session tracking with heartbeat mechanism

**Key Constraint**: No buttons or UI controls visible during video playback. All interactions via gestures.

---

## Prerequisites

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install lodash @types/lodash @vimeo/player react-youtube
   ```

2. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm start
   # Backend runs on http://localhost:5000
   ```

3. **Start BFF Proxy** (Terminal 2):
   ```bash
   npm run start:prod
   # Frontend proxy runs on http://localhost:8080
   ```

4. **Open Browser**:
   ```bash
   open http://localhost:8080/kids
   ```

### Test Data Setup

**Seed database with test data**:
```sql
-- Insert test profile
INSERT INTO profiles (user_id, name, daily_limit_minutes)
VALUES ('<your-user-id>', 'Test Child', 60);

-- Insert test NFC chip
INSERT INTO nfc_chips (user_id, chip_uid, label)
VALUES ('<your-user-id>', '04:5A:B2:C3:D4:E5:F6', 'Test Chip');

-- Assign videos to chip
INSERT INTO video_nfc_mappings (video_id, nfc_chip_id, sequence_order)
VALUES
  ('<video-1-id>', '<chip-id>', 1),
  ('<video-2-id>', '<chip-id>', 2),
  ('<video-3-id>', '<chip-id>', 3);
```

---

## Project Structure

```
medio/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── nfc.js          # GET /api/nfc/chips/:chipId/videos
│   │   │   └── sessions.js     # POST /api/sessions/start/public, /heartbeat, /end
│   │   └── middleware/
│   │       └── rateLimiter.js  # Rate limiting for Kids Mode endpoints
│   └── init.sql                # Database schema (video_nfc_mappings.sequence_order)
├── src/
│   ├── pages/
│   │   └── KidsMode.tsx        # 🆕 Main Kids Mode page (/kids route)
│   ├── components/
│   │   └── kids/
│   │       ├── KidsModeNFCScan.tsx     # 🆕 NFC scanning UI with pulsating indicator
│   │       ├── KidsVideoPlayer.tsx     # 🆕 Fullscreen video player with gesture controls
│   │       ├── ProfileSelector.tsx     # 🆕 Profile selection screen
│   │       ├── LimitReachedMessage.tsx # 🆕 Daily limit message
│   │       └── KidsErrorBoundary.tsx   # 🆕 Error boundary for Kids Mode
│   ├── hooks/
│   │   ├── useDeviceOrientation.ts     # 🆕 Tilt gesture detection
│   │   ├── useShakeDetection.ts        # 🆕 Shake gesture detection
│   │   ├── useSwipeGesture.ts          # 🆕 Swipe gesture detection
│   │   ├── useVideoPlayer.ts           # 🆕 Platform-agnostic video player
│   │   ├── useWatchSession.ts          # 🆕 Session tracking with heartbeat
│   │   └── useKidsModeStateMachine.ts  # 🆕 State machine for Kids Mode flow
│   ├── utils/
│   │   ├── videoPlayerAdapter.ts       # 🆕 Unified player abstraction (YouTube/Vimeo/Dailymotion)
│   │   ├── gestureDetection.ts         # 🆕 Gesture threshold calculations
│   │   └── deviceTypeDetector.ts       # 🆕 Smartphone vs tablet vs desktop
│   └── styles/
│       └── KidsMode.css                # 🆕 Kids Mode-specific styles
└── specs/008-kids-mode-gestures/       # This directory
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md                   # You are here
    └── contracts/
        ├── kids-mode-api.yaml
        └── gesture-interfaces.ts
```

**Legend**:
- 🆕 New file to create
- ✅ Existing file to modify

---

## Development Workflow

### Step 1: Set Up Gesture Detection Hooks

**Priority**: Implement custom hooks first (foundation for all gesture controls).

1. **Create `useDeviceOrientation.ts`**:
   ```typescript
   import { useEffect, useState, useCallback } from 'react';
   import { throttle } from 'lodash';
   import { OrientationData, TiltState } from '../contracts/gesture-interfaces';

   export function useDeviceOrientation() {
     const [orientation, setOrientation] = useState<OrientationData>({
       beta: null,
       gamma: null,
       alpha: null,
       timestamp: Date.now(),
     });

     const [tiltState, setTiltState] = useState<TiltState>({
       direction: 'neutral',
       intensity: 0,
       rawBeta: null,
     });

     // Request permission for iOS 13+
     const requestPermission = useCallback(async () => {
       if (typeof DeviceOrientationEvent !== 'undefined' &&
           typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
         const permission = await (DeviceOrientationEvent as any).requestPermission();
         return permission === 'granted';
       }
       return true; // Non-iOS or older iOS
     }, []);

     // Calculate tilt state from beta angle
     const calculateTiltState = useCallback((beta: number | null): TiltState => {
       if (beta === null) {
         return { direction: 'neutral', intensity: 0, rawBeta: null };
       }

       const DEAD_ZONE = 15; // degrees
       const MAX_TILT = 45; // degrees

       if (Math.abs(beta) < DEAD_ZONE) {
         return { direction: 'neutral', intensity: 0, rawBeta: beta };
       }

       const direction = beta > 0 ? 'forward' : 'backward';
       const intensity = Math.min(1, (Math.abs(beta) - DEAD_ZONE) / (MAX_TILT - DEAD_ZONE));

       return { direction, intensity, rawBeta: beta };
     }, []);

     useEffect(() => {
       if (typeof DeviceOrientationEvent === 'undefined') return;

       // Throttled handler (60fps = 16ms)
       const handleOrientation = throttle((event: DeviceOrientationEvent) => {
         const data: OrientationData = {
           beta: event.beta,
           gamma: event.gamma,
           alpha: event.alpha,
           timestamp: Date.now(),
         };
         setOrientation(data);

         const newTiltState = calculateTiltState(event.beta);
         setTiltState(newTiltState);
       }, 16);

       window.addEventListener('deviceorientation', handleOrientation);

       return () => {
         handleOrientation.cancel();
         window.removeEventListener('deviceorientation', handleOrientation);
       };
     }, [calculateTiltState]);

     return { orientation, tiltState, requestPermission };
   }
   ```

2. **Create `useShakeDetection.ts`** (see research.md Appendix A for full implementation)

3. **Create `useSwipeGesture.ts`**:
   ```typescript
   import { useState, useCallback, useRef } from 'react';
   import { SwipeGesture } from '../contracts/gesture-interfaces';

   export function useSwipeGesture(minDistance = 100, maxDuration = 500) {
     const [lastSwipe, setLastSwipe] = useState<SwipeGesture | null>(null);
     const [isSwiping, setIsSwiping] = useState(false);
     const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

     const handleTouchStart = useCallback((e: TouchEvent) => {
       const touch = e.touches[0];
       touchStart.current = {
         x: touch.clientX,
         y: touch.clientY,
         time: Date.now(),
       };
       setIsSwiping(true);
     }, []);

     const handleTouchEnd = useCallback((e: TouchEvent) => {
       if (!touchStart.current) return;

       const touch = e.changedTouches[0];
       const endX = touch.clientX;
       const endY = touch.clientY;
       const duration = Date.now() - touchStart.current.time;

       const deltaX = endX - touchStart.current.x;
       const deltaY = endY - touchStart.current.y;
       const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

       // Determine direction
       let direction: 'up' | 'down' | 'left' | 'right';
       if (Math.abs(deltaX) > Math.abs(deltaY)) {
         direction = deltaX > 0 ? 'right' : 'left';
       } else {
         direction = deltaY > 0 ? 'down' : 'up';
       }

       // Validate swipe
       if (distance >= minDistance && duration <= maxDuration) {
         const gesture: SwipeGesture = {
           direction,
           distance,
           duration,
           startX: touchStart.current.x,
           startY: touchStart.current.y,
           endX,
           endY,
           timestamp: Date.now(),
         };
         setLastSwipe(gesture);
       }

       touchStart.current = null;
       setIsSwiping(false);
     }, [minDistance, maxDuration]);

     return { lastSwipe, isSwiping, handleTouchStart, handleTouchEnd };
   }
   ```

---

### Step 2: Build Video Player Adapter

**Priority**: Create platform-agnostic video player abstraction.

1. **Create `videoPlayerAdapter.ts`**:
   ```typescript
   import { IVideoPlayer } from '../contracts/gesture-interfaces';

   export class YouTubePlayerAdapter implements IVideoPlayer {
     private player: YT.Player | null = null;
     private eventListeners: Map<string, (() => void)[]> = new Map();

     constructor(elementId: string, videoId: string) {
       this.player = new YT.Player(elementId, {
         videoId,
         playerVars: {
           controls: 0,          // Hide controls
           modestbranding: 1,    // Remove YouTube logo
           rel: 0,               // No related videos
           fs: 0,                // Disable fullscreen button
           disablekb: 1,         // Disable keyboard controls
           playsinline: 1,       // iOS inline playback
           autoplay: 1,          // Autoplay
           mute: 1,              // Start muted (unmute after gesture)
         },
         events: {
           onStateChange: (event) => this.handleStateChange(event),
         },
       });
     }

     async load(videoId: string): Promise<void> {
       if (!this.player) throw new Error('Player not initialized');
       this.player.loadVideoById(videoId);
     }

     async play(): Promise<void> {
       if (!this.player) throw new Error('Player not initialized');
       this.player.playVideo();
     }

     pause(): void {
       if (!this.player) throw new Error('Player not initialized');
       this.player.pauseVideo();
     }

     seekTo(seconds: number): void {
       if (!this.player) throw new Error('Player not initialized');
       this.player.seekTo(seconds, true);
     }

     async getCurrentTime(): Promise<number> {
       if (!this.player) throw new Error('Player not initialized');
       return this.player.getCurrentTime();
     }

     async getDuration(): Promise<number> {
       if (!this.player) throw new Error('Player not initialized');
       return this.player.getDuration();
     }

     setVolume(volume: number): void {
       if (!this.player) throw new Error('Player not initialized');
       this.player.setVolume(volume);
     }

     on(event: 'ended' | 'playing' | 'paused' | 'error', callback: () => void): void {
       if (!this.eventListeners.has(event)) {
         this.eventListeners.set(event, []);
       }
       this.eventListeners.get(event)!.push(callback);
     }

     off(event: 'ended' | 'playing' | 'paused' | 'error', callback: () => void): void {
       const listeners = this.eventListeners.get(event);
       if (listeners) {
         this.eventListeners.set(event, listeners.filter(cb => cb !== callback));
       }
     }

     destroy(): void {
       if (this.player) {
         this.player.destroy();
         this.player = null;
       }
       this.eventListeners.clear();
     }

     private handleStateChange(event: YT.OnStateChangeEvent): void {
       switch (event.data) {
         case YT.PlayerState.ENDED:
           this.emit('ended');
           break;
         case YT.PlayerState.PLAYING:
           this.emit('playing');
           break;
         case YT.PlayerState.PAUSED:
           this.emit('paused');
           break;
       }
     }

     private emit(event: string): void {
       const listeners = this.eventListeners.get(event);
       if (listeners) {
         listeners.forEach(callback => callback());
       }
     }
   }

   // TODO: Create VimeoPlayerAdapter and DailymotionPlayerAdapter similarly
   ```

---

### Step 3: Implement Watch Session Management

**Priority**: Session tracking is critical for watch time enforcement.

1. **Create `useWatchSession.ts`**:
   ```typescript
   import { useState, useCallback, useRef, useEffect } from 'react';
   import axios from 'axios';
   import { WatchSession, SessionHeartbeatResponse, EndSessionRequest } from '../contracts/gesture-interfaces';

   export function useWatchSession() {
     const [session, setSession] = useState<WatchSession | null>(null);
     const [limitReached, setLimitReached] = useState(false);
     const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

     const startSession = useCallback(async (
       profileId: string,
       videoId: string,
       chipUid: string
     ): Promise<WatchSession> => {
       const response = await axios.post('/api/sessions/start/public', {
         profile_id: profileId,
         video_id: videoId,
         chip_uid: chipUid,
       });

       const newSession: WatchSession = {
         session_id: response.data.session_id,
         profile_id: profileId,
         video_id: videoId,
         chip_uid: chipUid,
         started_at: new Date().toISOString(),
         elapsed_seconds: 0,
         remaining_minutes: response.data.remaining_minutes,
         daily_limit_minutes: response.data.daily_limit_minutes,
         limit_reached: false,
       };

       setSession(newSession);
       startHeartbeat(newSession.session_id);
       return newSession;
     }, []);

     const sendHeartbeat = useCallback(async (
       currentPosition: number
     ): Promise<SessionHeartbeatResponse> => {
       if (!session) throw new Error('No active session');

       const response = await axios.post(`/api/sessions/${session.session_id}/heartbeat`, {
         current_position_seconds: currentPosition,
       });

       const heartbeatResponse: SessionHeartbeatResponse = response.data;

       // Update session with latest data
       setSession(prev => prev ? {
         ...prev,
         elapsed_seconds: heartbeatResponse.elapsed_seconds,
         remaining_minutes: heartbeatResponse.remaining_minutes,
         limit_reached: heartbeatResponse.limit_reached,
       } : null);

       if (heartbeatResponse.limit_reached) {
         setLimitReached(true);
         stopHeartbeat();
       }

       return heartbeatResponse;
     }, [session]);

     const endSession = useCallback(async (
       request: EndSessionRequest
     ): Promise<void> => {
       if (!session) return;

       await axios.post(`/api/sessions/${session.session_id}/end`, request);
       stopHeartbeat();
       setSession(null);
     }, [session]);

     const startHeartbeat = useCallback((sessionId: string) => {
       if (heartbeatInterval.current) return;

       heartbeatInterval.current = setInterval(async () => {
         try {
           // Get current video position and send heartbeat
           await sendHeartbeat(0); // Update with actual video position
         } catch (error) {
           console.error('Heartbeat failed:', error);
         }
       }, 60000); // 60 seconds
     }, [sendHeartbeat]);

     const stopHeartbeat = useCallback(() => {
       if (heartbeatInterval.current) {
         clearInterval(heartbeatInterval.current);
         heartbeatInterval.current = null;
       }
     }, []);

     // Cleanup on unmount
     useEffect(() => {
       return () => {
         stopHeartbeat();
         if (session) {
           // Use sendBeacon for reliable cleanup (per Constitution VI)
           const endPayload = JSON.stringify({
             stopped_reason: 'component_unmount',
           });
           navigator.sendBeacon(
             `/api/sessions/${session.session_id}/end`,
             new Blob([endPayload], { type: 'application/json' })
           );
         }
       };
     }, [session, stopHeartbeat]);

     return {
       session,
       startSession,
       sendHeartbeat,
       endSession,
       isActive: session !== null,
       remainingMinutes: session?.remaining_minutes ?? 0,
       limitReached,
     };
   }
   ```

---

### Step 4: Build Kids Mode UI Components

**Priority**: Create child-friendly UI components.

1. **Create `KidsModeNFCScan.tsx`** (pulsating scan area - see spec FR-001, FR-002)
2. **Create `KidsVideoPlayer.tsx`** (fullscreen video player with gesture integration)
3. **Create `ProfileSelector.tsx`** (profile selection screen - see spec FR-022)
4. **Create `LimitReachedMessage.tsx`** (friendly limit message - see spec FR-020)

---

### Step 5: Wire Up Kids Mode State Machine

**Priority**: Coordinate all components into cohesive flow.

1. **Create `KidsMode.tsx`** (main page component)
2. **Create `useKidsModeStateMachine.ts`** (state machine hook)
3. **Add route** to `App.tsx`:
   ```typescript
   <Route path="/kids" element={<KidsMode />} />
   ```

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Test gesture detection hooks**:
```typescript
// src/hooks/__tests__/useDeviceOrientation.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDeviceOrientation } from '../useDeviceOrientation';

describe('useDeviceOrientation', () => {
  it('calculates forward tilt correctly', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    act(() => {
      const event = new DeviceOrientationEvent('deviceorientation', { beta: 30 });
      window.dispatchEvent(event);
    });

    expect(result.current.tiltState.direction).toBe('forward');
    expect(result.current.tiltState.intensity).toBeGreaterThan(0);
  });

  it('respects dead zone threshold', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    act(() => {
      const event = new DeviceOrientationEvent('deviceorientation', { beta: 10 });
      window.dispatchEvent(event);
    });

    expect(result.current.tiltState.direction).toBe('neutral');
    expect(result.current.tiltState.intensity).toBe(0);
  });
});
```

---

### E2E Tests (Playwright)

**Test complete Kids Mode flow**:
```typescript
// tests/e2e/kids-mode-flow.spec.ts
import { test, expect } from '@playwright/test';

test('Kids Mode: NFC scan to video playback', async ({ page }) => {
  // Mock DeviceOrientationEvent
  await page.addInitScript(() => {
    window.DeviceOrientationEvent = class MockDeviceOrientationEvent extends Event {
      beta = 0;
      gamma = 0;
      alpha = 0;
    } as any;
  });

  // Navigate to Kids Mode
  await page.goto('/kids');

  // Select profile
  await page.click('button:has-text("Test Child")');

  // Simulate NFC scan
  await page.fill('input[placeholder*="Chip ID"]', '04:5A:B2:C3:D4:E5:F6');
  await page.click('button:has-text("Scan")');

  // Wait for video to load
  await expect(page.locator('iframe[src*="youtube"]')).toBeVisible({ timeout: 5000 });

  // Verify fullscreen mode
  await expect(page.locator('.kids-video-player.fullscreen')).toBeVisible();
});
```

---

## Common Gotchas & Solutions

### 1. iOS Permission Denied

**Problem**: iOS 13+ requires explicit permission for DeviceOrientationEvent.

**Solution**: Show permission request button before entering Kids Mode:
```typescript
const handleEnterKidsMode = async () => {
  const granted = await requestOrientationPermission();
  if (!granted) {
    alert('Please enable motion sensors to use gesture controls');
    return;
  }
  // Proceed to Kids Mode
};
```

---

### 2. Video Autoplay Blocked

**Problem**: Browsers block unmuted autoplay.

**Solution**: Start video muted, unmute after user gesture (NFC scan tap):
```typescript
// First video starts muted
firstVideo.muted = true;
await firstVideo.play();

// Unmute immediately (allowed because user just tapped)
firstVideo.muted = false;
```

---

### 3. Fullscreen Exits on Orientation Change

**Problem**: Device rotation may exit fullscreen.

**Solution**: Listen for orientation change and re-request fullscreen:
```typescript
window.addEventListener('orientationchange', async () => {
  if (!document.fullscreenElement && isKidsModeActive) {
    await playerContainer.requestFullscreen();
  }
});
```

---

### 4. Gesture False Positives

**Problem**: Normal device movement triggers shake detection.

**Solution**: Use high threshold (18 m/s²) + multi-sample consistency check (see research.md Appendix A).

---

## Debugging Tips

### 1. Visualize Gesture Data

Add on-screen debug overlay:
```typescript
{process.env.NODE_ENV === 'development' && (
  <div className="gesture-debug">
    <p>Beta: {tiltState.rawBeta?.toFixed(2)}°</p>
    <p>Direction: {tiltState.direction}</p>
    <p>Intensity: {tiltState.intensity.toFixed(2)}</p>
  </div>
)}
```

---

### 2. Test on Real Devices

**Critical**: Simulators don't support motion sensors. Test on:
- ✅ Physical Android phone (Chrome)
- ✅ Physical iPhone (Safari)
- ❌ iOS Simulator (no sensors)
- ❌ Chrome DevTools device mode (no sensors)

---

### 3. Monitor Session Heartbeats

Check Network tab for heartbeat requests:
```
POST /api/sessions/abc123/heartbeat
Response: { elapsed_seconds: 60, remaining_minutes: 44, limit_reached: false }
```

---

## Performance Checklist

- [ ] Throttle orientation events to 16ms (60fps)
- [ ] Debounce shake detection to 800ms
- [ ] Use AbortController for all API requests
- [ ] Clean up event listeners on unmount
- [ ] Use `sendBeacon()` for session end on unmount
- [ ] Lazy-load video player libraries (YouTube IFrame API, Vimeo SDK)
- [ ] Preload first video thumbnail after NFC scan
- [ ] Lock screen orientation to prevent accidental rotation

---

## Constitution Compliance Checklist

- [ ] **Child Safety First**: Daily watch limits enforced server-side
- [ ] **Context-Driven Architecture**: Use React Context for profile state
- [ ] **Test-First Development**: Write tests BEFORE implementation (TDD)
- [ ] **Error Resilience**: ErrorBoundary wraps Kids Mode components
- [ ] **Docker-First Development**: Test in Docker containers
- [ ] **NFC Security**: Server-side chip validation + heartbeat mechanism

---

## Next Steps

1. ✅ Read research.md for technical details
2. ✅ Review contracts/gesture-interfaces.ts for type definitions
3. ✅ Implement custom hooks (useDeviceOrientation, useShakeDetection, etc.)
4. ✅ Build video player adapter layer
5. ✅ Create Kids Mode UI components
6. ✅ Wire up state machine
7. ✅ Write unit tests (TDD - write BEFORE implementation!)
8. ✅ Write E2E tests
9. ✅ Test on real devices (Android + iOS)
10. ✅ Deploy to production and monitor with Sentry

---

## Questions?

- **Spec clarifications**: See [spec.md](./spec.md) Open Questions section
- **Technical unknowns**: See [research.md](./research.md)
- **Data model questions**: See [data-model.md](./data-model.md)
- **API questions**: See [contracts/kids-mode-api.yaml](./contracts/kids-mode-api.yaml)

---

**Happy coding! 🎉**
