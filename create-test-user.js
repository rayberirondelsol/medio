const axios = require('axios');

const BACKEND_URL = 'https://medio-backend.fly.dev';

async function createTestUser() {
  try {
    // Step 1: Get CSRF token
    console.log('1️⃣ Fetching CSRF token...');
    const csrfResponse = await axios.get(`${BACKEND_URL}/api/csrf-token`, {
      withCredentials: true
    });

    const csrfToken = csrfResponse.data.csrfToken;
    const cookies = csrfResponse.headers['set-cookie'];
    console.log('   ✅ CSRF Token:', csrfToken);

    // Step 2: Register test user
    console.log('\n2️⃣ Registering test user: parent@example.com');
    const registerResponse = await axios.post(
      `${BACKEND_URL}/api/auth/register`,
      {
        email: 'parent@example.com',
        password: 'ParentPass123!',
        name: 'Parent Test User'
      },
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
          'Cookie': cookies ? cookies.join('; ') : ''
        },
        withCredentials: true
      }
    );

    console.log('   ✅ User created successfully!');
    console.log('   User ID:', registerResponse.data.user.id);
    console.log('   Email:', registerResponse.data.user.email);
    console.log('   Name:', registerResponse.data.user.name);

    return true;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 409) {
        console.log('   ℹ️  User already exists');
        return true;
      }
      console.error('   ❌ Error:', error.response.data.message || error.response.statusText);
      console.error('   Status:', error.response.status);
    } else {
      console.error('   ❌ Error:', error.message);
    }
    return false;
  }
}

createTestUser()
  .then(success => {
    if (success) {
      console.log('\n✅ Test user is ready for E2E tests!');
      process.exit(0);
    } else {
      console.log('\n❌ Failed to create test user');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
