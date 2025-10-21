const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const nfcRoutes = require('./routes/nfc');
const profileRoutes = require('./routes/profiles');
const sessionRoutes = require('./routes/sessions');
const platformRoutes = require('./routes/platforms');
const { validateCookieSecret } = require('./utils/crypto');
const logger = require('./utils/logger');
const { initSentry, addSentryErrorHandler } = require('./utils/sentry');

const app = express();

// Trust Fly.io proxy to ensure correct client IP and secure cookies
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Initialize Sentry error tracking (must be early in the app)
initSentry(app);

// Validate required environment variables
if (!process.env.COOKIE_SECRET) {
  logger.error('ERROR: COOKIE_SECRET environment variable is required for secure session management');
  logger.error('Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate COOKIE_SECRET meets security requirements
if (!validateCookieSecret(process.env.COOKIE_SECRET)) {
  logger.error('ERROR: COOKIE_SECRET does not meet security requirements');
  logger.error('Generate a secure secret using: node backend/src/scripts/generate-secrets.js');
  process.exit(1);
}

// Generate nonce for CSP
app.use((req, res, next) => {
  res.locals.nonce = require('crypto').randomBytes(16).toString('base64');
  next();
});

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration - more restrictive in production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8080'];
    
    // Allow requests with no origin (mobile apps, Postman, etc) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // INCREASED for E2E testing (production: 100)
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // INCREASED for E2E testing (production: 5)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for public endpoints (kids mode)
const publicEndpointLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: 'Too many requests from this IP, please try again in a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', limiter); // Use general limiter for refresh endpoint (20 req/15min via interceptor)
app.use('/api/v1/auth/refresh', limiter); // Apply to versioned endpoint too

// Apply rate limiting to public endpoints
app.use('/api/sessions/start/public', publicEndpointLimiter);
app.use('/api/sessions/end/public', publicEndpointLimiter);
app.use('/api/sessions/heartbeat/public', publicEndpointLimiter);
app.use('/api/nfc/scan/public', publicEndpointLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// CSRF protection setup with environment-aware cookie configuration
// Production: cross-domain support with secure+sameSite=none
// Development: same-origin BFF proxy with lax+domain=localhost
const isProduction = process.env.NODE_ENV === 'production';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: isProduction, // false in development for HTTP localhost
    sameSite: isProduction ? 'none' : 'lax' // lax for same-origin BFF proxy
    // NOTE: No 'domain' attribute - cookie is scoped to exact origin (host + port)
    // BFF proxy (localhost:8080) receives cookies from browser and forwards them to backend (localhost:5000)
  },
  value: (req) => {
    // Priority: header > body parameter
    // This allows cross-domain requests to send CSRF token via X-CSRF-Token header
    return req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF protection to state-changing routes (exclude public endpoints)
const csrfExcludePaths = [
  '/api/sessions/start/public',
  '/api/sessions/end/public',
  '/api/sessions/heartbeat/public',
  '/api/nfc/scan/public',
  '/api/health',
  '/api/auth/refresh',  // Refresh endpoint is called by axios interceptor without CSRF token
  '/api/v1/sessions/start/public',
  '/api/v1/sessions/end/public',
  '/api/v1/sessions/heartbeat/public',
  '/api/v1/nfc/scan/public',
  '/api/v1/health',
  '/api/v1/auth/refresh'  // Versioned refresh endpoint
];

// Conditional CSRF middleware
app.use((req, res, next) => {
  // Skip CSRF for GET requests and excluded paths
  if (req.method === 'GET' || csrfExcludePaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
});

// API versioning - v1 routes
const API_VERSION = process.env.API_VERSION || 'v1';
const apiPrefix = `/api/${API_VERSION}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/videos`, videoRoutes);
app.use(`${apiPrefix}/nfc`, nfcRoutes);
app.use(`${apiPrefix}/profiles`, profileRoutes);
app.use(`${apiPrefix}/sessions`, sessionRoutes);
app.use(`${apiPrefix}/platforms`, platformRoutes);

// Legacy routes for backward compatibility
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/platforms', platformRoutes);

// Health check endpoint with detailed status
const healthCheck = async (req, res) => {
  const pool = require('./db/pool');
  let dbHealthy = false;
  
  try {
    // Check database connectivity
    const result = await pool.query('SELECT 1');
    dbHealthy = !!result.rows;
  } catch (error) {
    logger.error('Health check database error:', error);
  }
  
  const health = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      sentry: process.env.SENTRY_DSN ? 'configured' : 'not configured'
    }
  };
  
  res.status(dbHealthy ? 200 : 503).json(health);
};

// Register health check for both versioned and legacy routes
app.get('/api/health', healthCheck);
app.get(`/api/${API_VERSION}/health`, healthCheck);

// Add Sentry error handler (must be before other error middleware)
addSentryErrorHandler(app);

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });
  
  // Only show error details in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Handle CSRF errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      message: 'Invalid CSRF token'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    // Only include error details if explicitly in development mode
    ...(isDevelopment && !isProduction && { error: err, stack: err.stack })
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});




