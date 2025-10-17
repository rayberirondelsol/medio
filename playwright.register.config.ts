import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tmp-playwright-register-tests',
  use: {
    baseURL: 'https://medio-react-app.fly.dev',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
