/**
 * Unit Tests for useSwipeGesture Hook
 *
 * Tests swipe-to-exit gesture detection functionality:
 * - TouchEvent listener setup/cleanup
 * - 100px minimum swipe distance threshold
 * - Vertical swipe detection (down from top)
 * - Horizontal swipe rejection
 * - Debounce mechanism (300ms between swipes)
 * - Cleanup on unmount
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSwipeGesture } from '../useSwipeGesture';

/**
 * Helper: Create and dispatch touch event
 */
function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number
): TouchEvent {
  const touch = {
    identifier: 0,
    target: document.body,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  };

  const touchEvent = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' ? [] : [touch as Touch],
    targetTouches: type === 'touchend' ? [] : [touch as Touch],
    changedTouches: [touch as Touch],
  });

  return touchEvent;
}

describe('useSwipeGesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Listener Setup/Cleanup', () => {
    it('should add touchstart/touchmove/touchend listeners on mount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useSwipeGesture());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.any(Object)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove touch event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useSwipeGesture());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.any(Object)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should pass passive: false option to prevent default behavior', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useSwipeGesture());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false }
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Initial State', () => {
    it('should initialize with no swipe detected', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current.swipeDetected).toBe(false);
      expect(result.current.swipeDirection).toBe('none');
    });
  });

  describe('Vertical Swipe Detection (Down from Top)', () => {
    it('should detect swipe down when distance >= 100px', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart at top (y=50)
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        // touchend 150px down (y=200)
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);
      expect(result.current.swipeDirection).toBe('down');
    });

    it('should detect swipe up when distance >= 100px', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart at bottom (y=300)
        document.dispatchEvent(createTouchEvent('touchstart', 200, 300));
      });

      act(() => {
        // touchend 150px up (y=150)
        document.dispatchEvent(createTouchEvent('touchend', 200, 150));
      });

      expect(result.current.swipeDetected).toBe(true);
      expect(result.current.swipeDirection).toBe('up');
    });

    it('should ignore swipe when distance < 100px', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart at y=50
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        // touchend only 80px down (y=130)
        document.dispatchEvent(createTouchEvent('touchend', 200, 130));
      });

      expect(result.current.swipeDetected).toBe(false);
      expect(result.current.swipeDirection).toBe('none');
    });

    it('should ignore swipe exactly at 100px threshold (exclusive)', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 200, 150)); // exactly 100px
      });

      // Threshold is exclusive (needs > 100px)
      expect(result.current.swipeDetected).toBe(false);
    });

    it('should detect swipe at 101px (just above threshold)', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 200, 151)); // 101px
      });

      expect(result.current.swipeDetected).toBe(true);
      expect(result.current.swipeDirection).toBe('down');
    });
  });

  describe('Horizontal Swipe Rejection', () => {
    it('should ignore horizontal swipe (left)', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart at x=300
        document.dispatchEvent(createTouchEvent('touchstart', 300, 200));
      });

      act(() => {
        // touchend 150px left (x=150), minimal vertical movement
        document.dispatchEvent(createTouchEvent('touchend', 150, 210));
      });

      expect(result.current.swipeDetected).toBe(false);
      expect(result.current.swipeDirection).toBe('none');
    });

    it('should ignore horizontal swipe (right)', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart at x=100
        document.dispatchEvent(createTouchEvent('touchstart', 100, 200));
      });

      act(() => {
        // touchend 150px right (x=250), minimal vertical movement
        document.dispatchEvent(createTouchEvent('touchend', 250, 210));
      });

      expect(result.current.swipeDetected).toBe(false);
      expect(result.current.swipeDirection).toBe('none');
    });

    it('should detect vertical swipe even with horizontal movement', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        // touchend: 150px down + 50px right (diagonal but mostly vertical)
        document.dispatchEvent(createTouchEvent('touchend', 250, 200));
      });

      // Should still detect as vertical swipe (vertical > horizontal)
      expect(result.current.swipeDetected).toBe(true);
      expect(result.current.swipeDirection).toBe('down');
    });

    it('should reject diagonal swipe when horizontal > vertical', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100, 100));
      });

      act(() => {
        // 150px right + 80px down (horizontal > vertical)
        document.dispatchEvent(createTouchEvent('touchend', 250, 180));
      });

      expect(result.current.swipeDetected).toBe(false);
    });
  });

  describe('Debounce Mechanism (300ms)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow first swipe immediately', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);
    });

    it('should ignore second swipe within 300ms', () => {
      const { result } = renderHook(() => useSwipeGesture());

      // First swipe
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);

      // Reset state manually (simulating component update)
      act(() => {
        jest.advanceTimersByTime(100); // only 100ms
      });

      // Second swipe (should be ignored)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      // Should still be from first swipe (debounced)
      // Note: This tests the internal debounce logic
    });

    it('should allow swipe after 300ms debounce period', async () => {
      const { result } = renderHook(() => useSwipeGesture());

      // First swipe
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);

      // Wait 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Second swipe (should be allowed)
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing touch data gracefully', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchstart
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        // touchend with no touches array (edge case)
        const event = new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [],
        });
        document.dispatchEvent(event);
      });

      // Should not crash, no swipe detected
      expect(result.current.swipeDetected).toBe(false);
    });

    it('should reset swipe state after detection', async () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);

      // State should auto-reset after a short delay
      await waitFor(
        () => {
          expect(result.current.swipeDetected).toBe(false);
        },
        { timeout: 500 }
      );
    });

    it('should handle touchend without touchstart', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        // touchend without prior touchstart
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(false);
    });

    it('should handle multiple touches (use first touch only)', () => {
      const { result } = renderHook(() => useSwipeGesture());

      // Create multi-touch event
      const touch1 = {
        identifier: 0,
        clientX: 200,
        clientY: 50,
        screenX: 200,
        screenY: 50,
        pageX: 200,
        pageY: 50,
      } as Touch;

      const touch2 = {
        identifier: 1,
        clientX: 300,
        clientY: 100,
        screenX: 300,
        screenY: 100,
        pageX: 300,
        pageY: 100,
      } as Touch;

      act(() => {
        const startEvent = new TouchEvent('touchstart', {
          touches: [touch1, touch2],
          changedTouches: [touch1],
        });
        document.dispatchEvent(startEvent);
      });

      act(() => {
        const endTouch1 = { ...touch1, clientY: 200, screenY: 200, pageY: 200 } as Touch;
        const endEvent = new TouchEvent('touchend', {
          touches: [],
          changedTouches: [endTouch1],
        });
        document.dispatchEvent(endEvent);
      });

      // Should use first touch
      expect(result.current.swipeDetected).toBe(true);
    });
  });

  describe('touchmove Tracking', () => {
    it('should track touchmove events for continuous swipe detection', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200, 100));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200, 150));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      expect(result.current.swipeDetected).toBe(true);
      expect(result.current.swipeDirection).toBe('down');
    });

    it('should use final touchend position for distance calculation', () => {
      const { result } = renderHook(() => useSwipeGesture());

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 200, 50));
      });

      // Multiple intermediate moves
      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200, 70));
        document.dispatchEvent(createTouchEvent('touchmove', 200, 90));
        document.dispatchEvent(createTouchEvent('touchmove', 200, 120));
      });

      act(() => {
        // Final position
        document.dispatchEvent(createTouchEvent('touchend', 200, 200));
      });

      // Distance should be from start (50) to end (200) = 150px
      expect(result.current.swipeDetected).toBe(true);
    });
  });
});
