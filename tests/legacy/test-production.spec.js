const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  try {
    console.log('🚀 Navigating to https://medio-react-app.fly.dev');
    await page.goto('https://medio-react-app.fly.dev');
    await page.waitForLoadState('networkidle');

    console.log('📸 Screenshot: Production Homepage');
    await page.screenshot({ path: 'prod-1-homepage.png' });

    // Try to register a new user first
    console.log('📝 Attempting to register...');
    const signupLink = await page.locator('text=/sign.*up|register|create.*account/i').first();

    if (await signupLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signupLink.click();
      await page.waitForTimeout(1000);

      console.log('📸 Screenshot: Registration form');
      await page.screenshot({ path: 'prod-2-register-form.png' });

      // Fill registration form
      const nameInput = await page.locator('input[name="name"], input#name').first();
      const emailInput = await page.locator('input[type="email"], input[name="email"], input#email').first();
      const passwordInputs = await page.locator('input[type="password"]').all();

      const testEmail = `test-prod-${Date.now()}@example.com`;

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Production Test User');
      }

      await emailInput.fill(testEmail);

      // Fill password and confirm password
      if (passwordInputs.length >= 1) {
        await passwordInputs[0].fill('TestPassword123!');
      }
      if (passwordInputs.length >= 2) {
        await passwordInputs[1].fill('TestPassword123!');
      }

      console.log('📸 Screenshot: Registration filled with', testEmail);
      await page.screenshot({ path: 'prod-3-register-filled.png' });

      const submitBtn = await page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(4000);

      console.log('📸 Screenshot: After registration');
      await page.screenshot({ path: 'prod-4-after-register.png' });
    }

    // Look for "Add Video" button
    console.log('🔍 Looking for Add Video button...');
    const addVideoBtn = await page.locator('text=/add.*video|new.*video|\\+/i').first();

    if (await addVideoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found Add Video button!');
      await addVideoBtn.click();
      await page.waitForTimeout(1500);

      console.log('📸 Screenshot: Add Video Modal opened');
      await page.screenshot({ path: 'prod-5-modal-opened.png' });

      // Fill in YouTube URL
      console.log('📝 Filling YouTube URL...');
      const urlInput = await page.locator('input[placeholder*="URL" i], input[id*="url" i], input[name*="url" i]').first();
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      console.log('⏳ Waiting for metadata to load (4 seconds)...');
      await page.waitForTimeout(4000);

      console.log('📸 Screenshot: After URL input with metadata');
      await page.screenshot({ path: 'prod-6-metadata-loaded.png' });

      // Check if title and description were auto-filled
      const titleInput = await page.locator('input[id*="title" i], input[name*="title" i]').first();
      const titleValue = await titleInput.inputValue().catch(() => '');

      if (titleValue) {
        console.log('✅ Title auto-filled:', titleValue);
      } else {
        console.log('⚠️  Title not auto-filled');
      }

      // Select age rating
      console.log('🔞 Selecting age rating...');
      const ageSelect = await page.locator('select[id*="age" i], select[name*="age" i]').first();
      await ageSelect.selectOption('G');

      console.log('📸 Screenshot: Before submit');
      await page.screenshot({ path: 'prod-7-before-submit.png' });

      // Click submit
      console.log('➕ Clicking Add Video submit button...');
      const submitVideoBtn = await page.locator('button:has-text("Add Video")').first();
      await submitVideoBtn.click();

      console.log('⏳ Waiting for submission (4 seconds)...');
      await page.waitForTimeout(4000);

      console.log('📸 Screenshot: After submit');
      await page.screenshot({ path: 'prod-8-after-submit.png' });

      // Check for messages
      const successMsg = await page.locator('text=/success|added|created/i').first().textContent().catch(() => null);
      const errorMsg = await page.locator('[role="alert"], .error-message, text=/error/i').first().textContent().catch(() => null);

      if (successMsg) {
        console.log('✅ SUCCESS: Video added!', successMsg);
      } else if (errorMsg) {
        console.log('❌ ERROR:', errorMsg);
      } else {
        console.log('⚠️  No clear success/error message. Check screenshots.');
      }

    } else {
      console.log('❌ Add Video button not found');
      console.log('Current URL:', page.url());
    }

  } catch (error) {
    console.error('❌ Production test error:', error.message);
    await page.screenshot({ path: 'prod-error.png' });
  } finally {
    console.log('\n📸 Screenshots saved with "prod-" prefix');
    console.log('⏳ Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    await browser.close();
    console.log('✅ Production test completed!');
  }
})();
