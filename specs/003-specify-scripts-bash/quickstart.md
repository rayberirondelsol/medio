# Quickstart: Fix Video Modal Deployment and Functionality

**Feature**: 003-specify-scripts-bash
**Branch**: `003-specify-scripts-bash`
**Estimated Time**: 2-3 hours (including testing)

## Prerequisites

- [x] Phase 0 (research.md) completed - Root cause identified
- [x] Phase 1 (data-model.md, contracts/) completed - Design contracts defined
- [ ] TDD tests written and user-approved (REQUIRED by constitution)
- [ ] Docker environment running (`make dev` or `docker-compose up`)

## Implementation Order (TDD Red-Green-Refactor)

### Task 1: Write Tests for nginx Cache Headers (RED Phase)

**File**: `tests/e2e/test-deployment-cache-headers.spec.js` (NEW)

**Objective**: Write failing E2E tests that verify cache headers

**Test Cases**:
1. index.html returns `Cache-Control: no-cache, no-store, must-revalidate`
2. Static JS chunks return `Cache-Control: public, immutable`
3. After simulated deployment, browser loads new chunks

**Expected Result**: ❌ Tests fail because nginx.conf doesn't have index.html block

**Reference**: `contracts/deployment-verification.sh` for test structure

---

### Task 2: Update nginx Configuration (GREEN Phase)

**File**: `nginx.conf:14` (MODIFY - insert BEFORE line 30)

**Objective**: Add no-cache block for index.html

**Changes**:
```nginx
# ADD this block BEFORE the existing location ~* \.(css|js)$ block
location = /index.html {
    root /usr/share/nginx/html;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;

    # Preserve security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

**Reference**: `contracts/nginx-cache-headers.conf` for exact syntax

**Verification**:
```bash
# Local Docker test
docker build -t medio-frontend .
docker run -p 8080:8080 medio-frontend

# In another terminal:
curl -I http://localhost:8080/index.html | grep "Cache-Control"
# Expected: Cache-Control: no-cache, no-store, must-revalidate
```

**Expected Result**: ✅ Tests pass, nginx serves correct headers

---

### Task 3: Write Tests for Sentry Logging (RED Phase)

**File**: `src/components/__tests__/ErrorBoundary.test.tsx` (MODIFY or CREATE)

**Objective**: Verify Sentry.captureException is called on errors

**Test Cases**:
1. ErrorBoundary catches thrown error
2. Sentry.captureException is called with error and componentStack
3. Error logging only happens in production mode
4. Fallback UI is rendered

**Expected Result**: ❌ Tests fail because Sentry.captureException is commented out

**Reference**: `contracts/error-boundary-sentry.tsx` for expected behavior

---

### Task 4: Enable Sentry in ErrorBoundary (GREEN Phase)

**File**: `src/components/common/ErrorBoundary.tsx:1,29` (MODIFY)

**Objective**: Uncomment Sentry logging

**Changes**:
```typescript
// Line 1: ADD import
import * as Sentry from '@sentry/react';

// Line 29: UNCOMMENT and modify
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack
      }
    }
  });
}
```

**Verification**:
```bash
# Run unit tests
npm test -- ErrorBoundary.test.tsx

