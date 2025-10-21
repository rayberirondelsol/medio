const cookieParser = require('cookie-parser');
require('dotenv').config();

const COOKIE_SECRET = process.env.COOKIE_SECRET;

// Simulate a request with cookies
const testRequest = {
  headers: {
    cookie: 'authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci11dWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwianRpIjoiNjYyMTkyZWU1YTFhNjE5ZGIxYzkzOGMzZTJlM2VhYWIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzYxMDQ2OTA3LCJleHAiOjE3NjEwNDc4MDcsImF1ZCI6Im1lZGlvLXVzZXJzIiwiaXNzIjoibWVkaW8tcGxhdGZvcm0ifQ.xyz123; refreshToken=abc456; _csrf=csrf123'
  }
};

const testResponse = {};

console.log('Raw Cookie Header:', testRequest.headers.cookie);

// Middleware function simulation
const middleware = cookieParser(COOKIE_SECRET);

middleware(testRequest, testResponse, () => {
  console.log('\n=== AFTER cookie-parser ===');
  console.log('req.cookies:', testRequest.cookies);
  console.log('req.cookies.authToken:', testRequest.cookies?.authToken ? testRequest.cookies.authToken.substring(0, 50) + '...' : 'MISSING');
  console.log('req.cookies.refreshToken:', testRequest.cookies?.refreshToken);
  console.log('req.cookies._csrf:', testRequest.cookies?._csrf);
});
