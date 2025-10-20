/**
 * Unit tests for NFC scanner utility
 * Tests scan timeout, AbortController integration, and error handling
 */

// Mock NDEFReader
class MockNDEFReader {
  onreading: ((event: any) => void) | null = null;
  onreadingerror: ((event: any) => void) | null = null;

  async scan(options?: { signal?: AbortSignal }): Promise<void> {
    // Store signal for testing
    if (options?.signal) {
      (this as any)._signal = options.signal;
    }
    return Promise.resolve();
  }
}

describe('nfcScanner', () => {
  let originalNDEFReader: any;

  beforeEach(() => {
    // Mock NDEFReader in window
    originalNDEFReader = (window as any).NDEFReader;
    (window as any).NDEFReader = MockNDEFReader;

    // Clear all timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original
    if (originalNDEFReader) {
      (window as any).NDEFReader = originalNDEFReader;
    } else {
      delete (window as any).NDEFReader;
    }

    jest.useRealTimers();
  });

  describe('T038: Scan timeout (30 seconds)', () => {
    it('should abort scan after 30 seconds', async () => {
      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      const scanPromise = scanNFCChip();

      // Fast-forward time by 30 seconds
      jest.advanceTimersByTime(30000);

      await expect(scanPromise).rejects.toThrow();
      await expect(scanPromise).rejects.toMatchObject({
        name: 'AbortError',
      });
    });

    it('should use AbortController for timeout', async () => {
      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      const scanPromise = scanNFCChip();

      // Fast-forward to trigger timeout
      jest.advanceTimersByTime(30000);

      await expect(scanPromise).rejects.toThrow();
      expect(abortSpy).toHaveBeenCalled();

      abortSpy.mockRestore();
    });

    it('should include timeout error message in German', async () => {
      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      const scanPromise = scanNFCChip();

      jest.advanceTimersByTime(30000);

      await expect(scanPromise).rejects.toMatchObject({
        message: expect.stringContaining('Zeitüberschreitung'),
      });
    });

    it('should clear timeout on successful scan', async () => {
      // Use real timers for this test
      jest.useRealTimers();

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      // Mock successful scan
      MockNDEFReader.prototype.scan = jest.fn().mockImplementation(async function (this: any, options?: { signal?: AbortSignal }) {
        // Simulate successful read immediately
        setTimeout(() => {
          if (this.onreading) {
            this.onreading({
              serialNumber: '04:5A:B2:C3:D4:E5:F6',
              message: { records: [] },
            });
          }
        }, 100);
        return Promise.resolve();
      });

      const result = await scanNFCChip();
      expect(result).toBe('04:5A:B2:C3:D4:E5:F6');

      // Restore fake timers
      jest.useFakeTimers();
    });

    it('should not trigger timeout if scan completes early', async () => {
      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      const scanPromise = scanNFCChip();

      // Fast-forward only 5 seconds (less than 30)
      jest.advanceTimersByTime(5000);

      // Scan should still be pending, not rejected
      const isPending = await Promise.race([
        scanPromise.then(() => 'resolved'),
        scanPromise.catch(() => 'rejected'),
        Promise.resolve('pending'),
      ]);

      expect(isPending).toBe('pending');
    });
  });

  describe('T039: Error handling', () => {
    it('should handle NotAllowedError (permission denied)', async () => {
      // Mock scan to throw NotAllowedError
      MockNDEFReader.prototype.scan = jest.fn().mockRejectedValue(
        Object.assign(new Error('User denied NFC permission'), {
          name: 'NotAllowedError',
        })
      );

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      await expect(scanNFCChip()).rejects.toMatchObject({
        name: 'NotAllowedError',
        message: expect.stringContaining('Berechtigung'),
      });
    });

    it('should handle InvalidStateError (NFC disabled)', async () => {
      MockNDEFReader.prototype.scan = jest.fn().mockRejectedValue(
        Object.assign(new Error('NFC is disabled'), {
          name: 'InvalidStateError',
        })
      );

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      await expect(scanNFCChip()).rejects.toMatchObject({
        name: 'InvalidStateError',
        message: expect.stringContaining('NFC'),
      });
    });

    it('should handle AbortError (scan cancelled)', async () => {
      MockNDEFReader.prototype.scan = jest.fn().mockRejectedValue(
        Object.assign(new Error('Scan aborted'), {
          name: 'AbortError',
        })
      );

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      await expect(scanNFCChip()).rejects.toMatchObject({
        name: 'AbortError',
        message: expect.stringContaining('abgebrochen'),
      });
    });

    it('should handle invalid tag format error', async () => {
      jest.useRealTimers();

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      // Mock scan that triggers onreading with invalid data
      MockNDEFReader.prototype.scan = jest.fn().mockImplementation(async function (this: any) {
        setTimeout(() => {
          if (this.onreading) {
            this.onreading({
              serialNumber: null, // Invalid
              message: null,
            });
          }
        }, 10);
        return Promise.resolve();
      });

      await expect(scanNFCChip()).rejects.toMatchObject({
        message: expect.stringContaining('Ungültig'),
      });

      jest.useFakeTimers();
    });

    it('should handle missing serialNumber', async () => {
      jest.useRealTimers();

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      // Mock scan that triggers onreading without serialNumber
      MockNDEFReader.prototype.scan = jest.fn().mockImplementation(async function (this: any) {
        setTimeout(() => {
          if (this.onreading) {
            this.onreading({
              message: {
                records: [],
              },
            });
          }
        }, 10);
        return Promise.resolve();
      });

      await expect(scanNFCChip()).rejects.toMatchObject({
        message: expect.stringContaining('Chip-ID'),
      });

      jest.useFakeTimers();
    });

    it('should handle NDEFReader not supported', async () => {
      delete (window as any).NDEFReader;

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      await expect(scanNFCChip()).rejects.toMatchObject({
        name: 'NotSupportedError',
        message: expect.stringContaining('nicht unterstützt'),
      });
    });

    it('should handle network errors gracefully', async () => {
      MockNDEFReader.prototype.scan = jest.fn().mockRejectedValue(
        Object.assign(new Error('Network error'), {
          name: 'NetworkError',
        })
      );

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      await expect(scanNFCChip()).rejects.toMatchObject({
        name: 'NetworkError',
      });
    });

    it('should provide user-friendly error messages in German', async () => {
      const errorTypes = [
        { name: 'NotAllowedError', expectedText: 'Berechtigung' },
        { name: 'InvalidStateError', expectedText: 'NFC' },
        { name: 'AbortError', expectedText: 'abgebrochen' },
        { name: 'NotSupportedError', expectedText: 'unterstützt' },
      ];

      for (const { name, expectedText } of errorTypes) {
        MockNDEFReader.prototype.scan = jest.fn().mockRejectedValue(
          Object.assign(new Error('Error'), { name })
        );

        jest.resetModules();
        const { scanNFCChip } = require('../nfcScanner');

        try {
          await scanNFCChip();
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain(expectedText);
        }
      }
    });
  });

  describe('AbortController integration', () => {
    it('should pass AbortSignal to NDEFReader.scan()', async () => {
      jest.useRealTimers();

      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      let capturedOptions: any = null;
      MockNDEFReader.prototype.scan = jest.fn().mockImplementation(async function (options?: { signal?: AbortSignal }) {
        capturedOptions = options;
        return new Promise(() => {}); // Never resolve
      });

      const scanPromise = scanNFCChip();

      // Wait a bit for scan to be called
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(capturedOptions).toMatchObject({
        signal: expect.any(AbortSignal),
      });

      jest.useFakeTimers();
    });

    it('should abort scan when AbortController.abort() is called', async () => {
      jest.resetModules();
      const { scanNFCChip } = require('../nfcScanner');

      const scanPromise = scanNFCChip();

      // Trigger abort via timeout
      jest.advanceTimersByTime(30000);

      await expect(scanPromise).rejects.toMatchObject({
        name: 'AbortError',
      });
    });
  });
});
