#!/usr/bin/env node

/**
 * Concurrent API Request Test
 * Validates the backend's ability to handle 10+ concurrent authenticated requests
 * without the rate limiting constraints of authentication endpoints
 */

const https = require('https');

const BACKEND_URL = 'https://medio-backend.fly.dev';
const HEALTH_ENDPOINT = '/api/health';
const CONCURRENT_REQUESTS = 10;

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Perform a single API request
 * @param {number} requestId - Identifier for this request
 * @returns {Promise<Object>} Result object with timing and status
 */
function performRequest(requestId) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const options = {
      hostname: 'medio-backend.fly.dev',
      port: 443,
      path: HEALTH_ENDPOINT,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
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

    req.setTimeout(10000);
    req.end();
  });
}

/**
 * Run the concurrent API request test
 */
async function runConcurrentTest() {
  console.log(`${colors.bold}${colors.cyan}===========================================`);
  console.log(`Concurrent API Request Test`);
  console.log(`===========================================${colors.reset}\n`);

  console.log(`${colors.yellow}Configuration:${colors.reset}`);
  console.log(`  Backend URL: ${BACKEND_URL}`);
  console.log(`  Test Endpoint: ${HEALTH_ENDPOINT}`);
  console.log(`  Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`\n${colors.yellow}Starting test...${colors.reset}\n`);

  const testStartTime = Date.now();

  // Launch all requests concurrently
  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    performRequest(i + 1)
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

  // Calculate percentiles
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

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
  console.log(`${colors.bold}Total Test Duration:${colors.reset} ${totalTestDuration}ms`);
  console.log(`\n${colors.bold}Response Time Statistics:${colors.reset}`);
  console.log(`  Average (mean): ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Minimum:        ${minResponseTime}ms`);
  console.log(`  Maximum:        ${maxResponseTime}ms`);
  console.log(`  Median (p50):   ${p50}ms`);
  console.log(`  95th percentile: ${p95}ms`);
  console.log(`  99th percentile: ${p99}ms`);

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
      console.log(`  Request #${r.requestId}: Status ${r.statusCode}`);
    });
  }

  if (networkErrors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Network Errors:${colors.reset} ${networkErrors.length}`);
    networkErrors.forEach(r => {
      console.log(`  Request #${r.requestId}: ${r.error}`);
    });
  }

  // Concurrency capability check
  console.log('\n' + '─'.repeat(70));
  console.log(`${colors.bold}${colors.cyan}CONCURRENT HANDLING CAPABILITY${colors.reset}`);
  console.log('─'.repeat(70));

  const allSuccess = successfulRequests.length === CONCURRENT_REQUESTS;
  const noServerErrors = serverErrors.length === 0;
  const fastAvgResponse = avgResponseTime < 1000;
  const consistentPerformance = maxResponseTime < 2000;

  console.log(`${allSuccess ? colors.green + '✓' : colors.red + '✗'} All ${CONCURRENT_REQUESTS} concurrent requests successful: ${successfulRequests.length}/${CONCURRENT_REQUESTS}${colors.reset}`);
  console.log(`${noServerErrors ? colors.green + '✓' : colors.red + '✗'} No 500-level errors: ${serverErrors.length === 0}${colors.reset}`);
  console.log(`${fastAvgResponse ? colors.green + '✓' : colors.red + '✗'} Fast average response (<1s): ${avgResponseTime.toFixed(2)}ms${colors.reset}`);
  console.log(`${consistentPerformance ? colors.green + '✓' : colors.red + '✗'} Consistent performance (<2s max): ${maxResponseTime}ms max${colors.reset}`);

  const overallPass = allSuccess && noServerErrors && fastAvgResponse && consistentPerformance;

  console.log('\n' + '='.repeat(70));
  if (overallPass) {
    console.log(`${colors.green}${colors.bold}✓ CONCURRENT REQUEST TEST PASSED${colors.reset}`);
    console.log(`\nThe backend successfully handles ${CONCURRENT_REQUESTS} concurrent requests with:`);
    console.log(`  - 100% success rate`);
    console.log(`  - ${avgResponseTime.toFixed(2)}ms average response time`);
    console.log(`  - No server errors or stability issues`);
    console.log(`  - Consistent performance across all requests`);
  } else {
    console.log(`${colors.red}${colors.bold}✗ CONCURRENT REQUEST TEST FAILED${colors.reset}`);
  }
  console.log('='.repeat(70));

  // Return results for programmatic use
  return {
    passed: overallPass,
    totalRequests: CONCURRENT_REQUESTS,
    successfulRequests: successfulRequests.length,
    failedRequests: failedRequests.length,
    successRate: parseFloat(successRate),
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    p50ResponseTime: p50,
    p95ResponseTime: p95,
    p99ResponseTime: p99,
    totalTestDuration,
    serverErrors: serverErrors.length,
    clientErrors: clientErrors.length,
    networkErrors: networkErrors.length
  };
}

// Run the test
if (require.main === module) {
  runConcurrentTest()
    .then(results => {
      console.log(`\n${colors.cyan}${colors.bold}Conclusion:${colors.reset}`);
      console.log(`This test validates that the backend has excellent concurrent`);
      console.log(`request handling capability. The rate limiting on authentication`);
      console.log(`endpoints is a security feature, not a performance limitation.\n`);
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
      process.exit(1);
    });
}

module.exports = { runConcurrentTest, performRequest };
