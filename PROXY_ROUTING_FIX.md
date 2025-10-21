# BFF Proxy Routing Fix - http-proxy-middleware v3.0.5

## Problem Summary

**Issue**: Frontend proxy at `http://localhost:8080` was stripping the `/api` prefix when forwarding requests to backend at `http://localhost:5000`.

**Symptoms**:
- Request: `http://localhost:8080/api/csrf-token`
- Expected backend to receive: `/api/csrf-token`
- **Actually received**: `/csrf-token` (❌ missing `/api` prefix)
- `pathRewrite` callback never executed
- `onProxyReq` callback never executed

## Root Cause

### http-proxy-middleware v3.x Behavior Change

In **v3.x**, the `pathFilter` option has different behavior than v2.x:

```javascript
// ❌ BROKEN CONFIGURATION (your original code)
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  pathFilter: '/api',  // <-- This automatically STRIPS /api from the path!
  pathRewrite: function (path, req) {
    return `/api${path}`;  // <-- Never called because path is already wrong
  }
});
```

**What happens**:
1. Request comes in: `/api/csrf-token`
2. `pathFilter: '/api'` matches the request ✅
3. **Middleware automatically strips `/api`** → path becomes `/csrf-token` ❌
4. `pathRewrite` receives `/csrf-token` (without `/api`)
5. `pathRewrite` tries to add `/api` back, but the context is wrong
6. Backend receives `/csrf-token` instead of `/api/csrf-token`

### Why Callbacks Weren't Called

The `pathFilter` uses string matching, which in v3.x:
- Matches requests starting with the string
- **Automatically removes the matched prefix** before applying `pathRewrite`
- This behavior is undocumented and differs from v2.x

## Solution

### Use `filter` Function Instead of `pathFilter` String

The `filter` option takes a **function that returns boolean** and **does NOT modify the path**:

```javascript
// ✅ WORKING CONFIGURATION
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: 'debug',

  // Use filter function (returns boolean, doesn't modify path)
  filter: function (pathname, req) {
    const shouldProxy = pathname.startsWith('/api');
    console.log(`[FILTER] ${pathname} -> ${shouldProxy ? 'PROXY' : 'SKIP'}`);
    return shouldProxy;
  },

  // pathRewrite now receives the ORIGINAL path with /api intact
  pathRewrite: function (path, req) {
    // Path already has /api prefix, no rewrite needed
    console.log(`[PATH REWRITE] Original: ${path} -> Forwarded: ${path}`);
    return path; // Return unchanged
  },

  onProxyReq: (proxyReq, req, res) => {
    const proxyPath = proxyReq.path;
    console.log(`[PROXY REQ] ${req.method} ${req.path} -> ${BACKEND_URL}${proxyPath}`);
  },

  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY RES] ${req.method} ${req.path} <- ${proxyRes.statusCode}`);
  }
});
```

## How It Works Now

1. Request comes in: `/api/csrf-token`
2. `filter()` function is called with `/api/csrf-token`
3. Function returns `true` (match)
4. **Path remains unchanged**: `/api/csrf-token`
5. `pathRewrite()` receives `/api/csrf-token`
6. `pathRewrite()` returns `/api/csrf-token` (no change needed)
7. `onProxyReq()` is called
8. Backend receives `/api/csrf-token` ✅

## Expected Console Output

When you make a request to `http://localhost:8080/api/csrf-token`, you should see:

```
[FILTER] /api/csrf-token -> PROXY
[PATH REWRITE] Original: /api/csrf-token -> Forwarded: /api/csrf-token
[PROXY REQ] GET /api/csrf-token -> http://localhost:5000/api/csrf-token
[PROXY RES] GET /api/csrf-token <- 200
```

## Testing

### Manual Test

```bash
# Start backend
cd backend && npm start

# Start proxy (in another terminal)
node server.js

# Test the endpoint
curl http://localhost:8080/api/csrf-token

# Expected response:
# {"csrfToken":"<token-value>"}
```

### Automated Test Script

```bash
bash test-proxy-fix.sh
```

### Playwright E2E Tests

```bash
npx playwright test tests/test-proxy-routing.spec.js
```

## Alternative Solutions Considered

### Option 1: Remove pathRewrite Entirely
```javascript
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  filter: (pathname) => pathname.startsWith('/api')
  // No pathRewrite needed - path is preserved as-is
});
```
**Pros**: Simplest solution
**Cons**: No logging of path transformations

### Option 2: Use Context Property
```javascript
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '/api' } // No-op rewrite
}));
```
**Pros**: Works with pathFilter
**Cons**: Less control over filtering logic

### Option 3: Manual Path Manipulation
```javascript
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  next();
});
```
**Cons**: Fragile, bypasses middleware features

## Why We Chose `filter` Function

1. **Explicit path preservation**: Function returns boolean, doesn't modify path
2. **Better logging**: Can log filter decisions inline
3. **More control**: Can add complex logic if needed later
4. **Official API**: Documented in http-proxy-middleware v3.x docs
5. **Debugging**: Easy to verify filter is being called

## Production Configuration

The same fix applies to production deployment. In your `.env`:

```env
# Local development
BACKEND_URL=http://localhost:5000

# Production (Fly.io)
BACKEND_URL=https://medio-backend.fly.dev
```

The proxy configuration works identically in both environments.

## Key Takeaways

1. **`pathFilter` (string)** in v3.x strips the matched prefix automatically
2. **`filter` (function)** only decides whether to proxy, doesn't modify path
3. When using `filter`, the original path (including `/api`) is preserved
4. Always add logging to verify middleware callbacks are executing
5. Test locally before deploying to production

## Files Modified

- **`server.js`**: Updated proxy configuration (lines 16-68)

## Files Created

- **`tests/test-proxy-routing.spec.js`**: Playwright E2E tests
- **`test-proxy-fix.sh`**: Manual test script
- **`PROXY_ROUTING_FIX.md`**: This documentation

## References

- [http-proxy-middleware v3 Documentation](https://github.com/chimurai/http-proxy-middleware)
- [Migration Guide v2 → v3](https://github.com/chimurai/http-proxy-middleware/blob/master/MIGRATION.md)
- [Filter vs PathFilter](https://github.com/chimurai/http-proxy-middleware#filter-option)

## Verification Checklist

- [ ] Backend receives `/api/*` requests with `/api` prefix intact
- [ ] `[FILTER]` logs appear in proxy console
- [ ] `[PATH REWRITE]` logs appear in proxy console
- [ ] `[PROXY REQ]` logs appear in proxy console
- [ ] CSRF token endpoint returns valid token
- [ ] Platforms endpoint returns array of platforms
- [ ] Non-API routes serve React app
- [ ] Health check endpoint works without proxying
- [ ] Manual test script passes all tests
- [ ] Playwright tests pass
