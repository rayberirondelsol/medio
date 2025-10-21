#!/usr/bin/env node

/**
 * Debug script to test a single login and see the full response
 */

const https = require('https');

const TEST_CREDENTIALS = {
  email: 'test+deploy20251017b@example.com',
  password: 'TestPassword123!'
};

function performLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(TEST_CREDENTIALS);

    const options = {
      hostname: 'medio-backend.fly.dev',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('Request Details:');
    console.log('URL:', `https://${options.hostname}${options.path}`);
    console.log('Method:', options.method);
    console.log('Headers:', options.headers);
    console.log('Body:', postData);
    console.log('\n---\n');

    const req = https.request(options, (res) => {
      let body = '';

      console.log('Response Status:', res.statusCode);
      console.log('Response Headers:', res.headers);
      console.log('\n---\n');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Response Body:', body);
        console.log('\n---\n');

        try {
          const parsed = JSON.parse(body);
          console.log('Parsed Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Could not parse JSON response');
        }

        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

performLogin()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
