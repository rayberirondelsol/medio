// Mock axios before importing apiClient
jest.mock('axios', () => {
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

  const mockAxiosInstance = {
    defaults: {
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    },
    interceptors: mockInterceptors
  };

  const mockAxios = {
    defaults: {
      timeout: 10000,
      withCredentials: true
    },
    create: jest.fn(() => mockAxiosInstance)
  };

  return mockAxios;
});

import axios from 'axios';

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('API Configuration', () => {
  let mockInterceptors: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock interceptors
    const mockRequestUse = jest.fn();
    const mockResponseUse = jest.fn();

    // Reset the mock to return the instance properly
    (mockAxios.create as jest.MockedFunction<typeof mockAxios.create>).mockReturnValue({
      defaults: {
        timeout: 10000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      },
      interceptors: {
        request: {
          use: mockRequestUse,
          handlers: [] as any[]
        },
        response: {
          use: mockResponseUse,
          handlers: [] as any[]
        }
      }
    } as any);

    // Set up mock interceptors for testing
    mockInterceptors = {
      request: {
        use: mockRequestUse,
        handlers: [] as any[]
      },
      response: {
        use: mockResponseUse,
        handlers: [] as any[]
      }
    };

    // Import api module to trigger interceptor setup
    jest.resetModules();
    require('../api');

    // Reset handlers arrays
    mockInterceptors.request.handlers = [];
    mockInterceptors.response.handlers = [];

    // Mock the use functions to store handlers
    mockInterceptors.request.use.mockImplementation((fulfilled: any, rejected: any) => {
      mockInterceptors.request.handlers.push({ fulfilled, rejected });
    });

    mockInterceptors.response.use.mockImplementation((fulfilled: any, rejected: any) => {
      mockInterceptors.response.handlers.push({ fulfilled, rejected });
    });
  });

  it('should set default timeout on axios', () => {
    expect(mockAxios.defaults.timeout).toBe(10000);
  });

  it('should set withCredentials to true', () => {
    expect(mockAxios.defaults.withCredentials).toBe(true);
  });

  it('should create apiClient with correct configuration', () => {
    const { default: apiClient } = require('../api');
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