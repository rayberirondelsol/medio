/**
 * NFC Chip Type Definitions
 *
 * Type definitions for NFC chip registration and management functionality.
 */

/**
 * Represents an NFC chip registered in the system
 */
export interface NFCChip {
  id: string;              // UUID
  user_id: string;         // UUID
  chip_uid: string;        // NFC chip unique identifier
  label: string;           // User-friendly label for the chip
  created_at: string;      // ISO 8601 date string
}

/**
 * Validation error for chip registration
 */
export interface ChipValidationError {
  field: 'chip_uid' | 'label';
  message: string;
}

/**
 * Context type for NFC chip management
 */
export interface NFCChipContextType {
  chips: NFCChip[];
  loading: boolean;
  error: string | null;
  registerChip: (chip_uid: string, label: string) => Promise<void>;
  deleteChip: (chipId: string) => Promise<void>;
  fetchChips: () => Promise<void>;
}
