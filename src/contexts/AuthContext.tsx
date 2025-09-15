import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import axiosInstance, { RequestManager } from '../utils/axiosConfig';

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

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error('REACT_APP_API_URL environment variable is required');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to restore user from localStorage (not token - using httpOnly cookies)
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
    
    // Cleanup on unmount
    return () => {
      RequestManager.cancelAllRequests();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const controller = RequestManager.createController('login');
    
    try {
      const response = await axiosInstance.post(`${API_URL}/auth/login`, 
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
      const response = await axiosInstance.post(`${API_URL}/auth/register`, 
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
      await axiosInstance.post(`${API_URL}/auth/logout`, {}, { signal: controller.signal });
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