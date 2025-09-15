import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with default config
const axiosInstance = axios.create({
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor for adding auth headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any auth headers or tokens here if needed
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const API_URL = process.env.REACT_APP_API_URL;
        if (API_URL) {
          await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Create AbortController manager for request cancellation
export class RequestManager {
  private static controllers = new Map<string, AbortController>();
  
  static createController(key: string): AbortController {
    // Cancel any existing request with the same key
    this.cancelRequest(key);
    
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }
  
  static cancelRequest(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }
  
  static cancelAllRequests(): void {
    this.controllers.forEach(controller => controller.abort());
    this.controllers.clear();
  }
}

export default axiosInstance;