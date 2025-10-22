require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

// Initialize Sentry for production error tracking
let Sentry;
if (process.env.NODE_ENV === 'production') {
  try {
    Sentry = require('@sentry/node');
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 0.1,
      });
      console.log('[PROXY] Sentry initialized for error tracking');
    }
  } catch (err) {
    console.warn('[PROXY] Sentry not available:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// T056: Startup validation - ensure BACKEND_URL is set in production
if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
  console.error('[PROXY] FATAL ERROR: BACKEND_URL environment variable is required in production');
  console.error('[PROXY] Please set BACKEND_URL to your backend service URL (e.g., https://medio-backend.fly.dev)');
  process.exit(1);
}

console.log(`[PROXY] Starting frontend server on port ${PORT}`);
console.log(`[PROXY] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[PROXY] Backend URL: ${BACKEND_URL}`);
console.log(`[PROXY] __dirname: ${__dirname}`);
console.log(`[PROXY] Build path: ${path.join(__dirname, 'build')}`);

// Proxy configuration
const proxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  // When using app.use('/api', proxy), Express strips '/api' from req.path
  // We need to add it back when forwarding to backend
  pathRewrite: {
    '^/': '/api/'  // Prepend /api/ to all paths
  },
  // CRITICAL: Cookie handling for same-origin auth
  cookieDomainRewrite: {
    '*': '' // Rewrite all cookie domains to current host (localhost:8080)
  },
  cookiePathRewrite: {
    '*': '/' // Rewrite all cookie paths to root
  },
  // http-proxy-middleware v3 uses 'on' object for events
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Log incoming request
      console.log(`[PROXY REQ] ${req.method} ${req.path} -> ${proxyReq.path}`);
      console.log(`[PROXY REQ] Cookies in req.headers: ${req.headers.cookie || 'NONE'}`);

      // CRITICAL: Forward cookies from browser to backend
      // In BFF pattern, browser sends cookies to proxy (localhost:8080),
      // but we need to forward them to backend (localhost:5000)
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
        console.log(`[PROXY REQ] ✓ Forwarding cookies to backend: ${req.headers.cookie}`);
      } else {
        console.log(`[PROXY REQ] ✗ NO COOKIES TO FORWARD`);
      }

      // Forward CSRF token header if present
      if (req.headers['x-csrf-token']) {
        proxyReq.setHeader('x-csrf-token', req.headers['x-csrf-token']);
        console.log(`[PROXY REQ] CSRF Token: ${req.headers['x-csrf-token']}`);
      }
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY RES] ${req.method} ${req.path} <- ${proxyRes.statusCode}`);

      // CRITICAL FIX: Remove 'Domain' attribute from Set-Cookie headers
      // Backend sets cookies without Domain, but proxy needs to ensure
      // they're scoped to the proxy origin (localhost:8080), NOT the backend (localhost:5000)
      if (proxyRes.headers['set-cookie']) {
        // Rewrite Set-Cookie headers to remove Domain attribute entirely
        proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
          // Remove any Domain=... directive (including Domain=localhost)
          const rewrittenCookie = cookie.replace(/;\s*Domain=[^;]*/gi, '');
          return rewrittenCookie;
        });
        console.log(`[PROXY RES] Set-Cookie (rewritten): ${proxyRes.headers['set-cookie']}`);
      }

      // Log CSRF token header if present
      if (proxyRes.headers['x-csrf-token']) {
        console.log(`[PROXY RES] CSRF Token: ${proxyRes.headers['x-csrf-token']}`);
      }
    },
    error: (err, req, res) => {
      console.error('[PROXY ERROR]', err.message);

      // T058: Capture proxy errors in Sentry for production monitoring
      if (Sentry && process.env.NODE_ENV === 'production') {
        Sentry.captureException(err, {
          tags: {
            component: 'bff-proxy',
            error_type: 'proxy_error'
          },
          extra: {
            method: req.method,
            path: req.path,
            backend_url: BACKEND_URL,
            error_message: err.message,
            error_code: err.code
          }
        });
      }

      // Determine appropriate status code
      const statusCode = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ? 502 : 504;

      res.status(statusCode).json({
        error: 'Service temporarily unavailable',
        message: 'The backend service is currently unreachable. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

// T057: Health check endpoint with logging
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    service: 'medio-frontend-proxy',
    backend: BACKEND_URL,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  // Log health check in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[HEALTH CHECK] ${JSON.stringify(healthStatus)}`);
  }

  res.json(healthStatus);
});

// Apply proxy middleware ONLY for /api requests
// IMPORTANT: Must use specific path prefix, not filter alone
app.use('/api', (req, res, next) => {
  console.log(`[MIDDLEWARE] /api middleware triggered for ${req.method} ${req.path}`);
  next();
}, proxy);

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// All other routes serve the React app (SPA fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  // T057: Enhanced startup logging for debugging and monitoring
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Medio BFF Proxy Server - STARTED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Proxy server listening on http://0.0.0.0:${PORT}`);
  console.log(`✓ Backend URL: ${BACKEND_URL}`);
  console.log(`✓ Proxying /api/* requests to backend`);
  console.log(`✓ Serving React app from /build directory`);
  console.log(`✓ Health check endpoint: http://localhost:${PORT}/health`);
  if (Sentry && process.env.SENTRY_DSN) {
    console.log(`✓ Sentry error tracking: ENABLED`);
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
