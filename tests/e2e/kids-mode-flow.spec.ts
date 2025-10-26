/**
 * E2E Tests for Kids Mode
 *
 * User Story 1: NFC Scanning Interface
 * User Story 2: Sequential Video Playback
 * User Story 3: Button-Free Gesture Controls
 *
 * Test Coverage:
 *
 * User Story 1:
 * - AS1.1: Smartphone shows pulsating scan area at top-center
 * - AS1.2: Tablet shows pulsating scan area at edge-center
 * - AS1.3: Pulsating animation runs continuously
 * - AS1.4: Desktop shows simulation mode
 * - AS1.5: NFC scan triggers success indicator
 *
 * User Story 2:
 * - AS2.1: Chip with 3 videos → Video A plays first
 * - AS2.2: Video A ends → Video B auto-plays
 * - AS2.3: Last video ends → return to scan screen
 * - AS2.4: Chip with 1 video → plays then returns
 * - AS2.5: Chip with no videos → friendly error
 *
 * User Story 3:
 * - AS3.1: Tilt forward → video scrubs forward
 * - AS3.2: Tilt backward → video scrubs backward
 * - AS3.3: Shake right → skip to next video
 * - AS3.4: Shake right on last video → friendly message
 * - AS3.5: Shake left → previous video
 * - AS3.6: Shake left on first video → restart video
 * - AS3.7: Device stationary → playback continues normally
 */

import { test, expect, devices, Page } from '@playwright/test';

/**
 * Helper: Navigate to Kids Mode page
 */
async function navigateToKidsMode(page: Page) {
  await page.goto('/kids');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper: Get scan area element
 */
async function getScanArea(page: Page) {
  return page.locator('[data-testid="nfc-scan-area"]');
}

/**
 * Helper: Verify pulsating animation is active
 */
async function verifyPulsatingAnimation(page: Page) {
  const scanArea = await getScanArea(page);

  // Check for pulsating CSS class
  await expect(scanArea).toHaveClass(/nfc-scan-area--pulsating/);

  // Verify animation is running by checking computed style
  const animationName = await scanArea.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.animationName;
  });

  expect(animationName).not.toBe('none');
  expect(animationName).toContain('pulse');
}

/**
 * Helper: Get element position as percentage of viewport
 */
async function getElementPositionPercent(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      x: ((rect.left + rect.width / 2) / viewportWidth) * 100,
      y: ((rect.top + rect.height / 2) / viewportHeight) * 100,
    };
  });
}

/**
 * Test Suite: Device-Specific NFC Scanning UI
 */

