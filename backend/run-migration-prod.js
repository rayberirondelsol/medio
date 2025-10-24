const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    // Check if migration is needed
    console.log('Checking if migration is needed...');
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'video_nfc_mappings'
      AND column_name = 'sequence_order'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Migration already applied (sequence_order column exists)');
      return;
    }

    console.log('Running migration for production schema...');

    // Production schema migration (uses 'id' instead of 'mapping_uuid', 'chip_uuid')
    const migrationSQL = `
-- Migration: Add sequence_order to video_nfc_mappings (PRODUCTION)
-- Feature: 007-nfc-video-assignment
-- Date: 2025-10-24
-- Purpose: Enable ordered video playlists for NFC chips

-- Step 1: Add column as nullable
ALTER TABLE video_nfc_mappings
ADD COLUMN IF NOT EXISTS sequence_order INTEGER;

-- Step 2: Backfill existing rows with sequence based on created_at
UPDATE video_nfc_mappings
SET sequence_order = subquery.row_number
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY nfc_chip_id
           ORDER BY created_at ASC
         ) as row_number
  FROM video_nfc_mappings
  WHERE sequence_order IS NULL
) AS subquery
WHERE video_nfc_mappings.id = subquery.id;

-- Step 3: Make NOT NULL after backfill
ALTER TABLE video_nfc_mappings
ALTER COLUMN sequence_order SET NOT NULL;

-- Step 4: Add CHECK constraint (sequence must be positive)
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT sequence_order_positive
CHECK (sequence_order > 0);

-- Step 5: Add UNIQUE constraint (no duplicate sequences per chip)
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT unique_sequence_per_chip
UNIQUE (nfc_chip_id, sequence_order);
`;

    await pool.query(migrationSQL);
    console.log('✓ Migration completed successfully');

    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'video_nfc_mappings'
      AND column_name = 'sequence_order'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✓ Verification passed: sequence_order column exists');
    } else {
      console.error('✗ Verification failed: sequence_order column not found');
    }

    // Show sample data
    const sampleResult = await pool.query(`
      SELECT nc.label as chip_label,
             COUNT(*) as video_count,
             array_agg(vnm.sequence_order ORDER BY vnm.sequence_order) as sequences
      FROM nfc_chips nc
      LEFT JOIN video_nfc_mappings vnm ON nc.id = vnm.nfc_chip_id
      WHERE vnm.id IS NOT NULL
      GROUP BY nc.id, nc.label
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log('\n✓ Sample data after migration:');
      sampleResult.rows.forEach(row => {
        console.log(`  - ${row.chip_label}: ${row.video_count} videos, sequences: ${row.sequences}`);
      });
    } else {
      console.log('\n✓ No existing video-chip mappings found (fresh database)');
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
