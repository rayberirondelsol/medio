/**
 * Rate limiting configuration constants
 * 
 * IMPORTANT: These are client-side rate limits only.
 * Server-side rate limiting must be implemented for production security.
 */

export const RATE_LIMITS = {
  // API rate limits
  API_DEFAULT: {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  },
  
  // Video operations
  VIDEO_DELETE: {
    maxRequests: 5,
    windowMs: 60000 // 1 minute
  },
  
  VIDEO_UPLOAD: {
    maxRequests: 3,
    windowMs: 60000 // 1 minute
  },
  
  VIDEO_FETCH: {
    maxRequests: 20,
    windowMs: 60000 // 1 minute
  },
  
  // Search operations
  SEARCH: {
    maxRequests: 30,
    windowMs: 60000 // 1 minute
  },
  
  // Authentication
  AUTH_LOGIN: {
    maxRequests: 5,
    windowMs: 300000 // 5 minutes
  },
  
  AUTH_REGISTER: {
    maxRequests: 3,
    windowMs: 300000 // 5 minutes
  }
} as const;

// Cleanup configuration
export const RATE_LIMITER_CONFIG = {
  CLEANUP_INTERVAL_MS: 60000 // Clean up expired entries every minute
} as const;

// UI throttle/debounce delays
export const UI_DELAYS = {
  SEARCH_DEBOUNCE: 300, // ms
  SCROLL_THROTTLE: 100, // ms
  RESIZE_DEBOUNCE: 250  // ms
} as const;