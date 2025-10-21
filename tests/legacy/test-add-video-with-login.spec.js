const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    console.log('🚀 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('📸 Screenshot: Homepage/Login');
    await page.screenshot({ path: '1-homepage.png' });

    // Try to register a new user
    console.log('📝 Attempting to register a new test user...');
    const registerLink = await page.locator('text=/sign.*up|register|create.*account/i').first();

    if (await registerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await registerLink.click();
      await page.waitForTimeout(1000);

      // Fill registration form
      await page.fill('input[type="email"], input[name="email"], input#email', 'testuser@medio.com');
      await page.fill('input[type="password"], input[name="password"], input#password', 'TestPass1234');
      await page.fill('input[name="name"], input#name', 'Test User');

      await page.screenshot({ path: '2-register-form.png' });

      const submitBtn = await page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(3000);
    } else {
      // Try to login instead
      console.log('📝 Logging in with existing credentials...');
      await page.fill('input[type="email"], input[name="email"], input#email', 'testuser@medio.com');
      await page.fill('input[type="password"], input[name="password"], input#password', 'TestPass1234');

      await page.screenshot({ path: '2-login-form.png' });

      const loginBtn = await page.locator('button[type="submit"]').first();
      await loginBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log('📸 Screenshot: After login');
    await page.screenshot({ path: '3-after-login.png' });

    // Look for "Add Video" button
    console.log('🔍 Looking for Add Video button...');
    const addVideoBtn = await page.locator('text=/add.*video|new.*video|\+/i').first();

    if (await addVideoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found Add Video button!');
      await addVideoBtn.click();
      await page.waitForTimeout(1500);

      console.log('📸 Screenshot: Add Video Modal');
      await page.screenshot({ path: '4-add-video-modal.png' });

      // Fill in YouTube URL
      console.log('📝 Filling YouTube URL...');
      const urlInput = await page.locator('input[placeholder*="URL" i], input[id*="url" i], input[name*="url" i]').first();
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      console.log('⏳ Waiting for metadata to load (3 seconds)...');
      await page.waitForTimeout(3000);

      console.log('📸 Screenshot: After URL input');
      await page.screenshot({ path: '5-after-url-input.png' });

      // Select age rating
      console.log('🔞 Selecting age rating...');
      const ageSelect = await page.locator('select[id*="age" i], select[name*="age" i], select:has-text("age")').first();
      await ageSelect.selectOption('G');

      console.log('📸 Screenshot: Before submit');
      await page.screenshot({ path: '6-before-submit.png' });

      // Click submit
      console.log('➕ Clicking Add Video submit button...');
      const submitVideoBtn = await page.locator('button:has-text("Add Video")').first();
      await submitVideoBtn.click();

      console.log('⏳ Waiting for submission (3 seconds)...');
      await page.waitForTimeout(3000);

      console.log('📸 Screenshot: After submit');
      await page.screenshot({ path: '7-after-submit.png' });

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
      console.log('❌ Add Video button not found after login');
      console.log('Current URL:', page.url());
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    console.log('\n📸 Screenshots saved in current directory');
    console.log('⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('✅ Test completed!');
  }
})();
