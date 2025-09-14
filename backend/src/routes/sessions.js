const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public session endpoints for kids mode (no authentication required)
router.post('/start/public',
  [
    body('profile_id').optional().isUUID(),
    body('video_id').isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { profile_id, video_id } = req.body;

    try {
      // Create watch session
      const result = await pool.query(`
        INSERT INTO watch_sessions (profile_id, video_id)
        VALUES ($1, $2)
        RETURNING *
      `, [profile_id, video_id]);

      const session = result.rows[0];

      // Get time limits
      let maxWatchTime = null;
      if (profile_id) {
        const limitCheck = await pool.query(`
          SELECT p.daily_limit_minutes, COALESCE(dwt.total_minutes, 0) as watched_today
          FROM profiles p
          LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
          WHERE p.id = $1
        `, [profile_id]);

        if (limitCheck.rows.length > 0) {
          const { daily_limit_minutes, watched_today } = limitCheck.rows[0];
          maxWatchTime = Math.max(0, daily_limit_minutes - watched_today);
        }
      }

      res.status(201).json({
        session_id: session.id,
        started_at: session.started_at,
        max_watch_time_minutes: maxWatchTime
      });
    } catch (error) {
      console.error('Error starting public session:', error);
      res.status(500).json({ message: 'Failed to start watch session' });
    }
  }
);

router.post('/end/public',
  [
    body('session_id').isUUID(),
    body('stopped_reason').optional().isIn(['manual', 'time_limit', 'daily_limit', 'error'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { session_id, stopped_reason } = req.body;

    try {
      // End the session (no ownership check for public endpoint)
      const sessionResult = await pool.query(`
        UPDATE watch_sessions
        SET ended_at = CURRENT_TIMESTAMP,
            duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
            stopped_reason = $2
        WHERE id = $1 AND ended_at IS NULL
        RETURNING *, EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER as duration_seconds
      `, [session_id, stopped_reason || 'manual']);

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found or already ended' });
      }

      const session = sessionResult.rows[0];

      // Update daily watch time if profile exists
      if (session.profile_id) {
        const watchMinutes = Math.ceil(session.duration_seconds / 60);
        
        await pool.query(`
          INSERT INTO daily_watch_time (profile_id, date, total_minutes)
          VALUES ($1, CURRENT_DATE, $2)
          ON CONFLICT (profile_id, date)
          DO UPDATE SET total_minutes = daily_watch_time.total_minutes + $2
        `, [session.profile_id, watchMinutes]);
      }

      res.json({
        session_id: session.id,
        duration_seconds: session.duration_seconds,
        stopped_reason: session.stopped_reason
      });
    } catch (error) {
      console.error('Error ending public session:', error);
      res.status(500).json({ message: 'Failed to end watch session' });
    }
  }
);

router.post('/heartbeat/public',
  [
    body('session_id').isUUID()
  ],
  async (req, res) => {
    const { session_id } = req.body;

    try {
      // Check if session should continue
      const sessionCheck = await pool.query(`
        SELECT ws.*, p.daily_limit_minutes,
               COALESCE(dwt.total_minutes, 0) + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ws.started_at)) / 60 as total_watched
        FROM watch_sessions ws
        LEFT JOIN profiles p ON ws.profile_id = p.id
        LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
        WHERE ws.id = $1 AND ws.ended_at IS NULL
      `, [session_id]);

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Session not found or already ended',
          should_stop: true
        });
      }

      const session = sessionCheck.rows[0];
      let shouldStop = false;
      let stopReason = null;

      // Check if daily limit exceeded
      if (session.daily_limit_minutes && session.total_watched >= session.daily_limit_minutes) {
        shouldStop = true;
        stopReason = 'daily_limit';
      }

      res.json({
        should_stop: shouldStop,
        stop_reason: stopReason,
        watched_minutes: Math.floor(session.total_watched || 0)
      });
    } catch (error) {
      console.error('Error processing public heartbeat:', error);
      res.status(500).json({ message: 'Failed to process heartbeat' });
    }
  }
);

