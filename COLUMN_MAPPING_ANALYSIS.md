# Column Mapping Analysis - Medio Project

**Date**: 2025-10-24
**Purpose**: Comprehensive analysis of column name consistency across database schema, backend code, and frontend types

## Executive Summary

### Critical Issues Found

1. **users.id vs users.user_uuid CONFUSION**
   - Database has BOTH `id` and `user_uuid` columns
   - Backend routes use `req.user.id` (from JWT token)
   - JWT token contains `user_uuid` value in `id` field
   - This creates confusion throughout the codebase

2. **Auth Flow Column Usage**
   - `auth.js` line 106: Returns `user.id` (the UUID primary key)
   - `auth.js` line 115-116: Generates token with `{ id: user.id }`
   - `auth.js` line 133: Returns `user.user_uuid` in response
   - **MISMATCH**: Token contains `id` (UUID PK), response contains `user_uuid` (duplicate column)

3. **Video Creation Flow**
   - `videos.js` line 113: Uses `req.user.id` for `user_id` column
   - This SHOULD work because `req.user.id` comes from JWT which contains the UUID
   - BUT there's confusion because database has TWO user ID columns

---

## Database Schema (init.sql) - Source of Truth

### users table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),          -- PRIMARY KEY
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID UNIQUE DEFAULT gen_random_uuid()         -- DUPLICATE COLUMN (legacy?)
);
```

**ISSUE**: Why do we have both `id` and `user_uuid`? This is the root cause of confusion.

### videos table
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),             -- References users.id (NOT user_uuid)
    platform_id UUID REFERENCES platforms(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    platform_video_id VARCHAR(255),
    duration_seconds INTEGER,
    age_rating VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    video_url TEXT,
    channel_name VARCHAR(255),
    CONSTRAINT unique_video_url_per_user UNIQUE(user_id, video_url)
);
```

**Column Names**: `user_id`, `platform_id` (NOT `user_uuid` or `platform_uuid`)

### platforms table
```sql
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT true
);
```

### nfc_chips table
```sql
CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),             -- References users.id
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID REFERENCES users(user_uuid)              -- DUPLICATE COLUMN (references user_uuid???)
);
```

**ISSUE**: `nfc_chips` has BOTH `user_id` (references users.id) AND `user_uuid` (references users.user_uuid)

---

## Backend Routes Analysis

### auth.js (Authentication)

**Line 106 - Register**: `INSERT INTO users (email, password_hash, name) VALUES (...) RETURNING id, email, name`
- Returns `user.id` (the UUID primary key)

**Line 115 - Register Token**: `generateAccessToken({ id: user.id, email: user.email })`
- Token payload contains: `{ id: user.id }` where `user.id` is the UUID primary key

**Line 133 - Register Response**:
```javascript
user: {
  id: user.user_uuid,    // ❌ WRONG! user.user_uuid was NOT in the SELECT query!
  email: user.email,
  name: user.name
}
```
**BUG**: Line 106 only returns `id, email, name`, but line 133 tries to access `user.user_uuid` which is undefined!

**Line 164 - Login**: `SELECT user_uuid, email, name, password_hash FROM users WHERE email = $1`
- Returns `user.user_uuid` (the duplicate column)

**Line 181 - Login Token**: `generateAccessToken({ id: user.user_uuid, email: user.email })`
- Token payload contains: `{ id: user.user_uuid }` where `user.user_uuid` is the duplicate UUID column

**Line 190 - Login Response**:
```javascript
user: {
  id: user.user_uuid,    // ✅ This works because line 164 selected user_uuid
  email: user.email,
  name: user.name
}
```

**INCONSISTENCY**:
- Register uses `users.id` in token but tries to return `user.user_uuid` (undefined)
- Login uses `users.user_uuid` in token and returns `user.user_uuid`

### videos.js (Video CRUD)

**Line 113 - Create Video**:
```sql
INSERT INTO videos (user_id, title, description, thumbnail_url, platform_id, platform_video_id, video_url, duration_seconds, age_rating, channel_name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
```
- Uses `req.user.id` for `user_id` parameter
- `req.user.id` comes from JWT token (either `users.id` or `users.user_uuid` depending on Register vs Login)

**Line 18-19 - Get Videos**: `SELECT COUNT(*) FROM videos WHERE user_id = $1` with `[req.user.id]`
- Uses `req.user.id` from JWT token

**All Column Names Match Schema**: ✅
- `user_id` ✅
- `platform_id` ✅
- `channel_name` ✅

### nfc.js (NFC Chip Management)

**Line 20 - Get Chips**: `SELECT * FROM nfc_chips WHERE user_id = $1` with `[req.user.id]`

**Line 82 - Register Chip**:
```sql
INSERT INTO nfc_chips (user_id, chip_uid, label)
VALUES ($1, $2, $3)
```
- Uses `req.user.id` for `user_id` parameter
- Does NOT use the `user_uuid` column at all

