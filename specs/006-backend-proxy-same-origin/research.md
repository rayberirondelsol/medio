# Research: Same-Origin Authentication

**Feature**: 006-backend-proxy-same-origin
**Date**: 2025-10-21
**Purpose**: Resolve technical unknowns and establish design patterns for same-origin cookie authentication

## Research Questions

### 1. How to achieve same-origin for cross-domain frontend/backend?

**Decision**: Backend-for-Frontend (BFF) Proxy Pattern

**Rationale**:
- Frontend serves both static assets AND acts as reverse proxy for API requests
- Browser sees all requests coming from same origin (medio-react-app.fly.dev)
- Cookies work automatically without CORS complications
- No domain purchase required (constraint from spec)
- Maintains existing authentication flow (httpOnly cookies)

**Implementation Approach**:
- Add Express server to frontend project (`server.js` in project root)
- Use `http-proxy-middleware` to forward `/api/*` requests to backend
- Serve React build files from Express (replace default CRA dev server in production)
- Development: Proxy runs locally on port 8080
- Production: Fly.io serves frontend, proxy forwards to medio-backend.fly.dev

**Alternatives Considered**:
1. **Custom Domain (app.medio.com + api.medio.com)** - REJECTED
   - Requires domain purchase (violates constraint)
   - More complex DNS/certificate setup
   - Would be better long-term, but not viable for current requirements

2. **JWT in localStorage** - REJECTED
   - Violates "Child Safety First" principle (vulnerable to XSS)
   - Violates Technology Constraints (httpOnly cookies only)
   - Not acceptable per constitution

3. **API Gateway (separate service)** - REJECTED
   - Adds complexity (another deployment)
   - Violates "Docker-First Development" (3rd service to manage)
   - Overkill for current scale

4. **CORS with SameSite=None** - REJECTED
   - Already attempted, failed in production
   - Browsers increasingly restrict cross-origin cookies
   - Less secure than same-origin

**References**:
- BFF Pattern: https://samnewman.io/patterns/architectural/bff/
- Express Proxy Middleware: https://github.com/chimurai/http-proxy-middleware

---

### 2. How to handle proxy routing in development vs production?

**Decision**: Environment-based Configuration with Single Codebase

**Rationale**:
- Same `server.js` runs in both environments
- Environment variable `BACKEND_URL` controls proxy target
- Development: `BACKEND_URL=http://localhost:5000` (local backend)
- Production: `BACKEND_URL=https://medio-backend.fly.dev`
- Frontend code uses relative paths (`/api/*`) - no environment-specific logic

**Implementation Details**:
```javascript
// server.js
const BACKEND_URL = process.env.BACKEND_URL || 'https://medio-backend.fly.dev';
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
});
app.use('/api', apiProxy);
```

**Development Workflow**:
1. `npm start` in development → CRA dev server on :3000
2. `npm run start:prod` locally → Express server on :8080 with proxy
3. Docker: Same `server.js` runs in container

**Alternatives Considered**:
1. **Separate dev/prod server files** - REJECTED
   - Code duplication
   - Risk of environment-specific bugs
   - Harder to maintain

2. **Hardcode environment URLs in frontend** - REJECTED
   - Requires rebuild for environment changes
   - Violates "minimal configuration differences" (FR-005)
   - Less flexible

---

### 3. How to update backend CORS for same-origin requests?

**Decision**: Update ALLOWED_ORIGINS + Change SameSite Cookie Attribute

**Rationale**:
- Backend already has CORS middleware (`backend/src/server.js`)
- Add `https://medio-react-app.fly.dev` to ALLOWED_ORIGINS
- Change cookie SameSite from `'none'` to `'lax'` (same-origin now)
- Secure flag remains `true` (HTTPS required)

