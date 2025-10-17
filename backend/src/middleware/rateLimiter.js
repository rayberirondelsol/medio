/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse by limiting the number of requests
 * per IP address within a time window.
 *
 * T081: Rate limiting for /api/videos/metadata endpoint
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for video metadata fetching endpoint
 *
 * Limits: 30 requests per 15 minutes per IP
 * - Prevents API quota abuse
 * - Allows reasonable usage for legitimate users
 * - Returns 429 status code when limit exceeded
 */
const metadataRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many metadata requests from this IP, please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  },
  // Custom key generator (default is IP address)
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip || req.connection.remoteAddress;
  },
  // Handler for when rate limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many metadata requests from this IP, please try again in 15 minutes.',
      retryAfter: '15 minutes',
      limit: 30,
      windowMs: 15 * 60 * 1000
    });
  }
});

/**
 * General API rate limiter
 *
 * Limits: 100 requests per 15 minutes per IP
 * - More lenient than metadata endpoint
 * - Protects against general API abuse
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  }
});

/**
 * Strict rate limiter for authentication endpoints
 *
 * Limits: 5 requests per 15 minutes per IP
 * - Prevents brute force attacks
 * - Very restrictive for security
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  }
});

module.exports = {
  metadataRateLimiter,
  generalRateLimiter,
  authRateLimiter
};
