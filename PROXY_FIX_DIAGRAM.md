# Proxy Routing Fix - Visual Comparison

## Before (BROKEN) ❌

```
┌─────────────────────────────────────────────────────────────────────┐
│ Request: http://localhost:8080/api/csrf-token                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Express Router                                                       │
│   req.path = "/api/csrf-token"                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ http-proxy-middleware                                               │
│   pathFilter: '/api'  ← STRING MATCH                                │
│                                                                      │
│   Step 1: Match "/api" prefix          ✅ MATCHED                   │
│   Step 2: Strip matched prefix         ⚠️ PATH NOW: "/csrf-token"  │
│   Step 3: Call pathRewrite()           ❌ NEVER CALLED              │
│   Step 4: Call onProxyReq()            ❌ NEVER CALLED              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (path = "/csrf-token")
┌─────────────────────────────────────────────────────────────────────┐
│ Backend Receives:                                                    │
│   http://localhost:5000/csrf-token  ❌ WRONG PATH (404)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## After (FIXED) ✅

```
┌─────────────────────────────────────────────────────────────────────┐
│ Request: http://localhost:8080/api/csrf-token                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Express Router                                                       │
│   req.path = "/api/csrf-token"                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ http-proxy-middleware                                               │
│   filter: function(pathname, req)  ← FUNCTION (BOOLEAN ONLY)       │
│                                                                      │
│   Step 1: Call filter("/api/csrf-token", req)                      │
│           → return pathname.startsWith('/api')                      │
│           → return true  ✅ MATCHED                                 │
│           ⚠️ PATH UNCHANGED: "/api/csrf-token"                      │
│                                                                      │
│   Step 2: Call pathRewrite("/api/csrf-token", req)  ✅ CALLED       │
│           → console.log(...)                                        │
│           → return "/api/csrf-token"  (no change)                   │
│           ⚠️ PATH UNCHANGED: "/api/csrf-token"                      │
│                                                                      │
│   Step 3: Call onProxyReq(...)  ✅ CALLED                           │
│           → Log: [PROXY REQ] GET /api/csrf-token                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (path = "/api/csrf-token")
┌─────────────────────────────────────────────────────────────────────┐
│ Backend Receives:                                                    │
│   http://localhost:5000/api/csrf-token  ✅ CORRECT PATH (200)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Side-by-Side Code Comparison

### ❌ BROKEN Configuration

```javascript
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',

  pathFilter: '/api',  // ← STRING MATCH: strips "/api" automatically

  pathRewrite: function (path, req) {
    // This receives: "/csrf-token" (without /api)
    // Tries to add /api back, but context is wrong
    console.log(`[PATH REWRITE] ${path} -> /api${path}`);
    return `/api${path}`;  // ← NEVER CALLED
  },

  onProxyReq: (proxyReq, req, res) => {
    // ← NEVER CALLED
    console.log(`[PROXY REQ] ${req.method} ${req.path}`);
  }
});
```

**Result**: Backend receives `/csrf-token` (404 error)

---

### ✅ FIXED Configuration

```javascript
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',

  filter: function (pathname, req) {  // ← FUNCTION: returns boolean only
    const shouldProxy = pathname.startsWith('/api');
    console.log(`[FILTER] ${pathname} -> ${shouldProxy ? 'PROXY' : 'SKIP'}`);
    return shouldProxy;  // ← Path NOT modified
  },

  pathRewrite: function (path, req) {
    // This receives: "/api/csrf-token" (with /api intact)
    // No rewrite needed, just log it
    console.log(`[PATH REWRITE] Original: ${path} -> Forwarded: ${path}`);
    return path;  // ← CALLED and path preserved
  },

  onProxyReq: (proxyReq, req, res) => {
    // ← CALLED
    console.log(`[PROXY REQ] ${req.method} ${req.path} -> ${proxyReq.path}`);
  }
});
```

**Result**: Backend receives `/api/csrf-token` (200 success)

---

## Console Output Comparison

### ❌ BROKEN (No Logs)

```
(no logs - callbacks never called)
```

Backend receives: `/csrf-token` → 404 Not Found

---

### ✅ FIXED (Full Logs)

```
[FILTER] /api/csrf-token -> PROXY
[PATH REWRITE] Original: /api/csrf-token -> Forwarded: /api/csrf-token (no rewrite needed)
[PROXY REQ] GET /api/csrf-token -> http://localhost:5000/api/csrf-token
[PROXY REQ] Headers: { host: 'localhost:5000', origin: 'http://localhost:8080', ... }
[PROXY RES] GET /api/csrf-token <- 200
```

Backend receives: `/api/csrf-token` → 200 OK

---

## Key Differences

| Aspect | pathFilter (String) | filter (Function) |
|--------|---------------------|-------------------|
| **Type** | String | Function |
| **Returns** | N/A (implicit match) | Boolean |
| **Path Modification** | ⚠️ Strips matched prefix | ✅ No modification |
| **Callbacks Called** | ❌ No (path is wrong) | ✅ Yes (path is correct) |
| **Use Case** | Path transformation needed | Path preservation needed |
| **Debugging** | Hard (no logs) | Easy (can add logs) |

---

## The Golden Rule

> **When using `filter` function**: The path is **NEVER** modified. It's only used for **matching**.
> **When using `pathFilter` string**: The matched prefix is **AUTOMATICALLY** stripped.

For BFF proxies where you want to preserve the `/api` prefix, **ALWAYS use `filter` function**.
