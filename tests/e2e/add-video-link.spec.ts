/**
 * T020: Add Video Link E2E Test
 * T040-T041: Extended E2E Tests for Vimeo and Dailymotion
 *
 * End-to-end test for the complete "Add Video by Link" user flow.
 * Tests the integration of all components from UI interaction to database persistence
 * for YouTube, Vimeo, and Dailymotion platforms.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Add YouTube Video by Link', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Setup: Create a new page and log in
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Login (assuming auth is implemented)
    await page.click('button:has-text("Login")');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to library
    await page.waitForURL('**/library');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should successfully add a YouTube video by pasting URL', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act - Open Add Video modal
    await page.click('button:has-text("Add Video")');

    // Assert - Modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Add Video')).toBeVisible();

    // Act - Paste YouTube URL
    const urlInput = page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]'));
    await urlInput.fill(youtubeUrl);

    // Assert - Metadata auto-fills within 3 seconds
    await expect(page.locator('input[name="title"]')).toHaveValue(
      'Rick Astley - Never Gonna Give You Up (Official Video)',
      { timeout: 3000 }
    );

    await expect(page.locator('textarea[name="description"]')).toContainText(
      'Never Gonna Give You Up',
      { timeout: 3000 }
    );

    // Assert - Thumbnail is displayed
    const thumbnail = page.locator('img[alt*="thumbnail"]').or(page.locator('img[alt*="preview"]'));
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', /dQw4w9WgXcQ/);

    // Assert - Channel name is displayed
    await expect(page.locator('text=Rick Astley')).toBeVisible();

    // Act - Select age rating
    await page.selectOption('select[name="age_rating"]', 'all_ages');

    // Act - Submit form
    await page.click('button:has-text("Add Video")');

    // Assert - Modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Assert - Success notification appears
    await expect(page.locator('text=Video added successfully')).toBeVisible({ timeout: 5000 });

    // Assert - Video appears in library
    await expect(page.locator('text=Rick Astley - Never Gonna Give You Up')).toBeVisible();

    // Assert - Video card shows thumbnail
    const libraryThumbnail = page.locator('img[alt*="Rick Astley"]').or(page.locator('img[src*="dQw4w9WgXcQ"]'));
    await expect(libraryThumbnail).toBeVisible();
  });

  test('should detect platform automatically from URL', async () => {
    // Arrange
    const youtubeUrl = 'https://youtu.be/dQw4w9WgXcQ';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);

    // Assert - Platform is auto-detected
    await expect(page.locator('text=YouTube')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid YouTube URL', async () => {
    // Arrange
    const invalidUrl = 'https://www.example.com/not-a-video';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(invalidUrl);

    // Assert - Error message is shown
    await expect(page.locator('text=Invalid YouTube URL')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for non-existent YouTube video', async () => {
    // Arrange
    const nonExistentUrl = 'https://www.youtube.com/watch?v=nonexistent123';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(nonExistentUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video not found').or(page.locator('text=Could not fetch video'))).toBeVisible();
  });

  test('should show error for private YouTube video', async () => {
    // Arrange
    const privateVideoUrl = 'https://www.youtube.com/watch?v=privateVideo123';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(privateVideoUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video is private').or(page.locator('text=Video not found'))).toBeVisible();
  });

  test('should prevent duplicate video from being added', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=testDuplicate';

    // Act - Add video first time
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);
    await page.waitForTimeout(2000); // Wait for metadata
    await page.selectOption('select[name="age_rating"]', 'all_ages');
    await page.click('button:has-text("Add Video")');
    await page.waitForTimeout(1000);

    // Act - Try to add same video again
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);
    await page.waitForTimeout(1000);

    // Assert - Error message or warning is shown
    await expect(page.locator('text=already exists').or(page.locator('text=already added'))).toBeVisible();
  });

  test('should allow user to manually edit auto-filled metadata', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const customTitle = 'My Custom Title for This Video';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);

    // Wait for auto-fill
    await page.waitForTimeout(2000);

    // Act - Edit title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    await titleInput.fill(customTitle);

    // Act - Submit
    await page.selectOption('select[name="age_rating"]', 'all_ages');
    await page.click('button:has-text("Add Video")');

    // Assert - Video is added with custom title
    await expect(page.locator(`text=${customTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should require age rating selection before submitting', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);
    await page.waitForTimeout(2000); // Wait for metadata

    // Act - Try to submit without selecting age rating
    await page.click('button:has-text("Add Video")');

    // Assert - Validation error is shown
    await expect(page.locator('text=Age rating is required').or(page.locator('select[name="age_rating"]:invalid'))).toBeVisible();
  });

  test('should show loading state while fetching metadata', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);

    // Assert - Loading indicator is shown
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).toBeVisible({ timeout: 1000 });

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Assert - Loading indicator is hidden
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).not.toBeVisible();
  });

  test('should cancel and close modal without adding video', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);
    await page.waitForTimeout(2000);

    // Act - Click cancel
    await page.click('button:has-text("Cancel")');

    // Assert - Modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Assert - Video was not added
    await expect(page.locator('text=Rick Astley - Never Gonna Give You Up')).not.toBeVisible();
  });

  test('should handle different YouTube URL formats', async () => {
    const urlFormats = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'http://youtube.com/watch?v=dQw4w9WgXcQ'
    ];

    for (const url of urlFormats) {
      // Act
      await page.click('button:has-text("Add Video")');
      await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(url);

      // Assert - Metadata is fetched successfully
      await expect(page.locator('input[name="title"]')).toHaveValue(
        /Rick Astley/,
        { timeout: 3000 }
      );

      // Close modal
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(500);
    }
  });

  test('should display video duration in human-readable format', async () => {
    // Arrange
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(youtubeUrl);
    await page.waitForTimeout(2000);

    // Assert - Duration is displayed (e.g., "3:33" or "3 minutes")
    await expect(page.locator('text=/3:33|3 minutes/')).toBeVisible();
  });

  test('should show all age rating options', async () => {
    // Act
    await page.click('button:has-text("Add Video")');

    // Assert - All age rating options are available
    const ageRatingSelect = page.locator('select[name="age_rating"]');
    await expect(ageRatingSelect).toBeVisible();

    const options = await ageRatingSelect.locator('option').allTextContents();
    expect(options).toContain('All Ages');
    expect(options).toContain('6+');
    expect(options).toContain('12+');
    expect(options).toContain('16+');
    expect(options).toContain('18+');
  });
});

// T040: Vimeo Video Add Flow E2E Tests
test.describe('Add Vimeo Video by Link', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Setup: Create a new page and log in
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Login
    await page.click('button:has-text("Login")');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to library
    await page.waitForURL('**/library');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should successfully add a Vimeo video by pasting URL', async () => {
    // Arrange
    const vimeoUrl = 'https://vimeo.com/123456789';

    // Act - Open Add Video modal
    await page.click('button:has-text("Add Video")');

    // Assert - Modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Act - Paste Vimeo URL
    const urlInput = page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]'));
    await urlInput.fill(vimeoUrl);

    // Assert - Platform is auto-detected as Vimeo
    await expect(page.locator('text=Vimeo')).toBeVisible({ timeout: 3000 });

    // Assert - Metadata auto-fills
    await expect(page.locator('input[name="title"]')).not.toBeEmpty({ timeout: 3000 });

    // Assert - Thumbnail is displayed
    const thumbnail = page.locator('img[alt*="thumbnail"]').or(page.locator('img[alt*="preview"]'));
    await expect(thumbnail).toBeVisible();

    // Act - Select age rating
    await page.selectOption('select[name="age_rating"]', 'all_ages');

    // Act - Submit form
    await page.click('button:has-text("Add Video")');

    // Assert - Modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Assert - Success notification appears
    await expect(page.locator('text=Video added successfully')).toBeVisible({ timeout: 5000 });

    // Assert - Video appears in library
    await expect(page.locator('[data-platform="vimeo"]').or(page.locator('img[src*="vimeo"]'))).toBeVisible();
  });

  test('should detect Vimeo platform from vimeo.com URL', async () => {
    // Arrange
    const vimeoUrl = 'https://vimeo.com/987654321';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(vimeoUrl);

    // Assert - Platform is auto-detected
    await expect(page.locator('text=Vimeo')).toBeVisible({ timeout: 3000 });
  });

  test('should detect Vimeo platform from player.vimeo.com URL', async () => {
    // Arrange
    const vimeoUrl = 'https://player.vimeo.com/video/123456789';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(vimeoUrl);

    // Assert - Platform is auto-detected
    await expect(page.locator('text=Vimeo')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for non-existent Vimeo video', async () => {
    // Arrange
    const nonExistentUrl = 'https://vimeo.com/999999999999';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(nonExistentUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video not found').or(page.locator('text=Could not fetch video'))).toBeVisible();
  });

  test('should show error for private Vimeo video', async () => {
    // Arrange
    const privateVideoUrl = 'https://vimeo.com/111111111';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(privateVideoUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video is private').or(page.locator('text=Video not found'))).toBeVisible();
  });

  test('should allow editing auto-filled metadata for Vimeo videos', async () => {
    // Arrange
    const vimeoUrl = 'https://vimeo.com/123456789';
    const customTitle = 'My Custom Vimeo Video Title';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(vimeoUrl);

    // Wait for auto-fill
    await page.waitForTimeout(2000);

    // Act - Edit title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    await titleInput.fill(customTitle);

    // Act - Submit
    await page.selectOption('select[name="age_rating"]', 'all_ages');
    await page.click('button:has-text("Add Video")');

    // Assert - Video is added with custom title
    await expect(page.locator(`text=${customTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state while fetching Vimeo metadata', async () => {
    // Arrange
    const vimeoUrl = 'https://vimeo.com/123456789';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(vimeoUrl);

    // Assert - Loading indicator is shown
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).toBeVisible({ timeout: 1000 });

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Assert - Loading indicator is hidden
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).not.toBeVisible();
  });

  test('should handle different Vimeo URL formats', async () => {
    const urlFormats = [
      'https://vimeo.com/123456789',
      'https://player.vimeo.com/video/123456789',
      'https://vimeo.com/channels/staffpicks/123456789',
      'http://vimeo.com/123456789'
    ];

    for (const url of urlFormats) {
      // Act
      await page.click('button:has-text("Add Video")');
      await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(url);

      // Assert - Platform is detected and metadata is attempted
      await expect(page.locator('text=Vimeo')).toBeVisible({ timeout: 3000 });

      // Close modal
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(500);
    }
  });
});

