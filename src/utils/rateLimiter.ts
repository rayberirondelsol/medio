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
 * Hook for using rate limiter in React components
 */
export function useRateLimiter(options: RateLimiterOptions) {
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
  
  return function (...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
        timeout = null;
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
  
  return function (...args: Parameters<T>) {
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