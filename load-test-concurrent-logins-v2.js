#!/usr/bin/env node

/**
 * Load Test for SC-009: System handles 10 concurrent logins (with CSRF support)
 * Tests the backend's ability to handle multiple simultaneous login requests
 */

const https = require('https');

const BACKEND_URL = 'https://medio-backend.fly.dev';
const CSRF_ENDPOINT = '/api/csrf-token';
const LOGIN_ENDPOINT = '/api/auth/login';
const CONCURRENT_REQUESTS = 10;
const TEST_CREDENTIALS = {
  email: 'test+deploy20251017b@example.com',
  password: 'TestPassword123!'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Get CSRF token from the backend
 * @returns {Promise<Object>} Object with csrfToken and cookies
 */
function getCsrfToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'medio-backend.fly.dev',
      port: 443,
      path: CSRF_ENDPOINT,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      // Capture cookies from the response
      const cookies = res.headers['set-cookie'] || [];

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body);
            resolve({
              csrfToken: parsed.csrfToken,
              cookies: cookies.map(c => c.split(';')[0]).join('; ')
            });
          } catch (e) {
            reject(new Error('Failed to parse CSRF response'));
          }
        } else {
          reject(new Error(`CSRF request failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000);
    req.end();
  });
}

/**
 * Perform a single login request with CSRF token
 * @param {number} requestId - Identifier for this request
 * @param {string} csrfToken - CSRF token to include in the request
 * @param {string} cookies - Cookie string to include in the request
 * @returns {Promise<Object>} Result object with timing and status
 */
function performLogin(requestId, csrfToken, cookies) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const postData = JSON.stringify(TEST_CREDENTIALS);

    const options = {
      hostname: 'medio-backend.fly.dev',
      port: 443,
      path: LOGIN_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-CSRF-Token': csrfToken,
        'Cookie': cookies
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }

        resolve({
          requestId,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
          body: parsedBody,
          error: null
        });
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      resolve({
        requestId,
        statusCode: 0,
        duration,
        success: false,
        body: null,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const duration = endTime - startTime;

      resolve({
        requestId,
        statusCode: 0,
        duration,
        success: false,
        body: null,
        error: 'Request timeout'
      });
    });

    req.setTimeout(10000); // 10 second timeout
    req.write(postData);
    req.end();
  });
}

/**
 * Run the concurrent login load test
 */
async function runLoadTest() {
  console.log(`${colors.bold}${colors.cyan}===========================================`);
  console.log(`Load Test: SC-009 - Concurrent Login Test`);
  console.log(`===========================================${colors.reset}\n`);

  console.log(`${colors.yellow}Configuration:${colors.reset}`);
  console.log(`  Backend URL: ${BACKEND_URL}`);
  console.log(`  CSRF Endpoint: ${CSRF_ENDPOINT}`);
  console.log(`  Login Endpoint: ${LOGIN_ENDPOINT}`);
  console.log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`  Test User: ${TEST_CREDENTIALS.email}`);
  console.log(`\n${colors.yellow}Phase 1: Obtaining CSRF tokens...${colors.reset}\n`);

  const csrfStartTime = Date.now();

  // Get CSRF tokens for all concurrent requests
  const csrfTokenPromises = Array.from({ length: CONCURRENT_REQUESTS }, () => getCsrfToken());

  let csrfTokens;
  try {
    csrfTokens = await Promise.all(csrfTokenPromises);
  } catch (error) {
    console.error(`${colors.red}${colors.bold}Failed to obtain CSRF tokens:${colors.reset}`, error.message);
    return {
      passed: false,
      error: 'CSRF token acquisition failed'
    };
  }

  const csrfEndTime = Date.now();
  const csrfDuration = csrfEndTime - csrfStartTime;

  console.log(`${colors.green}✓ Successfully obtained ${csrfTokens.length} CSRF tokens in ${csrfDuration}ms${colors.reset}\n`);
  console.log(`${colors.yellow}Phase 2: Performing concurrent logins...${colors.reset}\n`);

  const testStartTime = Date.now();

  // Launch all login requests concurrently, each with its own CSRF token
  const requests = csrfTokens.map((csrf, i) =>
    performLogin(i + 1, csrf.csrfToken, csrf.cookies)
  );

  // Wait for all requests to complete
  const results = await Promise.all(requests);

  const testEndTime = Date.now();
  const totalTestDuration = testEndTime - testStartTime;

  // Analyze results
  const successfulRequests = results.filter(r => r.success);
  const failedRequests = results.filter(r => !r.success);
  const responseTimes = results.map(r => r.duration);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);

  // Print individual request results
  console.log(`${colors.bold}Individual Request Results:${colors.reset}`);
  console.log('─'.repeat(70));
  results.forEach(result => {
    const statusColor = result.success ? colors.green : colors.red;
    const statusText = result.success ? 'SUCCESS' : 'FAILED';
    console.log(
      `Request #${result.requestId.toString().padStart(2)}: ` +
      `${statusColor}${statusText}${colors.reset} | ` +
      `Status: ${result.statusCode || 'N/A'} | ` +
      `Time: ${result.duration}ms` +
      (result.error ? ` | Error: ${result.error}` : '')
    );
  });

  // Print summary
  console.log('\n' + '─'.repeat(70));
  console.log(`${colors.bold}${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log('─'.repeat(70));

  const successRate = (successfulRequests.length / CONCURRENT_REQUESTS * 100).toFixed(1);
  const successColor = successfulRequests.length === CONCURRENT_REQUESTS ? colors.green : colors.red;

  console.log(`${colors.bold}Success Rate:${colors.reset} ${successColor}${successfulRequests.length}/${CONCURRENT_REQUESTS} (${successRate}%)${colors.reset}`);
  console.log(`${colors.bold}Failed Requests:${colors.reset} ${failedRequests.length}`);
  console.log(`${colors.bold}CSRF Token Acquisition:${colors.reset} ${csrfDuration}ms`);
  console.log(`${colors.bold}Concurrent Login Duration:${colors.reset} ${totalTestDuration}ms`);
  console.log(`${colors.bold}Total Test Duration:${colors.reset} ${csrfDuration + totalTestDuration}ms`);
  console.log(`\n${colors.bold}Response Times:${colors.reset}`);
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Minimum: ${minResponseTime}ms`);
  console.log(`  Maximum: ${maxResponseTime}ms`);

  // Check for specific error types
  const serverErrors = results.filter(r => r.statusCode >= 500 && r.statusCode < 600);
  const clientErrors = results.filter(r => r.statusCode >= 400 && r.statusCode < 500);
  const networkErrors = results.filter(r => r.error);

  if (serverErrors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Server Errors (5xx):${colors.reset} ${serverErrors.length}`);
    serverErrors.forEach(r => {
      console.log(`  Request #${r.requestId}: Status ${r.statusCode}`);
    });
  }

  if (clientErrors.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Client Errors (4xx):${colors.reset} ${clientErrors.length}`);
    clientErrors.forEach(r => {
      console.log(`  Request #${r.requestId}: Status ${r.statusCode} - ${JSON.stringify(r.body)}`);
    });
  }

  if (networkErrors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Network Errors:${colors.reset} ${networkErrors.length}`);
    networkErrors.forEach(r => {
      console.log(`  Request #${r.requestId}: ${r.error}`);
    });
  }

  // SC-009 Success Criteria Check
  console.log('\n' + '─'.repeat(70));
  console.log(`${colors.bold}${colors.cyan}SC-009 SUCCESS CRITERIA${colors.reset}`);
  console.log('─'.repeat(70));

  const allSuccess = successfulRequests.length === CONCURRENT_REQUESTS;
  const noServerErrors = serverErrors.length === 0;
  const reasonableResponseTimes = avgResponseTime < 5000;

  console.log(`${allSuccess ? colors.green + '✓' : colors.red + '✗'} All 10 concurrent requests successful: ${successfulRequests.length}/${CONCURRENT_REQUESTS}${colors.reset}`);
  console.log(`${noServerErrors ? colors.green + '✓' : colors.red + '✗'} No 500-level errors: ${serverErrors.length === 0}${colors.reset}`);
  console.log(`${reasonableResponseTimes ? colors.green + '✓' : colors.red + '✗'} Reasonable response times (<5s): ${avgResponseTime.toFixed(2)}ms avg${colors.reset}`);

  const overallPass = allSuccess && noServerErrors && reasonableResponseTimes;

  console.log('\n' + '='.repeat(70));
  if (overallPass) {
    console.log(`${colors.green}${colors.bold}✓ SC-009 TEST PASSED${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}✗ SC-009 TEST FAILED${colors.reset}`);
  }
  console.log('='.repeat(70));

  // Return results for programmatic use
  return {
    passed: overallPass,
    totalRequests: CONCURRENT_REQUESTS,
    successfulRequests: successfulRequests.length,
    failedRequests: failedRequests.length,
    successRate: parseFloat(successRate),
    csrfDuration,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    totalTestDuration: csrfDuration + totalTestDuration,
    serverErrors: serverErrors.length,
    clientErrors: clientErrors.length,
    networkErrors: networkErrors.length
  };
}

// Run the test
if (require.main === module) {
  runLoadTest()
    .then(results => {
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
      process.exit(1);
    });
}

module.exports = { runLoadTest, performLogin, getCsrfToken };
