const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { validateChipLimit } = require('../middleware/chipLimitValidator');
const {
  nfcChipRegistrationLimiter,
  nfcChipDeletionLimiter,
  nfcChipListingLimiter
} = require('../middleware/rateLimiter');
const Sentry = require('@sentry/node');

const router = express.Router();

// Get all NFC chips for a user
// NFR-023: Rate limited to 60 requests per 15 minutes per user
router.get('/chips', authenticateToken, nfcChipListingLimiter, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nfc_chips WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching NFC chips:', error);
    res.status(500).json({ message: 'Failed to fetch NFC chips' });
  }
});

// NFC UID validation helper
const validateNFCUID = (uid) => {
  // NFC UIDs are typically hex strings (e.g., "04:E1:5C:32:B9:65:80")
  // Can be with or without colons/spaces
  const cleanUID = uid.replace(/[\s:-]/g, '');
  const hexPattern = /^[0-9A-Fa-f]+$/;
  
  if (!hexPattern.test(cleanUID)) {
    throw new Error('NFC UID must be a valid hexadecimal string');
  }
  
  // Most NFC chips have UIDs between 4-10 bytes (8-20 hex characters)
  if (cleanUID.length < 8 || cleanUID.length > 20) {
    throw new Error('NFC UID must be between 4-10 bytes (8-20 hex characters)');
  }
  
  return true;
};

// Normalize NFC UID to consistent format (uppercase, with colons)
const normalizeNFCUID = (uid) => {
  const cleanUID = uid.replace(/[\s:-]/g, '').toUpperCase();
  // Format as XX:XX:XX:XX... (pairs of hex digits separated by colons)
  return cleanUID.match(/.{1,2}/g).join(':');
};

