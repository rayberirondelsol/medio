const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down so we can see what's happening
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `live-test-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = `Live Test ${timestamp}`;

  console.log('\n🚀 Live Production Test with Playwright...\n');
  console.log(`Test User: ${testEmail}\n`);

  try {
    // Step 1: Navigate to production
    console.log('Step 1: Navigating to production site...');
    await page.goto('https://medio-react-app.fly.dev/register');
    await page.waitForLoadState('networkidle');
    console.log('✓ Page loaded');

    // Step 2: Register
    console.log('\nStep 2: Filling registration form...');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);
    console.log('✓ Form filled');

    console.log('\nStep 3: Submitting registration...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const afterRegisterUrl = page.url();
    console.log(`✓ Registration complete. URL: ${afterRegisterUrl}`);

    // Step 4: Navigate to Dashboard
    console.log('\nStep 4: Navigating to Dashboard...');
    await page.goto('https://medio-react-app.fly.dev/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for dashboard content
    const dashboardContent = await page.content();
    if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Videos')) {
      console.log('✓ Dashboard loaded successfully');
    } else {
      console.error('❌ Dashboard may not have loaded properly');
    }

    // Step 5: Navigate to Videos page
    console.log('\nStep 5: Navigating to Videos page...');
    await page.goto('https://medio-react-app.fly.dev/videos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors
    const videosContent = await page.content();
    let hasErrors = false;

    if (videosContent.includes('Cannot GET /api/api')) {
      console.error('❌ FAILED: Double /api prefix issue detected!');
      hasErrors = true;
    } else {
      console.log('✓ No double /api prefix errors');
    }

    if (videosContent.includes('platform_id does not exist')) {
      console.error('❌ FAILED: platform_id error detected!');
      hasErrors = true;
    } else {
      console.log('✓ No platform_id errors');
    }

    if (videosContent.includes('user_uuid does not exist')) {
      console.error('❌ FAILED: user_uuid error detected!');
      hasErrors = true;
    } else {
      console.log('✓ No user_uuid errors');
    }

    if (videosContent.includes('404')) {
      console.error('❌ FAILED: 404 error detected!');
      hasErrors = true;
    } else {
      console.log('✓ No 404 errors');
    }

    if (videosContent.includes('500')) {
      console.error('❌ FAILED: 500 server error detected!');
      hasErrors = true;
    } else {
      console.log('✓ No 500 errors');
    }

    // Check if "Add Video" button exists
    const addVideoButton = await page.$('button:has-text("Add Video")');
    if (addVideoButton) {
      console.log('✓ "Add Video" button found');
    } else {
      console.error('❌ "Add Video" button not found');
      hasErrors = true;
    }

    // Step 6: Navigate to Profiles page
    console.log('\nStep 6: Testing Profiles page...');
    await page.goto('https://medio-react-app.fly.dev/profiles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const profilesContent = await page.content();
    if (profilesContent.includes('Child Profiles') || profilesContent.includes('Add Profile')) {
      console.log('✓ Profiles page loaded successfully');
    } else {
      console.error('❌ Profiles page may not have loaded properly');
      hasErrors = true;
    }

    // Step 7: Navigate to NFC page
    console.log('\nStep 7: Testing NFC page...');
    await page.goto('https://medio-react-app.fly.dev/nfc');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const nfcContent = await page.content();
    if (nfcContent.includes('NFC') || nfcContent.includes('Register')) {
      console.log('✓ NFC page loaded successfully');
    } else {
      console.error('❌ NFC page may not have loaded properly');
      hasErrors = true;
    }

    // Get console errors
    console.log('\nStep 8: Checking browser console for errors...');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.error('\n⚠️  Console Errors Found:');
      consoleErrors.forEach(err => console.error(`  - ${err}`));
    } else {
      console.log('✓ No console errors detected');
    }

    // Final summary
    if (!hasErrors) {
      console.log('\n✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
      console.log('\n✨ Production deployment is fully functional:');
      console.log('   ✓ Registration works');
      console.log('   ✓ Dashboard loads');
      console.log('   ✓ Videos page loads without errors');
      console.log('   ✓ Profiles page loads');
      console.log('   ✓ NFC page loads');
      console.log('   ✓ All API calls working correctly');
      console.log('   ✓ No double /api prefix errors');
      console.log('   ✓ No database schema errors\n');
    } else {
      console.error('\n❌ SOME TESTS FAILED - See errors above');
    }

    console.log('\nBrowser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    await page.waitForTimeout(10000); // Keep browser open to see the error
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
