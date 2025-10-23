const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { generateToken, generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper function to set secure cookie
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // Same-origin authentication via BFF proxy
    maxAge: 15 * 60 * 1000, // 15 minutes (access token)
    path: '/'
    // NOTE: No 'domain' attribute - cookie is scoped to exact origin (host + port)
    // BFF proxy (localhost:8080) receives cookies from browser and forwards them to backend (localhost:5000)
  });
};

// Helper function to set refresh token cookie
const setRefreshCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // Same-origin authentication via BFF proxy
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
    // NOTE: No 'domain' attribute - cookie is scoped to exact origin (host + port)
    // BFF proxy (localhost:8080) receives cookies from browser and forwards them to backend (localhost:5000)
  });
};

// Password validation helper
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
};

// Register endpoint
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').custom((value) => {
      const errors = validatePasswordStrength(value);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      return true;
    }),
    body('name').notEmpty().trim().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT user_uuid FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name]
      );

      const user = result.rows[0];

      logger.info('[REGISTER] User created:', user.email, 'UUID:', user.id);

      // Generate both access and refresh tokens
      const accessToken = generateAccessToken({ id: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

      logger.info('[REGISTER] Access token generated:', accessToken.substring(0, 50) + '...');
      logger.info('[REGISTER] Refresh token generated:', refreshToken.substring(0, 50) + '...');

      // Decode to verify token payload
      const decoded = jwt.decode(accessToken);
      logger.info('[REGISTER] Access token payload:', JSON.stringify(decoded, null, 2));

      // Set secure httpOnly cookies
      setAuthCookie(res, accessToken);
      setRefreshCookie(res, refreshToken);

      logger.info('[REGISTER] Cookies set successfully');

      res.status(201).json({
        user: {
          id: user.user_uuid,
          email: user.email,
          name: user.name
        },
        // Still send token for backward compatibility, but prefer cookie
        token: accessToken
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  }
);

// Login endpoint
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Get user
      const result = await pool.query(
        'SELECT user_uuid, email, name, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate both access and refresh tokens
      const accessToken = generateAccessToken({ id: user.user_uuid, email: user.email });
      const refreshToken = generateRefreshToken({ id: user.user_uuid, email: user.email });

      // Set secure httpOnly cookies
      setAuthCookie(res, accessToken);
      setRefreshCookie(res, refreshToken);

      res.json({
        user: {
          id: user.user_uuid,
          email: user.email,
          name: user.name
        },
        // Still send token for backward compatibility, but prefer cookie
        token: accessToken
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  }
);

// Get current auth status / verify token endpoint
router.get('/me', async (req, res) => {
  try {
    logger.info('[AUTH /me] ===== START AUTH CHECK =====');
    logger.info('[AUTH /me] Headers:', JSON.stringify(req.headers, null, 2));
    logger.info('[AUTH /me] Cookies:', JSON.stringify(req.cookies, null, 2));

    // Get token from cookie or header
    let token = req.cookies?.authToken;
    logger.info('[AUTH /me] Token from cookie:', token ? `${token.substring(0, 50)}...` : 'NONE');

    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
      logger.info('[AUTH /me] Token from Authorization header:', token ? `${token.substring(0, 50)}...` : 'NONE');
    }

    if (!token) {
      logger.warn('[AUTH /me] No token found - returning 401');
      return res.status(401).json({ message: 'Not authenticated', authenticated: false });
    }

    // Verify the token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    logger.info('[AUTH /me] JWT_SECRET present:', !!JWT_SECRET);
    logger.info('[AUTH /me] JWT_SECRET length:', JWT_SECRET?.length);

    try {
      logger.info('[AUTH /me] Attempting jwt.verify()...');
      const decoded = jwt.verify(token, JWT_SECRET);
      logger.info('[AUTH /me] ✓ JWT verification SUCCESS');
      logger.info('[AUTH /me] Decoded token:', JSON.stringify(decoded, null, 2));

      // Check if token is blacklisted
      if (decoded.jti) {
        logger.info('[AUTH /me] Checking token blacklist for jti:', decoded.jti);
        try {
          const blacklistCheck = await pool.query(
            'SELECT id FROM token_blacklist WHERE token_jti = $1',
            [decoded.jti]
          );

          if (blacklistCheck.rows.length > 0) {
            logger.warn('[AUTH /me] Token is BLACKLISTED - returning 401');
            res.clearCookie('authToken');
            return res.status(401).json({ message: 'Token has been revoked', authenticated: false });
          }
          logger.info('[AUTH /me] Token NOT blacklisted');
        } catch (blacklistError) {
          // Log the error but don't reject valid tokens if blacklist check fails
          logger.error('[AUTH /me] Blacklist check failed (table may not exist):', blacklistError.message);
          logger.warn('[AUTH /me] Continuing authentication despite blacklist check failure');
          // Continue to user verification - don't fail authentication
        }
      }

      // Get fresh user data from database
      logger.info('[AUTH /me] Fetching user from database, user_uuid:', decoded.id);
      const userResult = await pool.query(
        'SELECT user_uuid, email, name FROM users WHERE user_uuid = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        logger.warn('[AUTH /me] User NOT FOUND in database - returning 401');
        res.clearCookie('authToken');
        return res.status(401).json({ message: 'User not found', authenticated: false });
      }

      const user = userResult.rows[0];
      logger.info('[AUTH /me] ✓ User found:', user.email);
      logger.info('[AUTH /me] ===== AUTH CHECK SUCCESS =====');

      res.json({
        authenticated: true,
        user: {
          id: user.user_uuid,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      logger.error('[AUTH /me] ✗ JWT verification FAILED:', err.message);
      logger.error('[AUTH /me] Error name:', err.name);
      logger.error('[AUTH /me] Error stack:', err.stack);

      res.clearCookie('authToken');
      if (err.name === 'TokenExpiredError') {
        logger.warn('[AUTH /me] Token EXPIRED');
        return res.status(401).json({ message: 'Token has expired', authenticated: false });
      }
      logger.warn('[AUTH /me] Token INVALID');
      return res.status(401).json({ message: 'Invalid token', authenticated: false });
    }
  } catch (error) {
    logger.error('[AUTH /me] Unexpected error:', error);
    res.status(500).json({ message: 'Auth check failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify the refresh token
    const JWT_SECRET = process.env.JWT_SECRET;

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      // Verify token type
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Invalid token type' });
      }

      // Check if token is blacklisted
      if (decoded.jti) {
        try {
          const blacklistCheck = await pool.query(
            'SELECT id FROM token_blacklist WHERE token_jti = $1',
            [decoded.jti]
          );

          if (blacklistCheck.rows.length > 0) {
            res.clearCookie('authToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: 'Refresh token has been revoked' });
          }
        } catch (blacklistError) {
          // Log the error but don't reject valid tokens if blacklist check fails
          logger.error('[REFRESH] Blacklist check failed:', blacklistError.message);
          logger.warn('[REFRESH] Continuing authentication despite blacklist check failure');
          // Continue to user verification - don't fail authentication
        }
      }

      // Get fresh user data from database
      const userResult = await pool.query(
        'SELECT user_uuid, email, name FROM users WHERE user_uuid = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        res.clearCookie('authToken');
        res.clearCookie('refreshToken');
        return res.status(401).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];

      // Generate new access token
      const newAccessToken = generateAccessToken({ id: user.user_uuid, email: user.email });

      // Set new access token cookie
      setAuthCookie(res, newAccessToken);

      res.json({
        message: 'Access token refreshed successfully',
        token: newAccessToken
      });
    } catch (err) {
      res.clearCookie('authToken');
      res.clearCookie('refreshToken');

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Refresh token has expired', requiresLogin: true });
      }
      return res.status(401).json({ message: 'Invalid refresh token', requiresLogin: true });
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Logout endpoint with token invalidation
router.post('/logout', async (req, res) => {
  try {
    // Get tokens from cookies or headers
    let accessToken = req.cookies?.authToken;
    let refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
      const authHeader = req.headers['authorization'];
      accessToken = authHeader && authHeader.split(' ')[1];
    }

    // Blacklist both access and refresh tokens
    const tokensToBlacklist = [accessToken, refreshToken].filter(Boolean);

    for (const token of tokensToBlacklist) {
      const decoded = jwt.decode(token);

      if (decoded && decoded.jti) {
        // Add token to blacklist
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
    // Log error but still clear cookies and return success
    logger.error('Logout error:', error);
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  }
});

module.exports = router;
