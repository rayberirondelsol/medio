# Backend Schema Alignment Report

**Date**: 2025-10-23
**Task**: Complete backend schema alignment with production database
**Reference**: `backend/PRODUCTION_SCHEMA.md`

## Executive Summary

Completed systematic audit of ALL backend route files and service files to identify SQL queries that don't match the production PostgreSQL schema. Found and fixed **2 critical issues** that would cause 500 errors in production.

### Issues Fixed: 2
### Files Modified: 2
### SQL Queries Audited: 47+

---

## Audit Methodology

1. Read `PRODUCTION_SCHEMA.md` as source of truth
2. Systematically reviewed ALL route files in `backend/src/routes/`
3. Checked ALL service files in `backend/src/services/`
4. Identified every SQL query and compared against production schema
5. Fixed all mismatches
6. Documented findings

---

## Files Audited

### Route Files (7 files)
- ✅ `backend/src/routes/auth.js` - 10 SQL queries
- ✅ `backend/src/routes/videos.js` - 7 SQL queries
- ✅ `backend/src/routes/platforms.js` - 1 SQL query
- ✅ `backend/src/routes/profiles.js` - 7 SQL queries
- ✅ `backend/src/routes/nfc.js` - 12 SQL queries
- ✅ `backend/src/routes/sessions.js` - 8 SQL queries
- ✅ `backend/src/routes/video-stream.js` - 4 SQL queries

### Service Files (1 file)
- ⚠️ `backend/src/services/platformService.js` - 2 SQL queries (FIXED)

---

## Critical Issues Found & Fixed

### 1. platformService.js - Non-Existent Column `requires_auth`

**Severity**: 🔴 **CRITICAL** - Would cause 500 errors

**Location**: `backend/src/services/platformService.js`
- Line 23: `getPlatformByName()` function
- Line 46: `getAllPlatforms()` function

**Problem**:
```sql
-- BEFORE (BROKEN)
SELECT id, name, requires_auth as "requiresAuth" FROM platforms WHERE name = $1
```

The production `platforms` table does NOT have a `requires_auth` column:
```sql
-- Production schema
CREATE TABLE platforms (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    icon_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    is_active BOOLEAN
);
```

**Fix Applied**:
```sql
-- AFTER (FIXED)
SELECT id, name FROM platforms WHERE name = $1
SELECT id, name FROM platforms ORDER BY name
```

**Impact**: This would cause PostgreSQL errors like `column "requires_auth" does not exist` when any code tries to fetch platform information.

**Files Changed**:
- `backend/src/services/platformService.js` (lines 23, 46)

---

### 2. video-stream.js - Wrong Column Names

**Severity**: 🔴 **CRITICAL** - Would cause 500 errors and broken redirects

**Location**: `backend/src/routes/video-stream.js`
- Line 27: Video URL check
- Line 34: File path reference
- Line 163: Metadata query

**Problems**:

#### Problem 2A: `url` column doesn't exist (should be `video_url`)
```javascript
// BEFORE (BROKEN)
if (video.url && (video.url.startsWith('http://') || video.url.startsWith('https://'))) {
  return res.redirect(video.url);
}
```

Production schema:
```sql
CREATE TABLE videos (
    -- ... other columns
    video_url TEXT,  -- NOT "url"
    -- ...
);
```

**Fix Applied**:
```javascript
// AFTER (FIXED)
if (video.video_url && (video.video_url.startsWith('http://') || video.video_url.startsWith('https://'))) {
  return res.redirect(video.video_url);
}
```

#### Problem 2B: `file_path` column doesn't exist in production
```javascript
// BEFORE (BROKEN)
const fileName = path.basename(video.file_path || video.url);
```

Production videos table has NO `file_path` column. Videos are external URLs only.

**Fix Applied**:
```javascript
// AFTER (FIXED)
// Note: Production schema has no file_path column - videos are external URLs only
const fileName = path.basename(video.video_url);
```

#### Problem 2C: Metadata query used wrong column names
```sql
-- BEFORE (BROKEN)
SELECT
  v.duration,  -- Wrong: should be duration_seconds
  CASE
    WHEN v.file_path IS NOT NULL THEN 'local'  -- Column doesn't exist
    WHEN v.url LIKE 'http%' THEN 'external'    -- Wrong column name
```

**Fix Applied**:
```sql
-- AFTER (FIXED)
SELECT
  v.duration_seconds,  -- Correct column name
  CASE
    WHEN v.video_url LIKE 'http%' THEN 'external'  -- Correct column name
    -- Removed file_path check (column doesn't exist)
```

**Impact**:
- External video redirects would fail (video.url is undefined → 500 error)
- Metadata endpoint would return SQL errors
- Stream endpoint would try to access non-existent file_path column

**Files Changed**:
- `backend/src/routes/video-stream.js` (lines 27, 35, 164)

---

## Schema Mismatches NOT in Backend Code (Informational)

These are mismatches documented in PRODUCTION_SCHEMA.md but NOT referenced in backend code (no fixes needed in routes):

### profiles table - Missing columns in production
**Production Missing**:
- `age` column (INTEGER)
- `age_rating_limit` column (VARCHAR(20))

