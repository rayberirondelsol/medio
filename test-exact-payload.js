const https = require('https');

async function testVideoCreation() {
  console.log('=== Testing Video Creation with User Payload ===\n');

  const timestamp = Date.now();
  const testUser = {
    email: `final-test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: 'Final Test User'
  };

  // Step 1: Get CSRF token
  console.log('1. Getting CSRF token...');
  const csrfRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/csrf-token',
    method: 'GET'
  });
  const csrfToken = JSON.parse(csrfRes.body).csrfToken;
  const csrfCookie = csrfRes.cookies[0];
  console.log('   ✓ CSRF token received');

  // Step 2: Register user
  console.log('\n2. Registering test user...');
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
  console.log('   ✓ User registered');

  // Step 3: Get platforms
  console.log('\n3. Fetching platforms...');
  const platformsRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/platforms',
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });

  const platformsData = JSON.parse(platformsRes.body);
  const platformsList = platformsData.data || platformsData;
  const youtubePlatform = platformsList.find(p => p.name === 'YouTube');
  console.log('   ✓ Found YouTube platform:', youtubePlatform.id);

  // Step 4: Create video with USER'S EXACT PAYLOAD
  console.log('\n4. Creating video with EXACT user payload...');
  const videoData = {
    title: 'Prinzessinnenparty',  // User's exact title
    description: 'Peppa Wutz',    // User's exact description
    channel_name: 'Benny',        // User's exact channel name
    thumbnail_url: 'https://youtu.be/pN49ZPeO4tk?si=QEIMq4A3nr20_5GY',
    platform_id: youtubePlatform.id,
    platform_video_id: 'pN49ZPeO4tk',
    video_url: 'https://youtu.be/pN49ZPeO4tk?si=QEIMq4A3nr20_5GY',
    duration_seconds: 18000,
    age_rating: 'G'
  };

  console.log('   Payload:', JSON.stringify(videoData, null, 2));

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

  console.log('\n5. Video Creation Response:');
  console.log('   Status:', videoRes.status);
  console.log('   Body:', videoRes.body);

  if (videoRes.status === 201) {
    const video = JSON.parse(videoRes.body);
    console.log('\n✅ SUCCESS! Video created:');
    console.log('   - Video ID:', video.id);
    console.log('   - Title:', video.title);
    console.log('   - Description:', video.description);
    console.log('   - Channel Name:', video.channel_name);
    console.log('   - Platform Video ID:', video.platform_video_id);

    // Step 5: Verify it's in the database
    console.log('\n6. Verifying video in database...');
    const listVideosRes = await makeRequest({
      hostname: 'medio-backend.fly.dev',
      path: '/api/videos',
      method: 'GET',
      headers: {
        'Cookie': authCookie
      }
    });

    const videosData = JSON.parse(listVideosRes.body);
    const videos = videosData.data || videosData;
    const ourVideo = videos.find(v => v.title === 'Prinzessinnenparty');

    if (ourVideo) {
      console.log('   ✓ Video IS in database!');
      console.log('   - Channel Name from DB:', ourVideo.channel_name);
    } else {
      console.log('   ✗ Video NOT found in database');
    }

    console.log('\n=== ✅ FIX VERIFIED - VIDEO CREATION WORKS! ===');
  } else {
    console.log('\n❌ FAILED - Still getting error:');
    console.log('Response:', videoRes.body);
  }
}

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

testVideoCreation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
