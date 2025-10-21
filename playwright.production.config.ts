import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Production Testing
 *
 * This config is used for testing against the production environment
 * (https://medio-react-app.fly.dev) without starting local servers.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // Increased timeout for production network latency
  expect: {
    timeout: 10000, // Increased for slower production responses
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1, // Retry once for network flakiness
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://medio-react-app.fly.dev',
    trace: 'on',
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
  },

  projects: [
    {
      name: 'chromium-production',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // No webServer for production testing
});
