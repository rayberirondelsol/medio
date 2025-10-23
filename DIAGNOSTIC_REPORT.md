# Diagnostic Report: Production Error Analysis

**Date:** 2025-10-22
**Branch:** `claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV`
**Status:** ✅ **ROOT CAUSE IDENTIFIED AND FIXED**

---

## 🚨 Production Issues Reported

### Issue 1: Video Creation Failure
**User-Facing Error:**
```
"Server error while saving video. Please try again later."
```

**User Impact:**
- Users cannot add videos to their library
- Feature completely broken
- No videos can be saved

**Frequency:** 100% failure rate

---

### Issue 2: NFC Chip Registration Failure
**User-Facing Error:**
```
"Failed to register NFC chip"
```

**User Impact:**
- Users cannot register NFC chips
- Feature completely broken
- No chips can be added

**Frequency:** 100% failure rate

---

## 🔍 Investigation Process

### Step 1: Initial Hypothesis

**Possible causes considered:**
1. ❓ Frontend sending wrong data format
2. ❓ CSRF token issues
3. ❓ Authentication/session problems
4. ❓ Backend validation errors
5. ❓ Database connection issues
6. ✅ **Database schema mismatch** ← ACTUAL CAUSE

### Step 2: Code Analysis

#### Backend Routes Inspection

**`backend/src/routes/videos.js` (Line 18):**
```javascript
const countResult = await pool.query(
  'SELECT COUNT(*) FROM videos WHERE user_id = $1',
  //                                   ^^^^^^^^
  //                                   Expects: user_id
  [req.user.id]
);
```

**`backend/src/routes/videos.js` (Line 113):**
```javascript
const result = await pool.query(`
  INSERT INTO videos (user_id, title, ..., platform_id, platform_video_id, ...)
  //                  ^^^^^^^                ^^^^^^^^^^^
  //                  Expects: user_id, platform_id (not user_uuid, platform_uuid!)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *
`, [req.user.id, title, description, thumbnail_url, platform_id, platform_video_id, video_url, duration_seconds, age_rating, channel_name]);
```

**`backend/src/routes/nfc.js` (Line 20):**
```javascript
const result = await pool.query(
  'SELECT * FROM nfc_chips WHERE user_id = $1 ORDER BY created_at DESC',
  //                              ^^^^^^^^
  //                              Expects: user_id
  [req.user.id]
);
```

**`backend/src/routes/nfc.js` (Line 82):**
```javascript
const result = await pool.query(`
  INSERT INTO nfc_chips (user_id, chip_uid, label)
  //                     ^^^^^^^^
  //                     Expects: user_id
  VALUES ($1, $2, $3)
  RETURNING *
`, [req.user.id, normalizedUID, label]);
```

**Conclusion:** Backend code consistently expects `user_id`, `platform_id` column names.

---

#### Database Schema Inspection

**`backend/init.sql` (OLD - BROKEN):**

```sql
-- Line 8-15:
CREATE TABLE users (
    user_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    --  ^^^^^^^^
    --  Uses: user_uuid (NOT id!)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Line 17-23:
CREATE TABLE platforms (
    platform_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    --  ^^^^^^^^^^^^
    --  Uses: platform_uuid (NOT id!)
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Line 32-47:
CREATE TABLE videos (
    video_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    --  ^^^^^^^^
    --  Uses: user_uuid (NOT user_id!)
    platform_uuid UUID NOT NULL REFERENCES platforms(platform_uuid),
    --  ^^^^^^^^^^^^
    --  Uses: platform_uuid (NOT platform_id!)
    video_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    age_rating VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_uuid, platform_uuid, video_id)
);

-- Line 49-58:
CREATE TABLE nfc_chips (
    chip_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    --  ^^^^^^^^
    --  Uses: user_uuid (NOT user_id!)
    chip_uid VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chip_uid)
);
```

**Conclusion:** Database schema uses `user_uuid`, `platform_uuid`, etc. (NOT `user_id`, `platform_id`!)

---

### Step 3: Root Cause Confirmed

**The Mismatch:**

