import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.pageName || 'page'}:`, error, errorInfo);
    
    // You can also log the error to an error reporting service here
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
            pageName: this.props.pageName,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem auto',
          maxWidth: '600px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
            {this.props.pageName 
              ? `An error occurred in the ${this.props.pageName} page.`
              : 'An unexpected error occurred.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              textAlign: 'left', 
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <summary style={{ cursor: 'pointer', color: '#495057' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ 
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                overflow: 'auto',
                color: '#dc3545'
              }}>
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.5rem',
                marginRight: '0.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;