// Start a watch session (authenticated)
router.post('/start',
  authenticateToken,
  [
    body('profile_id').optional().isUUID(),
    body('video_id').isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { profile_id, video_id } = req.body;
    
    // Verify that the profile belongs to the authenticated user if provided
    if (profile_id) {
      const profileCheck = await pool.query(
        'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
        [profile_id, req.user.id]
      );
      
      if (profileCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Profile not found or access denied' });
      }
    }

    try {
      // Create watch session
      const result = await pool.query(`
        INSERT INTO watch_sessions (profile_id, video_id)
        VALUES ($1, $2)
        RETURNING *
      `, [profile_id, video_id]);

      const session = result.rows[0];

      // Get time limits
      let maxWatchTime = null;
      if (profile_id) {
        const limitCheck = await pool.query(`
          SELECT p.daily_limit_minutes, COALESCE(dwt.total_minutes, 0) as watched_today
          FROM profiles p
          LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
          WHERE p.id = $1
        `, [profile_id]);

        if (limitCheck.rows.length > 0) {
          const { daily_limit_minutes, watched_today } = limitCheck.rows[0];
          maxWatchTime = Math.max(0, daily_limit_minutes - watched_today);
        }
      }

      res.status(201).json({
        session_id: session.id,
        started_at: session.started_at,
        max_watch_time_minutes: maxWatchTime
      });
    } catch (error) {
      console.error('Error starting session:', error);
      res.status(500).json({ message: 'Failed to start watch session' });
    }
  }
);

// End a watch session
router.post('/end',
  authenticateToken,
  [
    body('session_id').isUUID(),
    body('stopped_reason').optional().isIn(['manual', 'time_limit', 'daily_limit', 'error'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { session_id, stopped_reason } = req.body;

    try {
      // Verify session ownership through profile
      const ownershipCheck = await pool.query(`
        SELECT ws.id 
        FROM watch_sessions ws
        LEFT JOIN profiles p ON ws.profile_id = p.id
        WHERE ws.id = $1 AND (p.user_id = $2 OR ws.profile_id IS NULL)
      `, [session_id, req.user.id]);
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Session not found or access denied' });
      }

      // End the session
      const sessionResult = await pool.query(`
        UPDATE watch_sessions
        SET ended_at = CURRENT_TIMESTAMP,
            duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
            stopped_reason = $2
        WHERE id = $1 AND ended_at IS NULL
        RETURNING *, EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER as duration_seconds
      `, [session_id, stopped_reason || 'manual']);

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found or already ended' });
      }

      const session = sessionResult.rows[0];

      // Update daily watch time if profile exists
      if (session.profile_id) {
        const watchMinutes = Math.ceil(session.duration_seconds / 60);
        
        await pool.query(`
          INSERT INTO daily_watch_time (profile_id, date, total_minutes)
          VALUES ($1, CURRENT_DATE, $2)
          ON CONFLICT (profile_id, date)
          DO UPDATE SET total_minutes = daily_watch_time.total_minutes + $2
        `, [session.profile_id, watchMinutes]);
      }

      res.json({
        session_id: session.id,
        duration_seconds: session.duration_seconds,
        stopped_reason: session.stopped_reason
      });
    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({ message: 'Failed to end watch session' });
    }
  }
);

// Update session progress (heartbeat)
router.post('/heartbeat',
  authenticateToken,
  [
    body('session_id').isUUID()
  ],
  async (req, res) => {
    const { session_id } = req.body;

    try {
      // Check if session should continue
      const sessionCheck = await pool.query(`
        SELECT ws.*, p.daily_limit_minutes,
               COALESCE(dwt.total_minutes, 0) + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ws.started_at)) / 60 as total_watched
        FROM watch_sessions ws
        LEFT JOIN profiles p ON ws.profile_id = p.id
        LEFT JOIN daily_watch_time dwt ON p.id = dwt.profile_id AND dwt.date = CURRENT_DATE
        WHERE ws.id = $1 AND ws.ended_at IS NULL
      `, [session_id]);

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Session not found or already ended',
          should_stop: true
        });
      }

      const session = sessionCheck.rows[0];
      let shouldStop = false;
      let stopReason = null;

      // Check if daily limit exceeded
      if (session.daily_limit_minutes && session.total_watched >= session.daily_limit_minutes) {
        shouldStop = true;
        stopReason = 'daily_limit';
      }

      res.json({
        should_stop: shouldStop,
        stop_reason: stopReason,
        watched_minutes: Math.floor(session.total_watched || 0)
      });
    } catch (error) {
      console.error('Error processing heartbeat:', error);
      res.status(500).json({ message: 'Failed to process heartbeat' });
    }
  }
);

module.exports = router;