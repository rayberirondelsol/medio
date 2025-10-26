/**
 * Unit Tests for useShakeDetection Hook
 *
 * Tests shake-to-skip gesture detection functionality:
 * - DeviceMotionEvent listener setup/cleanup
 * - 18 m/s² acceleration threshold
 * - 800ms cooldown period
 * - Left/right direction detection
 * - False-positive prevention
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useShakeDetection } from '../useShakeDetection';

// Mock DeviceMotionEvent
class MockDeviceMotionEvent extends Event {
  accelerationIncludingGravity: { x: number | null; y: number | null; z: number | null } | null;

  constructor(type: string, eventInitDict?: any) {
    super(type);
    this.accelerationIncludingGravity = eventInitDict?.accelerationIncludingGravity || null;
  }
}

(global as any).DeviceMotionEvent = MockDeviceMotionEvent;

describe('useShakeDetection', () => {
  describe('Event Listener Setup/Cleanup', () => {
    it('should add devicemotion event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useShakeDetection());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove devicemotion event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useShakeDetection());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Initialization', () => {
    it('should initialize with no shake detected', () => {
      const { result } = renderHook(() => useShakeDetection());

      expect(result.current.shakeDetected).toBe(false);
      expect(result.current.shakeDirection).toBe('none');
      expect(result.current.lastShakeTime).toBeNull();
    });
  });

  describe('Acceleration Threshold (18 m/s²)', () => {
    it('should detect shake when x-axis acceleration exceeds 18 m/s²', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
      expect(result.current.shakeDirection).toBe('right');
    });

    it('should NOT detect shake when acceleration is below 18 m/s²', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 15, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
      expect(result.current.shakeDirection).toBe('none');
    });

    it('should detect shake at exactly 18 m/s² threshold', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 18, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
    });

    it('should handle negative acceleration (absolute value for threshold check)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: -20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
      expect(result.current.shakeDirection).toBe('left');
    });
  });

  describe('Direction Detection', () => {
    it('should detect right shake (positive x acceleration)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDirection).toBe('right');
    });

    it('should detect left shake (negative x acceleration)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: -20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDirection).toBe('left');
    });

    it('should prioritize x-axis for direction (ignore y/z)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 25, y: 10, z: 10 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDirection).toBe('right');
    });
  });

  describe('Cooldown Period (800ms)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should prevent shake detection within 800ms cooldown', () => {
      const { result } = renderHook(() => useShakeDetection());

      // First shake
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);

      // Reset shake detected flag (simulates consumption)
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      // Second shake within cooldown (500ms later)
      act(() => {
        jest.advanceTimersByTime(500);
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
    });

    it('should allow shake detection after 800ms cooldown', () => {
      const { result } = renderHook(() => useShakeDetection());

      // First shake
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
      const firstShakeTime = result.current.lastShakeTime;

      // Reset shake detected
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      // Second shake after cooldown (850ms later)
      act(() => {
        jest.advanceTimersByTime(850);
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
      expect(result.current.lastShakeTime).not.toBe(firstShakeTime);
    });

    it('should update lastShakeTime on each detected shake', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastShakeTime).not.toBeNull();
      expect(typeof result.current.lastShakeTime).toBe('number');
    });
  });

  describe('False-Positive Prevention', () => {
    it('should NOT detect shake with only y-axis acceleration (vertical motion)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 20, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
    });

    it('should NOT detect shake with only z-axis acceleration (depth motion)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 0, z: 20 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
    });

    it('should handle null acceleration data gracefully', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: null,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
      expect(result.current.shakeDirection).toBe('none');
    });

    it('should handle null x acceleration gracefully', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: null, y: 10, z: 10 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
    });

    it('should ignore small vibrations (below threshold)', () => {
      const { result } = renderHook(() => useShakeDetection());

      // Simulate small vibrations
      act(() => {
        window.dispatchEvent(
          new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: 5, y: 0, z: 0 },
          })
        );
        window.dispatchEvent(
          new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: -5, y: 0, z: 0 },
          })
        );
        window.dispatchEvent(
          new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: 7, y: 0, z: 0 },
          })
        );
      });

      expect(result.current.shakeDetected).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle rapid shakes (5 in 2 seconds) with cooldown', () => {
      const { result } = renderHook(() => useShakeDetection());
      let detectedCount = 0;

      for (let i = 0; i < 5; i++) {
        act(() => {
          const event = new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
          });
          window.dispatchEvent(event);

          if (result.current.shakeDetected) {
            detectedCount++;
          }

          // Reset and advance time by 400ms
          jest.advanceTimersByTime(400);

          const resetEvent = new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
          });
          window.dispatchEvent(resetEvent);
        });
      }

      // Should detect only 2-3 shakes due to 800ms cooldown
      // (First shake + shakes after 800ms+ intervals)
      expect(detectedCount).toBeLessThanOrEqual(3);
    });

    it('should handle extreme acceleration values', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 100, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);
      expect(result.current.shakeDirection).toBe('right');
    });

    it('should reset shakeDetected flag when acceleration drops below threshold', () => {
      const { result } = renderHook(() => useShakeDetection());

      // Trigger shake
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 20, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(true);

      // Acceleration drops
      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 5, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
      expect(result.current.shakeDirection).toBe('none');
    });

    it('should handle device stationary (zero acceleration)', () => {
      const { result } = renderHook(() => useShakeDetection());

      act(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      expect(result.current.shakeDetected).toBe(false);
      expect(result.current.shakeDirection).toBe('none');
    });
  });
});
