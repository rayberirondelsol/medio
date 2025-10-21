const axios = require('axios');

async function test() {
  console.log('=== Final Debug Test ===\n');
  
  // Step 1: Get CSRF token
  console.log('Step 1: Get CSRF token');
  const csrfRes = await axios.get('http://localhost:8080/api/csrf-token');
  const csrfToken = csrfRes.data.csrfToken;
  const cookies = csrfRes.headers['set-cookie'];
  console.log('CSRF Token:', csrfToken);
  console.log('Cookies from CSRF:', cookies);
  
  // Step 2: Register
  console.log('\nStep 2: Register');
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const email = `final-test-${timestamp}-${randomId}@example.com`;
  
  const registerRes = await axios.post('http://localhost:8080/api/auth/register', {
    email,
    password: 'Test123!',
    name: 'Final Test'
  }, {
    headers: {
      'X-CSRF-Token': csrfToken,
      'Cookie': cookies.join('; ')
    }
  });
  
  console.log('Register status:', registerRes.status);
  console.log('Register data:', registerRes.data);
  const authCookies = registerRes.headers['set-cookie'];
  console.log('Auth cookies:', authCookies);
  
  // Step 3: Call /me
  console.log('\nStep 3: Call /api/auth/me');
  const allCookies = [...cookies, ...authCookies].join('; ');
  console.log('Sending cookies:', allCookies);
  
  try {
    const meRes = await axios.get('http://localhost:8080/api/auth/me', {
      headers: {
        'Cookie': allCookies
      }
    });
    console.log('ME status:', meRes.status);
    console.log('ME data:', meRes.data);
  } catch (err) {
    console.log('ME ERROR status:', err.response?.status);
    console.log('ME ERROR data:', err.response?.data);
  }
}

test().catch(console.error);
