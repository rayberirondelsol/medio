# Feature Specification: Kids Mode Gesture Controls

**Feature Branch**: `008-kids-mode-gestures`
**Created**: 2025-10-25
**Status**: Draft
**Input**: User description: "Kids Mode MVP: Implement a child-friendly interface at /kids route with device-specific NFC scanning UI showing pulsating scan area. After scanning registered NFC chip, display fullscreen video player that plays assigned videos sequentially. Video controls must be button-free using device gestures: tilt device to scrub through video, shake device to skip to next/previous video (based on shake direction). Exit fullscreen mode via swipe gesture. Must integrate with existing profile system to enforce daily watch time limits and track watch sessions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Device-Specific NFC Scanning Interface (Priority: P1)

As a child user, I want to see a clear, animated indicator showing exactly where to place my NFC chip on my specific device (smartphone or tablet), so that I can successfully scan my chip to start watching videos.

**Why this priority**: This is the entry point to the entire Kids Mode experience. Without successful NFC scanning, no other features are accessible. The device-specific guidance is critical for young children who may not understand abstract scanning instructions.

**Independent Test**: Can be fully tested by opening the /kids route on different devices (smartphone/tablet) and verifying that a pulsating scan area appears in the device-appropriate location. The test can verify visual appeal and accessibility without requiring actual NFC hardware. Delivers immediate value: children know exactly where to place their chip.

**Acceptance Scenarios**:

1. **Given** I open the /kids route on a smartphone, **When** the page loads, **Then** I see a pulsating circular area in the top-center of the screen indicating where to place my NFC chip
2. **Given** I open the /kids route on a tablet, **When** the page loads, **Then** I see a pulsating rectangular area positioned based on the device's NFC sensor location
3. **Given** the NFC scanning interface is displayed, **When** I observe the pulsating animation, **Then** it repeats continuously with clear visual appeal (color changes, size changes, glow effects)
4. **Given** my device does not support NFC, **When** the /kids page loads, **Then** I see a simulation mode with an input field to manually enter chip IDs for testing
5. **Given** I am on the Kids Mode scanning screen, **When** I scan a registered NFC chip, **Then** the pulsating animation stops and a success indicator appears before loading videos

---

### User Story 2 - Sequential Video Playback from NFC Chip (Priority: P1)

As a child user, I want to scan my NFC chip and immediately see my assigned videos start playing in fullscreen mode in the correct order, so that I can enjoy my curated playlist without any configuration steps.

**Why this priority**: This is the core value delivery of the feature. Children must be able to scan a chip and immediately start watching - no buttons, no menus, no decisions. Sequential playback ensures parents' curation is respected.

**Independent Test**: Can be tested by assigning 3 videos to an NFC chip in sequence (Video A → Video B → Video C), scanning the chip in Kids Mode, and verifying that Video A plays first in fullscreen, followed automatically by Video B and Video C. Delivers immediate value: frictionless video playback experience.

**Acceptance Scenarios**:

1. **Given** an NFC chip has 3 videos assigned in sequence (A, B, C), **When** I scan the chip in Kids Mode, **Then** Video A starts playing immediately in fullscreen mode
2. **Given** Video A is playing, **When** Video A finishes, **Then** Video B starts playing automatically without any user interaction
3. **Given** all assigned videos have finished playing, **When** the last video ends, **Then** the interface returns to the NFC scanning screen
4. **Given** a scanned chip has only 1 video assigned, **When** that video finishes, **Then** the interface returns to the NFC scanning screen
5. **Given** I scan a chip with no videos assigned, **When** the scan completes, **Then** I see a friendly error message ("No videos found on this chip! Ask a grown-up to add some videos.")

---

### User Story 3 - Button-Free Gesture Controls (Priority: P1)

As a child user, I want to control video playback using simple device gestures (tilt to scrub, shake to skip), so that I can navigate videos without needing to find or press small buttons on the screen.

**Why this priority**: This is the defining feature that makes Kids Mode truly button-free and child-friendly. Gestures are more intuitive for young children than UI buttons and prevent accidental exits from fullscreen mode.

**Independent Test**: Can be tested by playing a video in Kids Mode fullscreen, tilting the device forward/backward to verify scrubbing behavior, and shaking the device left/right to verify skip functionality. Delivers value: intuitive, physical interaction model for children.

**Acceptance Scenarios**:

