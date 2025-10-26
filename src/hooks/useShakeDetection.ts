/**
 * useShakeDetection Hook
 *
 * Detects shake gestures for video skip functionality.
 *
 * Features:
 * - DeviceMotionEvent listener with cleanup
 * - 18 m/s² acceleration threshold (child-optimized)
 * - 800ms cooldown period (prevents spam)
 * - Left/right direction detection
 * - False-positive prevention (x-axis only)
 *
 * Returns:
 * - shakeDetected: boolean (true when shake occurs)
 * - shakeDirection: 'left' | 'right' | 'none'
 * - lastShakeTime: number | null (timestamp for cooldown tracking)
 */

import { useState, useEffect } from 'react';
import { detectShake } from '../utils/gestureDetection';

export interface UseShakeDetectionReturn {
  /** Whether a shake was detected */
  shakeDetected: boolean;

  /** Shake direction */
  shakeDirection: 'left' | 'right' | 'none';

  /** Timestamp of last detected shake (for cooldown tracking) */
  lastShakeTime: number | null;
}

/**
 * Hook to detect shake gestures for video skip functionality
 */
export function useShakeDetection(): UseShakeDetectionReturn {
  const [shakeDetected, setShakeDetected] = useState(false);
  const [shakeDirection, setShakeDirection] = useState<'left' | 'right' | 'none'>('none');
  const [lastShakeTime, setLastShakeTime] = useState<number | null>(null);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;

      if (!acceleration) {
        // Reset shake state if no acceleration data
        setShakeDetected(false);
        setShakeDirection('none');
        return;
      }

      // Detect shake gesture
      const shakeGesture = detectShake(
        {
          x: acceleration.x,
          y: acceleration.y,
          z: acceleration.z,
        },
        lastShakeTime
      );

      if (shakeGesture && shakeGesture.isValid) {
        // Shake detected!
        setShakeDetected(true);
        setShakeDirection(shakeGesture.direction);
        setLastShakeTime(shakeGesture.timestamp);
      } else {
        // No shake detected (or within cooldown)
        setShakeDetected(false);
        setShakeDirection('none');
      }
    };

    // Add event listener
    window.addEventListener('devicemotion', handleMotion);

    // Cleanup
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [lastShakeTime]);

  return {
    shakeDetected,
    shakeDirection,
    lastShakeTime,
  };
}
