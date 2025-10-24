import { test, expect } from '@playwright/test';

const BASE_URL = 'https://medio-react-app.fly.dev';

test.describe('Live Production - Video Creation', () => {
  test('Complete video creation workflow', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `live-test-${timestamp}@example.com`,
      password: 'LiveTest123!',
      name: 'Live Test User'
    };

    console.log('\n🧪 Testing LIVE Production Video Creation');
    console.log(`📧 User: ${testUser.email}`);

    // Step 1: Register
    console.log('\n[1/6] Registering user...');
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|videos)/, { timeout: 15000 });
    console.log('✅ User registered and logged in');

    // Step 2: Navigate to Videos page
    console.log('\n[2/6] Navigating to Videos page...');
    await page.goto(`${BASE_URL}/videos`);
    await page.waitForSelector('.page-header', { timeout: 10000 });
    console.log('✅ Videos page loaded');

    // Step 3: Open Add Video modal
    console.log('\n[3/6] Opening Add Video modal...');
    await page.click('button:has-text("Add Video")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ Modal opened');

    // Step 4: Fill video form
    console.log('\n[4/6] Filling video form...');
    const videoData = {
      title: `Peppa Wutz - Live Test ${timestamp}`,
      description: 'Testing video creation in production',
      thumbnail_url: 'https://i.ytimg.com/vi/pN49ZPeO4tk/default.jpg',
      platform_video_id: `live-test-${timestamp}`,
      video_url: `https://www.youtube.com/watch?v=test${timestamp}`,
      duration_seconds: '180',
      age_rating: 'G',
      channel_name: 'Test Channel'
    };

    await page.fill('input[name="title"]', videoData.title);
    await page.fill('textarea[name="description"]', videoData.description);
    await page.fill('input[name="thumbnail_url"]', videoData.thumbnail_url);
    
    // Select YouTube platform
    const platformSelect = page.locator('select[name="platform_id"]');
    await platformSelect.selectOption({ label: 'YouTube' });
    
    await page.fill('input[name="platform_video_id"]', videoData.platform_video_id);
    await page.fill('input[name="video_url"]', videoData.video_url);
    await page.fill('input[name="duration_seconds"]', videoData.duration_seconds);
    await page.selectOption('select[name="age_rating"]', videoData.age_rating);
    
    const channelInput = page.locator('input[name="channel_name"]');
    if (await channelInput.count() > 0) {
      await channelInput.fill(videoData.channel_name);
    }
    
    console.log('✅ Form filled');

    // Step 5: Submit form and wait for success
    console.log('\n[5/6] Submitting form...');
    
    // Listen for network response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/videos') && response.request().method() === 'POST',
      { timeout: 10000 }
    );
    
    await page.click('button[type="submit"]:has-text("Add Video")');
    
    const response = await responsePromise;
    const status = response.status();
    
    console.log(`Response status: ${status}`);
    
    if (status !== 201) {
      const body = await response.text();
      console.log(`❌ Error response: ${body}`);
      throw new Error(`Video creation failed with status ${status}`);
    }
    
    const responseData = await response.json();
    console.log(`✅ Video created: ${responseData.id}`);

    // Step 6: Verify modal closed and video appears
    console.log('\n[6/6] Verifying video appears in list...');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    
    const videoTitle = page.locator(`text=${videoData.title}`);
    await expect(videoTitle).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Video appears in list');
    
    console.log('\n🎉 LIVE PRODUCTION TEST PASSED!');
    console.log('✅ All schema fixes verified working');
    console.log('✅ Video creation successful\n');
  });
});
