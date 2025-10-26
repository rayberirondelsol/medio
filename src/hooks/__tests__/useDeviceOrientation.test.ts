/**
 * Unit Tests for useDeviceOrientation Hook
 *
 * Tests tilt-to-scrub gesture detection functionality:
 * - DeviceOrientationEvent listener setup/cleanup
 * - Beta angle tracking (forward/backward tilt)
 * - 15° dead zone (no scrubbing within ±15°)
 * - 45° max tilt clamping
 * - Throttling to 16ms (60fps)
 * - iOS permission request handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceOrientation } from '../useDeviceOrientation';

// Mock DeviceOrientationEvent
class MockDeviceOrientationEvent extends Event {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;

  constructor(type: string, eventInitDict?: any) {
    super(type);
    this.alpha = eventInitDict?.alpha !== undefined ? eventInitDict.alpha : null;
    this.beta = eventInitDict?.beta !== undefined ? eventInitDict.beta : null;
    this.gamma = eventInitDict?.gamma !== undefined ? eventInitDict.gamma : null;
    this.absolute = eventInitDict?.absolute || false;
  }
}

(global as any).DeviceOrientationEvent = MockDeviceOrientationEvent;

describe('useDeviceOrientation', () => {
  let mockRequestAnimationFrame: jest.SpyInstance;
  let mockCancelAnimationFrame: jest.SpyInstance;
  let rafCallback: FrameRequestCallback | null = null;
  let rafId = 0;

  beforeEach(() => {
    // Mock requestAnimationFrame
    mockRequestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return ++rafId;
    });
    mockCancelAnimationFrame = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    mockRequestAnimationFrame.mockRestore();
    mockCancelAnimationFrame.mockRestore();
    rafCallback = null;
    rafId = 0;
  });

  describe('Event Listener Setup/Cleanup', () => {
    it('should add deviceorientation event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useDeviceOrientation());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'deviceorientation',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove deviceorientation event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useDeviceOrientation());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'deviceorientation',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should cancel pending animation frame on unmount', () => {
      const { unmount } = renderHook(() => useDeviceOrientation());

      // Trigger orientation event to queue animation frame
      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 30 });
        window.dispatchEvent(event);
      });

      unmount();

      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Beta Angle Tracking', () => {
    it('should initialize with neutral state', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      expect(result.current.tiltIntensity).toBe(0);
      expect(result.current.tiltDirection).toBe('neutral');
    });

    it('should track forward tilt (positive beta)', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 30 });
        window.dispatchEvent(event);
      });

      // Trigger RAF callback
      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBeGreaterThan(0);
    });

    it('should track backward tilt (negative beta)', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: -30 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('backward');
      expect(result.current.tiltIntensity).toBeGreaterThan(0);
    });

    it('should handle null beta gracefully', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: null });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });
  });

  describe('Dead Zone (±15°)', () => {
    it('should return neutral state for beta within ±15°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      // Test positive edge of dead zone
      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 14 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });

    it('should return neutral state for beta = 0°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 0 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });

    it('should return neutral state for beta = -10°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: -10 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });

    it('should detect tilt just outside dead zone (16°)', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 16 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBeGreaterThan(0);
    });
  });

  describe('Max Tilt Clamping (45°)', () => {
    it('should return intensity = 1.0 at 45° tilt', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 45 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBeCloseTo(1.0, 2);
    });

    it('should clamp intensity to 1.0 for beta > 45°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 90 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBe(1.0);
    });

    it('should return intensity = 1.0 at -45° tilt', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: -45 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('backward');
      expect(result.current.tiltIntensity).toBeCloseTo(1.0, 2);
    });

    it('should calculate proportional intensity between 15° and 45°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      // 30° tilt = halfway between 15° (dead zone) and 45° (max)
      // Intensity should be ~0.5
      act(() => {
        const event = new DeviceOrientationEvent('deviceorientation', { beta: 30 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBeCloseTo(0.5, 1);
    });
  });

  describe('Throttling (16ms / 60fps)', () => {
    it('should throttle updates using requestAnimationFrame', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      // Dispatch multiple events rapidly
      act(() => {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 20 }));
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 25 }));
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 30 }));
      });

      // RAF should be called only once
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);

      // Process RAF callback
      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      // State should reflect last beta value (30°)
      expect(result.current.tiltDirection).toBe('forward');
    });

    it('should not schedule multiple animation frames', () => {
      renderHook(() => useDeviceOrientation());

      act(() => {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 20 }));
      });

      const firstCallCount = mockRequestAnimationFrame.mock.calls.length;

      // Dispatch another event before RAF callback
      act(() => {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 25 }));
      });

      // Should not schedule another RAF
      expect(mockRequestAnimationFrame.mock.calls.length).toBe(firstCallCount);
    });

    it('should allow new RAF after previous one completes', () => {
      renderHook(() => useDeviceOrientation());

      act(() => {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 20 }));
      });

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);

      // Complete RAF
      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      // Dispatch new event
      act(() => {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 30 }));
      });

      // Should schedule new RAF
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });
  });

  describe('iOS Permission Handling', () => {
    const originalDeviceOrientationEvent = (global as any).DeviceOrientationEvent;

    beforeEach(() => {
      // Reset DeviceOrientationEvent mock
      (global as any).DeviceOrientationEvent = undefined;
    });

    afterEach(() => {
      // Restore DeviceOrientationEvent
      (global as any).DeviceOrientationEvent = originalDeviceOrientationEvent;
    });

    it('should initialize permissionGranted as true if no iOS permission required', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      // In test environment, no permission required
      expect(result.current.permissionGranted).toBe(true);
    });

    it('should request iOS permission if requestPermission exists', async () => {
      // Mock iOS 13+ environment
      const mockRequestPermission = jest.fn().mockResolvedValue('granted');
      (global as any).DeviceOrientationEvent = {
        requestPermission: mockRequestPermission,
      };

      const { result } = renderHook(() => useDeviceOrientation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result.current.permissionGranted).toBe(true);
    });

    it('should handle iOS permission denial', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('denied');
      (global as any).DeviceOrientationEvent = {
        requestPermission: mockRequestPermission,
      };

      const { result } = renderHook(() => useDeviceOrientation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.permissionGranted).toBe(false);
    });

    it('should handle iOS permission error gracefully', async () => {
      const mockRequestPermission = jest.fn().mockRejectedValue(new Error('Permission error'));
      (global as any).DeviceOrientationEvent = {
        requestPermission: mockRequestPermission,
      };

      const { result } = renderHook(() => useDeviceOrientation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.permissionGranted).toBe(false);
    });

    it('should not track orientation if permission denied', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('denied');
      (global as any).DeviceOrientationEvent = {
        requestPermission: mockRequestPermission,
      };

      const { result } = renderHook(() => useDeviceOrientation());

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        const event = new MockDeviceOrientationEvent('deviceorientation', { beta: 30 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      // Should remain neutral
      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid orientation changes', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        window.dispatchEvent(new MockDeviceOrientationEvent('deviceorientation', { beta: 30 }));
        window.dispatchEvent(new MockDeviceOrientationEvent('deviceorientation', { beta: -30 }));
        window.dispatchEvent(new MockDeviceOrientationEvent('deviceorientation', { beta: 0 }));
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      // Should reflect final state (beta = 0, within dead zone)
      expect(result.current.tiltDirection).toBe('neutral');
      expect(result.current.tiltIntensity).toBe(0);
    });

    it('should handle beta = 180° (device upside down)', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new MockDeviceOrientationEvent('deviceorientation', { beta: 180 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('forward');
      expect(result.current.tiltIntensity).toBe(1.0); // Clamped to max
    });

    it('should handle beta = -180°', () => {
      const { result } = renderHook(() => useDeviceOrientation());

      act(() => {
        const event = new MockDeviceOrientationEvent('deviceorientation', { beta: -180 });
        window.dispatchEvent(event);
      });

      act(() => {
        if (rafCallback) rafCallback(performance.now());
      });

      expect(result.current.tiltDirection).toBe('backward');
      expect(result.current.tiltIntensity).toBe(1.0);
    });
  });
});
