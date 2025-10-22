const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `prod-test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = `Prod Test ${timestamp}`;

  console.log('\n🚀 Testing Production Deployment...\n');

  try {
    // Step 1: Register on production
    console.log('Step 1: Registering on https://medio-react-app.fly.dev/register...');
    await page.goto('https://medio-react-app.fly.dev/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    console.log('Step 2: Submitting registration...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`✓ Registration complete. Current URL: ${currentUrl}`);

    // Step 3: Navigate to Videos page
    console.log('\nStep 3: Navigating to Videos page...');
    await page.goto('https://medio-react-app.fly.dev/videos');
    await page.waitForLoadState('networkidle');

    // Check for errors in the page
    const pageContent = await page.content();

    if (pageContent.includes('Cannot GET /api/api')) {
      console.error('❌ FAILED: Double /api prefix issue still present!');
      throw new Error('Double /api prefix detected');
    } else {
      console.log('✓ No double /api prefix errors');
    }

    if (pageContent.includes('platform_id does not exist')) {
      console.error('❌ FAILED: platform_id error still present!');
      throw new Error('platform_id error detected');
    } else {
      console.log('✓ No platform_id errors');
    }

    if (pageContent.includes('404')) {
      console.error('❌ FAILED: 404 error detected!');
      throw new Error('404 error on videos page');
    } else {
      console.log('✓ No 404 errors');
    }

    console.log('\n✅ PRODUCTION TEST PASSED!');
    console.log('✅ Videos page loads successfully on production!');
    console.log('✅ Both fixes deployed and working!\n');

  } catch (error) {
    console.error('\n❌ PRODUCTION TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