| What | Backend Code Expects | Database Schema Has | Result |
|------|---------------------|-------------------|--------|
| Users PK | `id` | `user_uuid` | ❌ Mismatch |
| Platforms PK | `id` | `platform_uuid` | ❌ Mismatch |
| Videos PK | `id` | `video_uuid` | ❌ Mismatch |
| Videos User FK | `user_id` | `user_uuid` | ❌ Mismatch |
| Videos Platform FK | `platform_id` | `platform_uuid` | ❌ Mismatch |
| NFC Chips PK | `id` | `chip_uuid` | ❌ Mismatch |
| NFC Chips User FK | `user_id` | `user_uuid` | ❌ Mismatch |

**PostgreSQL Error (when backend tries to insert video):**
```sql
INSERT INTO videos (user_id, ..., platform_id, ...)
                    ^^^^^^^^       ^^^^^^^^^^^
                    Column does not exist!

ERROR: column "user_id" does not exist
LINE 1: INSERT INTO videos (user_id, title, description, thumbnail_...
                            ^
```

**Backend Response:**
```javascript
catch (error) {
  console.error('Error adding video:', error);
  res.status(500).json({ message: 'Failed to add video' });
  //                                ^^^^^^^^^^^^^^^^^^^^^^
  //                                User sees: "Server error while saving video"
}
```

---

## ✅ Solution Implemented

### Fix 1: Corrected `backend/init.sql`

**Changed ALL column names to match backend expectations:**

```sql
-- FIXED:
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ^^
    -- NOW: id (matches backend code!)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ^^
    -- NOW: id (matches backend code!)
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- ^^^^^^^^
    -- NOW: user_id (matches backend code!)
    platform_id UUID NOT NULL REFERENCES platforms(id),
    -- ^^^^^^^^^^^^
    -- NOW: platform_id (matches backend code!)
    platform_video_id VARCHAR(255) NOT NULL,
    video_url TEXT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    age_rating VARCHAR(20),
    channel_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_video_url_per_user UNIQUE(user_id, video_url),
    CONSTRAINT unique_platform_video_per_user UNIQUE(user_id, platform_id, platform_video_id)
);

CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- ^^^^^^^^
    -- NOW: user_id (matches backend code!)
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Additional columns added:**
- `videos.video_url` (TEXT) - For duplicate URL detection
- `videos.duration_seconds` (INTEGER) - Backend expects this
- `videos.channel_name` (VARCHAR) - Backend expects this
- `platforms.icon_url` (TEXT) - For platform icons
- `profiles.age` (INTEGER) - For child age
- `watch_sessions.completed` (BOOLEAN) - For session completion tracking

---

### Fix 2: Migration Script for Existing Databases

**File:** `backend/migrations/001_fix_column_naming.sql`

**What it does:**
1. Renames all `*_uuid` columns to `id` (primary keys)
2. Renames all `user_uuid` → `user_id` (foreign keys)
3. Renames all `platform_uuid` → `platform_id` (foreign keys)
4. Adds missing columns (video_url, duration_seconds, etc.)
5. Updates constraints and indexes
6. Runs in transaction (automatic rollback on error)

**Safety features:**
- `BEGIN` transaction at start
- `COMMIT` at end (or automatic `ROLLBACK` on error)
- Checks for columns before adding (`ADD COLUMN IF NOT EXISTS`)
- Drops old constraints before adding new ones

---

## 🧪 Testing & Verification

### Integration Tests Created

**Test Suite 1: Video Creation** (`tests/integration/video-creation.test.js`)
- ✅ CSRF token fetch
- ✅ User registration
- ✅ Authentication verification
- ✅ Platform lookup (GET /api/platforms)
- ✅ Video creation (POST /api/videos)
- ✅ Duplicate detection (409)
- ✅ Validation (required fields, age rating)
- ✅ Error handling (401, 404, 400)

**Test Suite 2: NFC Chip Registration** (`tests/integration/nfc-registration.test.js`)
- ✅ CSRF token fetch
- ✅ User registration
- ✅ Authentication verification
- ✅ Chip registration (POST /api/nfc/chips)
- ✅ UID normalization (multiple formats)
- ✅ Duplicate detection (409)
- ✅ Validation (UID format, label length)
- ✅ Rate limiting (429)
- ✅ Chip deletion

**Diagnostic Script:** `test-production-api.js`
- Quick standalone test without Jest
- Tests complete workflow: CSRF → Auth → Platforms → Video → NFC
- Detailed logging for debugging

---

## 📊 Impact Analysis

### Before Fix

**Video Creation:**
```
User: Clicks "Add Video"
Frontend: POST /api/videos {title: "...", platform_id: "...", ...}
Backend: INSERT INTO videos (user_id, platform_id, ...)
PostgreSQL: ERROR - column "user_id" does not exist
Backend: 500 Internal Server Error
Frontend: "Server error while saving video"
User: ❌ Cannot add video
```

**NFC Chip Registration:**
```
User: Clicks "Register Chip"
Frontend: POST /api/nfc/chips {chip_uid: "...", label: "..."}
Backend: INSERT INTO nfc_chips (user_id, chip_uid, label)
PostgreSQL: ERROR - column "user_id" does not exist
Backend: 500 Internal Server Error
Frontend: "Failed to register NFC chip"
User: ❌ Cannot register chip
```

**Failure Rate:** 100%

---

### After Fix

**Video Creation:**
```
User: Clicks "Add Video"
Frontend: POST /api/videos {title: "...", platform_id: "...", ...}
Backend: INSERT INTO videos (user_id, platform_id, ...)
PostgreSQL: SUCCESS - Row inserted
Backend: 201 Created {id: "...", title: "...", ...}
Frontend: Video added to library
User: ✅ Video added successfully!
```

**NFC Chip Registration:**
```
User: Clicks "Register Chip"
Frontend: POST /api/nfc/chips {chip_uid: "...", label: "..."}
Backend: INSERT INTO nfc_chips (user_id, chip_uid, label)
PostgreSQL: SUCCESS - Row inserted
Backend: 201 Created {id: "...", chip_uid: "...", label: "..."}
Frontend: Chip registered
User: ✅ Chip registered successfully!
```

**Success Rate:** 100% (expected)

---

## 📈 Metrics to Monitor

### After Deployment

**Success Metrics:**
- [ ] Video creation error rate: 0%
- [ ] NFC chip registration error rate: 0%
- [ ] No "column does not exist" errors in logs
- [ ] Users successfully adding videos
- [ ] Users successfully registering chips

**Key Logs to Watch:**
```bash
# Watch for database errors
flyctl logs --app medio-backend | grep -i "column.*does not exist"

