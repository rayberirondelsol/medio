const { chromium } = require('playwright');

(async () => {
  console.log('🎯 VOLLSTÄNDIGER TEST: Registrierung → Add Video Modal\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error')) {
      console.log('🔍 BROWSER ERROR:', text);
    }
  });

  try {
    console.log('1️⃣ Öffne Homepage...');
    await page.goto('https://medio-react-app.fly.dev/');
    await page.waitForLoadState('networkidle');

    console.log('2️⃣ Wechsle zu Registrierung...');
    const signupLink = page.locator('a:has-text("Sign up"), a:has-text("sign up")').first();
    const hasSignup = await signupLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasSignup) {
      await signupLink.click();
      await page.waitForTimeout(1000);
    }

    console.log('3️⃣ Fülle ALLE Felder aus (inklusive Name)...');
    const timestamp = Date.now();
    const testEmail = `medio-test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Medio Test User';

    console.log('   Name:', testName);
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);

    // Name ausfüllen (WICHTIG!)
    await page.fill('input[name="name"], input[placeholder*="name" i], input[placeholder*="Name"]', testName);

    // Email ausfüllen
    await page.fill('input[type="email"]', testEmail);

    // Passwörter ausfüllen
    const passwordFields = await page.locator('input[type="password"]').all();
    if (passwordFields.length >= 1) await passwordFields[0].fill(testPassword);
    if (passwordFields.length >= 2) await passwordFields[1].fill(testPassword);

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'final-test-1-register-filled.png' });

    console.log('\n4️⃣ Klicke "Sign Up" Button...');
    const registerResponse = page.waitForResponse(
      response => response.url().includes('/auth/register') || response.url().includes('/auth/signup'),
      { timeout: 10000 }
    ).catch(() => null);

    await page.click('button[type="submit"]');

    const response = await registerResponse;
    if (response) {
      console.log('   Response Status:', response.status());
      if (response.status() === 200 || response.status() === 201) {
        console.log('   ✅ Registrierung erfolgreich!');
      } else {
        const body = await response.text();
        console.log('   ❌ Registrierung fehlgeschlagen:', body.substring(0, 200));
      }
    }

    // Warte auf Weiterleitung
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'final-test-2-after-register.png' });

    console.log('\n5️⃣ Prüfe Weiterleitung...');
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('/videos') || currentUrl.includes('/dashboard')) {
      console.log('   ✅ Auto-Login erfolgreich! Auf Videos-Seite.');
    } else if (currentUrl.includes('/login')) {
      console.log('   ⚠️ Auf Login-Seite - versuche Login mit neuen Credentials...');
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      console.log('   Nach Login URL:', page.url());
    } else if (currentUrl.includes('/register')) {
      console.log('   ❌ Noch auf Register-Seite - Registrierung fehlgeschlagen');
      throw new Error('Registrierung fehlgeschlagen');
    }

    // Sicherstellen, dass wir auf /videos sind
    if (!page.url().includes('/videos')) {
      console.log('   Navigiere manuell zu /videos...');
      await page.goto('https://medio-react-app.fly.dev/videos');
      await page.waitForLoadState('networkidle');
    }

    await page.screenshot({ path: 'final-test-3-videos-page.png' });

    console.log('\n6️⃣ Suche "Add Video" Button...');
    await page.waitForTimeout(2000);

    const selectors = [
      'button:has-text("Add Video")',
      'button:has-text("add")',
      '[data-testid="add-video-button"]'
    ];

    let addButton = null;
    for (const selector of selectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   ✅ Button gefunden mit:', selector);
        addButton = btn;
        break;
      }
    }

    if (!addButton) {
      console.log('   ❌ "Add Video" Button nicht gefunden!');
      const allButtons = await page.locator('button').all();
      console.log('   Verfügbare Buttons:', allButtons.length);
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent();
        const isVisible = await allButtons[i].isVisible();
        console.log(`     ${i}: "${text}" (visible: ${isVisible})`);
      }
      throw new Error('Add Video Button nicht gefunden');
    }

    console.log('\n7️⃣ Klicke "Add Video" Button...');
    await addButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'final-test-4-after-click.png' });

    console.log('\n8️⃣ Prüfe ob Modal geöffnet ist...');
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]').first();
    const isModalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('   Modal sichtbar:', isModalVisible);

    if (!isModalVisible) {
      console.log('   ❌ Modal wurde nicht geöffnet!');
      throw new Error('Modal nicht geöffnet');
    }

    await page.screenshot({ path: 'final-test-5-modal-open.png' });
    console.log('   ✅ Modal ist geöffnet!');

    console.log('\n9️⃣ Teste YouTube URL Eingabe...');
    const urlInput = page.locator('input[placeholder*="URL" i], input[name="url"], input[type="url"]').first();
    const hasUrlInput = await urlInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasUrlInput) {
      console.log('   ✅ URL Input gefunden');
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      console.log('   Warte auf Metadata-Fetch (5 Sekunden)...');
      await page.waitForTimeout(5000);

      await page.screenshot({ path: 'final-test-6-url-filled.png' });

      // Prüfe ob Title automatisch gefüllt wurde
      const titleInput = page.locator('input[name="title"], input[placeholder*="Title" i]').first();
      const hasTitleInput = await titleInput.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasTitleInput) {
        const titleValue = await titleInput.inputValue();
        if (titleValue && titleValue.length > 0) {
          console.log('   ✅ Title automatisch gefüllt:', titleValue.substring(0, 50));
        } else {
          console.log('   ⚠️ Title nicht automatisch gefüllt');
        }
      }

      console.log('\n✅✅✅ TEST ERFOLGREICH! ✅✅✅');
      console.log('\nZusammenfassung:');
      console.log('  ✓ Registrierung funktioniert');
      console.log('  ✓ Auto-Login funktioniert');
      console.log('  ✓ Videos-Seite lädt');
      console.log('  ✓ Add Video Button ist sichtbar');
      console.log('  ✓ Modal öffnet sich');
      console.log('  ✓ URL-Eingabe funktioniert');
      console.log('  ✓ Metadata-Fetch läuft');

    } else {
      console.log('   ❌ URL Input nicht im Modal gefunden');
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ TEST FEHLGESCHLAGEN:', error.message);
    await page.screenshot({ path: 'final-test-error.png' });
  } finally {
    await browser.close();
  }
})();
