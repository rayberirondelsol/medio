/**
 * Integration Test Authentication Setup
 *
 * This file sets up authenticated API contexts for integration tests.
 * It creates test users and saves their auth state to be reused by other tests.
 */

import { test as setup, expect, request } from '@playwright/test';

const AUTH_STATE_FILE = 'tests/integration/.auth/user.json';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

setup('authenticate test user', async () => {
  const apiContext = await request.newContext({
    baseURL: BASE_URL,
  });

  const testUser = {
    email: `integration-test-${Date.now()}@example.com`,
    password: 'IntegrationTest123!',
    name: 'Integration Test User'
  };

  console.log(`[AUTH SETUP] Creating test user: ${testUser.email}`);

  // Step 1: Get CSRF token
  const csrfResponse = await apiContext.get('/api/csrf-token');
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  console.log(`[AUTH SETUP] CSRF token obtained`);

  // Step 2: Register user
  const registerResponse = await apiContext.post('/api/auth/register', {
    data: testUser,
    headers: {
      'X-CSRF-Token': csrfToken
    }
  });

  expect(registerResponse.ok()).toBeTruthy();
  const userData = await registerResponse.json();
  console.log(`[AUTH SETUP] User registered: ${userData.user.id}`);

  // Step 3: Save auth state (cookies) to file
  await apiContext.storageState({ path: AUTH_STATE_FILE });
  console.log(`[AUTH SETUP] Auth state saved to ${AUTH_STATE_FILE}`);

  await apiContext.dispose();
});