// Register a new NFC chip
// NFR-021: Rate limited to 10 requests per 15 minutes per user
// FR-016/FR-017: Enforce 20 chip limit per user
router.post('/chips',
  authenticateToken,
  nfcChipRegistrationLimiter,
  validateChipLimit,
  [
    body('chip_uid').notEmpty().trim().escape().custom(validateNFCUID),
    body('label').notEmpty().trim().escape()
      .isLength({ min: 1, max: 50 })
      .withMessage('Label must be 1-50 characters')
      .matches(/^[a-zA-Z0-9\s\-']+$/)
      .withMessage('Label can only contain letters, numbers, spaces, hyphens, and apostrophes')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chip_uid, label } = req.body;
    const normalizedUID = normalizeNFCUID(chip_uid);

    try {
      const result = await pool.query(`
        INSERT INTO nfc_chips (user_id, chip_uid, label)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [req.user.id, normalizedUID, label]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        // FR-015: Identical error message regardless of ownership (prevents UID enumeration)
        return res.status(409).json({ message: 'NFC chip already registered' });
      }

      // FR-014: Log error to Sentry with contextual metadata
      Sentry.captureException(error, {
        tags: {
          feature: 'nfc-chip-registration',
          endpoint: 'POST /api/nfc/chips'
        },
        extra: {
          user_id: req.user?.id,
          chip_uid_prefix: normalizedUID?.substring(0, 8), // Only log first 8 chars
          label_length: label?.length
        }
      });

      console.error('Error registering NFC chip:', error);
      res.status(500).json({ message: 'Failed to register NFC chip' });
    }
  }
);

// Map video to NFC chip
router.post('/map',
  authenticateToken,
  [
    body('video_id').isUUID(),
    body('nfc_chip_id').isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { video_id, nfc_chip_id, profile_id, max_watch_time_minutes } = req.body;

    try {
      // Verify ownership
      const chipCheck = await pool.query(
        'SELECT id FROM nfc_chips WHERE id = $1 AND user_id = $2',
        [nfc_chip_id, req.user.id]
      );

      if (chipCheck.rows.length === 0) {
        return res.status(403).json({ message: 'NFC chip not found or access denied' });
      }

      const result = await pool.query(`
        INSERT INTO video_nfc_mappings (video_id, nfc_chip_id, profile_id, max_watch_time_minutes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (video_id, nfc_chip_id, profile_id)
        DO UPDATE SET max_watch_time_minutes = $4, is_active = true
        RETURNING *
      `, [video_id, nfc_chip_id, profile_id, max_watch_time_minutes]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error mapping video to NFC:', error);
      res.status(500).json({ message: 'Failed to map video to NFC chip' });
    }
  }
);

// Public NFC scan endpoint for kids mode (no authentication required)
router.post('/scan/public',
  [
    body('chip_uid').notEmpty().trim().escape().custom(validateNFCUID),
    body('profile_id').optional().isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chip_uid, profile_id } = req.body;
    const normalizedUID = normalizeNFCUID(chip_uid);

    try {
      // Get active video mapping for this chip
      const result = await pool.query(`
        SELECT v.*, vnm.max_watch_time_minutes, p.name as platform_name
        FROM nfc_chips nc
        JOIN video_nfc_mappings vnm ON nc.id = vnm.nfc_chip_id
        JOIN videos v ON vnm.video_id = v.id
        LEFT JOIN platforms p ON v.platform_id = p.id
        WHERE nc.chip_uid = $1
          AND vnm.is_active = true
          AND (vnm.profile_id = $2 OR vnm.profile_id IS NULL)
        LIMIT 1
      `, [normalizedUID, profile_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No video assigned to this chip' });
      }

      const video = result.rows[0];

      // Check daily limit if profile is provided
      if (profile_id) {
        const limitCheck = await pool.query(`
          SELECT p.daily_limit_minutes, COALESCE(dwt.total_minutes, 0) as watched_today
          FROM profiles p
          LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
          WHERE p.id = $1
        `, [profile_id]);

        if (limitCheck.rows.length > 0) {
          const { daily_limit_minutes, watched_today } = limitCheck.rows[0];
          if (watched_today >= daily_limit_minutes) {
            return res.status(403).json({ 
              message: 'Daily watch limit reached',
              limit_reached: true
            });
          }
          video.remaining_minutes = daily_limit_minutes - watched_today;
        }
      }

      res.json(video);
    } catch (error) {
      console.error('Error scanning NFC chip:', error);
      res.status(500).json({ message: 'Failed to scan NFC chip' });
    }
  }
);

// Authenticated NFC scan endpoint for parent mode (with user context)
router.post('/scan',
  authenticateToken,
  [
    body('chip_uid').notEmpty().trim().escape().custom(validateNFCUID),
    body('profile_id').optional().isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chip_uid, profile_id } = req.body;
    const normalizedUID = normalizeNFCUID(chip_uid);

    try {
      // Get active video mapping for this chip (with user context)
      const result = await pool.query(`
        SELECT v.*, vnm.max_watch_time_minutes, p.name as platform_name
        FROM nfc_chips nc
        JOIN video_nfc_mappings vnm ON nc.id = vnm.nfc_chip_id
        JOIN videos v ON vnm.video_id = v.id
        LEFT JOIN platforms p ON v.platform_id = p.id
        WHERE nc.chip_uid = $1
          AND vnm.is_active = true
          AND (vnm.profile_id = $2 OR vnm.profile_id IS NULL)
          AND nc.user_id = $3
        LIMIT 1
      `, [normalizedUID, profile_id, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No video assigned to this chip' });
      }

      const video = result.rows[0];

      // Check daily limit if profile is provided
      if (profile_id) {
        const limitCheck = await pool.query(`
          SELECT p.daily_limit_minutes, COALESCE(dwt.total_minutes, 0) as watched_today
          FROM profiles p
          LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
          WHERE p.id = $1 AND p.user_id = $2
        `, [profile_id, req.user.id]);

        if (limitCheck.rows.length > 0) {
          const { daily_limit_minutes, watched_today } = limitCheck.rows[0];
          if (watched_today >= daily_limit_minutes) {
            return res.status(403).json({ 
              message: 'Daily watch limit reached',
              limit_reached: true
            });
          }
          video.remaining_minutes = daily_limit_minutes - watched_today;
        }
      }

      res.json(video);
    } catch (error) {
      console.error('Error scanning NFC chip:', error);
      res.status(500).json({ message: 'Failed to scan NFC chip' });
    }
  }
);

// Remove NFC mapping
router.delete('/map/:mappingId', authenticateToken, async (req, res) => {
  const { mappingId } = req.params;

  try {
    const result = await pool.query(`
      UPDATE video_nfc_mappings vnm
      SET is_active = false
      FROM nfc_chips nc
      WHERE vnm.nfc_chip_id = nc.id
        AND vnm.id = $1
        AND nc.user_id = $2
      RETURNING vnm.id
    `, [mappingId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mapping not found' });
    }

    res.json({ message: 'NFC mapping removed successfully' });
  } catch (error) {
    console.error('Error removing NFC mapping:', error);
    res.status(500).json({ message: 'Failed to remove NFC mapping' });
  }
});

// Delete NFC chip
// NFR-022: Rate limited to 20 requests per 15 minutes per user
// T007: Implements DELETE /api/nfc/chips/:chipId endpoint with ownership verification
router.delete('/chips/:chipId',
  authenticateToken,
  nfcChipDeletionLimiter,
  async (req, res) => {
    const { chipId } = req.params;

    try {
      // Delete chip with ownership verification
      // CASCADE deletion will automatically remove associated video_nfc_mappings
      const result = await pool.query(
        'DELETE FROM nfc_chips WHERE id = $1 AND user_id = $2 RETURNING id',
        [chipId, req.user.id]
      );

      if (result.rows.length === 0) {
        // NFR-009: Identical error message for "not found" and "not owned" (prevents ownership enumeration)
        return res.status(404).json({ message: 'NFC chip not found' });
      }

      res.json({ message: 'NFC chip deleted successfully' });
    } catch (error) {
      // FR-014: Log deletion errors to Sentry
      Sentry.captureException(error, {
        tags: {
          feature: 'nfc-chip-deletion',
          endpoint: 'DELETE /api/nfc/chips/:chipId'
        },
        extra: {
          user_id: req.user?.id,
          chip_id: chipId
        }
      });

      console.error('Error deleting NFC chip:', error);
      res.status(500).json({ message: 'Failed to delete NFC chip' });
    }
  }
);

module.exports = router;