import { test, expect } from '@playwright/test';

/**
 * Add Video Modal Visual Regression Tests
 *
 * Tests the visual appearance of the Add Video modal including:
 * - Modal opening animation
 * - Form fields and layout
 * - URL input with metadata loading
 * - Platform selection dropdown
 * - Age rating selection
 * - Submit button states
 * - Error states
 * - Responsive behavior
 *
 * Authentication is handled by auth.setup.ts which runs once before all tests.
 * Tests use the saved storage state to avoid repeated logins.
 */

test.describe('Add Video Modal Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root (redirects to dashboard, already authenticated via storage state)
    await page.goto('/');

    // Close webpack error overlay if present
    const errorOverlay = page.locator('iframe#webpack-dev-server-client-overlay');
    if (await errorOverlay.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        const iframe = document.querySelector('#webpack-dev-server-client-overlay');
        if (iframe) iframe.remove();
      });
    }

    // Wait for navigation to complete (root redirects to dashboard)
    await page.waitForURL(/\/(dashboard|videos)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated by waiting for Add Video button
    await page.locator('text=/Add.*Video|New.*Video|\\+/i').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should match Add Video button snapshot', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.waitFor({ state: 'visible', timeout: 5000 });

    await expect(addVideoBtn).toHaveScreenshot('add-video-button.png');
  });

  test('should match modal opening state', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();

    // Wait for modal animation
    await page.waitForTimeout(500);

    // Screenshot the entire modal
    const modal = page.locator('[role="dialog"], .modal').first();
    await expect(modal).toBeVisible();
    await expect(modal).toHaveScreenshot('add-video-modal-opened.png');
  });

  test('should match empty form state', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(500);

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('add-video-form-empty.png');
  });

  test('should match URL input field', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    const urlInput = page.locator('input[placeholder*="URL" i], input[id*="url" i]').first();
    await expect(urlInput).toHaveScreenshot('url-input-empty.png');

    // Fill URL
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.waitForTimeout(300);

    await expect(urlInput).toHaveScreenshot('url-input-filled.png');
  });

  test('should match form with metadata loaded', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    // Fill YouTube URL
    const urlInput = page.locator('input[placeholder*="URL" i], input[id*="url" i]').first();
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // Wait for metadata to load
    await page.waitForTimeout(4000);

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('add-video-form-metadata-loaded.png');
  });

  test('should match platform dropdown', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    const platformSelect = page.locator('select[id*="platform" i], select[name*="platform" i]').first();

    if (await platformSelect.isVisible().catch(() => false)) {
      await expect(platformSelect).toHaveScreenshot('platform-select.png');

      // Click to open dropdown
      await platformSelect.focus();
      await page.waitForTimeout(200);

      await expect(platformSelect).toHaveScreenshot('platform-select-focused.png');
    }
  });

  test('should match age rating dropdown', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    const ageSelect = page.locator('select[id*="age" i], select[name*="age" i]').first();
    await ageSelect.waitFor({ state: 'visible' });

    await expect(ageSelect).toHaveScreenshot('age-rating-select.png');

    // Select a rating
    await ageSelect.selectOption('G');
    await page.waitForTimeout(200);

    await expect(ageSelect).toHaveScreenshot('age-rating-select-g.png');
  });

  test('should match submit button states', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    const submitBtn = page.locator('button:has-text("Add Video")').first();

    // Disabled state (empty form)
    await expect(submitBtn).toHaveScreenshot('submit-button-disabled.png');

    // Fill required fields
    const urlInput = page.locator('input[placeholder*="URL" i], input[id*="url" i]').first();
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const ageSelect = page.locator('select[id*="age" i], select[name*="age" i]').first();
    await ageSelect.selectOption('G');

    await page.waitForTimeout(300);

    // Enabled state
    await expect(submitBtn).toHaveScreenshot('submit-button-enabled.png');

    // Hover state
    await submitBtn.hover();
    await page.waitForTimeout(200);

    await expect(submitBtn).toHaveScreenshot('submit-button-hover.png');
  });

  test('should match complete filled form', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    // Fill all fields
    await page.fill('input[placeholder*="URL" i]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.waitForTimeout(3000); // Wait for metadata

    // Select age rating
    await page.selectOption('select[id*="age" i]', 'G');
    await page.waitForTimeout(300);

    const modal = page.locator('[role="dialog"], .modal').first();
    await expect(modal).toHaveScreenshot('add-video-modal-complete.png');
  });
});

test.describe('Add Video Modal Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root (redirects to dashboard, already authenticated via storage state)
    await page.goto('/');

    // Close webpack error overlay if present
    const errorOverlay = page.locator('iframe#webpack-dev-server-client-overlay');
    if (await errorOverlay.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        const iframe = document.querySelector('#webpack-dev-server-client-overlay');
        if (iframe) iframe.remove();
      });
    }

    // Wait for navigation to complete (root redirects to dashboard)
    await page.waitForURL(/\/(dashboard|videos)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated by waiting for Add Video button
    await page.locator('text=/Add.*Video|New.*Video|\\+/i').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should render modal correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('add-video-modal-mobile.png', {
      fullPage: true,
    });
  });

  test('should render modal correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('add-video-modal-tablet.png', {
      fullPage: true,
    });
  });
});

test.describe('Add Video Modal Error States', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root (redirects to dashboard, already authenticated via storage state)
    await page.goto('/');

    // Close webpack error overlay if present
    const errorOverlay = page.locator('iframe#webpack-dev-server-client-overlay');
    if (await errorOverlay.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        const iframe = document.querySelector('#webpack-dev-server-client-overlay');
        if (iframe) iframe.remove();
      });
    }

    // Wait for navigation to complete (root redirects to dashboard)
    await page.waitForURL(/\/(dashboard|videos)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated by waiting for Add Video button
    await page.locator('text=/Add.*Video|New.*Video|\\+/i').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should show validation error for invalid URL', async ({ page }) => {
    const addVideoBtn = page.locator('text=/Add.*Video|New.*Video|\\+/i').first();
    await addVideoBtn.click();
    await page.waitForTimeout(300);

    // Fill invalid URL
    await page.fill('input[placeholder*="URL" i]', 'not-a-valid-url');
    await page.waitForTimeout(500);

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('add-video-form-invalid-url.png');
  });
});
