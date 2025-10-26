# Data Model: Kids Mode Gesture Controls

**Feature**: Kids Mode Gesture Controls
**Branch**: `008-kids-mode-gestures`
**Date**: 2025-10-25

## Overview

This document defines the data entities, relationships, and state transitions for the Kids Mode feature. Kids Mode leverages existing entities (profiles, nfc_chips, videos, watch_sessions) with minimal schema changes.

**Key Design Principle**: No new tables required. Kids Mode is a specialized UI layer over existing video playback and session tracking infrastructure.

---

## Entity Relationships

```
┌─────────┐
│  User   │
└────┬────┘
     │
     ├─────────┬───────────┬─────────────┐
     │         │           │             │
┌────▼────┐ ┌─▼──────┐ ┌──▼────────┐ ┌──▼─────┐
│ Profile │ │ Video  │ │ NFC Chip  │ │ Videos │
└────┬────┘ └───┬────┘ └─────┬─────┘ └────────┘
     │          │            │
     │          │       ┌────▼────────────────┐
     │          │       │ Video NFC Mapping   │
     │          │       │ (sequence_order)    │
     │          │       └────┬────────────────┘
     │          │            │
     │          └────────────┼────────┐
     │                       │        │
     └───────────────────────┼────────┤
                             │        │
                      ┌──────▼──────┐ │
                      │Watch Session│ │
                      └─────────────┘ │
                             │        │
                      ┌──────▼────────▼─────┐
                      │ Daily Watch Time    │
                      └─────────────────────┘
```

---

## Core Entities

### 1. Profile (Existing - No Changes)

**Purpose**: Represents a child's profile with watch time limits.

**Schema** (`profiles` table):
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    daily_limit_minutes INTEGER DEFAULT 60,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique profile identifier
- `user_id`: Parent account owning this profile
- `name`: Child's name (e.g., "Ben", "Sarah")
- `avatar_url`: Profile picture URL (optional)
- `daily_limit_minutes`: Maximum watch time per day (default: 60 minutes)
- `deleted_at`: Soft delete timestamp

**Validation Rules** (from spec FR-018, FR-020):
- `daily_limit_minutes` must be between 1 and 1440 (24 hours)
- `name` must be between 1 and 255 characters
- Profile must belong to authenticated user (ownership check)

**Kids Mode Usage**:
- Profile selection screen shows all profiles for logged-in user
- Selected profile determines daily watch limit enforcement
- Watch sessions track which profile is watching

---

### 2. NFC Chip (Existing - No Changes)

**Purpose**: Represents a physical NFC tag registered by a parent.

**Schema** (`nfc_chips` table):
```sql
CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID REFERENCES users(user_uuid)
);
```

**Fields**:
- `id`: Unique chip identifier
- `user_id`: Parent account owning this chip
- `chip_uid`: Normalized NFC chip UID (e.g., "04:5A:B2:C3:D4:E5:F6")
- `label`: Human-readable name (e.g., "Ben's Blue Chip")
- `is_active`: Whether chip is active (soft delete mechanism)

**Validation Rules** (from spec FR-002, FR-003):
- `chip_uid` must be globally unique (UNIQUE constraint)
- `chip_uid` format: Hex characters with optional colons/hyphens
- Normalized format: Uppercase with colons (e.g., "04:5A:B2")
- `label` max 255 characters, alphanumeric + spaces

**Kids Mode Usage**:
- NFC scan in Kids Mode reads `chip_uid`
- Backend validates chip belongs to user's account
- Fetches assigned videos via `video_nfc_mappings`

---

### 3. Video (Existing - No Changes)

**Purpose**: Represents a video in the user's library.

