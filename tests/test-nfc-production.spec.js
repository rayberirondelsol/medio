const { test, expect } = require('@playwright/test');

test('NFC Chip Registration - Production E2E Test', async ({ page }) => {
  const timestamp = Date.now();
  const testEmail = `test+nfc${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const chipUid = `04:5A:B2:C3:D4:E5:${timestamp.toString(16).slice(-2).toUpperCase()}`;
  const chipLabel = `Test Chip ${timestamp}`;

  console.log('\n=== NFC CHIP REGISTRATION E2E TEST ===');
  console.log(`Test User: ${testEmail}`);
  console.log(`Chip UID: ${chipUid}`);
  console.log(`Chip Label: ${chipLabel}`);

  // Step 1: Register new user
  console.log('\n1. Registering new user...');
  await page.goto('https://medio-react-app.fly.dev/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);

  await page.click('button[type="submit"]');
  await page.waitForURL('**/videos', { timeout: 10000 });
  console.log('✓ Registration successful');

  // Step 2: Navigate to NFC Chips page
  console.log('\n2. Navigating to NFC Chips page...');
  // Look for link/button to NFC page
  const nfcLink = page.locator('a:has-text("NFC"), a:has-text("Chips")').first();

  if (await nfcLink.count() > 0) {
    await nfcLink.click();
  } else {
    // Try direct navigation
    await page.goto('https://medio-react-app.fly.dev/nfc-chips');
  }

  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `nfc-test-1-page-loaded.png` });
  console.log('✓ NFC Chips page loaded');

  // Step 3: Fill chip registration form
  console.log('\n3. Filling chip registration form...');

  // Wait for form to be visible
  await page.waitForSelector('input[name="chip_uid"], input#chip_uid, input[placeholder*="Chip"]', { timeout: 5000 });

  // Fill chip UID
  const chipUidInput = page.locator('input[name="chip_uid"], input#chip_uid, input[placeholder*="Chip"]').first();
  await chipUidInput.fill(chipUid);

  // Fill label
  const labelInput = page.locator('input[name="label"], input#label, input[placeholder*="Name"], input[placeholder*="Label"]').first();
  await labelInput.fill(chipLabel);

  await page.screenshot({ path: `nfc-test-2-form-filled.png` });
  console.log('✓ Form filled');

  // Step 4: Submit form
  console.log('\n4. Submitting chip registration...');

  // Listen for network request
  const registerPromise = page.waitForResponse(
    response => response.url().includes('/api/nfc/chips') && response.request().method() === 'POST',
    { timeout: 10000 }
  );

  const submitButton = page.locator('button[type="submit"]:has-text("Register"), button:has-text("Add"), button:has-text("Speichern")').first();
  await submitButton.click();

  const response = await registerPromise;
  const status = response.status();

  console.log(`Response status: ${status}`);

  if (status === 201) {
    console.log('✓ Chip registered successfully (201 Created)');
  } else if (status === 403) {
    const body = await response.json().catch(() => ({}));
    console.error('✗ FAILED: 403 Forbidden');
    console.error('Response body:', JSON.stringify(body, null, 2));
    throw new Error(`Chip registration failed with 403: ${JSON.stringify(body)}`);
  } else {
    console.error(`✗ FAILED: Unexpected status ${status}`);
    throw new Error(`Unexpected response status: ${status}`);
  }

  // Step 5: Verify chip appears in list
  console.log('\n5. Verifying chip appears in list...');
  await page.waitForTimeout(2000); // Wait for list to refresh

  const chipInList = page.locator(`text=${chipLabel}`);
  await expect(chipInList).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `nfc-test-3-chip-in-list.png` });
  console.log('✓ Chip appears in list');

  // Step 6: Verify persistence (reload page)
  console.log('\n6. Verifying persistence after reload...');
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(chipInList).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `nfc-test-4-persisted.png` });
  console.log('✓ Chip persisted after reload');

  console.log('\n=== TEST COMPLETE ===\n');
  console.log('✅ NFC Chip Registration works in production!');
});
