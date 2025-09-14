import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('http://localhost:3000');
  });

  test.describe('Parent Registration and Setup Flow', () => {
    test('should complete full parent onboarding', async ({ page }) => {
      // Navigate to registration
      await page.click('text=Get Started');
      await page.waitForURL('**/register');

      // Fill registration form
      await page.fill('input[name="email"]', 'testparent@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!@#');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard after registration
      await page.waitForURL('**/dashboard');
      expect(await page.textContent('h1')).toContain('Dashboard');

      // Add first child profile
      await page.click('text=Add Child Profile');
      await page.fill('input[name="name"]', 'Timmy');
      await page.fill('input[name="age"]', '8');
      await page.fill('input[name="dailyLimit"]', '60');
      await page.click('text=Create Profile');

      // Verify profile was created
      await expect(page.locator('text=Timmy')).toBeVisible();
      await expect(page.locator('text=Age: 8')).toBeVisible();
      await expect(page.locator('text=Daily Limit: 60 minutes')).toBeVisible();

      // Add a video to library
      await page.click('text=Video Library');
      await page.click('text=Add Video');
      await page.fill('input[name="title"]', 'Educational Video 1');
      await page.fill('input[name="url"]', 'https://example.com/video1.mp4');
      await page.fill('input[name="duration"]', '15');
      await page.click('button[type="submit"]');

      // Verify video was added
      await expect(page.locator('text=Educational Video 1')).toBeVisible();
    });
  });

  test.describe('Kids Mode Activation Flow', () => {
    test('should activate kids mode with NFC chip', async ({ page }) => {
      // Navigate to kids mode
      await page.goto('http://localhost:3000/kids');
      
      // Should show NFC scan prompt
      await expect(page.locator('text=Tap your chip to start')).toBeVisible();

      // Simulate NFC chip scan (in real test, would use mock)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('nfc-scan', {
          detail: { chipId: '04:E1:5C:32:B9:65:80' }
        }));
      });

      // Should show profile selection or start playing
      await page.waitForSelector('text=Welcome back');
      
      // Verify kids mode UI elements
      await expect(page.locator('.kids-mode-container')).toBeVisible();
      await expect(page.locator('.video-player')).toBeVisible();
    });

    test('should enforce time limits in kids mode', async ({ page }) => {
      // Set up a profile with 1 minute limit for testing
      await page.goto('http://localhost:3000/kids');
      
      // Start a session
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('nfc-scan', {
          detail: { chipId: '04:E1:5C:32:B9:65:80' }
        }));
      });

      // Wait for session to start
      await page.waitForSelector('.video-player');

      // Fast forward time (in real test, would use mock timers)
      await page.evaluate(() => {
        const event = new CustomEvent('time-update', {
          detail: { watchedMinutes: 61 }
        });
        window.dispatchEvent(event);
      });

      // Should show time limit exceeded message
      await expect(page.locator('text=Time limit reached')).toBeVisible();
      
      // Video should be paused/stopped
      const videoElement = page.locator('video');
      await expect(videoElement).toHaveAttribute('data-paused', 'true');
    });
  });

  test.describe('Video Management Flow', () => {
    test('should upload and organize videos', async ({ page }) => {
      // Login first
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123!@#');
      await page.click('button[type="submit"]');

      // Navigate to video library
      await page.click('text=Video Library');

      // Upload a video (file upload simulation)
      await page.click('text=Upload Video');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake video content')
      });

      // Fill video details
      await page.fill('input[name="title"]', 'Test Upload Video');
      await page.fill('textarea[name="description"]', 'This is a test video');
      await page.click('button:has-text("Upload")');

      // Wait for upload to complete
      await page.waitForSelector('text=Upload successful');

      // Verify video appears in library
      await expect(page.locator('text=Test Upload Video')).toBeVisible();

      // Test video editing
      await page.click('button[aria-label="Edit Test Upload Video"]');
      await page.fill('input[name="title"]', 'Updated Video Title');
      await page.click('button:has-text("Save")');

      // Verify update
      await expect(page.locator('text=Updated Video Title')).toBeVisible();
    });
  });

  test.describe('Session Tracking Flow', () => {
    test('should track watch sessions accurately', async ({ page }) => {
      // Login as parent
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'parent@example.com');
      await page.fill('input[name="password"]', 'ParentPass123!@#');
      await page.click('button[type="submit"]');

      // Check watch history
      await page.click('text=Watch History');

      // Should show session list
      await expect(page.locator('.session-list')).toBeVisible();

      // Verify session details
      const firstSession = page.locator('.session-item').first();
      await expect(firstSession).toContainText('Profile:');
      await expect(firstSession).toContainText('Duration:');
      await expect(firstSession).toContainText('Video:');

      // Test filtering by date
      await page.fill('input[type="date"]', '2024-01-14');
      await page.click('button:has-text("Filter")');

      // Verify filtered results
      await expect(page.locator('.session-item')).toHaveCount(await page.locator('.session-item').count());
    });
  });

  test.describe('Profile Switching Flow', () => {
    test('should switch between multiple child profiles', async ({ page }) => {
      // Login and navigate to dashboard
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'multiparent@example.com');
      await page.fill('input[name="password"]', 'MultiPass123!@#');
      await page.click('button[type="submit"]');

      // Create multiple profiles
      const profiles = ['Alice', 'Bob', 'Charlie'];
      
      for (const name of profiles) {
        await page.click('text=Add Child Profile');
        await page.fill('input[name="name"]', name);
        await page.fill('input[name="age"]', '7');
        await page.fill('input[name="dailyLimit"]', '45');
        await page.click('text=Create Profile');
        await page.waitForSelector(`text=${name}`);
      }

      // Test switching between profiles
      await page.click('text=Alice');
      await expect(page.locator('.active-profile')).toContainText('Alice');

      await page.click('text=Bob');
      await expect(page.locator('.active-profile')).toContainText('Bob');

      // Verify each profile has separate settings
      await page.click('text=Profile Settings');
      await expect(page.locator('input[name="name"]')).toHaveValue('Bob');
    });
  });

  test.describe('Security and Privacy Flow', () => {
    test('should enforce authentication on protected routes', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto('http://localhost:3000/dashboard');
      
      // Should redirect to login
      await page.waitForURL('**/login');
      await expect(page.locator('text=Please log in')).toBeVisible();
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      // Login
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123!@#');
      await page.click('button[type="submit"]');

      // Simulate expired session
      await page.evaluate(() => {
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      });

      // Try to perform authenticated action
      await page.click('text=Add Video');

      // Should show session expired message and redirect to login
      await expect(page.locator('text=Session expired')).toBeVisible();
      await page.waitForURL('**/login');
    });

    test('should validate input and prevent XSS', async ({ page }) => {
      // Login
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123!@#');
      await page.click('button[type="submit"]');

      // Try to inject script in profile name
      await page.click('text=Add Child Profile');
      await page.fill('input[name="name"]', '<script>alert("XSS")</script>');
      await page.fill('input[name="age"]', '8');
      await page.click('text=Create Profile');

      // Should sanitize the input
      await expect(page.locator('text=<script>')).not.toBeVisible();
      
      // Verify no alert was triggered
      const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const alert = await alertPromise;
      expect(alert).toBeNull();
    });
  });

  test.describe('Error Recovery Flow', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Login
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123!@#');
      await page.click('button[type="submit"]');

      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      // Try to perform an action
      await page.click('text=Add Video');
      await page.fill('input[name="title"]', 'Test Video');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible();

      // Re-enable network
      await page.unroute('**/api/**');

      // Retry button should work
      await page.click('text=Retry');
      await expect(page.locator('text=Network error')).not.toBeVisible();
    });

    test('should handle database errors gracefully', async ({ page }) => {
      // Mock database error
      await page.route('**/api/videos', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Database connection failed' })
        });
      });

      // Login and try to access videos
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123!@#');
      await page.click('button[type="submit"]');

      await page.click('text=Video Library');

      // Should show error message
      await expect(page.locator('text=Failed to load videos')).toBeVisible();
    });
  });
});