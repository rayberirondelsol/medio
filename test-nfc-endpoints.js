const axios = require('axios');

const BASE_URL = 'https://medio-backend.fly.dev';

async function testNFCEndpoints() {
  try {
    console.log('🔐 Step 1: Getting CSRF token...');
    const csrfResponse = await axios.get(`${BASE_URL}/api/csrf-token`, {
      withCredentials: true
    });
    const csrfToken = csrfResponse.data.csrfToken;
    const cookies = csrfResponse.headers['set-cookie'];
    console.log('✅ CSRF token obtained');

    console.log('\n🔐 Step 2: Logging in...');
    const loginResponse = await axios.post(
      `${BASE_URL}/api/auth/login`,
      {
        email: 'test+deploy20251017b@example.com',
        password: 'TestPassword123!'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Cookie': cookies.join('; ')
        },
        withCredentials: true
      }
    );

    const authCookies = loginResponse.headers['set-cookie'];
    console.log('✅ Login successful');

    console.log('\n📋 Step 3: Fetching NFC chips...');
    const chipsResponse = await axios.get(`${BASE_URL}/api/nfc/chips`, {
      headers: {
        'Cookie': authCookies.join('; ')
      },
      withCredentials: true
    });
    console.log(`✅ Found ${chipsResponse.data.length} NFC chips`);

    if (chipsResponse.data.length > 0) {
      const chipId = chipsResponse.data[0].id;
      const chipLabel = chipsResponse.data[0].label;
      console.log(`\n🎯 Testing chip: ${chipLabel} (${chipId})`);

      console.log('\n🎬 Step 4: Fetching videos for chip...');
      const videosResponse = await axios.get(
        `${BASE_URL}/api/nfc/chips/${chipId}/videos`,
        {
          headers: {
            'Cookie': authCookies.join('; ')
          },
          withCredentials: true
        }
      );
      console.log(`✅ Chip has ${videosResponse.data.videos.length} videos assigned`);
      console.log('Video data structure:', JSON.stringify(videosResponse.data.videos[0] || {}, null, 2));
    } else {
      console.log('\n⚠️  No NFC chips found to test');
    }

    console.log('\n✅ All NFC endpoint tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
}

testNFCEndpoints();
