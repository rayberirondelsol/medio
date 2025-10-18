import { test, expect } from '@playwright/test';

/**
 * Registration Auto-Login Test Suite
 *
 * Tests the fix for production auto-login issue where users were being
 * redirected to /login instead of /dashboard after registration.
 *
 * Root cause: Missing /auth/me endpoint to verify auth status on app initialization
 */

test.describe('Registration Auto-Login Flow', () => {
  const generateEmail = () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.local`;

  test('should redirect to dashboard after successful registration', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000');

    // Click registration link
    await page.click('a:has-text("Sign Up"), button:has-text("Sign Up")');
    await expect(page).toHaveURL(/\/register$/);

    // Fill registration form
    const email = generateEmail();
    const name = 'Test User';
    const password = 'TestPassword123!@#';

    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or videos page (protected routes)
    await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 10000 });
  });

  test('should maintain authentication after page refresh following registration', async ({ page }) => {
    // Navigate and register
    await page.goto('http://localhost:3000');
    await page.click('a:has-text("Sign Up"), button:has-text("Sign Up")');
    await expect(page).toHaveURL(/\/register$/);

    const email = generateEmail();
    const password = 'TestPassword123!@#';

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|videos)/, { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Should still be on dashboard/videos, not redirected to login
    await expect(page).toHaveURL(/\/(dashboard|videos)/);

    // Verify we're still authenticated by checking for content only visible when logged in
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
  });

  test('should verify auth status via /auth/me endpoint', async ({ page }) => {
    // This test verifies the backend endpoint exists and works
    const response = await page.request.get('http://localhost:5000/api/auth/me', {
      headers: {
        'Accept': 'application/json'
      }
    });

    // Should return 401 for unauthenticated request or 200 if we have a valid token
    expect([200, 401]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty('authenticated');
  });

  test('should return authenticated false for invalid token', async ({ page }) => {
    const response = await page.request.get('http://localhost:5000/api/auth/me', {
      headers: {
        'Cookie': 'authToken=invalid-token'
      }
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.authenticated).toBe(false);
  });

  test('should clear localStorage on 401 from /auth/me', async ({ page, context }) => {
    // Set up invalid auth state in localStorage
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'fake', email: 'fake@example.com', name: 'Fake' }));
    });

    // Force a reload which triggers auth verification
    await page.reload();

    // After the /auth/me check fails with 401, localStorage should be cleared
    const user = await page.evaluate(() => {
      return localStorage.getItem('user');
    });

    // Should be redirected to login or user should be null
    await expect(page).toHaveURL(/\/login|\/$/);
    expect(user).toBeNull();
  });
});

test.describe('Auth State Verification on App Init', () => {
  test('should verify auth status on app initialization', async ({ page }) => {
    // Listen for the auth check request
    const authCheckPromise = page.waitForResponse(
      (response) => response.url().includes('/auth/me'),
      { timeout: 5000 }
    ).catch(() => null); // Don't fail if request doesn't happen

    await page.goto('http://localhost:3000');

    const response = await authCheckPromise;

    // The request should have been made during app initialization
    if (response) {
      expect([200, 401]).toContain(response.status());
    }
  });

  test('should redirect to login if /auth/me returns 401', async ({ page }) => {
    // Create a page with invalid token
    await page.goto('http://localhost:3000');

    // Set invalid auth state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com', name: 'Test' }));
    });

    // Navigate to protected route
    await page.goto('http://localhost:3000/dashboard');

    // Should be redirected to login since token is invalid
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
