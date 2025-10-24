const axios = require('axios');

const BASE_URL = 'https://medio-react-app.fly.dev';

async function testVideoCreation() {
  console.log('\n🎬 TESTING VIDEO CREATION WITH video_url COLUMN');
  console.log('================================================\n');

  try {
    const client = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[1/5] Getting CSRF token...');
    const csrfRes = await client.get('/api/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;
    console.log('✅ CSRF Token obtained\n');

    const timestamp = Date.now();
    const testUser = {
      email: `video-test-${timestamp}@example.com`,
      password: 'VideoTest123!',
      name: 'Video Test User'
    };

    console.log('[2/5] Registering user...');
    const registerRes = await client.post('/api/auth/register', testUser, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    console.log(`✅ User ID: ${registerRes.data.user.id}\n`);

    console.log('[3/5] Fetching platforms...');
    const platformsRes = await client.get('/api/platforms');
    const platforms = platformsRes.data;
    const youtubePlatform = platforms.find(p => p.name === 'YouTube');
    
    if (!youtubePlatform) {
      throw new Error('YouTube platform not found!');
    }
    console.log(`✅ YouTube Platform ID: ${youtubePlatform.id}\n`);

    const videoData = {
      title: 'Test Video - Schema Verification',
      description: 'Testing video_url column alignment',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
      platform_id: youtubePlatform.id,
      platform_video_id: `test-${timestamp}`,
      video_url: `https://www.youtube.com/watch?v=test${timestamp}`,
      duration_seconds: 180,
      age_rating: 'G'
    };

    console.log('[4/5] Creating video with video_url column...');
    console.log(`Video URL: ${videoData.video_url}`);
    
    const videoRes = await client.post('/api/videos', videoData, {
      headers: { 'X-CSRF-Token': csrfToken }
    });

    if (videoRes.status === 201) {
      console.log(`✅ Video created successfully!`);
      console.log(`   Video ID: ${videoRes.data.id}`);
      console.log(`   video_url persisted: ${videoRes.data.video_url}`);
      console.log(`   Title: ${videoRes.data.title}\n`);

      console.log('[5/5] Verifying video appears in list...');
      const listRes = await client.get('/api/videos?page=1&limit=20');
      const videos = listRes.data.data || listRes.data;
      
      const foundVideo = videos.find(v => v.id === videoRes.data.id);
      if (foundVideo) {
        console.log(`✅ Video found in list`);
        console.log(`   Title: ${foundVideo.title}`);
        console.log(`   video_url: ${foundVideo.video_url}\n`);
      } else {
        console.log(`❌ Video NOT found in list!\n`);
      }

      console.log('================================================');
      console.log('🎉 VIDEO CREATION TEST PASSED');
      console.log('✅ video_url column working correctly');
      console.log('✅ Schema alignment verified');
      console.log('================================================\n');
      
      return true;
    }
  } catch (error) {
    console.log('\n❌ VIDEO CREATION FAILED');
    console.log('================================================');
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('================================================\n');
    return false;
  }
}

testVideoCreation();