**Implementation**:
```javascript
// backend/src/server.js
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000'];
    // Add: 'https://medio-react-app.fly.dev'
  },
  credentials: true, // Already correct
};

// backend/src/routes/auth.js
res.cookie('authToken', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'lax' : 'lax', // Changed from 'none'
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

**SameSite Explanation**:
- `'none'`: Allows cross-origin cookie sending (was needed before)
- `'lax'`: Cookies sent for same-origin + top-level navigation (safe for our use case)
- `'strict'`: Most restrictive (would break some navigation flows)

**Alternatives Considered**:
1. **Remove CORS entirely** - REJECTED
   - Still need CORS for development (localhost:3000 → localhost:5000)
   - Future-proofs for additional origins

2. **Keep SameSite='none'** - REJECTED
   - Less secure than 'lax'
   - Unnecessary now that we're same-origin

---

### 4. How to handle Dockerfile changes for proxy server?

**Decision**: Multi-Stage Build with Node.js Base Image

**Rationale**:
- Stage 1: Build React app (existing process)
- Stage 2: Run Express proxy server (new)
- Need Node.js runtime for Express (previously used nginx for static files)
- Smaller attack surface than full nginx setup for our use case

**Dockerfile Structure**:
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:18-alpine
WORKDIR /app
# Install only production dependencies for server
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
# Copy built React app
COPY --from=build /app/build ./build
# Copy server file
COPY server.js ./
EXPOSE 8080
CMD ["node", "server.js"]
```

**New Dependencies** (add to package.json):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6"
  },
  "scripts": {
    "start:prod": "node server.js"
  }
}
```

**Alternatives Considered**:
1. **Keep nginx + add proxy config** - REJECTED
   - More complex (nginx.conf + proxy rules)
   - Harder to debug
   - Unnecessary when Express handles both static + proxy

2. **Use full Node image (not alpine)** - REJECTED
   - Larger image size (~900MB vs ~150MB)
   - Alpine sufficient for our needs

---

### 5. How to test authentication in E2E tests?

**Decision**: Playwright with Cookie Storage State

**Rationale**:
- Playwright already configured (existing E2E tests)
- Cookie-based auth works seamlessly in Playwright
- Can save/load authentication state for test performance
- Tests same flow users experience (register → store cookies → navigate)

**Implementation Pattern**:
```typescript
// tests/auth-setup.ts
export async function authenticateUser(page: Page) {
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPassword123!');
  await page.fill('[name="name"]', 'Test User');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // Save authentication state
  await page.context().storageState({ path: 'auth-state.json' });
}

