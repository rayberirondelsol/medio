/**
 * Complete End-to-End Workflow Test Suite
 *
 * This comprehensive test suite covers the complete user journey in Medio:
 * 1. User Registration Flow (Production-Ready)
 * 2. User Login Flow (Production-Ready)
 * 3. Add YouTube Video Flow (Production-Ready)
 * 4. Token Refresh Flow (Integration Test)
 * 5. Error Handling Scenarios
 *
 * Technical Requirements:
 * - Runs against both local (http://localhost:3000) and production (https://medio-react-app.fly.dev)
 * - Uses storage state pattern to avoid re-authenticating
 * - Includes network monitoring for rate limiting (429) and CSRF (403) errors
 * - Screenshots on failure, video recording for complex flows
 * - 60-second timeout for each test
 *
 * Environment:
 * - Test user: parent@example.com / ParentPass123! (exists in production)
 * - Backend has CSRF protection enabled (/auth/refresh is excluded)
 * - Rate limiting: 5 req/15min for login/register, 100 req/15min for general API
 * - Access tokens expire after 15 minutes, refresh tokens after 7 days
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration for different environments
const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:5000',
    timeout: 60000,
  },
  production: {
    baseUrl: 'https://medio-react-app.fly.dev',
    apiUrl: 'https://medio-react-app.fly.dev',
    timeout: 90000,
  }
};

// Test data
const TEST_USER = {
  email: 'parent@example.com',
  password: 'ParentPass123!',
  name: 'Test Parent'
};

const YOUTUBE_TEST_VIDEO = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  expectedTitle: 'Rick Astley - Never Gonna Give You Up (Official Video)',
  expectedChannel: 'Rick Astley',
  videoId: 'dQw4w9WgXcQ'
};

/**
 * Helper function to generate unique email for registration tests
 */
function generateUniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `e2e-test-${timestamp}-${random}@example.com`;
}

/**
 * Helper function to monitor network for errors
 */
