import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright Configuration - No Auth Setup Required
 * For testing public pages like Kids Mode
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      // No dependencies on setup - standalone tests
    },
  ],

  // No web server needed - testing production deployment
});
