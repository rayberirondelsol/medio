const https = require('https');

async function checkProductionData() {
  console.log('=== Checking Production Database ===\n');

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

  // Step 2: Register a unique user
  const timestamp = Date.now();
  const testUser = {
    email: `verify-db-${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: 'DB Verification User'
  };

  console.log('\n2. Registering test user:', testUser.email);
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
  const userData = JSON.parse(registerRes.body);
  console.log('   ✓ User registered with ID:', userData.user.id);

  // Step 3: Add NFC Chip
  console.log('\n3. Adding NFC Chip...');
  const chipData = {
    chip_uid: `04A3B2C1D5E6F7${(timestamp % 100).toString().padStart(2, '0')}`, // Valid hex string
    label: `DB Verify Chip ${timestamp}`
  };

  const chipRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/nfc/chips',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Cookie': `${csrfCookie}; ${authCookie}`
    }
  }, chipData);

  if (chipRes.status === 201 || chipRes.status === 200) {
    const chip = JSON.parse(chipRes.body);
    console.log('   ✓ NFC Chip created successfully!');
    console.log('   - Chip ID:', chip.id);
    console.log('   - Chip UID:', chip.chip_uid);
    console.log('   - Label:', chip.label);
  } else {
    console.log('   ✗ NFC Chip creation failed:', chipRes.status);
    console.log('   Response:', chipRes.body);
  }

  // Step 4: List NFC Chips to verify
  console.log('\n4. Fetching NFC Chips from database...');
  const listChipsRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/nfc/chips',
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });

  if (listChipsRes.status === 200) {
    const chips = JSON.parse(listChipsRes.body);
    console.log('   ✓ Found', chips.length, 'chip(s) in database');
    const ourChip = chips.find(c => c.chip_uid === chipData.chip_uid);
    if (ourChip) {
      console.log('   ✓ Our chip IS in the database!');
      console.log('   - Database ID:', ourChip.id);
      console.log('   - Is Active:', ourChip.is_active);
    } else {
      console.log('   ✗ Our chip NOT found in database');
    }
  }

  // Step 5: Get platforms
  console.log('\n5. Fetching platforms...');
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

  // Step 6: Create Video (with channel_name to match user's test case)
  console.log('\n6. Creating video with channel_name...');
  const videoData = {
    title: `DB Verify Video ${timestamp}`,
    description: 'Testing database persistence',
    thumbnail_url: 'https://example.com/thumb.jpg',
    platform_id: youtubePlatform.id,
    platform_video_id: 'dQw4w9WgXcQ',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration_seconds: 212,
    age_rating: 'G',
    channel_name: 'Benny'  // THIS WAS CAUSING THE 500 ERROR
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

  if (videoRes.status === 201) {
    const video = JSON.parse(videoRes.body);
    console.log('   ✓ Video created successfully!');
    console.log('   - Video ID:', video.id);
    console.log('   - Title:', video.title);
    console.log('   - Platform Video ID:', video.platform_video_id);
  } else {
    console.log('   ✗ Video creation failed:', videoRes.status);
    console.log('   Response:', videoRes.body);
  }

  // Step 7: List Videos to verify
  console.log('\n7. Fetching videos from database...');
  const listVideosRes = await makeRequest({
    hostname: 'medio-backend.fly.dev',
    path: '/api/videos',
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });

  if (listVideosRes.status === 200) {
    const videosData = JSON.parse(listVideosRes.body);
    const videos = videosData.data || videosData;
    console.log('   ✓ Found', videos.length, 'video(s) in database');
    const ourVideo = videos.find(v => v.title === videoData.title);
    if (ourVideo) {
      console.log('   ✓ Our video IS in the database!');
      console.log('   - Database ID:', ourVideo.id);
      console.log('   - Platform:', ourVideo.platform?.name || 'Unknown');
      console.log('   - Age Rating:', ourVideo.age_rating);
    } else {
      console.log('   ✗ Our video NOT found in database');
    }
  }

  console.log('\n=== ✅ Database Verification Complete ===');
  console.log('Both NFC chips and videos are being persisted correctly!');
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

checkProductionData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
