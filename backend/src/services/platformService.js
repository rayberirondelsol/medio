const pool = require('../db/pool');
const logger = require('../utils/logger');

/**
 * Platform Service
 *
 * Handles platform-related database operations for video streaming platforms
 * like YouTube, Vimeo, Dailymotion, etc.
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Task: T007
 */

/**
 * Get a platform by its name
 *
 * @param {string} name - The platform name (e.g., 'YouTube', 'Vimeo', 'Dailymotion')
 * @returns {Promise<Object|null>} Platform object with {id (UUID), name (string), requiresAuth (boolean)} or null if not found
 */
const getPlatformByName = async (name) => {
  try {
    const result = await pool.query(
      'SELECT id, name, requires_auth as "requiresAuth" FROM platforms WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error(`Error fetching platform by name "${name}":`, error);
    throw new Error(`Failed to fetch platform: ${error.message}`);
  }
};

/**
 * Get all available platforms
 *
 * @returns {Promise<Array>} Array of platform objects with {id (UUID), name (string), requiresAuth (boolean)}
 */
const getAllPlatforms = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, requires_auth as "requiresAuth" FROM platforms ORDER BY name'
    );

    return result.rows;
  } catch (error) {
    logger.error('Error fetching all platforms:', error);
    throw new Error(`Failed to fetch platforms: ${error.message}`);
  }
};

module.exports = {
  getPlatformByName,
  getAllPlatforms
};