// T041: Dailymotion Video Add Flow E2E Tests
test.describe('Add Dailymotion Video by Link', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Setup: Create a new page and log in
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Login
    await page.click('button:has-text("Login")');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to library
    await page.waitForURL('**/library');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should successfully add a Dailymotion video by pasting URL', async () => {
    // Arrange
    const dailymotionUrl = 'https://www.dailymotion.com/video/x8abcd1';

    // Act - Open Add Video modal
    await page.click('button:has-text("Add Video")');

    // Assert - Modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Act - Paste Dailymotion URL
    const urlInput = page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]'));
    await urlInput.fill(dailymotionUrl);

    // Assert - Platform is auto-detected as Dailymotion
    await expect(page.locator('text=Dailymotion')).toBeVisible({ timeout: 3000 });

    // Assert - Metadata auto-fills
    await expect(page.locator('input[name="title"]')).not.toBeEmpty({ timeout: 3000 });

    // Assert - Thumbnail is displayed
    const thumbnail = page.locator('img[alt*="thumbnail"]').or(page.locator('img[alt*="preview"]'));
    await expect(thumbnail).toBeVisible();

    // Act - Select age rating
    await page.selectOption('select[name="age_rating"]', 'all_ages');

    // Act - Submit form
    await page.click('button:has-text("Add Video")');

    // Assert - Modal closes
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Assert - Success notification appears
    await expect(page.locator('text=Video added successfully')).toBeVisible({ timeout: 5000 });

    // Assert - Video appears in library
    await expect(page.locator('[data-platform="dailymotion"]').or(page.locator('img[src*="dailymotion"]'))).toBeVisible();
  });

  test('should detect Dailymotion platform from dailymotion.com URL', async () => {
    // Arrange
    const dailymotionUrl = 'https://www.dailymotion.com/video/x8efgh2';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);

    // Assert - Platform is auto-detected
    await expect(page.locator('text=Dailymotion')).toBeVisible({ timeout: 3000 });
  });

  test('should detect Dailymotion platform from dai.ly short URL', async () => {
    // Arrange
    const dailymotionUrl = 'https://dai.ly/x8ijkl3';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);

    // Assert - Platform is auto-detected
    await expect(page.locator('text=Dailymotion')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for non-existent Dailymotion video', async () => {
    // Arrange
    const nonExistentUrl = 'https://www.dailymotion.com/video/x9invalid';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(nonExistentUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video not found').or(page.locator('text=Could not fetch video'))).toBeVisible();
  });

  test('should show error for private Dailymotion video', async () => {
    // Arrange
    const privateVideoUrl = 'https://www.dailymotion.com/video/x8private';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(privateVideoUrl);

    // Wait for metadata fetch to fail
    await page.waitForTimeout(2000);

    // Assert - Error message is shown
    await expect(page.locator('text=Video is private').or(page.locator('text=Video not found'))).toBeVisible();
  });

  test('should allow editing auto-filled metadata for Dailymotion videos', async () => {
    // Arrange
    const dailymotionUrl = 'https://www.dailymotion.com/video/x8abcd1';
    const customTitle = 'My Custom Dailymotion Video Title';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);

    // Wait for auto-fill
    await page.waitForTimeout(2000);

    // Act - Edit title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    await titleInput.fill(customTitle);

    // Act - Submit
    await page.selectOption('select[name="age_rating"]', 'all_ages');
    await page.click('button:has-text("Add Video")');

    // Assert - Video is added with custom title
    await expect(page.locator(`text=${customTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should show loading state while fetching Dailymotion metadata', async () => {
    // Arrange
    const dailymotionUrl = 'https://www.dailymotion.com/video/x8abcd1';

    // Act
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);

    // Assert - Loading indicator is shown
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).toBeVisible({ timeout: 1000 });

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Assert - Loading indicator is hidden
    await expect(page.locator('text=Fetching video').or(page.locator('[role="progressbar"]'))).not.toBeVisible();
  });

  test('should handle different Dailymotion URL formats', async () => {
    const urlFormats = [
      'https://www.dailymotion.com/video/x8abcd1',
      'https://dailymotion.com/video/x8abcd1',
      'https://dai.ly/x8abcd1',
      'http://www.dailymotion.com/video/x8abcd1',
      'https://www.dailymotion.com/embed/video/x8abcd1'
    ];

    for (const url of urlFormats) {
      // Act
      await page.click('button:has-text("Add Video")');
      await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(url);

      // Assert - Platform is detected and metadata is attempted
      await expect(page.locator('text=Dailymotion')).toBeVisible({ timeout: 3000 });

      // Close modal
      await page.click('button:has-text("Cancel")');
      await page.waitForTimeout(500);
    }
  });

  test('should prevent duplicate Dailymotion video from being added', async () => {
    // Arrange
    const dailymotionUrl = 'https://www.dailymotion.com/video/x8duplicate';

    // Act - Add video first time
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);
    await page.waitForTimeout(2000); // Wait for metadata
    await page.selectOption('select[name="age_rating"]', 'all_ages');
    await page.click('button:has-text("Add Video")');
    await page.waitForTimeout(1000);

    // Act - Try to add same video again
    await page.click('button:has-text("Add Video")');
    await page.locator('input[placeholder*="paste"]').or(page.locator('input[placeholder*="URL"]')).fill(dailymotionUrl);
    await page.waitForTimeout(1000);

    // Assert - Error message or warning is shown
    await expect(page.locator('text=already exists').or(page.locator('text=already added'))).toBeVisible();
  });
});
