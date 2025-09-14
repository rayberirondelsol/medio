# Medio Platform API Documentation v2

## Table of Contents
- [Base URL & Versioning](#base-url--versioning)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Videos](#video-endpoints)
  - [NFC Management](#nfc-endpoints)
  - [Profiles](#profile-endpoints)
  - [Sessions](#session-endpoints)
  - [Health Check](#health-check)

## Base URL & Versioning

The API supports versioning for backward compatibility:

- **Current Version**: `/api/v1`
- **Legacy Support**: `/api` (maps to v1)
- **Base URL**: `https://api.medio.com`

### Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
X-API-Version: v1
```

## Authentication

The API uses JWT tokens stored in httpOnly cookies for security. Tokens include a unique JTI (JWT ID) for revocation support.

### Token Format
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "jti": "unique-token-id",
  "iat": 1642329600,
  "exp": 1642934400,
  "iss": "medio-platform",
  "aud": "medio-users"
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **Public endpoints**: 10 requests per minute
- **General API**: 100 requests per 15 minutes

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642330200
```

## Error Responses

### Standard Error Format
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Request successful, no content
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Token revoked or insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `416 Range Not Satisfiable` - Invalid range for video streaming
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/register
Create a new parent account.

**Request:**
```json
{
  "email": "parent@example.com",
  "password": "SecureP@ssw0rd123!",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "parent@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:**
```http
Set-Cookie: authToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

#### POST /api/v1/auth/login
Authenticate existing user.

**Request:**
```json
{
  "email": "parent@example.com",
  "password": "SecureP@ssw0rd123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "parent@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/v1/auth/logout
Invalidate current session and blacklist token.

**Request:**
```http
POST /api/v1/auth/logout
Cookie: authToken=<token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Note**: Token is added to blacklist with JTI to prevent reuse.

### Video Endpoints

#### GET /api/v1/videos
Get paginated list of user's videos.

**Request:**
```http
GET /api/v1/videos?page=1&limit=20&search=educational
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `search` (string, optional)
- `platform_id` (uuid, optional)

**Response (200 OK):**
```json
{
  "videos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Learn Colors and Shapes",
      "description": "Educational content for preschoolers",
      "url": "https://storage.medio.com/videos/learn-colors.mp4",
      "thumbnail_url": "https://storage.medio.com/thumbs/learn-colors.jpg",
      "platform_id": "youtube",
      "platform_video_id": "dQw4w9WgXcQ",
      "duration_seconds": 180,
      "age_rating": "G",
      "created_at": "2024-01-14T10:00:00Z",
      "updated_at": "2024-01-14T10:00:00Z"
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

#### GET /api/v1/videos/:id/stream
Stream video with range request support.

**Request:**
```http
GET /api/v1/videos/550e8400-e29b-41d4-a716-446655440001/stream
Range: bytes=0-1023
Authorization: Bearer <token>
```

**Response (206 Partial Content):**
```http
HTTP/1.1 206 Partial Content
Content-Type: video/mp4
Content-Length: 1024
Content-Range: bytes 0-1023/10485760
Accept-Ranges: bytes

[Binary video data]
```

**Supported Range Formats:**
- `bytes=0-1023` - First 1024 bytes
- `bytes=1024-` - From byte 1024 to end
- `bytes=-1024` - Last 1024 bytes

### NFC Endpoints

#### POST /api/v1/nfc/register
Register a new NFC chip.

**Request:**
```json
{
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "label": "Living Room Chip"
}
```

**UID Formats Accepted:**
- With colons: `04:E1:5C:32:B9:65:80`
- With dashes: `04-e1-5c-32-b9-65-80`
- Continuous: `04e15c32b96580`

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "label": "Living Room Chip",
  "is_active": true,
  "created_at": "2024-01-14T10:00:00Z"
}
```

#### POST /api/v1/nfc/scan/public
Scan NFC chip (public endpoint for kids mode).

**Request:**
```json
{
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "profile_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

**Response (200 OK):**
```json
{
  "video": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Learn Colors and Shapes",
    "thumbnail_url": "https://storage.medio.com/thumbs/learn-colors.jpg",
    "platform_id": "youtube",
    "platform_video_id": "dQw4w9WgXcQ"
  },
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Timmy",
    "daily_limit_minutes": 60
  },
  "maxWatchTime": 30
}
```

#### POST /api/v1/nfc/map
Map video to NFC chip.

**Request:**
```json
{
  "video_id": "550e8400-e29b-41d4-a716-446655440001",
  "nfc_chip_id": "550e8400-e29b-41d4-a716-446655440002",
  "profile_id": "550e8400-e29b-41d4-a716-446655440003",
  "max_watch_time_minutes": 30
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "video_id": "550e8400-e29b-41d4-a716-446655440001",
  "nfc_chip_id": "550e8400-e29b-41d4-a716-446655440002",
  "profile_id": "550e8400-e29b-41d4-a716-446655440003",
  "max_watch_time_minutes": 30,
  "is_active": true,
  "created_at": "2024-01-14T10:00:00Z"
}
```

### Profile Endpoints

#### GET /api/v1/profiles
Get all profiles for authenticated user.

**Request:**
```http
GET /api/v1/profiles?page=1&limit=10
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "profiles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Timmy",
      "avatar_url": "https://storage.medio.com/avatars/timmy.png",
      "daily_limit_minutes": 60,
      "deleted_at": null,
      "created_at": "2024-01-14T10:00:00Z",
      "updated_at": "2024-01-14T10:00:00Z"
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

#### POST /api/v1/profiles
Create a new child profile.

**Request:**
```json
{
  "name": "Timmy",
  "avatar_url": "https://storage.medio.com/avatars/timmy.png",
  "daily_limit_minutes": 60
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Timmy",
  "avatar_url": "https://storage.medio.com/avatars/timmy.png",
  "daily_limit_minutes": 60,
  "created_at": "2024-01-14T10:00:00Z",
  "updated_at": "2024-01-14T10:00:00Z"
}
```

#### DELETE /api/v1/profiles/:id
Soft delete a profile (GDPR compliant).

**Request:**
```http
DELETE /api/v1/profiles/550e8400-e29b-41d4-a716-446655440003
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Profile soft deleted successfully",
  "deleted_at": "2024-01-14T10:00:00Z"
}
```

### Session Endpoints

#### POST /api/v1/sessions/start/public
Start a watch session (public endpoint).

**Request:**
```json
{
  "profile_id": "550e8400-e29b-41d4-a716-446655440003",
  "video_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440005",
  "started_at": "2024-01-14T10:00:00Z",
  "daily_limit_remaining_minutes": 45,
  "max_session_minutes": 30
}
```

#### POST /api/v1/sessions/heartbeat/public
Update session heartbeat (public endpoint).

**Request:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440005"
}
```

**Response (200 OK):**
```json
{
  "continue": true,
  "remaining_minutes": 28,
  "message": "Session active"
}
```

**Response when limit reached (200 OK):**
```json
{
  "continue": false,
  "remaining_minutes": 0,
  "message": "Daily limit reached"
}
```

#### POST /api/v1/sessions/end/public
End a watch session (public endpoint).

**Request:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440005",
  "reason": "manual"
}
```

**Reason values:**
- `manual` - User stopped
- `time_limit` - Session limit reached
- `daily_limit` - Daily limit reached
- `error` - Error occurred

**Response (200 OK):**
```json
{
  "duration_seconds": 1200,
  "stopped_reason": "manual",
  "ended_at": "2024-01-14T10:20:00Z"
}
```

#### GET /api/v1/sessions/stats/:profileId
Get watch statistics for a profile.

**Request:**
```http
GET /api/v1/sessions/stats/550e8400-e29b-41d4-a716-446655440003?timezone=America/New_York
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "today": {
    "total_minutes": 45,
    "limit_minutes": 60,
    "remaining_minutes": 15,
    "sessions_count": 3
  },
  "week": {
    "total_minutes": 210,
    "average_daily_minutes": 30,
    "most_watched_video": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Learn Colors and Shapes",
      "watch_count": 5
    }
  },
  "month": {
    "total_minutes": 850,
    "average_daily_minutes": 28,
    "days_active": 25
  }
}
```

### Health Check

#### GET /api/v1/health
Get service health status.

**Request:**
```http
GET /api/v1/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-14T10:00:00Z",
  "uptime": 86400,
  "environment": "production",
  "services": {
    "database": "healthy",
    "sentry": "configured"
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-14T10:00:00Z",
  "uptime": 86400,
  "environment": "production",
  "services": {
    "database": "unhealthy",
    "sentry": "configured"
  }
}
```

## WebSocket Events (Future Enhancement)

### Session Updates
```json
{
  "event": "session_update",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440005",
    "remaining_minutes": 15,
    "status": "active"
  }
}
```

### Limit Reached
```json
{
  "event": "limit_reached",
  "data": {
    "profile_id": "550e8400-e29b-41d4-a716-446655440003",
    "type": "daily",
    "message": "Daily watch limit reached"
  }
}
```

## CSRF Protection

All state-changing operations require a CSRF token.

### Get CSRF Token
```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "IronManLovesYou3000"
}
```

### Using CSRF Token
Include in request header:
```http
X-CSRF-Token: IronManLovesYou3000
```

## Database Schema

### Soft Delete Support
Tables support soft deletes for GDPR compliance:
- `users.deleted_at` - Timestamp of deletion
- `users.deleted_by` - User who performed deletion
- `profiles.deleted_at` - Timestamp of deletion

### Token Blacklist
```sql
CREATE TABLE token_blacklist (
  id UUID PRIMARY KEY,
  token_jti VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);
```

### Timezone Support
Daily watch time tracking includes timezone:
```sql
CREATE TABLE daily_watch_time (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL,
  date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  timezone VARCHAR(50) DEFAULT 'UTC',
  UNIQUE(profile_id, date)
);
```

## Migration Guide

### From Legacy to v1 API
1. Update base URL from `/api` to `/api/v1`
2. Token storage moved to httpOnly cookies
3. Password requirements strengthened
4. NFC UID format normalized to uppercase with colons
5. Soft delete support added for GDPR compliance

## Security Considerations

1. **Nonce-based CSP**: Content Security Policy uses dynamic nonces
2. **Token Blacklisting**: JWTs can be revoked via blacklist
3. **Rate Limiting**: Prevents brute force and DoS attacks
4. **CSRF Protection**: Required for state-changing operations
5. **Secure Cookies**: httpOnly, Secure, SameSite=Strict
6. **Database Retry Logic**: Automatic retry with exponential backoff
7. **Soft Deletes**: GDPR-compliant data deletion

## Support

For API issues or questions, contact: api-support@medio.com