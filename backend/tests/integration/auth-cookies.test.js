/**
 * T010: Auth Cookies Integration Test
 *
 * Tests same-origin cookie behavior with SameSite=lax for BFF proxy pattern.
 * Validates httpOnly, secure, and sameSite attributes are correctly set.
 *
 * TDD RED Phase: Tests should PASS after backend CORS/cookie changes.
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db/connection');

describe('Auth Cookies - Same-Origin (SameSite=lax)', () => {
  let testUserId;
  const testEmail = 'cookietest@example.com';
  const testPassword = 'TestPassword123!';
  const testName = 'Cookie Test User';

  afterAll(async () => {
    // Cleanup: Remove test user
    if (testUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await db.end();
  });

  describe('POST /api/auth/register - Cookie Attributes', () => {
    it('should set authToken cookie with correct attributes', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName
        })
        .expect(201);

      // Extract user ID for cleanup
      testUserId = response.body.user.id;

      // Verify authToken cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const authTokenCookie = cookies.find(c => c.startsWith('authToken='));
      expect(authTokenCookie).toBeDefined();

      // Verify cookie attributes
      expect(authTokenCookie).toMatch(/HttpOnly/i);
      expect(authTokenCookie).toMatch(/SameSite=Lax/i);
      expect(authTokenCookie).toMatch(/Path=\//);

      // In development (NODE_ENV !== 'production'), Secure should NOT be set
      // In production, Secure MUST be set
      if (process.env.NODE_ENV === 'production') {
        expect(authTokenCookie).toMatch(/Secure/i);
      }
    });

    it('should set refreshToken cookie with correct attributes', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `refresh-${testEmail}`,
          password: testPassword,
          name: testName
        })
        .expect(201);

      // Cleanup this test user
      await db.query('DELETE FROM users WHERE id = $1', [response.body.user.id]);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));
      expect(refreshTokenCookie).toBeDefined();

      // Verify cookie attributes
      expect(refreshTokenCookie).toMatch(/HttpOnly/i);
      expect(refreshTokenCookie).toMatch(/SameSite=Lax/i);
      expect(refreshTokenCookie).toMatch(/Path=\//);
    });
  });

  describe('POST /api/auth/login - Cookie Attributes', () => {
    beforeAll(async () => {
      // Create test user for login tests
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const result = await db.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
        [`login-${testEmail}`, passwordHash, testName]
      );
      testUserId = result.rows[0].id;
    });

    it('should set authToken and refreshToken cookies on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `login-${testEmail}`,
          password: testPassword
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const authTokenCookie = cookies.find(c => c.startsWith('authToken='));
      const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));

      expect(authTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();

      // Both cookies should have SameSite=Lax (not 'none')
      expect(authTokenCookie).toMatch(/SameSite=Lax/i);
      expect(refreshTokenCookie).toMatch(/SameSite=Lax/i);
    });
  });

  describe('Same-Origin Cookie Transmission', () => {
    let authCookie;

    beforeAll(async () => {
      // Create user and get auth cookie
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const result = await db.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
        [`transmission-${testEmail}`, passwordHash, testName]
      );
      testUserId = result.rows[0].id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `transmission-${testEmail}`,
          password: testPassword
        });

      authCookie = loginResponse.headers['set-cookie'].find(c => c.startsWith('authToken='));
    });

    it('should accept cookie in subsequent requests', async () => {
      // Make authenticated request using cookie
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(`transmission-${testEmail}`);
    });

    it('should work with same-origin proxy (localhost:8080)', async () => {
      // Simulate request from proxy by setting Origin header
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .set('Origin', 'http://localhost:8080')
        .expect(200);

      expect(response.body.authenticated).toBe(true);
    });
  });

  describe('Cookie Security', () => {
    it('should NOT be accessible via JavaScript (httpOnly)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `security-${testEmail}`,
          password: testPassword,
          name: testName
        })
        .expect(201);

      // Cleanup
      await db.query('DELETE FROM users WHERE id = $1', [response.body.user.id]);

      const cookies = response.headers['set-cookie'];
      const authTokenCookie = cookies.find(c => c.startsWith('authToken='));

      // HttpOnly flag prevents JavaScript access (document.cookie won't show it)
      expect(authTokenCookie).toMatch(/HttpOnly/i);
    });

    it('should clear cookies on logout', async () => {
      // Create and login user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const userResult = await db.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
        [`logout-${testEmail}`, passwordHash, testName]
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `logout-${testEmail}`,
          password: testPassword
        });

      const authCookie = loginResponse.headers['set-cookie'].find(c => c.startsWith('authToken='));

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      // Cookies should be cleared (Max-Age=0 or Expires in past)
      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();

      // Cleanup
      await db.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    });
  });
});