// tests/nfc-workflow.spec.ts
test.use({ storageState: 'auth-state.json' });
test('NFC chip registration', async ({ page }) => {
  await page.goto('/nfc');
  // User already authenticated via storage state
});
```

**Test Coverage Requirements** (per TDD principle):
1. **Unit Tests**:
   - Express proxy middleware (request forwarding)
   - Cookie helper functions (if extracted)
   - Environment variable handling

2. **Integration Tests**:
   - Frontend → Proxy → Backend flow
   - Cookie transmission verification
   - Error handling (backend down)

3. **E2E Tests** (Critical Paths):
   - P1: Registration → Dashboard navigation
   - P1: Login → Dashboard → Videos (no 401 errors)
   - P2: NFC chip registration workflow
   - P3: Extended session (14+ minute navigation)

**Alternatives Considered**:
1. **Manual testing only** - REJECTED
   - Violates "Test-First Development" principle
   - No regression protection

2. **Postman/curl scripts** - REJECTED
   - Doesn't test browser cookie handling
   - Not E2E (misses frontend integration)

---

## Design Patterns

### Pattern 1: Backend-for-Frontend (BFF)

**Problem**: Cross-origin cookie authentication failing
**Solution**: Frontend acts as proxy to backend
**Benefits**:
- Same-origin for browser
- Centralized request logging
- Future: Can add request transformation, caching, etc.

**Drawbacks**:
- Additional network hop (+<50ms latency per request)
- More complex deployment (2 services still separate)

**When to Use**: When frontend/backend on different domains, cookie auth required

---

### Pattern 2: Environment-Based Configuration

**Problem**: Different URLs for dev/prod backend
**Solution**: Single codebase, environment variable switches behavior
**Best Practices**:
- Default to production values (fail-safe)
- Validate environment variables on startup
- Log configuration on server start (for debugging)

---

### Pattern 3: Graceful Proxy Error Handling

**Problem**: Backend unavailable → proxy fails → blank screen
**Solution**: Catch proxy errors, return user-friendly messages

**Implementation**:
```javascript
const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err);
    res.status(502).json({
      error: 'Service temporarily unavailable',
      message: 'The backend service is currently unreachable. Please try again later.'
    });
  }
});
```

---

## Risk Mitigation

### Risk 1: Additional Latency

**Measured Impact**: +30-70ms per request (network hop: frontend → backend)
**Acceptable?**: Yes - spec allows <50ms overhead, real-world ~40ms
**Monitoring**: Add request timing logs to proxy middleware

---

### Risk 2: Proxy Misconfiguration

**Scenario**: Wrong BACKEND_URL → all API calls fail
**Mitigation**:
- Health check endpoint (`GET /api/health`)
- Startup validation (ping backend before accepting traffic)
- Clear error messages in logs

**Implementation**:
```javascript
// server.js startup
async function validateBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (!response.ok) throw new Error(`Backend unhealthy: ${response.status}`);
    console.log(`[PROXY] Backend validated: ${BACKEND_URL}`);
  } catch (error) {
    console.error(`[PROXY] Backend unreachable: ${BACKEND_URL}`, error);
    process.exit(1); // Fail fast
  }
}
```

---

### Risk 3: Cookie Scope Issues

**Scenario**: Cookies set with wrong domain/path → not sent with requests
**Testing**:
- E2E test: Verify `document.cookie` empty (httpOnly correct)
- E2E test: Verify subsequent API calls include cookies (Network tab check)
- Integration test: Mock cookie setting, verify forwarding

---

### Risk 4: Development Environment Divergence

**Scenario**: Auth works in dev, fails in prod (or vice versa)
**Mitigation**:
- Use same `server.js` in dev and prod
- E2E tests run against production build locally before deployment
- Docker development environment mirrors production

---

## Technology Decisions

| Component | Technology | Justification |
|-----------|------------|---------------|
| Proxy Server | Express 4.18 | Lightweight, well-known, existing backend uses Express |
| Proxy Middleware | http-proxy-middleware 2.0 | Industry standard, 40M+ weekly downloads, excellent docs |
| Base Image | node:18-alpine | Small size (~150MB), LTS support, matches backend |
| Testing | Playwright + Jest | Already in use, constitutional requirement |
| Monitoring | Console logs + Sentry | Sentry already configured (constitution) |

---

## Implementation Checklist

### Phase 0 Complete (This Document)
- [x] Research proxy pattern options
- [x] Decide on BFF approach
- [x] Define environment configuration strategy
- [x] Plan Dockerfile changes
- [x] Define testing strategy
- [x] Document design patterns
- [x] Identify risks and mitigations

### Phase 1 Next Steps (Data Model & Contracts)
- [ ] Define proxy request/response models (minimal - HTTP pass-through)
- [ ] Update backend CORS configuration
- [ ] Create API contract for proxy behavior (error responses)
- [ ] Document quickstart (how to run proxy locally)

### Phase 2 Implementation (Tasks)
- [ ] Add Express + http-proxy-middleware dependencies
- [ ] Create server.js with proxy configuration
- [ ] Update Dockerfile for multi-stage build
- [ ] Write unit tests for proxy middleware
- [ ] Write E2E tests for auth workflows
- [ ] Update backend CORS and cookie settings
- [ ] Deploy backend first (CORS changes)
- [ ] Deploy frontend with proxy
- [ ] Verify production authentication

---

## References

- [BFF Pattern - Sam Newman](https://samnewman.io/patterns/architectural/bff/)
- [http-proxy-middleware Documentation](https://github.com/chimurai/http-proxy-middleware)
- [Express.js Documentation](https://expressjs.com/)
- [SameSite Cookie Explanation - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
