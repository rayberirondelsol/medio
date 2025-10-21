// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Production Testing Configuration
 * For testing against https://medio-react-app.fly.dev
 * No webServer needed, no auth setup required
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://medio-react-app.fly.dev',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: false, // Show browser
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