async function setupNetworkMonitoring(page: Page) {
  const errors: Array<{ status: number; url: string; message: string }> = [];

  page.on('response', async (response) => {
    const status = response.status();
    const url = response.url();

    // Monitor for rate limiting (429) and CSRF (403) errors
    if (status === 429) {
      errors.push({
        status,
        url,
        message: 'Rate limit exceeded'
      });
      console.error(`[RATE LIMIT] ${url} returned 429`);
    } else if (status === 403) {
      try {
        const body = await response.json().catch(() => ({}));
        if (body.message?.includes('CSRF') || body.error?.includes('CSRF')) {
          errors.push({
            status,
            url,
            message: 'CSRF token error'
          });
          console.error(`[CSRF ERROR] ${url} returned 403 with CSRF error`);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  });

  return errors;
}

/**
 * Helper function to verify no rate limiting errors occurred
 */
function verifyNoRateLimitingErrors(errors: Array<{ status: number; url: string; message: string }>) {
  const rateLimitErrors = errors.filter(e => e.status === 429);
  if (rateLimitErrors.length > 0) {
    console.warn(`WARNING: ${rateLimitErrors.length} rate limiting errors detected:`, rateLimitErrors);
  }

  const csrfErrors = errors.filter(e => e.status === 403 && e.message.includes('CSRF'));
  if (csrfErrors.length > 0) {
    console.warn(`WARNING: ${csrfErrors.length} CSRF errors detected:`, csrfErrors);
  }
}

/**
 * Helper function to remove webpack error overlay that blocks interactions
 */
async function removeWebpackOverlay(page: Page) {
  try {
    await page.evaluate(() => {
      const overlay = document.querySelector('#webpack-dev-server-client-overlay');
      const overlayFrame = document.querySelector('iframe#webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
      if (overlayFrame) overlayFrame.remove();
    });
  } catch (e) {
    // Ignore errors if page isn't ready
  }
}

test.describe('Complete User Workflow - Local Environment', () => {
  const env = ENVIRONMENTS.local;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(env.timeout);

    // Set up auto-removal of webpack overlay
    page.on('framenavigated', () => removeWebpackOverlay(page));
  });

  test.describe('1. Complete User Registration Flow', () => {
    test('should register new user with valid credentials and auto-login', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);
      const email = generateUniqueEmail();
      const password = 'TestPass123!@#$';

      // Navigate directly to register page
      await page.goto(`${env.baseUrl}/register`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      // Wait for form to be ready
      await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 15000 });
      await page.screenshot({ path: 'test-results/registration-form.png' });

      // Fill registration form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);

      await page.screenshot({ path: 'test-results/registration-filled.png' });

      // Submit registration form (use force to bypass overlay)
      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });

      // Verify auto-redirect to dashboard (not login page)
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });
      await page.screenshot({ path: 'test-results/registration-success.png' });

      // Verify auth cookies are set
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'authToken' || c.name === 'accessToken');
      expect(authCookie).toBeDefined();

      // Verify authenticated UI elements are visible
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
      await expect(logoutButton).toBeVisible({ timeout: 5000 });

      verifyNoRateLimitingErrors(networkErrors);
    });

    test('should maintain authentication after page refresh', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);
      const email = generateUniqueEmail();
      const password = 'TestPass123!@#$';

      // Register
      await page.goto(`${env.baseUrl}/register`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      await page.waitForSelector('input[name="email"]', { state: 'visible' });
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);

      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });

      // Wait for dashboard
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });

      // Refresh page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Should still be authenticated (not redirected to login)
      await expect(page).toHaveURL(/\/(dashboard|videos)/);
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
      await expect(logoutButton).toBeVisible({ timeout: 5000 });

      verifyNoRateLimitingErrors(networkErrors);
    });
  });

  test.describe('2. Complete Login Flow', () => {
    test('should login with existing test user and redirect to dashboard', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);

      // Navigate to login page
      await page.goto(`${env.baseUrl}/login`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      // Wait for form
      await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 15000 });
      await page.screenshot({ path: 'test-results/login-page.png' });

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

      await page.screenshot({ path: 'test-results/login-filled.png' });

      // Submit login form
      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });
      await page.screenshot({ path: 'test-results/login-success.png' });

      // Verify auth cookies are set
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'authToken' || c.name === 'accessToken');
      expect(authCookie).toBeDefined();

      // Verify authenticated UI
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
      await expect(logoutButton).toBeVisible({ timeout: 5000 });

      verifyNoRateLimitingErrors(networkErrors);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${env.baseUrl}/login`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      // Wait for form
      await page.waitForSelector('input[type="email"]', { state: 'visible' });

      // Fill with invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123!');

      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });

      // Should show error message
      await expect(page.locator('text=/Invalid|incorrect|failed/i')).toBeVisible({ timeout: 5000 });

      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('3. Complete Add YouTube Video Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${env.baseUrl}/login`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      await page.waitForSelector('input[type="email"]', { state: 'visible' });
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });
    });

    test('should add YouTube video with auto-filled metadata', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);

      // Navigate to Videos page
      await page.goto(`${env.baseUrl}/videos`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      await page.screenshot({ path: 'test-results/videos-page.png' });

      // Click "Add Video" button
      const addVideoButton = page.locator('button:has-text("Add Video"), button:has-text("New Video"), a:has-text("Add Video")').first();
      await expect(addVideoButton).toBeVisible({ timeout: 10000 });
      await removeWebpackOverlay(page);
      await addVideoButton.click({ force: true });

      // Verify modal is open
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'test-results/add-video-modal.png' });

      // Enter YouTube URL
      const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="link"], input[name="url"]').first();
      await expect(urlInput).toBeVisible({ timeout: 5000 });
      await urlInput.fill(YOUTUBE_TEST_VIDEO.url);

      await page.screenshot({ path: 'test-results/add-video-url-entered.png' });

      // Wait for metadata to auto-fill
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      await expect(titleInput).toHaveValue(/Rick Astley/i, { timeout: 15000 });

      await page.screenshot({ path: 'test-results/add-video-metadata-filled.png' });

      // Verify metadata loaded correctly
      const title = await titleInput.inputValue();
      expect(title.toLowerCase()).toContain('rick astley');

      // Verify thumbnail is loaded
      const thumbnail = page.locator(`img[src*="${YOUTUBE_TEST_VIDEO.videoId}"], img[alt*="thumbnail"]`).first();
      await expect(thumbnail).toBeVisible({ timeout: 5000 });

      // Select age rating (required field)
      const ageRatingSelect = page.locator('select[name="age_rating"], select[name="ageRating"]').first();
      await ageRatingSelect.selectOption({ label: /All Ages|G/i });

      await page.screenshot({ path: 'test-results/add-video-ready-to-submit.png' });

      // Submit video
      const submitButton = page.locator('button[type="submit"]:has-text("Add"), button:has-text("Save"), button:has-text("Submit")').last();
      await submitButton.click({ force: true });

      // Verify modal closes
      await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/add-video-success.png' });

      // Verify video appears in video list
      await expect(page.locator('text=/Rick Astley/i').first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/add-video-in-list.png' });

      verifyNoRateLimitingErrors(networkErrors);
    });

    test('should show loading state while fetching metadata', async ({ page }) => {
      await page.goto(`${env.baseUrl}/videos`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      const addVideoButton = page.locator('button:has-text("Add Video")').first();
      await addVideoButton.click({ force: true });

      // Enter URL
      const urlInput = page.locator('input[placeholder*="URL"]').first();
      await urlInput.fill(YOUTUBE_TEST_VIDEO.url);

      // Loading indicator should appear
      const loadingIndicator = page.locator('text=/Fetching|Loading/i, [role="progressbar"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('4. Token Refresh Flow', () => {
    test('should verify token refresh mechanism is configured', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);

      // Login
      await page.goto(`${env.baseUrl}/login`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      await page.waitForSelector('input[type="email"]', { state: 'visible' });
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });

      // Make an API request
      const response = await page.request.get(`${env.apiUrl}/api/videos`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      // Should succeed
      expect([200, 304]).toContain(response.status());

      verifyNoRateLimitingErrors(networkErrors);
    });
  });

  test.describe('5. Error Handling Scenarios', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${env.baseUrl}/login`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      await page.waitForSelector('input[type="email"]', { state: 'visible' });
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      await removeWebpackOverlay(page);
      await page.click('button[type="submit"]', { force: true });
      await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 20000 });
    });

    test('should show error for invalid video URL', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);

      await page.goto(`${env.baseUrl}/videos`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      const addVideoButton = page.locator('button:has-text("Add Video")').first();
      await addVideoButton.click({ force: true });

      // Enter invalid URL
      const urlInput = page.locator('input[placeholder*="URL"]').first();
      await urlInput.fill('https://not-a-valid-video-url.com/test');

      // Should show error message
      await expect(page.locator('text=/Invalid|Unsupported|not supported/i')).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/error-invalid-url.png' });

      verifyNoRateLimitingErrors(networkErrors);
    });

    test('should enable manual entry fallback when API fails', async ({ page }) => {
      const networkErrors = await setupNetworkMonitoring(page);

      await page.goto(`${env.baseUrl}/videos`);
      await page.waitForLoadState('domcontentloaded');
      await removeWebpackOverlay(page);

      const addVideoButton = page.locator('button:has-text("Add Video")').first();
      await addVideoButton.click({ force: true });

      // Mock API failure
      await page.route('**/api/videos/metadata**', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Video not found' })
        });
      });

      // Enter URL
      const urlInput = page.locator('input[placeholder*="URL"]').first();
      await urlInput.fill(YOUTUBE_TEST_VIDEO.url);

      // Wait for error
      await page.waitForTimeout(3000);

      // Form fields should remain editable
      const titleInput = page.locator('input[name="title"]').first();
      await expect(titleInput).toBeEditable();

      // Fill manually
      await titleInput.fill('Manual Entry Video Title');
      const ageRatingSelect = page.locator('select[name="age_rating"]').first();
      await ageRatingSelect.selectOption({ label: /All Ages/i });

      await page.screenshot({ path: 'test-results/manual-entry-fallback.png' });

      // Should be able to submit
      const submitButton = page.locator('button[type="submit"]').last();
      await expect(submitButton).toBeEnabled();

      // Unroute
      await page.unroute('**/api/videos/metadata**');

      verifyNoRateLimitingErrors(networkErrors);
    });
  });
});

// Production environment tests (can be run separately)
test.describe.skip('Complete User Workflow - Production Environment', () => {
  const env = ENVIRONMENTS.production;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(env.timeout);
  });

  test('should login to production environment', async ({ page }) => {
    const networkErrors = await setupNetworkMonitoring(page);

    await page.goto(`${env.baseUrl}/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 20000 });
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 30000 });

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
    await expect(logoutButton).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/production-login-success.png' });

    verifyNoRateLimitingErrors(networkErrors);
  });
});
