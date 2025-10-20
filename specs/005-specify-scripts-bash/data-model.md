# Data Model: NFC Chip Registration

**Feature**: NFC Chip Registration
**Branch**: 005-specify-scripts-bash
**Date**: 2025-10-19

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for NFC chip registration functionality.

## Entity Definitions

### 1. NFCChip

**Purpose**: Represents a physical NFC chip registered by a parent for Kids Mode access control.

**Database Table**: `nfc_chips`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique chip record identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Parent account that owns the chip |
| chip_uid | VARCHAR(30) | NOT NULL, UNIQUE | Normalized NFC chip UID (uppercase hex with colons) |
| label | VARCHAR(50) | NOT NULL | Friendly name assigned by parent (e.g., "Ben's Chip") |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration timestamp |

**Indexes**:
- `PRIMARY KEY (id)` - Default B-tree index for ID lookups
- `UNIQUE (chip_uid)` - **CRITICAL**: Enforces global uniqueness across all users
- `INDEX (user_id)` - Speeds up queries for chips owned by specific parent

**Business Rules**:
1. `chip_uid` MUST be normalized via `normalizeNFCUID()` before storage:
   - Remove colons, spaces, hyphens
   - Convert to uppercase
   - Add colons every 2 characters
   - Example: `"045ab2c3d4e5f6"` → `"04:5A:B2:C3:D4:E5:F6"`
2. `chip_uid` MUST be globally unique (one physical chip = one parent account)
3. `label` MUST be 1-50 characters (trimmed)
4. `label` MUST match regex: `/^[a-zA-Z0-9\s\-']+$/` (alphanumeric, spaces, hyphens, apostrophes only)
5. `label` MUST be HTML entity encoded to prevent XSS
6. Maximum 20 chips per `user_id` (enforced at application level)

**TypeScript Interface**:
```typescript
interface NFCChip {
  id: string; // UUID
  user_id: string; // UUID
  chip_uid: string; // Format: "04:5A:B2:C3:D4:E5:F6"
  label: string; // 1-50 characters
  created_at: string; // ISO 8601 timestamp
}
```

---

### 2. VideoNFCMapping (Context)

**Purpose**: Links NFC chips to specific videos for Kids Mode playback.

**Database Table**: `video_nfc_mappings`

**Relevant Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique mapping identifier |
| video_id | UUID | FK → videos(id) | Video to play when chip scanned |
| nfc_chip_id | UUID | FK → nfc_chips(id) **ON DELETE CASCADE** | NFC chip reference |
| profile_id | UUID | FK → profiles(id) NULLABLE | Optional profile restriction |
| max_watch_time_minutes | INTEGER | NULLABLE | Optional time limit override |
| is_active | BOOLEAN | DEFAULT true | Mapping enabled/disabled |

**Cascade Behavior**:
- When a chip is deleted from `nfc_chips`, ALL mappings with matching `nfc_chip_id` are automatically deleted
- Prevents orphaned mappings pointing to non-existent chips

**Business Rules**:
1. One chip can map to multiple videos (1:N relationship)
2. One video can be mapped to multiple chips (N:M relationship via junction table)
3. Deleting a chip cascades to delete all its video mappings
4. Active Kids Mode sessions are NOT interrupted when mapping deleted (session holds video_id in memory)

---

### 3. User (Parent Account) (Context)

**Purpose**: Parent user account that owns and manages NFC chips.

**Database Table**: `users`

**Relevant Fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | User identifier (referenced by nfc_chips.user_id) |
| email | VARCHAR | Parent email for authentication |

**Relationship to NFCChip**:
- One user can own 0-20 NFC chips (1:N relationship)
- Deleting a user cascades to delete all their chips (ON DELETE CASCADE)
- User deletion also cascades to delete all video_nfc_mappings via chips

---

## Entity Relationships

```
┌─────────────┐
│    users    │
│ (parents)   │
└──────┬──────┘
       │ 1
       │ owns
       │ (ON DELETE CASCADE)
       │ N (max 20)
┌──────▼──────────────┐
│    nfc_chips        │
│ (registered chips)  │
└──────┬──────────────┘
       │ 1
       │ mapped to
       │ (ON DELETE CASCADE)
       │ N
┌──────▼──────────────────┐
│  video_nfc_mappings     │
│ (chip-video links)      │
└──────┬──────────────────┘
       │ N
       │ references
       │
┌──────▼──────┐
│   videos    │
│             │
└─────────────┘
```

