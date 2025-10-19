# Deployment Guide: Medio Video Streaming Platform

**Feature**: Fix Video Modal Deployment and Functionality (003-specify-scripts-bash)
**Created**: 2025-10-19
**Last Updated**: 2025-10-19

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Prerequisites](#deployment-prerequisites)
3. [Deployment Process](#deployment-process)
4. [Verification Steps](#verification-steps)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Fly.io Dual-App Architecture

Medio uses a **split architecture** with two separate Fly.io applications:

1. **medio-react-app** (Frontend)
   - React SPA (Single Page Application)
   - Served via nginx
   - Auto-deploys via GitHub Actions on `master` branch push
   - URL: https://medio-react-app.fly.dev

2. **medio-backend** (Backend API)
   - Express.js REST API
   - PostgreSQL database
   - **Manual deployment required** (no auto-deploy)
   - URL: https://medio-backend.fly.dev/api

### Why Two Apps?

- **Independent Scaling**: Frontend and backend can scale separately
- **Deployment Flexibility**: Can deploy frontend without touching backend (and vice versa)
- **Resource Optimization**: Different resource requirements for static serving vs API
- **Rollback Safety**: Can rollback frontend or backend independently

---

## Deployment Prerequisites

### Required Tools

- [ ] **Git**: Version control
- [ ] **Node.js 18**: For building frontend
- [ ] **flyctl**: Fly.io CLI (`curl -L https://fly.io/install.sh | sh`)
- [ ] **Fly.io account**: With access to medio-react-app and medio-backend apps

### Required Secrets

- **GitHub Secrets** (for auto-deployment):
  - `FLY_API_TOKEN`: Fly.io API token for GitHub Actions

- **Fly.io Environment Variables**:
  - **Frontend** (`medio-react-app`):
    - `REACT_APP_API_URL`: https://medio-backend.fly.dev/api
    - `REACT_APP_SENTRY_DSN`: (Optional) Sentry error tracking DSN

  - **Backend** (`medio-backend`):
    - `DATABASE_URL`: PostgreSQL connection string
    - `JWT_SECRET`: Secret for JWT token signing
    - `YOUTUBE_API_KEY`: YouTube Data API v3 key
    - `VIMEO_ACCESS_TOKEN`: Vimeo API access token

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18.x

# Check flyctl installation
flyctl version

# Verify flyctl authentication
flyctl auth whoami

# List your Fly.io apps
flyctl apps list  # Should see medio-react-app and medio-backend
```

---

## Deployment Process

### Deployment Decision Matrix

| Scenario | Backend Deploy? | Frontend Deploy? | Order |
|----------|----------------|------------------|-------|
| Frontend-only change (UI, styling) | ❌ No | ✅ Yes | N/A |
| Backend-only change (bug fix, optimization) | ✅ Yes | ❌ No | N/A |
| New API endpoint (backward-compatible) | ✅ Yes | ✅ Yes | Backend → Frontend |
| Breaking API change | ✅ Yes | ✅ Yes | Backend → Frontend (coordinate!) |
| Database migration | ✅ Yes | ❌ No* | Backend only (* unless UI depends on migration) |
| Deployment infrastructure (nginx, cache) | ❌ No | ✅ Yes | N/A |

### Backward-Compatible API Changes (Recommended)

**Definition**: Backend changes that don't break existing frontend code.

**Examples**:
- ✅ Adding new optional fields to responses
- ✅ Adding new API endpoints
- ✅ Adding new query parameters (optional)
- ❌ Removing fields from responses (BREAKING)
- ❌ Renaming fields (BREAKING)
- ❌ Changing field types (BREAKING)

**Rule**: When possible, make backend changes backward-compatible so frontend can deploy anytime.

---

### Frontend Deployment (Auto via GitHub Actions)

**Trigger**: Push to `master` branch

**Process**:
```bash
# 1. Ensure you're on the correct branch
git checkout master
git pull origin master

# 2. Make your frontend changes
# (e.g., edit src/components/*, nginx.conf, etc.)

# 3. Commit changes
git add .
git commit -m "feat: your feature description

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push to trigger auto-deployment
git push origin master

# 5. Monitor deployment
# Visit: https://github.com/[your-username]/medio/actions
# Watch for "Deploy to Fly.io" workflow
```

**GitHub Actions Workflow**:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Run tests (`npm test -- --ci --coverage`)
5. Build application (`npm run build`)
6. Deploy to Fly.io (`flyctl deploy --remote-only`)
7. Health check (curl medio-react-app.fly.dev)
8. **Deployment verification** (cache headers, HTTP 200)

**Deployment Time**: ~5-7 minutes

---

### Backend Deployment (Manual)

**Trigger**: Manual command

**Process**:
```bash
# 1. Navigate to backend directory
cd backend

# 2. Verify you're in the right directory
pwd  # Should end with /backend
ls   # Should see src/, package.json, Dockerfile, fly.toml

# 3. Deploy to Fly.io
flyctl deploy --remote-only

# 4. Wait for deployment (2-3 minutes)
# Watch the output for:
# - Build success
# - Health checks passing
# - "Deployment successful"

# 5. Verify backend health
curl -I https://medio-backend.fly.dev/api/platforms
# Expected: HTTP/1.1 200 OK
```

**Optional Flags**:
- `--no-cache`: Force rebuild without cache (slower, but ensures fresh build)
- `--local-only`: Build locally (requires Docker daemon running)
- `--image [tag]`: Deploy specific image (for rollback)

**Deployment Time**: ~2-3 minutes

---

### Coordinated Deployment (Backend + Frontend)

When deploying features that require **both** backend and frontend changes:

**Step-by-Step Process**:

```bash
# === BACKEND FIRST ===

# 1. Deploy backend changes
cd backend
flyctl deploy --remote-only

# 2. Wait for backend health checks
# Watch Fly.io output for "Health checks passing"

# 3. Manually verify backend
curl https://medio-backend.fly.dev/api/platforms
# Should return JSON array of platforms

# 4. If backend deployment fails, STOP
# Do NOT deploy frontend until backend is healthy

# === FRONTEND SECOND ===

# 5. Once backend is healthy, deploy frontend
cd ..  # Back to repository root
git add .
git commit -m "feat: coordinated deployment - backend + frontend

Backend: [describe backend changes]
Frontend: [describe frontend changes]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin master

# 6. Monitor GitHub Actions
# Visit: https://github.com/[username]/medio/actions

# 7. Verify both apps are communicating
bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh
```

**Critical Rule**: **ALWAYS deploy backend BEFORE frontend** when both have changes.

**Why?** If frontend deploys first and expects new backend endpoints, users will get errors until backend catches up.

---

## Verification Steps

### Automated Verification (GitHub Actions)

The GitHub Actions workflow automatically verifies:
- ✅ Frontend returns HTTP 200
- ✅ index.html has no-cache headers
- ✅ Tests pass before deployment

### Manual Verification

After deployment, manually verify:

**1. Run Deployment Verification Script**:
```bash
# From repository root
bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh
```

**Expected Output**:
```
🔍 Deployment Verification Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1: Checking index.html cache headers...
✅ index.html has no-cache headers

Test 2: Checking static chunk cache headers...
✅ Static chunks have immutable cache headers

Test 3: Checking frontend availability...
✅ Frontend returns HTTP 200

Test 4: Checking backend connectivity...
✅ Backend /api/platforms returns HTTP 200

✅ Deployment verification complete
```

**2. Test Add Video Modal** (End-to-End):
```bash
# Open in fresh incognito browser
# Navigate to: https://medio-react-app.fly.dev/videos
# Click "Add Video" button
# Verify modal opens without crashes
# Paste YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
# Verify metadata auto-fills
# Select age rating and save
# Verify video appears in library
```

**3. Verify Cache Headers** (Critical for SC-002):
```bash
# Check index.html
curl -I https://medio-react-app.fly.dev/index.html | grep -i cache-control
# Expected: Cache-Control: no-cache, no-store, must-revalidate

# Check static chunks (use actual chunk URL from page source)
curl -I https://medio-react-app.fly.dev/static/js/main.ae51c1fa.chunk.js | grep -i cache-control
# Expected: Cache-Control: public, immutable
```

**4. Check Application Logs** (if issues):
```bash
# Frontend logs
flyctl logs -a medio-react-app

# Backend logs
flyctl logs -a medio-backend
```

---

## Rollback Procedures

### When to Rollback

- ❌ Deployment breaks critical functionality
- ❌ Health checks fail after deployment
- ❌ Users report widespread errors
- ❌ Security vulnerability discovered in deployed code

### Method 1: Git Revert (Recommended for Frontend)

**Use When**: Frontend-only issue, need to trigger re-deployment

```bash
# 1. Find the problematic commit
git log --oneline -n 10

# 2. Revert the commit (creates new commit)
git revert [commit-sha]

# 3. Push to trigger re-deployment
git push origin master

# 4. Monitor GitHub Actions
# New deployment will automatically trigger with reverted code
```

**Advantages**:
- ✅ Preserves git history
- ✅ Triggers all automated checks
- ✅ Clear audit trail

**Time**: ~5-7 minutes (full deployment cycle)

---

### Method 2: Fly.io Image Rollback (Fast for Backend)

**Use When**: Backend issue, need immediate rollback

```bash
# 1. List recent deployments
cd backend
flyctl releases -a medio-backend

# Example output:
# VERSION	STATUS	REASON	USER	DATE
# v5	current	deploy	user	2025-10-19T14:30:00Z
# v4	complete	deploy	user	2025-10-18T10:15:00Z
# v3	complete	deploy	user	2025-10-17T09:00:00Z

# 2. Rollback to previous version
flyctl rollback -a medio-backend --version v4

# 3. Verify rollback
curl https://medio-backend.fly.dev/api/platforms
```

**Advantages**:
- ✅ **Fast**: ~30 seconds
- ✅ No code changes needed
- ✅ Can rollback to any previous version

**Disadvantages**:
- ⚠️ Doesn't fix code in git (need separate git revert later)

**Time**: ~30 seconds

---

### Emergency Rollback (Both Apps)

**Use When**: Coordinated deployment breaks both apps

```bash
# 1. Rollback backend FIRST (faster)
cd backend
flyctl rollback -a medio-backend --version [previous-version]

# 2. Then revert frontend commits
cd ..
git revert [bad-commit-sha]
git push origin master

# 3. Verify both apps
bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh
```

---

## Troubleshooting

### Issue: "nginx configuration test failed"

**Symptom**: Docker build fails with nginx syntax error

**Cause**: Invalid nginx.conf syntax

**Solution**:
```bash
# Validate nginx config locally (if nginx installed)
nginx -t -c nginx.conf

# Or validate during Docker build
docker build -t medio-frontend .
# Check output for nginx errors
```

**Prevention**: Use contracts/nginx-cache-headers.conf as reference

---

### Issue: "Health checks failing" after deployment

**Symptom**: Fly.io shows "Health checks failing" in deployment output

**Cause**: App not responding on expected port (8080)

**Solution**:
```bash
# Check app logs
flyctl logs -a medio-react-app

# Common issues:
# - nginx not starting (check nginx.conf syntax)
# - Port mismatch (should be 8080)
# - Missing static files (check build/ directory)

# Restart the app
flyctl apps restart medio-react-app
```

---

### Issue: "Stale code still loading" after deployment

**Symptom**: Users see old JavaScript even after successful deployment

**Cause**: Browser caching or service workers

**Solution**:
```bash
# 1. Verify nginx cache headers are correct
curl -I https://medio-react-app.fly.dev/index.html | grep -i cache-control
# Should show: no-cache, no-store, must-revalidate

# 2. If headers are wrong, nginx.conf not deployed
# Re-deploy frontend:
git push origin master

# 3. For users: Hard refresh
# Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
# Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

**Prevention**: This feature (003) fixes this issue with proper cache headers

---

### Issue: "Sentry not receiving errors"

**Symptom**: No errors in Sentry dashboard despite app errors

**Cause**: REACT_APP_SENTRY_DSN not configured

**Solution**:
```bash
# 1. Set Sentry DSN in Fly.io
flyctl secrets set REACT_APP_SENTRY_DSN="https://[your-dsn]@sentry.io/[project]" -a medio-react-app

# 2. Verify secret is set
flyctl secrets list -a medio-react-app

# 3. Re-deploy to apply changes
git push origin master
```

---

### Issue: "Database connection failed" in backend

**Symptom**: Backend logs show "Cannot connect to database"

**Cause**: DATABASE_URL not set or invalid

**Solution**:
```bash
# Check backend secrets
flyctl secrets list -a medio-backend

# If DATABASE_URL missing, set it
flyctl secrets set DATABASE_URL="postgresql://..." -a medio-backend

# Restart backend
cd backend
flyctl apps restart medio-backend
```

---

## Quick Reference

### Common Commands

```bash
# Frontend Deployment
git push origin master  # Auto-deploys via GitHub Actions

# Backend Deployment
cd backend && flyctl deploy --remote-only

# Check Deployment Status
flyctl status -a medio-react-app
flyctl status -a medio-backend

# View Logs
flyctl logs -a medio-react-app
flyctl logs -a medio-backend

# Rollback
flyctl rollback -a medio-backend --version [version]

# Verification
bash specs/003-specify-scripts-bash/contracts/deployment-verification.sh
```

### Important URLs

- **Frontend**: https://medio-react-app.fly.dev
- **Backend API**: https://medio-backend.fly.dev/api
- **Platforms Endpoint**: https://medio-backend.fly.dev/api/platforms
- **GitHub Actions**: https://github.com/[username]/medio/actions

---

## Deployment Checklist

Before deploying, verify:

- [ ] All tests pass locally (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Changes are committed to git
- [ ] Backend changes deployed FIRST (if coordinated deployment)
- [ ] GitHub Actions workflow is green (for frontend)
- [ ] Health checks pass after deployment
- [ ] Deployment verification script passes
- [ ] End-to-end test of affected features
- [ ] Logs show no errors

---

## Support

For deployment issues:
1. Check troubleshooting section above
2. Review Fly.io logs (`flyctl logs`)
3. Run deployment verification script
4. Check GitHub Actions workflow output
5. Consult CLAUDE.md for project-specific guidance

---

**Document Version**: 1.0.0
**Last Verified**: 2025-10-19
**Related Specs**: 003-specify-scripts-bash, 002-add-video-link, 001-flyio-full-deployment
