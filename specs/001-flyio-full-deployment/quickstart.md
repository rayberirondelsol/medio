# Quickstart: Deploy Medio to Fly.io

**Feature**: Make Medio Fully Functional on Fly.io
**Date**: 2025-10-17
**Audience**: Developers performing the deployment

## Prerequisites

- [ ] `flyctl` CLI installed and authenticated (`fly auth login`)
- [ ] Access to Fly.io organization with medio-backend and medio-react-app applications
- [ ] JWT_SECRET and SENTRY_DSN values available
- [ ] Database (medio-backend-db) exists and is accessible

## Deployment Steps

### Phase 1: Backend Deployment (P1 - Backend Operational)

**Goal**: Get backend machines started and passing health checks

```bash
# 1. Check current backend status
flyctl status -a medio-backend

# Expected: Machines showing "stopped" state since Sept 17

# 2. List backend machines to get IDs
flyctl machines list -a medio-backend

# Expected: 2 machines with status "stopped"

# 3. Set required secrets (if not already set)
flyctl secrets set JWT_SECRET="<your-jwt-secret>" -a medio-backend
flyctl secrets set SENTRY_DSN="<your-sentry-dsn>" -a medio-backend

# Verify secrets are set (shows names only, not values)
flyctl secrets list -a medio-backend

# Expected: JWT_SECRET, SENTRY_DSN listed

# 4. SSH into backend machine to run migrations
flyctl ssh console -a medio-backend

# Inside the SSH session:
cd /app
npm run migrate

# Expected: "Migrations completed successfully" or similar

# Exit SSH session
exit

# 5. Start backend machines
# Replace <machine-id> with actual machine IDs from step 2
flyctl machines start <machine-id-1> -a medio-backend
flyctl machines start <machine-id-2> -a medio-backend

# 6. Monitor logs during startup
flyctl logs -a medio-backend

# Watch for:
# - "Server started on port 5000"
# - "Database connected successfully"
# - NO errors about missing environment variables
# - NO database connection errors

# 7. Verify health check endpoint
curl https://medio-backend.fly.dev/

# Expected: {"status":"ok","database":"connected","timestamp":"..."}

# 8. Check machines transitioned to healthy
flyctl status -a medio-backend

# Expected: Both machines showing "started" with health checks passing
```

**Validation Checklist (P1)**:
- [x] Secrets configured (JWT_SECRET, SENTRY_DSN)
- [ ] Migrations ran successfully
- [ ] Both backend machines started
- [ ] Logs show successful database connection
- [ ] Health check endpoint returns 200 OK
- [ ] `flyctl status` shows machines healthy

---

### Phase 2: Frontend Verification (P2 - Auth Works)

**Goal**: Verify frontend can communicate with backend and auth flows work

```bash
# 1. Check frontend status (should already be running)
flyctl status -a medio-react-app

# Expected: Machines showing "started" and healthy

# 2. Verify frontend environment
flyctl secrets list -a medio-react-app

# Expected: REACT_APP_API_URL should point to https://medio-backend.fly.dev
# Note: If REACT_APP_API_URL is missing or wrong, frontend needs rebuild and redeploy

# 3. Test frontend-backend connectivity
curl -I https://medio-react-app.fly.dev/

# Expected: 200 OK response

# 4. Manual browser testing
# Open: https://medio-react-app.fly.dev
```

**Browser Testing Checklist (P2)**:
- [ ] Login page loads within 3 seconds
- [ ] Registration form accessible
- [ ] Can register new test account (use test email)
- [ ] Registration redirects to dashboard
- [ ] Can login with test credentials
- [ ] Session persists on page refresh
- [ ] No console errors in browser DevTools (F12)

---

### Phase 3: Core Features Validation (P3 - Core Features Accessible)

**Goal**: Verify dashboard, Kids Mode, and NFC functionality are accessible

**Browser Testing Checklist (P3)**:
- [ ] Dashboard displays user stats (videos: 0, profiles: 0, NFC chips: 0 for new account)
- [ ] Navigate to /kids → Kids Mode page loads
- [ ] Kids Mode shows NFC scanning interface
- [ ] No crashed React components (Error Boundary would show if crash occurred)
- [ ] No console errors for core navigation flows

---

## Troubleshooting

### Backend machines won't start

```bash
# Check logs for errors
flyctl logs -a medio-backend

# Common issues:
# - Missing secrets: Add via `flyctl secrets set`
# - Database unreachable: Verify medio-backend-db is running
# - Migration failures: SSH in and check migration logs
```

### Health checks failing

```bash
# Check health endpoint directly
curl -v https://medio-backend.fly.dev/

# If 503 response:
# - Check logs for database connection errors
# - Verify DATABASE_URL secret is set correctly
# - Ensure migrations completed successfully
```

### Frontend shows connection errors

```bash
# Verify CORS configuration
# Backend must allow origin: https://medio-react-app.fly.dev

# Check backend logs for CORS errors
flyctl logs -a medio-backend | grep CORS

# Verify frontend is using correct API URL
flyctl secrets list -a medio-react-app
```

### Database connection issues

```bash
# Check database status
flyctl status -a medio-backend-db

# Verify DATABASE_URL is injected automatically
flyctl ssh console -a medio-backend
echo $DATABASE_URL
exit
```

---

## Post-Deployment Monitoring

### Health Check Monitoring (15 minutes)

```bash
# Watch backend status continuously
watch -n 5 flyctl status -a medio-backend

# Monitor health checks passing 100% of the time (Success Criteria SC-006)
```

### Log Monitoring

```bash
# Backend logs
flyctl logs -a medio-backend -f

# Frontend logs
flyctl logs -a medio-react-app -f

# Watch for:
# - Successful API requests
# - No 502/503 errors
# - Database queries completing quickly (<500ms)
```

### Sentry Monitoring

- Visit Sentry dashboard
- Verify no errors reported from production
- Check performance metrics

---

## Rollback Procedure

If deployment fails and cannot be fixed:

```bash
# Stop backend machines to prevent serving broken traffic
flyctl machines list -a medio-backend
flyctl machines stop <machine-id-1> -a medio-backend
flyctl machines stop <machine-id-2> -a medio-backend

# Investigate issues
flyctl logs -a medio-backend > backend-error-logs.txt

# After fixing issues, restart from Phase 1
```

---

## Success Criteria Verification

Verify all 10 success criteria from spec.md:

- [ ] **SC-001**: Login page loads within 3 seconds
- [ ] **SC-002**: Can register account in under 2 minutes
- [ ] **SC-003**: Dashboard accessible within 5 seconds after login
- [ ] **SC-004**: Health check responds within 1 second
- [ ] **SC-005**: Logs show zero database connection errors
- [ ] **SC-006**: Health checks pass 100% for 15 minutes
- [ ] **SC-007**: Zero 502/503 errors during testing
- [ ] **SC-008**: Kids Mode loads without errors
- [ ] **SC-009**: System handles 10 concurrent logins (load test)
- [ ] **SC-010**: Database queries under 500ms (check logs)

---

## References

- Spec: `specs/001-flyio-full-deployment/spec.md`
- Research: `specs/001-flyio-full-deployment/research.md`
- Data Model: `specs/001-flyio-full-deployment/data-model.md`
- Fly.io Docs: https://fly.io/docs/
- Backend fly.toml: `backend/fly.toml`
- Frontend fly.toml: `fly.toml`

