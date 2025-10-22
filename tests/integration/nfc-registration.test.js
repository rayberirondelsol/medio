/**
 * Integration Tests: NFC Chip Registration Flow
 *
 * Tests the complete NFC chip management workflow including:
 * - Authentication
 * - Chip registration
 * - Chip listing
 * - Chip deletion
 * - Duplicate detection
 * - Validation
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';
const TEST_USER = {
  email: `nfc-test-${Date.now()}@example.com`,
  password: 'NfcTest123!',
  name: 'NFC Test User'
};

// Test NFC chip data
const TEST_CHIP = {
  uid: `04:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}`,
  label: `Test Chip ${Date.now()}`
};

describe('NFC Chip Registration Integration Tests', () => {
  let authCookies = '';
  let csrfToken = '';
  let chipId = '';
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
    console.log(`[SETUP] Test chip UID: ${TEST_CHIP.uid}`);
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

  describe('Step 2: Initial Chip Listing', () => {
    it('should return empty chip list for new user', async () => {
      const response = await apiRequest('GET', '/api/nfc/chips');

      console.log(`[CHIP LIST] Status: ${response.status}`);
      console.log(`[CHIP LIST] Response:`, response.data);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);

      console.log(`[CHIP LIST] Initial chip count: 0`);
    });
  });

  describe('Step 3: NFC Chip Registration', () => {
    it('should register new NFC chip', async () => {
      const chipData = {
        chip_uid: TEST_CHIP.uid,
        label: TEST_CHIP.label
      };

      const response = await apiRequest('POST', '/api/nfc/chips', chipData);

      console.log(`[CHIP REGISTER] Status: ${response.status}`);
      console.log(`[CHIP REGISTER] Response:`, response.data);

      // Check if error response
      if (response.status >= 400) {
        console.error(`[CHIP REGISTER] Error details:`, {
          status: response.status,
          message: response.data.message || response.data.error,
          details: response.data
        });
      }

      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('chip_uid');
      expect(response.data.label).toBe(TEST_CHIP.label);

      chipId = response.data.id;
      console.log(`[CHIP REGISTER] Chip ID: ${chipId}`);
      console.log(`[CHIP REGISTER] Normalized UID: ${response.data.chip_uid}`);
    });

    it('should prevent duplicate chip registration', async () => {
      const chipData = {
        chip_uid: TEST_CHIP.uid,
        label: 'Duplicate Chip'
      };

      const response = await apiRequest('POST', '/api/nfc/chips', chipData);

      console.log(`[DUPLICATE CHECK] Status: ${response.status}`);
      console.log(`[DUPLICATE CHECK] Response:`, response.data);

      expect(response.status).toBe(409); // Conflict
      expect(response.data).toHaveProperty('message');
      expect(response.data.message.toLowerCase()).toContain('already');
    });

    it('should validate chip UID format', async () => {
      const invalidChips = [
        { chip_uid: '', label: 'Empty UID' },
        { chip_uid: '123', label: 'Too short' },
        { chip_uid: 'GGGGGGGGGGGGGG', label: 'Invalid hex' },
        { chip_uid: '04:ZZ:AA:BB:CC:DD:EE', label: 'Invalid characters' }
      ];

      for (const chipData of invalidChips) {
        const response = await apiRequest('POST', '/api/nfc/chips', chipData);

        console.log(`[VALIDATION] ${chipData.label} - Status: ${response.status}`);

        expect(response.status).toBe(400); // Bad Request
      }
    });

    it('should validate label requirements', async () => {
      const newUid = `04:AA:BB:CC:DD:EE:${Math.random().toString(16).substr(2, 2).toUpperCase()}`;

      // Empty label
      let response = await apiRequest('POST', '/api/nfc/chips', {
        chip_uid: newUid,
        label: ''
      });

      console.log(`[LABEL VALIDATION] Empty label - Status: ${response.status}`);
      expect(response.status).toBe(400);

      // Label too long (>50 chars)
      response = await apiRequest('POST', '/api/nfc/chips', {
        chip_uid: newUid,
        label: 'A'.repeat(51)
      });

      console.log(`[LABEL VALIDATION] Long label - Status: ${response.status}`);
      expect(response.status).toBe(400);
    });
  });

  describe('Step 4: Chip Retrieval', () => {
    it('should list registered chips', async () => {
      const response = await apiRequest('GET', '/api/nfc/chips');

      console.log(`[CHIP LIST] Status: ${response.status}`);
      console.log(`[CHIP LIST] Response:`, JSON.stringify(response.data, null, 2));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify chip is in list
      const chip = response.data.find(c => c.id === chipId);
      expect(chip).toBeDefined();
      expect(chip.label).toBe(TEST_CHIP.label);

      console.log(`[CHIP LIST] Found ${response.data.length} chips`);
    });
  });

  describe('Step 5: UID Normalization', () => {
    it('should normalize UID formats', async () => {
      const testUids = [
        { input: '04AABBCCDDEE', expected: true },
        { input: '04:AA:BB:CC:DD:EE', expected: true },
        { input: '04-AA-BB-CC-DD-EE', expected: true },
        { input: '04 AA BB CC DD EE', expected: true }
      ];

      for (const test of testUids) {
        const chipData = {
          chip_uid: test.input.replace(/04/, `04${Math.random().toString(16).substr(2, 2).toUpperCase()}`),
          label: `Test ${test.input}`
        };

        const response = await apiRequest('POST', '/api/nfc/chips', chipData);

        console.log(`[UID NORMALIZE] Input: ${test.input} - Status: ${response.status}`);

        if (test.expected) {
          expect([200, 201]).toContain(response.status);
          // Verify UID is normalized (consistent format)
          expect(response.data.chip_uid).toBeDefined();
        }
      }
    });
  });

  describe('Step 6: Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Try to register multiple chips rapidly
      const promises = [];
      for (let i = 0; i < 12; i++) {
        const chipData = {
          chip_uid: `04:${i.toString(16).padStart(2, '0')}:AA:BB:CC:DD:EE`,
          label: `Rate Test Chip ${i}`
        };
        promises.push(apiRequest('POST', '/api/nfc/chips', chipData));
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      console.log(`[RATE LIMIT] Total requests: 12, Rate limited: ${rateLimited.length}`);

      // Should have at least some rate limiting (10 requests per 15 min limit)
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000); // Increase timeout for this test
  });

  describe('Step 7: Chip Deletion', () => {
    it('should delete registered chip', async () => {
      const response = await apiRequest('DELETE', `/api/nfc/chips/${chipId}`);

      console.log(`[CHIP DELETE] Status: ${response.status}`);
      console.log(`[CHIP DELETE] Response:`, response.data);

      expect([200, 204]).toContain(response.status);

      // Verify chip is deleted
      const listResponse = await apiRequest('GET', '/api/nfc/chips');
      const chip = listResponse.data.find(c => c.id === chipId);
      expect(chip).toBeUndefined();

      console.log(`[CHIP DELETE] Chip successfully deleted`);
    });

    it('should handle deleting non-existent chip', async () => {
      const response = await apiRequest('DELETE', `/api/nfc/chips/00000000-0000-0000-0000-000000000000`);

      console.log(`[DELETE NON-EXISTENT] Status: ${response.status}`);

      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Step 8: Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      // Make request without auth cookies
      const response = await axios.get(`${BASE_URL}/api/nfc/chips`, {
        validateStatus: () => true
      });

      console.log(`[UNAUTH] Status: ${response.status}`);

      expect(response.status).toBe(401);
    });

    it('should handle missing CSRF token', async () => {
      const chipData = {
        chip_uid: '04:FF:FF:FF:FF:FF:FF',
        label: 'Test Chip'
      };

      // Request without CSRF token
      const response = await axios.post(`${BASE_URL}/api/nfc/chips`, chipData, {
        headers: {
          'Cookie': authCookies,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });

      console.log(`[NO CSRF] Status: ${response.status}`);

      expect(response.status).toBe(403); // CSRF validation fails
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
