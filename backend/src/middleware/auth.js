const jwt = require('jsonwebtoken');
const { validateJWTSecret } = require('../utils/crypto');

// Validate JWT secret on startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!validateJWTSecret(JWT_SECRET)) {
  throw new Error('Invalid or missing JWT_SECRET. Please set a secure JWT_SECRET environment variable (minimum 64 characters).');
}

const authenticateToken = (req, res, next) => {
  // Try to get token from cookie first (more secure), then Authorization header
  let token = req.cookies?.authToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
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
  generateToken
};