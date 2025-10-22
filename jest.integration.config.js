/**
 * Jest Configuration for Integration Tests
 *
 * These tests make actual HTTP requests to the API endpoints
 * and verify end-to-end functionality without mocking.
 */

module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 30000, // 30 seconds (for slow network/API calls)
  verbose: true,
  collectCoverage: false, // Don't collect coverage for integration tests
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Integration Test Report',
        outputPath: 'test-results/integration-test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],
};
