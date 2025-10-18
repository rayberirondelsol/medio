const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateJWTSecret } = require('../utils/crypto');
const pool = require('../db/pool');

// Validate JWT secret on startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!validateJWTSecret(JWT_SECRET)) {
  throw new Error('Invalid or missing JWT_SECRET. Please set a secure JWT_SECRET environment variable (minimum 64 characters).');
}

const authenticateToken = async (req, res, next) => {
  // Try to get token from cookie first (more secure), then Authorization header
  let token = req.cookies?.authToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is blacklisted
    if (decoded.jti) {
      const blacklistCheck = await pool.query(
        'SELECT id FROM token_blacklist WHERE token_jti = $1',
        [decoded.jti]
      );
      
      if (blacklistCheck.rows.length > 0) {
        return res.status(403).json({ message: 'Token has been revoked' });
      }
    }
    
    req.user = decoded;
    req.token = token;
    req.tokenJti = decoded.jti;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token has expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const generateToken = (user) => {
  const jti = crypto.randomBytes(16).toString('hex');

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      jti: jti
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'medio-platform',
      audience: 'medio-users'
    }
  );
};

/**
 * Generate access token (short-lived, 15 minutes)
 * Used for API authentication
 */
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

/**
 * Generate refresh token (long-lived, 7 days)
 * Used to obtain new access tokens
 */
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

module.exports = {
  authenticateToken,
  generateToken,
  generateAccessToken,
  generateRefreshToken
};