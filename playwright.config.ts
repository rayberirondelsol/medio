import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration - Medio Visual Testing Suite
 *
 * Features:
 * - Visual regression testing with screenshot comparisons
 * - Responsive testing (desktop, tablet, mobile)
 * - Cross-browser testing (Chromium, Firefox, WebKit)
 * - Accessibility testing integration
 * - Shared authentication state to avoid repeated logins
 */
export default defineConfig({
  testDir: './tests',

  // Visual snapshot configuration
  snapshotDir: './tests/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{projectName}-{arg}{ext}',

  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    // Visual comparison thresholds
    toHaveScreenshot: {
      // Maximum pixel ratio difference
      maxDiffPixelRatio: 0.1,
      // Allow small differences in anti-aliasing
      threshold: 0.2,
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Multi-browser and responsive testing projects
  projects: [
    // Setup project - runs once to generate authenticated state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },


    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Tablet viewports
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'mobile-iphone',
      use: {
        ...devices['iPhone 12'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-android',
      use: {
        ...devices['Pixel 5'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      cwd: './backend',
      port: 5000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});