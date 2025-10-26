/**
 * TypeScript Interface Contracts for Kids Mode Gesture Controls
 *
 * These interfaces define the shape of data for gesture detection, video playback,
 * and session management in Kids Mode.
 *
 * **Usage**: Import these interfaces in React components and custom hooks.
 */

// ============================================================================
// GESTURE DETECTION INTERFACES
// ============================================================================

/**
 * Device orientation data from DeviceOrientationEvent
 */
export interface OrientationData {
  /** Front-to-back tilt (-180 to 180 degrees) */
  beta: number | null;

  /** Left-to-right tilt (-90 to 90 degrees) */
  gamma: number | null;

  /** Compass heading (0 to 360 degrees) */
  alpha: number | null;

  /** Timestamp of last event (ms since epoch) */
  timestamp: number;
}

/**
 * Calculated tilt state for video scrubbing
 */
export interface TiltState {
  /** Tilt direction */
  direction: 'forward' | 'backward' | 'neutral';

  /** Tilt intensity (0 to 1, where 1 is max tilt angle) */
  intensity: number;

  /** Raw beta angle for debugging */
  rawBeta: number | null;
}

/**
 * Device motion data from DeviceMotionEvent
 */
export interface MotionData {
  /** X-axis acceleration (m/s²) */
  accelerationX: number | null;

  /** Y-axis acceleration (m/s²) */
  accelerationY: number | null;

  /** Z-axis acceleration (m/s²) */
  accelerationZ: number | null;

  /** Timestamp of last event (ms since epoch) */
  timestamp: number;
}

/**
 * Detected shake gesture
 */
export interface ShakeGesture {
  /** Shake direction */
  direction: 'left' | 'right';

  /** Acceleration magnitude (m/s²) */
  magnitude: number;

  /** Timestamp when shake was detected (ms since epoch) */
  timestamp: number;

  /** Whether shake crossed threshold */
  isValid: boolean;
}

/**
 * Swipe gesture for exit
 */
export interface SwipeGesture {
  /** Swipe direction */
  direction: 'up' | 'down' | 'left' | 'right';

  /** Swipe distance in pixels */
  distance: number;

  /** Swipe duration in milliseconds */
  duration: number;

  /** Starting coordinates */
  startX: number;
  startY: number;

  /** Ending coordinates */
  endX: number;
  endY: number;

  /** Timestamp when swipe ended (ms since epoch) */
  timestamp: number;
}

/**
 * Configuration for gesture detection thresholds
 */
export interface GestureConfig {
  /** Tilt detection config */
  tilt: {
    /** Dead zone angle (degrees) - no scrubbing below this */
    deadZone: number;

    /** Maximum effective tilt angle (degrees) */
    maxTilt: number;

    /** Scrub speed (seconds per second at max tilt) */
    scrubSpeed: number;

    /** Throttle interval (milliseconds) */
    throttleMs: number;
  };

  /** Shake detection config */
  shake: {
    /** Acceleration threshold (m/s²) */
    threshold: number;

    /** Debounce interval (milliseconds) */
    debounceMs: number;

    /** X-axis dominance ratio (X must be this many times larger than Y/Z) */
    xDominanceRatio: number;
  };

  /** Swipe detection config */
  swipe: {
    /** Minimum swipe distance (pixels) */
    minDistance: number;

    /** Maximum swipe duration (milliseconds) */
    maxDuration: number;
  };
}

/**
 * Default gesture configuration (per research findings)
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  tilt: {
    deadZone: 15, // degrees
    maxTilt: 45, // degrees
    scrubSpeed: 2, // seconds per second
    throttleMs: 16, // 60fps
  },
  shake: {
    threshold: 18, // m/s² (child-optimized)
    debounceMs: 800, // milliseconds
    xDominanceRatio: 1.5,
  },
  swipe: {
    minDistance: 100, // pixels
    maxDuration: 500, // milliseconds
  },
};

// ============================================================================
// VIDEO PLAYBACK INTERFACES
// ============================================================================

/**
 * Video data with sequence order (from API)
 */
export interface SequencedVideo {
  id: string;
  title: string;
  platform_id: string;
  platform_video_id: string;
  duration_seconds: number;
  thumbnail_url?: string;
  sequence_order: number;
}

/**
 * Platform-agnostic video player interface
 */
export interface IVideoPlayer {
  /**
   * Load video by platform-specific ID
   * @param videoId Platform video ID (e.g., YouTube video ID)
   * @returns Promise that resolves when video is loaded
   */
  load(videoId: string): Promise<void>;

  /**
   * Start or resume video playback
   * @returns Promise that resolves when playback starts
   */
  play(): Promise<void>;

  /**
   * Pause video playback
   */
  pause(): void;

  /**
   * Seek to specific time position
   * @param seconds Time position in seconds
   */
  seekTo(seconds: number): void;

  /**
   * Get current playback position
   * @returns Promise resolving to current time in seconds
   */
  getCurrentTime(): Promise<number>;

