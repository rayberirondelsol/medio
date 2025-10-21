const cookieParser = require('cookie-parser');
require('dotenv').config();

const COOKIE_SECRET = process.env.COOKIE_SECRET;

// Simulate a request with the actual Cookie header
const testReq = {
  headers: {
    cookie: 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZkZGJhNGI5LTU3OGMtNDI1Ni04NTI2LTg1MjI0NjBkYjc0MCIsImVtYWlsIjoiYmFja2VuZC1kaXJlY3QtMTc2MTA0NzE3NjkyNC11cTZxNGtAZXhhbXBsZS5jb20iLCJqdGkiOiIwNGIyMTEyNTkzNWU2YTg5NzYxOTAxYzc0OTM3NWM1NCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjEwNDcxNzcsImV4cCI6MTc2MTA0ODA3NywiYXVkIjoibWVkaW8tdXNlcnMiLCJpc3MiOiJtZWRpby1wbGF0Zm9ybSJ9.H2_PuXufvkH55pw9Y8_SZuU7jWyjBq9oJDLts_V66r8'
  },
  secret: COOKIE_SECRET
};
const testRes = {};

const middleware = cookieParser(COOKIE_SECRET);

console.log('Cookie header:', testReq.headers.cookie);
console.log('Cookie secret:', COOKIE_SECRET.substring(0, 20) + '...');

middleware(testReq, testRes, () => {
  console.log('\nParsed cookies:');
  console.log('req.cookies:', testReq.cookies);
  console.log('req.signedCookies:', testReq.signedCookies);
  
  console.log('\nIs authToken a JWT?', testReq.cookies?.authToken?.startsWith('eyJ'));
  console.log('Does JWT contain dots?', (testReq.cookies?.authToken?.match(/\./g) || []).length);
  
  // Check if cookie-parser mistook JWT dots for signed cookie separator
  console.log('\nJWT structure check:');
  const token = testReq.cookies?.authToken;
  if (token) {
    const parts = token.split('.');
    console.log('JWT parts:', parts.length);
    console.log('Header:', parts[0]?.substring(0, 20) + '...');
    console.log('Payload:', parts[1]?.substring(0, 20) + '...');
    console.log('Signature:', parts[2]?.substring(0, 20) + '...');
  }
});
