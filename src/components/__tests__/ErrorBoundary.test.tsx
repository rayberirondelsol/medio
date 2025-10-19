/**
 * T011: ErrorBoundary Sentry Integration Tests
 *
 * TDD RED Phase: These tests verify ErrorBoundary logs errors to Sentry.
 * They will FAIL until Sentry.captureException is uncommented in ErrorBoundary.tsx.
 *
 * Tests:
 * 1. ErrorBoundary catches thrown error
 * 2. Sentry.captureException is called with error and componentStack
 * 3. Error logging only happens in production mode
 * 4. Fallback UI is rendered
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../common/ErrorBoundary';
import * as Sentry from '@sentry/react';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error for ErrorBoundary');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();

    // Suppress error logs in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Store original NODE_ENV
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore console.error
    (console.error as jest.Mock).mockRestore();

    // Restore NODE_ENV
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('T011-1: ErrorBoundary catches thrown error and renders fallback UI', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Fallback UI is displayed
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/i)).toBeInTheDocument();
  });

  test('T011-2: ErrorBoundary does NOT render fallback when no error occurs', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Assert: Children render normally
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText(/Oops! Something went wrong/i)).not.toBeInTheDocument();
  });

  test('T011-3: Sentry.captureException is called with error and componentStack in production', () => {
    // Arrange: Set production mode
    process.env.NODE_ENV = 'production';

    // Act: Render component that throws
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Sentry.captureException was called
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Verify it was called with the error
    const captureCall = (Sentry.captureException as jest.Mock).mock.calls[0];
    expect(captureCall[0]).toBeInstanceOf(Error);
    expect(captureCall[0].message).toBe('Test error for ErrorBoundary');

    // Verify it includes component stack context
    expect(captureCall[1]).toBeDefined();
    expect(captureCall[1].contexts).toBeDefined();
    expect(captureCall[1].contexts.react).toBeDefined();
    expect(captureCall[1].contexts.react.componentStack).toBeDefined();
  });

  test('T011-4: Sentry.captureException is NOT called in development mode', () => {
    // Arrange: Set development mode explicitly
    process.env.NODE_ENV = 'development';

    // Act: Render component that throws
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Sentry.captureException was NOT called
    expect(Sentry.captureException).not.toHaveBeenCalled();

    // But error should still be caught and UI should render
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
  });

  test('T011-5: Fallback UI renders with Try Again button', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Try Again button is present
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
  });

  test('T011-6: Custom fallback UI can be provided via props', () => {
    // Arrange
    const customFallback = <div>Custom Error UI</div>;

    // Act
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Custom fallback is rendered instead of default
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.queryByText(/Oops! Something went wrong/i)).not.toBeInTheDocument();
  });

  test('T011-7: Error details are shown in development mode only', () => {
    // Arrange: Set development mode
    process.env.NODE_ENV = 'development';

    // Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Error details should be visible in dev
    expect(screen.getByText(/Error Details \(Development Only\)/i)).toBeInTheDocument();
  });

  test('T011-8: Error details are hidden in production mode', () => {
    // Arrange: Set production mode
    process.env.NODE_ENV = 'production';

    // Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Assert: Error details should NOT be visible in production
    expect(screen.queryByText(/Error Details \(Development Only\)/i)).not.toBeInTheDocument();
  });
});