**Schema** (`videos` table):
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
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
    channel_name VARCHAR(255)
);
```

**Fields**:
- `id`: Unique video identifier
- `user_id`: Owner of video
- `platform_id`: References `platforms` table (YouTube, Vimeo, Dailymotion)
- `title`: Video title
- `duration_seconds`: Video length (used for scrubbing calculations)
- `platform_video_id`: Platform-specific ID (e.g., YouTube video ID)

**Kids Mode Usage**:
- Videos assigned to NFC chips via `video_nfc_mappings`
- `duration_seconds` used to calculate scrub position from tilt angle
- `platform_id` + `platform_video_id` used to load correct player

---

### 4. Video NFC Mapping (Existing - Sequence Order Added)

**Purpose**: Links videos to NFC chips with playback sequence.

**Schema** (`video_nfc_mappings` table):
```sql
CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id),
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id),
    profile_id UUID REFERENCES profiles(id),
    sequence_order INTEGER NOT NULL,  -- ADDED in spec 007
    max_watch_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, nfc_chip_id, profile_id),
    UNIQUE(nfc_chip_id, sequence_order)
);
```

**Fields**:
- `video_id`: Video to play
- `nfc_chip_id`: NFC chip this video is assigned to
- `sequence_order`: Playback order (1, 2, 3, ...)
- `profile_id`: Optional profile restriction (nullable)
- `max_watch_time_minutes`: Per-video time limit (optional)

**Validation Rules** (from spec FR-005, FR-006):
- `sequence_order` must be positive integer
- `sequence_order` must be contiguous (1, 2, 3, ...) per chip
- Maximum 50 videos per chip (enforced in application layer)
- UNIQUE constraint on `(nfc_chip_id, sequence_order)` prevents duplicate sequences

**Kids Mode Usage**:
- Query: `SELECT * FROM video_nfc_mappings WHERE nfc_chip_id = ? ORDER BY sequence_order ASC`
- Returns videos in playback order (sequential autoplay)
- Shake gesture moves to next/previous `sequence_order`

---

### 5. Watch Session (Existing - Kids Mode Integration)

**Purpose**: Tracks a single video viewing session.

**Schema** (`watch_sessions` table):
```sql
CREATE TABLE watch_sessions (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    video_id UUID NOT NULL REFERENCES videos(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    stopped_reason VARCHAR(50)
);
```

**Fields**:
- `profile_id`: Which child profile is watching
- `video_id`: Which video is being watched
- `started_at`: Session start timestamp
- `ended_at`: Session end timestamp (NULL = in progress)
- `duration_seconds`: Actual watch time (ended_at - started_at)
- `stopped_reason`: Why session ended (e.g., "limit_reached", "user_exit", "video_completed")

**Validation Rules** (from spec FR-019, FR-020):
- `profile_id` must belong to authenticated user
- `duration_seconds` calculated server-side (never trust client)
- Session must be closed before starting new session for same profile

**Kids Mode Session Lifecycle**:
1. **Start**: `POST /api/sessions/start/public` with profile_id + video_id
2. **Heartbeat**: `POST /api/sessions/:id/heartbeat` every 30-120 seconds
3. **End**: `POST /api/sessions/:id/end` on video completion, swipe exit, or limit reached
4. **Cleanup**: `navigator.sendBeacon('/api/sessions/:id/end')` on component unmount

**Stopped Reasons**:
- `video_completed`: Video finished naturally
- `user_exit`: Swipe gesture to exit fullscreen
- `limit_reached`: Daily watch time limit hit (FR-020)
- `next_video`: Shake gesture to skip to next video
- `previous_video`: Shake gesture to go back
- `network_error`: Playback failed
- `component_unmount`: React component cleanup

---

### 6. Daily Watch Time (Existing - No Changes)

**Purpose**: Aggregates total watch time per profile per day.

**Schema** (`daily_watch_time` table):
```sql
CREATE TABLE daily_watch_time (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    total_minutes INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'UTC',
    UNIQUE(profile_id, date)
);
```

**Fields**:
- `profile_id`: Which child profile
- `date`: Calendar date (YYYY-MM-DD)
- `total_minutes`: Total minutes watched on this date
- `timezone`: User's timezone for midnight reset (FR-021)

**Calculation**:
```sql
-- Backend updates after each watch_session ends
UPDATE daily_watch_time
SET total_minutes = total_minutes + NEW.duration_seconds / 60
WHERE profile_id = NEW.profile_id AND date = CURRENT_DATE;
```

**Kids Mode Usage**:
- Before starting playback: Check if `total_minutes >= profiles.daily_limit_minutes`
- If limit reached: Show friendly message (FR-020), prevent playback
- Display remaining time to profile (optional UX enhancement)

---

## State Machines

### Kids Mode Session State Machine

```
┌─────────────────┐
│  Profile        │
│  Selection      │
└────────┬────────┘
         │
         │ Profile selected
         ▼
┌─────────────────┐
│  NFC Scanning   │◄────────────┐
└────────┬────────┘             │
         │                      │
         │ Chip scanned         │ Swipe exit OR
         ▼                      │ All videos complete
┌─────────────────┐             │
│  Loading        │             │
│  Videos         │             │
└────────┬────────┘             │
         │                      │
         │ Videos loaded        │
         ▼                      │
┌─────────────────┐             │
│  Fullscreen     │             │
│  Playback       │─────────────┘
│  (Active)       │
└────────┬────────┘
         │
         │ Daily limit reached
         ▼
┌─────────────────┐
│  Limit          │
│  Reached        │
│  Message        │
└─────────────────┘
```

**State Descriptions**:

1. **Profile Selection**
   - Input: User lands on `/kids` route
   - Actions: Display profile avatars, detect if only one profile exists
   - Transitions:
     - User taps profile → NFC Scanning
     - Only one profile exists → Auto-select → NFC Scanning

2. **NFC Scanning**
   - Input: Profile selected
   - Actions: Show pulsating scan area, listen for NFC scan
   - Transitions:
     - Valid chip scanned → Loading Videos
     - Invalid chip scanned → Show error, stay in NFC Scanning
     - Swipe gesture → Profile Selection

3. **Loading Videos**
   - Input: Valid chip scanned
   - Actions: `GET /api/nfc/chips/:chipId/videos`, check daily limit
   - Transitions:
     - Videos found + limit OK → Fullscreen Playback
     - Videos found + limit reached → Limit Reached Message
     - No videos found → Show error, return to NFC Scanning
     - Network error → Show error, return to NFC Scanning

4. **Fullscreen Playback (Active)**
   - Input: Videos loaded, limit not reached
   - Actions: Play videos sequentially, listen for gestures, track watch time
   - Sub-states:
     - **Playing**: Video actively playing
     - **Scrubbing**: Tilt gesture active (video paused or slow-mo)
     - **Transitioning**: Moving between videos (shake gesture)
   - Transitions:
     - All videos complete → NFC Scanning
     - Swipe down gesture → NFC Scanning
     - Daily limit reached → Limit Reached Message
     - Network error → Skip to next video OR return to NFC Scanning

5. **Limit Reached Message**
   - Input: Daily watch time limit hit
   - Actions: Show child-friendly message, end session
   - Transitions:
     - 5-second auto-timeout → NFC Scanning
     - Tap anywhere → NFC Scanning

---

### Video Playback State Machine (Within Fullscreen)

```
┌─────────────┐
│   Idle      │
└──────┬──────┘
       │
       │ Video loaded
       ▼
┌─────────────┐     Tilt >15°     ┌─────────────┐
│   Playing   │◄─────────────────►│  Scrubbing  │
└──────┬──────┘     Tilt <15°     └─────────────┘
       │
       │ Shake detected
       ▼
┌─────────────┐
│ Transitioning│
└──────┬──────┘
       │
       │ Next video loaded
       ▼
┌─────────────┐
│   Playing   │
└─────────────┘
```

**State Descriptions**:

1. **Idle**: Video player ready but no video loaded
2. **Playing**: Video actively playing, normal state
3. **Scrubbing**: Tilt gesture detected, seeking through video
4. **Transitioning**: Loading next/previous video after shake gesture

**Gesture Events**:
- **Tilt >15°**: Enter Scrubbing state, pause video
- **Tilt <15°**: Exit Scrubbing state, resume Playing
- **Shake Right**: Load next video (sequence_order + 1)
- **Shake Left**: Load previous video (sequence_order - 1)
- **Swipe Down**: Exit fullscreen, end session

---

## Data Flow Diagrams

### NFC Scan to Video Playback Flow

```
┌──────────┐
│  Child   │
│  Scans   │
│  Chip    │
└─────┬────┘
      │
      │ 1. POST /api/nfc/scan/public
      ▼     { chip_uid: "04:5A:...", profile_id: "uuid" }
┌─────────────────────────────────────────────────┐
│  Backend: Validate chip ownership               │
│  - Query nfc_chips WHERE chip_uid = ?           │
│  - Verify user_id matches authenticated user    │
└─────┬───────────────────────────────────────────┘
      │
      │ 2. GET /api/nfc/chips/:chipId/videos
      ▼
┌─────────────────────────────────────────────────┐
│  Backend: Fetch assigned videos                 │
│  SELECT * FROM video_nfc_mappings                │
│  WHERE nfc_chip_id = ? ORDER BY sequence_order  │
│  JOIN videos ON video_id = videos.id            │
└─────┬───────────────────────────────────────────┘
      │
      │ 3. Check daily watch time
      ▼
┌─────────────────────────────────────────────────┐
│  Backend: Query daily_watch_time                │
│  SELECT total_minutes FROM daily_watch_time      │
│  WHERE profile_id = ? AND date = CURRENT_DATE   │
│  Compare with profiles.daily_limit_minutes      │
└─────┬───────────────────────────────────────────┘
      │
      │ 4. Return videos + remaining time
      ▼     { videos: [...], remaining_minutes: 45 }
┌─────────────────────────────────────────────────┐
│  Frontend: Start video playback                 │
│  - Enter fullscreen mode                        │
│  - Load first video (sequence_order = 1)        │
│  - Start watch session tracking                 │
└─────────────────────────────────────────────────┘
```

---

### Gesture Detection to Video Control Flow

```
┌──────────────────────┐
│  Child Tilts Device  │
└──────────┬───────────┘
           │
           │ DeviceOrientationEvent fires
           ▼
┌──────────────────────────────────────────────┐
│  useDeviceOrientation Hook (Frontend)        │
│  - Read event.beta angle                     │
│  - Calculate tilt direction & intensity      │
│  - Throttle to 60fps (16ms)                  │
└──────────┬───────────────────────────────────┘
           │
           │ Tilt state: { direction: 'forward', intensity: 0.6 }
           ▼
┌──────────────────────────────────────────────┐
│  Video Player Component                      │
│  - Calculate scrub position:                 │
│    newTime = currentTime + (intensity * 2s)  │
│  - Call player.seekTo(newTime)               │
└──────────┬───────────────────────────────────┘
           │
           │ Seek command sent to iframe
           ▼
┌──────────────────────────────────────────────┐
│  YouTube/Vimeo/Dailymotion Player API        │
│  - Update video playback position            │
│  - Render new frame                          │
└──────────────────────────────────────────────┘
```

---

### Watch Time Enforcement Flow

```
┌──────────────────────┐
│  Video Playing       │
│  (Active Session)    │
└──────────┬───────────┘
           │
           │ Heartbeat every 60s
           ▼
┌──────────────────────────────────────────────┐
│  POST /api/sessions/:id/heartbeat            │
│  Backend:                                    │
│  - Calculate elapsed time since last beat    │
│  - Update watch_sessions.duration_seconds    │
│  - Update daily_watch_time.total_minutes     │
└──────────┬───────────────────────────────────┘
           │
           │ Query current daily total
           ▼
┌──────────────────────────────────────────────┐
│  Check limit:                                │
│  total_minutes >= daily_limit_minutes?       │
└──────────┬───────────────────────────────────┘
           │
           ├─ YES: Limit Reached
           │  └─► Return { limitReached: true }
           │       Frontend stops playback
           │
           └─ NO: Continue
               └─► Return { limitReached: false }
                    Frontend continues playback
```

---

## Schema Changes Required

### 1. video_nfc_mappings.sequence_order (ALREADY APPLIED)

**Change**: Added `sequence_order` column in spec 007.

**Migration** (already applied to production):
```sql
ALTER TABLE video_nfc_mappings
ADD COLUMN sequence_order INTEGER NOT NULL DEFAULT 1;

-- Backfill existing rows with sequence based on created_at
WITH numbered_mappings AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY nfc_chip_id ORDER BY created_at) as seq
  FROM video_nfc_mappings
)
UPDATE video_nfc_mappings m
SET sequence_order = nm.seq
FROM numbered_mappings nm
WHERE m.id = nm.id;

