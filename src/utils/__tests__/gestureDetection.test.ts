/**
 * Unit Tests for Gesture Detection Utilities
 *
 * TDD Workflow: RED-GREEN-REFACTOR
 * These tests MUST fail initially (RED), then implementation makes them pass (GREEN)
 *
 * Coverage:
 * - Tilt gesture detection (DeviceOrientationEvent)
 * - Shake gesture detection (DeviceMotionEvent)
 * - Swipe gesture detection (TouchEvent)
 * - Threshold calculations and debouncing
 */

import {
  calculateTiltState,
  detectShake,
  calculateSwipeGesture,
  isWithinDeadZone,
  normalizeAcceleration,
  GESTURE_CONFIG,
} from '../gestureDetection';

describe('gestureDetection', () => {
  describe('Tilt Detection (DeviceOrientationEvent)', () => {
    describe('calculateTiltState', () => {
      it('should return neutral when beta is null', () => {
        const result = calculateTiltState(null);
        expect(result).toEqual({
          direction: 'neutral',
          intensity: 0,
          rawBeta: null,
        });
      });

      it('should return neutral when tilt is within dead zone (< 15 degrees)', () => {
        const result = calculateTiltState(10);
        expect(result).toEqual({
          direction: 'neutral',
          intensity: 0,
          rawBeta: 10,
        });
      });

      it('should return forward when beta > 15 degrees', () => {
        const result = calculateTiltState(30);
        expect(result.direction).toBe('forward');
        expect(result.rawBeta).toBe(30);
        expect(result.intensity).toBeGreaterThan(0);
      });

      it('should return backward when beta < -15 degrees', () => {
        const result = calculateTiltState(-30);
        expect(result.direction).toBe('backward');
        expect(result.rawBeta).toBe(-30);
        expect(result.intensity).toBeGreaterThan(0);
      });

      it('should calculate intensity proportionally (0 to 1)', () => {
        // At exactly dead zone edge (15°), intensity should be ~0
        const atDeadZone = calculateTiltState(15);
        expect(atDeadZone.intensity).toBeLessThan(0.1);

        // At max tilt (45°), intensity should be 1
        const atMaxTilt = calculateTiltState(45);
        expect(atMaxTilt.intensity).toBeCloseTo(1, 2);

        // At mid-range (30°), intensity should be ~0.5
        const atMidRange = calculateTiltState(30);
        expect(atMidRange.intensity).toBeCloseTo(0.5, 1);
      });

      it('should cap intensity at 1.0 for tilt > max angle (45 degrees)', () => {
        const result = calculateTiltState(90);
        expect(result.intensity).toBe(1.0);
      });

      it('should handle negative tilt angles (backward)', () => {
        const result = calculateTiltState(-45);
        expect(result.direction).toBe('backward');
        expect(result.intensity).toBeCloseTo(1, 2);
      });
    });

    describe('isWithinDeadZone', () => {
      it('should return true for angles within dead zone', () => {
        expect(isWithinDeadZone(0)).toBe(true);
        expect(isWithinDeadZone(10)).toBe(true);
        expect(isWithinDeadZone(-10)).toBe(true);
        expect(isWithinDeadZone(14)).toBe(true);
      });

      it('should return false for angles outside dead zone', () => {
        expect(isWithinDeadZone(15)).toBe(false);
        expect(isWithinDeadZone(-15)).toBe(false);
        expect(isWithinDeadZone(45)).toBe(false);
      });
    });
  });

  describe('Shake Detection (DeviceMotionEvent)', () => {
    describe('detectShake', () => {
      it('should return null when acceleration is null', () => {
        const result = detectShake({ x: null, y: 0, z: 0 }, null);
        expect(result).toBeNull();
      });

      it('should return null when magnitude < threshold (18 m/s²)', () => {
        const result = detectShake({ x: 10, y: 0, z: 0 }, null);
        expect(result).toBeNull();
      });

      it('should detect right shake when x > threshold', () => {
        const result = detectShake({ x: 20, y: 0, z: 0 }, null);
        expect(result).not.toBeNull();
        expect(result?.direction).toBe('right');
        expect(result?.magnitude).toBeCloseTo(20, 2);
        expect(result?.isValid).toBe(true);
      });

      it('should detect left shake when x < -threshold', () => {
        const result = detectShake({ x: -20, y: 0, z: 0 }, null);
        expect(result).not.toBeNull();
        expect(result?.direction).toBe('left');
        expect(result?.magnitude).toBeCloseTo(20, 2);
        expect(result?.isValid).toBe(true);
      });

      it('should NOT detect shake within cooldown period (800ms)', () => {
        const now = Date.now();
        const lastShakeTime = now - 500; // 500ms ago (within cooldown)
        const result = detectShake({ x: 20, y: 0, z: 0 }, lastShakeTime);
        expect(result).toBeNull();
      });

      it('should detect shake after cooldown period expires', () => {
        const now = Date.now();
        const lastShakeTime = now - 900; // 900ms ago (cooldown expired)
        const result = detectShake({ x: 20, y: 0, z: 0 }, lastShakeTime);
        expect(result).not.toBeNull();
        expect(result?.direction).toBe('right');
      });

      it('should include timestamp in shake gesture', () => {
        const beforeTest = Date.now();
        const result = detectShake({ x: 20, y: 0, z: 0 }, null);
        const afterTest = Date.now();

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBeGreaterThanOrEqual(beforeTest);
        expect(result?.timestamp).toBeLessThanOrEqual(afterTest);
      });
    });

    describe('normalizeAcceleration', () => {
      it('should return 0 when acceleration is null', () => {
        expect(normalizeAcceleration(null)).toBe(0);
      });

      it('should return absolute value of acceleration', () => {
        expect(normalizeAcceleration(10)).toBe(10);
        expect(normalizeAcceleration(-10)).toBe(10);
      });

      it('should handle zero acceleration', () => {
        expect(normalizeAcceleration(0)).toBe(0);
      });
    });
  });

  describe('Swipe Detection (TouchEvent)', () => {
    describe('calculateSwipeGesture', () => {
      it('should calculate vertical swipe down', () => {
        const result = calculateSwipeGesture(
          { x: 100, y: 50 }, // start
          { x: 100, y: 200 }, // end (150px down)
          150 // duration (ms)
        );

        expect(result.direction).toBe('down');
        expect(result.distance).toBeCloseTo(150, 0);
        expect(result.duration).toBe(150);
        expect(result.startX).toBe(100);
        expect(result.startY).toBe(50);
        expect(result.endX).toBe(100);
        expect(result.endY).toBe(200);
      });

      it('should calculate vertical swipe up', () => {
        const result = calculateSwipeGesture(
          { x: 100, y: 200 },
          { x: 100, y: 50 },
          150
        );

        expect(result.direction).toBe('up');
        expect(result.distance).toBeCloseTo(150, 0);
      });

      it('should calculate horizontal swipe right', () => {
        const result = calculateSwipeGesture(
          { x: 50, y: 100 },
          { x: 200, y: 100 },
          150
        );

        expect(result.direction).toBe('right');
        expect(result.distance).toBeCloseTo(150, 0);
      });

      it('should calculate horizontal swipe left', () => {
        const result = calculateSwipeGesture(
          { x: 200, y: 100 },
          { x: 50, y: 100 },
          150
        );

        expect(result.direction).toBe('left');
        expect(result.distance).toBeCloseTo(150, 0);
      });

      it('should prioritize vertical direction when both axes have movement', () => {
        // Diagonal swipe: down 100px, right 50px
        const result = calculateSwipeGesture(
          { x: 50, y: 50 },
          { x: 100, y: 150 },
          150
        );

        expect(result.direction).toBe('down'); // Vertical dominates
      });

      it('should calculate diagonal distance correctly', () => {
        // Pythagorean theorem: sqrt(100² + 100²) = ~141.42
        const result = calculateSwipeGesture(
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          150
        );

        expect(result.distance).toBeCloseTo(141.42, 1);
      });

      it('should include timestamp', () => {
        const beforeTest = Date.now();
        const result = calculateSwipeGesture(
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          150
        );
        const afterTest = Date.now();

        expect(result.timestamp).toBeGreaterThanOrEqual(beforeTest);
        expect(result.timestamp).toBeLessThanOrEqual(afterTest);
      });
    });
  });

  describe('GESTURE_CONFIG Constants', () => {
    it('should define tilt dead zone as 15 degrees', () => {
      expect(GESTURE_CONFIG.tiltDeadZone).toBe(15);
    });

    it('should define max tilt angle as 45 degrees', () => {
      expect(GESTURE_CONFIG.maxTiltAngle).toBe(45);
    });

    it('should define shake threshold as 18 m/s²', () => {
      expect(GESTURE_CONFIG.shakeThreshold).toBe(18);
    });

    it('should define shake cooldown as 800ms', () => {
      expect(GESTURE_CONFIG.shakeCooldown).toBe(800);
    });

    it('should define swipe minimum distance as 100px', () => {
      expect(GESTURE_CONFIG.swipeMinDistance).toBe(100);
    });

    it('should define orientation throttle as 16ms (60fps)', () => {
      expect(GESTURE_CONFIG.orientationThrottle).toBe(16);
    });
  });
});
