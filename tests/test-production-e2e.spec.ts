/**
 * Production E2E Test - Complete Workflows
 * Tests NFC chip and video registration against production backend
 */

import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://medio-backend.fly.dev';

test.describe('Production E2E Tests', () => {
  test('Complete workflow: NFC chip registration', async () => {
    const apiContext = await request.newContext({ baseURL: BASE_URL });

    const testUser = {
      email: `e2e-nfc-${Date.now()}@example.com`,
      password: 'E2eTest123!',
      name: 'E2E NFC User'
    };

    const generateChipUID = () => {
      const randomByte = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      return `04:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}`;
    };

    const testChip = {
      uid: generateChipUID(),
      label: `E2E Test Chip ${Date.now()}`
    };

    console.log('\n🧪 Testing NFC Workflow');
    console.log(`📧 User: ${testUser.email}`);
    console.log(`🏷️  Chip: ${testChip.label} (${testChip.uid})`);

    // Step 1: Get CSRF token
    console.log('\n[1/5] Getting CSRF token...');
    const csrfResponse = await apiContext.get('/api/csrf-token');
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log(`✅ CSRF token obtained`);

    // Step 2: Register user
    console.log('\n[2/5] Registering user...');
    const registerResponse = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (!registerResponse.ok()) {
      const errorBody = await registerResponse.text();
      console.log(`❌ Registration failed: ${registerResponse.status()} - ${errorBody}`);
    }

    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    console.log(`✅ User registered: ${userData.user.id}`);

    // Step 3: Register NFC chip
    console.log('\n[3/5] Registering NFC chip...');
    const chipResponse = await apiContext.post('/api/nfc/chips', {
      data: { chip_uid: testChip.uid, label: testChip.label },
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (!chipResponse.ok()) {
      const errorBody = await chipResponse.text();
      console.log(`❌ Chip registration failed: ${chipResponse.status()} - ${errorBody}`);
    }

    expect(chipResponse.ok()).toBeTruthy();
    const chipData = await chipResponse.json();
    expect(chipData).toHaveProperty('id');
    expect(chipData.chip_uid).toBe(testChip.uid);
    console.log(`✅ Chip registered: ${chipData.id}`);

    // Step 4: List chips
    console.log('\n[4/5] Listing all chips...');
    const listResponse = await apiContext.get('/api/nfc/chips');
    expect(listResponse.ok()).toBeTruthy();
    const chips = await listResponse.json();
    expect(Array.isArray(chips)).toBeTruthy();
    const registeredChip = chips.find((c: any) => c.id === chipData.id);
    expect(registeredChip).toBeTruthy();
    console.log(`✅ Found ${chips.length} chip(s), including our test chip`);

    // Step 5: Delete chip
    console.log('\n[5/5] Deleting chip...');
    const deleteResponse = await apiContext.delete(`/api/nfc/chips/${chipData.id}`, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(deleteResponse.ok()).toBeTruthy();
    console.log('✅ Chip deleted successfully');

    console.log('\n🎉 NFC workflow test completed successfully!\n');

    await apiContext.dispose();
  });

  test('Complete workflow: Video creation', async () => {
    const apiContext = await request.newContext({ baseURL: BASE_URL });

    const testUser = {
      email: `e2e-video-${Date.now()}@example.com`,
      password: 'E2eTest123!',
      name: 'E2E Video User'
    };

    const testVideo = {
      platform_video_id: `test-${Date.now()}`,
      title: 'E2E Test Video',
      description: 'Integration test video for production',
      thumbnail_url: 'https://i.ytimg.com/vi/test/default.jpg',
      video_url: `https://www.youtube.com/watch?v=test${Date.now()}`,
      duration_seconds: 300,
      age_rating: 'G'
    };

    console.log('\n🧪 Testing Video Workflow');
    console.log(`📧 User: ${testUser.email}`);
    console.log(`🎬 Video: ${testVideo.title}`);

    // Step 1: Get CSRF token
    console.log('\n[1/6] Getting CSRF token...');
    const csrfResponse = await apiContext.get('/api/csrf-token');
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log('✅ CSRF token obtained');

    // Step 2: Register user
    console.log('\n[2/6] Registering user...');
    const registerResponse = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    console.log(`✅ User registered: ${userData.user.id}`);

    // Step 3: Get platforms
    console.log('\n[3/6] Fetching platforms...');
    const platformsResponse = await apiContext.get('/api/platforms');

    if (!platformsResponse.ok()) {
      const errorBody = await platformsResponse.text();
      console.log(`❌ Platforms fetch failed: ${platformsResponse.status()} - ${errorBody}`);
    }

    expect(platformsResponse.ok()).toBeTruthy();
    const platforms = await platformsResponse.json();
    const youtubePlatform = platforms.find((p: any) =>
      p.name.toLowerCase() === 'youtube'
    );
    expect(youtubePlatform).toBeTruthy();
    console.log(`✅ Found ${platforms.length} platforms (YouTube ID: ${youtubePlatform.id})`);

    // Step 4: Create video
    console.log('\n[4/6] Creating video...');
    const videoResponse = await apiContext.post('/api/videos', {
      data: { ...testVideo, platform_id: youtubePlatform.id },
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (!videoResponse.ok()) {
      const errorBody = await videoResponse.text();
      console.log(`❌ Video creation failed: ${videoResponse.status()} - ${errorBody}`);
    }

    expect(videoResponse.ok()).toBeTruthy();
    const videoData = await videoResponse.json();
    expect(videoData).toHaveProperty('id');
    console.log(`✅ Video created: ${videoData.id}`);

    // Step 5: List videos
    console.log('\n[5/6] Listing all videos...');
    const listResponse = await apiContext.get('/api/videos?page=1&limit=20');
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    const videos = listData.data || listData;
    expect(Array.isArray(videos)).toBeTruthy();
    console.log(`✅ Found ${videos.length} video(s)`);

    // Step 6: Delete video
    console.log('\n[6/6] Deleting video...');
    const deleteResponse = await apiContext.delete(`/api/videos/${videoData.id}`, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(deleteResponse.ok()).toBeTruthy();
    console.log('✅ Video deleted successfully');

    console.log('\n🎉 Video workflow test completed successfully!\n');

    await apiContext.dispose();
  });
});
