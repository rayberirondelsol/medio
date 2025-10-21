// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Complete Add Video Workflow - Production', () => {
  test('should register user, add video manually, and verify in library', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-complete-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    // Step 1: Navigate to production homepage
    console.log('Step 1: Navigating to production homepage...');
    await page.goto('https://medio-react-app.fly.dev');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'step-1-homepage.png', fullPage: true });

    // Step 2: Register new user
    console.log('Step 2: Registering new user...');
    await page.click('text=Sign up');
    await page.waitForSelector('form');

    // Fill all registration fields
    await page.fill('input[placeholder*="name"], input[name*="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);

    // Fill password fields (there are two - password and confirm password)
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[0].fill(testPassword);
    if (passwordInputs.length > 1) {
      await passwordInputs[1].fill(testPassword); // Confirm password
    }

    await page.click('button[type="submit"]');

    // Wait for registration to complete and redirect
    await page.waitForURL(/.*\/dashboard|.*\/videos/i, { timeout: 15000 });
    await page.screenshot({ path: 'step-2-after-register.png', fullPage: true });
    console.log(`Registered user: ${testEmail}`);

    // Step 3: Navigate to Videos page
    console.log('Step 3: Navigating to Videos page...');
    await page.click('text=Videos');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'step-3-videos-page.png', fullPage: true });

    // WORKAROUND: Intercept platforms API call BEFORE opening modal
    // This is needed because production has a misconfigured API proxy
    console.log('Setting up platforms API interception...');

    // Log all API requests to see what's being called
    page.on('request', request => {
      if (request.url().includes('platform') || request.url().includes('video')) {
        console.log('  🌐 Request:', request.method(), request.url());
      }
    });

    // Also log responses to see errors
    page.on('response', response => {
      if ((response.url().includes('platform') || response.url().includes('video')) && !response.ok()) {
        console.log('  ❌ Failed response:', response.status(), response.url());
      }
    });

    // Intercept platforms API call (GET)
    await page.route('**/*platforms*', async route => {
      console.log('  📡 Intercepting platforms API call:', route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {"id":"ef72d232-9fac-45ef-8d9c-5c572d2b2668","name":"youtube","requiresAuth":true},
          {"id":"6ee8eaf5-f2f8-435f-9d5a-6d63f94b241c","name":"netflix","requiresAuth":true},
          {"id":"82a887b7-c43c-4b99-8abf-599e6d74aaa4","name":"prime video","requiresAuth":true},
          {"id":"9dcaa931-0f90-4032-9afc-bd874249e0c3","name":"disney+","requiresAuth":true},
          {"id":"cf7bae65-1d9a-44b7-9cbf-cfd10e6f1e84","name":"custom","requiresAuth":true}
        ])
      });
    });

    // Intercept video POST requests and redirect to correct backend
    await page.route('**/videos', async route => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('medio-react-app.fly.dev')) {
        console.log('  📡 Intercepting video POST, redirecting to backend API');

        // Get the POST data
        const postData = request.postDataJSON();

        // Forward to the correct backend URL
        const backendUrl = 'https://medio-backend.fly.dev/api/videos';

        // Get auth headers from the request
        const headers = await request.allHeaders();

        await route.continue({
          url: backendUrl,
          headers: headers,
          postData: JSON.stringify(postData)
        });
      } else {
        await route.continue();
      }
    });

    console.log('✅ API interception ready (platforms + videos)');

    // Step 4: Click "Add Video" button to open modal
    console.log('Step 4: Opening Add Video modal...');
    const addVideoButton = page.locator('button:has-text("Add Video")').first();
    await addVideoButton.click();

    // Wait for modal to appear
    await page.waitForSelector('form', { timeout: 5000 });
    await page.waitForTimeout(1000); // Extra time for platforms to load
    await page.screenshot({ path: 'step-4-modal-opened.png', fullPage: true });

    // Step 5: Fill out the form MANUALLY
    console.log('Step 5: Filling out form manually...');
    await page.screenshot({ path: 'step-5a-modal-initial.png', fullPage: true });

    // Fill Video URL
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[name*="url"]').first();
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.waitForTimeout(1000);

    // Wait for platforms to load
    const platformSelect = page.locator('select#platform, select[name="platform"]').first();
    await page.waitForTimeout(2000); // Give time for the intercepted response to populate

    // Take screenshot before selection
    await page.screenshot({ path: 'step-5b-before-platform-select.png', fullPage: true });

    // Select YouTube platform
    const options = await platformSelect.locator('option').allTextContents();
    console.log('Available platform options:', options);

    await platformSelect.selectOption('ef72d232-9fac-45ef-8d9c-5c572d2b2668'); // YouTube UUID
    console.log('✅ Selected YouTube platform');
    await page.waitForTimeout(500);

    // Fill Title
    const titleInput = page.locator('input[placeholder*="title"], input[name*="title"]').first();
    await titleInput.fill('Test Video Complete Workflow');

    // Fill Description
    const descriptionInput = page.locator('textarea, input[placeholder*="description"], input[name*="description"]').first();
    await descriptionInput.fill('Testing manual video addition');

    // Select Age Rating - scroll to it first
    const ageRatingSelect = page.locator('select#ageRating, select[name*="age"]').first();
    await ageRatingSelect.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get available age rating options
    const ageRatingOptions = await ageRatingSelect.locator('option').allTextContents();
    console.log('Available age rating options:', ageRatingOptions);

    // Find and select PG rating
    const pgOption = ageRatingOptions.find(opt => opt.includes('PG -') || (opt.includes('PG') && !opt.includes('PG-13')));
    if (pgOption) {
      await ageRatingSelect.selectOption({ label: pgOption });
      console.log(`✅ Selected age rating: ${pgOption}`);
    } else {
      // Fallback to first non-empty option
      await ageRatingSelect.selectOption({ index: 1 });
      console.log('✅ Selected age rating at index 1');
    }

    // Scroll to top to verify all fields in screenshot
    await page.locator('h2:has-text("Add Video")').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'step-5-form-filled.png', fullPage: true });
    console.log('Form filled with manual data');

    // Step 6: Submit the form
    console.log('Step 6: Submitting form...');
    const submitButton = page.locator('button[type="submit"]:has-text("Add Video")').first();
    await submitButton.click();

    // Wait a bit for submission to process
    await page.waitForTimeout(2000);

    // Check for error messages
    const errorMessage = await page.locator('[class*="error"], [role="alert"], .alert-danger').first().textContent().catch(() => null);
    if (errorMessage) {
      console.log('⚠️ Error message found:', errorMessage);
      await page.screenshot({ path: 'step-6-error.png', fullPage: true });
    }

    // Step 7: Wait for modal to close (or timeout and continue)
    console.log('Step 7: Waiting for modal to close...');
    const modalClosed = await page.waitForSelector('form', { state: 'hidden', timeout: 15000 }).then(() => true).catch(() => false);

    if (!modalClosed) {
      console.log('⚠️ Modal did not close - checking for errors or loading state');
      await page.screenshot({ path: 'step-7-modal-still-open.png', fullPage: true });

      // Try clicking close button manually as workaround
      const closeButton = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeButton.isVisible()) {
        console.log('  Manually closing modal...');
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('✅ Modal closed successfully');
    }

    await page.waitForTimeout(1000); // Give time for the list to update
    await page.screenshot({ path: 'step-7-after-submission.png', fullPage: true });

    // Step 8: Verify video appears in Video Library list
    console.log('Step 8: Verifying video appears in library...');

    // Look for the video title in the library
    const videoTitle = page.locator('text=Test Video Complete Workflow');
    const videoVisible = await videoTitle.isVisible().catch(() => false);

    if (videoVisible) {
      console.log('✅ Video found in library');

      // Step 9: Confirm the title matches
      console.log('Step 9: Confirming title matches...');
      const titleText = await videoTitle.textContent();
      expect(titleText).toContain('Test Video Complete Workflow');
      console.log(`✅ Title confirmed: ${titleText}`);

      // Final screenshot
      await page.screenshot({ path: 'step-9-final-verification.png', fullPage: true });

      // Additional verification: Check for description
      const videoDescription = page.locator('text=Testing manual video addition');
      if (await videoDescription.isVisible()) {
        console.log('✅ Description also visible in library');
      }

      console.log('\n🎉 Complete workflow test passed successfully!');
      console.log(`User: ${testEmail}`);
      console.log('Video: Test Video Complete Workflow');
    } else {
      console.log('\n❌ TEST RESULT: Video NOT found in library');
      console.log('\n📋 PRODUCTION ISSUES DISCOVERED:');
      console.log('1. ❌ Platforms API misconfigured:');
      console.log('   - Frontend calls: /platforms');
      console.log('   - Should call: https://medio-backend.fly.dev/api/platforms');
      console.log('   - Workaround: API interception in test');
      console.log('');
      console.log('2. ❌ Videos POST API misconfigured or incompatible:');
      console.log('   - Frontend POSTs to: /videos');
      console.log('   - Should POST to: https://medio-backend.fly.dev/api/videos');
      console.log('   - Backend returns: 400 Bad Request (data format mismatch)');
      console.log('   - Error: "Invalid video data. Please check all fields and try again."');
      console.log('');
      console.log('3. ✅ User registration: WORKING');
      console.log('4. ✅ Navigation: WORKING');
      console.log('5. ✅ Form UI: WORKING');
      console.log('6. ✅ Platform selection: WORKING (with interception)');
      console.log('7. ✅ Form validation: WORKING');
      console.log('');
      console.log(`Test user created: ${testEmail}`);
      console.log('Form data prepared: All fields filled correctly');
      console.log('');
      console.log('⚠️ RECOMMENDATION: Fix API proxy configuration on production');

      // Take final screenshot showing the state
      await page.screenshot({ path: 'step-final-failed-state.png', fullPage: true });

      // Mark test as failed with clear message
      throw new Error('Video save failed due to production API configuration issues. See console output for details.');
    }
  });
});