**Impact**: Child safety features for age-based content filtering are not implemented in production database. This is a **database migration issue**, not a backend code issue.

**Action Required**: Database administrator needs to add these columns to production OR remove references from init.sql if feature is deprecated.

### platforms table - Missing columns in production
**Production Missing**:
- `display_name` column (VARCHAR(100))
- `created_at` column (TIMESTAMP)

**Impact**: Already handled - `display_name` was removed from routes in previous fix (mentioned in task description). No current code references it.

### videos table - Constraint missing in production
**Production Missing**:
- `unique_platform_video_per_user` constraint

**Impact**: Allows duplicate videos in production. This is a **database migration issue**, not a backend code issue.

---

## Files With No Schema Issues (Clean)

### ✅ auth.js - All Queries Correct
**Queries Checked**: 10
- Uses `user_uuid` column ✅ (exists in production)
- Token blacklist queries use correct columns (`token_jti`, `user_id`, `expires_at`)
- Gracefully handles missing `token_blacklist` table (try-catch with fallback)

**Sample Verified Queries**:
```sql
-- Line 93
SELECT user_uuid FROM users WHERE email = $1

-- Line 106
INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING user_uuid, email, name

-- Line 243
SELECT id FROM token_blacklist WHERE token_jti = $1
```

### ✅ videos.js - Already Fixed (Per Task Description)
**Queries Checked**: 7
- Line 113: Uses `platform_video_id` ✅ (not `video_id`)
- Line 94: Uses `video_url` ✅ (not `url`)
- Line 113: Uses `duration_seconds` ✅ (not `duration`)

**Note**: Task description stated these were "already fixed". Audit confirms they are correct.

### ✅ platforms.js - Correct Schema
**Queries Checked**: 1
```sql
-- Line 22-25
SELECT id, name FROM platforms ORDER BY name
```
No longer references `display_name` (was removed in previous fix).

### ✅ profiles.js - Matches Production Schema
**Queries Checked**: 7
- Uses production columns: `name`, `avatar_url`, `daily_limit_minutes`, `deleted_at`
- Does NOT reference missing columns (`age`, `age_rating_limit`) - those don't exist in production

**Sample Verified Queries**:
```sql
-- Line 26
SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at DESC

-- Line 64-67
INSERT INTO profiles (user_id, name, avatar_url, daily_limit_minutes)
VALUES ($1, $2, $3, $4) RETURNING *
```

**Note**: Production has `avatar_url` and `daily_limit_minutes` that init.sql doesn't have. Code correctly uses production schema.

### ✅ nfc.js - All Queries Correct
**Queries Checked**: 12
- Uses correct columns: `chip_uid`, `label`, `user_id`, `is_active`
- video_nfc_mappings queries use correct columns
- No schema mismatches found

**Sample Verified Queries**:
```sql
-- Line 20
SELECT * FROM nfc_chips WHERE user_id = $1

-- Line 81-84
INSERT INTO nfc_chips (user_id, chip_uid, label)
VALUES ($1, $2, $3) RETURNING *

-- Line 186 (nfc_chips has user_uuid FK in production - not used in queries, which is correct)
WHERE nc.chip_uid = $1
```

### ✅ sessions.js - Matches Production Schema
**Queries Checked**: 8
- Uses production schema for `watch_sessions`: `profile_id`, `video_id`, `stopped_reason`, `ended_at`, `started_at`, `duration_seconds`
- Correctly uses `daily_watch_time` table (exists in production, not in init.sql)
- No references to columns that don't exist

**Sample Verified Queries**:
```sql
-- Line 24-26 (watch_sessions)
INSERT INTO watch_sessions (profile_id, video_id)
VALUES ($1, $2) RETURNING *

-- Line 94-98 (daily_watch_time)
INSERT INTO daily_watch_time (profile_id, date, total_minutes)
VALUES ($1, CURRENT_DATE, $2)
ON CONFLICT (profile_id, date)
DO UPDATE SET total_minutes = daily_watch_time.total_minutes + $2
```

**Note**: Production `watch_sessions` schema is DIFFERENT from init.sql (missing `user_id`, `nfc_chip_id`, `completed` columns). Backend code uses PRODUCTION schema, which is correct.

---

## Production vs init.sql Discrepancies (Not Backend Issues)

These are schema differences between production and init.sql that do NOT affect backend code:

| Table | Discrepancy | In Production? | In init.sql? | Backend Uses |
|-------|-------------|----------------|--------------|--------------|
| users | `user_uuid` column | ✅ Yes | ❌ No | Production (correct) |
| users | `deleted_at`, `deleted_by` | ✅ Yes | ❌ No | Not referenced |
| platforms | `display_name` | ❌ No | ✅ Yes | Neither (already removed) |
| platforms | `api_endpoint`, `is_active` | ✅ Yes | ❌ No | Not referenced |
| videos | `unique_platform_video_per_user` constraint | ❌ No | ✅ Yes | N/A (constraint) |
| profiles | `age`, `age_rating_limit` | ❌ No | ✅ Yes | Neither (not in prod) |
| profiles | `avatar_url`, `daily_limit_minutes` | ✅ Yes | ❌ No | Production (correct) |
| watch_sessions | `user_id`, `nfc_chip_id`, `completed` | ❌ No | ✅ Yes | Production schema |
| daily_watch_time | Entire table | ✅ Yes | ❌ No | Production (correct) |

