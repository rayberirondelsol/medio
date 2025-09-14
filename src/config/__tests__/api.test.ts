import axios from 'axios';
import apiClient from '../api';

// Mock axios
jest.mock('axios');

describe('API Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should pass through successful requests', async () => {
      const config = { url: '/test', method: 'GET' };
      const handler = apiClient.interceptors.request.handlers[0];
      
      if (handler.fulfilled) {
        const result = await handler.fulfilled(config);
        expect(result).toBe(config);
      }
    });

    it('should handle request errors', async () => {
      const error = new Error('Request error');
      const handler = apiClient.interceptors.request.handlers[0];
      
      if (handler.rejected) {
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

    it('should pass through successful responses', async () => {
      const response = { data: 'test', status: 200 };
      const handler = apiClient.interceptors.response.handlers[0];
      
      if (handler.fulfilled) {
        const result = await handler.fulfilled(response as any);
        expect(result).toBe(response);
      }
    });

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED' };
      const handler = apiClient.interceptors.response.handlers[0];
      
      if (handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Request timeout: The request took too long to complete');
      }
    });

    it('should redirect on 401 errors', async () => {
      const error = { response: { status: 401 } };
      const handler = apiClient.interceptors.response.handlers[0];
      
      if (handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(window.location.href).toBe('/login');
      }
    });

    it('should log rate limit errors', async () => {
      const error = { response: { status: 429 } };
      const handler = apiClient.interceptors.response.handlers[0];
      
      if (handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Rate limited: Too many requests');
      }
    });

    it('should handle other errors', async () => {
      const error = { response: { status: 500 } };
      const handler = apiClient.interceptors.response.handlers[0];
      
      if (handler.rejected) {
        await expect(handler.rejected(error)).rejects.toEqual(error);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      }
    });
  });
});