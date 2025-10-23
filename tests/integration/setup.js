/**
 * Setup file for integration tests
 * Runs before each test file
 */

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Log test environment
console.log('\n=================================');
console.log('Integration Test Environment');
console.log('=================================');
console.log(`BASE_URL: ${process.env.TEST_BASE_URL || 'http://localhost:8080'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'test'}`);
console.log('=================================\n');
