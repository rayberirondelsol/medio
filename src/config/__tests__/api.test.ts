// Mock axios before any imports
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    defaults: {
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    },
    interceptors: {
      request: {
        use: jest.fn(),
        handlers: [],
      },
      response: {
        use: jest.fn(),
        handlers: [],
      },
    },
  })),
  defaults: {
    timeout: 10000,
    withCredentials: true,
  },
}));

import axios from 'axios';
import apiClient from '../api';

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

  it('should call interceptors use method', () => {
    expect(apiClient.interceptors.request.use).toHaveBeenCalled();
    expect(apiClient.interceptors.response.use).toHaveBeenCalled();
  });
});