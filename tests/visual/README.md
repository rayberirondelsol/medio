# Visual Regression Testing for Medio

Comprehensive visual testing suite using Playwright for screenshot comparison, responsive testing, and accessibility validation.

## 🎯 Features

- **Visual Regression Detection**: Pixel-perfect screenshot comparisons
- **Cross-Browser Testing**: Chromium, Firefox, and WebKit
- **Responsive Testing**: Desktop, tablet, and mobile viewports
- **Accessibility Testing**: Focus indicators, contrast ratios, and high contrast mode
- **CI/CD Integration**: Automated visual tests on every PR
- **Detailed Reporting**: HTML reports with visual diffs

## 📁 Structure

```
tests/visual/
├── homepage.visual.spec.ts          # Homepage/login page tests
├── add-video-modal.visual.spec.ts   # Add Video modal tests
├── helpers/
│   └── visual-testing.ts            # Shared helper functions
└── __snapshots__/                   # Visual baseline images
    ├── chromium-desktop/
    ├── firefox-desktop/
    ├── webkit-desktop/
    ├── tablet-ipad/
    └── mobile-iphone/
```

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all visual tests
npm run test:visual

# Run tests for specific browser
npm run test:visual -- --project=chromium-desktop

# Run specific test file
npm run test:visual -- homepage.visual.spec.ts

# Update snapshots (when intentional changes are made)
npm run test:visual:update

# Run in UI mode for debugging
npm run test:visual:ui
```

## 📸 Creating Visual Baselines

When running visual tests for the first time, Playwright will create baseline screenshots:

```bash
# Generate baseline screenshots
npm run test:visual:update
```

This creates snapshots in `tests/__snapshots__/` organized by browser/device.

## 🔄 Workflow

### 1. Making UI Changes

When you change UI components:

1. Make your code changes
2. Run visual tests: `npm run test:visual`
3. Review any visual diffs in the HTML report
4. If changes are intentional, update baselines: `npm run test:visual:update`
5. Commit new baseline images with your PR

### 2. Reviewing Visual Diffs

Failed visual tests generate:
- **Actual**: Current screenshot
- **Expected**: Baseline screenshot
- **Diff**: Highlighted differences

View these in the HTML report: `playwright-report/index.html`

### 3. CI/CD Integration

Visual tests run automatically on:
- Pull requests (all browsers/devices)
- Pushes to main branch
- Manual workflow dispatch

Failed tests upload diff artifacts for review.

## 🎨 Test Categories

### Homepage Tests (`homepage.visual.spec.ts`)

- Default login page state
- Login form (empty and filled)
- Kids Mode button
- Logo and branding
- Responsive layouts (5 viewports)
- Accessibility (focus indicators, high contrast)

### Add Video Modal Tests (`add-video-modal.visual.spec.ts`)

- Add Video button
- Modal opening/closing
- Empty form state
- URL input (empty and filled)
- Metadata loading states
- Platform and age rating dropdowns
- Submit button states (disabled, enabled, hover)
- Complete filled form
- Responsive layouts (mobile, tablet)
- Validation error states

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.1,  // 10% pixel difference allowed
    threshold: 0.2,           // Anti-aliasing tolerance
  },
}
```

### Viewport Sizes

| Device | Width | Height |
|--------|-------|--------|
| Mobile (iPhone 12) | 390px | 844px |
| Tablet (iPad Pro) | 1024px | 1366px |
| Desktop | 1920px | 1080px |

## 📊 Test Matrix

| Browser | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Chromium | ✅ | ✅ | ✅ |
| Firefox | ✅ | - | - |
| WebKit | ✅ | - | - |

## 🛠️ Helper Functions

The `helpers/visual-testing.ts` file provides:

### Preparation

```typescript
// Prepare page for consistent screenshots
await prepareForVisualTest(page, {
  animations: 'disabled',
  fullPage: true
});

// Wait for images to load
await waitForImagesToLoad(page);

// Hide dynamic content
await maskDynamicContent(page);
```

