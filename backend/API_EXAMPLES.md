# Medio API Request/Response Examples

## Videos API

### GET /api/videos
Get paginated list of videos.

**Request:**
```http
GET /api/videos?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "videos": [
    {
      "id": 1,
      "title": "Educational Video 1",
      "description": "Learn about nature",
      "url": "https://example.com/video1.mp4",
      "thumbnail_url": "https://example.com/thumb1.jpg",
      "duration": 600,
      "user_id": 1,
      "created_at": "2024-01-14T10:00:00Z"
    },
    {
      "id": 2,
      "title": "Fun Cartoon Episode",
      "description": "Adventures in the forest",
      "url": "https://example.com/video2.mp4",
      "thumbnail_url": "https://example.com/thumb2.jpg",
      "duration": 1200,
      "user_id": 1,
      "created_at": "2024-01-14T09:00:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "totalCount": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### POST /api/videos
Create a new video entry.

**Request:**
```http
POST /api/videos
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "New Educational Video",
  "description": "Learn about space",
  "url": "https://example.com/space.mp4",
  "thumbnail_url": "https://example.com/space-thumb.jpg",
  "duration": 900
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "title": "New Educational Video",
  "description": "Learn about space",
  "url": "https://example.com/space.mp4",
  "thumbnail_url": "https://example.com/space-thumb.jpg",
  "duration": 900,
  "user_id": 1,
  "created_at": "2024-01-14T12:00:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Title is required",
      "path": "title",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Invalid URL format",
      "path": "url",
      "location": "body"
    }
  ]
}
```

### GET /api/videos/:id/stream
Stream video with range request support.

**Request:**
```http
GET /api/videos/1/stream
Range: bytes=0-1048575
Authorization: Bearer <token>
```

**Response (206 Partial Content):**
```http
HTTP/1.1 206 Partial Content
Content-Type: video/mp4
Content-Range: bytes 0-1048575/52428800
Accept-Ranges: bytes
Content-Length: 1048576

[Binary video data]
```

## Profiles API

### GET /api/profiles
Get all profiles for authenticated user.

**Request:**
```http
GET /api/profiles?page=1&limit=10
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "profiles": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Timmy",
      "age": 8,
      "avatar_url": "https://example.com/avatar1.jpg",
      "daily_limit_minutes": 60,
      "created_at": "2024-01-10T08:00:00Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "name": "Sarah",
      "age": 10,
      "avatar_url": "https://example.com/avatar2.jpg",
      "daily_limit_minutes": 90,
      "created_at": "2024-01-10T08:30:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "totalCount": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### POST /api/profiles
Create a new child profile.

**Request:**
```http
POST /api/profiles
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Bobby",
  "age": 7,
  "avatar_url": "https://example.com/bobby.jpg",
  "daily_limit_minutes": 45
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "user_id": 1,
  "name": "Bobby",
  "age": 7,
  "avatar_url": "https://example.com/bobby.jpg",
  "daily_limit_minutes": 45,
  "created_at": "2024-01-14T12:00:00Z"
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Name must be between 2 and 50 characters",
      "path": "name",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Age must be between 1 and 17",
      "path": "age",
      "location": "body"
    }
  ]
}
```

### GET /api/profiles/:id/stats
Get watch statistics for a profile.

**Request:**
```http
GET /api/profiles/1/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "profile_id": 1,
  "total_watch_time_minutes": 3600,
  "videos_watched": 45,
  "average_session_minutes": 30,
  "today_watch_time_minutes": 35,
  "daily_limit_minutes": 60,
  "daily_limit_remaining_minutes": 25,
  "weekly_stats": {
    "monday": 45,
    "tuesday": 60,
    "wednesday": 30,
    "thursday": 55,
    "friday": 40,
    "saturday": 90,
    "sunday": 85
  },
  "favorite_videos": [
    {
      "video_id": 1,
      "title": "Educational Video 1",
      "watch_count": 12,
      "total_minutes": 120
    }
  ]
}
```

## Sessions API

### POST /api/sessions/start
Start a new watch session.

**Request:**
```http
POST /api/sessions/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "profile_id": 1,
  "video_id": 5
}
```

**Response (201 Created):**
```json
{
  "session_id": 123,
  "profile_id": 1,
  "video_id": 5,
  "started_at": "2024-01-14T14:30:00Z",
  "daily_limit_minutes": 60,
  "watched_today_minutes": 30,
  "remaining_minutes": 30
}
```

**Daily Limit Exceeded Response (403 Forbidden):**
```json
{
  "message": "Daily watch limit exceeded",
  "limit_minutes": 60,
  "watched_minutes": 65,
  "profile_name": "Timmy"
}
```

### POST /api/sessions/:id/end
End an active watch session.

**Request:**
```http
POST /api/sessions/123/end
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "session_id": 123,
  "duration_minutes": 15.5,
  "ended_at": "2024-01-14T14:45:30Z"
}
```

### POST /api/sessions/:id/heartbeat
Send heartbeat to keep session active.

**Request:**
```http
POST /api/sessions/123/heartbeat
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": "active",
  "session_id": 123,
  "last_heartbeat": "2024-01-14T14:35:00Z"
}
```

### POST /api/sessions/start/public
Start session without authentication (kids mode).

**Request:**
```http
POST /api/sessions/start/public
Content-Type: application/json

{
  "profile_id": 1,
  "video_id": 5
}
```

**Response (201 Created):**
```json
{
  "session_id": 124,
  "remaining_minutes": 30
}
```

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "status": 400,
    "timestamp": "2024-01-14T12:00:00Z",
    "requestId": "req_123abc"
  }
}
```

## Rate Limiting Headers

When rate limited, responses include:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705239600
Retry-After: 900

{
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

## CSRF Token

For state-changing operations, include CSRF token:

```http
GET /api/csrf-token

Response:
{
  "csrfToken": "abc123..."
}
```

Then include in requests:
```http
POST /api/videos
X-CSRF-Token: abc123...
```

## File Upload

### Upload video with thumbnail

**Request:**
```http
POST /api/videos/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

------WebKitFormBoundary
Content-Disposition: form-data; name="video"; filename="video.mp4"
Content-Type: video/mp4

[Binary video data]
------WebKitFormBoundary
Content-Disposition: form-data; name="thumbnail"; filename="thumb.jpg"
Content-Type: image/jpeg

[Binary image data]
------WebKitFormBoundary
Content-Disposition: form-data; name="title"

My Video Title
------WebKitFormBoundary
Content-Disposition: form-data; name="duration"

600
------WebKitFormBoundary--
```

**Response (201 Created):**
```json
{
  "id": 10,
  "title": "My Video Title",
  "file_path": "/uploads/videos/video-1705239600-abc123.mp4",
  "thumbnail_path": "/uploads/thumbnails/thumb-1705239600-xyz789.jpg",
  "duration": 600,
  "size": 52428800,
  "mime_type": "video/mp4",
  "created_at": "2024-01-14T12:00:00Z"
}
```

**File Too Large Response (413 Payload Too Large):**
```json
{
  "message": "File too large. Maximum size allowed is 500MB",
  "field": "video",
  "code": "FILE_TOO_LARGE"
}
```