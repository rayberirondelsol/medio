/**
 * Playwright Integration Tests: Video Creation Flow
 *
 * Migrated from legacy axios-based tests to modern Playwright API tests.
 *
 * Tests the complete video management workflow including:
 * - Authentication
 * - Platform listing
 * - Video creation with metadata
 * - Video listing with pagination
 * - Video deletion
 * - Duplicate URL detection
 * - Validation
 */

import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

test.describe('Video Creation Integration', () => {
  let apiContext: any;
  let csrfToken: string;
  let platformId: string;
  let videoId: string;
  let userId: string;

  const testUser = {
    email: `video-test-${Date.now()}@example.com`,
    password: 'VideoTest123!',
    name: 'Video Test User'
  };

  const testVideo = {
    platform_name: 'YouTube',
    platform_video_id: `test-${Date.now()}`,
    title: 'Test Video',
    description: 'This is a test video',
    thumbnail_url: 'https://i.ytimg.com/vi/test/default.jpg',
    duration: 300,
    age_rating: 'G'
  };

  test.beforeAll(async () => {
    // Create a single API context shared across all tests in this file
    // This ensures cookies (authentication) persist between tests
    apiContext = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`\n[SETUP] Testing against: ${BASE_URL}`);
    console.log(`[SETUP] Test user: ${testUser.email}`);
  });

  test.afterAll(async () => {
    if (apiContext) {
      await apiContext.dispose();
    }
  });

  test('INT-VIDEO-001: Should fetch CSRF token', async () => {
    const response = await apiContext.get('/api/csrf-token');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    csrfToken = data.csrfToken;

    console.log(`[CSRF] Token obtained`);
  });

  test('INT-VIDEO-002: Should register test user', async () => {
    const response = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    userId = data.user.id;

    console.log(`[REGISTER] User created: ${userId}`);
  });

  test('INT-VIDEO-003: Should list available platforms', async () => {
    const response = await apiContext.get('/api/platforms');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    const youtubePlatform = data.find((p: any) => p.name === 'YouTube');
    expect(youtubePlatform).toBeTruthy();

    platformId = youtubePlatform.id;
    console.log(`[PLATFORMS] Found ${data.length} platforms`);
  });

  test('INT-VIDEO-004: Should create video successfully', async () => {
    const response = await apiContext.post('/api/videos', {
      data: {
        ...testVideo,
        platform_id: platformId
      },
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe(testVideo.title);
    expect(data.platform_video_id).toBe(testVideo.platform_video_id);

    videoId = data.id;
    console.log(`[VIDEO CREATE] Video created: ${videoId}`);
  });

  test('INT-VIDEO-005: Should list user videos with pagination', async () => {
    const response = await apiContext.get('/api/videos?page=1&limit=20');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Check for pagination structure
    if (data.data) {
      // New pagination format
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.data.length).toBeGreaterThan(0);

      const createdVideo = data.data.find((v: any) => v.id === videoId);
      expect(createdVideo).toBeTruthy();
    } else {
      // Old format (array)
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);

      const createdVideo = data.find((v: any) => v.id === videoId);
      expect(createdVideo).toBeTruthy();
    }

    console.log(`[VIDEO LIST] Listed videos successfully`);
  });

  test('INT-VIDEO-006: Should prevent duplicate video URLs', async () => {
    const response = await apiContext.post('/api/videos', {
      data: {
        ...testVideo,
        platform_id: platformId,
        title: 'Duplicate Video'
      },
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.status()).toBe(409);

    const data = await response.json();
    expect(data.message || data.error).toMatch(/already|exist|duplicate/i);

    console.log(`[DUPLICATE] Correctly rejected duplicate video`);
  });

  test('INT-VIDEO-007: Should validate video data', async () => {
    const invalidVideos = [
      {
        data: { platform_id: platformId },
        field: 'missing required fields'
      },
      {
        data: {
          platform_id: platformId,
          platform_video_id: 'test',
          title: '', // Empty title
          age_rating: 'G'
        },
        field: 'empty title'
      },
      {
        data: {
          platform_id: platformId,
          platform_video_id: 'test',
          title: 'Test',
          age_rating: 'INVALID' // Invalid rating
        },
        field: 'invalid age rating'
      }
    ];

    for (const invalid of invalidVideos) {
      const response = await apiContext.post('/api/videos', {
        data: invalid.data,
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);

      console.log(`[VALIDATION] Correctly rejected: ${invalid.field}`);
    }
  });

  test('INT-VIDEO-008: Should require authentication for video operations', async () => {
    const unauthContext = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      }
    });

    const response = await unauthContext.get('/api/videos');

    expect(response.status()).toBe(401);

    console.log(`[AUTH] Correctly requires authentication`);

    await unauthContext.dispose();
  });

  test('INT-VIDEO-009: Should fetch video metadata from platform API', async () => {
    // This test requires valid API keys to be configured
    const response = await apiContext.get(
      `/api/videos/metadata?platform=youtube&videoId=dQw4w9WgXcQ`
    );

    if (response.status() === 429) {
      console.log(`[METADATA] Rate limited (expected)`);
      test.skip();
      return;
    }

    if (response.status() === 503) {
      console.log(`[METADATA] API key not configured (expected in test)`);
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('thumbnail_url');

    console.log(`[METADATA] Fetched metadata for video`);
  });

  test('INT-VIDEO-010: Should update video successfully', async () => {
    const updatedData = {
      title: 'Updated Test Video',
      description: 'Updated description'
    };

    const response = await apiContext.put(`/api/videos/${videoId}`, {
      data: updatedData,
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.title).toBe(updatedData.title);
    expect(data.description).toBe(updatedData.description);

    console.log(`[VIDEO UPDATE] Video updated successfully`);
  });

  test('INT-VIDEO-011: Should delete video successfully', async () => {
    const response = await apiContext.delete(`/api/videos/${videoId}`, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    // Verify video is deleted
    const listResponse = await apiContext.get('/api/videos');
    const listData = await listResponse.json();

    const videos = listData.data || listData;
    const deletedVideo = videos.find((v: any) => v.id === videoId);
    expect(deletedVideo).toBeFalsy();

    console.log(`[DELETE] Video deleted successfully`);
  });

  test('INT-VIDEO-012: Should handle pagination correctly', async () => {
    // Create multiple videos
    const videoIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await apiContext.post('/api/videos', {
        data: {
          platform_id: platformId,
          platform_video_id: `pagination-test-${i}-${Date.now()}`,
          title: `Pagination Test Video ${i}`,
          age_rating: 'G'
        },
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      if (response.ok()) {
        const data = await response.json();
        videoIds.push(data.id);
      }
    }

    // Test pagination
    const page1 = await apiContext.get('/api/videos?page=1&limit=2');
    const data1 = await page1.json();

    if (data1.pagination) {
      expect(data1.pagination.page).toBe(1);
      expect(data1.pagination.limit).toBe(2);
      expect(data1.data.length).toBeLessThanOrEqual(2);
    }

    console.log(`[PAGINATION] Pagination working correctly`);

    // Cleanup
    for (const id of videoIds) {
      await apiContext.delete(`/api/videos/${id}`, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
    }
  });
});
