import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AxiosRequestHeaders } from 'axios';
import { resolveApiBaseUrl } from './runtimeConfig';

let csrfToken: string | null = null;
let csrfRequest: Promise<string | null> | null = null;

const METHODS_REQUIRING_CSRF = ['post', 'put', 'patch', 'delete'];

const shouldAttachCsrf = (method?: string): boolean => {
  if (!method) {
    return false;
  }
  return METHODS_REQUIRING_CSRF.includes(method.toLowerCase());
};

const fetchCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) {
    return csrfToken;
  }

  if (csrfRequest) {
    return csrfRequest;
  }

  // Use empty string for proxy mode (relative URLs)
  const apiUrl = resolveApiBaseUrl() ?? '';

  csrfRequest = axios
    .get(`${apiUrl}/csrf-token`, { withCredentials: true })
    .then((response) => {
      const token = response?.data?.csrfToken;
      csrfToken = typeof token === 'string' ? token : null;
      return csrfToken;
    })
    .catch((error) => {
      console.warn('Failed to fetch CSRF token', error);
      return null;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl() ?? '',  // Use empty string for proxy mode (relative URLs)
  withCredentials: true,
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (shouldAttachCsrf(config.method)) {
      const token = await fetchCsrfToken();
      if (token) {
        const headers: AxiosRequestHeaders = config.headers ?? {};
        headers['X-CSRF-Token'] = token;
        config.headers = headers;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _csrfRetry?: boolean;
    };

    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      const message = (error.response.data as any)?.message;
      if (typeof message === 'string' && message.toLowerCase().includes('csrf')) {
        originalRequest._csrfRetry = true;
        csrfToken = null;
        await fetchCsrfToken();
        return axiosInstance(originalRequest);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh attempt for /auth/me endpoint (checking auth status shouldn't trigger refresh)
      const isAuthMeRequest = originalRequest.url?.includes('/auth/me');
      if (isAuthMeRequest) {
        return Promise.reject(error);
      }

      // Check if refresh token cookie exists before attempting refresh
      const hasRefreshToken = document.cookie.split(';').some(cookie =>
        cookie.trim().startsWith('refreshToken=')
      );

      if (!hasRefreshToken) {
        // No refresh token available, redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Use empty string for proxy mode (relative URLs)
        const apiUrl = resolveApiBaseUrl() ?? '';
        await axios.post(`${apiUrl}/auth/refresh`, {}, { withCredentials: true });
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export class RequestManager {
  private static controllers = new Map<string, AbortController>();

  static createController(key: string): AbortController {
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
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}

export default axiosInstance;
