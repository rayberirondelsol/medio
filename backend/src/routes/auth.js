const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to set secure cookie
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' requires Secure; 'lax' is safer for development
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined // Add explicit domain in production if set
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
        'SELECT id FROM users WHERE email = $1',
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
      const token = generateToken(user);

      // Set secure httpOnly cookie
      setAuthCookie(res, token);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        // Still send token for backward compatibility, but prefer cookie
        token
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
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
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

      const token = generateToken(user);

      // Set secure httpOnly cookie
      setAuthCookie(res, token);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        // Still send token for backward compatibility, but prefer cookie
        token
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
    // Get token from cookie or header
    let token = req.cookies?.authToken;

    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated', authenticated: false });
    }

    // Verify the token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if token is blacklisted
      if (decoded.jti) {
        const blacklistCheck = await pool.query(
          'SELECT id FROM token_blacklist WHERE token_jti = $1',
          [decoded.jti]
        );

        if (blacklistCheck.rows.length > 0) {
          res.clearCookie('authToken');
          return res.status(401).json({ message: 'Token has been revoked', authenticated: false });
        }
      }

      // Get fresh user data from database
      const userResult = await pool.query(
        'SELECT id, email, name FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        res.clearCookie('authToken');
        return res.status(401).json({ message: 'User not found', authenticated: false });
      }

      const user = userResult.rows[0];
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      res.clearCookie('authToken');
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired', authenticated: false });
      }
      return res.status(401).json({ message: 'Invalid token', authenticated: false });
    }
  } catch (error) {
    logger.error('Auth check error:', error);
    res.status(500).json({ message: 'Auth check failed' });
  }
});

// Logout endpoint with token invalidation
router.post('/logout', async (req, res) => {
  try {
    // Get token from cookie or header
    let token = req.cookies?.authToken;
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }

    if (token) {
      // Decode token to get JTI and expiry
      const jwt = require('jsonwebtoken');
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

    // Clear the cookie
    res.clearCookie('authToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Log error but still clear cookie and return success
    logger.error('Logout error:', error);
    res.clearCookie('authToken');
    res.json({ message: 'Logged out successfully' });
  }
});

module.exports = router;
