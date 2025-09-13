const { test, expect } = require('@playwright/test');

// Load environment variables
require('dotenv').config({ path: '.env.azure' });

const APP_URL = process.env.APP_URL || 'https://your-app-name.azurewebsites.net';
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'password123';

test.describe('Azure App Service Deployment Tests', () => {

  test('should require basic authentication', async ({ page }) => {
    // Navigate to the app without credentials
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Should get 401 Unauthorized or be redirected to auth
    expect(response.status()).toBe(401);
  });

  test('should accept valid basic auth credentials', async ({ page }) => {
    // Set basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64')}`
    });

    // Navigate to the app with credentials
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Should successfully load the app
    expect(response.status()).toBe(200);

    // Should see React app content
    await expect(page).toHaveTitle(/React App/);

    // Check if main React content is visible
    const reactContent = await page.locator('body').textContent();
    expect(reactContent).toContain('React');
  });

  test('should reject invalid basic auth credentials', async ({ page }) => {
    // Set invalid basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from('invalid:credentials').toString('base64')}`
    });

    // Navigate to the app with invalid credentials
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Should get 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should serve static assets with authentication', async ({ page }) => {
    // Set basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64')}`
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Check that CSS and JS files are loaded
    const styleSheets = await page.locator('link[rel="stylesheet"]').count();
    const scripts = await page.locator('script[src]').count();

    expect(styleSheets).toBeGreaterThan(0);
    expect(scripts).toBeGreaterThan(0);
  });

  test('should have proper security headers', async ({ page }) => {
    // Set basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64')}`
    });

    const response = await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Check security headers
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-xss-protection']).toBe('1; mode=block');
    expect(headers['strict-transport-security']).toBeTruthy();
  });

  test('should handle React routing correctly', async ({ page }) => {
    // Set basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64')}`
    });

    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Try accessing a non-existent route (should still serve index.html for SPA)
    const response = await page.goto(`${APP_URL}/non-existent-route`, { waitUntil: 'networkidle' });

    // Should return 200 and serve the React app (SPA routing)
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/React App/);
  });

  test('should be accessible over HTTPS only', async ({ page }) => {
    // Test that HTTP redirects to HTTPS (if configured)
    const httpUrl = APP_URL.replace('https://', 'http://');

    try {
      const response = await page.goto(httpUrl, { waitUntil: 'networkidle', timeout: 10000 });
      // Should either redirect to HTTPS or fail to connect
      expect(response.status()).not.toBe(200);
    } catch (error) {
      // Connection refused or redirect is expected for HTTPS-only
      expect(error.message).toMatch(/net::|ERR_SSL_PROTOCOL_ERROR|redirected/);
    }
  });

});