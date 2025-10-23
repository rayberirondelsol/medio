# Production Database Schema (Fly.io)

**Generated:** 2025-10-23
**Database:** PostgreSQL (medio-backend-db.flycast)
**Application:** medio-backend
**Database Name:** medio_backend

## Executive Summary

This document captures the complete production database schema as deployed on Fly.io. The production schema has **SIGNIFICANT DIFFERENCES** from `init.sql`, including:

1. **Missing columns** in production (e.g., `deleted_at`, `deleted_by`, `age`, `age_rating_limit`)
2. **Extra columns** in production (e.g., `user_uuid`, `user_uuid` foreign keys)
3. **Different data types** (e.g., UUID primary keys vs SERIAL for token_blacklist)
4. **Schema drift** from manual migrations or different deployment scripts

**CRITICAL**: Production uses BOTH `user_id` AND `user_uuid` in multiple tables, suggesting incomplete migration.

---

## Schema Differences Summary

### Tables Present in Production (9)
1. ✅ users
2. ✅ platforms
3. ✅ videos
4. ✅ profiles
5. ✅ nfc_chips
6. ✅ video_nfc_mappings
7. ✅ watch_sessions
8. ✅ daily_watch_time (NOT in init.sql)
9. ✅ token_blacklist

### Critical Differences

| Category | init.sql | Production | Impact |
|----------|----------|------------|--------|
| **users table** | No `user_uuid` column | Has `user_uuid UUID UNIQUE` | Dual identity system |
| **users table** | No soft delete | Missing `deleted_at`, `deleted_by` | No audit trail |
| **platforms** | Has `display_name` column | Missing `display_name` | API may break |
| **platforms** | Has `created_at` | Missing `created_at`, `created_at` not tracked | No audit trail |
| **videos** | `platform_id` is NOT NULL | `platform_id` is NULL | Data integrity risk |
| **videos** | Has `unique_platform_video_per_user` | Missing constraint | Duplicates possible |
| **profiles** | Has `age`, `age_rating_limit` | Missing both columns | Age restrictions broken |
| **profiles** | No soft delete | Has `deleted_at` | Extra feature in prod |
| **profiles** | No daily limits | Has `daily_limit_minutes` | Extra feature in prod |
| **profiles** | No `avatar_url` | Has `avatar_url` | Extra feature in prod |
| **nfc_chips** | `label` is NOT NULL | `label` is nullable | Data integrity risk |
| **nfc_chips** | No extra columns | Has `user_uuid` FK & `is_active` | Dual identity system |
| **nfc_chips** | No `updated_at` | Missing `updated_at` | No audit trail |
| **video_nfc_mappings** | Has `updated_at` | Missing `updated_at` | No audit trail |
| **video_nfc_mappings** | No `is_active` | Has `is_active` | Extra feature in prod |
| **watch_sessions** | Has `user_id`, `nfc_chip_id`, `completed` | Missing all three columns | **BREAKING** |
| **watch_sessions** | 7 columns | 7 columns (different set) | Schema mismatch |
| **watch_sessions** | No `stopped_reason` | Has `stopped_reason` | Extra feature in prod |
| **token_blacklist** | `id` is SERIAL | `id` is UUID | Type mismatch |
| **token_blacklist** | `user_id` NOT NULL | `user_id` nullable | Constraint mismatch |
| **token_blacklist** | Has `created_at` | Has `revoked_at` | Column rename |
| **daily_watch_time** | NOT present | Exists in production | Missing from init.sql |

---

## Detailed Schema Comparison

### 1. users

