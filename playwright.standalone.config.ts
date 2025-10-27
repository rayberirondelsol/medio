import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright Configuration - No Auth Required
 * Use for testing public pages like Kids Mode
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/kids-mode-manual-test.spec.ts',

  timeout: 120 * 1000, // 2 minutes
  expect: {
    timeout: 10000,
  },

  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
  ],

  use: {
    headless: false, // Show browser
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
