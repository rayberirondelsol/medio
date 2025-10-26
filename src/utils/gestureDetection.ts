/**
 * Gesture Detection Utilities for Kids Mode
 *
 * Provides gesture detection algorithms for:
 * - Tilt gestures (DeviceOrientationEvent) → video scrubbing
 * - Shake gestures (DeviceMotionEvent) → skip next/previous video
 * - Swipe gestures (TouchEvent) → exit fullscreen
 *
 * All thresholds are calibrated for children aged 4-8 based on research.md findings
 */

/**
 * Configuration for gesture detection thresholds
 */
export const GESTURE_CONFIG = {
  /** Dead zone for tilt detection (degrees) - prevents unintended scrubbing */
  tiltDeadZone: 15,

  /** Maximum tilt angle for scrubbing (degrees) - 45° = full speed */
  maxTiltAngle: 45,

  /** Shake detection threshold (m/s²) - calibrated for children (higher than adult 12 m/s²) */
  shakeThreshold: 18,

  /** Shake cooldown period (ms) - prevents double-triggering */
  shakeCooldown: 800,

  /** Minimum swipe distance (px) - prevents accidental exits */
  swipeMinDistance: 100,

  /** Orientation event throttle interval (ms) - 16ms = 60fps */
  orientationThrottle: 16,
} as const;

/**
 * Tilt state calculation result
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
 * Shake gesture detection result
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
 * Swipe gesture detection result
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
 * Acceleration data for shake detection
 */
export interface AccelerationData {
  x: number | null;
  y: number | null;
  z: number | null;
}

/**
 * Point coordinates for swipe detection
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate tilt state from device orientation beta angle
 *
 * @param beta Front-to-back tilt angle (-180 to 180 degrees)
 * @returns Tilt state with direction and intensity
 *
 * @example
 * // Device tilted forward 30 degrees
 * calculateTiltState(30) // { direction: 'forward', intensity: 0.5, rawBeta: 30 }
 *
 * // Device within dead zone
 * calculateTiltState(10) // { direction: 'neutral', intensity: 0, rawBeta: 10 }
 */
export function calculateTiltState(beta: number | null): TiltState {
  if (beta === null) {
    return {
      direction: 'neutral',
      intensity: 0,
      rawBeta: null,
    };
  }

  // Check if within dead zone (no scrubbing)
  if (isWithinDeadZone(beta)) {
    return {
      direction: 'neutral',
      intensity: 0,
      rawBeta: beta,
    };
  }

  // Determine direction
  const direction = beta > 0 ? 'forward' : 'backward';

  // Calculate intensity (0 to 1)
  // Remove dead zone offset and normalize to max angle
  const absBeta = Math.abs(beta);
  const effectiveAngle = Math.max(0, absBeta - GESTURE_CONFIG.tiltDeadZone);
  const angleRange = GESTURE_CONFIG.maxTiltAngle - GESTURE_CONFIG.tiltDeadZone;
  const intensity = Math.min(1.0, effectiveAngle / angleRange);

  return {
    direction,
    intensity,
    rawBeta: beta,
  };
}

/**
 * Check if angle is within dead zone
 *
 * @param angle Tilt angle in degrees
 * @returns True if within dead zone
 */
export function isWithinDeadZone(angle: number): boolean {
  return Math.abs(angle) < GESTURE_CONFIG.tiltDeadZone;
}

/**
 * Detect shake gesture from device motion acceleration
 *
 * @param acceleration X/Y/Z acceleration data (m/s²)
 * @param lastShakeTime Timestamp of last detected shake (for cooldown)
 * @returns Shake gesture if detected, null otherwise
 *
 * @example
 * // Shake right detected
 * detectShake({ x: 20, y: 0, z: 0 }, null)
 * // { direction: 'right', magnitude: 20, timestamp: 1234567890, isValid: true }
 *
 * // Within cooldown period
 * detectShake({ x: 20, y: 0, z: 0 }, Date.now() - 500) // null
 */
export function detectShake(
  acceleration: AccelerationData,
  lastShakeTime: number | null
): ShakeGesture | null {
  // Check if acceleration data is available
  if (acceleration.x === null) {
    return null;
  }

  // Check cooldown period
  if (lastShakeTime !== null) {
    const timeSinceLastShake = Date.now() - lastShakeTime;
    if (timeSinceLastShake < GESTURE_CONFIG.shakeCooldown) {
      return null;
    }
  }

  // Calculate magnitude (use absolute value for threshold check)
  const magnitude = Math.abs(acceleration.x);

  // Check if magnitude exceeds threshold
  if (magnitude < GESTURE_CONFIG.shakeThreshold) {
    return null;
  }

  // Determine direction based on sign of x-axis acceleration
  const direction = acceleration.x > 0 ? 'right' : 'left';

  return {
    direction,
    magnitude,
    timestamp: Date.now(),
    isValid: true,
  };
}

/**
 * Normalize acceleration value (handle null, return absolute value)
 *
 * @param value Acceleration value (m/s²)
 * @returns Normalized acceleration (always positive)
 */
export function normalizeAcceleration(value: number | null): number {
  if (value === null) {
    return 0;
  }
  return Math.abs(value);
}

/**
 * Calculate swipe gesture from touch start and end points
 *
 * @param start Touch start coordinates
 * @param end Touch end coordinates
 * @param duration Swipe duration in milliseconds
 * @returns Swipe gesture with direction and distance
 *
 * @example
 * // Swipe down 150px
 * calculateSwipeGesture({ x: 100, y: 50 }, { x: 100, y: 200 }, 150)
 * // { direction: 'down', distance: 150, duration: 150, ... }
 */
export function calculateSwipeGesture(
  start: Point,
  end: Point,
  duration: number
): SwipeGesture {
  // Calculate deltas
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  // Calculate distance (Pythagorean theorem)
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Determine direction (prioritize vertical over horizontal)
  let direction: 'up' | 'down' | 'left' | 'right';
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    // Vertical swipe
    direction = deltaY > 0 ? 'down' : 'up';
  } else {
    // Horizontal swipe
    direction = deltaX > 0 ? 'right' : 'left';
  }

  return {
    direction,
    distance,
    duration,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    timestamp: Date.now(),
  };
}
