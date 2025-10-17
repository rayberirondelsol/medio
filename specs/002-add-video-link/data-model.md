# Data Model: Add Video via Link

**Date**: 2025-10-17
**Feature**: Add Video via Link
**Phase**: 1 (Design & Contracts)

## Entity Definitions

### 1. Video (Existing - Modifications Required)

**Purpose**: Represents a video in a family's library

**Attributes**:
- `id` (UUID, primary key) - Unique identifier for the video
- `family_id` (UUID, foreign key → families.id) - Owner family
- `platform_id` (UUID, foreign key → platforms.id) - **CRITICAL**: Must accept UUID, not string
- `video_id` (VARCHAR(255)) - Platform-specific video identifier (e.g., YouTube "dQw4w9WgXcQ")
- `video_url` (TEXT) - Original URL pasted by user
- `title` (VARCHAR(500)) - Video title (auto-fetched or manually entered)
- `description` (TEXT, nullable) - Video description
- `thumbnail_url` (TEXT, nullable) - URL to video thumbnail image
- `duration` (INTEGER, nullable) - Duration in seconds
- `age_rating` (ENUM: 'G', 'PG', 'PG-13', 'R') - Parent-assigned age rating
- `channel_name` (VARCHAR(255), nullable) - Content creator/channel name
- `added_by` (UUID, foreign key → users.id) - User who added the video
- `added_date` (TIMESTAMP) - When video was added
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships**:
- Belongs to one `Family` (many-to-one)
- Belongs to one `Platform` (many-to-one)
- Has many `WatchSessions` (one-to-many)
- Added by one `User` (many-to-one)

**Validation Rules** (from FR requirements):
- `platform_id` MUST be a valid UUID (not string) - **BUG FIX**
- `video_id` MUST be non-empty
- `video_url` MUST be valid URL format
- `title` MUST be non-empty (max 500 chars)
- `age_rating` MUST be one of: G, PG, PG-13, R
- `thumbnail_url` MUST be valid URL if provided
- `duration` MUST be positive integer if provided

**Constraints**:
- UNIQUE constraint on (`family_id`, `video_url`) to prevent duplicate URLs per family (FR-023)
- Index on `family_id` for fast lookup
- Index on `platform_id` for filtering by platform

**State Transitions**: None (videos are static once added; updates are simple CRUD)

---

### 2. Platform (Existing - No Modifications)

**Purpose**: Represents a video hosting platform

**Attributes**:
- `id` (UUID, primary key) - Unique identifier
- `name` (VARCHAR(100), unique) - Platform name (e.g., "youtube", "vimeo", "dailymotion")
- `requires_auth` (BOOLEAN) - Whether platform requires user authentication
- `base_url` (VARCHAR(255)) - Platform base URL (e.g., "https://youtube.com")
- `created_at` (TIMESTAMP) - Record creation timestamp

**Relationships**:
- Has many `Videos` (one-to-many)

**Validation Rules**:
- `name` MUST be unique
- `name` MUST be lowercase for consistency
- `base_url` MUST be valid URL

**Existing Records** (expected):
```sql
INSERT INTO platforms (id, name, requires_auth, base_url) VALUES
  (gen_random_uuid(), 'youtube', false, 'https://www.youtube.com'),
  (gen_random_uuid(), 'vimeo', false, 'https://vimeo.com'),
  (gen_random_uuid(), 'dailymotion', false, 'https://www.dailymotion.com'),
  (gen_random_uuid(), 'netflix', true, 'https://www.netflix.com'),
  (gen_random_uuid(), 'disney_plus', true, 'https://www.disneyplus.com');
```

---

### 3. Family (Existing - No Modifications)

**Purpose**: Represents a family group that owns a video library

**Attributes**:
- `id` (UUID, primary key) - Unique identifier
- `name` (VARCHAR(255)) - Family name
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships**:
- Has many `Videos` (one-to-many)
- Has many `Users` (one-to-many)
- Has many `Profiles` (one-to-many, for children)
- Has many `NfcChips` (one-to-many)

**Validation Rules**:
- `name` MUST be non-empty

---

### 4. User (Existing - No Modifications)

**Purpose**: Represents a parent/administrator user

**Attributes**:
- `id` (UUID, primary key) - Unique identifier
- `email` (VARCHAR(255), unique) - User email
- `password_hash` (VARCHAR(255)) - Hashed password
- `family_id` (UUID, foreign key → families.id) - Family membership
- `role` (ENUM: 'parent', 'admin') - User role
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Relationships**:
- Belongs to one `Family` (many-to-one)
- Has added many `Videos` (one-to-many via videos.added_by)

---

## Database Schema Changes

### Required Modifications

#### 1. Fix videos table platform_id validation

**Current Issue**: Backend validation expects string, but database column is UUID

**Fix**: Update backend validation to accept UUID and map platform names to UUIDs

```sql
-- No schema change needed - column is already UUID type
-- Fix is in application layer validation
```

#### 2. Add unique constraint for duplicate detection

**Requirement**: FR-023 - prevent duplicate video URLs per family

