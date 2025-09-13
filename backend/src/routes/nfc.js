const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all NFC chips for a user
router.get('/chips', authenticateToken, async (req, res) => {
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

// Register a new NFC chip
router.post('/chips',
  authenticateToken,
  [
    body('chip_uid').notEmpty().trim(),
    body('label').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chip_uid, label } = req.body;

    try {
      const result = await pool.query(`
        INSERT INTO nfc_chips (user_id, chip_uid, label)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [req.user.id, chip_uid, label]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ message: 'NFC chip already registered' });
      }
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

// Scan NFC chip (public endpoint for kids)
router.post('/scan',
  [
    body('chip_uid').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chip_uid, profile_id } = req.body;

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
      `, [chip_uid, profile_id]);

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

module.exports = router;