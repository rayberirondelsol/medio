/**
 * Device Type Detector for Kids Mode
 *
 * Detects device type (smartphone, tablet, desktop) and provides
 * NFC sensor location mapping for device-specific UI positioning.
 *
 * Detection criteria:
 * - Smartphone: width < 768px + touch support
 * - Tablet: 768px ≤ width ≤ 1024px + touch support
 * - Desktop: width > 1024px OR no touch support
 */

/**
 * Device type classification
 */
export type DeviceType = 'smartphone' | 'tablet' | 'desktop';

/**
 * NFC sensor location information
 */
export interface NFCSensorLocation {
  /** Sensor position identifier */
  position: 'top-center' | 'edge-center' | 'manual-entry';

  /** Human-readable description for UI */
  description: string;

  /** Coordinates as percentages (x: 0-100, y: 0-100) */
  coordinates: {
    x: number;
    y: number;
  };
}

/**
 * Screen size information
 */
export interface ScreenSize {
  width: number;
  height: number;
}

/**
 * Detect if device has touch support
 *
 * @returns True if device supports touch input
 *
 * @example
 * isTouchDevice() // true on smartphones/tablets, false on desktop
 */
export function isTouchDevice(): boolean {
  // Modern browsers: navigator.maxTouchPoints
  if (navigator.maxTouchPoints !== undefined) {
    return navigator.maxTouchPoints > 0;
  }

  // Fallback: check for ontouchstart
  if ('ontouchstart' in window) {
    return true;
  }

  return false;
}

/**
 * Get current screen size
 *
 * @returns Window inner width and height
 *
 * @example
 * getScreenSize() // { width: 375, height: 667 } on iPhone SE
 */
export function getScreenSize(): ScreenSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Detect device type based on screen size and touch support
 *
 * @returns Device type classification
 *
 * @example
 * // iPhone SE (375x667)
 * detectDeviceType() // 'smartphone'
 *
 * // iPad (768x1024)
 * detectDeviceType() // 'tablet'
 *
 * // MacBook Pro (1440x900)
 * detectDeviceType() // 'desktop'
 */
export function detectDeviceType(): DeviceType {
  const { width } = getScreenSize();
  const hasTouch = isTouchDevice();

  // Desktop: wide screen (>1024px) regardless of touch
  if (width > 1024) {
    return 'desktop';
  }

  // Tablet: medium screen (768-1024px) with touch
  if (width >= 768 && width <= 1024 && hasTouch) {
    return 'tablet';
  }

  // Smartphone: narrow screen (<768px) with touch
  if (width < 768 && hasTouch) {
    return 'smartphone';
  }

  // Fallback: narrow screen without touch = smartphone
  // (e.g., narrow desktop window)
  return 'smartphone';
}

/**
 * Get NFC sensor location mapping for device type
 *
 * Provides UI positioning guidance for NFC scan area based on
 * typical NFC sensor locations per device category.
 *
 * @param deviceType Device type classification
 * @returns NFC sensor location with coordinates
 *
 * @example
 * // Smartphone (NFC typically at top center)
 * getNFCSensorLocation('smartphone')
 * // { position: 'top-center', description: '...', coordinates: { x: 50, y: 10 } }
 *
 * // Tablet (NFC typically at edge center)
 * getNFCSensorLocation('tablet')
 * // { position: 'edge-center', description: '...', coordinates: { x: 95, y: 50 } }
 *
 * // Desktop (no NFC, manual entry)
 * getNFCSensorLocation('desktop')
 * // { position: 'manual-entry', description: '...', coordinates: { x: 50, y: 50 } }
 */
export function getNFCSensorLocation(deviceType: DeviceType): NFCSensorLocation {
  switch (deviceType) {
    case 'smartphone':
      return {
        position: 'top-center',
        description: 'Place NFC chip at the top center of your phone',
        coordinates: {
          x: 50, // Center horizontally
          y: 10, // Top of screen
        },
      };

    case 'tablet':
      return {
        position: 'edge-center',
        description: 'Place NFC chip at the right or left edge center of your tablet',
        coordinates: {
          x: 95, // Right edge (or 5 for left edge)
          y: 50, // Center vertically
        },
      };

    case 'desktop':
      return {
        position: 'manual-entry',
        description: 'Your device does not support NFC. Please enter chip ID manually.',
        coordinates: {
          x: 50, // Center horizontally
          y: 50, // Center vertically
        },
      };
  }
}
