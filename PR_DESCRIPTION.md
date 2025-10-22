# Fix Production Errors: Database Schema Mismatch

## 🚨 Problem Summary

**Production Issues:**
- ❌ "Server error while saving video" when users try to add videos
- ❌ "NFC chip registration fails" when users try to register chips

**Root Cause:**
Database schema column naming mismatch between `init.sql` and backend code.

---

## 🔍 Root Cause Analysis

### The Issue

The `backend/init.sql` file used `*_uuid` naming for all columns:
```sql
-- OLD (Broken):
CREATE TABLE users (
    user_uuid UUID PRIMARY KEY,     -- ❌ Wrong!
    ...
);

CREATE TABLE videos (
    user_uuid UUID NOT NULL,        -- ❌ Wrong!
    platform_uuid UUID NOT NULL,    -- ❌ Wrong!
    ...
);
```

But **backend code expects different names**:
```javascript
// videos.js line 18:
WHERE user_id = $1                  // ✓ Expects user_id

// videos.js line 113:
INSERT INTO videos (user_id, ..., platform_id, ...)  // ✓ Not user_uuid!
```

### Impact

When backend code tries to query the database:
```sql
SELECT * FROM videos WHERE user_id = $1
```

PostgreSQL returns:
```
ERROR: column "user_id" does not exist
```

This causes both production errors:
1. Video creation fails → "Server error while saving video"
2. NFC chip registration fails → "Failed to register chip"

---

## ✅ Solution

### 1. Fixed `backend/init.sql`

**Changed all column names to match backend code:**
- `user_uuid` → `id` (primary keys)
- `platform_uuid` → `id` (primary keys)
- `video_uuid` → `id` (primary keys)
- `user_uuid` → `user_id` (foreign keys)
- `platform_uuid` → `platform_id` (foreign keys)

**Added missing columns:**
- `videos.video_url` (TEXT)
- `videos.duration_seconds` (INTEGER)
- `videos.channel_name` (VARCHAR)
- `platforms.icon_url` (TEXT)
- `profiles.age` (INTEGER)
- `watch_sessions.completed` (BOOLEAN)

**Fixed constraints:**
- `UNIQUE(user_id, video_url)` - Prevent duplicate URLs
- `UNIQUE(user_id, platform_id, platform_video_id)` - Prevent duplicate videos

### 2. Created Migration for Existing Databases

**File:** `backend/migrations/001_fix_column_naming.sql`

For production databases that were created with the old `init.sql`:
- Renames all `*_uuid` columns to match backend expectations
- Runs in a transaction (automatic rollback on error)
- Safe to run (checks for columns before renaming)
- Adds missing columns with `ADD COLUMN IF NOT EXISTS`

### 3. Added Comprehensive Documentation

**Files:**
- `backend/migrations/README.md` - Step-by-step migration guide
- `CLAUDE.md` - Updated database schema documentation
- `tests/integration/README.md` - Integration test guide

---

## 📦 What's Included

### Commits (5 total)

1. **3a671038** - `docs: add comprehensive architecture documentation to CLAUDE.md`
   - BFF Proxy architecture
   - Database schema
   - API integration patterns
   - Security features

2. **bb9bc474** - `chore: add dotenv dependency for BFF proxy server`
   - Required for server.js to load environment variables

3. **d9015ee3** - `test: add comprehensive integration tests for video and NFC workflows`
   - `tests/integration/video-creation.test.js` (7 test cases)
   - `tests/integration/nfc-registration.test.js` (8 test cases)
   - Jest configuration for integration testing
   - NPM scripts: `test:integration:local`, `test:integration:production`

4. **6bfd51dd** - `chore: add simple production API diagnostic script`
   - `test-production-api.js` - Standalone diagnostic tool
   - Tests CSRF, auth, platforms, video creation, NFC registration
   - Detailed logging for debugging

5. **27d20b71** - `fix(database): correct init.sql schema to match backend code expectations` ⭐
   - Fixed `backend/init.sql` with correct column names
   - Created migration script for existing databases
   - Added migration documentation

---

## 🧪 Testing

### Integration Tests

**Run against local development:**
```bash
# Start services
docker-compose up -d

# Run integration tests
npm run test:integration:local
```

**Run against production:**
```bash
npm run test:integration:production
```

**Quick diagnostic:**
```bash
node test-production-api.js
```

### Test Coverage

**Video Creation Flow:**
- ✅ CSRF token fetch
- ✅ User registration
- ✅ Authentication check
- ✅ Platform lookup
- ✅ Video creation (POST /api/videos)
- ✅ Duplicate detection (409)
- ✅ Validation (required fields, age rating)
- ✅ Error handling (401, 404, 400)

**NFC Chip Registration Flow:**
- ✅ CSRF token fetch
- ✅ User registration
- ✅ Authentication check
- ✅ Chip registration (POST /api/nfc/chips)
- ✅ UID normalization (multiple formats)
- ✅ Duplicate detection (409)
- ✅ Validation (UID format, label length)
- ✅ Rate limiting (429)

---

## 🚀 Deployment Instructions

### Option 1: New Deployment (Fresh Database)

Use this if you want to start with a clean database:

```bash
# Pull latest code
git pull origin claude/research-project-understanding-011CUNf16KSLYZvP9MeRYdyV

# Rebuild database with corrected schema
docker-compose down -v  # ⚠️ Destroys existing data!
docker-compose up -d

# Or deploy to Fly.io
cd backend && flyctl deploy --remote-only
cd .. && flyctl deploy
```

