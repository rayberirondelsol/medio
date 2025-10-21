import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock axios to prevent network calls during tests
jest.mock('axios', () => ({
  defaults: { withCredentials: false, headers: { common: {} }, timeout: 10000 },
  create: jest.fn(() => ({
    defaults: { withCredentials: false, headers: { common: {} }, timeout: 10000 },
    interceptors: {
      request: { use: jest.fn(), handlers: [] },
      response: { use: jest.fn(), handlers: [] }
    }
  })),
  interceptors: {
    request: { use: jest.fn(), handlers: [] },
    response: { use: jest.fn(), handlers: [] }
  }
}));

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
});

test('renders App component and redirects to login when not authenticated', async () => {
  render(<App />);
  
  // Wait for the app to load and redirect to login (since user is not authenticated)
  await waitFor(() => {
    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
  });
});
