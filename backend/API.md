# Medio Backend API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- Production: Configure via `REACT_APP_API_URL`

## Authentication
The API uses JWT tokens stored in httpOnly cookies for security. After login/register, the token is automatically included in subsequent requests.

## Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Auth endpoints (login/register): 5 requests per 15 minutes

## Endpoints

### Authentication

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "name": "User Name"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "created_at": "2024-01-14T12:00:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Password must be at least 8 characters long",
      "path": "password",
      "location": "body"
    }
  ]
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt-token"
}
```

#### POST `/auth/login`
Login to an existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "created_at": "2024-01-14T12:00:00Z"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Invalid email or password"
}
```

**Error Response (429 Too Many Requests):**
```json
{
  "message": "Too many login attempts. Please try again later.",
  "retryAfter": 900
}
```

#### POST `/auth/logout`
Logout and clear session.

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### GET `/auth/me`
Get current authenticated user.

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "created_at": "2024-01-14T12:00:00Z"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Access token required"
}
```

### NFC Management

#### GET `/nfc/chips`
Get all NFC chips for authenticated user. **Requires authentication.**

**Rate Limit:** 60 requests per 15 minutes per user

**Headers:**
- `Authorization: Bearer <token>` OR `Cookie: authToken=<token>`

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "chip_uid": "04:5A:B2:C3:D4:E5:F6",
    "label": "Ben's Chip",
    "created_at": "2025-10-19T12:34:56.789Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "chip_uid": "04:7B:C3:D4:E5:F6:08",
    "label": "Lisa's Chip",
    "created_at": "2025-10-19T13:45:12.345Z"
  }
]
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Authentication required"
}
```

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Too many requests",
  "retryAfter": "2025-10-19T12:50:00.000Z"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "message": "Failed to fetch NFC chips"
}
```

---

#### POST `/nfc/chips`
Register a new NFC chip. **Requires authentication and CSRF token.**

**Rate Limit:** 10 requests per 15 minutes per user
**Chip Limit:** Maximum 20 chips per parent account

**Headers:**
- `Authorization: Bearer <token>` OR `Cookie: authToken=<token>`
- `X-CSRF-Token: <csrf-token>` (Required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "chip_uid": "04:5A:B2:C3:D4:E5:F6",
  "label": "Ben's Chip"
}
```

**Field Validation:**
- `chip_uid`:
  - Must be hexadecimal (with or without colons/spaces/hyphens)
  - Length: 4-10 bytes (8-20 hex characters after normalization)
  - Backend normalizes to uppercase with colons (e.g., "04:5A:B2:C3:D4:E5:F6")
  - Examples: "045AB2C3D4E5F6", "04:5A:B2:C3:D4:E5:F6", "04 5A B2 C3 D4 E5 F6"
- `label`:
  - Length: 1-50 characters
  - Allowed: letters, numbers, spaces, hyphens, apostrophes
  - Pattern: `^[a-zA-Z0-9\s\-']+$`

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "chip_uid": "04:5A:B2:C3:D4:E5:F6",
  "label": "Ben's Chip",
  "created_at": "2025-10-19T12:34:56.789Z"
}
```

**Error Response (400 Bad Request - Invalid UID):**
```json
{
  "errors": [
    {
      "msg": "NFC UID must be between 4-10 bytes (8-20 hex characters)",
      "param": "chip_uid",
      "location": "body"
    }
  ]
}
```

**Error Response (400 Bad Request - Invalid Label):**
```json
{
  "errors": [
    {
      "msg": "Label can only contain letters, numbers, spaces, hyphens, and apostrophes",
      "param": "label",
      "location": "body"
    }
  ]
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Authentication required"
}
```

**Error Response (403 Forbidden - Chip Limit Reached):**
```json
{
  "message": "Maximum chip limit reached (20 chips)"
}
```

**Error Response (403 Forbidden - Invalid CSRF Token):**
```json
{
  "message": "Invalid CSRF token"
}
```

**Error Response (409 Conflict - Duplicate UID):**
```json
{
  "message": "NFC chip already registered"
}
```
Note: Identical message returned whether chip is owned by current user or another user (prevents UID enumeration attack).

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Too many chip registration attempts",
  "retryAfter": "2025-10-19T12:50:00.000Z"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "message": "Failed to register NFC chip"
}
```

---

#### DELETE `/nfc/chips/:chipId`
Delete NFC chip and cascade delete associated video mappings. **Requires authentication and CSRF token.**

**Rate Limit:** 20 requests per 15 minutes per user

**Headers:**
- `Authorization: Bearer <token>` OR `Cookie: authToken=<token>`
- `X-CSRF-Token: <csrf-token>` (Required)

**URL Parameters:**
- `chipId` (UUID): ID of the chip to delete

**Response (200 OK):**
```json
{
  "message": "NFC chip deleted successfully"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Authentication required"
}
```

