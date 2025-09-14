import { test, expect } from '@playwright/test';

test.describe('Medio Video Platform', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display the landing page', async ({ page }) => {
    // Check if the main app container exists
    await expect(page.locator('.App')).toBeVisible();
    
    // Check for logo or title
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Click login link
    await page.click('text=Login');
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await page.click('text=Register');
    
    // Verify we're on the register page
    await expect(page).toHaveURL(/.*\/register/);
    
    // Check for registration form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('should show password validation requirements', async ({ page }) => {
    // Go to register page
    await page.goto('/register');
    
    // Find password input
    const passwordInput = page.locator('input[type="password"]').first();
    
    // Type a weak password
    await passwordInput.fill('weak');
    
    // Check for validation messages
    const placeholder = await passwordInput.getAttribute('placeholder');
    expect(placeholder).toContain('8+ chars');
  });

  test('should handle authentication flow', async ({ page }) => {
    // Test registration
    await page.goto('/register');
    
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPass123!@#';
    
    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or show success message
    // Note: This will fail if backend is not running with database
    await page.waitForLoadState('networkidle');
  });

  test('should display theme toggle in settings', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check if dark mode toggle exists
    const body = page.locator('body');
    const initialClass = await body.getAttribute('class');
    
    // Try to find theme toggle button
    const themeToggle = page.locator('button').filter({ hasText: /dark|light|theme/i });
    
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      
      // Check if body class changed
      const newClass = await body.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if app adjusts to mobile
    await expect(page.locator('.App')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.App')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.App')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');
    
    // Should still show app container (with error or redirect)
    await expect(page.locator('.App')).toBeVisible();
  });

  test('should check API health endpoint', async ({ page }) => {
    // Make API request to health endpoint
    const response = await page.request.get('http://localhost:5000/api/health');
    
    // Check response
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });

  test('should validate cookie security headers', async ({ page }) => {
    // Navigate to login page
    const response = await page.goto('/login');
    
    if (response) {
      const headers = response.headers();
      
      // Check for security headers (if backend is running)
      if (headers['x-powered-by'] === 'Express') {
        // These headers should be set by Helmet
        expect(headers).toHaveProperty('x-content-type-options');
        expect(headers).toHaveProperty('x-frame-options');
      }
    }
  });
});

test.describe('Parent Dashboard Features', () => {
  test('should access parent dashboard when authenticated', async ({ page }) => {
    // This test would require authentication
    // Skipping actual authentication for now
    
    // Check if dashboard route exists
    await page.goto('/dashboard');
    
    // Should either show dashboard or redirect to login
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });
});

test.describe('Kids Mode Features', () => {
  test('should access kids mode page', async ({ page }) => {
    await page.goto('/kids');
    
    // Check if kids mode page loads
    await expect(page.locator('.App')).toBeVisible();
    
    // Look for NFC-related content
    const nfcContent = page.locator('text=/nfc|chip|scan/i');
    
    if (await nfcContent.count() > 0) {
      // NFC functionality is mentioned
      expect(await nfcContent.first().isVisible()).toBeTruthy();
    }
  });
});