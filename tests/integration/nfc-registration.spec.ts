/**
 * Playwright Integration Tests: NFC Chip Registration Flow
 *
 * Migrated from legacy axios-based tests to modern Playwright API tests.
 *
 * Tests the complete NFC chip management workflow including:
 * - Authentication (registration/login)
 * - CSRF token handling
 * - Chip registration
 * - Chip listing
 * - Chip deletion
 * - Duplicate detection
 * - Validation
 */

import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

test.describe('NFC Chip Registration Integration', () => {
  let apiContext: any;
  let csrfToken: string;
  let chipId: string;
  let userId: string;

  const testUser = {
    email: `nfc-test-${Date.now()}@example.com`,
    password: 'NfcTest123!',
    name: 'NFC Test User'
  };

  const generateChipUID = () => {
    const randomByte = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    return `04:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}`;
  };

  const testChip = {
    uid: generateChipUID(),
    label: `Test Chip ${Date.now()}`
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
    console.log(`[SETUP] Test chip UID: ${testChip.uid}`);
  });

  test.afterAll(async () => {
    if (apiContext) {
      await apiContext.dispose();
    }
  });

  test('INT-NFC-001: Should fetch CSRF token', async () => {
    const response = await apiContext.get('/api/csrf-token');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('csrfToken');

    csrfToken = data.csrfToken;
    console.log(`[CSRF] Token obtained: ${csrfToken.substring(0, 10)}...`);
  });

  test('INT-NFC-002: Should register test user', async () => {
    const response = await apiContext.post('/api/auth/register', {
      data: testUser,
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id');
    expect(data.user.email).toBe(testUser.email);

    userId = data.user.id;
    console.log(`[REGISTER] User created: ${userId}`);
  });

  test('INT-NFC-003: Should register NFC chip successfully', async () => {
    const response = await apiContext.post('/api/nfc/chips', {
      data: {
        chip_uid: testChip.uid,
        label: testChip.label
      },
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    console.log(`[CHIP REG] Response status: ${response.status()}`);

    if (!response.ok()) {
      const errorBody = await response.text();
      console.log(`[CHIP REG] Error body: ${errorBody}`);
    }

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.chip_uid).toBe(testChip.uid);
    expect(data.label).toBe(testChip.label);

    chipId = data.id;
    console.log(`[CHIP REG] Chip registered: ${chipId}`);
  });

  test('INT-NFC-004: Should list registered chips', async () => {
    const response = await apiContext.get('/api/nfc/chips');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    const registeredChip = data.find((chip: any) => chip.id === chipId);
    expect(registeredChip).toBeTruthy();
    expect(registeredChip.chip_uid).toBe(testChip.uid);

    console.log(`[CHIP LIST] Found ${data.length} chips`);
  });

  test('INT-NFC-005: Should prevent duplicate chip registration', async () => {
    const response = await apiContext.post('/api/nfc/chips', {
      data: {
        chip_uid: testChip.uid,
        label: 'Duplicate Chip'
      },
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.status()).toBe(409);

    const data = await response.json();
    expect(data.message || data.error).toMatch(/already|exist|duplicate/i);

    console.log(`[DUPLICATE] Correctly rejected duplicate chip`);
  });

  test('INT-NFC-006: Should validate chip UID format', async () => {
    const invalidChips = [
      { uid: '1234', label: 'Too Short' },
      { uid: 'INVALID_FORMAT', label: 'Invalid Format' },
      { uid: 'GG:HH:II:JJ:KK:LL:MM', label: 'Non-Hex Characters' },
    ];

    for (const invalidChip of invalidChips) {
      const response = await apiContext.post('/api/nfc/chips', {
        data: {
          chip_uid: invalidChip.uid,
          label: invalidChip.label
        },
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      expect(response.status()).toBe(400);
      console.log(`[VALIDATION] Correctly rejected invalid UID: ${invalidChip.uid}`);
    }
  });

  test('INT-NFC-007: Should require authentication for chip operations', async () => {
    // Create new context without auth cookies
    const unauthContext = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      }
    });

    // Get CSRF token first
    const csrfResponse = await unauthContext.get('/api/csrf-token');
    const csrfData = await csrfResponse.json();
    const unauthCsrf = csrfData.csrfToken;

    const response = await unauthContext.get('/api/nfc/chips');

    expect(response.status()).toBe(401);

    console.log(`[AUTH] Correctly requires authentication`);

    await unauthContext.dispose();
  });

  test('INT-NFC-008: Should delete chip successfully', async () => {
    const response = await apiContext.delete(`/api/nfc/chips/${chipId}`, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();

    // Verify chip is deleted
    const listResponse = await apiContext.get('/api/nfc/chips');
    const chips = await listResponse.json();

    const deletedChip = chips.find((chip: any) => chip.id === chipId);
    expect(deletedChip).toBeFalsy();

    console.log(`[DELETE] Chip deleted successfully`);
  });

  test('INT-NFC-009: Should handle chip limit (if implemented)', async () => {
    // Register maximum allowed chips
    const maxChips = 10; // Adjust based on your backend limit
    const chipIds: string[] = [];

    for (let i = 0; i < maxChips; i++) {
      const response = await apiContext.post('/api/nfc/chips', {
        data: {
          chip_uid: generateChipUID(),
          label: `Test Chip ${i}`
        },
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      if (response.ok()) {
        const data = await response.json();
        chipIds.push(data.id);
      } else {
        // Limit reached
        expect(response.status()).toBe(403);
        console.log(`[LIMIT] Chip limit reached at ${i} chips`);
        break;
      }
    }

    // Cleanup
    for (const id of chipIds) {
      await apiContext.delete(`/api/nfc/chips/${id}`, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
    }
  });
});