-- Add unique constraint
ALTER TABLE video_nfc_mappings
ADD CONSTRAINT unique_chip_sequence UNIQUE(nfc_chip_id, sequence_order);
```

**Status**: ✅ Complete (spec 007)

---

### 2. No Additional Schema Changes Required

**Rationale**:
- ✅ Profiles table already has `daily_limit_minutes`
- ✅ Watch sessions table tracks `profile_id`, `duration_seconds`, `stopped_reason`
- ✅ Daily watch time table aggregates per profile per day
- ✅ NFC chips table has all required fields
- ✅ Video NFC mappings has `sequence_order` for playback order

**Kids Mode is purely a frontend experience** leveraging existing backend infrastructure.

---

## API Data Contracts

### GET /api/nfc/chips/:chipId/videos

**Request**:
```http
GET /api/nfc/chips/550e8400-e29b-41d4-a716-446655440000/videos
Authorization: Bearer <jwt-token>
```

**Response** (200 OK):
```json
{
  "chip": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "chip_uid": "04:5A:B2:C3:D4:E5:F6",
    "label": "Ben's Blue Chip"
  },
  "videos": [
    {
      "id": "video-uuid-1",
      "title": "Paw Patrol Episode 1",
      "platform_id": "youtube",
      "platform_video_id": "abc123",
      "duration_seconds": 1320,
      "thumbnail_url": "https://...",
      "sequence_order": 1
    },
    {
      "id": "video-uuid-2",
      "title": "Bluey - Magic Xylophone",
      "platform_id": "youtube",
      "platform_video_id": "def456",
      "duration_seconds": 420,
      "thumbnail_url": "https://...",
      "sequence_order": 2
    }
  ]
}
```

---

### POST /api/sessions/start/public (Kids Mode)

**Request**:
```http
POST /api/sessions/start/public
Content-Type: application/json

