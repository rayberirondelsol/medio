import * as Sentry from '@sentry/react';

export const initSentry = () => {
  // Only initialize in production
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
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