-- Rollback: Remove sequence_order from video_nfc_mappings
-- Feature: 007-nfc-video-assignment
-- Date: 2025-10-24
-- Purpose: Rollback ordered video playlists feature if needed

-- Step 1: Remove UNIQUE constraint
ALTER TABLE video_nfc_mappings
DROP CONSTRAINT IF EXISTS unique_sequence_per_chip;

-- Step 2: Remove CHECK constraint
ALTER TABLE video_nfc_mappings
DROP CONSTRAINT IF EXISTS sequence_order_positive;

-- Step 3: Make column nullable (for graceful degradation)
ALTER TABLE video_nfc_mappings
ALTER COLUMN sequence_order DROP NOT NULL;

-- Step 4: (Optional) Remove column entirely
-- WARNING: This will delete sequence data!
-- Uncomment only if full rollback is required
-- ALTER TABLE video_nfc_mappings
-- DROP COLUMN IF EXISTS sequence_order;

-- Verification query:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'video_nfc_mappings'
-- AND column_name = 'sequence_order';
