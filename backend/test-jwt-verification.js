const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'MISSING');
console.log('JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);

// Simulate token generation (from auth.js lines 74-91)
const user = { id: 'test-user-uuid', email: 'test@example.com' };
const jti = crypto.randomBytes(16).toString('hex');

const accessToken = jwt.sign(
  {
    id: user.id,
    email: user.email,
    jti: jti,
    type: 'access'
  },
  JWT_SECRET,
  {
    expiresIn: '15m',
    issuer: 'medio-platform',
    audience: 'medio-users'
  }
);

console.log('\n=== TOKEN GENERATION ===');
console.log('Access Token:', accessToken.substring(0, 50) + '...');
console.log('JTI:', jti);

// Simulate token verification WITHOUT options (like in auth.js:194-259)
console.log('\n=== VERIFICATION TEST 1: No Options (like /api/auth/me) ===');
try {
  const decoded = jwt.verify(accessToken, JWT_SECRET);
  console.log('✓ SUCCESS - Token verified');
  console.log('Decoded:', JSON.stringify(decoded, null, 2));
} catch (err) {
  console.log('✗ FAILED - Error:', err.message);
  console.log('Error name:', err.name);
}

// Simulate token verification WITH options (like middleware might do)
console.log('\n=== VERIFICATION TEST 2: With audience/issuer verification ===');
try {
  const decoded = jwt.verify(accessToken, JWT_SECRET, {
    audience: 'medio-users',
    issuer: 'medio-platform'
  });
  console.log('✓ SUCCESS - Token verified');
  console.log('Decoded:', JSON.stringify(decoded, null, 2));
} catch (err) {
  console.log('✗ FAILED - Error:', err.message);
  console.log('Error name:', err.name);
}
