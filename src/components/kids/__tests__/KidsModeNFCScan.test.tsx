/**
 * Unit Tests for KidsModeNFCScan Component
 *
 * Tests the NFC scanning interface with device-specific positioning and pulsating animation.
 *
 * Test Coverage:
 * - Component renders with pulsating scan area
 * - Device type detection and positioning
 * - NFC scanning behavior (real and simulated)
 * - Success/error state display
 * - Accessibility features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KidsModeNFCScan from '../KidsModeNFCScan';
import * as deviceTypeDetector from '../../../utils/deviceTypeDetector';

// Mock device type detector
jest.mock('../../../utils/deviceTypeDetector');

describe('KidsModeNFCScan Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NDEFReader mock
    delete (global as any).NDEFReader;
  });

  describe('Rendering and Visual Elements - NFC Mode', () => {
    it('renders the NFC scan area with pulsating animation when NFC is supported', () => {
      // Mock smartphone device
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      // Mock NDEFReader API
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      // Check that scan area renders
      const scanArea = screen.getByTestId('nfc-scan-area');
      expect(scanArea).toBeInTheDocument();

      // Check that it has the pulsating animation class
      expect(scanArea).toHaveClass('nfc-scan-area--pulsating');
    });

    it('displays child-friendly instructions for NFC mode', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      // Check for instruction text
      expect(screen.getByText(/place your magic chip here/i)).toBeInTheDocument();
      expect(screen.getByText(/place nfc chip at the top center/i)).toBeInTheDocument();
    });

    it('shows scan icon in the scan area', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const scanIcon = screen.getByTestId('nfc-scan-icon');
      expect(scanIcon).toBeInTheDocument();
    });
  });

  describe('Device-Specific Positioning', () => {
    it('positions scan area according to sensor location coordinates', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const scanArea = screen.getByTestId('nfc-scan-area');
      expect(scanArea).toHaveStyle({
        top: '10%',
        left: '50%',
      });
    });

    it('positions scan area for tablet at edge-center', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('tablet');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'edge-center',
        description: 'Place NFC chip at the edge',
        coordinates: { x: 95, y: 50 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const scanArea = screen.getByTestId('nfc-scan-area');
      expect(scanArea).toHaveStyle({
        top: '50%',
        left: '95%',
      });
    });
  });

  describe('NFC Scanning - Real Mode', () => {
    it('starts NFC scanning when NFC is supported', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      // Mock NDEFReader
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });
    });

    it('calls onScan callback when NFC chip is detected', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockOnScan = jest.fn();

      // Mock NDEFReader with event simulation
      let readingListener: ((event: any) => void) | null = null;
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'reading') {
            readingListener = listener;
          }
        }),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={mockOnScan} />);

      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });

      // Simulate NFC chip scan
      if (readingListener) {
        readingListener({
          serialNumber: '04:A1:B2:C3:D4:E5:F6',
        });
      }

      expect(mockOnScan).toHaveBeenCalledWith('04:A1:B2:C3:D4:E5:F6');
    });

    it('displays error message when NFC scanning fails', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      // Mock NDEFReader with scan error
      const mockReader = {
        scan: jest.fn().mockRejectedValue(new Error('NFC permission denied')),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/unable to scan/i)).toBeInTheDocument();
      });
    });
  });

  describe('NFC Scanning - Simulation Mode', () => {
    it('shows simulation input when NFC is not supported', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('desktop');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'manual-entry',
        description: 'Enter chip ID manually',
        coordinates: { x: 50, y: 50 },
      });

      // No NDEFReader mock = NFC not supported

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      // Check for simulation mode indicator (there are multiple "Simulation Mode" texts)
      const allSimulationTexts = screen.getAllByText(/simulation mode/i);
      expect(allSimulationTexts.length).toBeGreaterThanOrEqual(1);

      // Check for chip ID input
      const input = screen.getByPlaceholderText(/enter chip id/i);
      expect(input).toBeInTheDocument();
    });

    it('calls onScan when simulation button is clicked with chip ID', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('desktop');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'manual-entry',
        description: 'Enter chip ID manually',
        coordinates: { x: 50, y: 50 },
      });

      const mockOnScan = jest.fn();
      render(<KidsModeNFCScan onScan={mockOnScan} />);

      // Enter chip ID
      const input = screen.getByPlaceholderText(/enter chip id/i);
      fireEvent.change(input, { target: { value: 'TEST-CHIP-123' } });

      // Click simulate button
      const button = screen.getByText(/scan chip/i);
      fireEvent.click(button);

      expect(mockOnScan).toHaveBeenCalledWith('TEST-CHIP-123');
    });

    it('does not call onScan when simulation input is empty', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('desktop');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'manual-entry',
        description: 'Enter chip ID manually',
        coordinates: { x: 50, y: 50 },
      });

      const mockOnScan = jest.fn();
      render(<KidsModeNFCScan onScan={mockOnScan} />);

      // Click simulate button without entering chip ID
      const button = screen.getByText(/scan chip/i);
      fireEvent.click(button);

      expect(mockOnScan).not.toHaveBeenCalled();
    });

    it('disables scan button when input is empty', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('desktop');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'manual-entry',
        description: 'Enter chip ID manually',
        coordinates: { x: 50, y: 50 },
      });

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const button = screen.getByRole('button', { name: /scan chip/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Scan Success State', () => {
    it('stops pulsating animation when scan succeeds', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      let readingListener: ((event: any) => void) | null = null;
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'reading') {
            readingListener = listener;
          }
        }),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const scanArea = screen.getByTestId('nfc-scan-area');
      expect(scanArea).toHaveClass('nfc-scan-area--pulsating');

      // Simulate successful scan
      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });

      if (readingListener) {
        readingListener({ serialNumber: '04:A1:B2:C3' });
      }

      await waitFor(() => {
        expect(scanArea).not.toHaveClass('nfc-scan-area--pulsating');
        expect(scanArea).toHaveClass('nfc-scan-area--success');
      });
    });

    it('displays success message when scan succeeds', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      let readingListener: ((event: any) => void) | null = null;
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'reading') {
            readingListener = listener;
          }
        }),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });

      // Simulate successful scan
      if (readingListener) {
        readingListener({ serialNumber: '04:A1:B2:C3' });
      }

      await waitFor(() => {
        expect(screen.getByText(/chip scanned successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for screen readers', () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      const scanArea = screen.getByTestId('nfc-scan-area');
      expect(scanArea).toHaveAttribute('role', 'region');
      expect(scanArea).toHaveAttribute('aria-label', 'NFC scanning area');
    });

    it('announces scan status changes to screen readers', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      let readingListener: ((event: any) => void) | null = null;
      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn((event: string, listener: any) => {
          if (event === 'reading') {
            readingListener = listener;
          }
        }),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      render(<KidsModeNFCScan onScan={jest.fn()} />);

      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });

      // Simulate scan
      if (readingListener) {
        readingListener({ serialNumber: '04:A1:B2:C3' });
      }

      await waitFor(() => {
        const statusElement = screen.getByRole('status');
        expect(statusElement).toBeInTheDocument();
        expect(statusElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Component Cleanup', () => {
    it('cleans up NFC reader on unmount', async () => {
      (deviceTypeDetector.detectDeviceType as jest.Mock).mockReturnValue('smartphone');
      (deviceTypeDetector.getNFCSensorLocation as jest.Mock).mockReturnValue({
        position: 'top-center',
        description: 'Place NFC chip at the top center',
        coordinates: { x: 50, y: 10 },
      });

      const mockReader = {
        scan: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      (global as any).NDEFReader = jest.fn(() => mockReader);

      const { unmount } = render(<KidsModeNFCScan onScan={jest.fn()} />);

      await waitFor(() => {
        expect(mockReader.scan).toHaveBeenCalled();
      });

      unmount();

      // Verify cleanup occurred (listeners removed)
      expect(mockReader.removeEventListener).toHaveBeenCalled();
    });
  });
});
