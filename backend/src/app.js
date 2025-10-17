/**
 * Express App Setup for Testing
 *
 * This file exports the Express app without starting the server,
 * allowing it to be imported by tests.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Mock database pool for tests
if (process.env.NODE_ENV === 'test' || !process.env.DB_HOST) {
  // Set minimal environment variables for test mode
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'test_db';
  process.env.DB_USER = 'test_user';
  process.env.DB_PASSWORD = 'test_password';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-64-characters-long-for-security';
  process.env.COOKIE_SECRET = 'test-cookie-secret';
}

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const nfcRoutes = require('./routes/nfc');
const profileRoutes = require('./routes/profiles');
const sessionRoutes = require('./routes/sessions');
const platformRoutes = require('./routes/platforms');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'test-secret'));

// Rate limiting for metadata endpoint (more restrictive)
const metadataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Allow 50 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/videos/metadata', metadataLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/platforms', platformRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Mock authentication middleware for tests
if (process.env.NODE_ENV === 'test') {
  const { authenticateToken } = require('./middleware/auth');

  // Override the authenticateToken if not already mocked
  if (!authenticateToken._isMockFunction) {
    // This is a fallback for when tests don't mock the middleware
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer valid-test-token') {
        req.user = { id: 1, email: 'test@example.com' };
      }
      next();
    });
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

module.exports = app;
