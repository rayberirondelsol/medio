const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `detailed-test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = `Detailed Test ${timestamp}`;

  console.log('\n🔍 Detailed Registration Flow Test...\n');
  console.log(`Test User: ${testEmail}\n`);

  // Listen to all network requests
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`\n📡 API Response: ${response.status()} ${url}`);
      if (url.includes('/auth/register') || url.includes('/auth/login')) {
        const headers = response.headers();
        console.log('   Headers:', JSON.stringify(headers, null, 2));
        try {
          const body = await response.json();
          console.log('   Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('   Body: (not JSON)');
        }
      }
    }
  });

  // Listen to console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || text.includes('401') || text.includes('error')) {
      console.log(`\n🔴 Browser Console [${type}]: ${text}`);
    }
  });

  try {
    // Step 1: Navigate to register page
    console.log('Step 1: Navigating to registration page...');
    await page.goto('https://medio-react-app.fly.dev/register');
    await page.waitForLoadState('networkidle');
    console.log('✓ Registration page loaded');

    // Check cookies before registration
    const cookiesBefore = await context.cookies();
    console.log('\n🍪 Cookies BEFORE registration:', cookiesBefore.length === 0 ? 'None' : JSON.stringify(cookiesBefore, null, 2));

    // Step 2: Fill and submit registration form
    console.log('\nStep 2: Filling registration form...');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    console.log('\nStep 3: Submitting registration...');

    // Wait for the response from registration
    const registrationResponse = page.waitForResponse(response =>
      response.url().includes('/api/auth/register') && response.status() !== 0
    );

    await page.click('button[type="submit"]');

    const regResp = await registrationResponse;
    console.log(`\n✓ Registration response received: ${regResp.status()}`);

    await page.waitForTimeout(3000);

    // Check cookies after registration
    const cookiesAfter = await context.cookies();
    console.log('\n🍪 Cookies AFTER registration:');
    if (cookiesAfter.length === 0) {
      console.log('   ❌ NO COOKIES SET!');
    } else {
      cookiesAfter.forEach(cookie => {
        console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain}, httpOnly: ${cookie.httpOnly})`);
      });
    }

    const currentUrl = page.url();
    console.log(`\n📍 Current URL after registration: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Successfully redirected to dashboard');
    } else if (currentUrl.includes('/register')) {
      console.log('❌ Still on registration page - redirect did not happen');
    } else {
      console.log(`⚠️  Unexpected URL: ${currentUrl}`);
    }

    // Step 4: Try to access dashboard manually
    console.log('\nStep 4: Manually navigating to dashboard...');
    await page.goto('https://medio-react-app.fly.dev/dashboard');
    await page.waitForTimeout(3000);

    const dashboardUrl = page.url();
    console.log(`📍 URL after dashboard navigation: ${dashboardUrl}`);

    if (dashboardUrl.includes('/login')) {
      console.log('❌ Redirected to login - authentication failed!');
    } else if (dashboardUrl.includes('/dashboard')) {
      console.log('✓ Successfully accessed dashboard');

      // Check if dashboard content loaded
      const content = await page.content();
      if (content.includes('Videos') && content.includes('Child Profiles')) {
        console.log('✓ Dashboard content loaded successfully');
      } else {
        console.log('⚠️  Dashboard page loaded but content may be missing');
      }
    }

    // Step 5: Try to fetch videos
    console.log('\nStep 5: Testing Videos API...');
    await page.goto('https://medio-react-app.fly.dev/videos');
    await page.waitForTimeout(3000);

    const videosUrl = page.url();
    console.log(`📍 URL after videos navigation: ${videosUrl}`);

    console.log('\nTest complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
  }
})();