1. **Given** a video is playing in fullscreen mode, **When** I tilt my device forward (top edge down), **Then** the video scrubs forward proportionally to the tilt angle
2. **Given** a video is playing in fullscreen mode, **When** I tilt my device backward (bottom edge down), **Then** the video scrubs backward proportionally to the tilt angle
3. **Given** a video is playing in fullscreen mode, **When** I shake my device to the right, **Then** the current video stops and the next video in the sequence starts playing
4. **Given** a video is playing and it's the last video in the sequence, **When** I shake my device to the right, **Then** the video returns to the beginning or shows a friendly message ("No more videos! This is the last one.")
5. **Given** a video is playing in fullscreen mode, **When** I shake my device to the left, **Then** the previous video in the sequence starts playing
6. **Given** the first video in the sequence is playing, **When** I shake left, **Then** the video restarts from the beginning
7. **Given** the device is stationary, **When** a video is playing, **Then** playback continues normally without unintended scrubbing or skipping

---

### User Story 4 - Swipe-to-Exit Fullscreen Mode (Priority: P2)

As a child user, I want to swipe the screen in a specific direction to exit fullscreen mode and return to the NFC scanning screen, so that I can scan a different chip to watch different videos.

**Why this priority**: Important for flexibility, but not critical for MVP. Children can wait for videos to finish to return to the scanning screen, or parents can refresh the page. However, this provides a clean exit path.

**Independent Test**: Can be tested by entering fullscreen video playback, performing a swipe gesture (down from top edge), and verifying that the video stops and the NFC scanning screen appears. Delivers value: children can switch between chips without parent intervention.

**Acceptance Scenarios**:

1. **Given** a video is playing in fullscreen mode, **When** I swipe down from the top edge of the screen, **Then** the video stops and I return to the NFC scanning screen
2. **Given** I perform a swipe-to-exit gesture, **When** the scanning screen appears, **Then** the current watch session is ended and watch time is recorded
3. **Given** I am on the NFC scanning screen, **When** I attempt a swipe gesture, **Then** nothing happens (swipe only works in fullscreen mode)
4. **Given** I perform a small accidental swipe during video playback, **When** the swipe distance is below the threshold (e.g., < 100px), **Then** the video continues playing and fullscreen mode is maintained

---

### User Story 5 - Watch Time Enforcement (Priority: P1)

As a parent, I want Kids Mode to respect the daily watch time limits I've set for my child's profile, so that my children cannot exceed their allowed screen time by repeatedly scanning NFC chips.

**Why this priority**: This is a critical safety and parenting feature. Without watch time enforcement, the entire profile management system becomes meaningless in Kids Mode.

**Independent Test**: Can be tested by setting a profile's daily limit to 10 minutes, watching 8 minutes of video, then scanning another chip and verifying that only 2 minutes of the next video can be watched before a friendly limit message appears. Delivers value: parental control over screen time.

**Acceptance Scenarios**:

1. **Given** a profile has 10 minutes of daily watch time allowed and has watched 8 minutes today, **When** I scan an NFC chip, **Then** videos play for only 2 minutes before showing a limit message
2. **Given** a profile has reached its daily watch time limit, **When** I scan any NFC chip in Kids Mode, **Then** I see a friendly message ("You've watched enough for today! See you tomorrow!") and videos do not play
3. **Given** a video is playing and the daily limit is reached mid-video, **When** the time limit is hit, **Then** the video stops immediately and the limit message appears
4. **Given** it is a new day (after midnight), **When** I scan an NFC chip, **Then** the daily watch time counter resets and I can watch my full daily allowance
5. **Given** no profile is selected in Kids Mode, **When** I scan an NFC chip, **Then** a default watch time limit is applied OR a profile selection screen appears before videos play

---

### User Story 6 - Profile Selection for Watch Time Tracking (Priority: P2)

As a parent, I want my child to select their profile before scanning an NFC chip in Kids Mode, so that watch time is tracked correctly for each child in a multi-child household.

**Why this priority**: Important for multi-child households, but not critical for single-child MVP. Can be deferred or handled with a default profile approach initially.

**Independent Test**: Can be tested by creating 2 profiles (Alice, Bob), selecting Alice's profile at the start of Kids Mode, watching videos, and verifying that only Alice's watch time increases. Delivers value: accurate per-child tracking.

**Acceptance Scenarios**:

1. **Given** I open the /kids route and no profile is selected, **When** the page loads, **Then** I see a profile selection screen showing all available child profiles with avatars
2. **Given** I am on the profile selection screen, **When** I tap a profile avatar, **Then** that profile is selected and I proceed to the NFC scanning screen
3. **Given** a profile is selected, **When** I scan an NFC chip and watch videos, **Then** watch time is recorded against the selected profile
4. **Given** I want to switch to a different child's profile, **When** I perform a special gesture or navigate to settings, **Then** I can return to the profile selection screen
5. **Given** only one profile exists, **When** the /kids page loads, **Then** that profile is automatically selected and I see the NFC scanning screen immediately

