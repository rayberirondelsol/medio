const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/platforms
 *
 * Fetches the list of supported video platforms with their UUIDs.
 * This endpoint fixes the platform_id UUID mismatch bug (FR-030).
 *
 * Frontend should cache this response for the session duration to minimize requests.
 *
 * Note: This endpoint is public (no auth required) because platform information
 * is needed by the Add Video modal, which may be opened before full authentication.
 *
 * @returns {Object} { platforms: Array<{ id: UUID, name: string, requiresAuth: boolean }> }
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        display_name
      FROM platforms
      ORDER BY name
    `);

    // Transform database results to match API contract
    const platforms = result.rows.map(platform => ({
      id: platform.id,
      name: platform.name,
      displayName: platform.display_name
    }));

    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      error: 'Failed to fetch platforms',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