### Option 2: Migrate Existing Production Database

Use this if you want to keep existing production data:

#### Step 1: Check if Migration is Needed

```bash
# Connect to production database
flyctl postgres connect --app medio-db

# Check for old schema
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'user_uuid';
```

- **If returns a row:** You have the old schema → Migration needed
- **If returns no rows:** Your schema is already correct → Skip migration

#### Step 2: Backup Database

```bash
# CRITICAL: Always backup before migration!
flyctl postgres backup create --app medio-db

# Verify backup was created
flyctl postgres backup list --app medio-db
```

#### Step 3: Run Migration

```bash
# Connect to production database
flyctl postgres connect --app medio-db

# Run migration script
\i /path/to/medio/backend/migrations/001_fix_column_naming.sql

# Verify column names changed
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- Should see: id, email, password_hash, name (NOT user_uuid!)
```

#### Step 4: Verify Application Works

```bash
# Check backend logs
flyctl logs --app medio-backend

# Test video creation via frontend
# Or use diagnostic script:
node test-production-api.js
```

#### Step 5: Monitor

Monitor for 24 hours to ensure no errors.

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Review all changes in this PR
- [ ] Understand the schema changes
- [ ] Decide: New deployment or migration?
- [ ] If migration: Backup production database
- [ ] If migration: Test migration on staging first (if available)

### Deployment

**Option A: New Deployment**
- [ ] Pull latest code
- [ ] `docker-compose down -v` (destroys data!)
- [ ] `docker-compose up -d`
- [ ] Verify services are running
- [ ] Test video creation
- [ ] Test NFC chip registration

**Option B: Migration**
- [ ] Backup production database
- [ ] Check if migration is needed
- [ ] Run migration script
- [ ] Verify column names changed
- [ ] Test video creation
- [ ] Test NFC chip registration

### Post-Deployment

- [ ] Run integration tests: `npm run test:integration:production`
- [ ] Check application logs for errors
- [ ] Test video creation in browser
- [ ] Test NFC chip registration in browser
- [ ] Monitor for 24 hours

### Rollback Plan (If Something Goes Wrong)

- [ ] Restore database from backup: `flyctl postgres backup restore`
- [ ] Or revert git commit and redeploy old version
- [ ] Contact team for help

---

## 🔧 Technical Details

### Files Changed

**Database Schema:**
- `backend/init.sql` - Corrected column names
- `backend/migrations/001_fix_column_naming.sql` - Migration script
- `backend/migrations/README.md` - Migration guide

**Documentation:**
- `CLAUDE.md` - Updated architecture documentation
- `tests/integration/README.md` - Integration test guide

**Testing:**
- `tests/integration/video-creation.test.js` - Video workflow tests
- `tests/integration/nfc-registration.test.js` - NFC workflow tests
- `jest.integration.config.js` - Jest configuration
- `test-production-api.js` - Diagnostic script

**Configuration:**
- `package.json` - Added integration test scripts
- `package-lock.json` - Updated dependencies (dotenv, jest-html-reporter)

### Database Schema Changes

**Before (Broken):**
```sql
users (user_uuid, ...)
platforms (platform_uuid, ...)
videos (video_uuid, user_uuid, platform_uuid, ...)
nfc_chips (chip_uuid, user_uuid, ...)
```

**After (Fixed):**
```sql
users (id, ...)
platforms (id, ...)
videos (id, user_id, platform_id, video_url, duration_seconds, channel_name, ...)
nfc_chips (id, user_id, ...)
```

### Breaking Changes

⚠️ **Breaking Change for Existing Databases:**

If your production database was created with the old `init.sql`, you **MUST** run the migration script. Otherwise:
- Video creation will fail with "column user_id does not exist"
- NFC chip registration will fail with "column user_id does not exist"

---

## 🎯 Expected Outcomes

After deploying this PR:

✅ **Video Creation Works:**
- Users can add YouTube, Vimeo, Dailymotion videos
- No more "Server error while saving video"
- Duplicate detection works correctly

✅ **NFC Chip Registration Works:**
- Users can register NFC chips
- No more "Failed to register chip"
- UID normalization works correctly

✅ **Database Schema Consistent:**
- Column names match backend code expectations
- All queries work without errors
- Future development will be easier

✅ **Better Testing:**
- Integration tests verify end-to-end workflows
- Diagnostic script helps debug production issues
- Can test against local or production environments

---

## 📞 Support

**If you encounter issues during deployment:**

1. Check the migration guide: `backend/migrations/README.md`
2. Check backend logs: `flyctl logs --app medio-backend`
3. Run diagnostic script: `node test-production-api.js`
4. Check PostgreSQL logs
5. Contact the team

**Common Issues:**

**"Column user_uuid does not exist"**
→ You ran the migration but something went wrong. Check migration logs.

**"Column user_id does not exist"**
→ You didn't run the migration. Run `001_fix_column_naming.sql`.

**Migration fails with "column already exists"**
→ You already ran the migration. Skip it.

---

## 🎉 Summary

This PR fixes the root cause of both production errors by correcting the database schema to match backend code expectations. It includes:

- ✅ Fixed `backend/init.sql` with correct column names
- ✅ Migration script for existing databases
- ✅ Comprehensive integration tests
- ✅ Diagnostic tools
- ✅ Complete documentation

**Estimated Downtime:** 5-10 seconds (for migration)

**Risk Level:** Low (migration runs in transaction with automatic rollback)

**Testing:** Comprehensive integration tests included

**Rollback Plan:** Database backup + restore
