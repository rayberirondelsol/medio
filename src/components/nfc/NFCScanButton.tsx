/**
 * NFCScanButton Component
 * Provides NFC scanning functionality with visual feedback and error handling
 */

import React, { useState, useRef } from 'react';
import { isNFCSupported } from '../../utils/nfcCapability';
import { scanNFCChip, getNFCErrorMessage } from '../../utils/nfcScanner';
import './NFCScanButton.css';

interface NFCScanButtonProps {
  onScan: (chipUid: string) => void;
  disabled?: boolean;
}

const NFCScanButton: React.FC<NFCScanButtonProps> = ({ onScan, disabled = false }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hide button if NFC is not supported
  if (!isNFCSupported()) {
    return null;
  }

  const handleScan = async () => {
    // Clear previous state
    setError(null);
    setScanStatus('Bereit zum Scannen...');
    setIsScanning(true);

    try {
      // Update status to guide user
      setScanStatus('Halten Sie Ihr Gerät an den NFC-Chip...');

      // Scan the chip
      const chipUid = await scanNFCChip();

      // Success
      setScanStatus('Scan erfolgreich!');
      onScan(chipUid);

      // Clear success message after 2 seconds
      setTimeout(() => {
        setScanStatus('');
        setIsScanning(false);
      }, 2000);
    } catch (err: any) {
      // Handle error
      const errorMessage = getNFCErrorMessage(err);
      setError(errorMessage);
      setScanStatus('');
      setIsScanning(false);
    }
  };

  const handleCancel = () => {
    // Cancel the scan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsScanning(false);
    setScanStatus('');
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    handleScan();
  };

  return (
    <div className="nfc-scan-button-container">
      {!isScanning && !error && (
        <button
          type="button"
          className="nfc-scan-button"
          onClick={handleScan}
          disabled={disabled}
          aria-label="NFC-Chip scannen"
        >
          <span className="nfc-icon" aria-hidden="true">
            📱
          </span>
          <span className="nfc-button-text">NFC-Chip scannen</span>
        </button>
      )}

      {isScanning && (
        <div className="nfc-scanning-state">
          <div className="nfc-spinner" aria-label="Scannt..." role="status">
            <div className="nfc-spinner-circle"></div>
          </div>
          <div className="nfc-status-text">{scanStatus}</div>
          <button
            type="button"
            className="nfc-cancel-button"
            onClick={handleCancel}
            aria-label="Scan abbrechen"
          >
            Abbrechen
          </button>
        </div>
      )}

      {error && (
        <div className="nfc-error-state">
          <div className="nfc-error-message" role="alert" aria-live="polite">
            <span className="nfc-error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span className="nfc-error-text">{error}</span>
          </div>
          <button
            type="button"
            className="nfc-retry-button"
            onClick={handleRetry}
            aria-label="Erneut scannen"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </div>
  );
};

export default NFCScanButton;
