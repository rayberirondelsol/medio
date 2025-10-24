# Data Model: NFC Chip Video Assignment

**Feature**: NFC Chip Video Assignment
**Branch**: `007-nfc-video-assignment`
**Date**: 2025-10-24

## Summary

This feature extends the existing `video_nfc_mappings` table with a `sequence_order` column to enable ordered video playlists for NFC chips. No new tables are created; we leverage the existing schema and add constraints to enforce playlist integrity.

---

## Schema Changes

### Modified Table: video_nfc_mappings

**BEFORE** (current schema from init.sql:69-78):
```sql
CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id),
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id),
    profile_id UUID REFERENCES profiles(id),
    max_watch_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, nfc_chip_id, profile_id)
);
```

**AFTER** (with sequence_order added):
```sql
CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id),
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id),
    profile_id UUID REFERENCES profiles(id),
    sequence_order INTEGER NOT NULL,                           -- NEW COLUMN
    max_watch_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, nfc_chip_id, profile_id),
    CONSTRAINT sequence_order_positive CHECK (sequence_order > 0),   -- NEW CONSTRAINT
    CONSTRAINT unique_sequence_per_chip UNIQUE (nfc_chip_id, sequence_order)  -- NEW CONSTRAINT
);
```

**Changes**:
1. Added `sequence_order INTEGER NOT NULL` column
2. Added `sequence_order_positive` CHECK constraint (must be >= 1)
3. Added `unique_sequence_per_chip` UNIQUE constraint (no duplicate sequences per chip)

---

## Entity Relationships

```
users (1) ─────────┬──────> nfc_chips (N)
                   │
                   └──────> videos (N)

nfc_chips (1) ────> video_nfc_mappings (N) <──── videos (1)
                             │
                             │ (sequence_order determines playback order)
                             │
                             └──────> profiles (1) [optional, future feature]
```

**Key Relationships**:
- 1 NFC chip → N videos (via video_nfc_mappings)
- 1 video → N NFC chips (via video_nfc_mappings)
- sequence_order determines playback order PER chip (chip-specific)

---

## Validation Rules

| Rule | Enforcement | Error Code |
|------|-------------|------------|
| sequence_order must be positive | DB CHECK constraint | `23514` (check_violation) |
| No duplicate sequences per chip | DB UNIQUE constraint | `23505` (unique_violation) |
| Max 50 videos per chip | Application layer | `MAX_VIDEOS_EXCEEDED` |
| All videos must belong to user | Application layer (JOIN query) | `UNAUTHORIZED_VIDEO` |
| Chip must belong to user | Application layer (WHERE user_id) | `UNAUTHORIZED_CHIP` |
| Sequence must be contiguous (1,2,3...) | Application layer | `NON_CONTIGUOUS_SEQUENCE` |

---

## Migration File: 007_add_sequence_order.sql

**Location**: `backend/src/db/migrations/007_add_sequence_order.sql`

```sql
-- Migration: Add sequence_order to video_nfc_mappings
-- Feature: 007-nfc-video-assignment
-- Date: 2025-10-24

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
ADD CONSTRAINT IF NOT EXISTS sequence_order_positive
CHECK (sequence_order > 0);

-- Step 5: Add UNIQUE constraint (no duplicate sequences per chip)
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT IF NOT EXISTS unique_sequence_per_chip
UNIQUE (nfc_chip_id, sequence_order);

-- Verification query (optional, can be commented out):
-- SELECT
--   nc.label as chip_label,
--   COUNT(*) as video_count,
--   array_agg(vnm.sequence_order ORDER BY vnm.sequence_order) as sequences
-- FROM nfc_chips nc
-- LEFT JOIN video_nfc_mappings vnm ON nc.id = vnm.nfc_chip_id
-- GROUP BY nc.id, nc.label;
```

---

## Rollback Procedure

**File**: `backend/src/db/migrations/007_add_sequence_order_rollback.sql`

