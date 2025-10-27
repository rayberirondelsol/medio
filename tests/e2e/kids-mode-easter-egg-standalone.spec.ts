import { test, expect } from '@playwright/test';

// Standalone tests that don't require authentication setup
// Testing production deployment at https://medio-react-app.fly.dev/kids

test.describe('Kids Mode Easter Egg - Production Tests', () => {
  test('Scenario 1: Easter Egg Activation Test', async ({ page }) => {
    console.log('🧪 Starting Easter Egg Activation Test...');

    // Navigate to production Kids Mode
    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');

    console.log('✅ Loaded /kids page');

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-kids-mode-initial.png', fullPage: true });

    // Look for scan area - try multiple selectors
    const scanArea = page.locator('.kids-scan-area, .scan-animation, .nfc-scan-prompt, [data-testid="nfc-scan-area"], .pulsating-circle').first();

    try {
      await scanArea.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Found scan area element');
    } catch (e) {
      console.log('❌ Could not find scan area element');
      await page.screenshot({ path: 'test-results/01-error-no-scan-area.png', fullPage: true });
      const pageContent = await page.content();
      console.log('Page HTML:', pageContent.substring(0, 1000));
      throw e;
    }

    // Click the scan area 10 times rapidly
    console.log('🖱️ Clicking scan area 10 times...');
    for (let i = 0; i < 10; i++) {
      await scanArea.click({ force: true });
      console.log(`  Click ${i + 1}/10`);
      await page.waitForTimeout(150); // Small delay between clicks
    }

    // Wait for activation
    await page.waitForTimeout(2000);

    // Take screenshot after activation
    await page.screenshot({ path: 'test-results/01-after-10-clicks.png', fullPage: true });

    // Check page content for activation message
    const bodyText = await page.textContent('body');
    console.log('Page text after 10 clicks:', bodyText?.substring(0, 500));

    const hasActivationMessage = bodyText?.includes('Test chip activated') ||
                                  bodyText?.includes('04:5A:B2:C3:D4:E5:F6') ||
                                  bodyText?.includes('test chip');

    if (hasActivationMessage) {
      console.log('✅ PASS: Easter egg activation message found');
    } else {
      console.log('⚠️ WARNING: No activation message found in text');
    }
  });

  test('Scenario 2: Video Playback Flow Test', async ({ page }) => {
    console.log('🧪 Starting Video Playback Flow Test...');

    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');

    // Activate Easter egg
    const scanArea = page.locator('.kids-scan-area, .scan-animation, .nfc-scan-prompt, [data-testid="nfc-scan-area"], .pulsating-circle').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    console.log('🖱️ Triggering Easter egg...');
    for (let i = 0; i < 10; i++) {
      await scanArea.click({ force: true });
      await page.waitForTimeout(150);
    }

    // Wait for video player to appear
    console.log('⏳ Waiting for video player...');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/02-video-playback.png', fullPage: true });

    // Check if scanning screen is still visible
    const scanAreaVisible = await scanArea.isVisible().catch(() => false);
    console.log('Scan area still visible:', scanAreaVisible);

    // Check for video player (multiple possible selectors)
    const videoIframe = page.locator('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').first();
    const videoPlayerDiv = page.locator('.video-player, .kids-video-player, [data-testid="video-player"]').first();

    const iframeVisible = await videoIframe.isVisible({ timeout: 5000 }).catch(() => false);
    const playerVisible = await videoPlayerDiv.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('Video iframe visible:', iframeVisible);
    console.log('Video player div visible:', playerVisible);

    if (iframeVisible) {
      const videoSrc = await videoIframe.getAttribute('src');
      console.log('✅ Video iframe src:', videoSrc);

      // Check if it's the expected Peppa Wutz video
      if (videoSrc?.includes('youtube.com')) {
        console.log('✅ PASS: YouTube video embedded correctly');
      }
    } else {
      console.log('❌ FAIL: No video iframe found');
    }

    if (!scanAreaVisible && (iframeVisible || playerVisible)) {
      console.log('✅ PASS: Scanning screen disappeared, video player appeared');
    } else {
      console.log('❌ FAIL: Video playback flow incomplete');
      console.log('  Scan area visible:', scanAreaVisible);
      console.log('  Video iframe visible:', iframeVisible);
      console.log('  Video player visible:', playerVisible);
    }

    // Check console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

    await page.waitForTimeout(1000);
    console.log('Console messages:', consoleMessages);
  });

  test('Scenario 3: API Contract Verification', async ({ page }) => {
    console.log('🧪 Starting API Contract Verification...');

    const apiRequests: any[] = [];
    const apiResponses: any[] = [];

    // Capture API requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    // Capture API responses
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const responseData: any = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };

        try {
          const body = await response.json();
          responseData.body = body;
        } catch (e) {
          // Not JSON response
        }

        apiResponses.push(responseData);
      }
    });

    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');

    // Activate Easter egg
    const scanArea = page.locator('.kids-scan-area, .scan-animation, .nfc-scan-prompt, [data-testid="nfc-scan-area"], .pulsating-circle').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    console.log('🖱️ Triggering Easter egg...');
    for (let i = 0; i < 10; i++) {
      await scanArea.click({ force: true });
      await page.waitForTimeout(150);
    }

    // Wait for API call
    await page.waitForTimeout(4000);

    console.log('\n📡 API Requests:', JSON.stringify(apiRequests, null, 2));
    console.log('\n📥 API Responses:', JSON.stringify(apiResponses, null, 2));

    // Find scan API call
    const scanApiCall = apiResponses.find(r => r.url.includes('/nfc/scan/public'));

    if (scanApiCall) {
      console.log('\n✅ Found /nfc/scan/public API call');
      console.log('  Status:', scanApiCall.status);
      console.log('  URL:', scanApiCall.url);
      console.log('  Response:', JSON.stringify(scanApiCall.body, null, 2));

      // Verify status
      if (scanApiCall.status === 200) {
        console.log('✅ PASS: API returned 200 OK');
      } else {
        console.log(`❌ FAIL: Expected 200, got ${scanApiCall.status}`);
      }

      // Verify URL structure
      if (scanApiCall.url.includes('/api/nfc/scan/public') && !scanApiCall.url.includes('/api/api/')) {
        console.log('✅ PASS: URL is correct (/api/nfc/scan/public)');
      } else {
        console.log('❌ FAIL: URL has incorrect structure');
      }

      // Verify response body
      if (scanApiCall.body) {
        const hasVideo = scanApiCall.body.video || scanApiCall.body.videos;
        const video = scanApiCall.body.video || scanApiCall.body.videos?.[0];

        if (video) {
          console.log('✅ PASS: Response contains video object');

          if (video.id && video.title && video.platform_video_id) {
            console.log('✅ PASS: Video has required fields (id, title, platform_video_id)');
          } else {
            console.log('⚠️ WARNING: Video missing some fields');
            console.log('  Has id:', !!video.id);
            console.log('  Has title:', !!video.title);
            console.log('  Has platform_video_id:', !!video.platform_video_id);
          }
        } else {
          console.log('❌ FAIL: No video object in response');
        }
      }
    } else {
      console.log('❌ FAIL: No /nfc/scan/public API call found');
      console.log('Available API calls:', apiResponses.map(r => r.url));
    }
  });

  test('Scenario 4: Error Handling Test', async ({ page }) => {
    console.log('🧪 Starting Error Handling Test...');

    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');

    const scanArea = page.locator('.kids-scan-area, .scan-animation, .nfc-scan-prompt, [data-testid="nfc-scan-area"], .pulsating-circle').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    // Tap 5 times (not enough)
    console.log('🖱️ Clicking 5 times (should not trigger)...');
    for (let i = 0; i < 5; i++) {
      await scanArea.click({ force: true });
      await page.waitForTimeout(150);
    }

    // Wait 6 seconds for timeout
    console.log('⏳ Waiting 6 seconds for counter reset...');
    await page.waitForTimeout(6000);

    // Tap 3 more times
    console.log('🖱️ Clicking 3 more times...');
    for (let i = 0; i < 3; i++) {
      await scanArea.click({ force: true });
      await page.waitForTimeout(150);
    }

    await page.waitForTimeout(2000);

    // Verify no video player appeared
    const videoIframe = page.locator('iframe[src*="youtube.com"]').first();
    const videoPlayerVisible = await videoIframe.isVisible({ timeout: 2000 }).catch(() => false);

    // Verify scan area is still visible
    const scanAreaStillVisible = await scanArea.isVisible();

    console.log('Video player visible:', videoPlayerVisible);
    console.log('Scan area still visible:', scanAreaStillVisible);

    if (!videoPlayerVisible && scanAreaStillVisible) {
      console.log('✅ PASS: Counter reset correctly, no scan triggered');
    } else {
      console.log('❌ FAIL: Error handling not working as expected');
    }

    await page.screenshot({ path: 'test-results/04-error-handling.png', fullPage: true });
  });

  test('Scenario 5: Page Elements and Console Errors', async ({ page }) => {
    console.log('🧪 Starting Console Error Check...');

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page error: ${error.message}`);
    });

    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n📊 Console Errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log(consoleErrors);
    }

    console.log('\n⚠️ Console Warnings:', consoleWarnings.length);
    if (consoleWarnings.length > 0) {
      console.log(consoleWarnings);
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/05-console-check.png', fullPage: true });

    if (consoleErrors.length === 0) {
      console.log('✅ PASS: No console errors on page load');
    } else {
      console.log('⚠️ WARNING: Console errors detected');
    }
  });
});
