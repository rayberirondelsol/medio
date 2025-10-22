const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`>> ${request.method()} ${request.url()}`);
      const headers = request.headers();
      if (headers['x-csrf-token']) {
        console.log(`   X-CSRF-Token: ${headers['x-csrf-token']}`);
      }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/csrf-token')) {
      const body = await response.text();
      console.log(`<< GET /api/csrf-token`);
      console.log(`   Response: ${body}`);
      const cookies = await context.cookies();
      const csrfCookie = cookies.find(c => c.name === '_csrf');
      console.log(`   Cookie _csrf: ${csrfCookie ? csrfCookie.value : 'NOT SET'}`);
    }
  });

  await page.goto('http://localhost:8080/register');
  await page.waitForTimeout(2000);

  // Register
  await page.fill('input[name="email"]', 'csrf-test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.fill('input[name="name"]', 'CSRF Test User');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  await page.goto('http://localhost:8080/nfc');
  await page.waitForTimeout(2000);

  // Click register chip button
  await page.click('button:has-text("Register Chip")');
  await page.waitForTimeout(1000);

  // Fill form
  await page.fill('input[name="chip_uid"]', '04:E5:FC:7E:0C:B6:1E');
  await page.fill('input[name="label"]', 'Debug Test Chip');

  console.log('\n=== About to submit chip registration ===');
  await page.click('button[type="submit"]:has-text("Register Chip")');

  await page.waitForTimeout(5000);
  await browser.close();
})();
