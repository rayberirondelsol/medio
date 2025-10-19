/**
 * T005: E2E Test for nginx Cache Headers
 *
 * TDD RED Phase: These tests verify deployment cache-busting works correctly.
 * They will FAIL until nginx.conf is updated with no-cache headers for index.html.
 *
 * Tests:
 * 1. index.html returns Cache-Control: no-cache, no-store, must-revalidate
 * 2. Static JS chunks return Cache-Control: public, immutable
 * 3. After deployment simulation, browser loads new chunks
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://medio-react-app.fly.dev';

test.describe('Deployment Cache Headers', () => {
  test('T005-1: index.html should have no-cache headers', async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${FRONTEND_URL}/index.html`);

    // Assert
    expect(response.ok()).toBe(true);

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl.toLowerCase()).toContain('no-cache');
    expect(cacheControl.toLowerCase()).toContain('no-store');
    expect(cacheControl.toLowerCase()).toContain('must-revalidate');
  });

  test('T005-2: Static JS chunks should have immutable cache headers', async ({ request, page }) => {
    // Arrange: Get index.html and extract a chunk URL
    await page.goto(`${FRONTEND_URL}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Get all script tags and find a main chunk
    const scriptSrcs = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .map(script => script.getAttribute('src'))
        .filter(src => src && src.includes('static/js/main.') && src.includes('.chunk.js'));
    });

    expect(scriptSrcs.length).toBeGreaterThan(0);

    // Act: Fetch the chunk file directly
    const chunkUrl = scriptSrcs[0].startsWith('http')
      ? scriptSrcs[0]
      : `${FRONTEND_URL}${scriptSrcs[0]}`;

    const response = await request.get(chunkUrl);

    // Assert
    expect(response.ok()).toBe(true);

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
    expect(cacheControl.toLowerCase()).toContain('public');
    expect(cacheControl.toLowerCase()).toContain('immutable');
  });

  test('T005-3: Fresh browser session should load new code after deployment', async ({ page, request }) => {
    // Arrange: Simulate a deployment by checking if index.html is not cached

    // Act: Navigate to site
    await page.goto(`${FRONTEND_URL}`);
    await page.waitForLoadState('networkidle');

    // Get the current chunk hash from the loaded scripts
    const firstVisitChunks = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .map(script => script.getAttribute('src'))
        .filter(src => src && src.includes('.chunk.js'))
        .map(src => {
          const match = src.match(/\/static\/js\/main\.([a-f0-9]+)\.chunk\.js/);
          return match ? match[1] : null;
        })
        .filter(hash => hash !== null);
    });

    expect(firstVisitChunks.length).toBeGreaterThan(0);

    // Verify index.html is fetched fresh (not from cache)
    // by checking it returns no-cache headers
    const indexResponse = await request.get(`${FRONTEND_URL}/index.html`);
    const cacheControl = indexResponse.headers()['cache-control'];

    // Assert: If index.html has no-cache, it will always be fetched fresh,
    // ensuring users get updated chunk references after deployment
    expect(cacheControl).toBeDefined();
    expect(cacheControl.toLowerCase()).toContain('no-cache');

    console.log('✅ Cache headers configured correctly for deployment cache-busting');
    console.log(`   Loaded chunk hashes: ${firstVisitChunks.join(', ')}`);
  });

  test('T005-4: Verify security headers are preserved on index.html', async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${FRONTEND_URL}/index.html`);

    // Assert: Security headers should still be present
    const headers = response.headers();

    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['referrer-policy']).toBeDefined();

    console.log('✅ Security headers preserved on index.html');
  });
});