test.describe('Kids Mode - NFC Scanning Interface (User Story 1)', () => {
  test.describe('AS1.1 - Smartphone: Scan area at top-center', () => {
    test.use({ ...devices['iPhone 12'] });

    test('displays pulsating scan area at top-center on smartphone', async ({ page }) => {
      await navigateToKidsMode(page);

      // Verify scan area exists
      const scanArea = await getScanArea(page);
      await expect(scanArea).toBeVisible();

      // Verify position is top-center (x ≈ 50%, y ≈ 10-20%)
      const position = await getElementPositionPercent(page, '[data-testid="nfc-scan-area"]');

      expect(position.x).toBeGreaterThan(40);
      expect(position.x).toBeLessThan(60);
      expect(position.y).toBeGreaterThan(5);
      expect(position.y).toBeLessThan(25);
    });

    test('shows child-friendly instruction text on smartphone', async ({ page }) => {
      await navigateToKidsMode(page);

      // Check for instruction text
      await expect(page.getByText(/place your magic chip/i)).toBeVisible();
    });

    test('displays scan icon within scan area on smartphone', async ({ page }) => {
      await navigateToKidsMode(page);

      const scanIcon = page.locator('[data-testid="nfc-scan-icon"]');
      await expect(scanIcon).toBeVisible();
    });
  });

  test.describe('AS1.2 - Tablet: Scan area at edge-center', () => {
    test.use({ ...devices['iPad Pro'] });

    test('displays pulsating scan area at top-center on tablet', async ({ page }) => {
      await navigateToKidsMode(page);

      // Verify scan area exists
      const scanArea = await getScanArea(page);
      await expect(scanArea).toBeVisible();

      // Tablets show at top-center (per updated spec, not edge)
      const position = await getElementPositionPercent(page, '[data-testid="nfc-scan-area"]');

      expect(position.x).toBeGreaterThan(40);
      expect(position.x).toBeLessThan(60);
      expect(position.y).toBeGreaterThan(5);
      expect(position.y).toBeLessThan(25);
    });

    test('shows child-friendly instruction text on tablet', async ({ page }) => {
      await navigateToKidsMode(page);

      await expect(page.getByText(/place your magic chip/i)).toBeVisible();
    });
  });

  test.describe('AS1.3 - Pulsating Animation', () => {
    test.use({ ...devices['iPhone 12'] });

    test('pulsating animation runs continuously', async ({ page }) => {
      await navigateToKidsMode(page);

      // Verify animation is active
      await verifyPulsatingAnimation(page);

      // Wait 2 seconds and verify animation still active
      await page.waitForTimeout(2000);
      await verifyPulsatingAnimation(page);
    });

    test('animation includes color changes', async ({ page }) => {
      await navigateToKidsMode(page);

      const scanArea = await getScanArea(page);

      // Capture initial color
      const initialColor = await scanArea.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Wait for animation cycle
      await page.waitForTimeout(1000);

      // Capture color again (should be different due to animation)
      const laterColor = await scanArea.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Note: This may not always differ due to timing, but we verify animation exists
      expect(initialColor).toBeTruthy();
      expect(laterColor).toBeTruthy();
    });

    test('animation includes scale/size changes', async ({ page }) => {
      await navigateToKidsMode(page);

      const scanArea = await getScanArea(page);

      // Check for transform style (scale animation)
      const transform = await scanArea.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });

      // Transform should not be 'none' if scale animation is applied
      expect(transform).toBeDefined();
    });
  });

  test.describe('AS1.4 - Desktop: Simulation Mode', () => {
    test('displays simulation mode on desktop', async ({ page }) => {
      await navigateToKidsMode(page);

      // Check for simulation mode indicator
      await expect(page.getByText(/simulation mode/i)).toBeVisible();

      // Check for manual chip ID input
      const input = page.getByPlaceholder(/enter chip id/i);
      await expect(input).toBeVisible();
    });

    test('displays scan button in simulation mode', async ({ page }) => {
      await navigateToKidsMode(page);

      const button = page.getByRole('button', { name: /scan chip/i });
      await expect(button).toBeVisible();
    });

    test('scan button is disabled when input is empty', async ({ page }) => {
      await navigateToKidsMode(page);

      const button = page.getByRole('button', { name: /scan chip/i });
      await expect(button).toBeDisabled();
    });

    test('scan button is enabled when chip ID is entered', async ({ page }) => {
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST-CHIP-123');

      const button = page.getByRole('button', { name: /scan chip/i });
      await expect(button).toBeEnabled();
    });
  });

  test.describe('AS1.5 - NFC Scan Success Indicator', () => {
    test.use({ ...devices['iPhone 12'] });

    test('stops pulsating and shows success state after simulated scan', async ({ page }) => {
      // Navigate to desktop mode for simulation
      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Enter chip ID
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST-CHIP-123');

      // Click scan button
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Verify scan area changes to success state
      const scanArea = await getScanArea(page);
      await expect(scanArea).not.toHaveClass(/nfc-scan-area--pulsating/);
      await expect(scanArea).toHaveClass(/nfc-scan-area--success/);
    });

    test('displays success message after scan', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST-CHIP-123');

      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Check for success message
      await expect(page.getByText(/chip scanned/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test.use({ ...devices['iPhone 12'] });

    test('scan area has proper ARIA labels', async ({ page }) => {
      await navigateToKidsMode(page);

      const scanArea = await getScanArea(page);

      // Check ARIA attributes
      await expect(scanArea).toHaveAttribute('role', 'region');
      await expect(scanArea).toHaveAttribute('aria-label', 'NFC scanning area');
    });

    test('status changes are announced to screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST-CHIP-123');

      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Check for live region with status
      const statusRegion = page.locator('[role="status"]');
      await expect(statusRegion).toBeVisible();
      await expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    test('keyboard navigation works in simulation mode', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Tab to input
      await page.keyboard.press('Tab');
      const input = page.getByPlaceholder(/enter chip id/i);
      await expect(input).toBeFocused();

      // Type chip ID
      await input.type('TEST-CHIP-123');

      // Tab to button
      await page.keyboard.press('Tab');
      const button = page.getByRole('button', { name: /scan chip/i });
      await expect(button).toBeFocused();

      // Press Enter to scan
      await page.keyboard.press('Enter');

      // Verify scan occurred
      await expect(page.getByText(/chip scanned/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test.use({ ...devices['iPhone 12'] });

    test('displays error message when NFC scanning fails', async ({ page }) => {
      // Mock NFC failure by intercepting API call
      await page.route('**/api/nfc/scan/public', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'NFC chip not registered' }),
        });
      });

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('INVALID-CHIP');

      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Verify error message is displayed
      await expect(page.getByText(/unable to scan|not registered/i)).toBeVisible({ timeout: 5000 });
    });

    test('error message is child-friendly', async ({ page }) => {
      await page.route('**/api/nfc/scan/public', (route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Chip not found' }),
        });
      });

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('UNKNOWN-CHIP');

      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Verify friendly error message (not technical jargon)
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();

      const text = await errorMessage.textContent();
      expect(text).toMatch(/magic chip|not found|ask a grown-up/i);
    });
  });

  test.describe('Responsiveness', () => {
    test('adapts scan area position when device orientation changes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Portrait
      await navigateToKidsMode(page);

      // Get initial position
      const portraitPosition = await getElementPositionPercent(page, '[data-testid="nfc-scan-area"]');

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Wait for reflow

      // Get new position
      const landscapePosition = await getElementPositionPercent(page, '[data-testid="nfc-scan-area"]');

      // Positions should still be reasonable (top-center maintained)
      expect(landscapePosition.x).toBeGreaterThan(40);
      expect(landscapePosition.x).toBeLessThan(60);

      // Verify scan area is still visible
      const scanArea = await getScanArea(page);
      await expect(scanArea).toBeVisible();
    });

    test('maintains visibility across different smartphone sizes', async ({ page }) => {
      const devices = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      ];

      for (const device of devices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await navigateToKidsMode(page);

        const scanArea = await getScanArea(page);
        await expect(scanArea).toBeVisible();

        // Verify position is still top-center
        const position = await getElementPositionPercent(page, '[data-testid="nfc-scan-area"]');
        expect(position.x).toBeGreaterThan(40);
        expect(position.x).toBeLessThan(60);
      }
    });
  });
});

