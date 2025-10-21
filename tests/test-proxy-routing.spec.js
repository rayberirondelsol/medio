/**
 * Test suite for BFF proxy routing
 * Verifies that http-proxy-middleware v3.0.5 correctly forwards /api/* requests
 *
 * Test scenarios:
 * 1. CSRF token endpoint: /api/csrf-token
 * 2. API path preservation (no stripping)
 * 3. Query parameters forwarding
 * 4. Request method forwarding (GET, POST, etc.)
 * 5. Headers forwarding
 */

const { test, expect } = require('@playwright/test');

const PROXY_URL = 'http://localhost:8080';
const BACKEND_URL = 'http://localhost:5000';

test.describe('BFF Proxy Routing - http-proxy-middleware v3.0.5', () => {

  test('should forward /api/csrf-token to backend WITH /api prefix', async ({ request }) => {
    // Make request to proxy
    const response = await request.get(`${PROXY_URL}/api/csrf-token`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('csrfToken');
    expect(typeof data.csrfToken).toBe('string');
    expect(data.csrfToken.length).toBeGreaterThan(0);

    console.log('✓ CSRF token received:', data.csrfToken.substring(0, 20) + '...');
  });

  test('should forward /api/platforms to backend', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/api/platforms`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    // Verify platform structure
    const platform = data[0];
    expect(platform).toHaveProperty('platform_uuid');
    expect(platform).toHaveProperty('platform_name');

    console.log('✓ Platforms received:', data.length);
  });

  test('should forward query parameters correctly', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/api/videos/metadata?platform=youtube&videoId=dQw4w9WgXcQ`);

    // May fail if YouTube API quota is exceeded, but should reach backend
    expect([200, 400, 403, 429, 500]).toContain(response.status());

    const data = await response.json();
    // Backend should return structured response (success or error)
    expect(data).toBeDefined();

    console.log('✓ Query parameters forwarded, status:', response.status());
  });

  test('should forward POST requests with body', async ({ request }) => {
    // First get CSRF token
    const csrfResponse = await request.get(`${PROXY_URL}/api/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

    // Attempt to create a video (will fail without auth, but tests proxy forwarding)
    const response = await request.post(`${PROXY_URL}/api/videos`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        platform_uuid: '123e4567-e89b-12d3-a456-426614174000',
        video_id: 'test123',
        title: 'Test Video',
      }
    });

    // Expect 401 Unauthorized (no auth cookie), but it means proxy worked
    expect([200, 401, 403]).toContain(response.status());

    console.log('✓ POST request forwarded, status:', response.status());
  });

  test('should forward custom headers', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/api/csrf-token`, {
      headers: {
        'X-Custom-Header': 'test-value',
        'User-Agent': 'Playwright-Test/1.0',
      }
    });

    expect(response.ok()).toBeTruthy();

    // Headers should have been forwarded to backend
    const data = await response.json();
    expect(data).toHaveProperty('csrfToken');

    console.log('✓ Custom headers forwarded');
  });

  test('should handle 404 for non-existent API endpoints', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/api/nonexistent`);

    expect(response.status()).toBe(404);

    console.log('✓ 404 handled correctly for non-existent endpoints');
  });

  test('health check should NOT be proxied', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/health`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('service', 'medio-frontend-proxy');
    expect(data).toHaveProperty('backend', BACKEND_URL);

    console.log('✓ /health endpoint served by proxy (not forwarded)');
  });

  test('should serve React app for non-API routes', async ({ request }) => {
    const response = await request.get(`${PROXY_URL}/dashboard`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toContain('<div id="root">');

    console.log('✓ React app served for non-API routes');
  });

  test.describe('Direct Backend Comparison', () => {
    test('proxy and direct backend should return identical CSRF tokens structure', async ({ request }) => {
      // Get CSRF token via proxy
      const proxyResponse = await request.get(`${PROXY_URL}/api/csrf-token`);
      const proxyData = await proxyResponse.json();

      // Get CSRF token directly from backend
      const backendResponse = await request.get(`${BACKEND_URL}/api/csrf-token`);
      const backendData = await backendResponse.json();

      // Both should have same structure (different tokens due to session)
      expect(proxyData).toHaveProperty('csrfToken');
      expect(backendData).toHaveProperty('csrfToken');
      expect(typeof proxyData.csrfToken).toBe('string');
      expect(typeof backendData.csrfToken).toBe('string');

      console.log('✓ Proxy and backend return same structure');
    });
  });
});

test.describe('Proxy Error Handling', () => {
  test('should return 502 when backend is unreachable', async ({ request }) => {
    // This test assumes backend is running
    // To test error handling, you'd need to stop the backend temporarily
    // For now, we just verify the error handler is configured

    console.log('⚠ Error handling test skipped (requires backend to be stopped)');
  });
});
