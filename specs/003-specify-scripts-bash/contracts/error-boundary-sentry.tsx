// Contract: ErrorBoundary Sentry Integration
// Feature: 003-specify-scripts-bash
// Purpose: Define expected Sentry error logging in ErrorBoundary component

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * REQUIRED CHANGES to src/components/common/ErrorBoundary.tsx:
 *
 * 1. ADD import: import * as Sentry from '@sentry/react';
 *
 * 2. UNCOMMENT Sentry.captureException in componentDidCatch method
 *
 * 3. ENSURE contextual information is logged:
 *    - Error object
 *    - React component stack
 *    - Environment (production only)
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // REQUIRED: Log to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ /* fallback UI */ }}>
          <h2>Oops! Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          {/* Error details in development only */}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// SUCCESS CRITERIA (from spec.md FR-013):
// - All errors MUST be logged to Sentry with contextual information
// - Sentry dashboard shows errors with component stack trace
// - Error logging does not affect user experience (silent in background)
// - Development errors still appear in browser console

// VERIFICATION:
// 1. Trigger error in AddVideoModal (e.g., throw new Error('Test'))
// 2. Check browser console: Error logged locally
// 3. Check Sentry dashboard: Error appears with React component stack
// 4. Verify error sanitization: No sensitive data (cookies, tokens) in Sentry
