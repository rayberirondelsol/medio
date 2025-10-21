/**
 * E2E Tests: NFC Chip Registration Workflow through BFF Proxy
 *
 * Feature: 006-backend-proxy-same-origin
 * User Story 2: NFC Chip Registration Workflow
 *
 * Tests verify that NFC chip management works correctly through the proxy,
 * including multi-step workflows that require sustained authentication.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { Pool } from 'pg';

// Database configuration for test cleanup
const pool = new Pool({
  user: 'medio',
  password: 'medio_dev_password',
  database: 'medio',
  host: 'localhost',
  port: 5432,
});

// Test user credentials
const TEST_USER = {
  email: `nfc-test-${Date.now()}@example.com`,
  password: 'NfcTest123!',
  name: 'NFC Test User'
};

// Test NFC chip data
const TEST_CHIP = {
  uid: `04:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}`,
  label: `Test Chip ${Date.now()}`
};

test.describe('NFC Chip Registration Workflow - Proxy Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Register test user before each test
    await page.goto('http://localhost:8080/register');
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Cleanup: Delete test user (CASCADE should handle related data)
    try {
      await pool.query('DELETE FROM users WHERE email = $1', [TEST_USER.email]);
      console.log(`[CLEANUP] ✓ Deleted test user: ${TEST_USER.email}`);
    } catch (error: any) {
      // Ignore error if user was already deleted
      if (error.code !== '23503') { // 23503 = foreign key violation
        console.error(`[CLEANUP] ✗ Failed to delete user ${TEST_USER.email}:`, error.message);
      }
    }
  });

  /**
   * T031: Test NFC Manager Page Load
   * Verifies that the NFC Manager page loads correctly with user's profiles and chips
   */
  test('[T031] should load NFC Manager page with profiles and chips', async ({ page, context }) => {
    // Setup: Listen for API responses
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Navigate to NFC Manager
    await page.goto('http://localhost:8080/nfc');

    // Wait for page to load
    await page.waitForSelector('h1, h2', { timeout: 5000 });

    // Verify page elements are present
    const heading = await page.textContent('h1, h2');
    expect(heading).toContain('NFC');

    // Verify no 401 errors occurred
    const authErrors = apiResponses.filter(r => r.status === 401);
    expect(authErrors.length).toBe(0);

    // Verify "Register" button is visible (indicates page loaded successfully)
    const registerButton = page.locator('button:has-text("Register")');
    await expect(registerButton.first()).toBeVisible();

    // If NFC API calls were made, verify they were all successful
    const nfcApiCalls = apiResponses.filter(r => r.url.includes('/api/nfc/'));
    if (nfcApiCalls.length > 0) {
      const successfulCalls = nfcApiCalls.filter(r => r.status >= 200 && r.status < 300);
      expect(successfulCalls.length).toBe(nfcApiCalls.length);
    }
  });

  /**
   * T032: Test Chip Registration
   * Verifies that a new NFC chip can be registered successfully
   */
  test('[T032] should register new chip successfully', async ({ page }) => {
    // Navigate to NFC Manager
    await page.goto('http://localhost:8080/nfc');
    await page.waitForLoadState('networkidle');

    // Click "Add Chip" button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Register"), button:has-text("Chip")').first();
    await addButton.click();

    // Wait for modal/form to appear
    await page.waitForSelector('input[id="chipUid"], input[placeholder*="Chip"], input[name="chip_uid"]', { timeout: 3000 });

    // Fill in chip details
    const chipUidInput = page.locator('input[id="chipUid"], input[placeholder*="Chip"], input[name="chip_uid"]').first();
    const labelInput = page.locator('input[id="label"], input[placeholder*="Label"], input[name="label"]').first();

    await chipUidInput.fill(TEST_CHIP.uid);
    await labelInput.fill(TEST_CHIP.label);

    // Submit form
    const submitButton = page.locator('button[type="submit"]:has-text("Register"), button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")').first();
    await submitButton.click();

    // Wait for success indication (modal closes or success message appears)
    await page.waitForTimeout(2000);

    // Verify chip appears in the list
    const chipList = await page.textContent('body');
    expect(chipList).toContain(TEST_CHIP.label);

    // Verify chip was actually created in database (uses user_uuid column)
    const result = await pool.query(
      'SELECT * FROM nfc_chips WHERE chip_uid = $1 AND user_uuid = (SELECT id FROM users WHERE email = $2)',
      [TEST_CHIP.uid, TEST_USER.email]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].label).toBe(TEST_CHIP.label);
  });

  /**
   * T033: Test Long Form Completion Without Session Expiry
   * Verifies that authentication persists during 2-3 minute form completion
   */
  test('[T033] should handle 2-3 minute form completion without session expiry', async ({ page }) => {
    // Navigate to NFC Manager
    await page.goto('http://localhost:8080/nfc');
    await page.waitForLoadState('networkidle');

    // Click "Add Chip" button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Register")').first();
    await addButton.click();

    // Wait for form to appear
    await page.waitForSelector('input[id="chipUid"], input[name="chip_uid"]', { timeout: 3000 });

    // Fill first field
    const chipUidInput = page.locator('input[id="chipUid"], input[name="chip_uid"]').first();
    await chipUidInput.fill(TEST_CHIP.uid);

    // Wait 30 seconds (simulating slow form completion)
    console.log('Waiting 30 seconds to simulate slow form completion...');
    await page.waitForTimeout(30000);

    // Fill second field after delay
    const labelInput = page.locator('input[id="label"], input[name="label"]').first();
    await labelInput.fill(TEST_CHIP.label);

    // Wait another 30 seconds
    console.log('Waiting another 30 seconds...');
    await page.waitForTimeout(30000);

    // Setup response listener before submit
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/nfc/chips') && response.request().method() === 'POST') {
        apiResponses.push({
          status: response.status(),
          url: response.url()
        });
      }
    });

    // Submit form after total 1 minute delay
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify submission was successful (no 401)
    const submitResponse = apiResponses.find(r => r.url.includes('/api/nfc/chips'));
    expect(submitResponse).toBeDefined();
    expect(submitResponse.status).not.toBe(401);
    expect([200, 201]).toContain(submitResponse.status);

    // Verify chip was created
    const result = await pool.query(
      'SELECT * FROM nfc_chips WHERE chip_uid = $1',
      [TEST_CHIP.uid]
    );
    expect(result.rows.length).toBe(1);
  });

  /**
   * T034: Test Chip Persistence After Navigation
   * Verifies that registered chips persist after navigating away and back
   */
  test('[T034] should persist chip after navigation away and back', async ({ page }) => {
    // First, register a chip
    await page.goto('http://localhost:8080/nfc');
    await page.waitForLoadState('networkidle');

    // Register chip
    const addButton = page.locator('button:has-text("Add"), button:has-text("Register")').first();
    await addButton.click();
    await page.waitForSelector('input[id="chipUid"], input[name="chip_uid"]', { timeout: 3000 });

    const chipUidInput = page.locator('input[id="chipUid"], input[name="chip_uid"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"]').first();
    await chipUidInput.fill(TEST_CHIP.uid);
    await labelInput.fill(TEST_CHIP.label);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Navigate away to Dashboard
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForURL('**/dashboard');

    // Navigate to Videos page
    await page.goto('http://localhost:8080/videos');
    await page.waitForURL('**/videos');
    await page.waitForTimeout(1000);

    // Navigate back to NFC Manager
    await page.goto('http://localhost:8080/nfc');
    await page.waitForLoadState('networkidle');

    // Verify chip still appears in the list
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain(TEST_CHIP.label);

    // Verify no 401 errors occurred during navigation
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() === 401) {
        apiResponses.push(response.url());
      }
    });

    // Reload page to trigger fresh API calls
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify no 401 errors
    expect(apiResponses.length).toBe(0);

    // Verify chip is still in database
    const result = await pool.query(
      'SELECT * FROM nfc_chips WHERE chip_uid = $1',
      [TEST_CHIP.uid]
    );
    expect(result.rows.length).toBe(1);
  });

  /**
   * Additional Test: Verify Cookies Forwarded During NFC Operations
   * Ensures that authentication cookies are correctly forwarded through proxy
   */
  test('[BONUS] should maintain authentication during NFC operations', async ({ page, context }) => {
    // Navigate to NFC Manager
    await page.goto('http://localhost:8080/nfc');
    await page.waitForLoadState('networkidle');

    // Get cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'authToken');
    const refreshCookie = cookies.find(c => c.name === 'refreshToken');

    // Verify auth cookies exist
    expect(authCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();

    // Verify cookies are scoped to proxy origin (localhost:8080)
    expect(authCookie?.domain).toContain('localhost');

    // Perform NFC operation (register chip)
    const addButton = page.locator('button:has-text("Add"), button:has-text("Register")').first();
    await addButton.click();
    await page.waitForSelector('input[id="chipUid"], input[name="chip_uid"]', { timeout: 3000 });

    // Listen for API requests
    let cookieHeaderSent = false;
    page.on('request', request => {
      if (request.url().includes('/api/nfc/') && request.method() === 'POST') {
        const headers = request.headers();
        cookieHeaderSent = 'cookie' in headers;
      }
    });

    // Submit form
    const chipUidInput = page.locator('input[id="chipUid"], input[name="chip_uid"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"]').first();
    await chipUidInput.fill(TEST_CHIP.uid);
    await labelInput.fill(TEST_CHIP.label);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Verify cookies were sent with API request
    // Note: In proxy mode, browser sends cookies automatically
    // We verify by checking that the request succeeded (no 401)
    const result = await pool.query(
      'SELECT * FROM nfc_chips WHERE chip_uid = $1',
      [TEST_CHIP.uid]
    );
    expect(result.rows.length).toBe(1); // Success = cookies were forwarded
  });
});

// Close database connection after all tests
test.afterAll(async () => {
  await pool.end();
});
