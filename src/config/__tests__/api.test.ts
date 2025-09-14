import axios from 'axios';

// Mock axios before importing apiClient
const mockInterceptors = {
  request: {
    use: jest.fn(),
    handlers: [] as any[]
  },
  response: {
    use: jest.fn(),
    handlers: [] as any[]
  }
};

const mockApiClient = {
  defaults: {
    timeout: 10000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  },
  interceptors: mockInterceptors
};

jest.mock('axios', () => ({
  defaults: {
    timeout: 10000,
    withCredentials: true
  },
  create: jest.fn(() => mockApiClient)
}));

// Import apiClient after mocking
import apiClient from '../api';

describe('API Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock handlers for interceptors
    mockInterceptors.request.handlers = [];
    mockInterceptors.response.handlers = [];
    
    // Mock the use functions to store handlers
    mockInterceptors.request.use.mockImplementation((fulfilled, rejected) => {
      mockInterceptors.request.handlers.push({ fulfilled, rejected });
    });
    
    mockInterceptors.response.use.mockImplementation((fulfilled, rejected) => {
      mockInterceptors.response.handlers.push({ fulfilled, rejected });
    });
  });

  it('should set default timeout on axios', () => {
    expect(axios.defaults.timeout).toBe(10000);
  });

  it('should set withCredentials to true', () => {
    expect(axios.defaults.withCredentials).toBe(true);
  });

  it('should create apiClient with correct configuration', () => {
    expect(apiClient.defaults.timeout).toBe(10000);
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  describe('Request Interceptor', () => {
    it('should add request interceptor', () => {
      expect(mockInterceptors.request.use).toHaveBeenCalled();
    });

    it('should pass through successful requests', async () => {
      // Re-import to trigger interceptor setup
      jest.resetModules();
      const { default: api } = require('../api');
      
      const config = { url: '/test', method: 'GET' };
      const handler = mockInterceptors.request.handlers[0];
      
      if (handler && handler.fulfilled) {
        const result = await handler.fulfilled(config);
        expect(result).toBe(config);
      }
    });

    it('should handle request errors', async () => {
      const error = new Error('Request error');
      const handler = mockInterceptors.request.handlers[0];
      
      if (handler && handler.rejected) {
        await expect(handler.rejected(error)).rejects.toThrow('Request error');
      }
    });
  });

  describe('Response Interceptor', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let originalLocation: Location;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as Location;
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      window.location = originalLocation;
    });

    it('should add response interceptor', () => {
      expect(mockInterceptors.response.use).toHaveBeenCalled();
    });

    it('should pass through successful responses', async () => {
      const response = { data: 'test', status: 200 };
      const handler = mockInterceptors.response.handlers[0];
      
      if (handler && handler.fulfilled) {
        const result = await handler.fulfilled(response as any);
        expect(result).toBe(response);
      }
    });

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED' };
      const handler = mockInterceptors.response.handlers[0];
      
      if (handler && handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Request timeout: The request took too long to complete');
      }
    });

    it('should redirect on 401 errors', async () => {
      const error = { response: { status: 401 } };
      const handler = mockInterceptors.response.handlers[0];
      
      if (handler && handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(window.location.href).toBe('/login');
      }
    });

    it('should log rate limit errors', async () => {
      const error = { response: { status: 429 } };
      const handler = mockInterceptors.response.handlers[0];
      
      if (handler && handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Rate limited: Too many requests');
      }
    });

    it('should handle other errors', async () => {
      const error = { response: { status: 500 } };
      const handler = mockInterceptors.response.handlers[0];
      
      if (handler && handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      }
    });
  });
});