const { test, expect } = require('@playwright/test');

/**
 * E2E Test: Manual Video Creation Workflow
 *
 * Purpose: Verify that users can successfully add videos by filling the form manually
 * when the YouTube metadata API is unavailable (503 error).
 *
 * Test Environment: Production (https://medio-react-app.fly.dev)
 *
 * Prerequisites:
 * - Existing user credentials: test-503-2025@example.com / TestPassword123!
 * - YouTube metadata API returning 503 (Service Unavailable)
 *
 * Test Flow:
 * 1. Login with existing user
 * 2. Navigate to Videos page
 * 3. Open "Add Video" modal
 * 4. Enter YouTube URL
 * 5. Verify 503 error message appears
 * 6. Verify "Manual Entry Mode" is activated
 * 7. Fill form manually with test data
 * 8. Submit the form
 * 9. Verify video appears in Video Library
 */

test.describe('Manual Video Creation Workflow (Production)', () => {
  const PRODUCTION_URL = 'https://medio-react-app.fly.dev';
  const TEST_USER = {
    email: 'test-503-2025@example.com',
    password: 'TestPassword123!'
  };

  const TEST_VIDEO = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
    description: 'Official music video',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: 212,
    channelName: 'Rick Astley',
    ageRating: 'G - General Audiences'
  };

  test('should successfully add video manually when metadata API is unavailable', async ({ page }) => {
    // Step 1: Navigate to production site
    console.log('Step 1: Navigating to production site...');
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot of homepage
    await page.screenshot({ path: 'test-manual-1-homepage.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-1-homepage.png');

    // Step 2: Login with existing user
    console.log('\nStep 2: Logging in...');

    // Check if already logged in by looking for "Videos" link
    const videosLink = page.locator('a[href*="/videos"], button:has-text("Videos")');
    const isLoggedIn = await videosLink.isVisible().catch(() => false);

    if (!isLoggedIn) {
      console.log('Not logged in, proceeding with login...');

      // Look for Login button/link
      const loginButton = page.locator('button:has-text("Login"), a:has-text("Login")').first();
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

      // Take screenshot of filled login form
      await page.screenshot({ path: 'test-manual-2-login-filled.png', fullPage: true });
      console.log('✓ Screenshot saved: test-manual-2-login-filled.png');

      // Submit login
      await page.click('button[type="submit"]:has-text("Login"), button:has-text("Sign In")');
      await page.waitForLoadState('networkidle');

      // Wait for successful login (dashboard or videos page)
      await page.waitForSelector('a[href*="/videos"], button:has-text("Videos"), h1:has-text("Dashboard")', { timeout: 10000 });
      console.log('✓ Login successful');
    } else {
      console.log('✓ Already logged in');
    }

    // Step 3: Navigate to Videos page
    console.log('\nStep 3: Navigating to Videos page...');
    const videosNavLink = page.locator('a[href*="/videos"], button:has-text("Videos")').first();
    await videosNavLink.click();
    await page.waitForLoadState('networkidle');

    // Wait for Videos page to load
    await page.waitForSelector('h1:has-text("Video Library"), h2:has-text("Videos")', { timeout: 10000 });

    // Take screenshot of Videos page
    await page.screenshot({ path: 'test-manual-3-videos-page.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-3-videos-page.png');

    // Step 4: Open "Add Video" modal
    console.log('\nStep 4: Opening Add Video modal...');
    const addVideoButton = page.locator('button:has-text("Add Video")').first();
    await addVideoButton.click();

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"], .modal, div:has-text("Add New Video")', { timeout: 5000 });
    await page.waitForTimeout(1000); // Wait for modal animation

    // Take screenshot of opened modal
    await page.screenshot({ path: 'test-manual-4-modal-opened.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-4-modal-opened.png');

    // Step 5: Enter YouTube URL
    console.log('\nStep 5: Entering YouTube URL...');
    // Wait for modal animation and form to be ready
    await page.waitForTimeout(1500);

    const urlInput = page.locator('input[placeholder*="Paste video URL"]').first();
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill(TEST_VIDEO.url);

    // Trigger blur event to initiate metadata fetch
    await urlInput.blur();

    // Wait for API call to complete (will fail with 503)
    await page.waitForTimeout(3000);

    // Take screenshot showing error message
    await page.screenshot({ path: 'test-manual-5-error-message.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-5-error-message.png');

    // Step 6: Verify 503 error message appears
    console.log('\nStep 6: Verifying error message...');
    const errorMessage = await page.locator('text=/Service Temporarily Unavailable|metadata.*unavailable|API.*unavailable/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    console.log('✓ 503 error message displayed correctly');

    // Step 7: Verify "Manual Entry Mode" is activated
    console.log('\nStep 7: Verifying Manual Entry Mode...');
    const manualModeIndicator = page.locator('text=/Manual Entry|Enter.*manually|Fill.*manually/i');
    const isManualModeVisible = await manualModeIndicator.isVisible().catch(() => false);

    if (isManualModeVisible) {
      console.log('✓ Manual Entry Mode indicator visible');
    } else {
      console.log('⚠ Manual Entry Mode indicator not found (form may be editable by default)');
    }

    // Step 8: Fill form manually with test data
    console.log('\nStep 8: Filling form manually...');

    // Title
    const titleInput = page.locator('input[placeholder*="Video title"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 5000 });
    await titleInput.fill(TEST_VIDEO.title);
    console.log('✓ Title filled');

    // Description
    const descriptionInput = page.locator('textarea[placeholder*="Video description"]').first();
    await descriptionInput.waitFor({ state: 'visible', timeout: 5000 });
    await descriptionInput.fill(TEST_VIDEO.description);
    console.log('✓ Description filled');

    // Thumbnail URL
    const thumbnailInput = page.locator('input[placeholder*="https://"]').first();
    await thumbnailInput.waitFor({ state: 'visible', timeout: 5000 });
    await thumbnailInput.fill(TEST_VIDEO.thumbnailUrl);
    console.log('✓ Thumbnail URL filled');

    // Duration
    const durationInput = page.locator('input[placeholder*="180"]').first();
    await durationInput.waitFor({ state: 'visible', timeout: 5000 });
    await durationInput.fill(TEST_VIDEO.duration.toString());
    console.log('✓ Duration filled');

    // Channel Name
    const channelInput = page.locator('input[placeholder*="Channel or creator name"]').first();
    await channelInput.waitFor({ state: 'visible', timeout: 5000 });
    await channelInput.fill(TEST_VIDEO.channelName);
    console.log('✓ Channel Name filled');

    // Scroll down in the modal to see Age Rating field
    await page.evaluate(() => {
      const modal = document.querySelector('.modal, [role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight;
      }
    });
    await page.waitForTimeout(500);

    // Age Rating (dropdown/select)
    const ageRatingSelect = page.locator('select').filter({ hasText: 'Select age rating' }).first();
    await ageRatingSelect.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const ageRatingExists = await ageRatingSelect.isVisible().catch(() => false);

    if (ageRatingExists) {
      await ageRatingSelect.selectOption({ label: TEST_VIDEO.ageRating });
      console.log('✓ Age Rating selected (dropdown)');
    } else {
      console.log('⚠ Age Rating field not found, trying to locate it...');
      // Try by looking for any select in the form
      const anySelect = page.locator('select').last();
      const selectExists = await anySelect.isVisible().catch(() => false);
      if (selectExists) {
        await anySelect.selectOption({ label: TEST_VIDEO.ageRating });
        console.log('✓ Age Rating selected (found select element)');
      } else {
        console.log('⚠ Age Rating field not found');
      }
    }

    // Take screenshot of filled form before submit
    await page.screenshot({ path: 'test-manual-6-form-filled.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-6-form-filled.png');

    // Step 9: Submit the form
    console.log('\nStep 9: Submitting form...');

    // Check for any validation errors before submitting
    const validationErrors = await page.locator('.error, .invalid-feedback, [class*="error"]').count();
    if (validationErrors > 0) {
      console.log(`⚠ Found ${validationErrors} validation errors`);
      const errorTexts = await page.locator('.error, .invalid-feedback, [class*="error"]').allTextContents();
      console.log('Errors:', errorTexts);
    }

    // Look for submit button at the bottom of the modal
    const submitButton = page.locator('button.btn-primary:has-text("Add Video")').last();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });

    // Check if button is disabled
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      console.log('⚠ Submit button is disabled!');
      // Take a screenshot to see why
      await page.screenshot({ path: 'test-manual-6b-button-disabled.png', fullPage: true });
    } else {
      console.log('✓ Submit button is enabled');
    }

    // Wait for any validation to complete
    await page.waitForTimeout(500);

    // Try submitting the form by pressing Enter key in the last field (sometimes more reliable)
    console.log('Attempting to submit via Enter key...');
    await page.keyboard.press('Enter');

    // Wait a bit to see if that worked
    await page.waitForTimeout(2000);

    // If modal is still there, try clicking the button
    const modalStillVisible = await page.locator('[role="dialog"], .modal').isVisible().catch(() => false);
    if (modalStillVisible) {
      console.log('Modal still visible, trying button click...');
      await submitButton.evaluate((button) => button.click());
      await page.waitForTimeout(2000);
    }

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"], .modal', { state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('⚠ Modal might still be visible or not found');
    });

    // Wait for page to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('✓ Form submitted');

    // Step 10: Verify video appears in Video Library
    console.log('\nStep 10: Verifying video appears in library...');

    // Take screenshot of Video Library after submission
    await page.screenshot({ path: 'test-manual-7-after-submit.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-7-after-submit.png');

    // Look for the video in the library by title
    const videoCard = page.locator(`text="${TEST_VIDEO.title}"`).first();
    await expect(videoCard).toBeVisible({ timeout: 10000 });
    console.log('✓ Video found in library with correct title');

    // Verify thumbnail is displayed (if possible)
    const videoThumbnail = page.locator(`img[src*="${TEST_VIDEO.url.split('v=')[1]}"], img[alt*="${TEST_VIDEO.title}"]`).first();
    const thumbnailVisible = await videoThumbnail.isVisible().catch(() => false);
    if (thumbnailVisible) {
      console.log('✓ Video thumbnail displayed');
    } else {
      console.log('⚠ Video thumbnail not found (may use different structure)');
    }

    // Take final screenshot showing the video in library
    await page.screenshot({ path: 'test-manual-8-video-in-library.png', fullPage: true });
    console.log('✓ Screenshot saved: test-manual-8-video-in-library.png');

    console.log('\n✅ TEST PASSED: Manual video creation workflow completed successfully!');
  });
});