#### Production Schema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,                    -- ❌ NOT in init.sql
    deleted_by UUID REFERENCES users(id),    -- ❌ NOT in init.sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID UNIQUE DEFAULT gen_random_uuid()  -- ❌ NOT in init.sql
);
```

#### init.sql Schema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `deleted_at` | ❌ Missing | ✅ TIMESTAMP | Soft delete support in prod |
| `deleted_by` | ❌ Missing | ✅ UUID FK to users(id) | Audit trail in prod |
| `user_uuid` | ❌ Missing | ✅ UUID UNIQUE | Dual identity system |

**Analysis**: Production has soft delete functionality and a separate `user_uuid` column. This suggests:
- Migration from `user_uuid` to `id` as primary identifier (incomplete?)
- Soft delete feature implemented after initial deployment
- Foreign keys from other tables may reference either `id` or `user_uuid`

---

### 2. platforms

#### Production Schema
```sql
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,              -- ❌ NO UNIQUE constraint in prod
    icon_url VARCHAR(500),                   -- ⚠️ Different length (500 vs TEXT)
    api_endpoint VARCHAR(500),               -- ❌ NOT in init.sql
    is_active BOOLEAN DEFAULT true           -- ❌ NOT in init.sql
);
```

#### init.sql Schema
```sql
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,       -- ✅ Has UNIQUE constraint
    display_name VARCHAR(100) NOT NULL,      -- ❌ Missing in production
    icon_url TEXT,                           -- ⚠️ TEXT vs VARCHAR(500)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- ❌ Missing in production
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `name` | UNIQUE constraint | No UNIQUE constraint | Duplicate names possible |
| `display_name` | VARCHAR(100) NOT NULL | ❌ Missing | API may break |
| `icon_url` | TEXT | VARCHAR(500) | Length limit in prod |
| `api_endpoint` | ❌ Missing | VARCHAR(500) | Extra feature in prod |
| `is_active` | ❌ Missing | BOOLEAN DEFAULT true | Soft disable in prod |
| `created_at` | TIMESTAMP | ❌ Missing | No audit trail |

**Analysis**: Production schema diverged significantly:
- Missing `display_name` may break frontend if it expects this field
- No UNIQUE constraint on `name` allows duplicate platform names
- Added `api_endpoint` and `is_active` for runtime configuration

---

### 3. videos

#### Production Schema
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    platform_id UUID REFERENCES platforms(id),  -- ⚠️ NULLABLE in prod
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),                 -- ⚠️ VARCHAR(500) vs TEXT
    platform_video_id VARCHAR(255),
    duration_seconds INTEGER,
    age_rating VARCHAR(10),                     -- ⚠️ VARCHAR(10) vs VARCHAR(20)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    video_url TEXT,
    channel_name VARCHAR(255),

    CONSTRAINT unique_video_url_per_user UNIQUE(user_id, video_url)
    -- ❌ Missing: CONSTRAINT unique_platform_video_per_user
);
```

#### init.sql Schema
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id),  -- ✅ NOT NULL
    platform_video_id VARCHAR(255) NOT NULL,             -- ✅ NOT NULL
    video_url TEXT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,                                  -- TEXT vs VARCHAR(500)
    duration_seconds INTEGER,
    age_rating VARCHAR(20),                              -- VARCHAR(20) vs 10
    channel_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_video_url_per_user UNIQUE(user_id, video_url),
    CONSTRAINT unique_platform_video_per_user UNIQUE(user_id, platform_id, platform_video_id)
);
```

#### Differences
| Column/Constraint | init.sql | Production | Impact |
|-------------------|----------|------------|--------|
| `platform_id` | NOT NULL | **NULLABLE** | Videos can exist without platform |
| `platform_video_id` | NOT NULL | **NULLABLE** | ID can be missing |
| `thumbnail_url` | TEXT | VARCHAR(500) | Length limit in prod |
| `age_rating` | VARCHAR(20) | VARCHAR(10) | Smaller limit in prod |
| `unique_platform_video_per_user` | ✅ Present | ❌ **MISSING** | **Duplicates possible** |
| ON DELETE CASCADE | Yes | Not visible in schema dump | May differ |

**Analysis**: **CRITICAL DATA INTEGRITY ISSUE**
- Production allows `platform_id` to be NULL (videos without platform)
- Missing `unique_platform_video_per_user` constraint means same video can be added multiple times
- This likely causes bugs in the video management system

---

### 4. profiles

