/**
 * Migration: Add NFC Chip Registration Indexes
 *
 * This migration ensures optimal performance for NFC chip operations
 * by adding critical indexes as specified in the NFC Chip Registration spec.
 *
 * Indexes added:
 * - nfc_chips.user_id: Speeds up chip listing queries (GET /api/nfc/chips)
 * - Verifies chip_uid UNIQUE constraint exists (global uniqueness)
 */

const pool = require('../pool');

const up = async () => {
  console.log('Running migration: 004_add_nfc_chip_indexes');

  try {
    // Ensure chip_uid UNIQUE constraint exists (should already be present)
    // This is a verification step - the constraint is in the base schema
    console.log('Verifying chip_uid UNIQUE constraint...');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'nfc_chips_chip_uid_key'
        ) THEN
          ALTER TABLE nfc_chips ADD CONSTRAINT nfc_chips_chip_uid_key UNIQUE (chip_uid);
          RAISE NOTICE 'Added UNIQUE constraint on nfc_chips.chip_uid';
        ELSE
          RAISE NOTICE 'UNIQUE constraint on nfc_chips.chip_uid already exists';
        END IF;
      END $$;
    `);

    // Add index on user_id for efficient chip listing queries
    console.log('Adding index on nfc_chips.user_id...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nfc_chips_user_id
      ON nfc_chips(user_id);
    `);
    console.log('✓ Index idx_nfc_chips_user_id created');

    // Verify chip_uid index exists (created implicitly by UNIQUE constraint)
    console.log('Verifying chip_uid index...');
    const result = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'nfc_chips'
      AND indexname IN ('nfc_chips_chip_uid_key', 'idx_nfc_chips_uid');
    `);

    if (result.rows.length > 0) {
      console.log(`✓ chip_uid index exists: ${result.rows.map(r => r.indexname).join(', ')}`);
    } else {
      console.warn('⚠ No chip_uid index found - this may impact duplicate detection performance');
    }

    console.log('Migration 004_add_nfc_chip_indexes completed successfully');
  } catch (error) {
    console.error('Migration 004_add_nfc_chip_indexes failed:', error);
    throw error;
  }
};

const down = async () => {
  console.log('Reverting migration: 004_add_nfc_chip_indexes');

  try {
    // Remove user_id index
    await pool.query('DROP INDEX IF EXISTS idx_nfc_chips_user_id;');
    console.log('✓ Dropped index idx_nfc_chips_user_id');

    console.log('Migration 004_add_nfc_chip_indexes reverted successfully');
  } catch (error) {
    console.error('Failed to revert migration 004_add_nfc_chip_indexes:', error);
    throw error;
  }
};

module.exports = { up, down };
