import { test, expect } from '@playwright/test';

/**
 * Test video creation with exact payload that user reported as failing
 *
 * This test verifies the fix for the user_id/user_uuid column mismatch bug.
 *
 * Root Cause:
 * - Database has both users.id (primary key) and users.user_uuid (duplicate column)
 * - Login endpoint was selecting user_uuid and putting it in JWT token
 * - Video creation uses req.user.id from JWT token for videos.user_id foreign key
 * - videos.user_id has foreign key to users.id (not user_uuid)
 * - Foreign key violation because user_uuid ≠ id
 *
 * Fix:
 * - Updated auth.js to use users.id consistently everywhere
 * - All JWT tokens now contain users.id (the primary key UUID)
 * - This matches the foreign key constraint in videos.user_id
 */

test.describe('Video Creation - User Payload Test', () => {
  const testEmail = `test-video-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  test('should create video with exact user payload (including channel_name)', async ({ page }) => {
    // Step 1: Register a new user
    await page.goto('http://localhost:8080/register');

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:8080/dashboard', { timeout: 10000 });

    console.log('✓ User registered successfully');

    // Step 2: Navigate to Videos page
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    console.log('✓ Videos page loaded');

    // Step 3: Open "Add Video" modal
    const addVideoButton = page.locator('button:has-text("Add Video")').first();
    await addVideoButton.waitFor({ state: 'visible', timeout: 10000 });
    await addVideoButton.click();

    // Wait for modal to appear
    await page.waitForSelector('form', { timeout: 5000 });

    console.log('✓ Add Video modal opened');

    // Step 4: Fill in the EXACT payload the user provided
    const videoPayload = {
      title: 'Prinzessinnenparty',
      description: 'Peppa Wutz',
      channel_name: 'Benny',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      age_rating: 'G'
    };

    // Fill in title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]');
    await titleInput.waitFor({ state: 'visible' });
    await titleInput.fill(videoPayload.title);
    console.log(`✓ Title filled: ${videoPayload.title}`);

    // Fill in description
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], input[name="description"]');
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill(videoPayload.description);
      console.log(`✓ Description filled: ${videoPayload.description}`);
    }

    // Fill in channel_name (THIS WAS FAILING)
    const channelInput = page.locator('input[name="channel_name"], input[name="channelName"], input[placeholder*="channel" i]');
    if (await channelInput.count() > 0) {
      await channelInput.fill(videoPayload.channel_name);
      console.log(`✓ Channel name filled: ${videoPayload.channel_name}`);
    }

    // Fill in video URL
    const urlInput = page.locator('input[name="video_url"], input[name="videoUrl"], input[placeholder*="url" i], input[type="url"]');
    await urlInput.fill(videoPayload.video_url);
    console.log(`✓ Video URL filled: ${videoPayload.video_url}`);

    // Select age rating
    const ratingSelect = page.locator('select[name="age_rating"], select[name="ageRating"]');
    if (await ratingSelect.count() > 0) {
      await ratingSelect.selectOption(videoPayload.age_rating);
      console.log(`✓ Age rating selected: ${videoPayload.age_rating}`);
    }

    // Step 5: Submit the form
    console.log('Submitting video creation form...');

    // Listen for the API response
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/videos') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    const submitButton = page.locator('button[type="submit"]:has-text("Add"), button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();

    // Wait for the response
    const response = await responsePromise;
    const status = response.status();

    console.log(`API Response Status: ${status}`);

    // Get response body for debugging
    let responseBody;
    try {
      responseBody = await response.json();
      console.log('API Response Body:', JSON.stringify(responseBody, null, 2));
    } catch (e) {
      responseBody = await response.text();
      console.log('API Response Body (text):', responseBody);
    }

    // Step 6: Verify success
    expect(status).toBe(201); // 201 Created

    if (status !== 201) {
      console.error('❌ VIDEO CREATION FAILED!');
      console.error('Status:', status);
      console.error('Response:', responseBody);
      throw new Error(`Video creation failed with status ${status}`);
    }

    console.log('✅ VIDEO CREATED SUCCESSFULLY!');

    // Verify the response contains the video data
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.title).toBe(videoPayload.title);
    expect(responseBody.channel_name).toBe(videoPayload.channel_name);

    console.log('✓ Video data verified in response');

    // Step 7: Verify the video appears in the list
    await page.waitForTimeout(2000); // Wait for modal to close and list to refresh

    // Check if the video appears in the list
    const videoCard = page.locator(`text=${videoPayload.title}`).first();
    await expect(videoCard).toBeVisible({ timeout: 10000 });

    console.log('✓ Video appears in the videos list');

    // Step 8: Verify database persistence (query the database directly)
    const apiResponse = await page.request.get('http://localhost:8080/api/videos', {
      headers: {
        'Cookie': await page.context().cookies().then(cookies =>
          cookies.map(c => `${c.name}=${c.value}`).join('; ')
        )
      }
    });

    expect(apiResponse.status()).toBe(200);
    const videos = await apiResponse.json();

    console.log('Videos from API:', JSON.stringify(videos, null, 2));

    // Check if our video is in the list
    const createdVideo = videos.data?.find((v: any) => v.title === videoPayload.title)
                      || videos.find((v: any) => v.title === videoPayload.title);

    expect(createdVideo).toBeTruthy();
    expect(createdVideo.channel_name).toBe(videoPayload.channel_name);
    expect(createdVideo.title).toBe(videoPayload.title);

    console.log('✅ ALL TESTS PASSED - Video creation works with channel_name!');
  });

  test('should handle video creation after login (not just register)', async ({ page }) => {
    // This test ensures the fix works for BOTH registration and login flows
    // Previously, register and login used different column names (id vs user_uuid)

    // Step 1: Register a new user
    await page.goto('http://localhost:8080/register');

    const uniqueEmail = `test-login-${Date.now()}@example.com`;

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8080/dashboard', { timeout: 10000 });

    console.log('✓ User registered');

    // Step 2: Logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Navigate to login page manually
      await page.goto('http://localhost:8080/login');
    }

    console.log('✓ User logged out');

    // Step 3: Login with the same credentials
    await page.goto('http://localhost:8080/login');

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', testPassword);

    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8080/dashboard', { timeout: 10000 });

    console.log('✓ User logged in again');

    // Step 4: Create a video (this should work now that login uses users.id)
    await page.goto('http://localhost:8080/videos');
    await page.waitForLoadState('networkidle');

    const addVideoButton = page.locator('button:has-text("Add Video")').first();
    await addVideoButton.click();
    await page.waitForSelector('form', { timeout: 5000 });

    const videoPayload = {
      title: 'Test Video After Login',
      channel_name: 'Test Channel',
      video_url: 'https://www.youtube.com/watch?v=testvideoafterlogin',
      age_rating: 'G'
    };

    await page.fill('input[name="title"], input[placeholder*="title" i]', videoPayload.title);

    const channelInput = page.locator('input[name="channel_name"], input[name="channelName"], input[placeholder*="channel" i]');
    if (await channelInput.count() > 0) {
      await channelInput.fill(videoPayload.channel_name);
    }

    await page.fill('input[type="url"], input[name="video_url"]', videoPayload.video_url);

    // Submit
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/videos') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    await page.click('button[type="submit"]:has-text("Add"), button:has-text("Save")');

    const response = await responsePromise;
    const status = response.status();

    console.log(`Video creation after login - Status: ${status}`);

    expect(status).toBe(201);

    console.log('✅ Video creation works after LOGIN (not just register)');
  });
});
