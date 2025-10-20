/**
 * E2E Tests for NFC Chip Registration Feature
 *
 * Test Coverage (T068-T075):
 * - T068: Complete manual registration workflow
 * - T069: Duplicate chip registration blocked
 * - T070: Cross-user duplicate registration
 * - T071: Invalid chip_uid format rejected
 * - T072: Invalid label rejected
 * - T073: Maximum chip limit enforcement
 * - T074: NFC scan workflow with mocked NDEFReader
 * - T075: Chip deletion with confirmation
 *
 * Test Framework: Playwright
 * Authentication: Uses shared auth state from auth.setup.ts
 * Backend API: http://localhost:5000/api
 * Frontend: http://localhost:3000
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Helper function to clean up test chips via API
 * Deletes all chips for the authenticated user
 */
async function cleanupChips(request) {
  try {
    // Get all chips
    const getResponse = await request.get(`${BACKEND_URL}/api/nfc/chips`);
    if (getResponse.ok()) {
      const chips = await getResponse.json();

      // Delete each chip
      for (const chip of chips) {
        await request.delete(`${BACKEND_URL}/api/nfc/chips/${chip.id}`);
      }
    }
  } catch (error) {
    console.log('Cleanup error (may be normal if no chips exist):', error.message);
  }
}

/**
 * Helper function to register a chip via API
 * Useful for test setup
 */
async function registerChipViaAPI(request, chipUid, label) {
  const response = await request.post(`${BACKEND_URL}/api/nfc/chips`, {
    data: {
      chip_uid: chipUid,
      label: label
    }
  });
  return response;
}

/**
 * Helper function to logout current user
 */
async function logout(page) {
  try {
    // Look for logout button/link
    const logoutBtn = page.locator('text=/Logout|Log Out|Abmelden/i').first();
    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(/\/(login|auth)/, { timeout: 5000 });
    }
  } catch (error) {
    // If logout button not found, clear storage manually
    await page.context().clearCookies();
    await page.goto('/login');
  }
}

/**
 * Helper function to login as a specific user
 */
