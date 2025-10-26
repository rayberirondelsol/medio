/**
 * useDeviceOrientation Hook
 *
 * Tracks device tilt (beta angle) for video scrubbing gestures.
 *
 * Features:
 * - DeviceOrientationEvent listener with cleanup
 * - 15° dead zone (prevents unintended scrubbing)
 * - 45° max tilt clamping
 * - Throttled updates (16ms = 60fps) via requestAnimationFrame
 * - iOS 13+ permission handling
 *
 * Returns:
 * - tiltIntensity: 0-1 (proportional scrubbing speed)
 * - tiltDirection: 'forward' | 'backward' | 'none'
 * - permissionGranted: boolean
 * - requestPermission: () => Promise<void>
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateTiltState } from '../utils/gestureDetection';

export interface UseDeviceOrientationReturn {
  /** Tilt intensity (0 to 1, where 1 is max tilt angle) */
  tiltIntensity: number;

  /** Tilt direction */
  tiltDirection: 'forward' | 'backward' | 'none' | 'neutral';

  /** Whether device orientation permission is granted (iOS) */
  permissionGranted: boolean;

  /** Request iOS permission for device orientation */
  requestPermission: () => Promise<void>;
}

/**
 * Check if iOS 13+ permission is required
 */
function isIOSPermissionRequired(): boolean {
  if (typeof DeviceOrientationEvent === 'undefined') {
    return false;
  }

  // iOS 13+ requires permission
  return typeof (DeviceOrientationEvent as any).requestPermission === 'function';
}

/**
 * Hook to track device orientation (tilt) for video scrubbing
 */
export function useDeviceOrientation(): UseDeviceOrientationReturn {
  const [tiltIntensity, setTiltIntensity] = useState(0);
  const [tiltDirection, setTiltDirection] = useState<'forward' | 'backward' | 'none' | 'neutral'>('neutral');
  const [permissionGranted, setPermissionGranted] = useState(!isIOSPermissionRequired());

  const rafIdRef = useRef<number | null>(null);
  const latestBetaRef = useRef<number | null>(null);
  const isUpdatingRef = useRef(false);

  /**
   * Request iOS permission for device orientation
   */
  const requestPermission = useCallback(async () => {
    if (!isIOSPermissionRequired()) {
      setPermissionGranted(true);
      return;
    }

    try {
      const response = await (DeviceOrientationEvent as any).requestPermission();
      const granted = response === 'granted';
      setPermissionGranted(granted);
    } catch (error) {
      console.error('Failed to request device orientation permission:', error);
      setPermissionGranted(false);
    }
  }, []);

  /**
   * Handle orientation change event
   */
  useEffect(() => {
    if (!permissionGranted) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Store latest beta value
      latestBetaRef.current = event.beta;

      // Request animation frame if not already scheduled
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;

        rafIdRef.current = requestAnimationFrame(() => {
          // Calculate tilt state from latest beta
          const tiltState = calculateTiltState(latestBetaRef.current);

          // Update state
          setTiltIntensity(tiltState.intensity);
          setTiltDirection(tiltState.direction);

          // Mark RAF complete
          isUpdatingRef.current = false;
        });
      }
    };

    // Add event listener
    window.addEventListener('deviceorientation', handleOrientation);

    // Cleanup
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);

      // Cancel pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      isUpdatingRef.current = false;
    };
  }, [permissionGranted]);

  return {
    tiltIntensity,
    tiltDirection,
    permissionGranted,
    requestPermission,
  };
}