**Cascade Chain**:
```
DELETE users(id)
  → DELETE nfc_chips WHERE user_id = <id>
    → DELETE video_nfc_mappings WHERE nfc_chip_id IN (deleted chips)
```

---

## Validation Rules

### Backend Validation (Express)

**POST /api/nfc/chips**:
```javascript
[
  body('chip_uid')
    .notEmpty().withMessage('Chip UID is required')
    .trim()
    .custom(validateNFCUID) // 4-10 bytes (8-20 hex chars after normalization)
    .escape(),

  body('label')
    .notEmpty().withMessage('Label is required')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Label must be 1-50 characters')
    .matches(/^[a-zA-Z0-9\s\-']+$/).withMessage('Label can only contain letters, numbers, spaces, hyphens, and apostrophes')
    .escape()
]
```

**validateNFCUID() Function**:
```javascript
const validateNFCUID = (uid) => {
  const cleanUID = uid.replace(/[\s:-]/g, ''); // Remove separators
  const hexPattern = /^[0-9A-Fa-f]+$/; // Hex digits only

  if (!hexPattern.test(cleanUID)) {
    throw new Error('NFC UID must be a valid hexadecimal string');
  }

  if (cleanUID.length < 8 || cleanUID.length > 20) {
    throw new Error('NFC UID must be between 4-10 bytes (8-20 hex characters)');
  }

  return true;
};
```

**normalizeNFCUID() Function**:
```javascript
const normalizeNFCUID = (uid) => {
  const cleanUID = uid.replace(/[\s:-]/g, '').toUpperCase(); // Remove separators, uppercase
  return cleanUID.match(/.{1,2}/g).join(':'); // Add colons every 2 chars
};
```

**Chip Count Validation**:
```javascript
// Before inserting new chip
const chipCount = await pool.query(
  'SELECT COUNT(*) FROM nfc_chips WHERE user_id = $1',
  [req.user.id]
);

if (parseInt(chipCount.rows[0].count) >= 20) {
  return res.status(403).json({
    message: 'Maximum chip limit reached (20 chips)'
  });
}
```

### Frontend Validation (TypeScript)

**chipValidator.ts**:
```typescript
export interface ChipValidationError {
  field: 'chip_uid' | 'label';
  message: string;
}

export const validateChipUID = (uid: string): ChipValidationError | null => {
  const cleanUID = uid.replace(/[\s:-]/g, '');

  if (!/^[0-9A-Fa-f]+$/.test(cleanUID)) {
    return { field: 'chip_uid', message: 'Chip UID must be hexadecimal' };
  }

  if (cleanUID.length < 8 || cleanUID.length > 20) {
    return { field: 'chip_uid', message: 'Chip UID must be 4-10 bytes (8-20 hex characters)' };
  }

  return null;
};

export const validateLabel = (label: string): ChipValidationError | null => {
  const trimmed = label.trim();

  if (trimmed.length === 0) {
    return { field: 'label', message: 'Label is required' };
  }

  if (trimmed.length > 50) {
    return { field: 'label', message: 'Label must be 50 characters or less' };
  }

  if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) {
    return { field: 'label', message: 'Label can only contain letters, numbers, spaces, hyphens, and apostrophes' };
  }

  return null;
};
```

---

## State Transitions

### NFCChip Lifecycle

