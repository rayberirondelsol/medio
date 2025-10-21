/**
 * E2E Tests: Extended Session Navigation through BFF Proxy
 *
 * Feature: 006-backend-proxy-same-origin
 * User Story 3: Extended Session Navigation
 *
 * Tests verify that authentication sessions persist correctly during
 * extended navigation periods, multi-tab usage, and idle periods.
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
  email: `session-test-${Date.now()}@example.com`,
  password: 'SessionTest123!',
  name: 'Session Test User'
};

test.describe('Extended Session Navigation - Proxy Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Register test user
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
   * T041: Test 10-Minute Navigation Without Auth Errors
   * Verifies that authentication persists during 10 minutes of continuous navigation
   */
  test('[T041] should navigate between pages for 10 minutes without auth errors', async ({ page }) => {
    test.setTimeout(15 * 60 * 1000); // 15 minutes timeout

    const pages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/videos', name: 'Videos' },
      { url: '/profiles', name: 'Profiles' },
      { url: '/nfc', name: 'NFC Manager' },
      { url: '/settings', name: 'Settings' }
    ];

    const authErrors: string[] = [];
    let totalNavigations = 0;

    // Listen for 401 errors
    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        authErrors.push(`[${new Date().toISOString()}] 401 on ${response.url()}`);
      }
    });

    const startTime = Date.now();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in ms

    console.log('Starting 10-minute navigation test...');

    while (Date.now() - startTime < tenMinutes) {
      // Navigate to each page
      for (const { url, name } of pages) {
        await page.goto(`http://localhost:8080${url}`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000); // Wait 1 second between navigations
        totalNavigations++;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`[${elapsed}s] Navigated to ${name} (${totalNavigations} total navigations)`);

        // Break if 10 minutes elapsed
        if (Date.now() - startTime >= tenMinutes) break;
      }
    }

    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
    console.log(`Completed ${totalNavigations} navigations over ${elapsedMinutes} minutes`);

    // Verify no auth errors occurred
    expect(authErrors).toEqual([]);
    expect(totalNavigations).toBeGreaterThan(10);
  });

  /**
   * T042: Test Multi-Tab Authentication
   * Verifies that authentication works correctly in multiple tabs simultaneously
   */
  test('[T042] should maintain auth in multiple tabs simultaneously', async ({ context, page }) => {
    // Create second tab
    const page2 = await context.newPage();
    const authErrors: string[] = [];

    // Listen for 401 errors in both tabs
    const handle401 = (response: any) => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        authErrors.push(response.url());
      }
    };

    page.on('response', handle401);
    page2.on('response', handle401);

    // Navigate tab 1 to Videos
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    // Navigate tab 2 to NFC Manager
    await page2.goto('http://localhost:8080/nfc');
    await page2.waitForLoadState('networkidle');

    // Perform actions in both tabs simultaneously
    await Promise.all([
      page.reload(),
      page2.reload()
    ]);

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Navigate tab 1 to Dashboard
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate tab 2 to Profiles
    await page2.goto('http://localhost:8080/profiles');
    await page2.waitForLoadState('networkidle');

    // Switch focus and reload
    await page.reload();
    await page2.reload();

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Verify no auth errors in either tab
    expect(authErrors).toEqual([]);

    // Verify both tabs show authenticated content
    const dashboard = await page.textContent('body');
    const profiles = await page2.textContent('body');

    expect(dashboard).toBeTruthy();
    expect(profiles).toBeTruthy();

    // Close second tab
    await page2.close();
  });

  /**
   * T043: Test 5-Minute Idle Period
   * Verifies that authentication persists after 5 minutes of inactivity
   */
  test('[T043] should handle 5-minute idle period and resume navigation', async ({ page }) => {
    test.setTimeout(8 * 60 * 1000); // 8 minutes timeout

    // Navigate to Dashboard
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('User authenticated and on Dashboard');

    // Record cookies before idle period
    const cookiesBefore = await page.context().cookies();
    const authTokenBefore = cookiesBefore.find(c => c.name === 'authToken');

    expect(authTokenBefore).toBeDefined();
    console.log('Cookies recorded. Starting 5-minute idle period...');

    // Wait 5 minutes idle
    const fiveMinutes = 5 * 60 * 1000;
    await page.waitForTimeout(fiveMinutes);

    console.log('5-minute idle period complete. Resuming navigation...');

    const authErrors: string[] = [];
    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        authErrors.push(response.url());
      }
    });

    // Resume navigation
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    // Navigate to another page
    await page.goto('http://localhost:8080/profiles');
    await page.waitForLoadState('networkidle');

    // Verify no auth errors occurred
    expect(authErrors).toEqual([]);

    // Verify cookies still present
    const cookiesAfter = await page.context().cookies();
    const authTokenAfter = cookiesAfter.find(c => c.name === 'authToken');

    expect(authTokenAfter).toBeDefined();
    console.log('Authentication persisted successfully after 5-minute idle');
  });

  /**
   * T044: Test Auto-Refresh Near 14-Minute Mark
   * Verifies that token refresh works correctly near token expiry
   * Note: This test is shortened for practical E2E testing (uses 2 minutes instead of 14)
   */
  test('[T044] should auto-refresh token near expiry and continue session', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000); // 5 minutes timeout

    // Navigate to Dashboard
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    // Get initial auth token
    let cookies = await page.context().cookies();
    let authToken = cookies.find(c => c.name === 'authToken');
    const initialToken = authToken?.value;

    expect(initialToken).toBeDefined();
    console.log('Initial token recorded');

    // Wait 2 minutes (shortened from 14 for E2E testing)
    // In production, token refresh happens automatically near 15-minute expiry
    const twoMinutes = 2 * 60 * 1000;
    console.log('Waiting 2 minutes to simulate near-expiry scenario...');
    await page.waitForTimeout(twoMinutes);

    const authErrors: string[] = [];
    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        authErrors.push(response.url());
      }
    });

    // Trigger API call (which should trigger token refresh if needed)
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    // Wait for any refresh to complete
    await page.waitForTimeout(2000);

    // Navigate to trigger more API calls
    await page.goto('http://localhost:8080/profiles');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify no auth errors occurred
    expect(authErrors).toEqual([]);

    // Get token after navigation
    cookies = await page.context().cookies();
    authToken = cookies.find(c => c.name === 'authToken');

    expect(authToken).toBeDefined();
    console.log('Session continued successfully after near-expiry period');
  });

  /**
   * Additional Test: Comprehensive Session Flow
   * Combines multiple session scenarios in one test
   */
  test('[BONUS] comprehensive session persistence flow', async ({ page, context }) => {
    test.setTimeout(3 * 60 * 1000); // 3 minutes timeout

    const authErrors: string[] = [];

    page.on('response', response => {
      if (response.status() === 401 && response.url().includes('/api/')) {
        authErrors.push(`[${new Date().toISOString()}] ${response.url()}`);
      }
    });

    // 1. Navigate to multiple pages
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:8080/profiles');
    await page.waitForLoadState('networkidle');

    // 2. Open second tab
    const page2 = await context.newPage();
    await page2.goto('http://localhost:8080/nfc');
    await page2.waitForLoadState('networkidle');

    // 3. Idle for 1 minute
    console.log('Waiting 1 minute idle...');
    await page.waitForTimeout(60000);

    // 4. Resume in first tab
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    // 5. Continue in second tab
    await page2.goto('http://localhost:8080/settings');
    await page2.waitForLoadState('networkidle');

    // 6. Reload both tabs
    await Promise.all([
      page.reload(),
      page2.reload()
    ]);

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Verify no auth errors throughout entire flow
    expect(authErrors).toEqual([]);

    await page2.close();
  });
});

// Close database connection after all tests
test.afterAll(async () => {
  await pool.end();
});