  /**
   * Get video duration
   * @returns Promise resolving to duration in seconds
   */
  getDuration(): Promise<number>;

  /**
   * Set volume level
   * @param volume Volume level (0-100)
   */
  setVolume(volume: number): void;

  /**
   * Register event listener
   * @param event Event name
   * @param callback Event handler
   */
  on(event: 'ended' | 'playing' | 'paused' | 'error', callback: () => void): void;

  /**
   * Remove event listener
   * @param event Event name
   * @param callback Event handler to remove
   */
  off(event: 'ended' | 'playing' | 'paused' | 'error', callback: () => void): void;

  /**
   * Destroy player instance and clean up resources
   */
  destroy(): void;
}

/**
 * Video player state
 */
export type VideoPlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'scrubbing' | 'transitioning' | 'ended' | 'error';

/**
 * Video playback context
 */
export interface VideoPlaybackContext {
  /** Current video being played */
  currentVideo: SequencedVideo | null;

  /** All videos in sequence */
  videos: SequencedVideo[];

  /** Current video index (0-based) */
  currentIndex: number;

  /** Player state */
  state: VideoPlayerState;

  /** Current playback position (seconds) */
  currentTime: number;

  /** Video duration (seconds) */
  duration: number;

  /** Whether video is fullscreen */
  isFullscreen: boolean;

  /** Error message (if state === 'error') */
  error: string | null;
}

// ============================================================================
// SESSION MANAGEMENT INTERFACES
// ============================================================================

/**
 * Watch session data
 */
export interface WatchSession {
  /** Unique session ID */
  session_id: string;

  /** Profile ID (which child is watching) */
  profile_id: string;

  /** Current video ID */
  video_id: string;

  /** NFC chip UID used for scan */
  chip_uid: string;

  /** Session start timestamp (ISO 8601) */
  started_at: string;

  /** Elapsed seconds since start */
  elapsed_seconds: number;

  /** Remaining minutes in daily allowance */
  remaining_minutes: number;

  /** Daily limit in minutes */
  daily_limit_minutes: number;

  /** Whether limit has been reached */
  limit_reached: boolean;
}

/**
 * Session heartbeat response
 */
export interface SessionHeartbeatResponse {
  session_id: string;
  elapsed_seconds: number;
  remaining_minutes: number;
  limit_reached: boolean;
  message?: string; // Child-friendly message if limit reached
}

/**
 * Stopped reason enum
 */
export type StoppedReason =
  | 'video_completed'
  | 'user_exit'
  | 'limit_reached'
  | 'next_video'
  | 'previous_video'
  | 'network_error'
  | 'component_unmount';

/**
 * End session request
 */
export interface EndSessionRequest {
  stopped_reason: StoppedReason;
  final_position_seconds?: number;
}

/**
 * End session response
 */
export interface EndSessionResponse {
  session_id: string;
  duration_seconds: number;
  stopped_reason: StoppedReason;
  remaining_minutes: number;
}

// ============================================================================
// PROFILE & NFC INTERFACES
// ============================================================================

/**
 * Child profile
 */
export interface ChildProfile {
  id: string;
  name: string;
  avatar_url?: string;
  daily_limit_minutes: number;
}

/**
 * NFC chip data
 */
export interface NFCChip {
  id: string;
  chip_uid: string;
  label: string;
  is_active: boolean;
}

/**
 * NFC scan result
 */
export interface NFCScanResult {
  chip: NFCChip;
  videos: SequencedVideo[];
}

// ============================================================================
// KIDS MODE STATE MACHINE INTERFACES
// ============================================================================

/**
 * Kids Mode state
 */
export type KidsModeState =
  | 'profile_selection'
  | 'nfc_scanning'
  | 'loading_videos'
  | 'fullscreen_playback'
  | 'limit_reached'
  | 'error';

/**
 * Kids Mode context
 */
export interface KidsModeContext {
  /** Current state */
  state: KidsModeState;

  /** Selected profile */
  selectedProfile: ChildProfile | null;

  /** Scanned NFC chip */
  scannedChip: NFCChip | null;

  /** Videos from chip */
  videos: SequencedVideo[];

  /** Active watch session */
  session: WatchSession | null;

  /** Video playback context */
  playback: VideoPlaybackContext;

  /** Error message (if state === 'error') */
  error: string | null;

  /** Whether gestures are enabled */
  gesturesEnabled: boolean;

  /** Remaining watch time (minutes) */
  remainingMinutes: number;
}

/**
 * Kids Mode actions
 */
export type KidsModeAction =
  | { type: 'SELECT_PROFILE'; payload: ChildProfile }
  | { type: 'SCAN_CHIP'; payload: NFCScanResult }
  | { type: 'START_PLAYBACK'; payload: WatchSession }
  | { type: 'UPDATE_PLAYBACK'; payload: Partial<VideoPlaybackContext> }
  | { type: 'HEARTBEAT_RESPONSE'; payload: SessionHeartbeatResponse }
  | { type: 'LIMIT_REACHED'; payload: string }
  | { type: 'EXIT_FULLSCREEN' }
  | { type: 'RETURN_TO_SCAN' }
  | { type: 'ERROR'; payload: string };