**Error Response (403 Forbidden - Invalid CSRF Token):**
```json
{
  "message": "Invalid CSRF token"
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "NFC chip not found"
}
```
Note: Identical message for "chip doesn't exist" and "chip not owned by user" (prevents ownership enumeration).

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Too many deletion requests",
  "retryAfter": "2025-10-19T12:50:00.000Z"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "message": "Failed to delete NFC chip"
}
```

**Cascade Deletion Behavior:**
Deleting a chip triggers CASCADE deletion of:
- All `video_nfc_mappings` where `nfc_chip_id = chipId`

Database ensures atomicity via foreign key constraint:
```sql
FOREIGN KEY (nfc_chip_id) REFERENCES nfc_chips(id) ON DELETE CASCADE
```

---

#### POST `/nfc/scan/public`
Scan NFC chip (public endpoint for kids mode). **No authentication required.**

**Request Body:**
```json
{
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "profile_id": "uuid (optional)"
}
```

**Response:** `200 OK`
```json
{
  "id": "video-uuid",
  "title": "Video Title",
  "url": "https://example.com/video",
  "max_watch_time_minutes": 30,
  "remaining_minutes": 15
}
```

#### POST `/nfc/scan`
Scan NFC chip (authenticated endpoint with user context). **Requires authentication.**

**Request Body:**
```json
{
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "profile_id": "uuid (optional)"
}
```

#### POST `/nfc/map`
Map a video to an NFC chip. **Requires authentication.**

**Request Body:**
```json
{
  "video_id": "uuid",
  "nfc_chip_id": "uuid",
  "profile_id": "uuid (optional)",
  "max_watch_time_minutes": 30
}
```

### Session Management

#### POST `/sessions/start/public`
Start a watch session (public endpoint for kids mode). **No authentication required.**

**Request Body:**
```json
{
  "video_id": "uuid",
  "profile_id": "uuid (optional)"
}
```

**Response:** `201 Created`
```json
{
  "session_id": "uuid",
  "started_at": "2024-01-01T00:00:00Z",
  "max_watch_time_minutes": 30
}
```

#### POST `/sessions/end/public`
End a watch session (public endpoint). **No authentication required.**

**Request Body:**
```json
{
  "session_id": "uuid",
  "stopped_reason": "manual|time_limit|daily_limit|error"
}
```

#### POST `/sessions/heartbeat/public`
Update session progress (public endpoint). **No authentication required.**

**Request Body:**
```json
{
  "session_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "should_stop": false,
  "stop_reason": null,
  "watched_minutes": 15
}
```

#### POST `/sessions/start`
Start a watch session (authenticated). **Requires authentication.**

#### POST `/sessions/end`
End a watch session (authenticated). **Requires authentication.**

#### POST `/sessions/heartbeat`
Update session progress (authenticated). **Requires authentication.**

### Profile Management

#### GET `/profiles`
Get all profiles for authenticated user. **Requires authentication.**

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Child Name",
    "age": 8,
    "avatar_url": "https://example.com/avatar.jpg",
    "daily_limit_minutes": 60,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST `/profiles`
Create a new child profile. **Requires authentication.**

**Request Body:**
```json
{
  "name": "Child Name",
  "age": 8,
  "avatar_url": "https://example.com/avatar.jpg",
  "daily_limit_minutes": 60
}
```

#### PUT `/profiles/:id`
Update a child profile. **Requires authentication.**

#### DELETE `/profiles/:id`
Delete a child profile. **Requires authentication.**

### Video Management

#### GET `/videos`
Get all videos for authenticated user. **Requires authentication.**

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Video Title",
    "url": "https://example.com/video",
    "thumbnail_url": "https://example.com/thumb.jpg",
    "description": "Video description",
    "platform_name": "YouTube",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST `/videos`
Add a new video. **Requires authentication.**

**Request Body:**
```json
{
  "title": "Video Title",
  "url": "https://example.com/video",
  "thumbnail_url": "https://example.com/thumb.jpg",
  "description": "Video description",
  "platform_id": "uuid (optional)"
}
```

#### PUT `/videos/:id`
Update a video. **Requires authentication.**

#### DELETE `/videos/:id`
Delete a video. **Requires authentication.**

## Error Responses

### 400 Bad Request
Invalid request parameters or validation errors.

```json
{
  "errors": [
    {
      "msg": "Invalid email format",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized
Authentication required or invalid credentials.

```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden
Access denied to resource.

```json
{
  "message": "Access denied"
}
```

### 404 Not Found
Resource not found.

```json
{
  "message": "Resource not found"
}
```

### 409 Conflict
Resource already exists.

```json
{
  "message": "Resource already exists"
}
```

### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
Server error occurred.

```json
{
  "message": "Internal server error"
}
```

## Security Notes

1. **JWT Tokens**: Stored in httpOnly cookies, not accessible via JavaScript
2. **CORS**: Configured to accept requests only from authorized frontend URL
3. **Rate Limiting**: Prevents brute force attacks on auth endpoints
4. **Input Validation**: All inputs are validated and sanitized
5. **SQL Injection**: All queries use parameterized statements
6. **Password Security**: Passwords hashed with bcrypt (10 rounds)
7. **HTTPS**: Always use HTTPS in production
8. **Environment Variables**: Never commit secrets to version control