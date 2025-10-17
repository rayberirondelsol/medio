# Data Model: Medio Platform

**Feature**: Make Medio Fully Functional on Fly.io
**Date**: 2025-10-17
**Status**: Existing (Documentation Only)

## Overview

This document describes the existing data model for the Medio platform. This is a deployment task with NO changes to the data model. The purpose of this document is to provide reference for deployment validation and understanding the database schema that migrations will create/update.

**Note**: This is NOT a new data model design. All entities below exist in the current codebase and database schema.

## Database: medio-backend-db (PostgreSQL)

**Connection**: Fly.io Postgres, automatically injected via DATABASE_URL environment variable

**Tables**: FR-007 specifies these tables must exist:
1. users
2. profiles
3. videos
4. nfc_chips
5. watch_sessions

## Entity Definitions

### 1. users

**Purpose**: Stores parent/guardian accounts for authentication and system access.

**Fields**:
- `id` (UUID, PRIMARY KEY): Unique user identifier
- `email` (VARCHAR, UNIQUE, NOT NULL): User email address for login
- `password_hash` (VARCHAR, NOT NULL): bcrypt hashed password
- `created_at` (TIMESTAMP, DEFAULT NOW()): Account creation timestamp
- `updated_at` (TIMESTAMP, DEFAULT NOW()): Last update timestamp

**Relationships**:
- One user → Many profiles (1:N)
- One user → Many nfc_chips (1:N)
- One user → Many videos (1:N via ownership)

**Validation Rules**:
- Email must be valid format (validated by express-validator)
- Password must meet minimum strength requirements (implemented in backend/src/routes/auth.js)
- Email must be unique (enforced at database level)

