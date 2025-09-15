import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import axios from 'axios';

// Mock axios to prevent network calls during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the Login page since unauthenticated users will be redirected there
jest.mock('./pages/Login', () => {
  return {
    __esModule: true,
    default: () => <div>Login Page</div>
  };
});

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
  
  // Setup axios defaults mock
  mockedAxios.defaults = {
    withCredentials: false,
    headers: { common: {} },
    timeout: 10000
  } as any;
  
  // Setup axios.create mock
  mockedAxios.create = jest.fn(() => mockedAxios as any);
  
  // Setup interceptors mock
  mockedAxios.interceptors = {
    request: {
      use: jest.fn(),
      handlers: [] as any[]
    },
    response: {
      use: jest.fn(),
      handlers: [] as any[]
    }
  } as any;
});

test('renders App component and redirects to login when not authenticated', async () => {
  render(<App />);
  
  // Wait for the app to load and redirect to login (since user is not authenticated)
  await waitFor(() => {
    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
  });
});
