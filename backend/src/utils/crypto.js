const crypto = require('crypto');

/**
 * Generate a cryptographically secure random secret
 * @param {number} length - Length of the secret in bytes (default 32)
 * @returns {string} Hex-encoded random secret
 */
function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate JWT secret meets security requirements
 * @param {string} secret - The secret to validate
 * @returns {boolean} True if secret meets requirements
 */
function validateJWTSecret(secret) {
  // Minimum 256 bits (32 bytes) for HS256
  if (!secret || secret.length < 64) { // 64 hex chars = 32 bytes
    console.error('JWT_SECRET must be at least 64 characters (32 bytes) for proper security');
    return false;
  }
  
  // Check for obvious weak patterns
  const weakPatterns = [
    'secret', 'password', '12345', 'admin', 'test', 
    'your-secret-key', 'change-me', 'default'
  ];
  
  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      console.error(`JWT_SECRET contains weak pattern: ${pattern}`);
      return false;
    }
  }
  
  return true;
}

module.exports = {
  generateSecureSecret,
  validateJWTSecret
};