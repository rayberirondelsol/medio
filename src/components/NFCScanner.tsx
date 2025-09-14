import React, { useState, useEffect } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import './NFCScanner.css';
import '../types/web-nfc';

interface NFCScannerProps {
  onScan: (chipUID: string) => void;
}

const NFCScanner: React.FC<NFCScannerProps> = ({ onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [simulatedUID, setSimulatedUID] = useState('');

  useEffect(() => {
    // Check if Web NFC is available
    if ('NDEFReader' in window) {
      initializeNFC();
    }
  }, []);

  const initializeNFC = async () => {
    // Real NFC implementation would go here
    // This requires HTTPS and compatible browser/device
    try {
      if (!window.NDEFReader) {
        throw new Error('NDEFReader not available');
      }
      const ndef = new NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", (event: NDEFReadingEvent) => {
        onScan(event.serialNumber);
      });
    } catch (error) {
      console.log('Web NFC not available, using simulation mode');
    }
  };

  const handleSimulatedScan = () => {
    if (simulatedUID) {
      setIsScanning(true);
      setTimeout(() => {
        onScan(simulatedUID);
        setIsScanning(false);
        setSimulatedUID('');
      }, 1500);
    }
  };

  return (
    <div className="nfc-scanner">
      <div className={`scanner-card ${isScanning ? 'scanning' : ''}`}>
        <div className="scanner-icon">
          <FiCreditCard />
          {isScanning && (
            <div className="scan-waves">
              <div className="wave wave-1"></div>
              <div className="wave wave-2"></div>
              <div className="wave wave-3"></div>
            </div>
          )}
        </div>
        
        <div className="scanner-content">
          <h2>Ready to Scan!</h2>
          <p>Hold your magic chip near the screen</p>
        </div>
      </div>

      {/* Simulation mode for development */}
      <div className="simulation-mode">
        <p>Simulation Mode (for testing)</p>
        <div className="simulation-controls">
          <input
            type="text"
            placeholder="Enter chip ID"
            value={simulatedUID}
            onChange={(e) => setSimulatedUID(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSimulatedScan()}
          />
          <button onClick={handleSimulatedScan} disabled={!simulatedUID || isScanning}>
            Simulate Scan
          </button>
        </div>
        <div className="test-chips">
          <p>Test chips:</p>
          <button onClick={() => { setSimulatedUID('CHIP001'); handleSimulatedScan(); }}>
            CHIP001
          </button>
          <button onClick={() => { setSimulatedUID('CHIP002'); handleSimulatedScan(); }}>
            CHIP002
          </button>
          <button onClick={() => { setSimulatedUID('CHIP003'); handleSimulatedScan(); }}>
            CHIP003
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFCScanner;