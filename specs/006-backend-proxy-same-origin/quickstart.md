# Quickstart: Same-Origin Authentication

**Feature**: 006-backend-proxy-same-origin
**Date**: 2025-10-21

## Development Setup

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- Backend running on `http://localhost:5000` or configured URL

### Quick Start (Docker - Recommended)

```bash
# 1. Start backend (separate terminal)
cd backend
make dev

# 2. Start frontend with proxy (separate terminal)
cd ../
make dev

# 3. Access application
open http://localhost:8080
```

**Environment Variables** (auto-configured in docker-compose.yml):
- `BACKEND_URL=http://backend:5000` (Docker internal network)
- `PORT=8080` (frontend proxy server port)

---

### Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Start backend
cd backend
npm install
npm run dev  # Runs on http://localhost:5000

# 3. Start frontend proxy (separate terminal)
cd ../
export BACKEND_URL=http://localhost:5000
npm run start:prod  # Runs proxy server on http://localhost:8080

# Or use React dev server for development (no auth testing)
npm start  # Runs CRA dev server on http://localhost:3000 (CORS issues expected)
```

**When to use each mode**:
- `npm start` (CRA dev server): Fast development, hot reload, but authentication will NOT work (cross-origin)
- `npm run start:prod` (proxy server): Test authentication flows, slower (no hot reload)

---

## Production Deployment

### Build and Deploy to Fly.io

```bash
# 1. Build Docker image
docker build -t medio-frontend .

# 2. Deploy frontend
fly deploy

# 3. Set environment variables
fly secrets set BACKEND_URL=https://medio-backend.fly.dev

# 4. Verify deployment
curl https://medio-react-app.fly.dev/api/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00Z"
}
```

---

## Testing Authentication

### Manual Testing

1. **Register New User**
   ```bash
   # Navigate to registration page
   open http://localhost:8080/register

   # Fill form: email, password, name
   # Submit → Should redirect to /dashboard
   ```

2. **Verify Session Cookie**
   ```bash
   # Open browser DevTools → Application → Cookies
   # Should see:
   #   authToken: [JWT] (httpOnly, secure, sameSite=lax)
   #   refreshToken: [JWT] (httpOnly, secure, sameSite=lax)
   ```

3. **Test API Calls**
   ```bash
   # Navigate to Videos page
   open http://localhost:8080/videos

   # Open Network tab → Should see:
   #   GET /api/videos → 200 OK (no 401 errors)
   ```

### Automated E2E Tests

```bash
# Run full authentication flow tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/auth-flow.spec.ts

# Debug mode (see browser)
npx playwright test --debug
```

**Critical Test Paths**:
- Registration → Dashboard (P1)
- Login → Videos page navigation (P1)
- NFC Manager workflow (P2)
- Extended session (14+ minutes) (P3)

---

## Troubleshooting

### Issue: 502 Bad Gateway on all API calls

**Cause**: Backend not running or `BACKEND_URL` incorrect

**Fix**:
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Verify BACKEND_URL environment variable
echo $BACKEND_URL

# Check Docker network (if using Docker)
docker network inspect medio_default
```

---

### Issue: 401 Unauthorized after login

**Cause**: Cookies not being set or sent

**Check**:
1. Browser DevTools → Application → Cookies → Verify `authToken` present
2. Network tab → Request headers → Verify `Cookie: authToken=...` sent
3. Backend logs → Verify `Set-Cookie` header in response

**Common Fixes**:
- Clear cookies: DevTools → Application → Clear storage
- Check SameSite setting: Should be `'lax'` in production
- Verify HTTPS in production (cookies with `secure: true` require HTTPS)

---

### Issue: Hot reload not working in development

**Expected**: Proxy server (`npm run start:prod`) does NOT support hot reload

**Workaround**:
- Use `npm start` (CRA dev server) for UI development (auth won't work)
- Use `npm run start:prod` only when testing authentication flows
- Restart proxy server manually after code changes

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_URL` | Yes | `https://medio-backend.fly.dev` | Backend API base URL |
| `PORT` | No | `8080` | Proxy server port |
| `NODE_ENV` | No | `production` | Environment (development/production) |

### Package.json Scripts

```json
{
  "scripts": {
    "start": "react-scripts start",           // CRA dev server (no auth)
    "start:prod": "node server.js",           // Proxy server (auth works)
    "build": "react-scripts build",           // Production build
    "test": "react-scripts test",             // Unit tests
    "test:e2e": "playwright test",            // E2E tests
    "test:coverage": "react-scripts test --coverage --watchAll=false"
  }
}
```

---

## Next Steps

1. ✅ Complete `/speckit.plan` workflow (research, data-model, contracts, quickstart)
2. ⏳ Run `/speckit.tasks` to generate implementation tasks
3. ⏳ Write E2E tests (TDD - red phase)
4. ⏳ Implement `server.js` proxy (green phase)
5. ⏳ Update backend CORS and cookie settings
6. ⏳ Deploy backend → Deploy frontend → Verify production
