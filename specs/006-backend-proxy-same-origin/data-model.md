# Data Model: Same-Origin Authentication

**Feature**: 006-backend-proxy-same-origin
**Date**: 2025-10-21

## Overview

This feature does not introduce new data entities. It operates at the HTTP transport layer, proxying requests between frontend and backend without modifying request/response payloads.

## Existing Entities (Referenced)

### User Session

**Source**: Backend authentication system (`backend/src/routes/auth.js`)
**Storage**: httpOnly cookies (`authToken`, `refreshToken`)

**Fields**:
- `authToken` (string): Short-lived JWT access token (15 minutes)
- `refreshToken` (string): Long-lived JWT refresh token (7 days)
- User claims embedded in JWT: `id`, `email`, `name`

**Cookie Attributes** (Updated by this feature):
```javascript
{
  httpOnly: true,        // NO CHANGE (prevents XSS)
  secure: true,          // NO CHANGE (HTTPS only in production)
  sameSite: 'lax',       // CHANGED from 'none' (same-origin now)
  maxAge: 15 * 60 * 1000, // NO CHANGE (15 minutes for access token)
  path: '/'              // NO CHANGE (site-wide)
}
```

**Rationale for SameSite Change**:
- Previously: `'none'` required for cross-origin cookie sharing (medio-react-app.fly.dev → medio-backend.fly.dev)
- Now: `'lax'` sufficient because proxy makes requests same-origin (browser → medio-react-app.fly.dev → medio-backend.fly.dev)
- Security improvement: `'lax'` prevents CSRF attacks better than `'none'`

## No New Data Entities

The BFF proxy pattern is stateless and does not:
- Store user data
- Cache requests/responses
- Persist authentication tokens (pass-through only)
- Introduce new database tables

All authentication state remains in backend PostgreSQL database and browser cookies.
