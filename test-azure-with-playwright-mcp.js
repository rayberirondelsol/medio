// Demo script showing how to test Azure deployment with Playwright MCP
// This would be executed through Claude Code's Playwright MCP integration

const testAzureDeployment = async () => {
  // These values would come from your .env.azure file
  const APP_URL = process.env.APP_URL || 'https://medio-app-dev-202501131850.azurewebsites.net';
  const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
  const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'your-password';

  console.log('Testing Azure App Service Deployment...');
  console.log(`App URL: ${APP_URL}`);

  // Test 1: Basic authentication required
  console.log('\n1. Testing that authentication is required...');
  try {
    const response = await fetch(APP_URL);
    console.log(`Response status: ${response.status}`);

    if (response.status === 401) {
      console.log('✓ Basic authentication is properly configured');
    } else {
      console.log('⚠️ Authentication may not be configured correctly');
    }
  } catch (error) {
    console.log(`❌ Error accessing app: ${error.message}`);
  }

  // Test 2: Valid credentials work
  console.log('\n2. Testing with valid credentials...');
  try {
    const authHeader = 'Basic ' + Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64');
    const response = await fetch(APP_URL, {
      headers: {
        'Authorization': authHeader
      }
    });

    console.log(`Response status: ${response.status}`);

    if (response.status === 200) {
      console.log('✓ Authentication with valid credentials works');
      const html = await response.text();
      if (html.includes('React App') || html.includes('root')) {
        console.log('✓ React application is served correctly');
      } else {
        console.log('⚠️ Response may not contain React app');
      }
    } else {
      console.log('❌ Authentication failed with valid credentials');
    }
  } catch (error) {
    console.log(`❌ Error testing with credentials: ${error.message}`);
  }

  // Test 3: Security headers
  console.log('\n3. Checking security headers...');
  try {
    const authHeader = 'Basic ' + Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64');
    const response = await fetch(APP_URL, {
      headers: {
        'Authorization': authHeader
      }
    });

    const headers = response.headers;
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    securityHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        console.log(`✓ ${header}: ${value}`);
      } else {
        console.log(`⚠️ Missing security header: ${header}`);
      }
    });
  } catch (error) {
    console.log(`❌ Error checking headers: ${error.message}`);
  }

  // Test 4: HTTPS redirect
  console.log('\n4. Testing HTTPS enforcement...');
  const httpUrl = APP_URL.replace('https://', 'http://');
  try {
    const response = await fetch(httpUrl, {
      redirect: 'manual'
    });

    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.startsWith('https://')) {
        console.log('✓ HTTP properly redirects to HTTPS');
      } else {
        console.log('⚠️ HTTP redirect may not be configured correctly');
      }
    } else {
      console.log('⚠️ HTTPS enforcement may not be configured');
    }
  } catch (error) {
    console.log(`Note: ${error.message} (this might be expected for HTTPS-only)`);
  }

  console.log('\nAzure deployment test completed!');
};

// Playwright MCP browser automation example
const playwrightMcpTest = {
  // This would be executed through Claude Code's Playwright MCP integration
  testScript: `
    // Navigate to app without auth - should get 401 or auth prompt
    await page.goto('${process.env.APP_URL}');

    // Set basic auth headers
    await page.setExtraHTTPHeaders({
      'Authorization': 'Basic ' + Buffer.from('${process.env.BASIC_AUTH_USERNAME}:${process.env.BASIC_AUTH_PASSWORD}').toString('base64')
    });

    // Navigate with auth - should load React app
    await page.goto('${process.env.APP_URL}');
    await expect(page).toHaveTitle(/React App/);

    // Test SPA routing
    await page.goto('${process.env.APP_URL}/non-existent-route');
    await expect(page).toHaveTitle(/React App/); // Should still serve React app

    // Take screenshot for verification
    await page.screenshot({ path: 'azure-app-screenshot.png' });

    console.log('Playwright MCP test completed successfully!');
  `
};

module.exports = {
  testAzureDeployment,
  playwrightMcpTest
};

// If running directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.azure' });
  testAzureDeployment();
}