```sql
-- Migration: Add unique constraint on (family_id, video_url)
ALTER TABLE videos
ADD CONSTRAINT unique_video_url_per_family
UNIQUE (family_id, video_url);
```

**Rationale**: Ensures database-level enforcement of duplicate prevention. Application should catch duplicate error and show user-friendly message (FR-024).

#### 3. Add indexes for performance

**Requirement**: Fast lookups for video listing and platform filtering

```sql
-- Index on family_id for video listing (if not exists)
CREATE INDEX IF NOT EXISTS idx_videos_family_id ON videos(family_id);

-- Index on platform_id for filtering by platform
CREATE INDEX IF NOT EXISTS idx_videos_platform_id ON videos(platform_id);

-- Index on added_date for sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_videos_added_date ON videos(added_date DESC);
```

---

## API Data Transfer Objects (DTOs)

### Request DTOs

#### POST /api/videos - Create Video

```typescript
interface CreateVideoRequest {
  platform_id: string;      // UUID as string
  video_id: string;         // Platform-specific ID
  video_url: string;        // Original URL
  title: string;            // Max 500 chars
  description?: string;     // Optional
  thumbnail_url?: string;   // Optional
  duration?: number;        // Seconds, optional
  age_rating: 'G' | 'PG' | 'PG-13' | 'R';
  channel_name?: string;    // Optional
}
```

**Validation**:
- All fields validated server-side (FR-031)
- `platform_id` must be valid UUID and exist in platforms table
- `video_url` must be valid URL format
- `title` must be 1-500 characters
- `age_rating` must be one of allowed values

#### GET /api/videos/metadata - Fetch Video Metadata

```typescript
interface FetchMetadataRequest {
  platform: 'youtube' | 'vimeo' | 'dailymotion';
  videoId: string;
}
```

**Query Parameters**:
- `platform` (required) - Platform name
- `videoId` (required) - Platform-specific video ID

### Response DTOs

#### POST /api/videos - Create Video Response

```typescript
interface CreateVideoResponse {
  success: true;
  video: {
    id: string;              // UUID
    platform_id: string;     // UUID
    video_id: string;
    video_url: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    age_rating: 'G' | 'PG' | 'PG-13' | 'R';
    channel_name: string | null;
    added_date: string;      // ISO 8601 timestamp
  };
}
```

**Error Response**:
```typescript
interface CreateVideoError {
  success: false;
  error: string;             // User-friendly message
  code: 'DUPLICATE_URL' | 'INVALID_PLATFORM' | 'VALIDATION_ERROR' | 'SERVER_ERROR';
  details?: Record<string, string[]>;  // Field-specific errors
}
```

#### GET /api/platforms - List Platforms Response

```typescript
interface PlatformsResponse {
  platforms: Array<{
    id: string;              // UUID
    name: string;            // e.g., "youtube"
    requiresAuth: boolean;
  }>;
}
```

#### GET /api/videos/metadata - Fetch Metadata Response

```typescript
interface MetadataResponse {
  success: true;
  metadata: {
    title: string;
    description: string;
    thumbnailUrl: string;
    duration: number;        // Seconds
    channelName: string;
  };
}
```

**Error Response**:
```typescript
interface MetadataError {
  success: false;
  error: string;
  code: 'VIDEO_NOT_FOUND' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'API_ERROR' | 'PRIVATE_VIDEO';
}
```

---

## Frontend State Model

### AddVideoModal Component State

```typescript
interface AddVideoModalState {
  // Form fields
  videoUrl: string;
  title: string;
  description: string;
  platformId: string;        // UUID, not name
  platformName: string;      // Display name
  videoId: string;           // Extracted from URL
  ageRating: 'G' | 'PG' | 'PG-13' | 'R' | '';
  thumbnailUrl: string;
  duration: number | null;
  channelName: string;

  // UI state
  loading: boolean;
  error: string | null;
  showDuplicateWarning: boolean;
  metadataFetched: boolean;

  // Reference data
  platforms: Platform[];     // Fetched from GET /api/platforms
}
```

**State Transitions**:
1. **Initial**: Form empty, platforms loading
2. **URL Pasted**: Validate → Parse → Detect platform → Fetch metadata
3. **Metadata Fetched**: Auto-fill title, description, thumbnail, duration
4. **Metadata Failed**: Show error, allow manual entry
5. **Saving**: Validate all fields → POST /api/videos
6. **Duplicate Detected**: Show warning modal, allow confirm
7. **Success**: Close modal, refresh video list
8. **Error**: Display error message, keep form open

---

## Summary

### Modified Entities
- ✅ **Video**: Added unique constraint for duplicate detection, confirmed UUID validation fix

### New Tables
- ❌ None required - all tables exist

### Key Validations
1. Platform ID must be UUID (backend validation fix)
2. Video URL must be unique per family (database constraint)
3. All required fields validated server-side (FR-031)
4. Age rating must be parent-assigned (FR-026 to FR-028)

### Database Migrations Required
1. Add unique constraint: `UNIQUE (family_id, video_url)`
2. Add performance indexes on family_id, platform_id, added_date

**Ready to proceed to contracts/ generation.**