# Manual test in dev:
# 1. Add `throw new Error('Test error')` to AddVideoModal
# 2. Open modal
# 3. Check console: Error logged locally
# 4. Check Sentry dashboard (if DSN configured): Error appears
```

**Expected Result**: ✅ Tests pass, Sentry integration working

---

### Task 5: Add Deployment Verification to CI/CD (TDD Optional)

**File**: `.github/workflows/fly.yml:42` (MODIFY - after health check)

**Objective**: Verify deployment with comprehensive checks

**Changes**:
```yaml
- name: Verify deployment
  run: |
    sleep 10

    # Test 1: Check index.html cache headers
    CACHE_HEADER=$(curl -sI https://medio-react-app.fly.dev/index.html | grep -i "cache-control")
    echo "index.html cache header: $CACHE_HEADER"

    if echo "$CACHE_HEADER" | grep -q "no-cache"; then
      echo "✅ Cache headers correct"
    else
      echo "❌ Cache headers incorrect"
      exit 1
    fi

    # Test 2: Verify site loads
    curl -f https://medio-react-app.fly.dev || exit 1
    echo "✅ Deployment verification passed"
```

**Reference**: `contracts/deployment-verification.sh` for full script

**Verification**:
```bash
# Trigger GitHub Actions manually or push to master
# Watch workflow run: https://github.com/[user]/medio/actions
```

**Expected Result**: ✅ GitHub Actions deployment succeeds with verification

---

### Task 6: Manual Deployment Test (CRITICAL)

**Objective**: Verify end-to-end deployment fixes caching issue

**Steps**:

1. **Make a visible change**:
   ```typescript
   // src/pages/Videos.tsx - Add test indicator
   <h1>Videos {/* DEPLOYMENT TEST v2 */}</h1>
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "test: verify deployment cache busting"
   git push origin 003-specify-scripts-bash
   ```

3. **Wait for deployment** (~5 min):
   - Watch GitHub Actions: https://github.com/[user]/medio/actions
   - Confirm deployment succeeds

4. **Test in fresh browser**:
   - Open incognito window
   - Navigate to https://medio-react-app.fly.dev/videos
   - Verify test indicator appears
   - Check Network tab: index.html shows `no-cache` headers
   - Verify new JS chunks are loaded (check file hash in Network tab)

5. **Test caching behavior**:
   ```bash
   # From terminal
   curl -I https://medio-react-app.fly.dev/index.html | grep "Cache-Control"
   # Should show: no-cache, no-store, must-revalidate

   curl -I https://medio-react-app.fly.dev/static/js/main.[hash].chunk.js | grep "Cache-Control"
   # Should show: public, immutable
   ```

**Expected Result**: ✅ Deployment updates are immediately visible in new browser sessions

---

## Rollback Plan

If deployment fails or causes issues:

```bash
# Revert nginx.conf changes
git revert HEAD
git push origin 003-specify-scripts-bash

# Or manually deploy previous version
flyctl deploy --image [previous-image-sha]
```

## Success Criteria Verification

**From spec.md, verify all success criteria**:

- [ ] SC-001: AddVideoModal opens without crashes 100% of the time ✅ (Already fixed via defensive code)
- [ ] SC-002: New browser sessions load updated code within 60 seconds ✅ (nginx.conf change)
- [ ] SC-003: Platforms API failures handled gracefully ✅ (Already fixed)
- [ ] SC-004: Complete YouTube video workflow succeeds in <30s ✅ (Existing functionality)
- [ ] SC-005: Deployment verification confirms frontend+backend updates ✅ (GitHub Actions update)
- [ ] SC-006: Zero ".map is not a function" errors ✅ (Already fixed)
- [ ] SC-007: User-friendly error messages ✅ (ErrorBoundary already has this)
- [ ] SC-008: Deployment verification completes in <2 min ✅ (New verification script)

## Post-Implementation Checklist

- [ ] All TDD tests pass (unit + E2E)
- [ ] Manual deployment test successful
- [ ] Sentry dashboard receiving errors (test with intentional error)
- [ ] nginx cache headers verified in production
- [ ] Documentation updated (this file)
- [ ] GitHub Actions workflow includes verification
- [ ] Constitution compliance verified (all 6 principles met)

## Troubleshooting

**Issue**: Deployment succeeds but cache headers still wrong
**Solution**: Check nginx.conf block order - index.html block must be BEFORE static assets block

**Issue**: Sentry not receiving errors
**Solution**: Verify `REACT_APP_SENTRY_DSN` environment variable is set in Fly.io

**Issue**: Tests fail in CI but pass locally
**Solution**: Ensure Docker environment matches CI (same nginx version, same Node version)

## Next Steps

After implementation:
1. Run `/speckit.tasks` to generate tasks.md from this quickstart
2. Execute tasks in order following TDD workflow
3. Create pull request when all tests pass
4. Merge to master and monitor production deployment
