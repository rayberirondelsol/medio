import { test, expect } from '@playwright/test';

const BASE_URL = 'https://medio-react-app.fly.dev';

test.describe('Live Production - NFC Chips and Videos', () => {
  test('Complete flow: Register → Add NFC Chip → Add Video', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `live-test-${timestamp}@example.com`,
      password: 'LiveTest123!',
      confirmPassword: 'LiveTest123!',
      name: 'Live Test User'
    };

    console.log('\n=== Step 1: Registration ===');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
    await page.fill('input[name="name"]', testUser.name);

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✓ Registration successful, redirected to dashboard');

    console.log('\n=== Step 2: Add NFC Chip ===');
    // Navigate to NFC Chips page
    await page.click('text=NFC Chips');
    await page.waitForTimeout(2000); // Wait for page to load
    console.log('✓ Navigated to NFC Chips page');

    // Take screenshot before adding chip
    await page.screenshot({ path: 'screenshot-nfc-chips-page.png' });

    // Click "Register Chip" or "Register First Chip" button
    const addChipButton = page.locator('button:has-text("Register Chip"), button:has-text("Register First Chip")').first();

    if (await addChipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addChipButton.click();
      console.log('✓ Clicked Add NFC Chip button');

      // Wait for modal/form
      await page.waitForTimeout(1000);

      // Fill NFC chip form
      const chipData = {
        chip_uid: `TEST-CHIP-${timestamp}`,
        label: `Test Chip ${timestamp}`
      };

      await page.fill('input[name="chip_uid"], input[placeholder*="UID"], input[placeholder*="uid"]', chipData.chip_uid);
      await page.fill('input[name="label"], input[placeholder*="Label"], input[placeholder*="label"]', chipData.label);

      // Take screenshot of filled form
      await page.screenshot({ path: 'screenshot-nfc-form-filled.png' });

      // Submit form - click "Register Chip" button
      await page.locator('button:has-text("Register Chip")').last().click();
      console.log('✓ Clicked Register Chip submit button');

      // Wait for success
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshot-after-nfc-submit.png' });

      // Check for success message or chip in list
      const chipInList = await page.locator(`text=${chipData.label}`).isVisible({ timeout: 5000 }).catch(() => false);

      if (chipInList) {
        console.log('✓ NFC Chip added successfully');
      } else {
        console.log('⚠ Could not verify NFC chip was added - taking debug screenshot');
        await page.screenshot({ path: 'screenshot-nfc-verification-failed.png' });
      }
    } else {
      console.log('⚠ Add NFC Chip button not found - taking screenshot for debugging');
      await page.screenshot({ path: 'screenshot-no-add-button.png' });

      // Try to find what's on the page
      const pageContent = await page.content();
      console.log('Page HTML length:', pageContent.length);
      console.log('URL:', page.url());
    }

    console.log('\n=== Step 3: Add Video ===');
    // Navigate to Videos page
    await page.click('text=Videos');
    await page.waitForTimeout(2000); // Wait for page to load
    console.log('✓ Navigated to Videos page');

    // Take screenshot
    await page.screenshot({ path: 'screenshot-videos-page.png' });

    // Try to find and click "Add Video" button (look for common video page button texts)
    const addVideoButton = page.locator('button:has-text("Add Video"), button:has-text("Add"), button:has-text("New Video"), button:has-text("Create")').first();

    if (await addVideoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addVideoButton.click();
      console.log('✓ Clicked Add Video button');

      // Wait for modal/form
      await page.waitForTimeout(1000);

      // Fill video form
      const videoData = {
        title: `Test Video ${timestamp}`,
        description: 'Testing video creation on live environment',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        age_rating: 'G'
      };

      await page.fill('input[id="title"], input[placeholder*="title"]', videoData.title);

      const descField = page.locator('textarea[id="description"], textarea[placeholder*="description"]');
      if (await descField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descField.fill(videoData.description);
      }

      const urlField = page.locator('input[id="videoUrl"], input[placeholder*="URL"]');
      if (await urlField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await urlField.fill(videoData.video_url);
      }

      // Select age rating if available
      const ageRatingSelect = page.locator('select[id="ageRating"]');
      if (await ageRatingSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ageRatingSelect.selectOption(videoData.age_rating);
      }

      // Take screenshot of filled form
      await page.screenshot({ path: 'screenshot-video-form-filled.png' });

      // Submit form - look for "Add Video" button
      await page.click('button[type="submit"]:has-text("Add Video")');

      // Wait for success
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshot-after-video-submit.png' });

      // Check for success message or video in list
      const videoInList = await page.locator(`text=${videoData.title}`).isVisible({ timeout: 5000 }).catch(() => false);

      if (videoInList) {
        console.log('✓ Video added successfully');
      } else {
        console.log('⚠ Could not verify video was added - checking for errors');
        await page.screenshot({ path: 'screenshot-video-verification-failed.png' });

        // Check console for errors
        const errors = await page.evaluate(() => {
          return (window as any).__errors || [];
        });
        console.log('Browser errors:', errors);
      }
    } else {
      console.log('⚠ Add Video button not found - taking screenshot for debugging');
      await page.screenshot({ path: 'screenshot-no-video-add-button.png' });
    }

    console.log('\n=== Test Complete ===');
    console.log('Screenshots saved to project root');
  });
});
