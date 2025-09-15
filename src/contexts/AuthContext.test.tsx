import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Test component that uses the auth context
const TestComponent = () => {
  const { user, login, logout, isLoading } = useAuth();
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {user ? (
        <div>
          <span>Logged in as: {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => login('test@example.com', 'password')}
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
    
    // Setup axios defaults
    mockedAxios.defaults = {
      withCredentials: false,
      headers: { common: {} }
    } as any;
  });

  it('should provide authentication context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/Login/)).toBeInTheDocument();
  });

  it('should login successfully', async () => {
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
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      await userEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Logged in as: Test User')).toBeInTheDocument();
    });

    // Verify localStorage only stores user, not token
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    expect(localStorage.getItem('token')).toBeNull();
    
    // Verify axios was configured for cookies
    expect(mockedAxios.defaults.withCredentials).toBe(true);
  });

  it('should handle login failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    const TestComponentWithError = () => {
      const { user, login, logout, isLoading } = useAuth();
      const [error, setError] = React.useState<string | null>(null);
      
      const handleLogin = async () => {
        try {
          await login('test@example.com', 'password');
        } catch (err: any) {
          setError(err.message);
        }
      };
      
      return (
        <div>
          {error && <div>Error: {error}</div>}
          {!user && (
            <button onClick={handleLogin}>Login</button>
          )}
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponentWithError />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      await userEvent.click(loginButton);
    });

    // Check that error was displayed
    await waitFor(() => {
      expect(screen.getByText('Error: Invalid credentials')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should logout successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    // Setup initial logged in state
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    mockedAxios.post.mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Logged in as: Test User')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      await userEvent.click(logoutButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    // Verify localStorage was cleared
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should restore user from localStorage on mount', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Logged in as: Test User')).toBeInTheDocument();
    });
  });

  it('should not restore token from localStorage (security improvement)', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    // Simulate old behavior where token was in localStorage
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should not set Authorization header from localStorage token
    expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined();
  });
});