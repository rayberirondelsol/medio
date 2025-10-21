const { test, expect } = require('@playwright/test');

test('Complete video creation workflow - verify video appears in library', async ({ page }) => {
  const timestamp = Date.now();
  const testEmail = `test+final${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const videoTitle = `Test Video Final ${timestamp}`;
  const videoDescription = 'Final E2E test for video creation workflow';

  console.log('\n=== FINAL VIDEO CREATION E2E TEST ===');
  console.log(`Test User: ${testEmail}`);
  console.log(`Video Title: ${videoTitle}`);

  // Step 1: Register new user
  console.log('\n1. Registering new user...');
  await page.goto('https://medio-react-app.fly.dev/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  await page.screenshot({ path: `final-1-register-form.png` });

  await page.click('button[type="submit"]');
  await page.waitForURL('**/videos', { timeout: 10000 });
  console.log('✓ Registration successful, redirected to videos page');

  // Step 2: Verify Videos page loaded
  console.log('\n2. Verifying Videos page...');
  await page.waitForSelector('h1:has-text("Video Library")', { timeout: 5000 });
  await page.screenshot({ path: `final-2-videos-page.png` });
  console.log('✓ Videos page loaded');

  // Step 3: Open Add Video modal
  console.log('\n3. Opening Add Video modal...');
  const addButton = page.locator('button:has-text("Add Video")');
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();

  await page.waitForSelector('h2:has-text("Add Video")', { timeout: 5000 });
  await page.screenshot({ path: `final-3-modal-opened.png` });
  console.log('✓ Modal opened');

  // Step 4: Fill out the form
  console.log('\n4. Filling out video form...');
  await page.fill('input#videoUrl', videoUrl);
  await page.fill('input#title', videoTitle);
  await page.fill('textarea#description', videoDescription);
  await page.selectOption('select#ageRating', 'G');
  await page.screenshot({ path: `final-4-form-filled.png` });
  console.log('✓ Form filled');

  // Step 5: Submit the form
  console.log('\n5. Submitting form...');
  const submitButton = page.locator('button[type="submit"]:has-text("Add Video")');
  await submitButton.click();

  // Wait for modal to close (indicates success)
  await page.waitForSelector('h2:has-text("Add Video")', { state: 'hidden', timeout: 10000 });
  console.log('✓ Form submitted, modal closed');

  // Step 6: Verify video appears in library
  console.log('\n6. Verifying video appears in Video Library...');
  await page.waitForTimeout(2000); // Give time for video list to refresh

  await page.screenshot({ path: `final-5-after-submit.png` });

  // Look for the video title in the library
  const videoCard = page.locator(`.video-card:has-text("${videoTitle}")`);
  const videoInList = await videoCard.count();

  if (videoInList > 0) {
    console.log('✓ SUCCESS: Video found in library!');
    await page.screenshot({ path: `final-6-video-in-library.png` });

    // Verify details
    const hasTitle = await page.locator(`text=${videoTitle}`).isVisible();
    console.log(`  - Title visible: ${hasTitle}`);

    // Check if there's a thumbnail or description
    const hasDescription = await page.locator(`text=${videoDescription}`).isVisible();
    console.log(`  - Description visible: ${hasDescription}`);
  } else {
    console.log('✗ FAIL: Video NOT found in library');
    console.log('  Checking what is visible on page...');

    // Debug: Check what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`  Page contains: ${bodyText.substring(0, 500)}...`);

    throw new Error('Video was not added to the library');
  }

  console.log('\n=== TEST COMPLETE ===\n');
});