```
┌─────────────┐
│ NOT EXISTS  │ (Physical chip not registered)
└──────┬──────┘
       │
       │ POST /api/nfc/chips (parent registers chip)
       │ Validations: UID format, label, uniqueness, chip count < 20
       │
       ▼
┌─────────────────┐
│   REGISTERED    │ (Chip owned by parent, can be mapped to videos)
└────┬─────────┬──┘
     │         │
     │         │ DELETE /api/nfc/chips/:chipId (parent deletes chip)
     │         │ Cascade: Delete all video_nfc_mappings
     │         │
     │         ▼
     │    ┌─────────────┐
     │    │  DELETED    │ (Chip record removed from DB)
     │    └─────────────┘
     │
     │ POST /api/nfc/map (parent maps chip to video)
     │
     ▼
┌─────────────────┐
│ REGISTERED +    │
│ MAPPED TO VIDEO │ (Chip has 1+ video_nfc_mappings)
└────┬────────────┘
     │
     │ DELETE /api/nfc/map/:mappingId (parent removes mapping)
     │ OR DELETE /api/nfc/chips/:chipId (cascade deletes mappings)
     │
     ▼
Back to REGISTERED or DELETED
```

**State Invariants**:
- A chip cannot be REGISTERED by two different users (UNIQUE constraint)
- A chip cannot have mappings without being REGISTERED (foreign key constraint)
- Deleting a chip transitions ALL its mappings to DELETED (CASCADE)

### Video Mapping Lifecycle

```
┌─────────────┐
│ NOT EXISTS  │
└──────┬──────┘
       │
       │ POST /api/nfc/map (parent creates mapping)
       │ Validations: chip ownership, video exists
       │
       ▼
┌─────────────────┐
│  ACTIVE         │ (is_active = true)
│  (chip plays    │
│   this video)   │
└────┬─────────┬──┘
     │         │
     │         │ DELETE /api/nfc/map/:mappingId (soft delete)
     │         │ OR DELETE /api/nfc/chips/:chipId (cascade delete)
     │         │
     │         ▼
     │    ┌─────────────┐
     │    │  DELETED    │ (Mapping removed from DB)
     │    └─────────────┘
     │
     │ PATCH /api/nfc/map/:mappingId (deactivate)
     │
     ▼
┌─────────────────┐
│  INACTIVE       │ (is_active = false)
│  (chip ignores  │
│   this mapping) │
└─────────────────┘
```

---

## Frontend State Management (React Context)

### NFCChipContext

**State Shape**:
```typescript
interface NFCChipState {
  chips: NFCChip[]; // All chips owned by authenticated user
  loading: boolean; // API request in progress
  error: string | null; // Error message from last operation
  scanInProgress: boolean; // NFC scan active
}

interface NFCChipActions {
  fetchChips: () => Promise<void>; // GET /api/nfc/chips
  registerChip: (chip_uid: string, label: string) => Promise<NFCChip>; // POST
  deleteChip: (chipId: string) => Promise<void>; // DELETE
  scanNFC: () => Promise<string | null>; // Web NFC API, returns chip_uid
  clearError: () => void; // Reset error state
}

type NFCChipContextType = NFCChipState & NFCChipActions;
```

**Context Provider**:
```typescript
export const NFCChipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NFCChipState>({
    chips: [],
    loading: false,
    error: null,
    scanInProgress: false
  });

  // Actions implementation...

  return (
    <NFCChipContext.Provider value={{ ...state, ...actions }}>
      {children}
    </NFCChipContext.Provider>
  );
};
```

**Optimistic Updates**:
- `registerChip()`: Add chip to `chips` array immediately, rollback on error
- `deleteChip()`: Remove chip from `chips` array immediately, rollback on error

---

## Database Queries

### Common Operations

**1. Fetch all chips for a user**:
```sql
SELECT * FROM nfc_chips
WHERE user_id = $1
ORDER BY created_at DESC;
```

**2. Register new chip**:
```sql
INSERT INTO nfc_chips (user_id, chip_uid, label)
VALUES ($1, $2, $3)
RETURNING *;
```
Error handling: Catch `23505` (unique violation) → HTTP 409

**3. Check chip count before registration**:
```sql
SELECT COUNT(*) FROM nfc_chips
WHERE user_id = $1;
```
Enforce: `count < 20` before allowing registration

**4. Delete chip (cascades to video_nfc_mappings)**:
```sql
DELETE FROM nfc_chips
WHERE id = $1 AND user_id = $2
RETURNING id;
```
Verify: `RETURNING id` to confirm ownership + existence

**5. Verify global uniqueness** (for testing):
```sql
SELECT user_id FROM nfc_chips
WHERE chip_uid = $1;
```
Expected: 0 or 1 row (never >1 due to UNIQUE constraint)