{
  "profile_id": "profile-uuid",
  "video_id": "video-uuid-1",
  "chip_uid": "04:5A:B2:C3:D4:E5:F6"
}
```

**Response** (200 OK):
```json
{
  "session_id": "session-uuid",
  "remaining_minutes": 45,
  "daily_limit_minutes": 60
}
```

**Response** (403 Forbidden - Limit Reached):
```json
{
  "error": "Daily watch time limit reached",
  "total_minutes": 60,
  "daily_limit_minutes": 60,
  "limit_reached": true
}
```

---

### POST /api/sessions/:id/heartbeat

**Request**:
```http
POST /api/sessions/550e8400-e29b-41d4-a716-446655440000/heartbeat
Content-Type: application/json

{
  "current_position_seconds": 145
}
```

**Response** (200 OK):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "elapsed_seconds": 60,
  "remaining_minutes": 44,
  "limit_reached": false
}
```

**Response** (403 Forbidden - Limit Reached During Playback):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "elapsed_seconds": 60,
  "remaining_minutes": 0,
  "limit_reached": true,
  "message": "Daily watch time limit reached. Session will be ended."
}
```

---

### POST /api/sessions/:id/end

**Request**:
```http
POST /api/sessions/550e8400-e29b-41d4-a716-446655440000/end
Content-Type: application/json

