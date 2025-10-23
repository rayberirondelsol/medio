/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

const axios = require('axios');

module.exports = async () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

  console.log('\n🔧 Global Setup: Verifying API availability...\n');

  try {
    // Wait for API to be available (max 30 seconds)
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(`${BASE_URL}/health`, {
          timeout: 5000,
          validateStatus: () => true
        });

        if (response.status === 200 || response.status === 503) {
          console.log(`✅ API is responding at ${BASE_URL}`);
          console.log(`   Health status: ${response.status}`);
          if (response.data) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
          break;
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`API not available at ${BASE_URL} after ${maxRetries} retries`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ Global Setup Complete\n');
  } catch (error) {
    console.error('\n❌ Global Setup Failed:', error.message);
    console.error('   Make sure the API server is running at:', BASE_URL);
    throw error;
  }
};
