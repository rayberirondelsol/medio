-- Migration: Add sequence_order to video_nfc_mappings
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
  SELECT mapping_uuid,
         ROW_NUMBER() OVER (
           PARTITION BY chip_uuid
           ORDER BY created_at ASC
         ) as row_number
  FROM video_nfc_mappings
  WHERE sequence_order IS NULL
) AS subquery
WHERE video_nfc_mappings.mapping_uuid = subquery.mapping_uuid;

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
UNIQUE (chip_uuid, sequence_order);

-- Verification query (optional, can be commented out):
-- SELECT
--   nc.label as chip_label,
--   COUNT(*) as video_count,
--   array_agg(vnm.sequence_order ORDER BY vnm.sequence_order) as sequences
-- FROM nfc_chips nc
-- LEFT JOIN video_nfc_mappings vnm ON nc.chip_uuid = vnm.chip_uuid
-- GROUP BY nc.chip_uuid, nc.label;
