import { test, expect } from '@playwright/test';

test.describe('VideoAssignmentModal - Local Test', () => {
  test('modal should be visible and clickable', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:8080/login');

    // Login
    await page.fill('input[type="email"]', 'benjamin@eilersonline.de');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✓ Login successful');

    // Navigate to NFC Manager
    await page.goto('http://localhost:8080/nfc-manager');
    await page.waitForLoadState('networkidle');
    console.log('✓ NFC Manager page loaded');

    // Check if there are any NFC chips
    const chipCards = page.locator('.chip-card');
    const chipCount = await chipCards.count();
    console.log(`Found ${chipCount} NFC chips`);

    if (chipCount === 0) {
      console.log('⚠ No NFC chips found. Creating one first...');

      // Click "Add NFC Chip" button
      await page.click('text=Add NFC Chip');
      await page.waitForSelector('.modal-overlay');

      // Fill in chip details
      await page.fill('input[name="chip_uid"]', 'TEST-CHIP-001');
      await page.fill('input[name="label"]', 'Test Chip for Modal');
      await page.click('button:has-text("Save")');

      // Wait for modal to close
      await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 5000 });
      console.log('✓ Created test NFC chip');

      // Reload to see new chip
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Find the first chip with manage videos button
    const manageButton = page.locator('button:has-text("Manage Videos")').first();
    const isVisible = await manageButton.isVisible();

    if (!isVisible) {
      console.log('⚠ "Manage Videos" button not found. Trying emoji icon...');
      await page.click('.chip-card .chip-actions button').first();
    } else {
      await manageButton.click();
    }

    console.log('✓ Clicked Manage Videos button');

    // Wait for modal to appear
    await page.waitForSelector('.modal-overlay', { timeout: 5000 });
    console.log('✓ Modal overlay appeared');

    // Check if modal content is visible
    const modalContent = page.locator('.modal-content.video-assignment-modal');
    await expect(modalContent).toBeVisible();
    console.log('✓ Modal content is visible');

    // Check if modal has proper styling (not transparent)
    const overlayBg = await page.locator('.modal-overlay').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`Modal overlay background: ${overlayBg}`);
    expect(overlayBg).toContain('rgba(0, 0, 0, 0.5)');
    console.log('✓ Modal overlay has correct background');

    // Check pointer-events
    const pointerEvents = await modalContent.evaluate(el => {
      return window.getComputedStyle(el).pointerEvents;
    });
    console.log(`Modal content pointer-events: ${pointerEvents}`);
    expect(pointerEvents).toBe('auto');
    console.log('✓ Modal content has pointer-events: auto');

    // Test close button is clickable
    const closeButton = page.locator('.modal-close-btn');
    await expect(closeButton).toBeVisible();
    console.log('✓ Close button is visible');

    // Try to click close button
    await closeButton.click();
    console.log('✓ Close button clicked successfully');

    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 5000 });
    console.log('✓ Modal closed successfully');

    console.log('\n✅ ALL TESTS PASSED - Modal is visible and clickable!');
  });
});
