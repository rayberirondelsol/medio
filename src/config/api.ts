import axios from 'axios';
import { resolveApiBaseUrlOrDefault } from '../utils/runtimeConfig';

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 seconds timeout for all requests
axios.defaults.withCredentials = true; // Include cookies in requests

// Create axios instance with custom configuration
// IMPORTANT: Use relative URL (/api) as fallback for BFF proxy mode
// When REACT_APP_API_URL is empty, requests go through the proxy (same origin)
// When REACT_APP_API_URL is set, requests go directly to backend (cross-origin)
const apiClient = axios.create({
  baseURL: resolveApiBaseUrlOrDefault('/api'),
  timeout: 10000, // 10 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout: The request took too long to complete');
    } else if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      console.error('Rate limited: Too many requests');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { axios };
