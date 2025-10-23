import { test, expect } from '@playwright/test';

test.describe('Critical Flows - Production', () => {
  const baseURL = 'https://medio-react-app.fly.dev';
  const timestamp = Date.now();
  const testEmail = `test-critical-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = `Test User ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // Register and login for each test
    await page.goto(`${baseURL}/register`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });
  });

  test('Flow 1: Add Video - Complete End-to-End', async ({ page }) => {
    // Navigate to Videos page
    await page.goto(`${baseURL}/videos`);
    await expect(page).toHaveURL(/videos/);

    // Wait for page to load
    await page.waitForSelector('.page-header', { timeout: 10000 });

    // Click Add Video button
    await page.click('button:has-text("Add Video")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill video form
    await page.fill('input[name="title"]', 'Test Video Critical Flow');
    await page.fill('textarea[name="description"]', 'Testing video addition flow');
    await page.fill('input[name="thumbnail_url"]', 'https://example.com/thumb.jpg');

    // Select platform (YouTube)
    await page.selectOption('select[name="platform_id"]', { index: 1 }); // First platform

    await page.fill('input[name="platform_video_id"]', `test-vid-${timestamp}`);
    await page.fill('input[name="video_url"]', `https://youtube.com/watch?v=${timestamp}`);
    await page.fill('input[name="duration_seconds"]', '120');
    await page.selectOption('select[name="age_rating"]', 'G');
    await page.fill('input[name="channel_name"]', 'Test Channel');

    // Submit form
    await page.click('button[type="submit"]:has-text("Add Video")');

    // Wait for modal to close and video to appear
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });

    // Verify video appears in list
    await expect(page.locator('text=Test Video Critical Flow')).toBeVisible({ timeout: 10000 });

    console.log('✅ Video addition flow completed successfully');
  });

  test('Flow 2: Register NFC Chip - Complete End-to-End', async ({ page }) => {
    // Navigate to NFC page
    await page.goto(`${baseURL}/nfc`);
    await expect(page).toHaveURL(/nfc/);

    // Wait for page to load
    await page.waitForSelector('.page-header', { timeout: 10000 });

    // Click Register NFC button
    await page.click('button:has-text("Register NFC")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill NFC chip registration form
    const testChipUID = `04${timestamp.toString().substring(0, 12)}`;
    await page.fill('input[name="chip_uid"]', testChipUID);
    await page.fill('input[name="label"]', `Test Chip ${timestamp}`);

    // Submit form
    await page.click('button[type="submit"]:has-text("Register")');

    // Wait for modal to close and chip to appear
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });

    // Verify chip appears in list
    await expect(page.locator(`text=Test Chip ${timestamp}`)).toBeVisible({ timeout: 10000 });

    console.log('✅ NFC chip registration flow completed successfully');
  });

  test('Flow 3: Create Profile - Verify Database Schema', async ({ page }) => {
    // Navigate to Profiles page
    await page.goto(`${baseURL}/profiles`);
    await expect(page).toHaveURL(/profiles/);

    // Wait for page to load
    await page.waitForSelector('.page-header', { timeout: 10000 });

    // Click Add Profile button
    await page.click('button:has-text("Add Profile")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill profile form
    await page.fill('input[name="name"]', `Test Child ${timestamp}`);

    // Select avatar
    await page.click('.avatar-option:first-child');

    // Set daily limit
    await page.fill('input[name="daily_limit_minutes"]', '90');

    // Submit form
    await page.click('button[type="submit"]:has-text("Add Profile")');

    // Wait for modal to close and profile to appear
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });

    // Verify profile appears in list
    await expect(page.locator(`text=Test Child ${timestamp}`)).toBeVisible({ timeout: 10000 });

    console.log('✅ Profile creation flow completed successfully');
  });
});
