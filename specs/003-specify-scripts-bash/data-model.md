# Phase 1: Data Model - Fix Video Modal Deployment and Functionality

**Feature**: Fix Video Modal Deployment and Functionality
**Branch**: 003-specify-scripts-bash
**Phase**: 1 - Design (Data Model)

## Summary

**No data model changes required for this feature.**

This feature focuses on deployment infrastructure (nginx configuration, cache headers) and error handling improvements (Sentry logging in ErrorBoundary). It does not introduce new database tables, modify existing schemas, or change API data structures.

## Existing Data Models

The feature interacts with existing data models but does not modify them:

### Platform Entity (Existing)
**Source**: Database table accessed via `/api/platforms` endpoint
**Purpose**: Video hosting platform information (YouTube, Vimeo, Dailymotion)

**Attributes** (no changes):
- `id` (UUID): Primary key
- `name` (String): Platform name (e.g., "youtube", "vimeo")
- `requires_auth` (Boolean): Whether platform requires authentication

**Relationships**: Referenced by Video entity's `platform_id` foreign key

**Changes**: None

---

### Video Entity (Existing)
**Source**: Database table accessed via `/api/videos` endpoint
**Purpose**: Stores video metadata added by parents

**Attributes** (no changes):
- `id` (UUID): Primary key
- `platform_id` (UUID): Foreign key to Platform
- `url` (String): Video URL
- `title` (String): Video title
- `description` (Text): Video description
- `thumbnail_url` (String): Thumbnail image URL
- `age_rating` (String): Age appropriateness rating

**Relationships**: Many-to-one with Platform

**Changes**: None

---

## Configuration Data Models

### nginx Cache Configuration (Modified)
**Source**: `nginx.conf` static configuration file
**Purpose**: HTTP cache control headers for static assets

**Structure**:
```nginx
location = /index.html {
  # NEW BLOCK - Forces browsers to check for updates
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
  add_header Expires "0";
}

location ~* \.(css|js)$ {
  # EXISTING - Static assets with content hashes
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

**Changes**:
- **ADD**: New `location = /index.html` block with no-cache headers
- **KEEP**: Existing static asset caching rules unchanged

---

### Error Tracking Context (Modified)
**Source**: `src/components/common/ErrorBoundary.tsx`
**Purpose**: Sentry error reporting context

**Structure** (TypeScript interface):
```typescript
interface SentryErrorContext {
  error: Error;
  componentStack: string;
  // Additional React context (implicit from Sentry integration)
}
```

**Changes**:
- **ENABLE**: Uncomment `Sentry.captureException()` call in `componentDidCatch()`
- **ADD**: Import `Sentry` from `@sentry/react`

---

## Migration Requirements

**No database migrations required.**

All changes are to static configuration files and code-level error handling. No schema changes, no data migrations, no backwards-incompatible API changes.

## Validation

- [ ] No new database tables created
- [ ] No existing table schemas modified
- [ ] No API response formats changed
- [ ] Configuration changes are backwards-compatible (nginx can gracefully restart)
- [ ] Sentry error logging does not affect application functionality if disabled

## Next Steps

Proceed to create:
- `contracts/nginx-cache-headers.conf` - Expected nginx configuration
- `contracts/deployment-verification.sh` - Deployment verification script contract
- `quickstart.md` - Implementation guide
