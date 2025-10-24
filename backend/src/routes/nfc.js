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
        // NFR-009: Add random delay (0-100ms) to prevent timing attacks
        const delay = Math.floor(Math.random() * 100);
        return setTimeout(() => {
          res.status(409).json({ message: 'NFC chip already registered' });
        }, delay);
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

      console.error('Error registering NFC chip:', {
        code: error.code,
        message: error.message,
        user_id: req.user?.id
      });
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

      console.error('Error deleting NFC chip:', {
        code: error.code,
        message: error.message,
        user_id: req.user?.id,
        chip_id: chipId
      });
      res.status(500).json({ message: 'Failed to delete NFC chip' });
    }
  }
);

// ================================================================================
// VIDEO ASSIGNMENT ENDPOINTS (Feature: 007-nfc-video-assignment)
// ================================================================================

// GET /api/nfc/chips/:chipId/videos
// Get all videos assigned to an NFC chip in sequence order
router.get('/chips/:chipId/videos', authenticateToken, async (req, res) => {
  const { chipId } = req.params;

  try {
    // Verify chip ownership (Production schema: id, user_id)
    const chipCheck = await pool.query(
      'SELECT id, label, chip_uid FROM nfc_chips WHERE id = $1 AND user_id = $2',
      [chipId, req.user.id]
    );

    if (chipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chip not found or not owned by user',
        code: 'UNAUTHORIZED_CHIP'
      });
    }

    const chip = chipCheck.rows[0];

    // Get videos in sequence order (Production schema: id, nfc_chip_id, video_id, platform_id)
    const result = await pool.query(`
      SELECT
        v.id,
        v.title,
        v.thumbnail_url,
        v.duration_seconds,
        p.name as platform_name,
        vnm.sequence_order,
        vnm.id as mapping_id
      FROM video_nfc_mappings vnm
      JOIN videos v ON vnm.video_id = v.id
      JOIN platforms p ON v.platform_id = p.id
      WHERE vnm.nfc_chip_id = $1
        AND vnm.is_active = true
      ORDER BY vnm.sequence_order ASC
    `, [chipId]);

    res.json({
      chip: {
        id: chip.id,
        label: chip.label,
        chip_uid: chip.chip_uid
      },
      videos: result.rows
    });
  } catch (error) {
    console.error('Error fetching chip videos:', error);
    Sentry.captureException(error, {
      tags: {
        feature: 'nfc-video-assignment',
        endpoint: 'GET /api/nfc/chips/:chipId/videos'
      },
      extra: {
        user_id: req.user?.id,
        chip_id: chipId
      }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chip videos',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/nfc/chips/:chipId/videos
// Batch update video assignments for an NFC chip (replaces all existing assignments)
router.put('/chips/:chipId/videos',
  authenticateToken,
  [
    body('videos').isArray().withMessage('videos must be an array'),
    body('videos.*.video_id').isUUID().withMessage('video_id must be a valid UUID'),
    body('videos.*.sequence_order').isInt({ min: 1 }).withMessage('sequence_order must be a positive integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { chipId } = req.params;
    const { videos } = req.body;

    // Validate max 50 videos (FR-010)
    if (videos.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 videos per chip',
        code: 'MAX_VIDEOS_EXCEEDED'
      });
    }

    // Validate sequence is contiguous (1, 2, 3, ...)
    const sequences = videos.map(v => v.sequence_order).sort((a, b) => a - b);
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i] !== i + 1) {
        return res.status(400).json({
          success: false,
          message: 'Sequence must be contiguous (1, 2, 3, ...)',
          code: 'NON_CONTIGUOUS_SEQUENCE'
        });
      }
    }

    // Check for duplicate video_ids
    const videoIds = videos.map(v => v.video_id);
    if (new Set(videoIds).size !== videoIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate video assignments not allowed',
        code: 'DUPLICATE_VIDEO'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify chip ownership (Production schema: id, user_id)
      const chipCheck = await client.query(
        'SELECT id FROM nfc_chips WHERE id = $1 AND user_id = $2',
        [chipId, req.user.id]
      );

      if (chipCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Chip not found',
          code: 'UNAUTHORIZED_CHIP'
        });
      }

      // Verify all videos belong to user (Production schema: id, user_id)
      const videoCheck = await client.query(
        'SELECT id FROM videos WHERE id = ANY($1) AND user_id = $2',
        [videoIds, req.user.id]
      );

      if (videoCheck.rows.length !== videos.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'One or more videos not found or not owned by user',
          code: 'INVALID_VIDEO_IDS'
        });
      }

      // Delete existing mappings (Production schema: nfc_chip_id)
      await client.query(
        'DELETE FROM video_nfc_mappings WHERE nfc_chip_id = $1',
        [chipId]
      );

      // Insert new mappings (Production schema: video_id, nfc_chip_id)
      for (const video of videos) {
        await client.query(`
          INSERT INTO video_nfc_mappings (video_id, nfc_chip_id, sequence_order, is_active)
          VALUES ($1, $2, $3, true)
        `, [video.video_id, chipId, video.sequence_order]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Video assignments updated successfully',
        count: videos.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating video assignments:', error);
      Sentry.captureException(error, {
        tags: {
          feature: 'nfc-video-assignment',
          endpoint: 'PUT /api/nfc/chips/:chipId/videos'
        },
        extra: {
          user_id: req.user?.id,
          chip_id: chipId,
          video_count: videos?.length
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update video assignments',
        code: 'INTERNAL_ERROR'
      });
    } finally {
      client.release();
    }
  }
);

// DELETE /api/nfc/chips/:chipId/videos/:videoId
// Remove a video from an NFC chip. Remaining videos are automatically re-sequenced.
router.delete('/chips/:chipId/videos/:videoId', authenticateToken, async (req, res) => {
  const { chipId, videoId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify chip ownership and find mapping (Production schema: id, nfc_chip_id, video_id, user_id)
    const mappingCheck = await client.query(`
      SELECT vnm.id
      FROM video_nfc_mappings vnm
      JOIN nfc_chips nc ON vnm.nfc_chip_id = nc.id
      WHERE vnm.nfc_chip_id = $1
        AND vnm.video_id = $2
        AND nc.user_id = $3
    `, [chipId, videoId, req.user.id]);

    if (mappingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Mapping not found',
        code: 'MAPPING_NOT_FOUND'
      });
    }

    // Delete the mapping (Production schema: id)
    await client.query(
      'DELETE FROM video_nfc_mappings WHERE id = $1',
      [mappingCheck.rows[0].id]
    );

    // Re-sequence remaining videos (Production schema: id, nfc_chip_id)
    await client.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY nfc_chip_id ORDER BY sequence_order) as new_sequence
        FROM video_nfc_mappings
        WHERE nfc_chip_id = $1
      )
      UPDATE video_nfc_mappings vnm
      SET sequence_order = ranked.new_sequence
      FROM ranked
      WHERE vnm.id = ranked.id
    `, [chipId]);

    // Count remaining videos (Production schema: nfc_chip_id)
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM video_nfc_mappings WHERE nfc_chip_id = $1',
      [chipId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Video removed from chip successfully',
      remaining_videos: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing video from chip:', error);
    Sentry.captureException(error, {
      tags: {
        feature: 'nfc-video-assignment',
        endpoint: 'DELETE /api/nfc/chips/:chipId/videos/:videoId'
      },
      extra: {
        user_id: req.user?.id,
        chip_id: chipId,
        video_id: videoId
      }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to remove video from chip',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

module.exports = router;