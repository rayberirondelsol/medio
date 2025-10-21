# http-proxy-middleware v3.x Quick Reference

## ✅ DO: Use `filter` Function for Path Preservation

```javascript
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,

  // Use filter function - returns boolean, doesn't modify path
  filter: (pathname, req) => pathname.startsWith('/api')
});
```

**Result**: `/api/csrf-token` → `/api/csrf-token` ✅

---

## ❌ DON'T: Use `pathFilter` String (unless you want path stripping)

```javascript
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,

  // pathFilter strips the matched prefix automatically
  pathFilter: '/api'  // ← Strips "/api" from path!
});
```

**Result**: `/api/csrf-token` → `/csrf-token` ❌

---

## Common Patterns

### Pattern 1: Preserve /api Prefix (BFF Proxy)

```javascript
// Frontend: http://localhost:8080/api/videos
// Backend:  http://localhost:5000/api/videos

createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  filter: (pathname) => pathname.startsWith('/api')
  // No pathRewrite needed - /api is preserved
});
```

### Pattern 2: Strip /api Prefix

```javascript
// Frontend: http://localhost:8080/api/videos
// Backend:  http://localhost:5000/videos (no /api)

createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathFilter: '/api'  // Strips /api automatically
});
```

### Pattern 3: Custom Path Transformation

```javascript
// Frontend: http://localhost:8080/v1/videos
// Backend:  http://localhost:5000/api/v1/videos

createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  filter: (pathname) => pathname.startsWith('/v1'),
  pathRewrite: (path) => `/api${path}`  // /v1/videos -> /api/v1/videos
});
```

### Pattern 4: Multiple Path Prefixes

```javascript
// Proxy both /api and /auth to same backend

createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  filter: (pathname) => pathname.startsWith('/api') || pathname.startsWith('/auth')
});
```

---

## Debugging Checklist

1. **Add logging to verify callbacks are called**:
   ```javascript
   filter: (pathname) => {
     const match = pathname.startsWith('/api');
     console.log(`[FILTER] ${pathname} -> ${match ? 'PROXY' : 'SKIP'}`);
     return match;
   },

   pathRewrite: (path) => {
     console.log(`[REWRITE] ${path}`);
     return path;
   },

   onProxyReq: (proxyReq, req) => {
     console.log(`[PROXY] ${req.method} ${req.path} -> ${proxyReq.path}`);
   }
   ```

2. **Check what the backend actually receives**:
   - Add logging in your backend route handlers
   - Use `req.path` or `req.url` to see exact path

3. **Test with curl**:
   ```bash
   # Test proxy
   curl http://localhost:8080/api/csrf-token

   # Test backend directly
   curl http://localhost:5000/api/csrf-token

   # Compare responses
   ```

---

## Common Mistakes

### ❌ Mistake 1: Using pathFilter when you want to preserve the path
```javascript
pathFilter: '/api'  // ← Strips /api!
```

### ❌ Mistake 2: Forgetting pathRewrite returns the modified path
```javascript
pathRewrite: (path) => {
  console.log(path);
  // ← Missing return statement!
}
```

### ❌ Mistake 3: Using context instead of filter
```javascript
app.use('/api', createProxyMiddleware({...}));
// ← This works but gives you less control over filtering
```

---

## Migration from v2.x to v3.x

### v2.x (Old)
```javascript
const proxy = require('http-proxy-middleware');

app.use('/api', proxy({
  target: 'http://localhost:5000'
}));
```

### v3.x (New)
```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use(createProxyMiddleware({
  target: 'http://localhost:5000',
  filter: (pathname) => pathname.startsWith('/api')
}));
```

**Key Changes**:
- Import changed to named export: `{ createProxyMiddleware }`
- `pathFilter` string behavior changed (now strips prefix)
- Use `filter` function for boolean matching without path modification

---

## When to Use Each Option

| Option | Use When | Path Behavior |
|--------|----------|---------------|
| `filter` function | You want to preserve the path as-is | No modification |
| `pathFilter` string | You want to strip the matched prefix | Strips prefix |
| `pathRewrite` function | You need custom path transformation | Custom transformation |
| `app.use('/path', ...)` | Simple prefix routing | Strips prefix (Express behavior) |

---

## Quick Test

```javascript
// server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',
  filter: (pathname) => {
    console.log(`[FILTER] ${pathname}`);
    return pathname.startsWith('/api');
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY] ${req.path} -> ${proxyReq.path}`);
  }
}));

app.listen(8080, () => console.log('Proxy running on :8080'));
```

```bash
# Terminal 1: Start proxy
node server.js

# Terminal 2: Test
curl http://localhost:8080/api/csrf-token

# Expected logs:
# [FILTER] /api/csrf-token
# [PROXY] /api/csrf-token -> /api/csrf-token
```

---

## Production Checklist

- [ ] Set `changeOrigin: true` for cross-domain proxying
- [ ] Set `logLevel: 'silent'` in production (or 'warn')
- [ ] Add error handling with `onError` callback
- [ ] Configure timeout: `timeout: 30000` (30s)
- [ ] Test with production backend URL
- [ ] Verify CORS headers are handled correctly
- [ ] Monitor proxy performance and errors
- [ ] Add health check endpoint (non-proxied)

---

## Resources

- [Official Documentation](https://github.com/chimurai/http-proxy-middleware)
- [Migration Guide v2 → v3](https://github.com/chimurai/http-proxy-middleware/blob/master/MIGRATION.md)
- [Examples](https://github.com/chimurai/http-proxy-middleware/tree/master/examples)
