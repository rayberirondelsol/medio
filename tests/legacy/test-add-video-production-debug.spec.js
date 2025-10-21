const { test, expect } = require('@playwright/test');

test('Debug: Add Video Modal auf Produktion', async ({ page }) => {
  // Console-Logs abfangen
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('=== Schritt 1: Öffne Produktion ===');
  await page.goto('https://medio-react-app.fly.dev/');
  await page.waitForLoadState('networkidle');
  
  // Screenshot von Homepage
  await page.screenshot({ path: 'debug-prod-homepage.png' });
  console.log('Homepage geladen');

  console.log('=== Schritt 2: Login (falls nötig) ===');
  // Prüfen ob Login-Form sichtbar ist
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible().catch(() => false)) {
    console.log('Login erforderlich - verwende Testbenutzer');
    await emailInput.fill('test+deploy20251017b@example.com');
    await page.locator('input[type="password"]').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug-prod-after-login.png' });
  }

  console.log('=== Schritt 3: Navigiere zu Videos Seite ===');
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  if (!currentUrl.includes('/videos')) {
    console.log('Nicht auf Videos-Seite - versuche zu navigieren');
    // Suche nach Videos-Link
    const videosLink = page.locator('a[href="/videos"], a:has-text("Videos"), a:has-text("Video")').first();
    if (await videosLink.isVisible().catch(() => false)) {
      await videosLink.click();
      await page.waitForLoadState('networkidle');
    }
  }
  
  await page.screenshot({ path: 'debug-prod-videos-page.png' });
  console.log('Auf Videos-Seite:', page.url());

  console.log('=== Schritt 4: Suche "Add Video" Button ===');
  // Verschiedene Selektoren ausprobieren
  const selectors = [
    'button:has-text("Add Video")',
    'button:has-text("Video hinzufügen")',
    'button:has-text("add")',
    '[data-testid="add-video-button"]',
    'button[aria-label*="Add"]',
    'button[aria-label*="Video"]'
  ];

  let addButton = null;
  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible().catch(() => false)) {
      console.log('✓ Found button with selector:', selector);
      addButton = btn;
      break;
    } else {
      console.log('✗ Not found:', selector);
    }
  }

  if (!addButton) {
    console.log('FEHLER: Kein "Add Video" Button gefunden!');
    const buttons = await page.locator('button').all();
    console.log('Verfügbare Buttons:', buttons.length);
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      console.log(`  Button ${i}:`, text);
    }
    throw new Error('Add Video Button nicht gefunden');
  }

  console.log('=== Schritt 5: Klicke "Add Video" Button ===');
  await addButton.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'debug-prod-after-click.png' });

  console.log('=== Schritt 6: Prüfe ob Modal geöffnet ist ===');
  const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]').first();
  const isModalVisible = await modal.isVisible().catch(() => false);
  
  console.log('Modal sichtbar:', isModalVisible);
  
  if (!isModalVisible) {
    console.log('FEHLER: Modal wurde nicht geöffnet!');
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    console.log('JavaScript Errors:', errors);
    throw new Error('Modal wurde nicht geöffnet');
  }

  console.log('=== Schritt 7: Prüfe Modal-Inhalt ===');
  await page.screenshot({ path: 'debug-prod-modal-open.png' });
  
  // Suche URL-Input
  const urlInput = page.locator('input[placeholder*="URL"], input[name="url"], input[type="url"]').first();
  const hasUrlInput = await urlInput.isVisible().catch(() => false);
  console.log('URL Input sichtbar:', hasUrlInput);
  
  if (hasUrlInput) {
    console.log('✓ Modal ist vollständig - teste YouTube URL');
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.waitForTimeout(3000); // Warte auf Metadata-Fetch
    await page.screenshot({ path: 'debug-prod-modal-filled.png' });
  }

  console.log('=== Test abgeschlossen ===');
});
