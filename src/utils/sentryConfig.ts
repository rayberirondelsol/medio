import * as Sentry from '@sentry/react';

// DSN validation to prevent potential security issues
const validateDSN = (dsn: string): boolean => {
  if (!dsn || typeof dsn !== 'string') {
    return false;
  }
  
  try {
    const url = new URL(dsn);
    
    // Must be HTTPS
    if (url.protocol !== 'https:') {
      console.warn('Sentry DSN must use HTTPS protocol');
      return false;
    }
    
    // Must be from sentry.io or a known self-hosted domain
    const validHosts = ['.sentry.io', '.ingest.sentry.io'];
    const isValidHost = validHosts.some(host => url.hostname.endsWith(host));
    
    if (!isValidHost) {
      console.warn('Sentry DSN must be from a valid Sentry domain');
      return false;
    }
    
    // DSN must have a path (project ID)
    if (!url.pathname || url.pathname === '/') {
      console.warn('Sentry DSN must include a project ID');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Invalid Sentry DSN format:', error);
    return false;
  }
};

export const initSentry = () => {
  // Only initialize in production
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DSN) {
    const dsn = process.env.REACT_APP_SENTRY_DSN;
    
    // Validate DSN before initializing
    if (!validateDSN(dsn)) {
      console.warn('Invalid Sentry DSN detected. Sentry will not be initialized.');
      return;
    }
    
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      environment: process.env.NODE_ENV,
      beforeSend(event, hint) {
        // Filter out non-critical errors in production
        if (event.exception) {
          const error = hint.originalException;
          // Don't send network errors that are expected (like 401s)
          if (error && error.toString().includes('401')) {
            return null;
          }
          
          // Sanitize sensitive information from error messages
          if (event.exception.values) {
            event.exception.values.forEach(exception => {
              if (exception.value) {
                // Remove potential API keys or tokens from error messages
                exception.value = exception.value
                  .replace(/([a-zA-Z0-9]{32,})/g, '[REDACTED]')
                  .replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]');
              }
            });
          }
        }
        
        // Remove sensitive data from request information
        if (event.request) {
          if (event.request.cookies) {
            event.request.cookies = '[REDACTED]';
          }
          if (event.request.headers) {
            const headers = event.request.headers as Record<string, string>;
            if (headers['Authorization']) {
              headers['Authorization'] = '[REDACTED]';
            }
            if (headers['Cookie']) {
              headers['Cookie'] = '[REDACTED]';
            }
          }
        }
        
        return event;
      },
    });
  }
};

export const logError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
};