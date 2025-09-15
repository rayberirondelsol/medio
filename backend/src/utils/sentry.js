const Sentry = require('@sentry/node');
const { CaptureConsole } = require('@sentry/integrations');

function initSentry(app) {
  // Only initialize Sentry if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, error tracking disabled');
    return;
  }

  // Initialize Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '0.1'),
    integrations: [
      // Automatically capture errors from console
      new CaptureConsole({
        levels: ['error', 'warn']
      }),
    ],
    beforeSend(event, hint) {
      // Scrub sensitive data from error events
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        // Remove sensitive body data
        if (event.request.data && typeof event.request.data === 'object') {
          const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey'];
          sensitiveFields.forEach(field => {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]';
            }
          });
        }
      }
      
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        const error = hint.originalException;
        // Don't send client disconnection errors
        if (error && error.message && error.message.includes('ECONNRESET')) {
          return null;
        }
      }
      
      return event;
    },
  });

  // Add Sentry request handler (must be first middleware)
  app.use(Sentry.Handlers.requestHandler());

  // Add Sentry tracing handler
  app.use(Sentry.Handlers.tracingHandler());

  console.log('Sentry error tracking initialized');
}

function addSentryErrorHandler(app) {
  // Add Sentry error handler (must be before any other error middleware)
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all errors 400 and above
        if (error.status >= 400) {
          return true;
        }
        // Also capture errors without status
        return !error.status;
      }
    }));
  }
}

module.exports = {
  initSentry,
  addSentryErrorHandler,
  captureException: Sentry.captureException,
  captureMessage: Sentry.captureMessage,
  configureScope: Sentry.configureScope,
  withScope: Sentry.withScope,
};