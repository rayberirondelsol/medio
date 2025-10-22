const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all videos for a user with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM videos WHERE user_id = $1',
      [req.user.id]
    );
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated results
    const result = await pool.query(`
      SELECT v.*, p.name as platform_name, p.icon_url
      FROM videos v
      LEFT JOIN platforms p ON v.platform_id = p.id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

// Add a new video
router.post('/',
  authenticateToken,
  [
    body('title').notEmpty().trim().escape(),
    body('description').optional().trim().escape(),
    body('thumbnail_url').optional().isURL(),
    body('platform_id').isUUID(),
    body('platform_video_id').notEmpty().trim().escape(),
    body('video_url').optional().isURL(),
    body('duration_seconds').optional().isInt({ min: 1 }),
    body('age_rating').optional().isIn(['G', 'PG', 'PG-13', 'R']),
    body('channel_name').optional().trim().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, thumbnail_url, platform_id, platform_video_id, video_url, duration_seconds, age_rating, channel_name } = req.body;

    try {
      // T008: Validate that platform_id exists in platforms table
      const platformCheck = await pool.query(
        'SELECT id FROM platforms WHERE id = $1',
        [platform_id]
      );

      if (platformCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid platform',
          code: 'INVALID_PLATFORM',
          details: {
            platform_id: ['The specified platform does not exist']
          }
        });
      }

      // T010: Check for duplicate video_url if provided
      if (video_url) {
        const duplicateCheck = await pool.query(
          'SELECT id FROM videos WHERE user_id = $1 AND video_url = $2',
          [req.user.id, video_url]
        );

        if (duplicateCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'This video is already in your library',
            code: 'DUPLICATE_URL',
            details: {
              video_url: ['A video with this URL already exists in your family\'s library'],
              existing_video_id: duplicateCheck.rows[0].id
            }
          });
        }
      }

      // Insert the video
      const result = await pool.query(`
        INSERT INTO videos (user_id, title, description, thumbnail_url, platform_id, platform_video_id, video_url, duration_seconds, age_rating, channel_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [req.user.id, title, description, thumbnail_url, platform_id, platform_video_id, video_url, duration_seconds, age_rating, channel_name]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding video:', error);

      // T010: Handle database unique constraint violation (23505)
      if (error.code === '23505' && error.constraint === 'unique_video_url_per_user') {
        // Extract the video ID if possible (this is a fallback in case the pre-check missed it)
        return res.status(409).json({
          success: false,
          error: 'This video is already in your library',
          code: 'DUPLICATE_URL',
          details: {
            video_url: ['A video with this URL already exists in your family\'s library']
          }
        });
      }

      res.status(500).json({ message: 'Failed to add video' });
    }
  }
);

// Update a video
router.put('/:id',
  authenticateToken,
  [
    body('title').optional().notEmpty().trim()
  ],
  async (req, res) => {
    const { id } = req.params;
    const { title, description, thumbnail_url, age_rating } = req.body;

    try {
      const result = await pool.query(`
        UPDATE videos
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            thumbnail_url = COALESCE($3, thumbnail_url),
            age_rating = COALESCE($4, age_rating),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `, [title, description, thumbnail_url, age_rating, id, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({ message: 'Failed to update video' });
    }
  }
);

// Delete a video
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM videos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

// Get video with NFC mapping
router.get('/:videoId/nfc-mapping', authenticateToken, async (req, res) => {
  const { videoId } = req.params;

  try {
    const result = await pool.query(`
      SELECT vnm.*, nc.chip_uid, nc.label, p.name as profile_name
      FROM video_nfc_mappings vnm
      JOIN nfc_chips nc ON vnm.nfc_chip_id = nc.id
      LEFT JOIN profiles p ON vnm.profile_id = p.id
      WHERE vnm.video_id = $1 AND nc.user_id = $2
    `, [videoId, req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching NFC mappings:', error);
    res.status(500).json({ message: 'Failed to fetch NFC mappings' });
  }
});

module.exports = router;