**State Transitions**: N/A (users don't have workflow states)

---

### 2. profiles

**Purpose**: Stores child profiles with age-appropriate content settings and watch time limits.

**Fields**:
- `id` (UUID, PRIMARY KEY): Unique profile identifier
- `user_id` (UUID, FOREIGN KEY → users.id, NOT NULL): Owner of this profile
- `name` (VARCHAR, NOT NULL): Profile display name (e.g., "Emma", "Noah")
- `age` (INTEGER, NOT NULL): Child's age for content filtering
- `daily_limit_minutes` (INTEGER, DEFAULT NULL): Daily watch time limit (NULL = no limit)
- `created_at` (TIMESTAMP, DEFAULT NOW()): Profile creation timestamp
- `updated_at` (TIMESTAMP, DEFAULT NOW()): Last update timestamp

**Relationships**:
- Many profiles → One user (N:1)
- One profile → Many nfc_chips (1:N)
- One profile → Many watch_sessions (1:N)

**Validation Rules**:
- Name required, max 50 characters
- Age must be positive integer (typically 2-17)
- daily_limit_minutes must be positive if set
- Constitution Principle I: Age-appropriate content filtering MUST use this age field

**State Transitions**: N/A (profiles don't have workflow states)

---

### 3. videos

**Purpose**: Stores video metadata including file paths, age ratings, and ownership.

**Fields**:
- `id` (UUID, PRIMARY KEY): Unique video identifier
- `user_id` (UUID, FOREIGN KEY → users.id, NOT NULL): Uploader/owner
- `title` (VARCHAR, NOT NULL): Video title
- `description` (TEXT, DEFAULT NULL): Optional video description
- `file_path` (VARCHAR, NOT NULL): Path to video file in storage
- `thumbnail_path` (VARCHAR, DEFAULT NULL): Path to thumbnail image
- `age_rating` (INTEGER, NOT NULL): Minimum age to view (e.g., 0, 3, 7, 12)
- `duration_seconds` (INTEGER, NOT NULL): Video length in seconds
- `created_at` (TIMESTAMP, DEFAULT NOW()): Upload timestamp
- `updated_at` (TIMESTAMP, DEFAULT NOW()): Last update timestamp

**Relationships**:
- Many videos → One user (N:1)
- One video → Many watch_sessions (1:N)

**Validation Rules**:
- Title required, max 200 characters
- file_path must be valid path format
- age_rating must be non-negative
- duration_seconds must be positive
- Constitution Principle I: Age-appropriate filtering enforced by comparing profile.age >= video.age_rating

**State Transitions**: N/A (videos don't have workflow states)

---

### 4. nfc_chips

**Purpose**: Stores NFC chip UIDs and their associations with profiles for Kids Mode access.

**Fields**:
- `id` (UUID, PRIMARY KEY): Unique chip record identifier
- `uid` (VARCHAR, UNIQUE, NOT NULL): NFC chip hardware UID (hexadecimal string)
- `user_id` (UUID, FOREIGN KEY → users.id, NOT NULL): Owner of this chip
- `profile_id` (UUID, FOREIGN KEY → profiles.id, NOT NULL): Associated child profile
- `label` (VARCHAR, DEFAULT NULL): Optional friendly name (e.g., "Emma's Blue Card")
- `created_at` (TIMESTAMP, DEFAULT NOW()): Registration timestamp
- `last_used_at` (TIMESTAMP, DEFAULT NULL): Last successful scan timestamp

**Relationships**:
- Many nfc_chips → One user (N:1)
- Many nfc_chips → One profile (N:1)

**Validation Rules**:
- UID must be unique (enforced at database level)
- UID must be non-empty hexadecimal string
- Constitution Principle VI: NFC chip UIDs MUST be validated server-side

**State Transitions**: N/A (chips don't have workflow states)

**Security Notes**:
- UID validation happens server-side (never trust client)
- Chip ownership verified before allowing profile access
- UIDs logged for audit trail

---

### 5. watch_sessions

**Purpose**: Tracks active and completed video watch sessions with heartbeat mechanism for time tracking.

**Fields**:
- `id` (UUID, PRIMARY KEY): Server-generated session identifier
- `profile_id` (UUID, FOREIGN KEY → profiles.id, NOT NULL): Watching profile
- `video_id` (UUID, FOREIGN KEY → videos.id, NOT NULL): Video being watched
- `started_at` (TIMESTAMP, DEFAULT NOW()): Session start time
- `ended_at` (TIMESTAMP, DEFAULT NULL): Session end time (NULL = active)
- `last_heartbeat_at` (TIMESTAMP, DEFAULT NOW()): Last heartbeat received
- `watch_time_seconds` (INTEGER, DEFAULT 0): Accumulated watch time
- `status` (VARCHAR, DEFAULT 'active'): 'active', 'completed', 'abandoned'

**Relationships**:
- Many watch_sessions → One profile (N:1)
- Many watch_sessions → One video (N:1)

**Validation Rules**:
- started_at must be <= last_heartbeat_at
- ended_at must be >= started_at (if not NULL)
- watch_time_seconds must be non-negative
- status must be one of: 'active', 'completed', 'abandoned'

**State Transitions**:
```
[created] → active (session initialized)
active → completed (user finishes video)
active → abandoned (heartbeat timeout, user navigates away)
```

**Constitution Compliance**:
- **Principle VI**: Session ID is server-generated (never client-provided)
- **Principle VI**: Heartbeat mechanism with 30-120 second intervals
- **Principle VI**: Heartbeat failures use exponential backoff (1.5x multiplier, max 2 min)
- **Principle VI**: Session cleanup uses `navigator.sendBeacon` for reliability
- **Principle VI**: Daily watch limits enforced server-side using aggregated watch_time_seconds

**Heartbeat Logic**:
1. Frontend sends heartbeat every 60s (configurable 30-120s range)
2. Backend updates `last_heartbeat_at` and increments `watch_time_seconds`
3. If heartbeat fails: exponential backoff (60s → 90s → 135s → max 120s)
4. After max retries: mark session as 'abandoned'
5. On component unmount: send final heartbeat via `sendBeacon`, set ended_at

---

## Indexes (Performance)

**Required indexes for performance goals (SC-010: <500ms query time)**:

```sql
-- Fast user lookup by email
CREATE INDEX idx_users_email ON users(email);

-- Fast profile lookup by user
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Fast video lookup by user
CREATE INDEX idx_videos_user_id ON videos(user_id);

-- Fast NFC chip lookup by UID (critical for scan performance)
CREATE UNIQUE INDEX idx_nfc_chips_uid ON nfc_chips(uid);
CREATE INDEX idx_nfc_chips_profile_id ON nfc_chips(profile_id);

-- Fast session queries for dashboard stats
CREATE INDEX idx_watch_sessions_profile_id ON watch_sessions(profile_id);
CREATE INDEX idx_watch_sessions_video_id ON watch_sessions(video_id);
CREATE INDEX idx_watch_sessions_started_at ON watch_sessions(started_at);
```

## Data Integrity Constraints

**Foreign Key Constraints** (referential integrity):
- profiles.user_id REFERENCES users(id) ON DELETE CASCADE
- videos.user_id REFERENCES users(id) ON DELETE CASCADE
- nfc_chips.user_id REFERENCES users(id) ON DELETE CASCADE
- nfc_chips.profile_id REFERENCES profiles(id) ON DELETE CASCADE
- watch_sessions.profile_id REFERENCES profiles(id) ON DELETE CASCADE
- watch_sessions.video_id REFERENCES videos(id) ON DELETE CASCADE

**Unique Constraints**:
- users.email UNIQUE
- nfc_chips.uid UNIQUE

**Check Constraints**:
- profiles.age > 0
- profiles.daily_limit_minutes > 0 (if not NULL)
- videos.age_rating >= 0
- videos.duration_seconds > 0
- watch_sessions.watch_time_seconds >= 0

## Migration Strategy

**Deployment Task Context**: This deployment MUST run migrations to ensure schema matches this model.

**Migration Script**: `backend/src/db/migrate.js`

**Validation**:
1. Before starting backend: verify migrations run successfully
2. Check all 5 tables exist
3. Verify indexes are created
4. Test foreign key constraints work

**Rollback Strategy**: If migrations fail:
- Backend marks itself unhealthy (FR-006a)
- Health checks fail
- No traffic served until schema fixed
- Manual investigation via `flyctl ssh console -a medio-backend`

## Deployment Validation Queries

**Verify schema exists**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'profiles', 'videos', 'nfc_chips', 'watch_sessions');
```

**Expected result**: 5 rows

**Verify indexes exist**:
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'profiles', 'videos', 'nfc_chips', 'watch_sessions');
```

**Expected result**: At least 7 indexes (listed in Indexes section above)

## References

- Feature Spec: `specs/001-flyio-full-deployment/spec.md`
- Constitution Principle I (Child Safety): `.specify/memory/constitution.md` lines 45-59
- Constitution Principle VI (NFC/Sessions): `.specify/memory/constitution.md` lines 126-140
- Migration Script: `backend/src/db/migrate.js`
- Database Pool: `backend/src/db/pool.js`

