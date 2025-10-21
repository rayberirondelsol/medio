#!/usr/bin/env node

/**
 * Test script to validate CSRF token flow for cross-domain requests
 * Simulates the production scenario: frontend.fly.dev -> backend.fly.dev
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://medio-backend.fly.dev';
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'https://medio-react-app.fly.dev';

// Create axios instance matching frontend configuration
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 30000,
});

let csrfToken = null;

// Simulate frontend interceptor logic
axiosInstance.interceptors.request.use(
  async (config) => {
    // For POST/PUT/PATCH/DELETE requests, fetch and attach CSRF token
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      if (!csrfToken) {
        try {
          console.log('Fetching CSRF token from /api/csrf-token...');
          const response = await axios.get(`${BACKEND_URL}/api/csrf-token`, {
            withCredentials: true,
          });
          csrfToken = response.data.csrfToken;
          console.log(`✓ Got CSRF token: ${csrfToken.substring(0, 20)}...`);
        } catch (error) {
          console.error('✗ Failed to fetch CSRF token:', error.message);
          return Promise.reject(error);
        }
      }

      // Attach CSRF token to header
      config.headers['X-CSRF-Token'] = csrfToken;
      console.log(`✓ Attached CSRF token to ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

async function testCSRFFlow() {
  console.log('\n=== CSRF Token Flow Test for NFC Chip Registration ===\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_ORIGIN}\n`);

  try {
    // Step 1: Fetch CSRF token
    console.log('Step 1: Fetch CSRF token');
    console.log('Request: GET /api/csrf-token');
    const csrfResponse = await axiosInstance.get('/api/csrf-token');
    console.log(`Status: ${csrfResponse.status}`);
    console.log(`Response: ${JSON.stringify(csrfResponse.data)}\n`);

    // Step 2: Attempt NFC chip registration with token
    console.log('Step 2: Register NFC chip with CSRF token');
    console.log('Request: POST /api/nfc/chips');
    console.log(`Payload: {"chip_uid":"04:5A:B2:C3:D4:E5:F6", "label":"Test Chip"}`);

    // Note: This will likely fail with 401 if not authenticated, which is expected
    // The important part is that it doesn't fail with 403 CSRF error
    try {
      const nfcResponse = await axiosInstance.post('/api/nfc/chips', {
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: 'Test Chip'
      });
      console.log(`Status: ${nfcResponse.status}`);
      console.log(`✓ Successfully registered chip: ${JSON.stringify(nfcResponse.data)}\n`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`Status: ${error.response.status}`);
        console.log(`✓ Got 401 (expected - not authenticated), but NOT 403 CSRF error`);
        console.log(`  This means CSRF protection accepted the token!\n`);
      } else if (error.response?.status === 403) {
        const message = error.response.data?.message;
        if (message?.includes('CSRF') || message?.includes('csrf')) {
          console.log(`Status: ${error.response.status}`);
          console.log(`✗ CSRF Error: ${message}`);
          console.log(`  CSRF token flow is NOT working correctly\n`);
          process.exit(1);
        } else {
          console.log(`Status: ${error.response.status}`);
          console.log(`Message: ${message}`);
          console.log(`✓ Got 403 for different reason (not CSRF), token was accepted\n`);
        }
      } else {
        throw error;
      }
    }

    console.log('=== Test Result ===');
    console.log('✓ CSRF token flow is working correctly!');
    console.log('  - /api/csrf-token endpoint accessible');
    console.log('  - CSRF token can be fetched');
    console.log('  - CSRF token is accepted in X-CSRF-Token header');
    process.exit(0);

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testCSRFFlow();
