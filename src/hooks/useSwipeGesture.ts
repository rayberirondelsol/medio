/**
 * useSwipeGesture Hook
 *
 * Tracks touch swipe gestures for exiting fullscreen mode.
 *
 * Features:
 * - TouchEvent listeners (touchstart, touchmove, touchend)
 * - 100px minimum swipe distance threshold
 * - Vertical swipe detection (down/up)
 * - Horizontal swipe rejection
 * - Debounce mechanism (300ms between swipes)
 * - Cleanup on unmount
 *
 * Returns:
 * - swipeDetected: boolean (true when valid swipe detected)
 * - swipeDirection: 'down' | 'up' | 'none'
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSwipeGestureReturn {
  /** Whether a valid swipe was detected */
  swipeDetected: boolean;

  /** Direction of the swipe */
  swipeDirection: 'down' | 'up' | 'none';
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

const SWIPE_THRESHOLD = 100; // pixels
const DEBOUNCE_MS = 300; // milliseconds

/**
 * Hook to detect swipe gestures for exiting fullscreen
 */
export function useSwipeGesture(): UseSwipeGestureReturn {
  const [swipeDetected, setSwipeDetected] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'down' | 'up' | 'none'>('none');

  const touchStartRef = useRef<TouchPosition | null>(null);
  const lastSwipeTimeRef = useRef<number>(0);

  /**
   * Reset swipe state
   */
  const resetSwipe = useCallback(() => {
    setSwipeDetected(false);
    setSwipeDirection('none');
  }, []);

  /**
   * Handle touchstart event
   */
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length === 0) return;

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  /**
   * Handle touchmove event (optional tracking)
   */
  const handleTouchMove = useCallback((event: TouchEvent) => {
    // Prevent default scrolling during swipe
    if (touchStartRef.current) {
      event.preventDefault();
    }
  }, []);

  /**
   * Handle touchend event
   */
  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (event.changedTouches.length === 0) return;

      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const startX = touchStartRef.current.x;
      const startY = touchStartRef.current.y;

      // Calculate distances
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Check debounce
      const now = Date.now();
      if (now - lastSwipeTimeRef.current < DEBOUNCE_MS) {
        touchStartRef.current = null;
        return;
      }

      // Vertical swipe detection (vertical movement > horizontal movement)
      if (absY > absX && absY > SWIPE_THRESHOLD) {
        const direction = deltaY > 0 ? 'down' : 'up';

        setSwipeDetected(true);
        setSwipeDirection(direction);
        lastSwipeTimeRef.current = now;

        // Auto-reset after brief delay
        setTimeout(() => {
          resetSwipe();
        }, 100);
      }

      touchStartRef.current = null;
    },
    [resetSwipe]
  );

  /**
   * Setup event listeners
   */
  useEffect(() => {
    const options: AddEventListenerOptions = { passive: false };

    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, options);
      document.removeEventListener('touchmove', handleTouchMove, options);
      document.removeEventListener('touchend', handleTouchEnd, options);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    swipeDetected,
    swipeDirection,
  };
}
