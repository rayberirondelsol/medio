// This script patches the backend to add detailed logging for /api/auth/me debugging
const fs = require('fs');
const path = require('path');

const authFilePath = path.join(__dirname, 'src', 'routes', 'auth.js');
let content = fs.readFileSync(authFilePath, 'utf8');

// Find the /me route handler (line 194)
const mePatch = `
// Get current auth status / verify token endpoint
router.get('/me', async (req, res) => {
  try {
    console.log('\n=== /api/auth/me DEBUG START ===');
    console.log('[DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[DEBUG] req.cookies:', req.cookies);
    console.log('[DEBUG] Cookie header:', req.headers.cookie);
    
    // Get token from cookie or header
    let token = req.cookies?.authToken;
    console.log('[DEBUG] Token from req.cookies.authToken:', token ? token.substring(0, 50) + '...' : 'MISSING');

    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
      console.log('[DEBUG] Token from Authorization header:', token ? token.substring(0, 50) + '...' : 'MISSING');
    }

    if (!token) {
      console.log('[DEBUG] NO TOKEN FOUND - returning 401');
      return res.status(401).json({ message: 'Not authenticated', authenticated: false });
    }

    // Verify the token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    console.log('[DEBUG] JWT_SECRET:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'MISSING');

    try {
      console.log('[DEBUG] Attempting jwt.verify...');
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('[DEBUG] ✓ JWT verification SUCCESS');
      console.log('[DEBUG] Decoded token:', JSON.stringify(decoded, null, 2));

      // Check if token is blacklisted
      if (decoded.jti) {
        console.log('[DEBUG] Checking token blacklist for jti:', decoded.jti);
        const blacklistCheck = await pool.query(
          'SELECT id FROM token_blacklist WHERE token_jti = $1',
          [decoded.jti]
        );
        console.log('[DEBUG] Blacklist check result:', blacklistCheck.rows.length > 0 ? 'BLACKLISTED' : 'NOT BLACKLISTED');

        if (blacklistCheck.rows.length > 0) {
          res.clearCookie('authToken');
          console.log('[DEBUG] Token is BLACKLISTED - returning 401');
          return res.status(401).json({ message: 'Token has been revoked', authenticated: false });
        }
      }

      // Get fresh user data from database
      console.log('[DEBUG] Fetching user data for ID:', decoded.id);
      const userResult = await pool.query(
        'SELECT user_uuid, email, name FROM users WHERE user_uuid = $1',
        [decoded.id]
      );
      console.log('[DEBUG] User query result:', userResult.rows.length > 0 ? 'FOUND' : 'NOT FOUND');

      if (userResult.rows.length === 0) {
        res.clearCookie('authToken');
        console.log('[DEBUG] User NOT FOUND - returning 401');
        return res.status(401).json({ message: 'User not found', authenticated: false });
      }

      const user = userResult.rows[0];
      console.log('[DEBUG] ✓ SUCCESS - returning user data');
      console.log('=== /api/auth/me DEBUG END ===\n');
      res.json({
        authenticated: true,
        user: {
          id: user.user_uuid,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      console.log('[DEBUG] ✗ JWT verification FAILED');
      console.log('[DEBUG] Error name:', err.name);
      console.log('[DEBUG] Error message:', err.message);
      console.log('[DEBUG] Error stack:', err.stack);
      console.log('=== /api/auth/me DEBUG END ===\n');
      
      res.clearCookie('authToken');
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired', authenticated: false });
      }
      return res.status(401).json({ message: 'Invalid token', authenticated: false });
    }
  } catch (error) {
    console.log('[DEBUG] ✗ Outer try/catch ERROR');
    console.log('[DEBUG] Error:', error);
    console.log('=== /api/auth/me DEBUG END ===\n');
    logger.error('Auth check error:', error);
    res.status(500).json({ message: 'Auth check failed' });
  }
});`;

// Replace the existing /me route handler
content = content.replace(
  /\/\/ Get current auth status \/ verify token endpoint\nrouter\.get\('\/me'[\s\S]*?\n\}\);/,
  mePatch
);

fs.writeFileSync(authFilePath, content, 'utf8');
console.log('✓ Patched backend/src/routes/auth.js with debug logging');
