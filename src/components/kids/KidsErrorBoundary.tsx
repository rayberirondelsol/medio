/**
 * KidsErrorBoundary Component
 *
 * Error boundary specifically designed for Kids Mode with child-friendly messages.
 * Catches React errors and displays friendly fallback UI.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import './KidsErrorBoundary.css';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class KidsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KidsErrorBoundary caught error:', error, errorInfo);

    // Log to external error tracking service (e.g., Sentry) in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="kids-error-boundary" role="alert" aria-live="assertive">
          <div className="kids-error-boundary__content">
            <div className="kids-error-boundary__emoji">😢</div>
            <h1 className="kids-error-boundary__title">Oops! Something went wrong</h1>
            <p className="kids-error-boundary__message">
              Don't worry! Let's try starting over.
            </p>
            <p className="kids-error-boundary__hint">
              If this keeps happening, ask a grown-up for help.
            </p>
            <button
              className="kids-error-boundary__button"
              onClick={this.handleReset}
              aria-label="Try again"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
