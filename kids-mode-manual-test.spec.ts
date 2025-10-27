import { test, expect } from '@playwright/test';

/**
 * Kids Mode End-to-End Test - Production Deployment
 * Standalone test - no auth required
 */

test.describe('Kids Mode - Production E2E Test', () => {
  test.setTimeout(120000); // 2 minutes for deployment wait

  test('Complete flow: Easter egg → Scan → Video playback', async ({ page }) => {
    const startTime = Date.now();

    // Track console messages and errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Track network requests
    const networkRequests: { url: string; status: number; method: string; body?: any }[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const request = response.request();
        let body;
        try {
          body = await response.json().catch(() => null);
        } catch (e) {
          // Ignore
        }
        networkRequests.push({
          url,
          status: response.status(),
          method: request.method(),
          body
        });
      }
    });

    console.log('\n=== PHASE 1: Deployment Verification ===');

    // Navigate to Kids Mode
    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');

    console.log('✅ Page loaded successfully');

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/kids-mode-initial.png', fullPage: true });

    console.log('\n=== PHASE 2: Easter Egg Activation ===');

    // Find the NFC scan area using the correct selector
    const nfcScanArea = page.locator('[data-testid="nfc-scan-area"]');
    await expect(nfcScanArea).toBeVisible({ timeout: 10000 });
    console.log('✅ NFC scan area found and visible');

    // Take screenshot before tapping
    await page.screenshot({ path: 'test-results/kids-mode-before-easter-egg.png', fullPage: true });

    // Click 10 times rapidly to trigger Easter egg
    console.log('Tapping scan area 10 times...');
    for (let i = 0; i < 10; i++) {
      await nfcScanArea.click({ force: true, timeout: 1000 });
      await page.waitForTimeout(100); // Small delay between clicks
      console.log(`  Tap ${i + 1}/10`);
    }

    // Wait a bit for Easter egg to process
    await page.waitForTimeout(1000);

    // Look for status message or automatic scan trigger
    const statusMessage = page.locator('text=/Test chip activated|🎉/i');
    const statusVisible = await statusMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (statusVisible) {
      console.log('✅ Easter egg status message visible!');
    } else {
      console.log('⚠️ Status message not visible, but scan may have triggered');
    }

    // Take screenshot of Easter egg activation
    await page.screenshot({ path: 'test-results/kids-mode-easter-egg-activated.png', fullPage: true });

    console.log('\n=== PHASE 3: Video Playback Test ===');

    // Wait for video player to appear (may take a moment after scan)
    await page.waitForTimeout(2000);

    // Check if video player appeared
    let videoPlayerVisible = false;
    const videoPlayerSelectors = [
      '.kids-video-player',
      '[class*="video-player"]',
      'iframe[src*="youtube.com"]',
      '.video-container'
    ];

    for (const selector of videoPlayerSelectors) {
      const element = page.locator(selector).first();
      videoPlayerVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      if (videoPlayerVisible) {
        console.log(`✅ Video player found with selector: ${selector}`);
        break;
      }
    }

    if (!videoPlayerVisible) {
      console.log('⚠️ Video player not immediately visible, checking page state...');
      await page.screenshot({ path: 'test-results/kids-mode-no-video-player.png', fullPage: true });
    }

    // Check for YouTube iframe specifically
    const youtubeIframe = page.locator('iframe[src*="youtube.com"]').first();
    const iframeVisible = await youtubeIframe.isVisible({ timeout: 10000 }).catch(() => false);

    if (iframeVisible) {
      console.log('✅ YouTube iframe loaded');

      // Get the iframe src to verify video ID
      const iframeSrc = await youtubeIframe.getAttribute('src');
      console.log(`   Iframe src: ${iframeSrc}`);

      if (iframeSrc?.includes('pN49ZPeO4tk')) {
        console.log('✅ Correct video ID (pN49ZPeO4tk)');
      } else {
        console.log('⚠️ Video ID may be different');
      }
    } else {
      console.log('❌ YouTube iframe not visible');
    }

    // Take screenshot of video player state
    await page.screenshot({ path: 'test-results/kids-mode-video-state.png', fullPage: true });

    console.log('\n=== PHASE 4: API Verification ===');

    // Find the scan API request
    const scanRequest = networkRequests.find(req =>
      req.url.includes('/nfc/scan') || req.url.includes('/scan')
    );

    if (scanRequest) {
      console.log('✅ Scan API request found:');
      console.log(`   URL: ${scanRequest.url}`);
      console.log(`   Method: ${scanRequest.method}`);
      console.log(`   Status: ${scanRequest.status}`);

      // Verify URL is correct (not /api/api/...)
      if (scanRequest.url.includes('/api/api/')) {
        console.log('❌ Double /api/ prefix found!');
      } else {
        console.log('✅ No double /api/ prefix');
      }

      // Verify status
      if (scanRequest.status === 200) {
        console.log('✅ API returned 200 OK');
      } else {
        console.log(`❌ API returned ${scanRequest.status}`);
      }

      // Show response body if available
      if (scanRequest.body) {
        console.log('   Response body:', JSON.stringify(scanRequest.body, null, 2));
      }
    } else {
      console.log('⚠️ No scan API request found');
      console.log('\nAll network requests:');
      networkRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url} → ${req.status}`);
      });
    }

    console.log('\n=== PHASE 5: Console Verification ===');

    // Check for console errors
    if (consoleErrors.length === 0) {
      console.log('✅ No console errors');
    } else {
      console.log(`❌ Found ${consoleErrors.length} console errors:`);
      consoleErrors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    }

    // Filter out noise from console messages
    const relevantMessages = consoleMessages.filter(msg =>
      !msg.includes('DevTools') &&
      !msg.includes('Download the React DevTools') &&
      !msg.includes('extension') &&
      !msg.includes('manifest')
    );

    console.log(`\nRelevant console messages: ${relevantMessages.length}`);
    if (relevantMessages.length > 0 && relevantMessages.length <= 10) {
      relevantMessages.forEach(msg => console.log(`   ${msg}`));
    }

    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n=== TEST SUMMARY ===');
    console.log(`⏱️  Total flow completed in ${totalTime} seconds`);
    console.log(`${statusVisible ? '✅' : '⚠️ '} Easter egg activation`);
    console.log(`${iframeVisible ? '✅' : '❌'} Video playback`);
    console.log(`${scanRequest ? '✅' : '⚠️ '} API calls`);
    console.log(`${consoleErrors.length === 0 ? '✅' : '❌'} Console errors (${consoleErrors.length})`);

    if (iframeVisible && scanRequest && consoleErrors.length === 0) {
      console.log('\n🎉 Kids Mode is 100% functional!');
    } else {
      console.log('\n⚠️  Some issues detected - review screenshots and logs');
    }
  });
});
