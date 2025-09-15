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

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "chip_uid": "04:E1:5C:32:B9:65:80",
    "label": "Blue Chip",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST `/nfc/chips`
Register a new NFC chip. **Requires authentication.**

**Request Body:**
```json
{
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "label": "Blue Chip"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "chip_uid": "04:E1:5C:32:B9:65:80",
  "label": "Blue Chip",
  "user_id": 1,
  "created_at": "2024-01-14T12:00:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "msg": "Invalid NFC UID format",
      "path": "chip_uid"
    }
  ]
}
```

**Error Response (409 Conflict):**
```json
{
  "message": "NFC chip already registered"
}
```

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