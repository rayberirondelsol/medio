/**
 * Unit tests for NFC capability detection
 * Tests Web NFC API (NDEFReader) feature detection
 */

describe('nfcCapability', () => {
  let originalNDEFReader: any;

  beforeEach(() => {
    // Store the original NDEFReader
    originalNDEFReader = (window as any).NDEFReader;
  });

  afterEach(() => {
    // Restore the original NDEFReader
    if (originalNDEFReader) {
      (window as any).NDEFReader = originalNDEFReader;
    } else {
      delete (window as any).NDEFReader;
    }
  });

  describe('isNFCSupported', () => {
    it('should return true when NDEFReader exists', () => {
      // Mock NDEFReader as a constructor function
      (window as any).NDEFReader = class MockNDEFReader {};

      const { isNFCSupported } = require('../nfcCapability');
      expect(isNFCSupported()).toBe(true);
    });

    it('should return false when NDEFReader is undefined', () => {
      // Ensure NDEFReader is not defined
      delete (window as any).NDEFReader;

      // Clear the module cache to get fresh import
      jest.resetModules();
      const { isNFCSupported } = require('../nfcCapability');

      expect(isNFCSupported()).toBe(false);
    });

    it('should return false when window is undefined (Node.js environment)', () => {
      // This test validates behavior in non-browser environments
      // We can't actually delete window, but we can test the logic
      const { isNFCSupported } = require('../nfcCapability');

      delete (window as any).NDEFReader;
      jest.resetModules();
      const { isNFCSupported: checkSupport } = require('../nfcCapability');

      expect(checkSupport()).toBe(false);
    });
  });

  describe('getNFCCapabilityMessage', () => {
    it('should return supported message when NDEFReader exists', () => {
      (window as any).NDEFReader = class MockNDEFReader {};

      jest.resetModules();
      const { getNFCCapabilityMessage } = require('../nfcCapability');

      const message = getNFCCapabilityMessage();
      expect(message).toContain('unterstützt');
      expect(message).not.toContain('nicht');
    });

    it('should return unsupported message when NDEFReader is undefined', () => {
      delete (window as any).NDEFReader;

      jest.resetModules();
      const { getNFCCapabilityMessage } = require('../nfcCapability');

      const message = getNFCCapabilityMessage();
      expect(message).toContain('nicht unterstützt');
    });
  });

  describe('Browser compatibility', () => {
    it('should work with Chrome Android user agent', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Mobile Safari/537.36',
        configurable: true,
      });

      (window as any).NDEFReader = class MockNDEFReader {};

      jest.resetModules();
      const { isNFCSupported } = require('../nfcCapability');
      expect(isNFCSupported()).toBe(true);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should work with Edge Android user agent', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Mobile Safari/537.36 EdgA/46.3.4.5155',
        configurable: true,
      });

      (window as any).NDEFReader = class MockNDEFReader {};

      jest.resetModules();
      const { isNFCSupported } = require('../nfcCapability');
      expect(isNFCSupported()).toBe(true);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should detect lack of support on desktop browsers', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });

      delete (window as any).NDEFReader;

      jest.resetModules();
      const { isNFCSupported } = require('../nfcCapability');
      expect(isNFCSupported()).toBe(false);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should detect lack of support on iOS Safari', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      delete (window as any).NDEFReader;

      jest.resetModules();
      const { isNFCSupported } = require('../nfcCapability');
      expect(isNFCSupported()).toBe(false);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });
});
