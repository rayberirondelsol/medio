import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright Tests
 *
 * This file runs once before all tests to generate an authenticated storage state.
 * The storage state (cookies, localStorage, sessionStorage) is saved to a file
 * and reused by all tests that need authentication.
 *
 * Benefits:
 * - Faster test execution (login once, not per test)
 * - No session/cookie conflicts between tests
 * - Consistent authenticated state across all tests
 */

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as parent user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Close webpack error overlay if present
  const errorOverlay = page.locator('iframe#webpack-dev-server-client-overlay');
  if (await errorOverlay.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      const iframe = document.querySelector('#webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
  }

  // Wait for login form to be ready
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

  // Fill in login credentials
  await page.fill('input[type="email"]', 'parent@example.com');
  await page.fill('input[type="password"]', 'ParentPass123!');

  // Submit login form and wait for navigation
  await Promise.all([
    page.waitForURL(/\/(dashboard|videos)/, { timeout: 15000 }),
    page.click('button[type="submit"]', { force: true }),
  ]);

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Verify we're logged in by checking for authenticated UI elements
  const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
  await expect(addVideoBtn).toBeVisible({ timeout: 10000 });

  // Save the authenticated state to file
  await page.context().storageState({ path: authFile });
});