#### Production Schema
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),                     -- ❌ NOT in init.sql
    daily_limit_minutes INTEGER DEFAULT 60,      -- ❌ NOT in init.sql
    deleted_at TIMESTAMP,                        -- ❌ NOT in init.sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### init.sql Schema
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age INTEGER,                                 -- ❌ Missing in production
    age_rating_limit VARCHAR(20),                -- ❌ Missing in production
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `age` | INTEGER | ❌ **MISSING** | **Age restrictions broken** |
| `age_rating_limit` | VARCHAR(20) | ❌ **MISSING** | **Content filtering broken** |
| `avatar_url` | ❌ Missing | VARCHAR(500) | New feature in prod |
| `daily_limit_minutes` | ❌ Missing | INTEGER DEFAULT 60 | New feature in prod |
| `deleted_at` | ❌ Missing | TIMESTAMP | Soft delete in prod |

**Analysis**: **CRITICAL CHILD SAFETY ISSUE**
- Production is missing `age` and `age_rating_limit` columns
- This breaks age-based content filtering (violates CLAUDE.md constitution principle #1)
- Application code may be trying to query these columns and failing silently

---

### 5. nfc_chips

#### Production Schema
```sql
CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255),                          -- ⚠️ NULLABLE in prod
    is_active BOOLEAN DEFAULT true,              -- ❌ NOT in init.sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID REFERENCES users(user_uuid)   -- ❌ NOT in init.sql
);
```

#### init.sql Schema
```sql
CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,                 -- ✅ NOT NULL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- ❌ Missing in production
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `label` | NOT NULL | **NULLABLE** | Chips can have no label |
| `is_active` | ❌ Missing | BOOLEAN DEFAULT true | Soft disable in prod |
| `user_uuid` | ❌ Missing | UUID FK to users(user_uuid) | Dual identity system |
| `updated_at` | TIMESTAMP | ❌ **MISSING** | No audit trail |

**Analysis**:
- Dual foreign key system (`user_id` + `user_uuid`) suggests incomplete migration
- Missing `updated_at` prevents tracking chip modifications
- Nullable `label` reduces data quality

---

### 6. video_nfc_mappings

#### Production Schema
```sql
CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id),
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id),
    profile_id UUID REFERENCES profiles(id),
    max_watch_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,              -- ❌ NOT in init.sql
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(video_id, nfc_chip_id, profile_id)
);
```

#### init.sql Schema
```sql
CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    max_watch_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- ❌ Missing in production

    UNIQUE(video_id, nfc_chip_id, profile_id)
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `is_active` | ❌ Missing | BOOLEAN DEFAULT true | Soft disable in prod |
| `updated_at` | TIMESTAMP | ❌ **MISSING** | No audit trail |

**Analysis**: Relatively minor differences, but missing `updated_at` prevents tracking mapping changes.

---

### 7. watch_sessions

#### Production Schema
```sql
CREATE TABLE watch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),  -- ⚠️ Different FK
    video_id UUID NOT NULL REFERENCES videos(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    stopped_reason VARCHAR(50)                         -- ❌ NOT in init.sql
);
```

#### init.sql Schema
```sql
CREATE TABLE watch_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,     -- ❌ Missing in production
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,       -- ⚠️ NULLABLE in init
    nfc_chip_id UUID REFERENCES nfc_chips(id) ON DELETE SET NULL,     -- ❌ Missing in production
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE                                   -- ❌ Missing in production
);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `user_id` | UUID NOT NULL | ❌ **MISSING** | **Cannot track user watches** |
| `profile_id` | UUID (nullable) | UUID NOT NULL | Different constraint |
| `nfc_chip_id` | UUID (nullable) | ❌ **MISSING** | **Cannot track NFC watches** |
| `completed` | BOOLEAN | ❌ **MISSING** | **Cannot track completion** |
| `stopped_reason` | ❌ Missing | VARCHAR(50) | New feature in prod |

**Analysis**: **CRITICAL SCHEMA MISMATCH**
- Production has completely different structure for watch sessions
- Missing `user_id` and `nfc_chip_id` breaks core functionality
- Cannot distinguish between user-initiated vs NFC-initiated watches
- Missing `completed` flag prevents completion tracking

---

### 8. daily_watch_time

#### Production Schema
```sql
CREATE TABLE daily_watch_time (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    total_minutes INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'UTC',

    UNIQUE(profile_id, date)
);