```sql
-- Rollback: Remove sequence_order from video_nfc_mappings
-- Feature: 007-nfc-video-assignment

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
```

---

## Example Data

**Before Migration** (existing data):
```
id                                   | video_id | nfc_chip_id | created_at
-------------------------------------|----------|-------------|-------------------
a1b2c3d4-...                         | vid-123  | chip-abc    | 2025-10-20 10:00:00
e5f6g7h8-...                         | vid-456  | chip-abc    | 2025-10-21 11:00:00
i9j0k1l2-...                         | vid-789  | chip-abc    | 2025-10-22 12:00:00
```

**After Migration** (sequence_order added):
```
id                                   | video_id | nfc_chip_id | sequence_order | created_at
-------------------------------------|----------|-------------|----------------|-------------------
a1b2c3d4-...                         | vid-123  | chip-abc    | 1              | 2025-10-20 10:00:00
e5f6g7h8-...                         | vid-456  | chip-abc    | 2              | 2025-10-21 11:00:00
i9j0k1l2-...                         | vid-789  | chip-abc    | 3              | 2025-10-22 12:00:00
```

**After User Reorders** (vid-789 moved to position 1):
```
id                                   | video_id | nfc_chip_id | sequence_order | created_at
-------------------------------------|----------|-------------|----------------|-------------------
i9j0k1l2-...                         | vid-789  | chip-abc    | 1              | 2025-10-22 12:00:00
a1b2c3d4-...                         | vid-123  | chip-abc    | 2              | 2025-10-20 10:00:00
e5f6g7h8-...                         | vid-456  | chip-abc    | 3              | 2025-10-21 11:00:00
```

---

## Query Patterns

### Get Videos for Chip (Ordered)
```sql
SELECT
  v.id,
  v.title,
  v.thumbnail_url,
  v.duration_seconds,
  p.name as platform_name,
  vnm.sequence_order,
  vnm.id as mapping_id
FROM video_nfc_mappings vnm
JOIN videos v ON vnm.video_id = v.id
JOIN platforms p ON v.platform_id = p.id
WHERE vnm.nfc_chip_id = $1
  AND vnm.is_active = true
ORDER BY vnm.sequence_order ASC;
```

### Insert New Assignments (Batch)
```sql
-- 1. Delete existing mappings
DELETE FROM video_nfc_mappings WHERE nfc_chip_id = $1;

-- 2. Insert new mappings
INSERT INTO video_nfc_mappings (video_id, nfc_chip_id, sequence_order)
VALUES
  ($2, $1, 1),
  ($3, $1, 2),
  ($4, $1, 3);
```

### Remove Video and Re-Sequence
```sql
-- 1. Delete specific mapping
DELETE FROM video_nfc_mappings WHERE id = $1 RETURNING nfc_chip_id;

-- 2. Re-sequence remaining videos
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY nfc_chip_id ORDER BY sequence_order) as new_sequence
  FROM video_nfc_mappings
  WHERE nfc_chip_id = $2
)
UPDATE video_nfc_mappings vnm
SET sequence_order = ranked.new_sequence
FROM ranked
WHERE vnm.id = ranked.id;
```

---

## Testing Strategy

### Unit Tests (Backend)
- Test sequence_order NOT NULL constraint
- Test sequence_order_positive CHECK constraint
- Test unique_sequence_per_chip UNIQUE constraint
- Test backfill logic with ROW_NUMBER()

### Integration Tests (Backend)
- Create chip, assign 3 videos, verify ORDER BY sequence_order
- Assign videos with gaps (1,3,5) → reject with validation error
- Assign 51 videos → reject with MAX_VIDEOS_EXCEEDED
- Remove middle video → verify auto-re-sequencing to (1,2)

### E2E Tests (Playwright)
- Assign videos, refresh page, verify persistence
- Reorder videos via drag-and-drop, save, verify new sequence in database
- Remove video, verify remaining videos re-sequenced

---

**Data Model Status**: ✅ COMPLETE
**Next Step**: Generate API contracts (contracts/)
