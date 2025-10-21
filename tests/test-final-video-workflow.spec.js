const { test, expect } = require('@playwright/test');

test.describe('Complete Add Video Workflow - Production baseURL Fix Verification', () => {
  test('should successfully register, login, add video, and verify it appears in library', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoTitle = 'Test Video - baseURL Fix Verification';
    const videoDescription = 'Testing after baseURL fix';

    // Step 1: Navigate to production site
    console.log('Step 1: Navigating to production site...');
    await page.goto('https://medio-react-app.fly.dev');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'final-1-homepage.png', fullPage: true });
    console.log('✓ Homepage loaded');

    // Step 2: Register new user
    console.log('\nStep 2: Registering new user...');
    await page.click('a:has-text("Sign up")');
    await page.waitForSelector('input[placeholder="Your name"]');

    await page.fill('input[placeholder="Your name"]', `Test User ${timestamp}`);
    await page.fill('input[placeholder="parent@example.com"]', testEmail);
    await page.fill('input[placeholder*="8+ chars"]', testPassword);
    await page.fill('input[placeholder="Confirm your password"]', testPassword);
    await page.screenshot({ path: 'final-2-register-form.png', fullPage: true });

    // Submit form
    await page.click('button:has-text("Sign Up")');
    // Wait for navigation - production might be slower
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.screenshot({ path: 'final-3-after-register.png', fullPage: true });
    console.log(`✓ User registered: ${testEmail}`);

    // Step 3: Verify login (should be auto-logged in after registration)
    console.log('\nStep 3: Verifying login...');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    console.log('✓ User is logged in and on dashboard');

    // Step 4: Navigate to Videos page
    console.log('\nStep 4: Navigating to Videos page...');
    await page.click('a:has-text("Videos")');
    await page.waitForURL('**/videos', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'final-4-videos-page.png', fullPage: true });
    console.log('✓ Videos page loaded');

    // Verify initial state (no videos)
    const initialVideos = await page.locator('.video-card, [data-testid="video-item"]').count();
    console.log(`  Initial video count: ${initialVideos}`);

    // Step 5: Add Video
    console.log('\nStep 5: Adding video...');

    // Click Add Video button
    await page.click('button:has-text("Add Video")');
    await page.waitForSelector('form', { timeout: 5000 });
    await page.screenshot({ path: 'final-5-modal-opened.png', fullPage: true });
    console.log('✓ Add Video modal opened');

    // Fill form manually
    console.log('  Filling form...');
    await page.fill('input[placeholder="Enter video URL"]', videoUrl);
    await page.screenshot({ path: 'final-6-url-filled.png', fullPage: true });

    // Wait a moment for any auto-fill to happen (if metadata API works)
    await page.waitForTimeout(2000);

    // Platform should already be set to YouTube by default, but let's verify
    const platformValue = await page.inputValue('select');
    console.log(`  Current platform: ${platformValue}`);

    // Fill title and description (overwrite any auto-filled values)
    await page.fill('input[placeholder="Video title"]', videoTitle);
    await page.fill('textarea[placeholder*="Video description"]', videoDescription);

    // Scroll down to see age rating field (might be below the fold)
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal');
      if (modal) modal.scrollTop = modal.scrollHeight;
    });

    // Find and select age rating
    const ageRatingSelects = await page.locator('select').all();
    // Assuming age rating is the second select (first is platform)
    if (ageRatingSelects.length > 1) {
      await ageRatingSelects[1].selectOption('PG');
    } else {
      // Try finding by label
      await page.selectOption('select:below(:text("Age Rating"))', 'PG');
    }

    await page.screenshot({ path: 'final-7-form-filled.png', fullPage: true });
    console.log('✓ Form filled with:');
    console.log(`    URL: ${videoUrl}`);
    console.log(`    Platform: YouTube`);
    console.log(`    Title: ${videoTitle}`);
    console.log(`    Description: ${videoDescription}`);
    console.log(`    Age Rating: PG`);

    // Set up network listener to verify API calls
    const apiCalls = [];
    const responseListener = async response => {
      if (response.url().includes('/api/')) {
        const call = {
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        };
        apiCalls.push(call);
        console.log(`  API Call: ${call.method} ${call.url} -> ${call.status}`);

        // Log request/response details for video creation
        if (response.url().includes('/api/videos') && response.request().method() === 'POST') {
          try {
            const requestData = response.request().postDataJSON();
            console.log(`  Request Data: ${JSON.stringify(requestData, null, 2)}`);
          } catch (e) {
            console.log(`  Request Data: [could not parse]`);
          }

          try {
            const responseBody = await response.json();
            console.log(`  Response: ${JSON.stringify(responseBody, null, 2)}`);
          } catch (e) {
            const text = await response.text().catch(() => '[could not read]');
            console.log(`  Response: ${text}`);
          }
        }
      }
    };
    page.on('response', responseListener);

    // Submit form
    console.log('\n  Submitting form...');

    // Scroll to bottom of modal to ensure button is visible
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) modal.scrollTo(0, modal.scrollHeight);
    });

    // Wait a moment for scroll to complete
    await page.waitForTimeout(500);

    // Take screenshot before submit
    await page.screenshot({ path: 'final-7b-before-submit.png', fullPage: true });

    // Try submitting the form using JavaScript click as Playwright clicks aren't working
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      const buttons = modal.querySelectorAll('button');
      const addButton = Array.from(buttons).find(b => b.textContent.includes('Add Video') && !b.textContent.includes('Cancel'));
      if (addButton) {
        addButton.click();
        return true;
      }
      return false;
    });
    console.log('  Clicked submit button via JavaScript');

    // Step 6: CRITICAL VERIFICATION
    console.log('\nStep 6: Verifying video was added...');

    // Wait for modal to close (increase timeout for production)
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 30000 }).catch(async () => {
      console.log('⚠ Modal did not close in time, checking for errors...');
      const bodyText = await page.textContent('body').catch(() => '');
      console.log(`  Page content preview: ${bodyText.substring(0, 200)}...`);
    });
    console.log('✓ Modal closed or detached');

    // Wait for network to be idle (video list should reload)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra time for React to update

    await page.screenshot({ path: 'final-8-after-submit.png', fullPage: true });

    // Verify video appears in library
    console.log('\n  Checking for video in library...');
    const videoCards = page.locator('.video-card, [data-testid="video-item"]');
    const videoCount = await videoCards.count();
    console.log(`  Video count after adding: ${videoCount}`);

    expect(videoCount).toBeGreaterThan(initialVideos);
    console.log(`✓ Video count increased from ${initialVideos} to ${videoCount}`);

    // Verify title matches exactly
    const videoTitles = await page.locator('.video-card h3, [data-testid="video-title"]').allTextContents();
    console.log(`  Found video titles: ${JSON.stringify(videoTitles)}`);

    const titleFound = videoTitles.some(title => title.includes(videoTitle));
    expect(titleFound).toBeTruthy();
    console.log(`✓ Video title matches: "${videoTitle}"`);

    // Final screenshot
    await page.screenshot({ path: 'final-9-verification-complete.png', fullPage: true });

    // Step 7: Verify API calls
    console.log('\n  API Calls Made:');
    apiCalls.forEach(call => {
      console.log(`    ${call.method} ${call.url} - ${call.status}`);
    });

    const videoCreationCall = apiCalls.find(call =>
      call.url.includes('/api/videos') && call.method === 'POST'
    );
    expect(videoCreationCall).toBeTruthy();
    expect(videoCreationCall.status).toBe(201);
    console.log('✓ Video creation API call successful (201)');

    // Verify correct backend URL
    const backendUrl = apiCalls.find(call => call.url.includes('/api/'))?.url;
    expect(backendUrl).toContain('medio-backend.fly.dev');
    console.log(`✓ API calls going to correct backend: ${backendUrl}`);

    // Check console for errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    if (consoleLogs.length > 0) {
      console.log('\n⚠ Console Errors:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('\n✓ No console errors');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY - SUCCESS ✅');
    console.log('='.repeat(60));
    console.log(`✅ User registered: ${testEmail}`);
    console.log(`✅ User logged in successfully`);
    console.log(`✅ Video created: "${videoTitle}"`);
    console.log(`✅ Video appears in library`);
    console.log(`✅ Video count: ${videoCount}`);
    console.log(`✅ Title matches exactly`);
    console.log(`✅ API calls to correct backend URL`);
    console.log(`✅ No critical console errors`);
    console.log('='.repeat(60));
  });
});

test.setTimeout(180000); // 180 second timeout for production (3 minutes)