{
  "stopped_reason": "video_completed",
  "final_position_seconds": 1320
}
```

**Response** (200 OK):
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_seconds": 1320,
  "stopped_reason": "video_completed",
  "remaining_minutes": 22
}
```

---

## Validation Rules Summary

### Profile
- `daily_limit_minutes`: 1 ≤ value ≤ 1440
- `name`: 1 ≤ length ≤ 255
- Must belong to authenticated user

### NFC Chip
- `chip_uid`: Hex characters (8-20 chars after normalization)
- `chip_uid`: Globally unique (across all users)
- Normalized format: Uppercase with colons
- `label`: Max 255 characters

### Video NFC Mapping
- `sequence_order`: Positive integer (>0)
- `sequence_order`: Contiguous per chip (no gaps: 1,2,3,...)
- Max 50 videos per chip (application layer)
- UNIQUE constraint on (nfc_chip_id, sequence_order)

### Watch Session
- `profile_id`: Must belong to authenticated user
- `duration_seconds`: Calculated server-side (never trust client)
- Cannot start new session if existing session open for same profile
- `stopped_reason`: Enum ('video_completed', 'user_exit', 'limit_reached', ...)

### Daily Watch Time
- `total_minutes`: Sum of all watch_sessions.duration_seconds / 60 for date
- UNIQUE constraint on (profile_id, date)
- Midnight reset based on `timezone` field

