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
const { validateCookieSecret } = require('./utils/crypto');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required environment variables
if (!process.env.COOKIE_SECRET) {
  console.error('ERROR: COOKIE_SECRET environment variable is required for secure session management');
  console.error('Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Validate COOKIE_SECRET meets security requirements
if (!validateCookieSecret(process.env.COOKIE_SECRET)) {
  console.error('ERROR: COOKIE_SECRET does not meet security requirements');
  console.error('Generate a secure secret using: node backend/src/scripts/generate-secrets.js');
  process.exit(1);
}

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
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

// Apply rate limiting to public endpoints
app.use('/api/sessions/start/public', publicEndpointLimiter);
app.use('/api/sessions/end/public', publicEndpointLimiter);
app.use('/api/sessions/heartbeat/public', publicEndpointLimiter);
app.use('/api/nfc/scan/public', publicEndpointLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// CSRF protection setup
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
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
  '/api/health'
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

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