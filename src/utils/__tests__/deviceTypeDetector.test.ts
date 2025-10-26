/**
 * Unit Tests for Device Type Detector
 *
 * TDD Workflow: RED-GREEN-REFACTOR
 * These tests MUST fail initially (RED), then implementation makes them pass (GREEN)
 *
 * Coverage:
 * - Smartphone detection (portrait, narrow screen)
 * - Tablet detection (portrait/landscape, medium screen)
 * - Desktop detection (large screen, no touch)
 * - NFC sensor location mapping per device type
 */

import {
  detectDeviceType,
  getNFCSensorLocation,
  isTouchDevice,
  getScreenSize,
  DeviceType,
  NFCSensorLocation,
} from '../deviceTypeDetector';

describe('deviceTypeDetector', () => {
  // Helper to mock window properties
  const mockWindow = (width: number, height: number, hasTouchSupport: boolean) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Mock touch support
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: hasTouchSupport ? 5 : 0,
    });
  };

  afterEach(() => {
    // Restore original values
    jest.restoreAllMocks();
  });

  describe('isTouchDevice', () => {
    it('should return true when maxTouchPoints > 0', () => {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
      expect(isTouchDevice()).toBe(true);
    });

    it('should return false when maxTouchPoints is 0', () => {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 0,
      });
      expect(isTouchDevice()).toBe(false);
    });

    it('should fallback to ontouchstart check if maxTouchPoints unavailable', () => {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      // Mock ontouchstart
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: () => {}, // Exists
      });

      expect(isTouchDevice()).toBe(true);
    });
  });

  describe('getScreenSize', () => {
    it('should return window inner dimensions', () => {
      mockWindow(375, 667, true); // iPhone SE dimensions
      const result = getScreenSize();
      expect(result.width).toBe(375);
      expect(result.height).toBe(667);
    });

    it('should handle landscape orientation', () => {
      mockWindow(667, 375, true); // iPhone SE landscape
      const result = getScreenSize();
      expect(result.width).toBe(667);
      expect(result.height).toBe(375);
    });
  });

  describe('detectDeviceType', () => {
    it('should detect smartphone (portrait, < 768px width, touch)', () => {
      mockWindow(375, 667, true); // iPhone SE
      expect(detectDeviceType()).toBe('smartphone');
    });

    it('should detect smartphone (any width < 768px with touch)', () => {
      mockWindow(414, 896, true); // iPhone 11 Pro Max
      expect(detectDeviceType()).toBe('smartphone');
    });

    it('should detect tablet (768-1024px width, touch)', () => {
      mockWindow(768, 1024, true); // iPad portrait
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should detect tablet (landscape)', () => {
      mockWindow(1024, 768, true); // iPad landscape
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should detect desktop (width > 1024px)', () => {
      mockWindow(1920, 1080, false); // Desktop monitor
      expect(detectDeviceType()).toBe('desktop');
    });

    it('should detect desktop (large screen, no touch)', () => {
      mockWindow(1440, 900, false); // MacBook Pro
      expect(detectDeviceType()).toBe('desktop');
    });

    it('should prioritize screen size over touch (large touchscreen = desktop)', () => {
      mockWindow(2560, 1440, true); // Large touch monitor
      expect(detectDeviceType()).toBe('desktop');
    });

    it('should handle edge case: exactly 768px width (tablet)', () => {
      mockWindow(768, 1024, true);
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should handle edge case: exactly 1024px width (still tablet)', () => {
      mockWindow(1024, 768, true);
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should handle edge case: 1025px width (desktop)', () => {
      mockWindow(1025, 800, false);
      expect(detectDeviceType()).toBe('desktop');
    });
  });

  describe('getNFCSensorLocation', () => {
    it('should return top-center for smartphone', () => {
      const result = getNFCSensorLocation('smartphone');
      expect(result).toEqual({
        position: 'top-center',
        description: 'Place NFC chip at the top center of your phone',
        coordinates: { x: 50, y: 10 }, // percentage
      });
    });

    it('should return edge-center for tablet (portrait)', () => {
      const result = getNFCSensorLocation('tablet');
      expect(result).toEqual({
        position: 'edge-center',
        description: 'Place NFC chip at the right or left edge center of your tablet',
        coordinates: { x: 95, y: 50 }, // percentage (right edge)
      });
    });

    it('should return manual-entry for desktop (no NFC)', () => {
      const result = getNFCSensorLocation('desktop');
      expect(result).toEqual({
        position: 'manual-entry',
        description: 'Your device does not support NFC. Please enter chip ID manually.',
        coordinates: { x: 50, y: 50 }, // center
      });
    });

    it('should return coordinates as percentages (0-100)', () => {
      const smartphone = getNFCSensorLocation('smartphone');
      expect(smartphone.coordinates.x).toBeGreaterThanOrEqual(0);
      expect(smartphone.coordinates.x).toBeLessThanOrEqual(100);
      expect(smartphone.coordinates.y).toBeGreaterThanOrEqual(0);
      expect(smartphone.coordinates.y).toBeLessThanOrEqual(100);
    });
  });

  describe('Type Definitions', () => {
    it('should define DeviceType as union type', () => {
      const smartphone: DeviceType = 'smartphone';
      const tablet: DeviceType = 'tablet';
      const desktop: DeviceType = 'desktop';

      expect(smartphone).toBe('smartphone');
      expect(tablet).toBe('tablet');
      expect(desktop).toBe('desktop');
    });

    it('should define NFCSensorLocation interface', () => {
      const location: NFCSensorLocation = {
        position: 'top-center',
        description: 'Test',
        coordinates: { x: 50, y: 10 },
      };

      expect(location.position).toBe('top-center');
      expect(location.coordinates.x).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small screens (< 320px) as smartphone', () => {
      mockWindow(240, 320, true); // Very old phone
      expect(detectDeviceType()).toBe('smartphone');
    });

    it('should handle very large screens (> 3000px) as desktop', () => {
      mockWindow(3840, 2160, false); // 4K monitor
      expect(detectDeviceType()).toBe('desktop');
    });

    it('should handle square aspect ratio', () => {
      mockWindow(800, 800, true); // Square tablet
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should handle portrait orientation on desktop (narrow window)', () => {
      mockWindow(600, 1200, false); // Narrow desktop window
      expect(detectDeviceType()).toBe('smartphone'); // Based on width < 768
    });
  });
});
