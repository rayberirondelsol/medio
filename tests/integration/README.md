# Integration Tests

Comprehensive integration tests for the Medio API that verify end-to-end functionality without mocking. These tests make real HTTP requests to the running application.

## Test Suites

### 1. Video Creation (`video-creation.test.js`)
Tests the complete video creation workflow:
- ✅ Authentication (CSRF token, registration, login)
- ✅ Platform lookup (GET /api/platforms)
- ✅ Video creation (POST /api/videos)
- ✅ Duplicate detection (409 Conflict)
- ✅ Validation (required fields, age rating)
- ✅ Video retrieval with pagination
- ✅ Error handling (401, 404, 400)

### 2. NFC Chip Registration (`nfc-registration.test.js`)
Tests the complete NFC chip management workflow:
- ✅ Authentication (CSRF token, registration, login)
- ✅ Chip registration (POST /api/nfc/chips)
- ✅ Duplicate detection (409 Conflict)
- ✅ UID normalization (multiple formats)
- ✅ Validation (UID format, label length)
- ✅ Chip listing (GET /api/nfc/chips)
- ✅ Chip deletion (DELETE /api/nfc/chips/:id)
- ✅ Rate limiting (429 Too Many Requests)
- ✅ Error handling (401, 403, 404)

## Running Tests

### Prerequisites
- Node.js 16+ and npm installed
- API server running (local or production)

### Local Testing

#### Option 1: Test against local development server
```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start BFF proxy
npm run start:prod

# Terminal 3: Run integration tests
npm run test:integration:local
```

#### Option 2: Run with Docker Compose (full stack)
```bash
# Start all services (postgres + backend + frontend proxy)
docker compose up -d

# Wait for services to be ready
sleep 10

# Run integration tests
npm run test:integration:local
```

### Production Testing

Test against the live production app on Fly.io:

```bash
npm run test:integration:production
```

This will run all integration tests against `https://medio-react-app.fly.dev`.

### Custom Base URL

To test against a custom URL:

```bash
TEST_BASE_URL=https://your-custom-url.com npm run test:integration
```

## Test Output

### Console Output
Tests provide detailed logging:
- `[SETUP]` - Test initialization
- `[CSRF]` - CSRF token operations
- `[REGISTER]` - User registration
- `[AUTH CHECK]` - Authentication verification
- `[PLATFORMS]` - Platform lookup
- `[VIDEO CREATE]` - Video creation operations
- `[CHIP REGISTER]` - NFC chip operations
- `[CLEANUP]` - Test cleanup

### HTML Report
After test completion, view the detailed HTML report:
```bash
open test-results/integration-test-report.html
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_BASE_URL` | `http://localhost:8080` | Base URL for API requests |
| `NODE_ENV` | `test` | Node environment |

## Debugging Failed Tests

### Database Connection Issues
If tests fail with database errors:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# View backend logs
cd backend && npm start
# Look for "Database connection successful"
```

### CSRF Token Issues
If tests fail with 403 Forbidden (CSRF):
- Ensure cookies are being set and forwarded
- Check that CSRF token is in response
- Verify BFF proxy is running (not direct backend)

### Authentication Issues
If tests fail with 401 Unauthorized:
- Check that registration is successful
- Verify cookies are being stored
- Confirm token refresh is working

### Rate Limiting
If tests fail with 429 Too Many Requests:
- Wait 15 minutes for rate limit to reset
- Or temporarily increase rate limits in backend

## Test Data Cleanup

Tests automatically clean up after themselves:
- Test users are logged out after each suite
- Unique email addresses are generated per test run
- Database constraints prevent duplicate data

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Integration Tests
  run: |
    npm run build
    npm run start:prod &
    sleep 10
    npm run test:integration:local
  env:
    TEST_BASE_URL: http://localhost:8080
```

## Troubleshooting

### "API not available" error
**Problem:** Global setup fails to connect to API

**Solutions:**
1. Verify server is running: `curl http://localhost:8080/health`
2. Check port conflicts: `lsof -i :8080`
3. Increase retry timeout in `globalSetup.js`

### "Database connection refused" error
**Problem:** Backend can't connect to PostgreSQL

**Solutions:**
1. Start PostgreSQL: `docker compose up -d postgres`
2. Check database credentials in `backend/.env`
3. Verify database is accepting connections: `psql -h localhost -U medio -d medio`

### Tests pass locally but fail in production
**Problem:** Production has different configuration

**Investigate:**
1. Check production logs: `flyctl logs --app medio-react-app`
2. Verify environment variables: `flyctl ssh console --app medio-react-app`
3. Test API manually: `curl https://medio-react-app.fly.dev/health`

## Writing New Integration Tests

Follow this pattern:

```javascript
describe('My Feature Integration Tests', () => {
  let authCookies = '';
  let csrfToken = '';

  beforeAll(async () => {
    // Setup: Authenticate
    const csrfRes = await apiRequest('GET', '/api/csrf-token');
    csrfToken = csrfRes.data.csrfToken;

    const registerRes = await apiRequest('POST', '/api/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!',
      name: 'Test User'
    });
    authCookies = /* extract from response */;
  });

  it('should test my feature', async () => {
    const response = await apiRequest('POST', '/api/my-endpoint', {
      // test data
    });

    expect(response.status).toBe(200);
    // assertions
  });

  afterAll(async () => {
    // Cleanup
    await apiRequest('POST', '/api/auth/logout');
  });
});
```

## Test Coverage

These integration tests cover:
- ✅ All authentication flows (register, login, refresh, logout)
- ✅ All video endpoints (create, list, delete)
- ✅ All NFC endpoints (create, list, delete, map)
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Error handling
- ✅ Validation
- ✅ Pagination
- ✅ Duplicate detection

## Support

For issues or questions:
1. Check this README
2. Review test output logs
3. Check backend logs
4. Open an issue with:
   - Test output
   - Backend logs
   - Environment details (local/production)
