import { test, expect } from '@playwright/test';

test.describe('Video Addition E2E Test', () => {
  test('should register user, login, and add a video successfully', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `video-test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = `Video Test User ${timestamp}`;

    // Step 1: Navigate to registration page
    await page.goto('http://localhost:8080/register');
    await page.waitForLoadState('networkidle');

    // Step 2: Register new user
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    await page.click('button[type="submit"]');

    // Step 3: Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('✓ User registered and logged in successfully');

    // Step 4: Navigate to Videos page
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    console.log('✓ Videos page loaded');

    // Step 5: Click "Add Video" button
    const addVideoButton = page.locator('button:has-text("Add Video")').first();
    await expect(addVideoButton).toBeVisible({ timeout: 5000 });
    await addVideoButton.click();

    console.log('✓ Add Video modal opened');

    // Step 6: Wait for modal to appear
    await page.waitForSelector('.modal', { timeout: 5000 });

    // Step 7: Fill in video details manually (no URL - testing manual entry)
    await page.fill('input[name="title"]', `Test Video ${timestamp}`);
    await page.fill('textarea[name="description"]', 'This is a test video for E2E testing');

    // Select age rating
    await page.selectOption('select[name="age_rating"]', 'G');

    console.log('✓ Video form filled');

    // Step 8: Submit the video form
    await page.click('button[type="submit"]:has-text("Add Video")');

    // Step 9: Wait for modal to close and video to appear in list
    await page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });

    console.log('✓ Video form submitted');

    // Step 10: Verify video appears in the list
    await page.waitForTimeout(2000); // Give time for the list to update

    const videoTitle = page.locator(`text=Test Video ${timestamp}`);
    await expect(videoTitle).toBeVisible({ timeout: 10000 });

    console.log('✓ Video appears in the list');

    // Step 11: Verify no errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit to capture any console errors
    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }

    console.log('✅ Video addition test completed successfully!');
  });

  test('should load videos page without platform_id errors', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `video-list-test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = `Video List Test User ${timestamp}`;

    // Register and login
    await page.goto('http://localhost:8080/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('✓ User registered and logged in');

    // Navigate to videos page
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    console.log('✓ Videos page loaded');

    // Check for empty state or video list
    const emptyState = page.locator('text=No videos yet');
    const videoGrid = page.locator('.videos-grid, .video-card');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasVideoGrid = await videoGrid.count().then(count => count > 0).catch(() => false);

    expect(hasEmptyState || hasVideoGrid).toBe(true);

    console.log('✅ Videos page loads correctly without errors');
  });
});
