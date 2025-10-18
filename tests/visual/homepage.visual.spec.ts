import { test, expect } from '@playwright/test';

/**
 * Homepage Visual Regression Tests
 *
 * Tests visual appearance of the homepage/login page across:
 * - Different browsers (Chromium, Firefox, WebKit)
 * - Different viewports (desktop, tablet, mobile)
 * - Different states (default, with error, loading)
 */

test.describe('Homepage Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match homepage snapshot - default state', async ({ page }) => {
    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-default.png', {
      fullPage: true,
    });
  });

  test('should match login form snapshot', async ({ page }) => {
    // Locate the login form
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();

    // Screenshot just the login form
    await expect(loginForm).toHaveScreenshot('login-form.png');
  });

  test('should match filled login form snapshot', async ({ page }) => {
    // Fill in the form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Wait for any reactive changes
    await page.waitForTimeout(300);

    const loginForm = page.locator('form').first();
    await expect(loginForm).toHaveScreenshot('login-form-filled.png');
  });

  test('should match Kids Mode button snapshot', async ({ page }) => {
    const kidsBtn = page.locator('text=/Enter Kids Mode/i').first();

    if (await kidsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(kidsBtn).toHaveScreenshot('kids-mode-button.png');
    }
  });

  test('should match logo and branding snapshot', async ({ page }) => {
    const logo = page.locator('text=/Medio/i').first();
    await expect(logo).toBeVisible();

    // Get the parent container for full branding
    const brandingContainer = logo.locator('..').first();
    await expect(brandingContainer).toHaveScreenshot('branding.png');
  });
});

test.describe('Homepage Responsive Tests', () => {
  const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'desktop-hd', width: 1920, height: 1080 },
    { name: 'desktop-4k', width: 3840, height: 2160 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`homepage-${name}.png`, {
        fullPage: true,
      });
    });
  });
});

test.describe('Homepage Accessibility Visual Tests', () => {
  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab through focusable elements
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.focus();
    await page.waitForTimeout(200);

    await expect(emailInput).toHaveScreenshot('email-input-focused.png');

    // Tab to password
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toHaveScreenshot('password-input-focused.png');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toHaveScreenshot('submit-button-focused.png');
  });

  test('should have high contrast mode compatibility', async ({ page, browserName }) => {
    // Skip for WebKit as it doesn't support emulateMedia for forced-colors
    if (browserName === 'webkit') {
      test.skip();
    }

    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-high-contrast.png', {
      fullPage: true,
    });
  });
});
