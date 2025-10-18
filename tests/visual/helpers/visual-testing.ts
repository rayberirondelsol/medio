import { Page, Locator } from '@playwright/test';

/**
 * Visual Testing Helper Functions
 *
 * Utilities for consistent visual regression testing across the app
 */

export interface ScreenshotOptions {
  fullPage?: boolean;
  animations?: 'disabled' | 'allow';
  timeout?: number;
}

/**
 * Wait for all images to load on the page
 */
export async function waitForImagesToLoad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      })
    );
  });
}

/**
 * Wait for all animations to complete
 */
export async function waitForAnimations(page: Page, timeout = 1000): Promise<void> {
  await page.waitForTimeout(timeout);

  // Wait for CSS animations and transitions
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      const elements = document.querySelectorAll('*');
      let pending = 0;

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const animationDuration = parseFloat(style.animationDuration || '0');
        const transitionDuration = parseFloat(style.transitionDuration || '0');

        if (animationDuration > 0 || transitionDuration > 0) {
          pending++;
          setTimeout(() => {
            pending--;
            if (pending === 0) resolve();
          }, Math.max(animationDuration, transitionDuration) * 1000);
        }
      });

      if (pending === 0) resolve();
    });
  });
}

/**
 * Mask dynamic content before taking screenshot
 */
export async function maskDynamicContent(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Mask dynamic timestamps */
      [data-testid="timestamp"],
      time,
      .timestamp {
        visibility: hidden !important;
      }

      /* Mask loading spinners */
      .loading-spinner,
      [role="progressbar"] {
        visibility: hidden !important;
      }

      /* Mask random IDs */
      [id^="random-"],
      [class*="random-"] {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * Hide scrollbars for consistent screenshots
 */
export async function hideScrollbars(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      * {
        scrollbar-width: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
      }
    `,
  });
}

/**
 * Prepare page for visual testing
 */
export async function prepareForVisualTest(
  page: Page,
  options: ScreenshotOptions = {}
): Promise<void> {
  const { animations = 'disabled' } = options;

  // Wait for network idle
  await page.waitForLoadState('networkidle');

  // Wait for images
  await waitForImagesToLoad(page);

  // Handle animations
  if (animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });
  } else {
    await waitForAnimations(page);
  }

  // Hide scrollbars
  await hideScrollbars(page);

  // Mask dynamic content
  await maskDynamicContent(page);

  // Wait a bit for any final renders
  await page.waitForTimeout(300);
}

/**
 * Take a screenshot of a specific element with proper preparation
 */
export async function screenshotElement(
  locator: Locator,
  name: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: options.timeout || 5000 });

  // Scroll element into view
  await locator.scrollIntoViewIfNeeded();
  await locator.page().waitForTimeout(200);

  await locator.screenshot({ path: name });
}

/**
 * Compare multiple viewport sizes
 */
export const VIEWPORT_SIZES = {
  'mobile-sm': { width: 320, height: 568 },
  'mobile-md': { width: 375, height: 667 },
  'mobile-lg': { width: 414, height: 896 },
  'tablet-sm': { width: 768, height: 1024 },
  'tablet-lg': { width: 1024, height: 1366 },
  'desktop-sm': { width: 1366, height: 768 },
  'desktop-md': { width: 1920, height: 1080 },
  'desktop-lg': { width: 2560, height: 1440 },
  'desktop-xl': { width: 3840, height: 2160 },
};

/**
 * Test accessibility contrast ratios
 */
export async function checkColorContrast(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const issues: any[] = [];

    // Get all text elements
    const textElements = document.querySelectorAll('*');

    textElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const backgroundColor = style.backgroundColor;

      if (!color || !backgroundColor) return;

      // Simple contrast check (you'd want a proper library in production)
      const colorRgb = color.match(/\d+/g);
      const bgRgb = backgroundColor.match(/\d+/g);

      if (colorRgb && bgRgb) {
        const colorLum = (parseInt(colorRgb[0]) * 299 +
                         parseInt(colorRgb[1]) * 587 +
                         parseInt(colorRgb[2]) * 114) / 1000;
        const bgLum = (parseInt(bgRgb[0]) * 299 +
                       parseInt(bgRgb[1]) * 587 +
                       parseInt(bgRgb[2]) * 114) / 1000;

        const contrast = (Math.max(colorLum, bgLum) + 0.05) /
                        (Math.min(colorLum, bgLum) + 0.05);

        // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
        const fontSize = parseFloat(style.fontSize);
        const minContrast = fontSize >= 24 || (fontSize >= 19 && style.fontWeight === 'bold') ? 3 : 4.5;

        if (contrast < minContrast) {
          issues.push({
            element: el.tagName,
            text: el.textContent?.substring(0, 50),
            contrast: contrast.toFixed(2),
            required: minContrast,
          });
        }
      }
    });

    return issues;
  });
}

/**
 * Inject test data for consistent screenshots
 */
export async function injectTestData(page: Page, data: Record<string, any>): Promise<void> {
  await page.evaluate((testData) => {
    (window as any).__TEST_DATA__ = testData;
  }, data);
}

/**
 * Common test user credentials
 */
export const TEST_USERS = {
  parent: {
    email: 'parent@example.com',
    password: 'ParentPass123!',
    name: 'Test Parent',
  },
  child: {
    email: 'child@example.com',
    password: 'ChildPass123!',
    name: 'Test Child',
  },
};

/**
 * Login helper for authenticated tests
 */
export async function login(page: Page, userType: keyof typeof TEST_USERS = 'parent'): Promise<void> {
  const user = TEST_USERS[userType];

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/\/(dashboard|videos)/);
  await page.waitForLoadState('networkidle');
}