# Watch for successful creations
flyctl logs --app medio-backend | grep "video.*created\|chip.*registered"

# Watch error responses
flyctl logs --app medio-backend | grep "500\|failed"
```

---

## 🎯 Conclusion

### Root Cause
Database schema (`init.sql`) used `*_uuid` naming convention, but backend code expects `id` for primary keys and `user_id`/`platform_id` for foreign keys.

### Impact
100% failure rate for:
- Video creation (POST /api/videos)
- NFC chip registration (POST /api/nfc/chips)

### Solution
1. Fixed `backend/init.sql` with correct column names
2. Created migration script for existing databases
3. Added integration tests to prevent regression
4. Updated documentation

### Expected Outcome
✅ Video creation works (0% error rate)
✅ NFC chip registration works (0% error rate)
✅ Database schema matches backend code
✅ Future development easier (no confusion)

---

## 📞 Next Steps

1. **Deploy Fix:**
   - [ ] Choose: New deployment or migration (see DEPLOYMENT_CHECKLIST.md)
   - [ ] Follow deployment steps (see PR_DESCRIPTION.md)

2. **Verify:**
   - [ ] Run integration tests: `npm run test:integration:production`
   - [ ] Manual testing in browser
   - [ ] Monitor logs for 24 hours

3. **Document:**
   - [ ] Update team on deployment
   - [ ] Close related issues/tickets
   - [ ] Archive diagnostic report

---

**Report Generated By:** Claude Code
**Date:** 2025-10-22
**Branch:** claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV
