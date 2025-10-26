# Kids Mode Troubleshooting Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-25
**Audience**: Developers, Support Engineers, Beta Testers

---

## Table of Contents

1. [Gesture Detection Issues](#gesture-detection-issues)
2. [iOS Permission Problems](#ios-permission-problems)
3. [Video Playback Errors](#video-playback-errors)
4. [Session & Watch Time Issues](#session--watch-time-issues)
5. [Performance Problems](#performance-problems)
6. [Device Compatibility](#device-compatibility)
7. [Development & Testing](#development--testing)

---

## Gesture Detection Issues

### Problem: Gestures Not Detected

**Symptoms**:
- Tilting device doesn't scrub video
- Shaking device doesn't skip video
- No response to any gestures

**Diagnosis**:
```javascript
// Open browser console (F12) and run:
console.log('DeviceOrientationEvent supported:', typeof DeviceOrientationEvent !== 'undefined');
console.log('DeviceMotionEvent supported:', typeof DeviceMotionEvent !== 'undefined');

// Listen for events manually:
window.addEventListener('deviceorientation', (e) => {
  console.log('Orientation:', e.beta, e.gamma, e.alpha);
});
```

**Solutions**:

1. **iOS 13+ Permission Denied**:
   - **Check**: Open Safari Settings → Privacy & Security → Motion & Orientation Access
   - **Fix**: Toggle ON for `medio-react-app.fly.dev`
   - **Alternative**: Use "Enable Gestures" button in Kids Mode to re-request permission

2. **Desktop Browser (No Sensors)**:
   - **Expected**: Gestures won't work on desktop (no accelerometer/gyroscope)
   - **Workaround**: Use simulation mode (manual chip UID entry) or test on mobile device
   - **Dev Mode**: Use Chrome DevTools Device Mode → enable "Device orientation" panel

3. **Android Chrome - HTTPS Required**:
   - **Check**: URL must be `https://` (DeviceMotionEvent requires secure context)
   - **Fix**: Access app via `https://medio-react-app.fly.dev` (not `http://`)
   - **Local Dev**: Use `localhost` (exempt from HTTPS requirement)

4. **Browser Compatibility**:
   - **Minimum versions**: Chrome 89+, Safari 13+, Edge 89+
   - **Check**: Run `npx browserslist` to see supported browsers
   - **Update**: Ask user to update browser

---

### Problem: Gesture Recognition Too Sensitive / Not Sensitive Enough

**Symptoms**:
- Normal hand movement triggers skip gesture (false positives)
- Vigorous shake doesn't skip video (false negatives)
- Tilt scrubbing activates when phone is lying flat

**Diagnosis**:
```javascript
// In Chrome DevTools Console, check raw sensor values:
window.addEventListener('deviceorientation', (e) => {
  console.log(`Beta (tilt): ${e.beta}°, Dead zone threshold: 15°`);
});

window.addEventListener('devicemotion', (e) => {
  const x = e.acceleration.x;
  console.log(`Accel X: ${x} m/s², Shake threshold: 18 m/s²`);
});
```

**Solutions**:

1. **Adjust Tilt Dead Zone** (currently 15°):
   ```typescript
   // src/utils/gestureDetection.ts
   export const GESTURE_CONFIG = {
     tiltDeadZone: 20, // Increase from 15° to 20° to reduce false positives
     tiltMaxAngle: 45,
   };
   ```

2. **Adjust Shake Threshold** (currently 18 m/s²):
   ```typescript
   // src/utils/gestureDetection.ts
   export const GESTURE_CONFIG = {
     shakeThreshold: 15, // Decrease from 18 to 15 for more sensitive detection
     shakeCooldown: 800, // ms
   };
   ```

3. **Increase Cooldown Period**:
   ```typescript
   // Prevent double-triggers during single shake
   shakeCooldown: 1000, // Increase from 800ms to 1000ms
   ```

4. **Multi-Sample Consistency** (research.md recommendation):
   - Verify gesture detection uses 2+ samples within 150ms window
   - Check `src/hooks/useShakeDetection.ts` implementation

---

### Problem: Tilt Scrubbing Jumpy or Laggy

**Symptoms**:
- Video playback jumps erratically when tilting
- Scrubbing feels unresponsive (>100ms latency)

**Diagnosis**:
```javascript
// Measure event throttling:
let lastEventTime = 0;
window.addEventListener('deviceorientation', (e) => {
  const now = Date.now();
  console.log(`Event interval: ${now - lastEventTime}ms (target: 16ms)`);
  lastEventTime = now;
});
```

**Solutions**:

1. **Verify Throttling** (should be 16ms = 60fps):
   ```typescript
   // src/hooks/useDeviceOrientation.ts
   import { throttle } from 'lodash';

   const handleOrientation = throttle((event: DeviceOrientationEvent) => {
     // ...
   }, 16); // 60fps
   ```

2. **Check Video Player API Latency**:
   - YouTube IFrame API `seekTo()` can be slow on some devices
   - Consider batching seek operations (don't seek on every tilt event)

3. **Reduce Scrub Speed** (currently 2 seconds/second at max tilt):
   ```typescript
   // src/utils/gestureDetection.ts
   const scrubSpeed = 1.5; // Reduce from 2.0 to 1.5 for smoother scrubbing
   ```

---

## iOS Permission Problems

### Problem: "Enable Gestures" Button Does Nothing

**Symptoms**:
- Clicking "Enable Gestures" button shows no permission prompt
- Console shows error: `requestPermission is not a function`

**Diagnosis**:
```javascript
// Check if requestPermission exists:
console.log('requestPermission:', DeviceOrientationEvent.requestPermission);

// Expected on iOS 13+: [Function]
// Expected on Android/Desktop: undefined
```

**Solutions**:

1. **iOS 12.2-12.4** (Permission Not Required):
   - `requestPermission()` doesn't exist on older iOS 13 versions
   - Gestures should work without permission
   - **Fix**: Skip permission request, directly listen for events

2. **Safari Private Mode**:
   - Motion sensors disabled in Private Browsing
   - **Fix**: Ask user to open app in normal Safari tab

3. **User Gesture Requirement**:
   - `requestPermission()` MUST be called from user gesture (button click, not page load)
   - **Check**: Button has `onClick` handler, not `useEffect`

4. **Cross-Origin Iframe**:
   - If app is embedded in iframe, permissions may fail
   - **Fix**: Use `allow="accelerometer; gyroscope"` iframe attribute

---

### Problem: Permission Granted But Gestures Still Don't Work

**Symptoms**:
- `requestPermission()` returns `'granted'`
- Console shows orientation events firing
- But `useDeviceOrientation` hook doesn't update state

**Diagnosis**:
```javascript
// Check if events are firing:
let eventCount = 0;
window.addEventListener('deviceorientation', () => {
  eventCount++;
  console.log(`Events received: ${eventCount}`);
});

// After 5 seconds, should show ~300 events (60fps)
```

**Solutions**:

1. **Check Hook Cleanup**:
   - Ensure event listeners aren't removed prematurely
   - Verify `useEffect` dependencies array doesn't cause re-subscription loops

2. **Verify Beta Value Range**:
   - iOS Safari sometimes returns `null` for beta/gamma/alpha
   - **Fix**: Add null checks in hook

3. **Check React State Updates**:
   - Ensure state updates aren't being batched/dropped
   - Use `console.log` in hook to verify state changes

---

## Video Playback Errors

### Problem: Video Won't Load

**Symptoms**:
- Black screen after NFC scan
- Console error: `Failed to load video`
- Loading spinner never disappears

**Diagnosis**:
```javascript
// Check backend API response:
fetch('/api/nfc/chips/{chipId}/videos')
  .then(r => r.json())
  .then(data => console.log('Videos:', data))
  .catch(err => console.error('API Error:', err));
```

**Solutions**:

1. **No Videos Assigned to Chip**:
   - **Check**: Open NFC Manager, verify chip has videos assigned
   - **Fix**: Assign at least 1 video to chip via "Manage Videos" button

2. **Invalid Platform Video ID**:
   - **Symptom**: YouTube API returns 404
   - **Check**: Video URL is valid (not deleted, not private)
   - **Fix**: Remove invalid video from chip, add valid replacement

3. **YouTube Embed Restrictions**:
   - Some videos can't be embedded (copyright restrictions)
   - **Error**: `"Video cannot be embedded"`
   - **Fix**: Use different video, notify parent via error message

4. **API Key Quota Exceeded** (YouTube Data API v3):
   - **Error**: `403 Forbidden - quota exceeded`
   - **Check**: Backend logs for YouTube API errors
   - **Fix**: Wait until quota resets (daily) or increase quota in Google Cloud Console

5. **CORS / Embed Policy**:
   - **Symptom**: Cross-origin error in console
   - **Fix**: Ensure videos use `allow="autoplay; fullscreen"` iframe attributes

---

### Problem: Video Plays But Controls Visible

**Symptoms**:
- YouTube play/pause buttons appear on video
- Progress bar visible (violates button-free design)

**Diagnosis**:
```html
<!-- Check iframe embed URL in DevTools: -->
<iframe src="https://www.youtube.com/embed/{videoId}?controls=0&disablekb=1&fs=0&modestbranding=1"></iframe>
```

**Solutions**:

1. **Verify Embed Parameters**:
   ```typescript
   // src/utils/videoPlayerAdapter.ts - YouTubePlayerAdapter
   const playerVars = {
     controls: 0,        // Hide controls
     disablekb: 1,       // Disable keyboard shortcuts
     fs: 0,              // Disable fullscreen button
     modestbranding: 1,  // Hide YouTube logo
     rel: 0,             // Don't show related videos
   };
   ```

2. **Vimeo Controls**:
   ```typescript
   // Vimeo Player SDK options
   const options = {
     controls: false,
     byline: false,
     portrait: false,
     title: false,
   };
   ```

3. **CSS Overlay** (last resort):
   ```css
   /* Hide controls via CSS if platform API doesn't support */
   .kids-video-player iframe {
     pointer-events: none; /* Prevent clicking controls */
   }

   .kids-video-player {
     pointer-events: auto; /* Re-enable for gesture listeners */
   }
   ```

---

### Problem: Sequential Playback Doesn't Work

**Symptoms**:
- Video A plays, then stops
- Video B never starts
- Returns to NFC scan screen prematurely

**Diagnosis**:
```javascript
// Add logging to useVideoPlayer hook:
player.on('ended', () => {
  console.log('Video ended, current index:', currentVideoIndex);
  console.log('Total videos:', videos.length);
  console.log('Next video:', videos[currentVideoIndex + 1]);
});
```

**Solutions**:

1. **Check Video Array**:
   - Ensure videos sorted by `sequence_order` (1, 2, 3)
   - Verify API returns `sequence_order` field

2. **Event Listener Not Firing**:
   - YouTube IFrame API: Use `onStateChange` with `YT.PlayerState.ENDED`
   - Vimeo SDK: Use `player.on('ended', ...)`
   - Dailymotion SDK: Use `player.on('video_end', ...)`

3. **Premature Cleanup**:
   - Verify `useEffect` cleanup doesn't remove event listeners too early
   - Check AbortController isn't canceling video load

---

## Session & Watch Time Issues

### Problem: Session Doesn't Start

**Symptoms**:
- Console error: `403 Forbidden - daily limit reached`
- Can't play videos even though watch time is 0

**Diagnosis**:
```bash
# Check database directly (production):
psql $DATABASE_URL -c "SELECT * FROM daily_watch_time WHERE profile_id = '{profile_uuid}' AND date = CURRENT_DATE;"
```

**Solutions**:

1. **Daily Limit Already Reached**:
   - **Check**: Profile daily limit (default 60 minutes)
   - **Fix**: Wait until midnight (timezone-based) for reset
   - **Override**: Parent can temporarily increase limit in Profile Settings

2. **Timezone Mismatch**:
   - **Symptom**: Limit resets at wrong time (e.g., UTC instead of user's timezone)
   - **Check**: `daily_watch_time.timezone` column value
   - **Fix**: Update user account timezone in settings

3. **Invalid Profile ID**:
   - **Error**: `404 Not Found - profile not found`
   - **Fix**: Ensure profile belongs to authenticated user

---

### Problem: Heartbeat Fails / Watch Time Not Tracked

**Symptoms**:
- Session starts, but watch time stays at 0
- Console error: `Failed to send heartbeat`

**Diagnosis**:
```javascript
// Monitor heartbeat requests in Network tab:
// Should see POST /api/sessions/{sessionId}/heartbeat every 60s

// Check heartbeat response:
{
  "elapsed_seconds": 65,
  "remaining_minutes": 59,
  "limit_reached": false
}
```

**Solutions**:

1. **Network Disconnected**:
   - Heartbeat uses `axios` (not `sendBeacon`), requires active connection
   - **Fix**: Queue heartbeats offline, send when reconnected (future enhancement)

2. **Session Expired Server-Side**:
   - Sessions auto-expire after 2 hours inactivity
   - **Fix**: End current session, start new session

3. **AbortController Cancelled Request**:
   - Component unmounted before heartbeat completed
   - **Expected**: Heartbeat should be aborted on unmount
   - **Check**: Verify `sendBeacon` is used in cleanup, not regular axios

4. **Rate Limiting**:
   - Heartbeat endpoint: 100 requests/10 minutes
   - **Symptom**: `429 Too Many Requests`
   - **Fix**: Verify heartbeat interval is 60s, not faster

---

### Problem: Session Doesn't End on Exit

**Symptoms**:
- Swiped out of video, but session still running
- Watch time continues counting after exit

**Diagnosis**:
```javascript
// Check if sendBeacon is called:
const originalBeacon = navigator.sendBeacon;
navigator.sendBeacon = function(...args) {
  console.log('sendBeacon called:', args);
  return originalBeacon.apply(this, args);
};
```

**Solutions**:

1. **sendBeacon Not Supported**:
   - **Check**: Old browsers (IE11, Safari <11)
   - **Fallback**: Use synchronous `XMLHttpRequest` with `keepalive`

2. **Component Unmount Cleanup Not Running**:
   - Verify `useEffect` cleanup function is called
   - Add `console.log` in cleanup to verify

3. **Request Failed**:
   - `sendBeacon` fails silently (no error callback)
   - **Check**: Backend logs for POST /api/sessions/:id/end requests
   - **Fix**: Implement retry mechanism or accept data loss (spec says reliability > perfect accuracy)

---

## Performance Problems

### Problem: Battery Draining Quickly

**Symptoms**:
- Phone battery drops >2% per hour during Kids Mode
- Phone gets warm during playback

**Diagnosis**:
```bash
# Android: Use Battery Historian
adb bugreport > bugreport.zip
# Upload to https://bathist.ef.lc/

# iOS: Use Xcode Instruments → Energy Log
```

**Solutions**:

1. **Event Throttling Not Working**:
   - **Check**: DeviceOrientationEvent fires at 16ms intervals (60fps)
   - **Fix**: Verify `lodash.throttle` is imported correctly

2. **Too Many Event Listeners**:
   - Each video creates new listeners without cleaning up old ones
   - **Fix**: Remove event listeners in `useEffect` cleanup

3. **Video Decoding**:
   - High-resolution videos (4K) consume more battery
   - **Fix**: Use lower quality embed URLs (YouTube: `&quality=medium`)

4. **Screen Brightness**:
   - Fullscreen video at max brightness = high power draw
   - **Not a bug**: Expected behavior, educate parents

---

### Problem: Gestures Feel Laggy (>100ms)

**Symptoms**:
- Tilt device, video scrubs 200-300ms later
- Shake device, skip happens after delay

**Diagnosis**:
```javascript
// Measure gesture latency:
let gestureStartTime;
window.addEventListener('deviceorientation', (e) => {
  gestureStartTime = performance.now();
});

// In scrub handler:
const latency = performance.now() - gestureStartTime;
console.log(`Gesture latency: ${latency}ms (target: <100ms)`);
```

**Solutions**:

1. **Main Thread Blocking**:
   - React re-renders blocking gesture processing
   - **Fix**: Use `useMemo` / `useCallback` to prevent unnecessary renders
   - **Advanced**: Move gesture detection to Web Worker (future enhancement)

2. **Video Player API Latency**:
   - YouTube `seekTo()` has inherent 50-100ms delay
   - **Mitigation**: Optimize by reducing seek frequency (batch operations)

3. **Throttling Too Aggressive**:
   - 16ms throttle may batch multiple events
   - **Fix**: Reduce to 8ms (120fps) for lower latency (trade-off with battery)

---

### Problem: Animation Not Smooth (Pulsating NFC Scan Area)

**Symptoms**:
- Pulsating circle stutters (not 60fps)
- Animation freezes during gesture detection

**Diagnosis**:
```javascript
// Chrome DevTools → Performance tab
// Record 5 seconds of NFC scan screen
// Check FPS graph (should be flat at 60fps)
```

**Solutions**:

1. **Use CSS Animations** (not JavaScript):
   ```css
   /* KidsMode.css - GPU-accelerated */
   @keyframes pulsate {
     0%, 100% { transform: scale(1); opacity: 0.8; }
     50% { transform: scale(1.1); opacity: 1; }
   }

   .nfc-scan-indicator {
     animation: pulsate 2s ease-in-out infinite;
     will-change: transform, opacity; /* GPU hint */
   }
   ```

2. **Avoid Layout Thrashing**:
   - Don't trigger reflows during animation
   - Use `transform` and `opacity` only (cheap properties)

3. **Reduce Re-Renders**:
   - Wrap component in `React.memo`
   - Avoid state updates during animation

---

## Device Compatibility

### Problem: NFC Not Working on iPhone

**Symptoms**:
- "Tap NFC chip" but nothing happens
- No permission prompt

**Diagnosis**:
```javascript
// Check Web NFC API support:
console.log('NDEFReader supported:', 'NDEFReader' in window);
// Expected on iOS: false (Web NFC not supported)
```

**Solutions**:

1. **iOS Doesn't Support Web NFC API**:
   - **Expected behavior**: Web NFC only works on Android Chrome/Edge
   - **Workaround**: Manual chip UID entry (fallback mode)
   - **Future**: QR code scanner as iOS alternative

2. **Manual Entry UI**:
   - Ensure "Enter Chip ID Manually" button visible on iOS
   - Guide user to find chip UID (printed on NFC sticker)

---

### Problem: Features Not Working on Tablet

**Symptoms**:
- NFC scan area positioned incorrectly (smartphone layout on tablet)
- Gestures work but UI feels cramped

**Diagnosis**:
```javascript
// Check device type detection:
import { detectDeviceType } from 'src/utils/deviceTypeDetector';
console.log('Device type:', detectDeviceType());
// Expected: 'tablet' for iPad, Android tablets
```

**Solutions**:

1. **Device Type Detection Incorrect**:
   - **Check**: Screen width breakpoints (tablets: 768px-1024px)
   - **Fix**: Adjust breakpoints in `deviceTypeDetector.ts`

2. **CSS Media Queries**:
   ```css
   /* Tablet-specific NFC scan positioning */
   @media (min-width: 768px) and (max-width: 1024px) {
     .nfc-scan-indicator {
       top: 60%; /* Lower position for tablet top-mounted NFC */
     }
   }
   ```

---

## Development & Testing

### Problem: Can't Test Gestures on Desktop

**Symptoms**:
- DeviceOrientationEvent not firing on MacBook/Windows laptop
- Need to test gestures without physical device

**Solutions**:

1. **Chrome DevTools Device Mode**:
   ```
   1. Open DevTools (F12)
   2. Toggle Device Toolbar (Ctrl+Shift+M)
   3. Click "⋮" menu → "Sensors"
   4. Select "Custom orientation"
   5. Adjust Beta (tilt) slider: -45° to +45°
   ```

2. **Mock Events in Tests**:
   ```typescript
   // tests/unit/hooks/useDeviceOrientation.test.ts
   const mockOrientationEvent = (beta: number) => {
     const event = new DeviceOrientationEvent('deviceorientation', {
       beta,
       gamma: 0,
       alpha: 0,
     });
     window.dispatchEvent(event);
   };

   it('should detect tilt forward', () => {
     mockOrientationEvent(30); // 30° tilt forward
     // assertions...
   });
   ```

3. **Playwright Gesture Mocking**:
   ```typescript
   // tests/e2e/kids-mode-gestures.spec.ts
   await page.evaluate(() => {
     window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', {
       beta: 30,
       gamma: 0,
       alpha: 0,
     }));
   });
   ```

---

### Problem: E2E Tests Failing on CI/CD

**Symptoms**:
- Tests pass locally, fail in GitHub Actions
- Error: `Timeout waiting for gesture event`

**Solutions**:

1. **Increase Timeouts**:
   ```typescript
   // playwright.config.ts
   export default {
     timeout: 60000, // 60s for CI (slower than local)
     expect: {
       timeout: 10000, // 10s for assertions
     },
   };
   ```

2. **Mock Sensor APIs in Headless Mode**:
   - Headless browsers don't have sensors
   - Always mock DeviceOrientationEvent in E2E tests

3. **Wait for Hydration**:
   - React hydration may take longer on CI
   - Add `await page.waitForLoadState('networkidle');` before gesture tests

---

## Getting Help

If issue persists after trying solutions above:

1. **Check Sentry Dashboard**:
   - Look for error patterns in production
   - Filter by `component: KidsMode`

2. **Enable Debug Logging**:
   ```typescript
   // Add to src/pages/KidsMode.tsx
   localStorage.setItem('DEBUG_KIDS_MODE', 'true');
   ```

3. **Collect Diagnostics**:
   ```bash
   # Browser info
   navigator.userAgent

   # Sensor support
   typeof DeviceOrientationEvent !== 'undefined'
   typeof DeviceMotionEvent !== 'undefined'
   'NDEFReader' in window

   # Screen info
   window.innerWidth, window.innerHeight
   window.devicePixelRatio
   ```

4. **Report Bug**:
   - GitHub Issues: https://github.com/rayberirondelsol/medio/issues
   - Include: Browser version, device model, console logs, Sentry error ID

---

**Last Updated**: 2025-10-25 | **Spec**: 008-kids-mode-gestures | **Version**: 1.0.0
