import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import axiosInstance, { RequestManager } from '../utils/axiosConfig';
import { resolveApiBaseUrl } from '../utils/runtimeConfig';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getApiUrl = () => {
  const url = resolveApiBaseUrl();
  if (!url) {
    throw new Error('Medio API endpoint is not configured. Please set the REACT_APP_API_URL environment variable.');
  }
  return url;
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const apiUrl = getApiUrl();

        // First try to verify with backend using httpOnly cookie
        try {
          const response = await axiosInstance.get(`${apiUrl}/auth/me`, {
            timeout: 5000
          });

          if (response.data.authenticated && response.data.user) {
            setUser(response.data.user);
            // Ensure localStorage is up to date with verified user data
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setIsLoading(false);
            return;
          }
        } catch (authCheckError) {
          // If auth check fails (401), clear localStorage
          if (axios.isAxiosError(authCheckError) && authCheckError.response?.status === 401) {
            localStorage.removeItem('user');
            setUser(null);
            setIsLoading(false);
            return;
          }
          // If it's a network error or other issue, continue to check localStorage
          console.debug('Auth verification failed:', authCheckError);
        }

        // Fallback: Check localStorage if server check failed or timed out
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Failed to parse stored user:', error);
            localStorage.removeItem('user');
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Auth provider initialization error:', error);
        setIsLoading(false);
      }
    };

    verifyAuth();

    // Cleanup on unmount
    return () => {
      RequestManager.cancelAllRequests();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const controller = RequestManager.createController('login');
    
    try {
      const apiUrl = getApiUrl();
      const response = await axiosInstance.post(`${apiUrl}/auth/login`, 
        { email, password },
        { signal: controller.signal }
      );
      const { user } = response.data;
      
      setUser(user);
      
      // Store user info only (token is in httpOnly cookie)
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') {
          throw new Error('Login request was cancelled');
        }
        throw new Error(error.response?.data?.message || 'Login failed');
      }
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const controller = RequestManager.createController('register');
    
    try {
      const apiUrl = getApiUrl();
      const response = await axiosInstance.post(`${apiUrl}/auth/register`, 
        { email, password, name },
        { signal: controller.signal }
      );
      const { user } = response.data;
      
      setUser(user);
      
      // Store user info only (token is in httpOnly cookie)
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') {
          throw new Error('Registration request was cancelled');
        }
        throw new Error(error.response?.data?.message || 'Registration failed');
      }
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    const controller = RequestManager.createController('logout');
    
    try {
      // Call logout endpoint to clear httpOnly cookie
      const apiUrl = getApiUrl();
      await axiosInstance.post(`${apiUrl}/auth/logout`, {}, { signal: controller.signal });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      RequestManager.cancelAllRequests();
    }
    
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

