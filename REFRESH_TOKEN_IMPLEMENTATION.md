# JWT Refresh Token Implementation

## Overview

This document describes the implementation of a dual-token JWT authentication system to fix rate limiting issues caused by non-existent `/auth/refresh` endpoint retries.

## Problem Statement

The frontend axios interceptor (`src/utils/axiosConfig.ts` lines 87-100) attempted to call `/auth/refresh` on every 401 error, but this endpoint didn't exist. This caused:

1. Every 401 error triggers `/auth/refresh` attempt → 403 CSRF error
2. CSRF retry logic fetches new `/csrf-token`
3. Retries `/auth/refresh` → 401 again
4. **Result**: 3-4 backend requests per failed API call
5. Rate limit (5 requests/15min) reached immediately, blocking legitimate users

## Solution: Dual-Token System

Implemented a proper JWT refresh token system with:

- **Access Token**: Short-lived (15 minutes), used for API authentication
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

## Implementation Details

### 1. Token Generation (backend/src/middleware/auth.js)

Added two new token generation functions:

```javascript
// Access token (15 minutes)
const generateAccessToken = (user) => {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      jti: jti,
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: '15m',
      issuer: 'medio-platform',
      audience: 'medio-users'
    }
  );
};

// Refresh token (7 days)
const generateRefreshToken = (user) => {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    {
      id: user.id,
      jti: jti,
      type: 'refresh'
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'medio-platform',
      audience: 'medio-users'
    }
  );
};
```

**Key Differences**:
- Access tokens include `email` field for API use
- Refresh tokens only include `id` (minimal information)
- Both include `type` field for validation
- Different expiration times (15m vs 7d)

### 2. Cookie Management (backend/src/routes/auth.js)

Updated cookie helper functions:

```javascript
// Access token cookie (15 minutes)
const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
};

// Refresh token cookie (7 days)
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};
```

### 3. Updated Login/Register (backend/src/routes/auth.js)

Both endpoints now generate and set dual tokens:

```javascript
// In login and register handlers
const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

setAuthCookie(res, accessToken);
setRefreshCookie(res, refreshToken);

res.json({
  user: {
    id: user.id,
    email: user.email,
    name: user.name
  },
  token: accessToken // For backward compatibility
});
```

### 4. New Refresh Endpoint (backend/src/routes/auth.js)

Implemented `POST /auth/refresh`:

```javascript
router.post('/refresh', async (req, res) => {
  try {
    // 1. Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // 2. Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // 3. Validate token type
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // 4. Check blacklist
    const blacklistCheck = await pool.query(
      'SELECT id FROM token_blacklist WHERE token_jti = $1',
      [decoded.jti]
    );
    if (blacklistCheck.rows.length > 0) {
      res.clearCookie('authToken');
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    // 5. Verify user still exists
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userResult.rows.length === 0) {
      res.clearCookie('authToken');
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'User not found' });
    }

    // 6. Generate new access token
    const user = userResult.rows[0];
    const newAccessToken = generateAccessToken(user);

    // 7. Set new access token cookie
    setAuthCookie(res, newAccessToken);

    res.json({
      message: 'Access token refreshed successfully',
      token: newAccessToken
    });
  } catch (err) {
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Refresh token has expired',
        requiresLogin: true
      });
    }
    return res.status(401).json({
      message: 'Invalid refresh token',
      requiresLogin: true
    });
  }
});
```

**Security Features**:
- Validates token type (prevents using access token as refresh token)
- Checks token blacklist (for logged-out users)
- Verifies user still exists in database
- Clears both cookies on failure
- Returns `requiresLogin: true` flag for expired refresh tokens

### 5. Updated Logout (backend/src/routes/auth.js)

Now blacklists both tokens and clears both cookies:

```javascript
router.post('/logout', async (req, res) => {
  try {
    const accessToken = req.cookies?.authToken;
    const refreshToken = req.cookies?.refreshToken;

    // Blacklist both tokens
    const tokensToBlacklist = [accessToken, refreshToken].filter(Boolean);

    for (const token of tokensToBlacklist) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        const expiresAt = new Date(decoded.exp * 1000);
        await pool.query(
          'INSERT INTO token_blacklist (token_jti, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token_jti) DO NOTHING',
          [decoded.jti, decoded.id, expiresAt]
        );
      }
    }

    // Clear both cookies
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }
});
```

### 6. Rate Limiting (backend/src/middleware/rateLimiter.js)

Added dedicated refresh token rate limiter:

