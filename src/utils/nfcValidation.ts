/**
 * NFC Validation Utilities
 *
 * Provides validation and normalization functions for NFC chip UIDs and labels.
 */

import { ChipValidationError } from '../types/nfc';

/**
 * Validates a chip UID according to the following rules:
 * - Must be 8-20 hex characters after removing colons/spaces/hyphens
 * - Only contains valid hexadecimal characters (0-9, A-F, a-f)
 *
 * @param uid - The chip UID to validate
 * @returns ChipValidationError if invalid, null if valid
 */
export function validateChipUID(uid: string): ChipValidationError | null {
  // Clean UID by removing whitespace, colons, and hyphens
  const cleanedUID = uid.replace(/[\s:-]/g, '');

  // Check if empty after cleaning
  if (cleanedUID.length === 0) {
    return {
      field: 'chip_uid',
      message: 'Chip UID cannot be empty',
    };
  }

  // Check if valid hexadecimal (0-9, A-F, a-f)
  const hexRegex = /^[0-9A-Fa-f]+$/;
  if (!hexRegex.test(cleanedUID)) {
    return {
      field: 'chip_uid',
      message: 'Chip UID must contain only hexadecimal characters (0-9, A-F)',
    };
  }

  // Check length between 8-20 characters
  if (cleanedUID.length < 8) {
    return {
      field: 'chip_uid',
      message: 'Chip UID must be at least 8 characters after removing separators',
    };
  }

  if (cleanedUID.length > 20) {
    return {
      field: 'chip_uid',
      message: 'Chip UID must be at most 20 characters after removing separators',
    };
  }

  return null;
}

/**
 * Validates a chip label according to the following rules:
 * - Cannot be empty after trimming
 * - Must be 50 characters or less
 * - Can only contain alphanumeric characters, spaces, hyphens, and apostrophes
 *
 * @param label - The label to validate
 * @returns ChipValidationError if invalid, null if valid
 */
export function validateLabel(label: string): ChipValidationError | null {
  // Trim the label
  const trimmedLabel = label.trim();

  // Check if empty
  if (trimmedLabel.length === 0) {
    return {
      field: 'label',
      message: 'Label cannot be empty',
    };
  }

  // Check if too long
  if (trimmedLabel.length > 50) {
    return {
      field: 'label',
      message: 'Label must be 50 characters or less',
    };
  }

  // Check if contains only allowed characters
  const labelRegex = /^[a-zA-Z0-9\s\-']+$/;
  if (!labelRegex.test(trimmedLabel)) {
    return {
      field: 'label',
      message: 'Label can only contain letters, numbers, spaces, hyphens, and apostrophes',
    };
  }

  return null;
}

/**
 * Normalizes a chip UID to uppercase format with colon separators every 2 characters.
 * Example: "04ab" becomes "04:AB", "04:ab:cd" becomes "04:AB:CD"
 *
 * @param uid - The chip UID to normalize
 * @returns Normalized UID in uppercase with colon separators
 */
export function normalizeChipUID(uid: string): string {
  // Remove all whitespace, colons, and hyphens
  const cleanedUID = uid.replace(/[\s:-]/g, '');

  // Convert to uppercase
  const uppercaseUID = cleanedUID.toUpperCase();

  // Split into pairs and join with colons
  const pairs: string[] = [];
  for (let i = 0; i < uppercaseUID.length; i += 2) {
    pairs.push(uppercaseUID.slice(i, i + 2));
  }

  return pairs.join(':');
}
