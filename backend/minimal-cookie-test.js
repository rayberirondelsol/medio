const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

// Use the same middleware setup as server.js
app.use(cookieParser(COOKIE_SECRET));

app.get('/test-cookies', (req, res) => {
  console.log('\n=== COOKIE TEST ===');
  console.log('Raw Cookie header:', req.headers.cookie);
  console.log('req.cookies:', req.cookies);
  console.log('req.signedCookies:', req.signedCookies);
  
  const token = req.cookies?.authToken;
  console.log('authToken from req.cookies:', token ? token.substring(0, 50) + '...' : 'MISSING');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✓ Token verified successfully');
      res.json({ success: true, decoded });
    } catch (err) {
      console.log('✗ Token verification failed:', err.message);
      res.status(401).json({ error: err.message });
    }
  } else {
    res.status(401).json({ error: 'No authToken cookie found' });
  }
});

app.listen(5001, () => {
  console.log('Test server running on port 5001');
  console.log('Test with: curl -H "Cookie: authToken=<token>" http://localhost:5001/test-cookies');
});
