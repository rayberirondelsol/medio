#!/usr/bin/env node
/**
 * Simple Production API Diagnostic Script
 * Tests the production API endpoints to diagnose video/NFC errors
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'https://medio-react-app.fly.dev';
const TEST_USER = {
  email: `diagnostic-${Date.now()}@example.com`,
  password: 'Diagnostic123!',
  name: 'Diagnostic User'
};

let authCookies = '';
let csrfToken = '';

// Helper to make requests
async function apiRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'X-CSRF-Token': csrfToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: () => true,
      timeout: 15000
    };

    if (data) config.data = data;

    const response = await axios(config);

    // Extract cookies
    if (response.headers['set-cookie']) {
      authCookies = response.headers['set-cookie']
        .map(c => c.split(';')[0])
        .join('; ');
    }

    return response;
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      error: true
    };
  }
}

async function testEndpoint(name, method, url, data = null) {
  console.log(`\n[${'='.repeat(60)}]`);
  console.log(`[TEST] ${name}`);
  console.log(`[REQUEST] ${method} ${url}`);
  if (data) console.log(`[DATA]`, JSON.stringify(data, null, 2));

  const response = await apiRequest(method, url, data);

  console.log(`[STATUS] ${response.status}`);
  console.log(`[RESPONSE]`, JSON.stringify(response.data, null, 2));

  if (response.error) {
    console.log(`[ERROR] ${response.data.error}`);
  }

  return response;
}

async function main() {
  console.log('\n🔍 MEDIO PRODUCTION API DIAGNOSTIC');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_USER.email}`);

  // Test 1: CSRF Token
  const csrfRes = await testEndpoint(
    'Fetch CSRF Token',
    'GET',
    '/api/csrf-token'
  );

  if (csrfRes.status === 200 && csrfRes.data.csrfToken) {
    csrfToken = csrfRes.data.csrfToken;
    console.log(`[✓] CSRF Token obtained`);
  } else {
    console.log(`[✗] Failed to get CSRF token - stopping here`);
    process.exit(1);
  }

  // Test 2: User Registration
  const registerRes = await testEndpoint(
    'Register Test User',
    'POST',
    '/api/auth/register',
    TEST_USER
  );

  if ([200, 201].includes(registerRes.status)) {
    console.log(`[✓] User registered successfully`);
  } else {
    console.log(`[✗] Registration failed`);
  }

  // Test 3: Auth Check
  const authRes = await testEndpoint(
    'Check Authentication',
    'GET',
    '/api/auth/me'
  );

  if (authRes.status === 200) {
    console.log(`[✓] Authentication successful`);
  } else {
    console.log(`[✗] Authentication check failed`);
  }

  // Test 4: Get Platforms
  const platformsRes = await testEndpoint(
    'Fetch Platforms',
    'GET',
    '/api/platforms'
  );

  let platformId = null;
  if (platformsRes.status === 200 && Array.isArray(platformsRes.data)) {
    const youtube = platformsRes.data.find(p => p.name === 'youtube');
    if (youtube) {
      platformId = youtube.id;
      console.log(`[✓] Platforms fetched, YouTube ID: ${platformId}`);
    }
  } else {
    console.log(`[✗] Failed to fetch platforms`);
  }

  // Test 5: Create Video (if we have platform ID)
  if (platformId) {
    const videoRes = await testEndpoint(
      'Create Test Video',
      'POST',
      '/api/videos',
      {
        platform_id: platformId,
        platform_video_id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        description: 'Diagnostic test video',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration: 213,
        age_rating: 'PG'
      }
    );

    if ([200, 201].includes(videoRes.status)) {
      console.log(`[✓] Video created successfully!`);
    } else {
      console.log(`[✗] Video creation FAILED - THIS IS YOUR BUG!`);
      console.log(`[ERROR DETAILS] Status: ${videoRes.status}`);
      console.log(`[ERROR MESSAGE]`, videoRes.data);
    }
  }

  // Test 6: Create NFC Chip
  const chipRes = await testEndpoint(
    'Register NFC Chip',
    'POST',
    '/api/nfc/chips',
    {
      chip_uid: '04:AA:BB:CC:DD:EE:FF',
      label: 'Diagnostic Test Chip'
    }
  );

  if ([200, 201].includes(chipRes.status)) {
    console.log(`[✓] NFC chip registered successfully!`);
  } else {
    console.log(`[✗] NFC chip registration FAILED - THIS IS YOUR BUG!`);
    console.log(`[ERROR DETAILS] Status: ${chipRes.status}`);
    console.log(`[ERROR MESSAGE]`, chipRes.data);
  }

  // Test 7: Logout
  await testEndpoint('Logout', 'POST', '/api/auth/logout');

  console.log('\n[' + '='.repeat(60) + ']');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('[' + '='.repeat(60) + ']\n');
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
