const pool = require('../db/pool');

/**
 * Middleware to enforce maximum chip limit per user
 * FR-016: System MUST enforce maximum of 20 NFC chips per parent account
 * FR-017: System MUST return HTTP 403 Forbidden with error message when limit reached
 */
const validateChipLimit = async (req, res, next) => {
  try {
    // Only apply to authenticated users
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Count current chips for this user
    const result = await pool.query(
      'SELECT COUNT(*) as chip_count FROM nfc_chips WHERE user_uuid = $1',
      [req.user.id]
    );

    const chipCount = parseInt(result.rows[0].chip_count, 10);
    const MAX_CHIPS_PER_USER = 20;

    if (chipCount >= MAX_CHIPS_PER_USER) {
      return res.status(403).json({
        message: `Maximum chip limit reached (${MAX_CHIPS_PER_USER} chips)`
      });
    }

    // User is under the limit, proceed
    next();
  } catch (error) {
    console.error('Error validating chip limit:', error);
    res.status(500).json({ message: 'Failed to validate chip limit' });
  }
};

module.exports = {
  validateChipLimit
};