-- Indexes
CREATE INDEX idx_daily_watch_time_profile_date ON daily_watch_time(profile_id, date);
```

#### init.sql Schema
```sql
-- ❌ TABLE DOES NOT EXIST IN init.sql
```

**Analysis**:
- This table was added after initial deployment
- Implements daily watch time tracking per profile
- Uses timezone-aware tracking for accurate daily limits
- Should be added to init.sql for future deployments

---

### 9. token_blacklist

#### Production Schema
```sql
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),    -- ⚠️ UUID vs SERIAL
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),                -- ⚠️ NULLABLE in prod
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- ⚠️ Different name
    expires_at TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
```

#### init.sql Schema
```sql
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,                            -- ⚠️ SERIAL vs UUID
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,                            -- ✅ NOT NULL
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- ⚠️ Different name
);

-- Indexes
CREATE INDEX idx_token_blacklist_token_jti ON token_blacklist(token_jti);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
```

#### Differences
| Column | init.sql | Production | Impact |
|--------|----------|------------|--------|
| `id` | SERIAL | **UUID** | Different ID generation |
| `user_id` | NOT NULL | **NULLABLE** | Tokens can exist without user |
| `created_at` | TIMESTAMP | Renamed to `revoked_at` | Semantic change |

**Analysis**:
- UUID primary key aligns with other tables
- Nullable `user_id` may allow system-wide token blacklisting
- `revoked_at` is more semantically correct than `created_at`

---

## Index Comparison

### Indexes Present in init.sql but Missing in Production

| Table | Index Name | Impact |
|-------|------------|--------|
| `users` | `idx_users_email` | Replaced by automatic unique index |
| `videos` | `idx_videos_platform_id` | **Missing** - slower platform queries |
| `videos` | `idx_videos_created_at` | **Missing** - slower chronological queries |
| `nfc_chips` | (covered by existing) | OK |
| `video_nfc_mappings` | `idx_video_nfc_mappings_video_id` | **Missing** - slower video lookups |
| `watch_sessions` | `idx_watch_sessions_user_id` | **MISSING** - table doesn't have user_id |
| `watch_sessions` | `idx_watch_sessions_video_id` | **Missing** - slower video watch queries |
| `token_blacklist` | `idx_token_blacklist_token_jti` | Replaced by automatic unique index |

### Indexes in Production Not in init.sql

| Table | Index Name | Purpose |
|-------|------------|---------|
| `daily_watch_time` | `idx_daily_watch_time_profile_date` | Date range queries |
| `nfc_chips` | `idx_nfc_chips_user_id` | User's chips lookup (PRESENT in init.sql) |
| `watch_sessions` | `idx_watch_sessions_profile_id` | Profile watch history |

---

## Foreign Key Constraints

### Production Foreign Keys

```sql
-- users
users.deleted_by → users.id

-- nfc_chips
nfc_chips.user_id → users.id
nfc_chips.user_uuid → users.user_uuid (DUAL FK)

-- videos
videos.user_id → users.id
videos.platform_id → platforms.id

-- profiles
profiles.user_id → users.id

-- video_nfc_mappings
video_nfc_mappings.video_id → videos.id
video_nfc_mappings.nfc_chip_id → nfc_chips.id
video_nfc_mappings.profile_id → profiles.id

-- watch_sessions
watch_sessions.profile_id → profiles.id
watch_sessions.video_id → videos.id

-- daily_watch_time
daily_watch_time.profile_id → profiles.id