**All Column Names Match Schema**: ✅
- `user_id` ✅
- `chip_uid` ✅
- `label` ✅

---

## Frontend TypeScript Types

### video.ts
```typescript
export interface CreateVideoRequest {
  platform_id: string;        // ✅ Matches database
  platform_video_id: string;  // ✅ Matches database
  video_url: string;          // ✅ Matches database
  title: string;              // ✅ Matches database
  description?: string;       // ✅ Matches database
  thumbnail_url?: string;     // ✅ Matches database
  duration?: number;          // ⚠️ Frontend uses 'duration', backend uses 'duration_seconds'
  age_rating: AgeRating;      // ✅ Matches database
  channel_name?: string;      // ✅ Matches database
}
```

**Minor Inconsistency**: Frontend uses `duration` but backend expects `duration_seconds`

### nfc.ts
```typescript
export interface NFCChip {
  id: string;              // ✅ UUID
  user_id: string;         // ✅ Matches database
  chip_uid: string;        // ✅ Matches database
  label: string;           // ✅ Matches database
  created_at: string;      // ✅ Matches database
}
```

All column names match database schema ✅

---

## Root Cause Analysis

### Why Video Creation is Failing

The video creation is failing with 500 error likely due to:

1. **Foreign Key Violation**: `videos.user_id` references `users.id`, but the JWT token might contain `users.user_uuid` (from login flow)
   - If user registered and logged in, token has `user_uuid`
   - When creating video, `INSERT INTO videos (user_id, ...) VALUES (req.user.id, ...)`
   - `req.user.id` contains `user_uuid` value
   - But `videos.user_id` has foreign key constraint to `users.id`
   - **Foreign key violation if `user_uuid` ≠ `id`**

2. **Register Bug**: Line 133 of auth.js tries to return `user.user_uuid` which is undefined
   - Register SELECT query: `RETURNING id, email, name` (no user_uuid)
   - Response tries to use: `id: user.user_uuid` (undefined!)

---

## Recommended Fixes

### Option 1: Use users.id Everywhere (Recommended)

1. **Remove user_uuid column** from users table (it's redundant)
2. **Update auth.js register** to use `users.id` consistently
3. **Update auth.js login** to select and use `users.id` instead of `user_uuid`
4. **Update nfc_chips table** to remove `user_uuid` column
5. All foreign keys already reference `users.id` ✅

### Option 2: Use user_uuid Everywhere (More Work)

1. Change all foreign keys to reference `users.user_uuid`
2. Update all backend queries to use `user_uuid`
3. Keep `id` as primary key but never use it for relationships

**Recommendation**: Option 1 is simpler and cleaner. The `user_uuid` column appears to be legacy/redundant.

---

## Immediate Fix for Video Creation

**File**: `backend/src/routes/auth.js`

**Line 106** (Register):
```javascript
// BEFORE
const result = await pool.query(
  'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
  [email, passwordHash, name]
);

// AFTER - Add user_uuid to RETURNING clause (temporary fix)
const result = await pool.query(
  'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, user_uuid',
  [email, passwordHash, name]
);
```

**Line 164** (Login) - Change to use `id` instead of `user_uuid`:
```javascript
// BEFORE
const result = await pool.query(
  'SELECT user_uuid, email, name, password_hash FROM users WHERE email = $1',
  [email]
);

// AFTER
const result = await pool.query(
  'SELECT id, email, name, password_hash FROM users WHERE email = $1',
  [email]
);
```

**Line 181** (Login Token) - Use `id` instead of `user_uuid`:
```javascript
// BEFORE
const accessToken = generateAccessToken({ id: user.user_uuid, email: user.email });
const refreshToken = generateRefreshToken({ id: user.user_uuid, email: user.email });

// AFTER
const accessToken = generateAccessToken({ id: user.id, email: user.email });
const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
```

**Line 190** (Login Response) - Use `id` instead of `user_uuid`:
```javascript
// BEFORE
user: {
  id: user.user_uuid,
  email: user.email,
  name: user.name
}

// AFTER
user: {
  id: user.id,
  email: user.email,
  name: user.name
}
```

**Apply same changes to /me endpoint (line 264) and /refresh endpoint (line 349)**

---

## Verification Checklist

- [ ] Fix auth.js to use `users.id` consistently
- [ ] Test user registration → video creation flow
- [ ] Test user login → video creation flow
- [ ] Verify foreign key constraints work
- [ ] Test with exact payload: `{title: "Prinzessinnenparty", channel_name: "Benny", ...}`
- [ ] Deploy to production
- [ ] Test production end-to-end

---

## Long-Term Cleanup (Post-Fix)

1. Remove `users.user_uuid` column from database schema
2. Remove `nfc_chips.user_uuid` column from database schema
3. Add migration script for existing data
4. Update all documentation