---

## Performance Considerations

### Database Indexes

**Existing indexes** (from init.sql):
```sql
CREATE INDEX idx_nfc_chips_user_id ON nfc_chips(user_id);
CREATE INDEX idx_watch_sessions_profile_id ON watch_sessions(profile_id);
CREATE INDEX idx_daily_watch_time_profile_date ON daily_watch_time(profile_id, date);
```

**Query patterns for Kids Mode**:
1. **NFC scan**: `WHERE chip_uid = ?` (UNIQUE index on chip_uid - O(1))
2. **Fetch videos**: `WHERE nfc_chip_id = ? ORDER BY sequence_order` (Add composite index)
3. **Check daily limit**: `WHERE profile_id = ? AND date = CURRENT_DATE` (Existing index)
4. **Heartbeat updates**: `WHERE id = ?` (Primary key - O(1))

**Recommended additional index**:
```sql
CREATE INDEX idx_video_nfc_mappings_chip_sequence
ON video_nfc_mappings(nfc_chip_id, sequence_order);
```

---

### Caching Strategy

**Kids Mode does NOT cache**:
- Watch time limits (always query latest)
- Video sequences (parent may change between scans)
- Session state (real-time tracking critical)

**Kids Mode DOES cache**:
- Video metadata (title, thumbnail) for 5 minutes (client-side)
- Platform IDs (rarely change, cache for 1 hour)
- User profiles list (cache for 1 hour, invalidate on profile create/update)

---

## Security Considerations

### Server-Side Validation

**Critical validations** (per Constitution Principle I):
1. **Chip ownership**: Verify `nfc_chips.user_id = authenticated_user.id`
2. **Profile ownership**: Verify `profiles.user_id = authenticated_user.id`
3. **Video ownership**: Verify `videos.user_id = authenticated_user.id`
4. **Session ownership**: Verify session belongs to authenticated user's profile

**Implementation**:
```javascript
// Backend middleware: src/middleware/validateOwnership.js
async function validateChipOwnership(req, res, next) {
  const chip = await db.query(
    'SELECT user_id FROM nfc_chips WHERE id = $1',
    [req.params.chipId]
  );

  if (chip.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}
```

### Rate Limiting

**Kids Mode endpoints**:
- `/api/sessions/start/public`: 30 requests / 15 minutes
- `/api/sessions/:id/heartbeat`: 100 requests / 10 minutes
- `/api/sessions/:id/end`: 50 requests / 10 minutes

**Rationale**: Prevent session abuse, DoS attacks, and battery drain from excessive heartbeats.

---

## Constitution Compliance Checklist

✅ **Child Safety First** (Principle I):
- Daily watch time limits enforced server-side
- Profile-based tracking prevents sibling quota sharing
- No direct data collection from children (sessions tied to parent account)

✅ **Context-Driven Architecture** (Principle II):
- Kids Mode uses existing React Context (AuthContext, ProfileContext)
- No Redux or external state management

✅ **Test-First Development** (Principle III):
- Data model defined before implementation
- All API contracts specified for test mocking

✅ **Error Resilience** (Principle IV):
- Graceful handling of missing videos (skip to next)
- Network errors return user to scan screen
- Watch session cleanup via sendBeacon ensures data integrity

✅ **Docker-First Development** (Principle V):
- PostgreSQL schema identical in Docker Compose and production
- No host-specific dependencies

✅ **NFC Security & Session Management** (Principle VI):
- Chip UIDs validated server-side
- Heartbeat mechanism with 30-120s intervals
- Session cleanup on unmount via sendBeacon
- Daily limits enforced server-side (tamper-proof)

---

## Summary

**Key Takeaways**:
1. ✅ No new database tables required
2. ✅ Schema changes (sequence_order) already applied
3. ✅ Existing watch session infrastructure supports Kids Mode
4. ✅ Server-side validation ensures child safety
5. ✅ Gesture controls are client-side UX layer over existing APIs

**Implementation Readiness**: Data model is complete and validated against existing schema. Ready for Phase 2 (task generation).