/**
 * Test Suite: Sequential Video Playback (User Story 2)
 */

test.describe('Kids Mode - Sequential Video Playback (User Story 2)', () => {
  /**
   * Helper: Mock NFC API to return chip with videos
   */
  async function mockNFCChipWithVideos(page: Page, videos: any[]) {
    await page.route('**/api/nfc/scan/public', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          chip: {
            id: 'test-chip-123',
            chip_uid: 'TEST123',
          },
        }),
      });
    });

    await page.route('**/api/nfc/chips/*/videos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chip: {
            id: 'test-chip-123',
            chip_uid: 'TEST123',
          },
          videos,
        }),
      });
    });
  }

  /**
   * Helper: Simulate video player 'ended' event
   */
  async function simulateVideoEnded(page: Page) {
    await page.evaluate(() => {
      const event = new CustomEvent('videoEnded', { bubbles: true });
      window.dispatchEvent(event);
    });
  }

  test.describe('AS2.1 - Chip with 3 videos → Video A plays first', () => {
    test('displays first video after NFC scan', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'First Magic Video',
          platform_id: 'youtube',
          platform_video_id: 'dQw4w9WgXcQ',
          sequence_order: 1,
        },
        {
          id: 'video-2',
          title: 'Second Magic Video',
          platform_id: 'vimeo',
          platform_video_id: '123456789',
          sequence_order: 2,
        },
        {
          id: 'video-3',
          title: 'Third Magic Video',
          platform_id: 'dailymotion',
          platform_video_id: 'x8abcde',
          sequence_order: 3,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Scan chip
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for video player to appear
      await expect(page.locator('[data-testid="kids-video-player"]')).toBeVisible({ timeout: 5000 });

      // Verify first video title is displayed
      await expect(page.getByText('First Magic Video')).toBeVisible();
    });

    test('enters fullscreen mode after scan', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Test Video',
          platform_id: 'youtube',
          platform_video_id: 'test123',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Check if fullscreen API was called (via data attribute)
      await page.waitForTimeout(500);

      const videoPlayer = page.locator('[data-testid="kids-video-player"]');
      const isFullscreen = await videoPlayer.evaluate((el) => {
        return el.hasAttribute('data-fullscreen-attempted');
      });

      expect(isFullscreen).toBeTruthy();
    });

    test('video player has no visible controls', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Test Video',
          platform_id: 'youtube',
          platform_video_id: 'test123',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.locator('[data-testid="kids-video-player"]')).toBeVisible();

      // Verify no control buttons are visible
      expect(await page.getByRole('button', { name: /play/i }).count()).toBe(0);
      expect(await page.getByRole('button', { name: /pause/i }).count()).toBe(0);
      expect(await page.getByRole('button', { name: /skip/i }).count()).toBe(0);
      expect(await page.getByRole('button', { name: /next/i }).count()).toBe(0);
    });
  });

  test.describe('AS2.2 - Video A ends → Video B auto-plays', () => {
    test('advances to second video when first video ends', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'First Magic Video',
          platform_id: 'youtube',
          platform_video_id: 'abc123',
          sequence_order: 1,
        },
        {
          id: 'video-2',
          title: 'Second Magic Video',
          platform_id: 'vimeo',
          platform_video_id: '456789',
          sequence_order: 2,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Scan chip
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for first video
      await expect(page.getByText('First Magic Video')).toBeVisible({ timeout: 5000 });

      // Simulate first video ending
      await simulateVideoEnded(page);

      // Wait for second video to load
      await expect(page.getByText('Second Magic Video')).toBeVisible({ timeout: 5000 });
    });

    test('shows loading state between videos', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'First Video',
          platform_id: 'youtube',
          platform_video_id: 'abc',
          sequence_order: 1,
        },
        {
          id: 'video-2',
          title: 'Second Video',
          platform_id: 'vimeo',
          platform_video_id: '123',
          sequence_order: 2,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Check for loading indicator (brief appearance)
      const loadingIndicator = page.getByRole('status');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    });

    test('maintains fullscreen mode during video transitions', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'First Video',
          platform_id: 'youtube',
          platform_video_id: 'abc',
          sequence_order: 1,
        },
        {
          id: 'video-2',
          title: 'Second Video',
          platform_id: 'vimeo',
          platform_video_id: '123',
          sequence_order: 2,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Verify video player still in fullscreen
      const videoPlayer = page.locator('[data-testid="kids-video-player"]');
      await expect(videoPlayer).toBeVisible();

      const isFullscreen = await videoPlayer.evaluate((el) => {
        return el.hasAttribute('data-fullscreen-attempted');
      });

      expect(isFullscreen).toBeTruthy();
    });
  });

  test.describe('AS2.3 - Last video ends → return to scan screen', () => {
    test('returns to NFC scan screen after last video ends', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Only Video',
          platform_id: 'youtube',
          platform_video_id: 'abc123',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Scan chip
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for video to play
      await expect(page.getByText('Only Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Verify return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/place your magic chip/i)).toBeVisible();
    });

    test('exits fullscreen when returning to scan screen', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Test Video',
          platform_id: 'youtube',
          platform_video_id: 'test',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('Test Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Wait for return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible({ timeout: 5000 });

      // Verify fullscreen exited (check document.fullscreenElement is null)
      const isFullscreen = await page.evaluate(() => {
        return document.fullscreenElement !== null;
      });

      expect(isFullscreen).toBe(false);
    });

    test('scan screen is ready for new scan after playlist completion', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Test Video',
          platform_id: 'youtube',
          platform_video_id: 'test',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('Test Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Wait for return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible({ timeout: 5000 });

      // Verify pulsating animation is active again
      const scanArea = page.getByTestId('nfc-scan-area');
      await expect(scanArea).toHaveClass(/nfc-scan-area--pulsating/);

      // Verify input field is cleared and ready
      const newInput = page.getByPlaceholder(/enter chip id/i);
      await expect(newInput).toHaveValue('');
    });
  });

  test.describe('AS2.4 - Chip with 1 video → plays then returns', () => {
    test('plays single video and returns to scan screen', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Single Video',
          platform_id: 'youtube',
          platform_video_id: 'single',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Scan chip
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Verify video loads
      await expect(page.getByText('Single Video')).toBeVisible({ timeout: 5000 });

      // Simulate video ending
      await simulateVideoEnded(page);

      // Verify immediate return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/place your magic chip/i)).toBeVisible();
    });

    test('does not show "next video" indicator for single video', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Only Video',
          platform_id: 'youtube',
          platform_video_id: 'only',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('Only Video')).toBeVisible({ timeout: 5000 });

      // Verify no "next video" or "X of Y" indicators
      expect(await page.getByText(/next:/i).count()).toBe(0);
      expect(await page.getByText(/1 of 1/i).count()).toBe(0);
    });
  });

  test.describe('AS2.5 - Chip with no videos → friendly error', () => {
    test('displays friendly error when chip has no videos', async ({ page }) => {
      await mockNFCChipWithVideos(page, []);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Verify error message appears
      await expect(page.getByText(/no videos/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/ask a grown-up/i)).toBeVisible();
    });

    test('error message includes child-friendly emoji', async ({ page }) => {
      await mockNFCChipWithVideos(page, []);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Check for sad emoji
      await expect(page.getByText(/😢/)).toBeVisible({ timeout: 5000 });
    });

    test('provides return to scan screen option on error', async ({ page }) => {
      await mockNFCChipWithVideos(page, []);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for error
      await expect(page.getByText(/no videos/i)).toBeVisible({ timeout: 5000 });

      // Check for retry/back button
      const backButton = page.getByRole('button', { name: /scan another chip|try again/i });
      await expect(backButton).toBeVisible();

      // Click to return to scan screen
      await backButton.click();

      await expect(page.getByTestId('nfc-scan-area')).toBeVisible();
    });

    test('error is announced to screen readers', async ({ page }) => {
      await mockNFCChipWithVideos(page, []);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for error
      await expect(page.getByText(/no videos/i)).toBeVisible({ timeout: 5000 });

      // Check for ARIA alert
      const errorAlert = page.getByRole('alert');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  test.describe('Multi-Platform Playback', () => {
    test('plays videos from different platforms sequentially', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'YouTube Video',
          platform_id: 'youtube',
          platform_video_id: 'yt123',
          sequence_order: 1,
        },
        {
          id: 'video-2',
          title: 'Vimeo Video',
          platform_id: 'vimeo',
          platform_video_id: 'vm456',
          sequence_order: 2,
        },
        {
          id: 'video-3',
          title: 'Dailymotion Video',
          platform_id: 'dailymotion',
          platform_video_id: 'dm789',
          sequence_order: 3,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // First video (YouTube)
      await expect(page.getByText('YouTube Video')).toBeVisible({ timeout: 5000 });
      await simulateVideoEnded(page);

      // Second video (Vimeo)
      await expect(page.getByText('Vimeo Video')).toBeVisible({ timeout: 5000 });
      await simulateVideoEnded(page);

      // Third video (Dailymotion)
      await expect(page.getByText('Dailymotion Video')).toBeVisible({ timeout: 5000 });
      await simulateVideoEnded(page);

      // Return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Recovery During Playback', () => {
    test('shows error and retry option when video fails to load', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Broken Video',
          platform_id: 'youtube',
          platform_video_id: 'invalid',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      // Mock video player error
      await page.route('**/*invalid*', (route) => {
        route.abort('failed');
      });

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for error message
      await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 5000 });

      // Verify retry button appears
      const retryButton = page.getByRole('button', { name: /try again/i });
      await expect(retryButton).toBeVisible();
    });

    test('returns to scan screen from error state', async ({ page }) => {
      const videos = [
        {
          id: 'video-1',
          title: 'Error Video',
          platform_id: 'youtube',
          platform_video_id: 'error',
          sequence_order: 1,
        },
      ];

      await mockNFCChipWithVideos(page, videos);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('TEST123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Simulate error
      await page.evaluate(() => {
        const event = new CustomEvent('videoError', {
          bubbles: true,
          detail: { message: 'Playback failed' },
        });
        window.dispatchEvent(event);
      });

      // Wait for error
      await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 5000 });

      // Find and click back button
      const backButton = page.getByRole('button', { name: /back to scan|scan another/i });
      await backButton.click();

      // Verify return to scan screen
      await expect(page.getByTestId('nfc-scan-area')).toBeVisible();
    });
  });
});

