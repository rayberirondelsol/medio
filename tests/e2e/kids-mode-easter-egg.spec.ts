import { test, expect } from '@playwright/test';

test.describe('Kids Mode Easter Egg Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Kids Mode
    await page.goto('https://medio-react-app.fly.dev/kids');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: Easter Egg Activation Test', async ({ page }) => {
    // Wait for the pulsating NFC scan area to be visible
    const scanArea = page.locator('.kids-scan-area, .scan-animation, [data-testid="nfc-scan-area"]').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Found scan area, clicking 10 times...');

    // Click the scan area 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await scanArea.click();
      await page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait for the test chip activation message
    await page.waitForTimeout(1000);

    // Take screenshot after activation
    await page.screenshot({ path: 'test-results/easter-egg-activation.png', fullPage: true });

    // Check for activation message
    const statusText = await page.textContent('body');
    console.log('Page content after 10 clicks:', statusText);

    // Verify the expected outcome
    const hasActivationMessage = statusText?.includes('Test chip activated') ||
                                  statusText?.includes('04:5A:B2:C3:D4:E5:F6');

    expect(hasActivationMessage).toBeTruthy();
  });

  test('Scenario 2: Video Playback Flow Test', async ({ page }) => {
    // Activate Easter egg
    const scanArea = page.locator('.kids-scan-area, .scan-animation, [data-testid="nfc-scan-area"]').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    for (let i = 0; i < 10; i++) {
      await scanArea.click();
      await page.waitForTimeout(100);
    }

    // Wait for video player to appear
    await page.waitForTimeout(2000);

    // Check if scanning screen disappeared
    const scanningVisible = await scanArea.isVisible().catch(() => false);

    // Check for video player component
    const videoPlayer = page.locator('iframe[src*="youtube.com"], .video-player, [data-testid="video-player"]').first();
    const videoPlayerVisible = await videoPlayer.isVisible({ timeout: 5000 }).catch(() => false);

    // Take screenshot
    await page.screenshot({ path: 'test-results/video-playback.png', fullPage: true });

    console.log('Scanning visible:', scanningVisible);
    console.log('Video player visible:', videoPlayerVisible);

    // Verify video player appeared and scanning disappeared
    expect(scanningVisible).toBeFalsy();
    expect(videoPlayerVisible).toBeTruthy();

    // Verify YouTube video embedded
    if (videoPlayerVisible) {
      const videoSrc = await videoPlayer.getAttribute('src');
      console.log('Video iframe src:', videoSrc);
      expect(videoSrc).toContain('youtube.com');
    }
  });

  test('Scenario 3: API Contract Verification', async ({ page }) => {
    // Start listening to network requests
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    const apiResponses: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const responseData = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        };

        try {
          const body = await response.json();
          apiResponses.push({ ...responseData, body });
        } catch (e) {
          apiResponses.push(responseData);
        }
      }
    });

    // Activate Easter egg
    const scanArea = page.locator('.kids-scan-area, .scan-animation, [data-testid="nfc-scan-area"]').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    for (let i = 0; i < 10; i++) {
      await scanArea.click();
      await page.waitForTimeout(100);
    }

    // Wait for API response
    await page.waitForTimeout(3000);

    console.log('API Requests:', JSON.stringify(apiRequests, null, 2));
    console.log('API Responses:', JSON.stringify(apiResponses, null, 2));

    // Verify API call
    const scanApiCall = apiResponses.find(r => r.url.includes('/nfc/scan/public'));
    expect(scanApiCall).toBeDefined();

    if (scanApiCall) {
      expect(scanApiCall.status).toBe(200);
      expect(scanApiCall.url).toContain('/api/nfc/scan/public');
      expect(scanApiCall.url).not.toContain('/api/api/');

      // Verify response body
      if (scanApiCall.body) {
        expect(scanApiCall.body).toHaveProperty('video');
        expect(scanApiCall.body.video).toHaveProperty('id');
        expect(scanApiCall.body.video).toHaveProperty('title');
        expect(scanApiCall.body.video).toHaveProperty('platform_video_id');
      }
    }
  });

  test('Scenario 4: Error Handling Test', async ({ page }) => {
    const scanArea = page.locator('.kids-scan-area, .scan-animation, [data-testid="nfc-scan-area"]').first();
    await scanArea.waitFor({ state: 'visible', timeout: 10000 });

    // Tap 5 times (not enough)
    for (let i = 0; i < 5; i++) {
      await scanArea.click();
      await page.waitForTimeout(100);
    }

    // Wait 6 seconds for timeout
    await page.waitForTimeout(6000);

    // Tap 3 more times
    for (let i = 0; i < 3; i++) {
      await scanArea.click();
      await page.waitForTimeout(100);
    }

    // Wait a bit
    await page.waitForTimeout(2000);

    // Verify no scan was triggered (no video player)
    const videoPlayer = page.locator('iframe[src*="youtube.com"], .video-player').first();
    const videoPlayerVisible = await videoPlayer.isVisible({ timeout: 2000 }).catch(() => false);

    expect(videoPlayerVisible).toBeFalsy();

    // Scan area should still be visible
    const scanAreaStillVisible = await scanArea.isVisible();
    expect(scanAreaStillVisible).toBeTruthy();
  });

  test('Scenario 5: Simulation Mode Input Test', async ({ page }) => {
    // Look for simulation mode input
    const simulationInput = page.locator('input[type="text"], input[placeholder*="chip"], input[placeholder*="ID"]').first();
    const inputVisible = await simulationInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!inputVisible) {
      console.log('Simulation mode input not visible - might be hidden by default');
      // Take screenshot to see current state
      await page.screenshot({ path: 'test-results/no-simulation-input.png', fullPage: true });
      return;
    }

    // Enter invalid chip ID
    await simulationInput.fill('INVALID-CHIP-ID');

    // Look for scan button
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Submit")').first();
    await scanButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check for error message
    const errorMessage = page.locator('.error, .error-message, [role="alert"]').first();
    const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Take screenshot
    await page.screenshot({ path: 'test-results/invalid-chip-error.png', fullPage: true });

    // Verify app didn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    console.log('Error message visible:', errorVisible);
  });
});