```javascript
const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // More lenient than auth endpoints (5)
  message: {
    error: 'Too many token refresh requests from this IP, please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

Applied in `backend/src/server.js`:

```javascript
app.use('/api/auth/refresh', limiter); // Uses general limiter (100 req/15min)
app.use('/api/v1/auth/refresh', limiter);
```

**Why general limiter?**
- Refresh endpoint is called automatically by frontend
- More lenient limit (100 req/15min) prevents blocking legitimate users
- Still protects against abuse
- Stricter `authRateLimiter` (5 req/15min) reserved for login/register

## Authentication Flow

### Initial Login/Register
```
1. User submits credentials
2. Backend validates credentials
3. Generate access token (15 min) + refresh token (7 days)
4. Set both as httpOnly cookies
5. Return user info + access token (for backward compatibility)
```

### API Request with Valid Access Token
```
1. Frontend makes API request
2. Access token sent via cookie
3. Backend validates access token
4. Request succeeds
```

### API Request with Expired Access Token
```
1. Frontend makes API request
2. Access token expired → 401 error
3. Frontend axios interceptor catches 401
4. Calls /auth/refresh with refresh token cookie
5. Backend validates refresh token
6. Generate new access token
7. Set new access token cookie
8. Frontend retries original request
9. Request succeeds
```

### Expired Refresh Token
```
1. Frontend calls /auth/refresh
2. Backend validates refresh token
3. Refresh token expired → 401 with requiresLogin: true
4. Frontend redirects to login page
5. User must re-authenticate
```

## Testing

Added comprehensive test suite in `backend/src/routes/auth.test.js`:

- ✅ Refresh with valid refresh token
- ✅ Reject refresh with missing token
- ✅ Reject refresh with invalid token type (access token)
- ✅ Reject refresh with blacklisted token
- ✅ Reject refresh with expired token
- ✅ Reject refresh when user deleted

All 12 tests pass:
```
PASS src/routes/auth.test.js
  Auth Routes
    POST /api/auth/register
      √ should register a new user with valid data
      √ should reject registration with weak password
      √ should reject registration with existing email
    POST /api/auth/login
      √ should login with valid credentials
      √ should reject login with invalid password
      √ should reject login with non-existent email
    POST /api/auth/refresh
      √ should refresh access token with valid refresh token
      √ should reject refresh with missing refresh token
      √ should reject refresh with invalid token type
      √ should reject refresh with blacklisted token
      √ should reject refresh with expired token
      √ should reject refresh when user not found
```

## Frontend Integration

The frontend axios interceptor (`src/utils/axiosConfig.ts`) already implements the refresh logic:

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const apiUrl = resolveApiBaseUrl();
        if (apiUrl) {
          // This now works! Endpoint exists
          await axios.post(`${apiUrl}/auth/refresh`, {}, { withCredentials: true });
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed → redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**No frontend changes needed** - the interceptor already expects this endpoint.

## Migration Notes

### Existing Users

Existing users with old 7-day access tokens will:

1. Continue working until token expires (up to 7 days)
2. After expiration, receive 401 error
3. Frontend attempts `/auth/refresh` (no refresh token cookie yet)
4. Refresh fails with 401
5. Frontend redirects to login
6. User logs in again and receives new dual-token setup

**No data migration needed** - tokens are stateless, stored only in cookies.

### Database

No database schema changes required. Existing `token_blacklist` table works for both token types.

## Security Considerations

1. **httpOnly cookies**: Prevents XSS attacks from stealing tokens
2. **Token type validation**: Prevents token confusion attacks
3. **Blacklist checking**: Prevents use of revoked tokens
4. **User existence check**: Handles deleted users gracefully
5. **Rate limiting**: Prevents brute force and abuse
6. **Short access token lifetime**: Limits exposure window if compromised
7. **Long refresh token lifetime**: Reduces need for frequent login

## Rate Limiting Impact

### Before (Problem)
- Every 401 → 3-4 backend requests
- Rate limit: 5 req/15min for auth endpoints
- Result: Users blocked immediately

### After (Solution)
- Every 401 → 1 refresh request + 1 retry
- Rate limit: 100 req/15min for refresh endpoint
- Result: Normal usage works fine

**Example**:
- User makes 10 API requests
- 5 have expired access tokens
- Total requests: 10 original + 5 refresh + 5 retry = 20 requests
- Well within 100 req/15min limit

## Files Modified

### Backend
1. `backend/src/middleware/auth.js` - Added token generation functions
2. `backend/src/routes/auth.js` - Updated login/register/logout, added refresh endpoint
3. `backend/src/middleware/rateLimiter.js` - Added refresh rate limiter
4. `backend/src/server.js` - Applied rate limiter to refresh endpoint
5. `backend/src/routes/auth.test.js` - Added comprehensive tests

### Frontend
No changes needed - axios interceptor already implemented.

## Environment Variables

No new environment variables required. Uses existing:
- `JWT_SECRET` - For signing tokens
- `NODE_ENV` - For cookie security settings
- `COOKIE_DOMAIN` - For cookie domain (production)

## Verification Steps

1. **Login** → Verify both `authToken` and `refreshToken` cookies set
2. **Wait 15 minutes** → Access token expires
3. **Make API request** → Should automatically refresh and succeed
4. **Wait 7 days** → Refresh token expires
5. **Make API request** → Should redirect to login
6. **Logout** → Both cookies cleared

## Future Enhancements

1. **Refresh token rotation**: Generate new refresh token on each refresh
2. **Device tracking**: Associate tokens with devices, allow revocation per device
3. **Token family tracking**: Detect token reuse attacks
4. **Sliding expiration**: Extend refresh token on active use
5. **Redis caching**: Cache blacklist checks for performance

## Conclusion

This implementation:
- ✅ Fixes rate limiting issues
- ✅ Maintains backward compatibility
- ✅ Improves security (shorter access token lifetime)
- ✅ Provides seamless user experience (auto-refresh)
- ✅ Fully tested (12/12 tests passing)
- ✅ No frontend changes required
- ✅ No database migration needed

The refresh token system is production-ready and resolves the immediate rate limiting problem while providing a foundation for future security enhancements.
