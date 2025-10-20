/**
 * ChipRegistrationForm Component Tests
 *
 * T021: Form validation tests (chip_uid format, label length, HTML tags, empty fields)
 * T022: Form submission tests (successful submission, form reset, loading state, success message)
 * T023: Error display tests (409 duplicate, 403 limit, 400 validation, network errors)
 *
 * TDD RED Phase: These tests verify the ChipRegistrationForm component behavior.
 * They should PASS with the current implementation.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipRegistrationForm from '../ChipRegistrationForm';
import { NFCChipProvider } from '../../../contexts/NFCChipContext';
import * as nfcService from '../../../services/nfcService';

// Mock the NFC service
jest.mock('../../../services/nfcService');

// Mock Sentry to prevent actual error logging in tests
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

describe('ChipRegistrationForm', () => {
  // Helper to render component within provider
  const renderForm = () => {
    return render(
      <NFCChipProvider>
        <ChipRegistrationForm />
      </NFCChipProvider>
    );
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ==========================================
  // T021: VALIDATION TESTS
  // ==========================================

  describe('T021: Form Validation', () => {
    test('T021-1: Valid chip UID formats are accepted', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Test valid format with colons
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalledWith('04:5A:B2:C3:D4:E5:F6', 'Test Chip');
      });
    });

    test('T021-2: Valid chip UID without separators is accepted', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '045AB2C3D4E5F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Test valid format without colons
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalledWith('045AB2C3D4E5F6', 'Test Chip');
      });
    });

    test('T021-3: Invalid chip UID with non-hex characters shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Enter invalid chip UID with non-hex characters
      await user.type(chipUidInput, '04:ZZ:XX:YY');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must contain only hexadecimal characters/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-4: Chip UID too short shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Enter chip UID that is too short (less than 8 hex chars)
      await user.type(chipUidInput, '04:5A:B2');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-5: Chip UID too long shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Enter chip UID that is too long (more than 20 hex chars)
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6:11:22:33:44');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must be at most 20 characters/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-6: Empty chip UID shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Only fill in label, leave chip UID empty
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/chip uid cannot be empty/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-7: Valid label (1-50 characters) is accepted', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'A',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Test minimum length (1 character)
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, 'A');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalledWith('045AB2C3D4E5F6', 'A');
      });
    });

    test('T021-8: Label at maximum length (50 characters) is accepted', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'A'.repeat(50),
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Test maximum length (50 characters)
      const fiftyCharLabel = 'A'.repeat(50);
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, fiftyCharLabel);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalledWith('045AB2C3D4E5F6', fiftyCharLabel);
      });
    });

    test('T021-9: Label with disallowed characters (HTML-like) shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Enter label with HTML-like characters
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, '<script>alert("xss")</script>');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, spaces, hyphens, and apostrophes/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-10: Empty label shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Only fill in chip UID, leave label empty
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/label cannot be empty/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-11: Label with only whitespace shows error', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in chip UID and label with only spaces
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, '   ');
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/label cannot be empty/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });

    test('T021-12: Both fields empty shows both errors', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Submit without filling any fields
      await user.click(submitButton);

      // Should show both validation errors
      await waitFor(() => {
        expect(screen.getByText(/chip uid cannot be empty/i)).toBeInTheDocument();
        expect(screen.getByText(/label cannot be empty/i)).toBeInTheDocument();
      });

      // Should NOT call registerChip
      expect(nfcService.registerChip).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // T022: SUBMISSION TESTS
  // ==========================================

  describe('T022: Form Submission', () => {
    test('T022-1: Successful submission calls registerChip with correct parameters', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Ben\'s Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Ben\'s Chip');
      await user.click(submitButton);

      // Verify registerChip was called with correct parameters
      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalledTimes(1);
        expect(mockRegisterChip).toHaveBeenCalledWith('04:5A:B2:C3:D4:E5:F6', 'Ben\'s Chip');
      });
    });

    test('T022-2: Form resets after successful submission', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i) as HTMLInputElement;
      const labelInput = screen.getByLabelText(/label/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockRegisterChip).toHaveBeenCalled();
      });

      // Verify form fields are cleared
      await waitFor(() => {
        expect(chipUidInput.value).toBe('');
        expect(labelInput.value).toBe('');
      });
    });

    test('T022-3: Loading state is shown during submission', async () => {
      const user = userEvent.setup();
      let resolveRegister: (value: any) => void;
      const mockRegisterChip = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveRegister = resolve;
        });
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /registriere\.\.\./i })).toBeInTheDocument();
      });

      // Button should be disabled during submission
      expect(screen.getByRole('button', { name: /registriere\.\.\./i })).toBeDisabled();

      // Input fields should be disabled during submission
      expect(chipUidInput).toBeDisabled();
      expect(labelInput).toBeDisabled();

      // Resolve the promise
      resolveRegister!({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });

      // Button should return to normal state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /chip registrieren/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /chip registrieren/i })).not.toBeDisabled();
      });
    });

    test('T022-4: Success message is displayed after successful submission', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/chip erfolgreich registriert/i)).toBeInTheDocument();
      });
    });

    test('T022-5: Success message disappears after 3 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/chip erfolgreich registriert/i)).toBeInTheDocument();
      });

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Success message should disappear
      await waitFor(() => {
        expect(screen.queryByText(/chip erfolgreich registriert/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    test('T022-6: Previous validation errors are cleared on new submission', async () => {
      const user = userEvent.setup();
      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // First submission with invalid data
      await user.type(chipUidInput, 'invalid');
      await user.click(submitButton);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/must contain only hexadecimal characters/i)).toBeInTheDocument();
      });

      // Clear and enter valid data
      await user.clear(chipUidInput);
      await user.type(chipUidInput, '045AB2C3D4E5F6');
      await user.type(labelInput, 'Test Chip');

      // Mock successful registration
      const mockRegisterChip = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '045AB2C3D4E5F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      await user.click(submitButton);

      // Previous error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/must contain only hexadecimal characters/i)).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // T023: ERROR DISPLAY TESTS
  // ==========================================

  describe('T023: Error Display', () => {
    test('T023-1: 409 duplicate chip error is displayed', async () => {
      const user = userEvent.setup();
      const duplicateError = new Error('Chip mit dieser UID ist bereits registriert');
      const mockRegisterChip = jest.fn().mockRejectedValue(duplicateError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/chip mit dieser uid ist bereits registriert/i)).toBeInTheDocument();
      });

      // Error should be displayed in the chip UID field area
      const errorMessage = screen.getByText(/chip mit dieser uid ist bereits registriert/i);
      expect(errorMessage).toHaveClass('error-message');
    });

    test('T023-2: 403 chip limit error is displayed', async () => {
      const user = userEvent.setup();
      const limitError = new Error('Maximum Anzahl an Chips erreicht (Limit: 10)');
      const mockRegisterChip = jest.fn().mockRejectedValue(limitError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/maximum anzahl an chips erreicht/i)).toBeInTheDocument();
      });
    });

    test('T023-3: 400 validation error is displayed', async () => {
      const user = userEvent.setup();
      const validationError = new Error('Ungültige Chip-Daten');
      const mockRegisterChip = jest.fn().mockRejectedValue(validationError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/ungültige chip-daten/i)).toBeInTheDocument();
      });
    });

    test('T023-4: Network error is displayed', async () => {
      const user = userEvent.setup();
      const networkError = new Error('Netzwerkfehler: Bitte überprüfen Sie Ihre Verbindung');
      const mockRegisterChip = jest.fn().mockRejectedValue(networkError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/netzwerkfehler/i)).toBeInTheDocument();
      });
    });

    test('T023-5: Generic error message for non-Error objects', async () => {
      const user = userEvent.setup();
      const mockRegisterChip = jest.fn().mockRejectedValue('Some random error');
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Generic error message should appear
      await waitFor(() => {
        expect(screen.getByText(/fehler beim registrieren des chips/i)).toBeInTheDocument();
      });
    });

    test('T023-6: Form fields remain populated after error', async () => {
      const user = userEvent.setup();
      const duplicateError = new Error('Chip mit dieser UID ist bereits registriert');
      const mockRegisterChip = jest.fn().mockRejectedValue(duplicateError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i) as HTMLInputElement;
      const labelInput = screen.getByLabelText(/label/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Fill in and submit form
      const testChipUid = '04:5A:B2:C3:D4:E5:F6';
      const testLabel = 'Test Chip';
      await user.type(chipUidInput, testChipUid);
      await user.type(labelInput, testLabel);
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/chip mit dieser uid ist bereits registriert/i)).toBeInTheDocument();
      });

      // Form fields should still contain the values
      expect(chipUidInput.value).toBe(testChipUid);
      expect(labelInput.value).toBe(testLabel);
    });

    test('T023-7: Error CSS class is applied to chip UID input on error', async () => {
      const user = userEvent.setup();
      const duplicateError = new Error('Chip mit dieser UID ist bereits registriert');
      const mockRegisterChip = jest.fn().mockRejectedValue(duplicateError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChip;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // Initially no error class
      expect(chipUidInput).not.toHaveClass('error');

      // Fill in and submit form
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/chip mit dieser uid ist bereits registriert/i)).toBeInTheDocument();
      });

      // Error class should be applied
      expect(chipUidInput).toHaveClass('error');
    });

    test('T023-8: Previous success message is cleared when new submission fails', async () => {
      const user = userEvent.setup();

      // First successful submission
      const mockRegisterChipSuccess = jest.fn().mockResolvedValue({
        id: '123',
        user_id: 'user-1',
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip',
        created_at: '2025-10-20T00:00:00Z',
      });
      (nfcService.registerChip as jest.Mock) = mockRegisterChipSuccess;

      renderForm();

      const chipUidInput = screen.getByLabelText(/chip-id/i);
      const labelInput = screen.getByLabelText(/label/i);
      const submitButton = screen.getByRole('button', { name: /chip registrieren/i });

      // First submission
      await user.type(chipUidInput, '04:5A:B2:C3:D4:E5:F6');
      await user.type(labelInput, 'Test Chip');
      await user.click(submitButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/chip erfolgreich registriert/i)).toBeInTheDocument();
      });

      // Now mock a failure for second submission
      const duplicateError = new Error('Chip mit dieser UID ist bereits registriert');
      const mockRegisterChipFail = jest.fn().mockRejectedValue(duplicateError);
      (nfcService.registerChip as jest.Mock) = mockRegisterChipFail;

      // Second submission
      await user.type(chipUidInput, '04:AA:BB:CC:DD:EE:FF');
      await user.type(labelInput, 'Another Chip');
      await user.click(submitButton);

      // Success message should disappear
      await waitFor(() => {
        expect(screen.queryByText(/chip erfolgreich registriert/i)).not.toBeInTheDocument();
      });

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/chip mit dieser uid ist bereits registriert/i)).toBeInTheDocument();
      });
    });
  });
});
