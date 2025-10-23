import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for Integration Tests (API-only)
 *
 * This config is used for testing API endpoints without browser UI.
 * It doesn't require auth setup or web server.
 */
export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.spec.ts',

  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Run tests serially to maintain authentication state within each test file
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to maintain cookie state

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-integration', open: 'never' }],
  ],

  use: {
    // No browser needed for API tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
  },

  // No projects needed - these are API-only tests
});
