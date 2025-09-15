/**
 * CLIENT-SIDE RATE LIMITER
 * 
 * This is a client-side rate limiter implementation that helps prevent
 * excessive API calls from the frontend. However, it has limitations:
 * 
 * IMPORTANT: Server-side rate limiting is REQUIRED for production
 * - Client-side rate limiting can be bypassed by refreshing the page
 * - Users can clear localStorage/sessionStorage to reset limits
 * - Malicious users can modify client-side JavaScript
 * 
 * RECOMMENDED SERVER-SIDE IMPLEMENTATION:
 * 1. Use middleware like express-rate-limit for Node.js
 * 2. Implement rate limiting at the API Gateway level (AWS API Gateway, Kong, etc.)
 * 3. Use Redis or similar for distributed rate limiting across multiple servers
 * 4. Consider implementing rate limiting by:
 *    - IP address
 *    - User authentication token
 *    - API key
 *    - Combination of factors
 * 
 * This client-side implementation should be used only as a UX enhancement
 * to provide immediate feedback and reduce unnecessary server load,
 * NOT as a security measure.
 */

import { RATE_LIMITER_CONFIG } from '../constants/rateLimits';

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  key?: string;
}

interface RateLimiterState {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimiterState> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;
  
  constructor() {
    this.startCleanupTimer();
  }
  
  /**
   * Start automatic cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, RATE_LIMITER_CONFIG.CLEANUP_INTERVAL_MS);
  }
  
  /**
   * Clean up expired rate limit entries to prevent memory leaks
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.limits.forEach((state, key) => {
      if (now >= state.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.limits.delete(key));
  }
  
  /**
   * Check if a request is allowed under the rate limit
   * @param options Rate limiter options
   * @returns true if request is allowed, false if rate limited
   */
  public isAllowed(options: RateLimiterOptions): boolean {
    const key = options.key || 'default';
    const now = Date.now();
    const state = this.limits.get(key);
    
    if (!state || now >= state.resetTime) {
      // Create new window
      this.limits.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return true;
    }
    
    if (state.count < options.maxRequests) {
      // Increment counter
      state.count++;
      return true;
    }
    
    // Rate limited
    return false;
  }
  
  /**
   * Get remaining requests for a key
   * @param key The rate limit key
   * @param maxRequests Maximum requests allowed
   * @returns Number of remaining requests
   */
  public getRemainingRequests(key: string, maxRequests: number): number {
    const state = this.limits.get(key);
    if (!state || Date.now() >= state.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - state.count);
  }
  
  /**
   * Get time until rate limit resets
   * @param key The rate limit key
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  public getResetTime(key: string): number {
    const state = this.limits.get(key);
    if (!state || Date.now() >= state.resetTime) {
      return 0;
    }
    return state.resetTime - Date.now();
  }
  
  /**
   * Reset rate limit for a specific key
   * @param key The rate limit key to reset
   */
  public reset(key: string = 'default'): void {
    this.limits.delete(key);
  }
  
  /**
   * Clear all rate limits
   */
  public clearAll(): void {
    this.limits.clear();
  }
  
  /**
   * Destroy the rate limiter and stop cleanup timer
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

/**
 * Decorator for rate limiting async functions
 * @param options Rate limiter options
 */
export function rateLimit(options: RateLimiterOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = options.key || `${target.constructor.name}.${propertyKey}`;
      
      if (!rateLimiter.isAllowed({ ...options, key })) {
        const resetTime = rateLimiter.getResetTime(key);
        throw new Error(
          `Rate limit exceeded. Please try again in ${Math.ceil(resetTime / 1000)} seconds.`
        );
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Rate limiter utility functions for use in React components
 * 
 * NOTE: This is not a React hook despite the 'use' prefix.
 * It returns utility functions that can be called anywhere.
 * If you need React state integration, wrap these utilities
 * in your own custom hook.
 */
export function createRateLimiterUtils(options: RateLimiterOptions) {
  const isAllowed = (): boolean => {
    return rateLimiter.isAllowed(options);
  };
  
  const getRemainingRequests = (): number => {
    return rateLimiter.getRemainingRequests(
      options.key || 'default',
      options.maxRequests
    );
  };
  
  const getResetTime = (): number => {
    return rateLimiter.getResetTime(options.key || 'default');
  };
  
  const reset = (): void => {
    rateLimiter.reset(options.key);
  };
  
  return {
    isAllowed,
    getRemainingRequests,
    getResetTime,
    reset
  };
}

/**
 * Throttle function calls
 * @param func Function to throttle
 * @param delay Minimum delay between calls in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args; // Always store the most recent arguments

    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
        timeout = null;
        lastArgs = null;
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Debounce function calls
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, delay);
  };
}

export default rateLimiter;