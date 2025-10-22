/**
 * Integration Tests: Video Creation Flow
 *
 * Tests the complete video creation workflow including:
 * - Authentication
 * - Platform lookup
 * - Video metadata (if available)
 * - Video creation with duplicate detection
 * - Video retrieval
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';
const TEST_USER = {
  email: `video-test-${Date.now()}@example.com`,
  password: 'VideoTest123!',
  name: 'Video Test User'
};

// Test video data
const TEST_VIDEO = {
  youtube: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    expectedTitle: 'Rick Astley - Never Gonna Give You Up',
    platform: 'youtube'
  }
};

describe('Video Creation Integration Tests', () => {
  let authCookies = '';
  let csrfToken = '';
  let platformId = '';
  let userId = '';

  // Helper function to make authenticated requests
  const apiRequest = async (method, url, data = null, headers = {}) => {
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookies,
          'X-CSRF-Token': csrfToken,
          ...headers
        },
        validateStatus: () => true, // Don't throw on any status
        withCredentials: true
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);

      // Update cookies if Set-Cookie header present
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie']
          .map(cookie => cookie.split(';')[0])
          .join('; ');
        if (cookies) {
          authCookies = cookies;
        }
      }

      return response;
    } catch (error) {
      console.error(`[API ERROR] ${method} ${url}:`, error.message);
      throw error;
    }
  };

  beforeAll(async () => {
    console.log(`\n[SETUP] Testing against: ${BASE_URL}`);
    console.log(`[SETUP] Test user: ${TEST_USER.email}`);
  });

  describe('Step 1: Authentication Setup', () => {
    it('should fetch CSRF token', async () => {
      const response = await apiRequest('GET', '/api/csrf-token');

      console.log(`[CSRF] Status: ${response.status}`);
      console.log(`[CSRF] Response:`, response.data);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('csrfToken');

      csrfToken = response.data.csrfToken;
      console.log(`[CSRF] Token obtained: ${csrfToken.substring(0, 10)}...`);
    });

    it('should register test user', async () => {
      const response = await apiRequest('POST', '/api/auth/register', TEST_USER);

      console.log(`[REGISTER] Status: ${response.status}`);
      console.log(`[REGISTER] Response:`, response.data);

      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('user');

      userId = response.data.user.id;
      console.log(`[REGISTER] User ID: ${userId}`);
      console.log(`[REGISTER] Cookies: ${authCookies.substring(0, 50)}...`);
    });

    it('should verify authentication with /api/auth/me', async () => {
      const response = await apiRequest('GET', '/api/auth/me');

      console.log(`[AUTH CHECK] Status: ${response.status}`);
      console.log(`[AUTH CHECK] Response:`, response.data);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(TEST_USER.email);
    });
  });

  describe('Step 2: Platform Lookup', () => {
    it('should fetch available platforms', async () => {
      const response = await apiRequest('GET', '/api/platforms');

      console.log(`[PLATFORMS] Status: ${response.status}`);
      console.log(`[PLATFORMS] Response:`, response.data);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Find YouTube platform
      const youtubePlatform = response.data.find(p => p.name === 'youtube');
      expect(youtubePlatform).toBeDefined();

      platformId = youtubePlatform.id;
      console.log(`[PLATFORMS] YouTube platform ID: ${platformId}`);
    });
  });

  describe('Step 3: Video Creation', () => {
    it('should create video with required fields', async () => {
      const videoData = {
        platform_id: platformId,
        platform_video_id: TEST_VIDEO.youtube.videoId,
        title: 'Test Video Title',
        description: 'Test video description',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration: 213,
        age_rating: 'PG'
      };

      const response = await apiRequest('POST', '/api/videos', videoData);

      console.log(`[VIDEO CREATE] Status: ${response.status}`);
      console.log(`[VIDEO CREATE] Response:`, response.data);

      // Check if error response
      if (response.status >= 400) {
        console.error(`[VIDEO CREATE] Error details:`, {
          status: response.status,
          message: response.data.message || response.data.error,
          details: response.data
        });
      }

      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('id');
      expect(response.data.platform_video_id).toBe(TEST_VIDEO.youtube.videoId);

      console.log(`[VIDEO CREATE] Video ID: ${response.data.id}`);
    });

    it('should prevent duplicate video creation', async () => {
      const videoData = {
        platform_id: platformId,
        platform_video_id: TEST_VIDEO.youtube.videoId,
        title: 'Duplicate Video',
        age_rating: 'PG'
      };

      const response = await apiRequest('POST', '/api/videos', videoData);

      console.log(`[DUPLICATE CHECK] Status: ${response.status}`);
      console.log(`[DUPLICATE CHECK] Response:`, response.data);

      expect(response.status).toBe(409); // Conflict
      expect(response.data).toHaveProperty('message');
      expect(response.data.message.toLowerCase()).toContain('already');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        platform_id: platformId,
        // Missing platform_video_id
        title: 'Invalid Video'
      };

      const response = await apiRequest('POST', '/api/videos', invalidData);

      console.log(`[VALIDATION] Status: ${response.status}`);
      console.log(`[VALIDATION] Response:`, response.data);

      expect(response.status).toBe(400); // Bad Request
    });

    it('should validate age rating', async () => {
      const invalidData = {
        platform_id: platformId,
        platform_video_id: 'test123',
        title: 'Test Video',
        age_rating: 'INVALID_RATING' // Invalid rating
      };

      const response = await apiRequest('POST', '/api/videos', invalidData);

      console.log(`[AGE RATING] Status: ${response.status}`);
      console.log(`[AGE RATING] Response:`, response.data);

      expect(response.status).toBe(400);
    });
  });

  describe('Step 4: Video Retrieval', () => {
    it('should retrieve user videos with pagination', async () => {
      const response = await apiRequest('GET', '/api/videos?page=1&limit=20');

      console.log(`[VIDEO LIST] Status: ${response.status}`);
      console.log(`[VIDEO LIST] Response:`, JSON.stringify(response.data, null, 2));

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);

      // Verify pagination structure
      expect(response.data).toHaveProperty('pagination');
      expect(response.data.pagination).toHaveProperty('page');
      expect(response.data.pagination).toHaveProperty('totalCount');

      // Verify video belongs to current user
      const video = response.data.data.find(v =>
        v.platform_video_id === TEST_VIDEO.youtube.videoId
      );
      expect(video).toBeDefined();

      console.log(`[VIDEO LIST] Found ${response.data.data.length} videos`);
    });
  });

  describe('Step 5: Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      // Make request without auth cookies
      const response = await axios.get(`${BASE_URL}/api/videos`, {
        validateStatus: () => true
      });

      console.log(`[UNAUTH] Status: ${response.status}`);

      expect(response.status).toBe(401);
    });

    it('should handle invalid platform_id', async () => {
      const videoData = {
        platform_id: '00000000-0000-0000-0000-000000000000',
        platform_video_id: 'test123',
        title: 'Test Video',
        age_rating: 'PG'
      };

      const response = await apiRequest('POST', '/api/videos', videoData);

      console.log(`[INVALID PLATFORM] Status: ${response.status}`);
      console.log(`[INVALID PLATFORM] Response:`, response.data);

      expect([400, 404]).toContain(response.status);
    });
  });

  afterAll(async () => {
    // Cleanup: logout and delete test user
    try {
      await apiRequest('POST', '/api/auth/logout');
      console.log(`[CLEANUP] Logged out test user`);
    } catch (error) {
      console.error(`[CLEANUP] Failed to logout:`, error.message);
    }
  });
});
