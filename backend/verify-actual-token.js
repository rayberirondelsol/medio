const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// This is the actual authToken from the proxy log after registration
const actualToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3NTUwN2NmLWMyMmMtNGRlZS1iMTY1LWNkNDA1OWVhNTRhMyIsImVtYWlsIjoicHJveHktdGVzdC0xNzYxMDQ2NjA3NDMxLTl2ZDRwYUBleGFtcGxlLmNvbSIsImp0aSI6IjRhMzQzODNlN2UwMTI3MmYwZTQ1NDE2NTgyMzgxODIyIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc2MTA0NjYwOCwiZXhwIjoxNzYxMDQ3NTA4LCJhdWQiOiJtZWRpby11c2VycyIsImlzcyI6Im1lZGlvLXBsYXRmb3JtIn0.LT0GXpQwwucIHTXiM9hDGPdDVmTh6TE16rd377Da2lc';

console.log('Token:', actualToken.substring(0, 50) + '...');
console.log('JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');

try {
  const decoded = jwt.verify(actualToken, JWT_SECRET);
  console.log('\n✓ SUCCESS - Token verified');
  console.log('Decoded:', JSON.stringify(decoded, null, 2));
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;
  console.log('\nToken issued at:', new Date(decoded.iat * 1000));
  console.log('Token expires at:', new Date(decoded.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Time until expiry:', expiresIn, 'seconds');
  console.log('Token expired?', expiresIn < 0);
} catch (err) {
  console.log('\n✗ FAILED - Error:', err.message);
  console.log('Error name:', err.name);
  
  // Try to decode without verification
  const decoded = jwt.decode(actualToken);
  console.log('\nDecoded (without verification):', JSON.stringify(decoded, null, 2));
  
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;
  console.log('\nToken issued at:', new Date(decoded.iat * 1000));
  console.log('Token expires at:', new Date(decoded.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Time until expiry:', expiresIn, 'seconds');
  console.log('Token expired?', expiresIn < 0);
}