---

## Error Codes & Messages

| HTTP Status | Error Code | Message | Trigger |
|-------------|------------|---------|---------|
| 400 | VALIDATION_ERROR | "NFC UID must be between 4-10 bytes" | Invalid chip_uid format |
| 400 | VALIDATION_ERROR | "Label is required" | Empty/missing label |
| 400 | VALIDATION_ERROR | "Label must be 1-50 characters" | Label too long |
| 400 | VALIDATION_ERROR | "Label can only contain letters, numbers, spaces, hyphens, and apostrophes" | Invalid characters in label |
| 401 | UNAUTHORIZED | "Authentication required" | Missing/invalid JWT token |
| 403 | FORBIDDEN | "Maximum chip limit reached (20 chips)" | User has 20 chips already |
| 404 | NOT_FOUND | "NFC chip not found" | Chip doesn't exist or not owned by user |
| 409 | CONFLICT | "NFC chip already registered" | chip_uid already exists (any user) |
| 429 | RATE_LIMITED | "Too many chip registration attempts" | Rate limit exceeded (10 req/15min) |
| 500 | INTERNAL_ERROR | "Failed to register NFC chip" | Database error, server crash |

**Important**: HTTP 409 returns identical message regardless of whether chip is owned by current user or another user (prevents UID enumeration).

---

## Data Migration

**Migration Status**: ✅ No migration needed

**Verification**:
```sql
-- Verify nfc_chips table structure
\d nfc_chips

-- Expected output includes:
-- "nfc_chips_chip_uid_key" UNIQUE CONSTRAINT, btree (chip_uid)
-- "nfc_chips_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- Verify video_nfc_mappings cascade
\d video_nfc_mappings

-- Expected output includes:
-- "video_nfc_mappings_nfc_chip_id_fkey"
-- FOREIGN KEY (nfc_chip_id) REFERENCES nfc_chips(id) ON DELETE CASCADE
```

**Test Cascade Behavior**:
```sql
-- Test data
INSERT INTO nfc_chips (id, user_id, chip_uid, label)
VALUES ('test-chip-id', 'test-user-id', '04:5A:B2:C3:D4:E5:F6', 'Test Chip');

INSERT INTO video_nfc_mappings (video_id, nfc_chip_id)
VALUES ('test-video-id', 'test-chip-id');

-- Delete chip
DELETE FROM nfc_chips WHERE id = 'test-chip-id';

-- Verify mapping deleted
SELECT COUNT(*) FROM video_nfc_mappings WHERE nfc_chip_id = 'test-chip-id';
-- Expected: 0
```

---

## Performance Considerations

### Indexes
- `nfc_chips.chip_uid` UNIQUE index: O(log n) lookup, ~1-5ms for 100k chips
- `nfc_chips.user_id` index: O(log n) lookup, efficient for per-user queries
- No composite index needed (queries filter by single column)

### Query Optimization
- Use `RETURNING *` in INSERT/DELETE to avoid extra SELECT query
- Count chips before registration: 1 additional query (~1ms overhead)
- Cascade deletion: Automatic, indexed on foreign key (~5-10ms for 1-5 mappings)

### Expected Load
- Typical user: 5-10 chips registered
- Worst case: 20 chips per user (enforced limit)
- Global scale: 10,000 users × 10 chips = 100,000 chip records (manageable)

---

## Security Notes

1. **Global Uniqueness**: UNIQUE constraint on `chip_uid` prevents multi-user ownership exploits
2. **Ownership Verification**: All DELETE operations verify `user_id = req.user.id`
3. **Identical Errors**: HTTP 409 does NOT reveal chip ownership information
4. **HTML Sanitization**: Labels are escaped to prevent XSS attacks
5. **Rate Limiting**: Prevents brute-force UID enumeration attacks
6. **Cascade Integrity**: ON DELETE CASCADE ensures no orphaned mappings

---

## References

- Database schema: `backend/src/db/migrate.js`
- API routes: `backend/src/routes/nfc.js`
- Feature spec: `specs/005-specify-scripts-bash/spec.md`
- Research: `specs/005-specify-scripts-bash/research.md`