// ============================================================================
// CUSTOM HOOK RETURN TYPES
// ============================================================================

/**
 * useDeviceOrientation hook return type
 */
export interface UseDeviceOrientationReturn {
  /** Current orientation data */
  orientation: OrientationData;

  /** Calculated tilt state */
  tiltState: TiltState;

  /** Whether DeviceOrientationEvent is supported */
  isSupported: boolean;

  /** Whether permission has been granted (iOS 13+) */
  permissionGranted: boolean;

  /** Request permission (iOS 13+ only) */
  requestPermission: () => Promise<boolean>;

  /** Start listening for orientation events */
  startListening: () => void;

  /** Stop listening for orientation events */
  stopListening: () => void;
}

/**
 * useShakeDetection hook return type
 */
export interface UseShakeDetectionReturn {
  /** Last detected shake gesture */
  lastShake: ShakeGesture | null;

  /** Whether DeviceMotionEvent is supported */
  isSupported: boolean;

  /** Whether permission has been granted (iOS 13+) */
  permissionGranted: boolean;

  /** Request permission (iOS 13+ only) */
  requestPermission: () => Promise<boolean>;

  /** Start listening for shake events */
  startListening: () => void;

  /** Stop listening for shake events */
  stopListening: () => void;

  /** Reset shake detection (clear cooldown) */
  reset: () => void;
}

/**
 * useSwipeGesture hook return type
 */
export interface UseSwipeGestureReturn {
  /** Last detected swipe gesture */
  lastSwipe: SwipeGesture | null;

  /** Whether currently tracking a swipe */
  isSwiping: boolean;

  /** Reset swipe detection */
  reset: () => void;
}

/**
 * useVideoPlayer hook return type
 */
export interface UseVideoPlayerReturn {
  /** Video player instance */
  player: IVideoPlayer | null;

  /** Video playback context */
  playback: VideoPlaybackContext;

  /** Load video by ID */
  loadVideo: (video: SequencedVideo) => Promise<void>;

  /** Play current video */
  play: () => Promise<void>;

  /** Pause current video */
  pause: () => void;

  /** Seek to time position */
  seekTo: (seconds: number) => void;

  /** Play next video in sequence */
  playNext: () => Promise<void>;

  /** Play previous video in sequence */
  playPrevious: () => Promise<void>;

  /** Enter fullscreen mode */
  enterFullscreen: () => Promise<void>;

  /** Exit fullscreen mode */
  exitFullscreen: () => Promise<void>;

  /** Cleanup and destroy player */
  cleanup: () => void;
}

/**
 * useWatchSession hook return type
 */
export interface UseWatchSessionReturn {
  /** Active session */
  session: WatchSession | null;

  /** Start new session */
  startSession: (
    profileId: string,
    videoId: string,
    chipUid: string
  ) => Promise<WatchSession>;

  /** Send heartbeat */
  sendHeartbeat: (currentPosition: number) => Promise<SessionHeartbeatResponse>;

  /** End session */
  endSession: (request: EndSessionRequest) => Promise<EndSessionResponse>;

  /** Whether session is active */
  isActive: boolean;

  /** Remaining watch time (minutes) */
  remainingMinutes: number;

  /** Whether limit has been reached */
  limitReached: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Gesture error types
 */
export class GesturePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GesturePermissionError';
  }
}

export class GestureNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GestureNotSupportedError';
  }
}

/**
 * Video player error types
 */
export class VideoLoadError extends Error {
  constructor(
    message: string,
    public videoId: string,
    public platform: string
  ) {
    super(message);
    this.name = 'VideoLoadError';
  }
}

export class VideoPlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoPlaybackError';
  }
}

/**
 * Session error types
 */
export class SessionLimitReachedError extends Error {
  constructor(
    message: string,
    public totalMinutes: number,
    public limitMinutes: number
  ) {
    super(message);
    this.name = 'SessionLimitReachedError';
  }
}

export class SessionNotFoundError extends Error {
  constructor(message: string, public sessionId: string) {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Platform type
 */
export type VideoPlatform = 'youtube' | 'vimeo' | 'dailymotion';

/**
 * Device type detection
 */
export type DeviceType = 'smartphone' | 'tablet' | 'desktop';

/**
 * NFC scan area position (device-specific)
 */
export interface NFCScanAreaPosition {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  transform?: string;
}

/**
 * Utility: Get scan area position based on device type
 */
export function getNFCScanAreaPosition(deviceType: DeviceType): NFCScanAreaPosition {
  switch (deviceType) {
    case 'smartphone':
      return {
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    case 'tablet':
      return {
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
      };
    default:
      // Desktop - no NFC support
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}
