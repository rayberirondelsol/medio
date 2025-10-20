/**
 * NFC Scanner Utility
 * Handles NFC chip scanning using Web NFC API with timeout and error handling
 */

import { isNFCSupported } from './nfcCapability';

/**
 * Custom error types for NFC operations
 */
export class NFCError extends Error {
  constructor(
    message: string,
    public readonly name: string,
    public readonly code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, NFCError.prototype);
  }
}

/**
 * Scan timeout in milliseconds (30 seconds)
 */
const SCAN_TIMEOUT_MS = 30000;

/**
 * Type definitions for Web NFC API
 */
interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  data?: ArrayBuffer;
  [key: string]: any;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFReader {
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
}

declare global {
  interface Window {
    NDEFReader?: {
      new (): NDEFReader;
    };
  }
}

/**
 * Converts error to user-friendly German message
 * @param error - The error object
 * @returns NFCError with German message
 */
function convertToNFCError(error: any): NFCError {
  const errorName = error.name || 'UnknownError';
  let message: string;

  switch (errorName) {
    case 'NotAllowedError':
      message = 'NFC Berechtigung verweigert. Bitte erlauben Sie den Zugriff auf NFC.';
      break;

    case 'InvalidStateError':
      message = 'NFC ist deaktiviert. Bitte aktivieren Sie NFC in den Einstellungen Ihres Geräts.';
      break;

    case 'AbortError':
      message = 'Scan wurde abgebrochen oder Zeitüberschreitung beim Scannen (30 Sekunden).';
      break;

    case 'NotSupportedError':
      message = 'NFC wird von diesem Gerät nicht unterstützt.';
      break;

    case 'NetworkError':
      message = 'Netzwerkfehler beim Scannen. Bitte versuchen Sie es erneut.';
      break;

    case 'NotReadableError':
      message = 'NFC-Chip konnte nicht gelesen werden. Bitte versuchen Sie es erneut.';
      break;

    default:
      message = error.message || 'Unbekannter Fehler beim Scannen.';
  }

  return new NFCError(message, errorName, error.code);
}

/**
 * Validates the serial number from NFC reading
 * @param serialNumber - The serial number from the chip
 * @returns The validated serial number
 * @throws NFCError if invalid
 */
function validateSerialNumber(serialNumber: any): string {
  if (!serialNumber || typeof serialNumber !== 'string') {
    throw new NFCError(
      'Ungültiges NFC-Tag Format. Chip-ID konnte nicht gelesen werden.',
      'InvalidTagError'
    );
  }

  return serialNumber;
}

/**
 * Scans an NFC chip and returns its UID
 * @returns Promise that resolves to the chip UID string
 * @throws NFCError on failure or timeout
 */
export async function scanNFCChip(): Promise<string> {
  // Check if NFC is supported
  if (!isNFCSupported()) {
    throw new NFCError(
      'NFC wird von diesem Gerät nicht unterstützt.',
      'NotSupportedError'
    );
  }

  // Create AbortController for timeout
  const abortController = new AbortController();
  const { signal } = abortController;

  // Set up timeout
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, SCAN_TIMEOUT_MS);

  try {
    // Create NDEFReader instance
    const NDEFReaderClass = window.NDEFReader;
    if (!NDEFReaderClass) {
      throw new NFCError(
        'NDEFReader nicht verfügbar.',
        'NotSupportedError'
      );
    }

    const reader = new NDEFReaderClass();

    // Create promise that resolves when chip is scanned
    const scanPromise = new Promise<string>((resolve, reject) => {
      // Set up reading event handler
      reader.onreading = (event: NDEFReadingEvent) => {
        try {
          const serialNumber = validateSerialNumber(event.serialNumber);
          clearTimeout(timeoutId);
          resolve(serialNumber);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      };

      // Set up error event handler
      reader.onreadingerror = (event: Event) => {
        clearTimeout(timeoutId);
        reject(
          new NFCError(
            'Fehler beim Lesen des NFC-Chips.',
            'NotReadableError'
          )
        );
      };

      // Handle abort
      signal.addEventListener('abort', () => {
        reject(
          new NFCError(
            'Scan wurde abgebrochen oder Zeitüberschreitung beim Scannen (30 Sekunden).',
            'AbortError'
          )
        );
      });
    });

    // Start scanning with abort signal
    await reader.scan({ signal });

    // Wait for scan result
    return await scanPromise;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Convert to NFCError if not already
    if (error instanceof NFCError) {
      throw error;
    }

    throw convertToNFCError(error);
  }
}

/**
 * Gets a user-friendly error message for display
 * @param error - The error object
 * @returns German error message
 */
export function getNFCErrorMessage(error: any): string {
  if (error instanceof NFCError) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return 'Unbekannter Fehler beim Scannen.';
}
