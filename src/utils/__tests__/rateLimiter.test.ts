import rateLimiter, { 
  rateLimit, 
  useRateLimiter, 
  throttle, 
  debounce 
} from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clearAll();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('isAllowed', () => {
    it('allows requests within the limit', () => {
      const options = { maxRequests: 3, windowMs: 1000 };
      
      expect(rateLimiter.isAllowed(options)).toBe(true);
      expect(rateLimiter.isAllowed(options)).toBe(true);
      expect(rateLimiter.isAllowed(options)).toBe(true);
    });

    it('blocks requests exceeding the limit', () => {
      const options = { maxRequests: 2, windowMs: 1000 };
      
      expect(rateLimiter.isAllowed(options)).toBe(true);
      expect(rateLimiter.isAllowed(options)).toBe(true);
      expect(rateLimiter.isAllowed(options)).toBe(false);
    });

    it('resets after the time window', (done) => {
      const options = { maxRequests: 1, windowMs: 100 };
      
      expect(rateLimiter.isAllowed(options)).toBe(true);
      expect(rateLimiter.isAllowed(options)).toBe(false);
      
      setTimeout(() => {
        expect(rateLimiter.isAllowed(options)).toBe(true);
        done();
      }, 150);
    });

    it('tracks different keys independently', () => {
      const options1 = { maxRequests: 1, windowMs: 1000, key: 'key1' };
      const options2 = { maxRequests: 1, windowMs: 1000, key: 'key2' };
      
      expect(rateLimiter.isAllowed(options1)).toBe(true);
      expect(rateLimiter.isAllowed(options2)).toBe(true);
      expect(rateLimiter.isAllowed(options1)).toBe(false);
      expect(rateLimiter.isAllowed(options2)).toBe(false);
    });
  });

  describe('getRemainingRequests', () => {
    it('returns correct remaining requests', () => {
      const options = { maxRequests: 3, windowMs: 1000, key: 'test' };
      
      expect(rateLimiter.getRemainingRequests('test', 3)).toBe(3);
      
      rateLimiter.isAllowed(options);
      expect(rateLimiter.getRemainingRequests('test', 3)).toBe(2);
      
      rateLimiter.isAllowed(options);
      expect(rateLimiter.getRemainingRequests('test', 3)).toBe(1);
      
      rateLimiter.isAllowed(options);
      expect(rateLimiter.getRemainingRequests('test', 3)).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('returns time until reset', () => {
      const options = { maxRequests: 1, windowMs: 1000, key: 'test' };
      
      expect(rateLimiter.getResetTime('test')).toBe(0);
      
      rateLimiter.isAllowed(options);
      const resetTime = rateLimiter.getResetTime('test');
      
      expect(resetTime).toBeGreaterThan(900);
      expect(resetTime).toBeLessThanOrEqual(1000);
    });
  });

  describe('reset', () => {
    it('resets rate limit for a specific key', () => {
      const options = { maxRequests: 1, windowMs: 1000, key: 'test' };
      
      rateLimiter.isAllowed(options);
      expect(rateLimiter.isAllowed(options)).toBe(false);
      
      rateLimiter.reset('test');
      expect(rateLimiter.isAllowed(options)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('clears all rate limits', () => {
      const options1 = { maxRequests: 1, windowMs: 1000, key: 'key1' };
      const options2 = { maxRequests: 1, windowMs: 1000, key: 'key2' };
      
      rateLimiter.isAllowed(options1);
      rateLimiter.isAllowed(options2);
      
      expect(rateLimiter.isAllowed(options1)).toBe(false);
      expect(rateLimiter.isAllowed(options2)).toBe(false);
      
      rateLimiter.clearAll();
      
      expect(rateLimiter.isAllowed(options1)).toBe(true);
      expect(rateLimiter.isAllowed(options2)).toBe(true);
    });
  });
});

describe('rateLimit decorator', () => {
  it('rate limits decorated methods', async () => {
    class TestClass {
      callCount = 0;
      
      @rateLimit({ maxRequests: 2, windowMs: 1000 })
      async testMethod() {
        this.callCount++;
        return 'success';
      }
    }
    
    const instance = new TestClass();
    
    await expect(instance.testMethod()).resolves.toBe('success');
    await expect(instance.testMethod()).resolves.toBe('success');
    await expect(instance.testMethod()).rejects.toThrow('Rate limit exceeded');
    
    expect(instance.callCount).toBe(2);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throttles function calls', () => {
    const mockFn = jest.fn();
    const throttled = throttle(mockFn, 100);
    
    throttled('call1');
    throttled('call2');
    throttled('call3');
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call1');
    
    jest.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('call3');
  });

  it('allows immediate call after delay', () => {
    const mockFn = jest.fn();
    const throttled = throttle(mockFn, 100);
    
    throttled('call1');
    jest.advanceTimersByTime(100);
    throttled('call2');
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('call2');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces function calls', () => {
    const mockFn = jest.fn();
    const debounced = debounce(mockFn, 100);
    
    debounced('call1');
    debounced('call2');
    debounced('call3');
    
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call3');
  });

  it('resets timer on each call', () => {
    const mockFn = jest.fn();
    const debounced = debounce(mockFn, 100);
    
    debounced('call1');
    jest.advanceTimersByTime(50);
    
    debounced('call2');
    jest.advanceTimersByTime(50);
    
    debounced('call3');
    jest.advanceTimersByTime(50);
    
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(50);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call3');
  });
});

describe('useRateLimiter hook', () => {
  it('provides rate limiter interface', () => {
    const hook = useRateLimiter({ maxRequests: 2, windowMs: 1000, key: 'hook-test' });
    
    expect(hook.isAllowed()).toBe(true);
    expect(hook.getRemainingRequests()).toBe(1);
    
    expect(hook.isAllowed()).toBe(true);
    expect(hook.getRemainingRequests()).toBe(0);
    
    expect(hook.isAllowed()).toBe(false);
    
    const resetTime = hook.getResetTime();
    expect(resetTime).toBeGreaterThan(0);
    expect(resetTime).toBeLessThanOrEqual(1000);
    
    hook.reset();
    expect(hook.isAllowed()).toBe(true);
  });
});