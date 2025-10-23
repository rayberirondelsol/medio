/**
 * Critical Flow Integration Tests
 *
 * These tests combine multiple API calls in single test blocks to maintain
 * authentication state. Playwright API contexts only persist cookies WITHIN
 * a single test() block, not across multiple test() blocks.
 */

import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

test.describe('Critical Integration Flows', () => {
  test('Complete NFC registration and management flow', async () => {
    const apiContext = await request.newContext({ baseURL: BASE_URL });

    const testUser = {
      email: `nfc-flow-${Date.now()}@example.com`,
      password: 'NfcFlow123!',
      name: 'NFC Flow User'
    };

    const generateChipUID = () => {
      const randomByte = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      return `04:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}`;
    };

    const testChip = {
      uid: generateChipUID(),
      label: `Test Chip ${Date.now()}`
    };

    // Step 1: Get CSRF token
    const csrfResponse = await apiContext.get('/api/csrf-token');
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log('[FLOW] CSRF token obtained');

    // Step 2: Register user
    const registerResponse = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    console.log(`[FLOW] User registered: ${userData.user.id}`);

    // Step 3: Register NFC chip
    const chipResponse = await apiContext.post('/api/nfc/chips', {
      data: { chip_uid: testChip.uid, label: testChip.label },
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (!chipResponse.ok()) {
      const errorBody = await chipResponse.text();
      console.log(`[FLOW ERROR] Chip registration failed: ${chipResponse.status()} - ${errorBody}`);
    }

    expect(chipResponse.ok()).toBeTruthy();
    const chipData = await chipResponse.json();
    expect(chipData).toHaveProperty('chip_uuid');
    expect(chipData.chip_uid).toBe(testChip.uid);
    console.log(`[FLOW] Chip registered: ${chipData.chip_uuid}`);

    // Step 4: List chips
    const listResponse = await apiContext.get('/api/nfc/chips');
    expect(listResponse.ok()).toBeTruthy();
    const chips = await listResponse.json();
    expect(Array.isArray(chips)).toBeTruthy();
    const registeredChip = chips.find((c: any) => c.chip_uuid === chipData.chip_uuid);
    expect(registeredChip).toBeTruthy();
    console.log(`[FLOW] Listed ${chips.length} chips`);

    // Step 5: Delete chip
    const deleteResponse = await apiContext.delete(`/api/nfc/chips/${chipData.chip_uuid}`, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(deleteResponse.ok()).toBeTruthy();
    console.log('[FLOW] Chip deleted');

    await apiContext.dispose();
  });

  test('Complete video creation and management flow', async () => {
    const apiContext = await request.newContext({ baseURL: BASE_URL });

    const testUser = {
      email: `video-flow-${Date.now()}@example.com`,
      password: 'VideoFlow123!',
      name: 'Video Flow User'
    };

    const testVideo = {
      platform_video_id: `test-${Date.now()}`,
      title: 'Test Video',
      description: 'Integration test video',
      thumbnail_url: 'https://i.ytimg.com/vi/test/default.jpg',
      video_url: 'https://www.youtube.com/watch?v=test123',
      duration_seconds: 300,
      age_rating: 'G'
    };

    // Step 1: Get CSRF token
    const csrfResponse = await apiContext.get('/api/csrf-token');
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log('[VIDEO FLOW] CSRF token obtained');

    // Step 2: Register user
    const registerResponse = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    console.log(`[VIDEO FLOW] User registered: ${userData.user.id}`);

    // Step 3: Get platforms
    const platformsResponse = await apiContext.get('/api/platforms');

    if (!platformsResponse.ok()) {
      const errorBody = await platformsResponse.text();
      console.log(`[VIDEO FLOW ERROR] Platforms fetch failed: ${platformsResponse.status()} - ${errorBody}`);
    }

    expect(platformsResponse.ok()).toBeTruthy();
    const platforms = await platformsResponse.json();
    const youtubePlatform = platforms.find((p: any) => p.name === 'YouTube' || p.name === 'youtube');
    expect(youtubePlatform).toBeTruthy();
    console.log(`[VIDEO FLOW] Found ${platforms.length} platforms`);

    // Step 4: Create video
    const videoResponse = await apiContext.post('/api/videos', {
      data: { ...testVideo, platform_id: youtubePlatform.id },
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (!videoResponse.ok()) {
      const errorBody = await videoResponse.text();
      console.log(`[VIDEO FLOW ERROR] Video creation failed: ${videoResponse.status()} - ${errorBody}`);
    }

    expect(videoResponse.ok()).toBeTruthy();
    const videoData = await videoResponse.json();
    expect(videoData).toHaveProperty('video_uuid');
    console.log(`[VIDEO FLOW] Video created: ${videoData.video_uuid}`);

    // Step 5: List videos
    const listResponse = await apiContext.get('/api/videos?page=1&limit=20');
    expect(listResponse.ok()).toBeTruthy();
    const listData = await listResponse.json();
    const videos = listData.data || listData;
    expect(Array.isArray(videos)).toBeTruthy();
    console.log(`[VIDEO FLOW] Listed ${videos.length} videos`);

    // Step 6: Update video
    const updateResponse = await apiContext.put(`/api/videos/${videoData.video_uuid}`, {
      data: { title: 'Updated Test Video' },
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(updateResponse.ok()).toBeTruthy();
    console.log('[VIDEO FLOW] Video updated');

    // Step 7: Delete video
    const deleteResponse = await apiContext.delete(`/api/videos/${videoData.video_uuid}`, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    expect(deleteResponse.ok()).toBeTruthy();
    console.log('[VIDEO FLOW] Video deleted');

    await apiContext.dispose();
  });
});
