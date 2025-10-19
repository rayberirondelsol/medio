const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for NFC chip registration endpoint
 * NFR-021: 10 requests per 15 minutes per user
 */
const nfcChipRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: 'Too many chip registration attempts',
    retryAfter: null // Will be populated by the library
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Rate limit per user (requires authentication)
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    const retryAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    res.status(429).json({
      error: 'Too many chip registration attempts',
      retryAfter: retryAfter
    });
  }
});

/**
 * Rate limiter for NFC chip deletion endpoint
 * NFR-022: 20 requests per 15 minutes per user
 */
const nfcChipDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'Too many deletion requests',
    retryAfter: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    const retryAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    res.status(429).json({
      error: 'Too many deletion requests',
      retryAfter: retryAfter
    });
  }
});

/**
 * Rate limiter for NFC chip listing endpoint
 * NFR-023: 60 requests per 15 minutes per user
 */
const nfcChipListingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  message: {
    error: 'Too many listing requests',
    retryAfter: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    const retryAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    res.status(429).json({
      error: 'Too many listing requests',
      retryAfter: retryAfter
    });
  }
});

module.exports = {
  nfcChipRegistrationLimiter,
  nfcChipDeletionLimiter,
  nfcChipListingLimiter
};
