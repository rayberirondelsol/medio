import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for BFF Proxy E2E Tests
 * Tests same-origin authentication via frontend proxy
 *
 * Prerequisites:
 * - Backend running on http://localhost:5000
 * - Proxy running on http://localhost:8080 (node server.js)
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  // No webServer - servers must be started manually
});