### Login Helper

```typescript
// Login as parent
await login(page, 'parent');

// Login as child
await login(page, 'child');
```

### Accessibility

```typescript
// Check color contrast ratios
const issues = await checkColorContrast(page);
```

## 📝 Writing New Visual Tests

### Basic Template

```typescript
import { test, expect } from '@playwright/test';
import { prepareForVisualTest } from './helpers/visual-testing';

test.describe('My Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-route');
    await prepareForVisualTest(page);
  });

  test('should match component snapshot', async ({ page }) => {
    const component = page.locator('.my-component');
    await expect(component).toHaveScreenshot('my-component.png');
  });

  test('should match full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('my-page.png', {
      fullPage: true
    });
  });
});
```

### Responsive Test Template

```typescript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

viewports.forEach(({ name, width, height }) => {
  test(`should render on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await prepareForVisualTest(page);

    await expect(page).toHaveScreenshot(`page-${name}.png`, {
      fullPage: true
    });
  });
});
```

## 🔍 Debugging Tips

### View Failed Tests

```bash
# Open HTML report
npm run test:visual:report
```

### Run in UI Mode

```bash
# Interactive test runner with time-travel debugging
npm run test:visual:ui
```

### Run Specific Test

```bash
# Run only one test file
npx playwright test homepage.visual.spec.ts

# Run only tests matching a pattern
npx playwright test --grep "should match homepage"
```

### Update Specific Snapshots

```bash
# Update only for one project
npx playwright test --project=chromium-desktop --update-snapshots

# Update only one test file
npx playwright test homepage.visual.spec.ts --update-snapshots
```

## 🚨 Troubleshooting

### Flaky Tests

If tests are flaky:
1. Increase wait times in `prepareForVisualTest`
2. Disable animations completely
3. Mask dynamic timestamps/IDs
4. Check for loading states

### Large Diffs

If seeing unexpected large diffs:
1. Check OS rendering differences (fonts, anti-aliasing)
2. Ensure CI uses same OS as local
3. Review threshold settings
4. Check for dynamic content

### Tests Pass Locally but Fail in CI

1. Ensure same Node.js version
2. Check CI has all fonts installed
3. Review environment variables
4. Regenerate baselines in CI

## 📚 Best Practices

1. **Stable Selectors**: Use data-testid or stable classes
2. **Mask Dynamic Content**: Hide timestamps, random IDs
3. **Disable Animations**: For consistent screenshots
4. **Wait for Images**: Ensure all images loaded
5. **Meaningful Names**: Use descriptive snapshot names
6. **Group Related Tests**: Use `test.describe` blocks
7. **Document Intentional Changes**: In commit messages
8. **Review Diffs Carefully**: Before updating baselines
9. **Test Critical Paths**: Focus on user-facing features
10. **Keep Tests Fast**: Use `fullyParallel: true`

## 📦 Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:visual": "playwright test tests/visual/",
    "test:visual:update": "playwright test tests/visual/ --update-snapshots",
    "test:visual:ui": "playwright test tests/visual/ --ui",
    "test:visual:report": "playwright show-report",
    "test:visual:chromium": "playwright test tests/visual/ --project=chromium-desktop",
    "test:visual:firefox": "playwright test tests/visual/ --project=firefox-desktop",
    "test:visual:webkit": "playwright test tests/visual/ --project=webkit-desktop"
  }
}
```

## 🎯 Next Steps

- [ ] Add more page tests (dashboard, videos, settings)
- [ ] Add component-level visual tests
- [ ] Integrate with Percy or Chromatic for visual diff hosting
- [ ] Add animation timeline tests
- [ ] Add dark mode visual tests
- [ ] Add print stylesheet tests

## 📖 Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Best Practices for Visual Testing](https://playwright.dev/docs/best-practices)
- [CI/CD Integration](https://playwright.dev/docs/ci)