**Conclusion**: Backend code consistently uses **production schema**, not init.sql schema. This is correct for a deployed application.

---

## Verification Checklist

### Manual Verification Steps
- [x] Read PRODUCTION_SCHEMA.md completely
- [x] Audit auth.js (10 queries)
- [x] Audit videos.js (7 queries)
- [x] Audit platforms.js (1 query)
- [x] Audit profiles.js (7 queries)
- [x] Audit nfc.js (12 queries)
- [x] Audit sessions.js (8 queries)
- [x] Audit video-stream.js (4 queries)
- [x] Audit platformService.js (2 queries)
- [x] Fixed platformService.js `requires_auth` column
- [x] Fixed video-stream.js `url`→`video_url`, removed `file_path`
- [x] Fixed video-stream.js metadata query column names
- [x] Documented all findings

### Testing Recommendations

#### Unit Tests
Run existing backend unit tests to ensure no regressions:
```bash
cd backend
npm test
```

#### Integration Tests
Test the fixed endpoints manually or with E2E tests:

**1. Test Platform Service** (Fixed)
```bash
curl http://localhost:5000/api/platforms
# Should return: [{ "id": "uuid", "name": "YouTube" }, ...]
# Should NOT throw "column requires_auth does not exist"
```

**2. Test Video Streaming** (Fixed)
```bash
# Get video metadata
curl http://localhost:5000/api/videos/stream/:id/metadata \
  -H "Authorization: Bearer <token>"
# Should return metadata with duration_seconds, not duration
# Should NOT throw "column url does not exist"
```

**3. Test Video Redirect** (Fixed)
```bash
curl -I http://localhost:5000/api/videos/stream/:id/stream \
  -H "Authorization: Bearer <token>"
# Should redirect to video_url if external
# Should NOT throw "undefined url" error
```

---

## Summary of Changes

### Files Modified: 2

#### 1. backend/src/services/platformService.js
- **Line 23**: Removed `requires_auth as "requiresAuth"` from SELECT
- **Line 46**: Removed `requires_auth as "requiresAuth"` from SELECT
- **Documentation**: Updated JSDoc comments to remove `requiresAuth` return type

#### 2. backend/src/routes/video-stream.js
- **Line 27**: Changed `video.url` → `video.video_url`
- **Line 35**: Changed `video.file_path || video.url` → `video.video_url`
- **Line 32**: Added comment explaining file_path doesn't exist
- **Line 164**: Changed `v.duration` → `v.duration_seconds`
- **Line 168**: Changed `v.url LIKE` → `v.video_url LIKE`
- **Line 168**: Removed `WHEN v.file_path IS NOT NULL` case

### Files With No Issues: 6
- `backend/src/routes/auth.js` ✅
- `backend/src/routes/videos.js` ✅
- `backend/src/routes/platforms.js` ✅
- `backend/src/routes/profiles.js` ✅
- `backend/src/routes/nfc.js` ✅
- `backend/src/routes/sessions.js` ✅

---

## Recommendations

### Immediate Actions (Required)
1. ✅ **COMPLETED**: Fix platformService.js `requires_auth` column
2. ✅ **COMPLETED**: Fix video-stream.js column name mismatches
3. ⏳ **TODO**: Deploy fixes to production
4. ⏳ **TODO**: Run E2E tests after deployment

### Database Migration Actions (Optional - Not Blocking)
These are production database issues that should be addressed by a DBA:

1. **Add missing age restriction columns to profiles** (Child Safety)
   ```sql
   ALTER TABLE profiles
   ADD COLUMN age INTEGER,
   ADD COLUMN age_rating_limit VARCHAR(20);
   ```

2. **Add unique constraint to videos** (Prevent Duplicates)
   ```sql
   ALTER TABLE videos
   ADD CONSTRAINT unique_platform_video_per_user
   UNIQUE(user_id, platform_id, platform_video_id);
   ```

3. **Sync init.sql with production** (Schema Alignment)
   - Remove `display_name` from platforms
   - Add `avatar_url`, `daily_limit_minutes` to profiles
   - Add `daily_watch_time` table definition
   - Update watch_sessions schema to match production

---

## Conclusion

**All backend schema mismatches have been identified and fixed.**

- **2 critical issues** found and resolved
- **0 remaining issues** in backend code
- **All route files** now match production database schema
- **All service files** now match production database schema

The backend code is now **fully aligned** with the production PostgreSQL schema documented in `PRODUCTION_SCHEMA.md`.

**Next Steps**:
1. Deploy fixes to production
2. Verify no 500 errors occur
3. Optionally address database-level discrepancies (separate task for DBA)

---

**Report Generated**: 2025-10-23
**Author**: Claude Code (schema alignment task)
**Status**: ✅ Complete
