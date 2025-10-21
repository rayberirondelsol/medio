import { test, expect } from '@playwright/test';

test.describe('Production Verification - Feature 006', () => {
  const timestamp = Date.now();
  const testEmail = `prod-verify-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = `Prod User ${timestamp}`;

  test('T071: Register user and verify dashboard access in production', async ({ page }) => {
    console.log('\n========================================');
    console.log('PRODUCTION VERIFICATION TEST');
    console.log('========================================');
    console.log(`Frontend URL: https://medio-react-app.fly.dev`);
    console.log(`Backend URL: https://medio-backend.fly.dev`);
    console.log(`Test User: ${testEmail}`);
    console.log('========================================\n');

    // Step 1: Navigate to production frontend
    console.log('[STEP 1] Navigating to production frontend...');
    await page.goto('https://medio-react-app.fly.dev/register');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✓ Page loaded');

    // Step 2: Fill registration form
    console.log('\n[STEP 2] Filling registration form...');
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    console.log('✓ Form filled');

    // Step 3: Submit registration
    console.log('\n[STEP 3] Submitting registration...');
    const registerButton = page.locator('button:has-text("Register"), button[type="submit"]');
    await registerButton.click();

    // Wait for redirect to dashboard or login success
    console.log('Waiting for authentication...');
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });

    const currentURL = page.url();
    console.log(`✓ Redirected to: ${currentURL}`);

    // Step 4: Verify dashboard access
    console.log('\n[STEP 4] Verifying dashboard access...');

    // If redirected to login, log in
    if (currentURL.includes('/login')) {
      console.log('Redirected to login, logging in...');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      console.log('✓ Logged in successfully');
    }

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    console.log('✓ Dashboard URL confirmed');

    // Verify dashboard content loads
    const dashboardHeading = page.locator('h1, h2').filter({ hasText: /Dashboard|Welcome/i });
    await expect(dashboardHeading).toBeVisible({ timeout: 5000 });
    console.log('✓ Dashboard content visible');

    // Step 5: Verify cookie authentication
    console.log('\n[STEP 5] Verifying cookie authentication...');
    const cookies = await page.context().cookies();

    const authCookie = cookies.find(c => c.name === 'authToken' || c.name === 'token');
    const csrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');

    console.log(`Cookies found: ${cookies.length}`);
    console.log(`Auth cookie: ${authCookie ? '✓ PRESENT' : '✗ MISSING'}`);
    console.log(`CSRF cookie: ${csrfCookie ? '✓ PRESENT' : '✗ MISSING'}`);

    if (authCookie) {
      console.log(`  - Name: ${authCookie.name}`);
      console.log(`  - Domain: ${authCookie.domain}`);
      console.log(`  - Path: ${authCookie.path}`);
      console.log(`  - Secure: ${authCookie.secure}`);
      console.log(`  - HttpOnly: ${authCookie.httpOnly}`);
      console.log(`  - SameSite: ${authCookie.sameSite}`);
    }

    expect(authCookie).toBeTruthy();
    expect(authCookie?.domain).toContain('medio-react-app.fly.dev');
    expect(authCookie?.httpOnly).toBe(true);
    console.log('✓ Cookie authentication verified');

    // Step 6: Verify navigation works (test proxy routing)
    console.log('\n[STEP 6] Verifying proxy routing works...');
    await page.click('a[href="/videos"], nav a:has-text("Videos")');
    await page.waitForURL(/\/videos/, { timeout: 5000 });
    console.log('✓ Videos page navigation successful');

    await page.click('a[href="/dashboard"], nav a:has-text("Dashboard")');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    console.log('✓ Dashboard navigation successful');

    // Step 7: Final verification
    console.log('\n========================================');
    console.log('PRODUCTION VERIFICATION COMPLETE');
    console.log('========================================');
    console.log('✅ User registration: PASSED');
    console.log('✅ Dashboard access: PASSED');
    console.log('✅ Cookie authentication: PASSED');
    console.log('✅ Proxy routing: PASSED');
    console.log('✅ BFF pattern: WORKING');
    console.log('========================================');
    console.log(`\nTest user created: ${testEmail}`);
    console.log('NOTE: This user remains in production database');
    console.log('========================================\n');
  });
});
