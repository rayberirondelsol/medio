/**
 * KidsModeNFCScan Component
 *
 * Device-specific NFC scanning interface with pulsating indicator.
 * Displays scan area positioned based on device type (smartphone/tablet/desktop).
 *
 * Features:
 * - Pulsating animation at 60fps
 * - Device-specific positioning (top-center for phones/tablets)
 * - Real NFC scanning via Web NFC API (when supported)
 * - Simulation mode for devices without NFC
 * - Success/error state display
 * - Accessibility features (ARIA labels, screen reader announcements)
 *
 * @example
 * ```tsx
 * <KidsModeNFCScan onScan={(chipUid) => console.log('Scanned:', chipUid)} />
 * ```
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  detectDeviceType,
  getNFCSensorLocation,
  type NFCSensorLocation,
} from '../../utils/deviceTypeDetector';
import '../../styles/KidsMode.css';

interface KidsModeNFCScanProps {
  /**
   * Callback when NFC chip is successfully scanned
   * @param chipUid The NFC chip UID (serial number)
   */
  onScan: (chipUid: string) => void;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

const KidsModeNFCScan: React.FC<KidsModeNFCScanProps> = ({ onScan }) => {
  // Device detection
  const [sensorLocation, setSensorLocation] = useState<NFCSensorLocation | null>(null);
  const [hasNFCSupport, setHasNFCSupport] = useState(false);

  // Scan state
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Simulation mode (for devices without NFC)
  const [simulationChipId, setSimulationChipId] = useState('');

  // Easter egg: 10 taps on scan area triggers test chip scan
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const ndefReaderRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  /**
   * Detect device type and NFC support on mount
   */
  useEffect(() => {
    isMountedRef.current = true;

    const type = detectDeviceType();
    const location = getNFCSensorLocation(type);

    setSensorLocation(location);

    // Check for Web NFC API support
    const nfcSupported = 'NDEFReader' in window;
    setHasNFCSupport(nfcSupported);

    return () => {
      isMountedRef.current = false;
      // Cleanup tap timer
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Handle NFC chip reading event
   */
  const handleNFCReading = useCallback((event: any) => {
    if (!isMountedRef.current) return;

    const chipUid = event.serialNumber;

    setScanState('success');
    setStatusMessage('Chip scanned successfully!');

    // Call onScan callback
    onScan(chipUid);
  }, [onScan]);

  /**
   * Handle NFC error event
   */
  const handleNFCError = useCallback((event: any) => {
    if (!isMountedRef.current) return;

    console.error('NFC error:', event);
    setScanState('error');
    setErrorMessage('Unable to scan chip. Please try again.');
  }, []);

  /**
   * Initialize NFC scanning when supported
   */
  useEffect(() => {
    if (!hasNFCSupport || !isMountedRef.current) {
      return;
    }

    const initNFCScanning = async () => {
      try {
        // Create NDEF Reader instance
        const NDEFReader = (window as any).NDEFReader;
        const reader = new NDEFReader();
        ndefReaderRef.current = reader;

        // Start scanning
        await reader.scan();
        setScanState('scanning');
        setStatusMessage('Ready to scan your magic chip!');

        // Listen for NFC readings
        reader.addEventListener('reading', handleNFCReading);

        // Listen for errors
        reader.addEventListener('error', handleNFCError);
      } catch (error: any) {
        console.error('Failed to start NFC scanning:', error);
        setScanState('error');
        setErrorMessage('Unable to scan NFC chips. Please use simulation mode.');
      }
    };

    initNFCScanning();

    return () => {
      // Cleanup listeners
      if (ndefReaderRef.current) {
        ndefReaderRef.current.removeEventListener('reading', handleNFCReading);
        ndefReaderRef.current.removeEventListener('error', handleNFCError);
      }
    };
  }, [hasNFCSupport, handleNFCReading, handleNFCError]);

  /**
   * Handle simulation mode scan button click
   */
  const handleSimulationScan = () => {
    if (!simulationChipId.trim()) {
      return;
    }

    setScanState('success');
    setStatusMessage('Chip scanned successfully!');

    // Call onScan callback with simulated chip ID
    onScan(simulationChipId.trim());
  };

  /**
   * Easter egg: Handle tap on scan area
   * 10 taps within 5 seconds triggers test chip scan
   */
  const handleScanAreaTap = useCallback(() => {
    // Only enable in non-NFC mode (simulation mode)
    if (hasNFCSupport) {
      return;
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    // Reset tap count after 5 seconds of inactivity
    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 5000);

    // Trigger test scan on 10th tap
    if (newTapCount >= 10) {
      setTapCount(0);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }

      // Trigger scan with test chip ID
      setScanState('success');
      setStatusMessage('Test chip activated! 🎉');
      onScan('04:5A:B2:C3:D4:E5:F6');
    }
  }, [tapCount, hasNFCSupport, onScan]);

  /**
   * Render scan area with device-specific positioning
   */
  const renderScanArea = () => {
    if (!sensorLocation) return null;

    const positionStyle: React.CSSProperties = {
      top: `${sensorLocation.coordinates.y}%`,
      left: `${sensorLocation.coordinates.x}%`,
      transform:
        sensorLocation.coordinates.x === 50
          ? sensorLocation.coordinates.y === 50
            ? 'translate(-50%, -50%)'
            : 'translateX(-50%)'
          : undefined,
    };

    const scanAreaClasses = [
      'nfc-scan-area',
      scanState === 'idle' || scanState === 'scanning' ? 'nfc-scan-area--pulsating' : '',
      scanState === 'success' ? 'nfc-scan-area--success' : '',
      scanState === 'error' ? 'nfc-scan-area--error' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        data-testid="nfc-scan-area"
        className={scanAreaClasses}
        style={{
          ...positionStyle,
          cursor: hasNFCSupport ? 'default' : 'pointer',
        }}
        role="region"
        aria-label="NFC scanning area"
        onClick={handleScanAreaTap}
      >
        <div className="nfc-scan-icon" data-testid="nfc-scan-icon">
          {scanState === 'success' ? (
            <svg
              className="icon-success"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : scanState === 'error' ? (
            <svg
              className="icon-error"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="icon-nfc"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4h16v16H4V4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 12l4-4v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 8v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render simulation mode UI (for devices without NFC)
   */
  const renderSimulationMode = () => {
    return (
      <div className="nfc-simulation-mode">
        <p className="simulation-label">Simulation Mode</p>
        <p className="simulation-description">{sensorLocation?.description}</p>

        <div className="simulation-input-group">
          <input
            type="text"
            className="simulation-input"
            placeholder="Enter chip ID (e.g., TEST-CHIP-123)"
            value={simulationChipId}
            onChange={(e) => setSimulationChipId(e.target.value)}
            aria-label="Chip ID input"
          />

          <button
            className="simulation-button"
            onClick={handleSimulationScan}
            disabled={!simulationChipId.trim()}
            aria-label="Scan chip"
          >
            Scan Chip
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="kids-nfc-scan-container">
      {/* Instruction Text */}
      <div className="nfc-instruction">
        <h2 className="nfc-instruction-title">
          {hasNFCSupport ? 'Place your magic chip here!' : 'Simulation Mode'}
        </h2>
        <p className="nfc-instruction-text">
          {hasNFCSupport
            ? sensorLocation?.description || 'Place your NFC chip on the device'
            : 'Enter a chip ID to simulate scanning'}
        </p>
      </div>

      {/* Scan Area - Always render for Easter egg tap detection */}
      {renderScanArea()}

      {/* Simulation Input - Only show on non-NFC devices */}
      {!hasNFCSupport && renderSimulationMode()}

      {/* Status Messages (for screen readers) */}
      {statusMessage && (
        <div className="nfc-status" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}

      {/* Error Messages */}
      {errorMessage && (
        <div className="nfc-error" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default KidsModeNFCScan;
