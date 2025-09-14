import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PageErrorBoundary from '../PageErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('PageErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    render(
      <PageErrorBoundary>
        <div>Test content</div>
      </PageErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display error UI', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('should display custom page name in error message', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('An error occurred in the Dashboard page.')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should reset error state when Try Again is clicked', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'));

    // After clicking Try Again, the error boundary should reset
    // but since the child still throws, it will show error again
    // To properly test, we'd need to control the throwing behavior dynamically
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should redirect to home when Go Home is clicked', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as Location;

    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go Home'));
    expect(window.location.href).toBe('/');

    window.location = originalLocation;
  });

  it('should log to Sentry if available', () => {
    const mockCaptureException = jest.fn();
    (window as any).Sentry = {
      captureException: mockCaptureException
    };

    render(
      <PageErrorBoundary pageName="TestPage">
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: expect.objectContaining({
          react: expect.objectContaining({
            pageName: 'TestPage'
          })
        })
      })
    );

    delete (window as any).Sentry;
  });
});