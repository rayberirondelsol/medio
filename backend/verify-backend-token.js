const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// Token from backend direct test
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZkZGJhNGI5LTU3OGMtNDI1Ni04NTI2LTg1MjI0NjBkYjc0MCIsImVtYWlsIjoiYmFja2VuZC1kaXJlY3QtMTc2MTA0NzE3NjkyNC11cTZxNGtAZXhhbXBsZS5jb20iLCJqdGkiOiIwNGIyMTEyNTkzNWU2YTg5NzYxOTAxYzc0OTM3NWM1NCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjEwNDcxNzcsImV4cCI6MTc2MTA0ODA3NywiYXVkIjoibWVkaW8tdXNlcnMiLCJpc3MiOiJtZWRpby1wbGF0Zm9ybSJ9.H2_PuXufvkH55pw9Y8_SZuU7jWyjBq9oJDLts_V66r8';

console.log('Verifying token from backend direct test...');
console.log('Token:', token.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✓ Token is VALID');
  console.log('Decoded:', JSON.stringify(decoded, null, 2));
  
  const now = Math.floor(Date.now() / 1000);
  console.log('\nExpires in:', decoded.exp - now, 'seconds');
} catch (err) {
  console.log('✗ Token verification FAILED');
  console.log('Error:', err.message);
}
