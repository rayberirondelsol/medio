const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('🚀 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('📸 Taking screenshot of homepage');
    await page.screenshot({ path: 'homepage.png' });

    // Wait for page to load and look for the Add Video button/modal trigger
    console.log('🔍 Looking for Add Video button/modal...');

    // Try to find "Add Video" button or similar
    const addVideoButton = await page.locator('text=/add.*video/i').first();

    if (await addVideoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found Add Video button, clicking...');
      await addVideoButton.click();
      await page.waitForTimeout(1000);

      console.log('📝 Filling YouTube URL...');
      const urlInput = await page.locator('input[placeholder*="URL"], input[id*="url"], input[name*="url"]').first();
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await page.waitForTimeout(2000); // Wait for metadata fetch

      console.log('🎬 Taking screenshot after URL input');
      await page.screenshot({ path: 'after-url-input.png' });

      // Select age rating
      console.log('🔞 Selecting age rating...');
      const ageRatingSelect = await page.locator('select[id*="age"], select[name*="age"]').first();
      await ageRatingSelect.selectOption('G');

      // Click "Add Video" submit button
      console.log('➕ Clicking Add Video submit button...');
      const submitButton = await page.locator('button:has-text("Add Video")').first();
      await submitButton.click();

      await page.waitForTimeout(3000);

      console.log('📸 Taking final screenshot');
      await page.screenshot({ path: 'after-submit.png' });

      // Check for success/error messages
      const successMessage = await page.locator('text=/success|added|created/i').first().textContent().catch(() => null);
      const errorMessage = await page.locator('[role="alert"], .error-message').first().textContent().catch(() => null);

      if (successMessage) {
        console.log('✅ SUCCESS: Video was added!', successMessage);
      } else if (errorMessage) {
        console.log('❌ ERROR:', errorMessage);
      } else {
        console.log('⚠️  No clear success/error message found. Check screenshots.');
      }

    } else {
      console.log('❌ Add Video button not found on page');
      console.log('Page content:', await page.content());
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    console.log('\n📸 Screenshots saved: homepage.png, after-url-input.png, after-submit.png');
    console.log('⏳ Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