---

### Edge Cases

- What happens when the device's orientation sensor or accelerometer is not available (e.g., desktop browser)?
- How does the system handle gesture misinterpretation (e.g., tilt detected as shake)?
- What happens when a video assigned to a chip is deleted from the Video Library while a child is watching?
- How does the system handle network connectivity loss during video playback?
- What happens when the device goes to sleep mode or locks during video playback?
- How does the system handle multiple rapid shake gestures in quick succession?
- What happens when the tilt angle exceeds the maximum scrubbing range (e.g., device is fully upside down)?
- How does the system differentiate between intentional gestures and normal device movement (e.g., child walking while holding device)?
- What happens when watch time limit is reached exactly as a video ends?
- How does the system handle chips with videos that exceed the remaining daily watch time?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a device-specific NFC scanning interface at the /kids route
- **FR-002**: System MUST show a pulsating visual indicator in the appropriate location based on device type (smartphone top-center, tablet edge-center)
- **FR-003**: System MUST detect device type on page load and adjust NFC scanning UI accordingly
- **FR-004**: System MUST provide a simulation mode for devices without NFC support (manual chip ID entry)
- **FR-005**: System MUST fetch assigned videos for a scanned NFC chip in sequence order
- **FR-006**: System MUST automatically play videos in sequence without user interaction (first video → second video → ... → last video)
- **FR-007**: System MUST display videos in fullscreen mode during playback
- **FR-008**: System MUST use the device's DeviceOrientationEvent API to detect tilt gestures for video scrubbing
- **FR-009**: System MUST scrub video forward when device is tilted forward (positive beta angle) proportionally to tilt angle
- **FR-010**: System MUST scrub video backward when device is tilted backward (negative beta angle) proportionally to tilt angle
- **FR-011**: System MUST use the device's DeviceMotionEvent API to detect shake gestures for video skipping
- **FR-012**: System MUST skip to the next video in sequence when device is shaken to the right (positive x-axis acceleration spike)
- **FR-013**: System MUST skip to the previous video in sequence when device is shaken to the left (negative x-axis acceleration spike)
- **FR-014**: System MUST differentiate between intentional shakes and normal device movement using acceleration threshold and duration
- **FR-015**: System MUST implement swipe-down gesture detection to exit fullscreen mode
- **FR-016**: System MUST require a minimum swipe distance threshold to prevent accidental exits
- **FR-017**: System MUST end the current watch session and return to NFC scanning screen when swipe-to-exit is detected
- **FR-018**: System MUST integrate with the existing profile system to fetch daily watch time limits
- **FR-019**: System MUST track watch time against the selected profile during video playback
- **FR-020**: System MUST stop video playback and display a limit message when daily watch time is reached
- **FR-021**: System MUST reset daily watch time counter at midnight based on the user's timezone
- **FR-022**: System MUST display a profile selection screen before the NFC scanning screen (if multiple profiles exist)
- **FR-023**: System MUST automatically select the only available profile if only one profile exists
- **FR-024**: Users MUST be able to switch profiles from Kids Mode using a hidden gesture or button
- **FR-025**: System MUST display child-friendly error messages for all failure scenarios (no videos, network error, limit reached)
- **FR-026**: System MUST use large, colorful, emoji-rich UI elements suitable for young children
- **FR-027**: System MUST prevent access to parent mode (login, settings, etc.) from Kids Mode interface
- **FR-028**: System MUST continue video playback when device orientation changes (landscape ↔ portrait)
- **FR-029**: System MUST handle video loading errors gracefully and skip to the next video in sequence
- **FR-030**: System MUST prevent video controls (play/pause buttons, progress bar) from appearing in fullscreen mode

### Key Entities *(include if feature involves data)*

