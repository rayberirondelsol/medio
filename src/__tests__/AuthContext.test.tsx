import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Test component to access auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, register } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  
  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password');
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const handleRegister = async () => {
    try {
      await register('test@example.com', 'password', 'Test User');
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      {error && <div data-testid="error">{error}</div>}
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    jest.clearAllMocks();
  });

  it('should initialize with no authenticated user', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
  });

  it('should login successfully and store user info only (not token)', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'test-token'
      }
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    });

    // Verify that token is NOT stored in localStorage
    expect(localStorage.getItem('token')).toBeNull();
    
    // Verify that user info is stored
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    expect(storedUser).toEqual(mockUser);
  });

  it('should handle login failure', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    });
  });

  it('should register successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'test-token'
      }
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    const registerButton = screen.getByText('Register');
    
    await act(async () => {
      registerButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    });
  });

  it('should logout and clear user data', async () => {
    // Set initial authenticated state
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));

    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    });

    // Verify localStorage is cleared
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });
});