/**
 * NFC Capability Detection Utility
 * Detects Web NFC API (NDEFReader) support in the browser
 * Supported: Chrome/Edge Android 89+
 */

/**
 * Type guard for NDEFReader availability
 */
export function hasNDEFReader(window: Window): window is Window & { NDEFReader: typeof NDEFReader } {
  return 'NDEFReader' in window;
}

/**
 * Checks if the current browser supports Web NFC API
 * @returns true if NDEFReader is available, false otherwise
 */
export function isNFCSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return hasNDEFReader(window);
}

/**
 * Gets a user-friendly message about NFC support status
 * @returns German message indicating support status
 */
export function getNFCCapabilityMessage(): string {
  if (isNFCSupported()) {
    return 'NFC wird von diesem Gerät unterstützt';
  }

  return 'NFC wird von diesem Gerät nicht unterstützt. Bitte verwenden Sie Chrome oder Edge auf einem Android-Gerät (Version 89 oder höher).';
}

/**
 * Gets the browser and platform information for debugging
 * @returns Object with browser, platform, and support status
 */
export function getNFCDebugInfo(): {
  supported: boolean;
  userAgent: string;
  platform: string;
  hasNDEFReader: boolean;
} {
  const supported = isNFCSupported();

  return {
    supported,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    hasNDEFReader: typeof window !== 'undefined' && 'NDEFReader' in window,
  };
}