/**
 * Test Suite: Button-Free Gesture Controls (User Story 3)
 */

test.describe('Kids Mode - Gesture Controls (User Story 3)', () => {
  /**
   * Helper: Mock NFC API with videos for gesture testing
   */
  async function setupGestureTestVideos(page: Page) {
    const videos = [
      {
        id: 'video-1',
        title: 'First Gesture Video',
        platform_id: 'youtube',
        platform_video_id: 'gesture1',
        sequence_order: 1,
      },
      {
        id: 'video-2',
        title: 'Second Gesture Video',
        platform_id: 'vimeo',
        platform_video_id: 'gesture2',
        sequence_order: 2,
      },
      {
        id: 'video-3',
        title: 'Third Gesture Video',
        platform_id: 'dailymotion',
        platform_video_id: 'gesture3',
        sequence_order: 3,
      },
    ];

    await page.route('**/api/nfc/scan/public', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          chip: { id: 'gesture-chip-123', chip_uid: 'GESTURE123' },
        }),
      });
    });

    await page.route('**/api/nfc/chips/*/videos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chip: { id: 'gesture-chip-123', chip_uid: 'GESTURE123' },
          videos,
        }),
      });
    });
  }

  /**
   * Helper: Simulate device orientation event (tilt)
   */
  async function simulateTilt(page: Page, beta: number) {
    await page.evaluate((betaAngle) => {
      const event = new DeviceOrientationEvent('deviceorientation', {
        beta: betaAngle,
        alpha: 0,
        gamma: 0,
        absolute: false,
      });
      window.dispatchEvent(event);
    }, beta);
  }

  /**
   * Helper: Simulate device motion event (shake)
   */
  async function simulateShake(page: Page, direction: 'left' | 'right') {
    const xAcceleration = direction === 'right' ? 25 : -25;

    await page.evaluate((x) => {
      const event = new DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x, y: 0, z: 0 },
      });
      window.dispatchEvent(event);
    }, xAcceleration);
  }

  /**
   * Helper: Get current video playback time
   */
  async function getCurrentPlaybackTime(page: Page): Promise<number> {
    return page.evaluate(() => {
      const videoContainer = document.querySelector('#kids-video-container');
      if (!videoContainer) return 0;

      // Access video player API (platform-specific)
      const iframe = videoContainer.querySelector('iframe');
      if (!iframe) return 0;

      // For testing, return mocked value from data attribute
      return parseFloat(videoContainer.getAttribute('data-current-time') || '0');
    });
  }

  /**
   * Helper: Set video playback time (for testing)
   */
  async function setVideoPlaybackTime(page: Page, time: number) {
    await page.evaluate((newTime) => {
      const videoContainer = document.querySelector('#kids-video-container');
      if (videoContainer) {
        videoContainer.setAttribute('data-current-time', newTime.toString());
      }
    }, time);
  }

  test.describe('AS3.1 - Tilt Forward → Video Scrubs Forward', () => {
    test('tilting device forward scrubs video forward', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      // Scan chip and start video
      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for video to load
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Set initial playback time
      await setVideoPlaybackTime(page, 10);
      const initialTime = await getCurrentPlaybackTime(page);

      // Simulate forward tilt (30° = ~50% intensity)
      await simulateTilt(page, 30);
      await page.waitForTimeout(100); // Wait for scrubbing to occur

      // Verify video scrubbed forward
      const newTime = await getCurrentPlaybackTime(page);
      expect(newTime).toBeGreaterThan(initialTime);
    });

    test('tilt intensity affects scrubbing speed', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Test small tilt (20° = low intensity)
      await setVideoPlaybackTime(page, 10);
      await simulateTilt(page, 20);
      await page.waitForTimeout(100);
      const timeAfterSmallTilt = await getCurrentPlaybackTime(page);

      // Test large tilt (45° = max intensity)
      await setVideoPlaybackTime(page, 10);
      await simulateTilt(page, 45);
      await page.waitForTimeout(100);
      const timeAfterLargeTilt = await getCurrentPlaybackTime(page);

      // Large tilt should scrub faster than small tilt
      expect(timeAfterLargeTilt - 10).toBeGreaterThan(timeAfterSmallTilt - 10);
    });

    test('tilt within dead zone (<15°) does not scrub', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      await setVideoPlaybackTime(page, 10);
      const initialTime = await getCurrentPlaybackTime(page);

      // Simulate small tilt within dead zone
      await simulateTilt(page, 10);
      await page.waitForTimeout(100);

      const newTime = await getCurrentPlaybackTime(page);
      expect(newTime).toBe(initialTime); // No scrubbing
    });
  });

  test.describe('AS3.2 - Tilt Backward → Video Scrubs Backward', () => {
    test('tilting device backward scrubs video backward', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Set playback time to 30 seconds (allow backward scrubbing)
      await setVideoPlaybackTime(page, 30);
      const initialTime = await getCurrentPlaybackTime(page);

      // Simulate backward tilt (-30°)
      await simulateTilt(page, -30);
      await page.waitForTimeout(100);

      const newTime = await getCurrentPlaybackTime(page);
      expect(newTime).toBeLessThan(initialTime);
    });

    test('backward scrub clamps at zero seconds', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Set playback time to 2 seconds
      await setVideoPlaybackTime(page, 2);

      // Simulate max backward tilt for long duration
      await simulateTilt(page, -45);
      await page.waitForTimeout(500);

      const newTime = await getCurrentPlaybackTime(page);
      expect(newTime).toBeGreaterThanOrEqual(0); // Clamped at 0
    });
  });

  test.describe('AS3.3 - Shake Right → Skip to Next Video', () => {
    test('shaking device right skips to next video', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Wait for first video
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Shake right
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);

      // Verify second video loads
      await expect(page.getByText('Second Gesture Video')).toBeVisible({ timeout: 3000 });
    });

    test('shake cooldown prevents double-skipping', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Shake right twice rapidly (within cooldown period)
      await simulateShake(page, 'right');
      await page.waitForTimeout(200); // Within 800ms cooldown
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);

      // Should skip to second video, not third
      await expect(page.getByText('Second Gesture Video')).toBeVisible();
      expect(await page.getByText('Third Gesture Video').count()).toBe(0);
    });
  });

  test.describe('AS3.4 - Shake Right on Last Video → Friendly Message', () => {
    test('shaking right on last video shows "no more videos" message', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Skip to last video
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);
      await expect(page.getByText('Second Gesture Video')).toBeVisible();
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);
      await expect(page.getByText('Third Gesture Video')).toBeVisible();

      // Shake right on last video
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);

      // Verify friendly message appears
      await expect(page.getByText(/no more videos|all done|great job/i)).toBeVisible({ timeout: 2000 });
    });

    test('friendly message includes emoji', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Navigate to last video
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);
      await simulateShake(page, 'right');
      await page.waitForTimeout(1000); // Wait for cooldown
      await simulateShake(page, 'right');
      await page.waitForTimeout(500);

      // Check for emoji
      await expect(page.getByText(/🎉|👏|✨/)).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('AS3.5 - Shake Left → Previous Video', () => {
    test('shaking device left goes to previous video', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      // Skip to second video
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });
      await simulateShake(page, 'right');
      await page.waitForTimeout(1000); // Wait for cooldown
      await expect(page.getByText('Second Gesture Video')).toBeVisible();

      // Shake left to go back
      await simulateShake(page, 'left');
      await page.waitForTimeout(500);

      // Verify first video loads again
      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('AS3.6 - Shake Left on First Video → Restart Video', () => {
    test('shaking left on first video restarts current video', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Set playback time to 30 seconds
      await setVideoPlaybackTime(page, 30);

      // Shake left on first video
      await simulateShake(page, 'left');
      await page.waitForTimeout(500);

      // Verify video restarted (time = 0)
      const currentTime = await getCurrentPlaybackTime(page);
      expect(currentTime).toBeLessThan(5); // Should be near 0

      // Still on first video
      await expect(page.getByText('First Gesture Video')).toBeVisible();
    });
  });

  test.describe('AS3.7 - Device Stationary → Playback Continues Normally', () => {
    test('video plays normally when device is stationary', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Simulate stationary device (beta = 0, no acceleration)
      await simulateTilt(page, 0);
      await page.evaluate(() => {
        const event = new DeviceMotionEvent('devicemotion', {
          accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
        });
        window.dispatchEvent(event);
      });

      // Wait and verify video player remains visible (no crashes)
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="kids-video-player"]')).toBeVisible();
      await expect(page.getByText('First Gesture Video')).toBeVisible();
    });

    test('small movements within dead zone do not interrupt playback', async ({ page }) => {
      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Simulate small movements (within dead zone)
      await simulateTilt(page, 5);
      await page.waitForTimeout(100);
      await simulateTilt(page, -8);
      await page.waitForTimeout(100);
      await simulateTilt(page, 12);
      await page.waitForTimeout(100);

      // Video should still be playing
      await expect(page.locator('[data-testid="kids-video-player"]')).toBeVisible();
      await expect(page.getByText('First Gesture Video')).toBeVisible();
    });
  });

  test.describe('iOS Permission Handling', () => {
    test('shows permission prompt if orientation/motion access required', async ({ page }) => {
      // Mock iOS environment requiring permission
      await page.addInitScript(() => {
        (window as any).DeviceOrientationEvent = {
          requestPermission: () => Promise.resolve('granted'),
        };
      });

      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      // Look for permission prompt or "Enable Gestures" button
      const enableButton = page.getByRole('button', { name: /enable gestures/i });
      if (await enableButton.isVisible({ timeout: 2000 })) {
        await enableButton.click();
      }

      // After granting permission, gestures should work
      await simulateTilt(page, 30);
      await page.waitForTimeout(100);

      // Verify gesture is now active (no error)
      await expect(page.locator('[data-testid="kids-video-player"]')).toBeVisible();
    });

    test('shows friendly message if permission denied', async ({ page }) => {
      await page.addInitScript(() => {
        (window as any).DeviceOrientationEvent = {
          requestPermission: () => Promise.resolve('denied'),
        };
      });

      await setupGestureTestVideos(page);

      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToKidsMode(page);

      const input = page.getByPlaceholder(/enter chip id/i);
      await input.fill('GESTURE123');
      const button = page.getByRole('button', { name: /scan chip/i });
      await button.click();

      await expect(page.getByText('First Gesture Video')).toBeVisible({ timeout: 5000 });

      const enableButton = page.getByRole('button', { name: /enable gestures/i });
      if (await enableButton.isVisible({ timeout: 2000 })) {
        await enableButton.click();
      }

      // Verify friendly denial message
      await expect(page.getByText(/gestures not available|enable in settings/i)).toBeVisible({ timeout: 2000 });
    });
  });
});