- **NFC Chip**: Represents a physical NFC tag that has been registered by a parent. Each chip has a unique ID (chip_uid) and is associated with an ordered list of videos (via video_nfc_mappings with sequence_order).
- **Profile**: Represents a child's profile with name, avatar, and daily_limit_minutes. Used to track watch time and enforce parental limits.
- **Watch Session**: Represents a single viewing session in Kids Mode. Tracks which profile is watching, which video(s) are being watched, start/end times, and duration.
- **Daily Watch Time**: Aggregates total minutes watched per profile per day. Used to enforce daily limits.
- **Video**: Represents a video from the Video Library with metadata (title, thumbnail, platform, video_id, duration).
- **Gesture Event**: Logical representation of a detected gesture (tilt, shake, swipe) with parameters like angle, acceleration, direction, and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Children aged 4-8 can successfully scan an NFC chip and start watching videos within 10 seconds without adult assistance (measured via usability testing)
- **SC-002**: Gesture controls have a recognition accuracy rate of at least 90% (9 out of 10 intentional gestures correctly detected)
- **SC-003**: Gesture controls have a false-positive rate of less than 5% (unintentional gestures triggering actions)
- **SC-004**: Video transitions (automatic next video, gesture-triggered skip) complete within 2 seconds
- **SC-005**: Kids Mode interface maintains 60fps animation performance for pulsating NFC scan area on devices as old as iPhone 8 / Samsung Galaxy S9
- **SC-006**: Daily watch time limits are enforced with 100% accuracy (no edge cases allow children to exceed limits)
- **SC-007**: Watch time tracking has accuracy within 5 seconds (difference between actual playback time and recorded time)
- **SC-008**: NFC scanning success rate is at least 95% for properly registered chips on NFC-enabled devices
- **SC-009**: 95% of children can exit fullscreen mode using swipe gesture on first attempt (after brief explanation)
- **SC-010**: Zero parent-mode UI elements (buttons, navigation, settings) are accessible from Kids Mode interface
- **SC-011**: Profile selection interface allows children to select correct profile within 5 seconds on 90% of attempts
- **SC-012**: System handles network interruptions gracefully with video resuming within 3 seconds when connectivity is restored

## Assumptions

1. **Device Support**: We assume target devices have modern web browsers with support for DeviceOrientationEvent and DeviceMotionEvent APIs (iOS 13+, Android 9+, modern desktop browsers).
2. **NFC Web API**: We assume NFC Web API (NDEFReader) is available on target devices or that a simulation mode is acceptable for testing/development.
3. **Video Hosting**: We assume videos are hosted on platforms that support iframe embed with autoplay (YouTube, Vimeo, Dailymotion) or that a platform-agnostic player can be implemented.
4. **Screen Orientation Lock**: We assume devices support screen orientation locking in fullscreen mode or that orientation changes during playback are handled gracefully.
5. **Network Connectivity**: We assume reliable internet connectivity for video streaming. Offline playback is out of scope.
6. **Parent Trust**: We assume parents have already registered NFC chips and assigned age-appropriate videos. Content moderation is out of scope.
7. **Single Device**: We assume one child uses one device at a time (no multi-device scenarios for the same profile).
8. **Browser Permissions**: We assume users will grant necessary permissions (motion sensors, fullscreen, NFC) when prompted.
9. **Timezone Handling**: We assume daily watch time resets based on the parent's account timezone setting.
10. **Gesture Calibration**: We assume default gesture thresholds work for most children. Custom calibration is out of scope for MVP.

## Open Questions / Clarifications

1. **Profile Selection Default Behavior**: If multiple profiles exist, should Kids Mode remember the last selected profile or always show the selection screen? [NEEDS CLARIFICATION: UX preference not specified]
2. **Parent Exit Mechanism**: How should parents exit Kids Mode to return to parent mode (PIN code, hidden button sequence, timeout)? [NEEDS CLARIFICATION: Security/UX trade-off not specified]
3. **Gesture Sensitivity**: Should gesture sensitivity (tilt angle threshold, shake acceleration threshold) be configurable per profile or system-wide? [NEEDS CLARIFICATION: Customization level not specified]

## Out of Scope

The following capabilities are explicitly **not included** in this feature:

1. **Offline Video Playback**: Videos must be streamed. Downloading for offline viewing is not supported.
2. **Video Recording**: Kids Mode is view-only. Children cannot record videos from within the interface.
3. **Custom Video Playlists**: Children cannot create or modify video playlists. All curation is done by parents in parent mode.
4. **In-Video Interactive Elements**: Clickable annotations, cards, or interactive features within videos are disabled.
5. **Multi-Child Simultaneous Sessions**: Only one child can use Kids Mode on a single device at a time.
6. **Advanced Gesture Customization**: Parents cannot customize gesture mappings (e.g., change shake-to-skip to double-tap).
7. **Voice Commands**: Voice control is not supported (e.g., "skip video", "pause").
8. **Haptic Feedback**: Vibration feedback for gesture recognition is not implemented (may be added later).
9. **Parental Override Button**: No emergency "extend watch time" button in Kids Mode. Parents must modify limits in parent mode.
10. **Video Analytics**: Detailed viewing analytics (watch percentage, rewatch count, favorite detection) are not tracked for this MVP.
