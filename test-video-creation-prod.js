const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, body, cookies, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  console.log('=== Testing Production Video Creation ===\n');

  // Step 1: Get CSRF token
  console.log('1. Getting CSRF token...');
  const csrfRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/csrf-token',
    method: 'GET'
  });
  const csrfToken = JSON.parse(csrfRes.body).csrfToken;
  const csrfCookie = csrfRes.cookies[0];
  console.log('   ✓ CSRF token:', csrfToken.substring(0, 20) + '...');

  // Step 2: Register unique user
  const timestamp = Date.now();
  const testUser = {
    email: `test+prodfix${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: 'Production Test User'
  };

  console.log('\n2. Registering user:', testUser.email);
  const registerRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Cookie': csrfCookie
    }
  }, testUser);

  if (registerRes.status !== 201) {
    console.error('   ✗ Registration failed:', registerRes.status, registerRes.body);
    process.exit(1);
  }
  const authCookie = registerRes.cookies.find(c => c.startsWith('authToken='));
  const refreshCookie = registerRes.cookies.find(c => c.startsWith('refreshToken='));
  console.log('   ✓ User registered successfully');

  // Step 3: Get platforms
  console.log('\n3. Fetching platforms...');

  if (!authCookie) {
    console.error('   ✗ No auth cookie received from registration');
    console.log('   Available cookies:', registerRes.cookies);
    process.exit(1);
  }

  const platformsRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/platforms',
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });

  if (platformsRes.status !== 200) {
    console.error('   ✗ Platforms fetch failed:', platformsRes.status, platformsRes.body);
    process.exit(1);
  }

  const platformsData = JSON.parse(platformsRes.body);
  console.log('   Platforms response:', JSON.stringify(platformsData, null, 2));

  const platformsList = platformsData.data || platformsData;
  const youtubePlatform = platformsList.find(p => p.name === 'YouTube');

  if (!youtubePlatform) {
    console.error('   ✗ YouTube platform not found in:', platformsList);
    process.exit(1);
  }

  console.log('   ✓ Found YouTube platform:', youtubePlatform.id);

  // Step 4: Create video
  console.log('\n4. Creating video...');
  const videoData = {
    title: 'Test Video Production',
    description: 'Testing video creation in production',
    thumbnail_url: 'https://example.com/thumb.jpg',
    platform_id: youtubePlatform.id,
    platform_video_id: 'dQw4w9WgXcQ',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration_seconds: 212,
    age_rating: 'G'
  };

  const videoRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/videos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Cookie': `${csrfCookie}; ${authCookie}`
    }
  }, videoData);

  console.log('\n=== RESULT ===');
  console.log('Status:', videoRes.status);
  console.log('Response:', videoRes.body);

  if (videoRes.status === 201) {
    console.log('\n✅ SUCCESS: Video creation works!');
    const video = JSON.parse(videoRes.body);
    console.log('Created video ID:', video.id);
    console.log('Title:', video.title);
    console.log('Platform video ID:', video.platform_video_id);
    console.log('Duration:', video.duration_seconds, 'seconds');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED: Video creation returned', videoRes.status);
    process.exit(1);
  }
})();
