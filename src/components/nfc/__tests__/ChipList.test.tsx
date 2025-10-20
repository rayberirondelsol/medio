/**
 * T057-T059: Component tests for ChipList
 * T057: Component test for ChipList rendering
 * T058: Component test for delete button and confirmation
 * T059: Component test for optimistic updates
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChipList from '../ChipList';
import { NFCChipProvider } from '../../../contexts/NFCChipContext';
import * as nfcService from '../../../services/nfcService';
import * as Sentry from '@sentry/react';

// Mock the services and Sentry
jest.mock('../../../services/nfcService');
jest.mock('@sentry/react');

const mockFetchChips = nfcService.fetchChips as jest.MockedFunction<typeof nfcService.fetchChips>;
const mockDeleteChip = nfcService.deleteChip as jest.MockedFunction<typeof nfcService.deleteChip>;
const mockSentryCapture = Sentry.captureException as jest.MockedFunction<typeof Sentry.captureException>;

describe('ChipList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // T057: Component test for ChipList rendering
  describe('T057: Rendering', () => {
    it('should render list of chips with chip_uid and label', async () => {
      const mockChips = [
        {
          id: 'chip-1',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Bens Chip',
          created_at: '2025-10-20T10:00:00Z'
        },
        {
          id: 'chip-2',
          user_id: 'user-123',
          chip_uid: '04:E1:5C:32:B9:65:80',
          label: 'Emmas Chip',
          created_at: '2025-10-20T11:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      const { container } = render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      // Wait for chips to load
      await waitFor(() => {
        expect(screen.getByText('Bens Chip')).toBeInTheDocument();
      });

      // Verify both chips are rendered
      expect(screen.getByText('Bens Chip')).toBeInTheDocument();
      expect(screen.getByText('04:5A:B2:C3:D4:E5:F6')).toBeInTheDocument();
      expect(screen.getByText('Emmas Chip')).toBeInTheDocument();
      expect(screen.getByText('04:E1:5C:32:B9:65:80')).toBeInTheDocument();

      // Verify list structure
      const listItems = container.querySelectorAll('.chip-list-item');
      expect(listItems.length).toBe(2);
    });

    it('should display empty state message when no chips are registered', async () => {
      mockFetchChips.mockResolvedValueOnce([]);

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Keine NFC-Chips registriert')).toBeInTheDocument();
      });

      // Verify no list items are rendered
      const container = screen.queryByClassName('chip-list-items');
      expect(container).not.toBeInTheDocument();
    });

    it('should display loading state while fetching chips', () => {
      // Mock a slow response
      mockFetchChips.mockImplementationOnce(() => new Promise(() => {}));

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      expect(screen.getByText('Lade NFC-Chips...')).toBeInTheDocument();
    });

    it('should display chip information in correct structure', async () => {
      const mockChips = [
        {
          id: 'chip-test',
          user_id: 'user-123',
          chip_uid: '04:AB:CD:EF:12:34:56',
          label: 'Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      const { container } = render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chip')).toBeInTheDocument();
      });

      // Verify structure: chip-info contains chip-label and chip-uid
      const chipInfo = container.querySelector('.chip-info');
      expect(chipInfo).toBeInTheDocument();

      const chipLabel = container.querySelector('.chip-label');
      expect(chipLabel).toHaveTextContent('Test Chip');

      const chipUid = container.querySelector('.chip-uid');
      expect(chipUid).toHaveTextContent('04:AB:CD:EF:12:34:56');
    });
  });

  // T058: Component test for delete button and confirmation
  describe('T058: Delete button and confirmation', () => {
    it('should display delete button for each chip', async () => {
      const mockChips = [
        {
          id: 'chip-1',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Chip 1',
          created_at: '2025-10-20T10:00:00Z'
        },
        {
          id: 'chip-2',
          user_id: 'user-123',
          chip_uid: '04:E1:5C:32:B9:65:80',
          label: 'Chip 2',
          created_at: '2025-10-20T11:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      const { container } = render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Chip 1')).toBeInTheDocument();
      });

      // Verify delete buttons are present
      const deleteButtons = container.querySelectorAll('.chip-delete-button');
      expect(deleteButtons.length).toBe(2);
      expect(deleteButtons[0]).toHaveTextContent('Löschen');
      expect(deleteButtons[1]).toHaveTextContent('Löschen');
    });

    it('should show confirmation modal when delete button is clicked', async () => {
      const mockChips = [
        {
          id: 'chip-delete-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Delete Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Delete Test Chip')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      // Verify modal appears
      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      expect(screen.getByText("Chip 'Delete Test Chip' wirklich löschen?")).toBeInTheDocument();
    });

    it('should dismiss confirmation modal when cancel button is clicked', async () => {
      const mockChips = [
        {
          id: 'chip-cancel-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Cancel Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel Test Chip')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText('Abbrechen');
      fireEvent.click(cancelButton);

      // Verify modal is dismissed
      await waitFor(() => {
        expect(screen.queryByText('Chip löschen')).not.toBeInTheDocument();
      });

      // Verify chip is still present
      expect(screen.getByText('Cancel Test Chip')).toBeInTheDocument();
    });

    it('should call deleteChip when confirm button is clicked', async () => {
      const mockChips = [
        {
          id: 'chip-confirm-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Confirm Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      mockDeleteChip.mockResolvedValueOnce();

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Confirm Test Chip')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Verify deleteChip was called
      await waitFor(() => {
        expect(mockDeleteChip).toHaveBeenCalledWith('chip-confirm-test');
      });
    });

    it('should display modal with correct chip label in confirmation message', async () => {
      const mockChips = [
        {
          id: 'chip-label-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Unique Label 12345',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Unique Label 12345')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      // Verify label is in confirmation message
      await waitFor(() => {
        expect(screen.getByText("Chip 'Unique Label 12345' wirklich löschen?")).toBeInTheDocument();
      });
    });
  });

  // T059: Component test for optimistic updates
  describe('T059: Optimistic updates', () => {
    it('should remove chip from UI immediately on delete (optimistic update)', async () => {
      const mockChips = [
        {
          id: 'chip-optimistic-1',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Chip to Delete',
          created_at: '2025-10-20T10:00:00Z'
        },
        {
          id: 'chip-optimistic-2',
          user_id: 'user-123',
          chip_uid: '04:E1:5C:32:B9:65:80',
          label: 'Chip to Keep',
          created_at: '2025-10-20T11:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      // Mock slow delete to verify optimistic update
      mockDeleteChip.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Chip to Delete')).toBeInTheDocument();
      });

      // Both chips should be visible initially
      expect(screen.getByText('Chip to Delete')).toBeInTheDocument();
      expect(screen.getByText('Chip to Keep')).toBeInTheDocument();

      // Click delete button and confirm
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Chip should be removed immediately (optimistic update)
      await waitFor(() => {
        expect(screen.queryByText('Chip to Delete')).not.toBeInTheDocument();
      });

      // Other chip should still be visible
      expect(screen.getByText('Chip to Keep')).toBeInTheDocument();
    });

    it('should rollback if delete fails', async () => {
      const mockChips = [
        {
          id: 'chip-rollback-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Rollback Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      mockDeleteChip.mockRejectedValueOnce(new Error('Failed to delete chip'));

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Rollback Test Chip')).toBeInTheDocument();
      });

      // Click delete button and confirm
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Wait for delete to fail and rollback
      await waitFor(() => {
        expect(mockDeleteChip).toHaveBeenCalled();
      });

      // Chip should be restored (rollback)
      await waitFor(() => {
        expect(screen.getByText('Rollback Test Chip')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display error message on delete failure', async () => {
      const mockChips = [
        {
          id: 'chip-error-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Error Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      mockDeleteChip.mockRejectedValueOnce(new Error('Network error'));

      // Mock console.error to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Error Test Chip')).toBeInTheDocument();
      });

      // Click delete button and confirm
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Verify error was logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Verify Sentry was called
      await waitFor(() => {
        expect(mockSentryCapture).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show loading state during deletion', async () => {
      const mockChips = [
        {
          id: 'chip-loading-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Loading Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      // Mock slow delete
      mockDeleteChip.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 200)));

      render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading Test Chip')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Verify loading state is shown
      await waitFor(() => {
        expect(screen.queryByText('Wird gelöscht...')).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should disable delete button during deletion (prevent double-clicks)', async () => {
      const mockChips = [
        {
          id: 'chip-disable-test',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Disable Test Chip',
          created_at: '2025-10-20T10:00:00Z'
        }
      ];

      mockFetchChips.mockResolvedValueOnce(mockChips);
      mockDeleteChip.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 200)));

      const { container } = render(
        <NFCChipProvider>
          <ChipList />
        </NFCChipProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Disable Test Chip')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText('Löschen');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Chip löschen')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByText('Löschen', { selector: '.modal-confirm' });
      fireEvent.click(confirmButton);

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByText('Chip löschen')).not.toBeInTheDocument();
      });

      // Verify button is disabled during deletion
      const disabledButton = container.querySelector('.chip-delete-button:disabled');
      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toHaveTextContent('Wird gelöscht...');
    });
  });
});