-- token_blacklist
token_blacklist.user_id → users.id
```

### Missing ON DELETE Cascades

The production schema dump doesn't show ON DELETE actions, but init.sql specifies:
- `ON DELETE CASCADE` for most child records
- `ON DELETE SET NULL` for optional references (profile_id, nfc_chip_id)

These may or may not be present in production - would need to query `information_schema.referential_constraints` to confirm.

---

## Migration Recommendations

### Critical Priority (Data Integrity)

1. **Add missing constraint to videos:**
   ```sql
   ALTER TABLE videos
   ADD CONSTRAINT unique_platform_video_per_user
   UNIQUE(user_id, platform_id, platform_video_id);
   ```

2. **Add age restrictions to profiles:**
   ```sql
   ALTER TABLE profiles
   ADD COLUMN age INTEGER,
   ADD COLUMN age_rating_limit VARCHAR(20);
   ```

3. **Fix watch_sessions schema mismatch:**
   - Decision needed: Use init.sql version or keep production version?
   - If keeping production: Update init.sql
   - If reverting to init.sql: Requires data migration

### High Priority (API Compatibility)

4. **Add display_name to platforms:**
   ```sql
   ALTER TABLE platforms
   ADD COLUMN display_name VARCHAR(100);

   UPDATE platforms SET display_name = name;  -- Default to name
   ALTER TABLE platforms ALTER COLUMN display_name SET NOT NULL;
   ```

5. **Add name UNIQUE constraint to platforms:**
   ```sql
   ALTER TABLE platforms ADD CONSTRAINT platforms_name_key UNIQUE(name);
   ```

### Medium Priority (Audit Trail)

6. **Add updated_at to missing tables:**
   ```sql
   ALTER TABLE nfc_chips ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE video_nfc_mappings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE platforms ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ```

7. **Add missing indexes:**
   ```sql
   CREATE INDEX idx_videos_platform_id ON videos(platform_id);
   CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
   CREATE INDEX idx_video_nfc_mappings_video_id ON video_nfc_mappings(video_id);
   CREATE INDEX idx_watch_sessions_video_id ON watch_sessions(video_id);
   ```

### Low Priority (Schema Alignment)

8. **Clean up dual identity system:**
   - Audit all queries using `user_uuid`
   - Migrate to single `id` column
   - Remove `user_uuid` and `fk_nfc_chips_user_uuid` constraint

9. **Add daily_watch_time to init.sql:**
   ```sql
   -- Add full table definition from production schema
   ```

---

## Triggers in Production

Production should have these triggers from init.sql:

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (if updated_at column exists)
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Note:** Triggers cannot be verified from `information_schema` queries alone. Would need `\dt` in psql or query `pg_trigger` table.

---

## UUID Generation

### Production
Uses `gen_random_uuid()` (requires `pgcrypto` extension or PostgreSQL 13+)

### init.sql
Uses `uuid_generate_v4()` (requires `uuid-ossp` extension)

Both are functionally equivalent. Production is using modern PostgreSQL built-in.

---

## Conclusion

The production database schema has **significant drift** from init.sql:

**Schema Drift Severity:**
- 🔴 **Critical:** 3 issues (missing age restrictions, watch_sessions mismatch, missing constraints)
- 🟠 **High:** 4 issues (platforms.display_name, dual identity system, nullable label)
- 🟡 **Medium:** 6 issues (missing indexes, missing audit columns)
- 🟢 **Low:** Several minor type/default differences

**Immediate Actions Required:**
1. Add age restriction columns to profiles (child safety violation)
2. Add unique_platform_video_per_user constraint to videos (duplicate prevention)
3. Document and standardize watch_sessions schema
4. Update init.sql to match production OR migrate production to match init.sql

**Root Cause:**
Production database was likely:
- Migrated manually without updating init.sql
- Modified through direct SQL commands
- Evolved through multiple deployments with different migration scripts

**Recommendation:**
- Establish single source of truth (either init.sql or production)
- Create migration scripts in `backend/migrations/` directory
- Use Flyway, Liquibase, or similar tool for version-controlled migrations
- Never modify production schema without corresponding init.sql update
