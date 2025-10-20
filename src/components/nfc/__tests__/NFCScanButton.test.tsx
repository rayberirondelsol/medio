/**
 * Component tests for NFCScanButton
 * Tests visibility, scan workflow, and error states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NFCScanButton from '../NFCScanButton';

// Mock the utilities
jest.mock('../../../utils/nfcCapability');
jest.mock('../../../utils/nfcScanner', () => ({
  scanNFCChip: jest.fn(),
  getNFCErrorMessage: jest.fn((error: any) => error.message || 'Unknown error'),
}));

describe('NFCScanButton', () => {
  let mockIsNFCSupported: jest.Mock;
  let mockScanNFCChip: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mocked functions
    const nfcCapability = require('../../../utils/nfcCapability');
    const nfcScanner = require('../../../utils/nfcScanner');

    mockIsNFCSupported = nfcCapability.isNFCSupported as jest.Mock;
    mockScanNFCChip = nfcScanner.scanNFCChip as jest.Mock;

    // Default: NFC supported
    mockIsNFCSupported.mockReturnValue(true);
  });

  describe('T040: Button visibility based on NFC capability', () => {
    it('should show button on NFC-capable devices', () => {
      mockIsNFCSupported.mockReturnValue(true);

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      expect(screen.getByRole('button', { name: /nfc/i })).toBeInTheDocument();
    });

    it('should hide button on non-NFC devices', () => {
      mockIsNFCSupported.mockReturnValue(false);

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      expect(screen.queryByRole('button', { name: /nfc/i })).not.toBeInTheDocument();
    });

    it('should call isNFCSupported during render', () => {
      mockIsNFCSupported.mockReturnValue(true);

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      expect(mockIsNFCSupported).toHaveBeenCalled();
    });

    it('should update visibility when capability changes', () => {
      mockIsNFCSupported.mockReturnValue(true);

      const mockOnScan = jest.fn();
      const { rerender } = render(<NFCScanButton onScan={mockOnScan} />);

      expect(screen.getByRole('button', { name: /nfc/i })).toBeInTheDocument();

      // Change capability
      mockIsNFCSupported.mockReturnValue(false);
      rerender(<NFCScanButton onScan={mockOnScan} />);

      expect(screen.queryByRole('button', { name: /nfc/i })).not.toBeInTheDocument();
    });

    it('should render null when not supported', () => {
      mockIsNFCSupported.mockReturnValue(false);

      const mockOnScan = jest.fn();
      const { container } = render(<NFCScanButton onScan={mockOnScan} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('T041: Scan workflow', () => {
    it('should trigger scan on button click', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockResolvedValue('04:5A:B2:C3:D4:E5:F6');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockScanNFCChip).toHaveBeenCalled();
      });
    });

    it('should show loading state during scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('04:5A:B2:C3:D4:E5:F6'), 1000))
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      // Should show loading state with spinner and status text
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /scannt/i })).toBeInTheDocument();
        expect(screen.getByText(/halten sie ihr gerät/i)).toBeInTheDocument();
      });
    });

    it('should disable button during scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('04:5A:B2:C3:D4:E5:F6'), 1000))
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      // Button is replaced by scanning state, so original button shouldn't be there
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /nfc-chip scannen/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
      });
    });

    it('should auto-fill chip_uid on successful scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockResolvedValue('04:5A:B2:C3:D4:E5:F6');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('04:5A:B2:C3:D4:E5:F6');
      });
    });

    it('should reset button state after successful scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockResolvedValue('04:5A:B2:C3:D4:E5:F6');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalled();
      });

      // Button should be back to original state after success
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nfc-chip scannen/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle multiple scans sequentially', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip
        .mockResolvedValueOnce('04:5A:B2:C3:D4:E5:F6')
        .mockResolvedValueOnce('04:AA:BB:CC:DD:EE:FF');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      let button = screen.getByRole('button', { name: /nfc/i });

      // First scan
      fireEvent.click(button);
      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('04:5A:B2:C3:D4:E5:F6');
      });

      // Wait for button to reappear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nfc-chip scannen/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      // Second scan
      button = screen.getByRole('button', { name: /nfc-chip scannen/i });
      fireEvent.click(button);
      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('04:AA:BB:CC:DD:EE:FF');
      });

      expect(mockOnScan).toHaveBeenCalledTimes(2);
    });
  });

  describe('T042: Error states', () => {
    it('should handle permission denied error', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockRejectedValue(
        Object.assign(new Error('NFC Berechtigung verweigert'), {
          name: 'NotAllowedError',
        })
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/berechtigung/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnScan).not.toHaveBeenCalled();
    });

    it('should handle NFC disabled error', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockRejectedValue(
        Object.assign(new Error('NFC ist deaktiviert'), {
          name: 'InvalidStateError',
        })
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/nfc/i)).toBeInTheDocument();
      });

      expect(mockOnScan).not.toHaveBeenCalled();
    });

    it('should handle timeout error', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockRejectedValue(
        Object.assign(new Error('Zeitüberschreitung beim Scannen'), {
          name: 'AbortError',
        })
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/zeit/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockOnScan).not.toHaveBeenCalled();
    });

    it('should display error message to user', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockRejectedValue(new Error('Scan fehlgeschlagen'));

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/fehl/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should re-enable button after error', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockRejectedValue(new Error('Scan fehlgeschlagen'));

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/fehl/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should have retry button in error state
      expect(screen.getByRole('button', { name: /erneut/i })).toBeInTheDocument();
    });

    it('should clear error message on retry', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip
        .mockRejectedValueOnce(new Error('Scan fehlgeschlagen'))
        .mockResolvedValueOnce('04:5A:B2:C3:D4:E5:F6');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });

      // First attempt - error
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText(/fehl/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /erneut/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/fehl/i)).not.toBeInTheDocument();
      });

      expect(mockOnScan).toHaveBeenCalledWith('04:5A:B2:C3:D4:E5:F6');
    });

    it('should handle cancel scan functionality', async () => {
      mockIsNFCSupported.mockReturnValue(true);

      // Mock a long-running scan that never resolves
      mockScanNFCChip.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      // Wait for cancel button to appear
      const cancelButton = await waitFor(() => {
        return screen.getByRole('button', { name: /abbrechen/i });
      }, { timeout: 2000 });

      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);

      // Should go back to original button state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nfc-chip scannen/i })).toBeInTheDocument();
      });
    });

    it('should show cancel button only during scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('04:5A:B2:C3:D4:E5:F6'), 1000))
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      // Cancel button should not be visible initially
      expect(screen.queryByRole('button', { name: /abbrechen/i })).not.toBeInTheDocument();

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      // Cancel button should appear during scan
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
      });
    });

    it('should hide cancel button after scan completes', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockResolvedValue('04:5A:B2:C3:D4:E5:F6');

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalled();
      });

      // Wait for success state to finish (2 seconds timeout in component)
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /abbrechen/i })).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Button text and accessibility', () => {
    it('should have accessible button text in German', () => {
      mockIsNFCSupported.mockReturnValue(true);

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });
      expect(button).toHaveAccessibleName();
    });

    it('should update button text during scan', async () => {
      mockIsNFCSupported.mockReturnValue(true);
      mockScanNFCChip.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('04:5A:B2:C3:D4:E5:F6'), 1000))
      );

      const mockOnScan = jest.fn();
      render(<NFCScanButton onScan={mockOnScan} />);

      const button = screen.getByRole('button', { name: /nfc/i });

      fireEvent.click(button);

      // Button is replaced by scanning state which shows status text
      await waitFor(() => {
        expect(screen.getByText(/halten sie ihr gerät/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
