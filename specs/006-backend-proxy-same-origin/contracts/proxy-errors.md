# API Contract: Proxy Error Responses

**Feature**: 006-backend-proxy-same-origin
**Date**: 2025-10-21

## Overview

This contract documents error responses from the BFF proxy layer when backend services are unavailable or requests fail.

## Error Response Format

### 502 Bad Gateway - Backend Unreachable

**Trigger**: Backend service is down or network connection fails
**HTTP Status**: 502
**Response Body**:
```json
{
  "error": "Service temporarily unavailable",
  "message": "The backend service is currently unreachable. Please try again later."
}
```

**Example Scenarios**:
- Backend server not running (development)
- Backend deployment in progress (production)
- Network partition between frontend and backend
- DNS resolution failure for `BACKEND_URL`

**Frontend Handling**:
- Display user-friendly error message (not technical details)
- Retry with exponential backoff for transient failures
- Log to Sentry with proxy error context

---

### 504 Gateway Timeout - Backend Timeout

**Trigger**: Backend request exceeds timeout threshold (30 seconds default)
**HTTP Status**: 504
**Response Body**:
```json
{
  "error": "Request timeout",
  "message": "The request took too long to process. Please try again."
}
```

**Example Scenarios**:
- Slow database query on backend
- Backend processing video metadata from slow external API
- Backend overloaded with concurrent requests

**Frontend Handling**:
- Same as 502 (retry logic)
- Consider longer timeout for known slow operations (e.g., video upload)

---

## Success Path (No Proxy Errors)

When backend is reachable, proxy transparently forwards:

**Request Flow**:
```
Browser → GET /api/videos
  ↓ (proxy forwards to)
Backend → GET https://medio-backend.fly.dev/api/videos
  ↓ (backend responds)
Backend → 200 OK + JSON payload
  ↓ (proxy forwards to)
Browser → 200 OK + JSON payload
```

**Key Properties**:
- Status code preserved (200, 401, 404, 500, etc.)
- Response headers preserved (Content-Type, Set-Cookie, etc.)
- Request headers forwarded (Authorization if present, Cookie, etc.)
- Request body forwarded for POST/PUT/PATCH

---

## Authentication Errors (Pass-Through)

Proxy does NOT intercept authentication errors. These are returned directly from backend:

### 401 Unauthorized
**Source**: Backend authentication middleware
**Cause**: No valid session cookie or expired access token
**Response**: Backend-defined format (unchanged)

### 403 Forbidden
**Source**: Backend authorization middleware
**Cause**: Valid session but insufficient permissions
**Response**: Backend-defined format (unchanged)

---

## Proxy Logging

All proxy errors are logged to console with context:

```javascript
console.error('[PROXY ERROR]', {
  url: req.url,
  method: req.method,
  backend: BACKEND_URL,
  error: err.message,
  timestamp: new Date().toISOString()
});
```

**Sentry Integration** (Future):
- Add Sentry.captureException() for 502/504 errors
- Include proxy context in error metadata
- Track backend downtime metrics

---

## Testing Requirements

### Unit Tests (server.js)
- Mock backend down → verify 502 response format
- Mock backend timeout → verify 504 response format
- Mock backend success → verify pass-through works

### Integration Tests
- Start proxy, stop backend → verify 502 error
- Make API call with slow backend → verify timeout handling

### E2E Tests
- Simulate backend failure → verify user sees friendly error message
- Verify retry succeeds after backend recovers
