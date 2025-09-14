const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all profiles for a user with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get paginated results
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    
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
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: 'Failed to fetch profiles' });
  }
});

// Create a new profile
router.post('/',
  authenticateToken,
  [
    body('name').notEmpty().trim().escape(),
    body('avatar_url').optional().isURL(),
    body('daily_limit_minutes').optional().isInt({ min: 1, max: 1440 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, avatar_url, daily_limit_minutes } = req.body;

    try {
      const result = await pool.query(`
        INSERT INTO profiles (user_id, name, avatar_url, daily_limit_minutes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [req.user.id, name, avatar_url, daily_limit_minutes || 60]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating profile:', error);
      res.status(500).json({ message: 'Failed to create profile' });
    }
  }
);

// Update a profile
router.put('/:id',
  authenticateToken,
  [
    body('name').optional().notEmpty().trim(),
    body('daily_limit_minutes').optional().isInt({ min: 1, max: 1440 })
  ],
  async (req, res) => {
    const { id } = req.params;
    const { name, avatar_url, daily_limit_minutes } = req.body;

    try {
      const result = await pool.query(`
        UPDATE profiles
        SET name = COALESCE($1, name),
            avatar_url = COALESCE($2, avatar_url),
            daily_limit_minutes = COALESCE($3, daily_limit_minutes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `, [name, avatar_url, daily_limit_minutes, id, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);

// Delete a profile
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ message: 'Failed to delete profile' });
  }
});

// Get profile watch statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const profileCheck = await pool.query(
      'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Get today's watch time
    const todayStats = await pool.query(`
      SELECT COALESCE(total_minutes, 0) as watched_today
      FROM daily_watch_time
      WHERE profile_id = $1 AND date = CURRENT_DATE
    `, [id]);

    // Get weekly stats
    const weeklyStats = await pool.query(`
      SELECT date, total_minutes
      FROM daily_watch_time
      WHERE profile_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date DESC
    `, [id]);

    // Get most watched videos
    const topVideos = await pool.query(`
      SELECT v.title, COUNT(ws.id) as watch_count, SUM(ws.duration_seconds) / 60 as total_minutes
      FROM watch_sessions ws
      JOIN videos v ON ws.video_id = v.id
      WHERE ws.profile_id = $1
      GROUP BY v.id, v.title
      ORDER BY watch_count DESC
      LIMIT 5
    `, [id]);

    res.json({
      watched_today: todayStats.rows[0]?.watched_today || 0,
      weekly_stats: weeklyStats.rows,
      top_videos: topVideos.rows
    });
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    res.status(500).json({ message: 'Failed to fetch profile statistics' });
  }
});

module.exports = router;