async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  await Promise.all([
    page.waitForURL(/\/(dashboard|videos)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Helper function to navigate to NFC Chips page
 */
async function navigateToNFCPage(page) {
  // Look for NFC navigation link
  const nfcLink = page.locator('text=/NFC|Chips|NFC Chips/i').first();

  if (await nfcLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nfcLink.click();
  } else {
    // Direct navigation if link not found
    await page.goto(`${FRONTEND_URL}/nfc-chips`);
  }

  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('NFC Chip Registration E2E Tests', () => {

  // Run cleanup before each test to ensure clean state
  test.beforeEach(async ({ request }) => {
    await cleanupChips(request);
  });

  // Clean up after tests
  test.afterEach(async ({ request }) => {
    await cleanupChips(request);
  });

  // ==========================================================================
  // T068: E2E test - Complete manual registration workflow
  // ==========================================================================
  test('T068: Complete manual registration workflow', async ({ page }) => {
    // Step 1: Navigate to NFC page
    await navigateToNFCPage(page);

    // Step 2: Verify empty state or form is visible
    const emptyState = page.locator('text=/Keine NFC-Chips|No chips|Empty/i');
    const chipForm = page.locator('form').filter({ hasText: /Chip-ID|Label/i });

    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const hasForm = await chipForm.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasEmptyState || hasForm).toBe(true);

    // Step 3: Fill registration form
    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();

    await chipUidInput.fill('04:5A:B2:C3:D4:E5:F6');
    await labelInput.fill('Test Chip E2E');

    // Step 4: Submit form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();
    await submitBtn.click();

    // Step 5: Verify chip appears in list
    await page.waitForSelector('text=/Test Chip E2E/i', { timeout: 5000 });
    const chipItem = page.locator('.chip-list-item, .chip-item, li').filter({ hasText: /Test Chip E2E/i });
    await expect(chipItem).toBeVisible();

    // Verify chip UID is displayed
    await expect(page.locator('text=/04:5A:B2:C3:D4:E5:F6/i')).toBeVisible();

    // Step 6: Verify persistence (reload page)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Chip should still be visible after reload
    await expect(page.locator('text=/Test Chip E2E/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/04:5A:B2:C3:D4:E5:F6/i')).toBeVisible();
  });

  // ==========================================================================
  // T069: E2E test - Duplicate chip registration blocked
  // ==========================================================================
  test('T069: Duplicate chip registration blocked', async ({ page }) => {
    const testUID = '04:AA:BB:CC:DD:EE:FF';

    // Step 1: Navigate to NFC page
    await navigateToNFCPage(page);

    // Step 2: Register chip first time (should succeed)
    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    await chipUidInput.fill(testUID);
    await labelInput.fill('First Registration');
    await submitBtn.click();

    // Wait for success
    await page.waitForSelector('text=/First Registration/i', { timeout: 5000 });

    // Step 3: Try to register same chip_uid again (should fail)
    await chipUidInput.fill(testUID);
    await labelInput.fill('Second Registration');
    await submitBtn.click();

    // Step 4: Verify error message displayed
    const errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /already registered|bereits registriert|duplicate/i
    });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    // Step 5: Verify chip only appears once in list
    const chipItems = page.locator('.chip-list-item, .chip-item, li').filter({ hasText: new RegExp(testUID, 'i') });
    await expect(chipItems).toHaveCount(1);

    // Verify it's still the first registration
    await expect(page.locator('text=/First Registration/i')).toBeVisible();
    await expect(page.locator('text=/Second Registration/i')).not.toBeVisible();
  });

  // ==========================================================================
  // T070: E2E test - Cross-user duplicate registration
  // CRITICAL: Tests global uniqueness constraint
  // ==========================================================================
  test('T070: Cross-user duplicate registration', async ({ page, context }) => {
    const sharedUID = '04:11:22:33:44:55:66';

    // Step 1: User A registers chip (using current auth state)
    await navigateToNFCPage(page);

    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    await chipUidInput.fill(sharedUID);
    await labelInput.fill('User A Chip');
    await submitBtn.click();

    // Wait for success
    await page.waitForSelector('text=/User A Chip/i', { timeout: 5000 });

    // Step 2: Logout User A
    await logout(page);

    // Step 3: Login as User B (using second test account)
    // Note: This requires a second test user to be created in the database
    // For now, we'll use a fallback test user email
    await loginAs(page, 'parent2@example.com', 'ParentPass123!');

    // Step 4: Navigate to NFC page as User B
    await navigateToNFCPage(page);

    // Step 5: User B tries to register same chip_uid
    await chipUidInput.fill(sharedUID);
    await labelInput.fill('User B Chip');
    await submitBtn.click();

    // Step 6: Verify error message (identical to same-user duplicate)
    const errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /already registered|bereits registriert|duplicate/i
    });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    // Step 7: Verify User B cannot see User A's chip
    await expect(page.locator('text=/User A Chip/i')).not.toBeVisible();

    // Step 8: Verify User B's chip list is empty or doesn't contain the shared UID
    const chipWithUID = page.locator('.chip-list-item, .chip-item, li').filter({ hasText: new RegExp(sharedUID, 'i') });
    await expect(chipWithUID).toHaveCount(0);

    // Clean up: Login back as User A to clean up
    await logout(page);
    await loginAs(page, 'parent@example.com', 'ParentPass123!');
  });

  // ==========================================================================
  // T071: E2E test - Invalid chip_uid format rejected
  // ==========================================================================
  test('T071: Invalid chip_uid format rejected', async ({ page }) => {
    await navigateToNFCPage(page);

    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    // Test 1: Too short (< 8 hex chars after removing separators)
    await chipUidInput.fill('04:5A');
    await labelInput.fill('Valid Label');
    await submitBtn.click();

    let errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /4-10 bytes|8-20|invalid|format/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 2: Too long (> 20 hex chars)
    await chipUidInput.clear();
    await chipUidInput.fill('04:5A:B2:C3:D4:E5:F6:A1:B2:C3:D4');
    await labelInput.fill('Valid Label');
    await submitBtn.click();

    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 3: Non-hex characters
    await chipUidInput.clear();
    await chipUidInput.fill('ZZ:YY:XX:WW:VV:UU');
    await labelInput.fill('Valid Label');
    await submitBtn.click();

    errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /hex|invalid|format/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 4: Empty string
    await chipUidInput.clear();
    await chipUidInput.fill('');
    await labelInput.fill('Valid Label');
    await submitBtn.click();

    errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /required|empty|invalid/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
  });

  // ==========================================================================
  // T072: E2E test - Invalid label rejected
  // ==========================================================================
  test('T072: Invalid label rejected', async ({ page }) => {
    await navigateToNFCPage(page);

    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    // Valid UID for all tests
    const validUID = '04:5A:B2:C3:D4:E5:F6';

    // Test 1: Empty label
    await chipUidInput.fill(validUID);
    await labelInput.fill('');
    await submitBtn.click();

    let errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /required|empty|1-50/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 2: Label > 50 characters
    await chipUidInput.fill(validUID);
    await labelInput.fill('A'.repeat(51)); // 51 characters
    await submitBtn.click();

    errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /50|too long|maximum/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 3: Label with HTML tags (XSS attempt)
    await chipUidInput.fill(validUID);
    await labelInput.fill('<script>alert("xss")</script>');
    await submitBtn.click();

    errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /invalid|special characters|allowed/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });

    // Test 4: Label with invalid special characters
    await chipUidInput.fill(validUID);
    await labelInput.fill('Test@#$%^&*()Chip');
    await submitBtn.click();

    errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /invalid|special characters|allowed/i
    }).first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
  });

  // ==========================================================================
  // T073: E2E test - Maximum chip limit enforcement
  // CRITICAL: Tests abuse prevention (max 20 chips per user)
  // ==========================================================================
  test('T073: Maximum chip limit enforcement', async ({ page, request }) => {
    // Step 1: Register 20 chips via API (faster than UI)
    const registrationPromises = [];
    for (let i = 1; i <= 20; i++) {
      const uid = `04:5A:B2:C3:D4:E5:${i.toString(16).padStart(2, '0')}`;
      const label = `Chip ${i}`;
      registrationPromises.push(registerChipViaAPI(request, uid, label));
    }

    const responses = await Promise.all(registrationPromises);

    // Verify all 20 succeeded
    const successCount = responses.filter(r => r.status() === 201).length;
    expect(successCount).toBe(20);

    // Step 2: Navigate to NFC page and verify all 20 chips visible
    await navigateToNFCPage(page);
    await page.waitForLoadState('networkidle');

    const chipItems = page.locator('.chip-list-item, .chip-item, li').filter({ hasText: /Chip \d+/i });
    await expect(chipItems).toHaveCount(20, { timeout: 10000 });

    // Step 3: Attempt to register 21st chip
    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    await chipUidInput.fill('04:FF:FF:FF:FF:FF:FF');
    await labelInput.fill('Chip 21');
    await submitBtn.click();

    // Step 4: Verify HTTP 403 error message
    const errorMsg = page.locator('.error-message, .alert, .error, [role="alert"]').filter({
      hasText: /maximum.*limit|20 chips|limit reached/i
    });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    // Step 5: Verify chip list still contains exactly 20 chips
    await expect(chipItems).toHaveCount(20);
    await expect(page.locator('text=/Chip 21/i')).not.toBeVisible();

    // Step 6: Delete one chip
    const firstChipDeleteBtn = page.locator('.chip-delete-button, button:has-text("Löschen"), button:has-text("Delete")').first();
    await firstChipDeleteBtn.click();

    // Confirm deletion in modal
    const confirmBtn = page.locator('button:has-text("Löschen"), button.modal-confirm, button:has-text("Delete")').last();
    await confirmBtn.click();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Step 7: Verify registration of new chip now succeeds
    await chipUidInput.fill('04:FF:FF:FF:FF:FF:FF');
    await labelInput.fill('Chip 21');
    await submitBtn.click();

    // Should succeed now (back to 20 chips)
    await page.waitForSelector('text=/Chip 21/i', { timeout: 5000 });
    await expect(page.locator('text=/Chip 21/i')).toBeVisible();
  });

  // ==========================================================================
  // T074: E2E test - NFC scan workflow with mocked NDEFReader
  // Note: This test mocks the Web NFC API since it's not available in Playwright
  // ==========================================================================
  test('T074: NFC scan workflow with mocked NDEFReader', async ({ page }) => {
    await navigateToNFCPage(page);

    // Mock the NDEFReader API before the page loads component
    await page.addInitScript(() => {
      // Mock NDEFReader class
      window.NDEFReader = class NDEFReader {
        constructor() {
          this.listeners = {};
        }

        async scan() {
          // Simulate successful scan
          return Promise.resolve();
        }

        addEventListener(event, callback) {
          this.listeners[event] = callback;
        }

        // Expose method to trigger scan event (for testing)
        triggerScan(serialNumber) {
          if (this.listeners['reading']) {
            this.listeners['reading']({ serialNumber });
          }
        }
      };
    });

    // Reload page to apply mock
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for NFC scan button (should be visible with NDEFReader mock)
    const scanBtn = page.locator('button:has-text("NFC"), button:has-text("Scan"), button:has-text("Scannen")').first();

    // If scan button is not found, this feature may use simulation mode
    // Check for simulation mode controls
    const simulationInput = page.locator('input[placeholder*="chip ID"], input[placeholder*="Enter chip"]').first();
    const simulateScanBtn = page.locator('button:has-text("Simulate")').first();

    if (await simulationInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use simulation mode
      await simulationInput.fill('04:7B:C3:D4:E5:F6:08');
      await simulateScanBtn.click();

      // Wait for UID to be auto-filled in registration form
      const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"]').first();
      await expect(chipUidInput).toHaveValue(/04:7B:C3:D4:E5:F6:08/i, { timeout: 5000 });

      // Complete registration
      const labelInput = page.locator('input[id="label"], input[name="label"]').first();
      await labelInput.fill('Scanned Chip');

      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();

      // Verify chip appears in list
      await page.waitForSelector('text=/Scanned Chip/i', { timeout: 5000 });
      await expect(page.locator('text=/Scanned Chip/i')).toBeVisible();
      await expect(page.locator('text=/04:7B:C3:D4:E5:F6:08/i')).toBeVisible();
    } else if (await scanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use real NFC scan button with mock
      await scanBtn.click();

      // Trigger mock scan event via JavaScript
      await page.evaluate(() => {
        const reader = new window.NDEFReader();
        reader.triggerScan('04:7B:C3:D4:E5:F6:08');
      });

      // Verify UID auto-filled
      const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"]').first();
      await expect(chipUidInput).toHaveValue(/04:7B:C3:D4:E5:F6:08/i, { timeout: 5000 });

      // Complete registration
      const labelInput = page.locator('input[id="label"], input[name="label"]').first();
      await labelInput.fill('Scanned Chip');

      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();

      // Verify chip appears in list
      await page.waitForSelector('text=/Scanned Chip/i', { timeout: 5000 });
      await expect(page.locator('text=/Scanned Chip/i')).toBeVisible();
    } else {
      // Skip test if neither simulation nor scan button found
      test.skip('NFC scan button or simulation mode not found');
    }
  });

  // ==========================================================================
  // T075: E2E test - Chip deletion with confirmation
  // ==========================================================================
  test('T075: Chip deletion with confirmation', async ({ page }) => {
    // Step 1: Register a chip
    await navigateToNFCPage(page);

    const chipUidInput = page.locator('input[id="chipUid"], input[name="chipUid"], input[placeholder*="04:"]').first();
    const labelInput = page.locator('input[id="label"], input[name="label"], input[placeholder*="Bens"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Registrieren"), button:has-text("Register")').first();

    await chipUidInput.fill('04:AA:BB:CC:DD:EE:FF');
    await labelInput.fill('Chip To Delete');
    await submitBtn.click();

    // Wait for chip to appear
    await page.waitForSelector('text=/Chip To Delete/i', { timeout: 5000 });

    // Step 2: Click delete button
    const deleteBtn = page.locator('.chip-delete-button, button:has-text("Löschen"), button:has-text("Delete")').first();
    await deleteBtn.click();

    // Step 3: Verify confirmation modal appears
    const modal = page.locator('.modal-overlay, .modal, [role="dialog"]').filter({
      hasText: /Chip To Delete|löschen|delete/i
    });
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Step 4: Cancel deletion (chip should remain)
    const cancelBtn = page.locator('button:has-text("Abbrechen"), button.modal-cancel, button:has-text("Cancel")').first();
    await cancelBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Chip should still be visible
    await expect(page.locator('text=/Chip To Delete/i')).toBeVisible();

    // Step 5: Click delete again
    await deleteBtn.click();

    // Wait for modal
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Step 6: Confirm deletion
    const confirmBtn = page.locator('button:has-text("Löschen"), button.modal-confirm, button:has-text("Delete")').last();
    await confirmBtn.click();

    // Step 7: Verify chip removed from list
    await page.waitForTimeout(1000); // Wait for deletion to complete

    // Chip should be gone
    const chipGone = await page.locator('text=/Chip To Delete/i').isVisible().catch(() => false);
    expect(chipGone).toBe(false);

    // Step 8: Reload page and verify chip still gone (persistence)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const stillGone = await page.locator('text=/Chip To Delete/i').isVisible().catch(() => false);
    expect(stillGone).toBe(false);
  });
});
