# Production Monitoring Setup Guide

This document describes the production monitoring setup for Medio using Sentry.

## Overview

Medio uses **Sentry** for error tracking, performance monitoring, and production alerting in both frontend and backend applications.

## Architecture

```
┌─────────────────┐        ┌──────────────────┐
│  Frontend (BFF) │──────▶│  Sentry.io       │
│  localhost:8080 │        │  Error Tracking  │
└─────────────────┘        └──────────────────┘
         │
         │ Proxy
         ▼
┌─────────────────┐
│  Backend API    │──────▶ Sentry.io
│  localhost:5000 │        Performance APM
└─────────────────┘
```

## Frontend Monitoring

### Configuration Files

- **`src/utils/sentryConfig.ts`** - Main Sentry initialization
- **`src/components/common/ErrorBoundary.tsx`** - React Error Boundary with Sentry integration

### Features

✅ **Error Tracking**
- React component crashes captured via ErrorBoundary
- Unhandled promise rejections
- Runtime JavaScript errors
- API request failures

✅ **Performance Monitoring**
- Browser tracing (10% sample rate)
- Page load times
- Component render times

✅ **Privacy & Security**
- Sensitive data redaction (cookies, auth tokens)
- 401 errors filtered out (expected behavior)
- DSN validation before init
- HTTPS-only enforcement

### Environment Variables

```bash
# Frontend (.env)
REACT_APP_SENTRY_DSN=https://<key>@<project-id>.ingest.sentry.io/<project-id>

# Optional: Enable Sentry tunnel for enhanced security
# REACT_APP_SENTRY_TUNNEL=/api/sentry-tunnel
```

### Usage Example

```typescript
import { logError } from './utils/sentryConfig';

try {
  // Your code
} catch (error) {
  logError(error as Error, {
    context: 'Video creation',
    videoId: '123',
    userId: 'user-456'
  });
}
```

## Backend Monitoring

### Configuration Files

- **`backend/src/utils/sentry.js`** - Sentry backend initialization
- **`backend/src/app.js`** - Express error handling middleware

### Features

✅ **Error Tracking**
- Unhandled exceptions
- Promise rejections
- Express route errors
- Database errors

✅ **Performance Monitoring (APM)**
- HTTP request tracing
- Database query performance
- External API calls (YouTube, Vimeo, Dailymotion)

✅ **Integration**
- PostgreSQL query tracking
- Express middleware tracing
- Automatic error context (request, user)

### Environment Variables

```bash
# Backend (.env)
SENTRY_DSN=https://<key>@<project-id>.ingest.sentry.io/<project-id>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Usage Example

```javascript
const Sentry = require('@sentry/node');

Sentry.captureException(new Error('Database connection failed'), {
  extra: {
    query: 'SELECT * FROM users',
    pool: 'main'
  }
});
```

## Setting Up Sentry

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create organization: `medio-platform`

### 2. Create Projects

**Frontend Project:**
- Platform: `React`
- Name: `medio-frontend`
- Alert Rules: Enable default rules

**Backend Project:**
- Platform: `Node.js`
- Name: `medio-backend`
- Alert Rules: Enable default rules

### 3. Configure Environment Variables

**Fly.io Secrets (Frontend):**
```bash
flyctl secrets set REACT_APP_SENTRY_DSN="https://..."
```

**Fly.io Secrets (Backend):**
```bash
cd backend
flyctl secrets set SENTRY_DSN="https://..."
flyctl secrets set SENTRY_ENVIRONMENT="production"
```

### 4. Verify Installation

**Frontend:**
```bash
# Trigger test error in production console
throw new Error('Sentry test error');
```

**Backend:**
```bash
# Call test endpoint
curl https://medio-backend.fly.dev/api/test-error
```

## Alerts & Notifications

### Recommended Alert Rules

1. **High Error Rate**
   - Trigger: >10 errors per minute
   - Notify: Email + Slack

2. **New Issue**
   - Trigger: First occurrence of new error
   - Notify: Email

3. **Regression**
   - Trigger: Previously resolved error re-occurs
   - Notify: Email + Slack

4. **Performance Degradation**
   - Trigger: P95 response time >2s
   - Notify: Email

### Slack Integration

1. Go to Sentry Project Settings → Integrations
2. Add Slack integration
3. Configure channel: `#medio-errors`
4. Set notification rules

## Monitoring Dashboard

### Key Metrics to Monitor

**Frontend:**
- Error rate by page
- Browser distribution
- Geographic distribution
- Page load performance
- AJAX request performance

**Backend:**
- API endpoint performance
- Database query performance
- External API latency (YouTube, Vimeo)
- Error rate by endpoint
- User-impacting errors

### Custom Tags

The following custom tags are added to all events:

**Frontend:**
- `user_id` - Authenticated user ID
- `page` - Current route
- `browser` - Browser name/version

**Backend:**
- `user_id` - Authenticated user ID
- `endpoint` - API route
- `method` - HTTP method
- `status_code` - Response status

## Privacy & GDPR Compliance

✅ **Data Scrubbing**
- Cookies redacted before sending to Sentry
- Authorization headers removed
- Long tokens replaced with `[REDACTED]`
- User emails scrubbed from error messages

✅ **User Consent**
- Sentry DSN only loaded in production
- Error tracking essential for service operation
- No PII sent to Sentry

✅ **Data Retention**
- Events retained for 90 days
- Can be configured in Sentry project settings

## Troubleshooting

### Sentry Not Initializing

**Check:**
1. `REACT_APP_SENTRY_DSN` environment variable is set
2. DSN format is valid (https://...)
3. DSN points to `*.sentry.io` domain
4. `NODE_ENV=production` is set

**Debug:**
```bash
# Frontend
console.log(process.env.REACT_APP_SENTRY_DSN);

# Backend
console.log(process.env.SENTRY_DSN);
```

### No Events in Sentry

**Check:**
1. Firewall not blocking sentry.io
2. Content Security Policy allows sentry.io
3. beforeSend filter not blocking all events
4. Sample rate not too low (should be 0.1 = 10%)

**Test:**
```javascript
// Frontend
import * as Sentry from '@sentry/react';
Sentry.captureMessage('Test message');

// Backend
const Sentry = require('@sentry/node');
Sentry.captureMessage('Test message');
```

### Too Many Events (Quota Exceeded)

**Solutions:**
1. Increase sample rate filter
2. Add more beforeSend filtering
3. Upgrade Sentry plan
4. Focus on critical errors only

## Cost Optimization

### Free Tier Limits
- 5,000 errors/month
- 10,000 transactions/month
- 1 project per organization

### Optimization Strategies

1. **Sample Transactions**
   - Current: 10% (tracesSampleRate: 0.1)
   - Adjust based on traffic

2. **Filter Non-Critical Errors**
   - Network errors (401, 404)
   - Development errors
   - Known issues

3. **Use Ignores**
   ```javascript
   ignoreErrors: [
     'ResizeObserver loop limit exceeded',
     'Non-Error promise rejection captured'
   ]
   ```

## Support

**Sentry Documentation:**
- [React Setup](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Node.js Setup](https://docs.sentry.io/platforms/node/)
- [Error Filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)

**Contact:**
- Sentry Support: support@sentry.io
- Fly.io Support: community.fly.io
