const pool = require('../pool');

/**
 * Migration: Add video_url column and unique constraint
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Task: T001
 *
 * Purpose:
 * - Adds video_url column to videos table to store the original URL pasted by user
 * - Creates unique constraint on (user_id, video_url) to prevent duplicate videos per user
 *
 * Note: This implementation uses user_id (existing column) rather than family_id
 * as the current schema doesn't have a families table. user_id serves as the
 * family/owner identifier in the current implementation.
 */

const addVideoUrlConstraint = async () => {
  try {
    console.log('Starting migration: Add video_url column and unique constraint...');

    // Add video_url column if it doesn't exist
    await pool.query(`
      ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS video_url TEXT;
    `);
    console.log('✓ Added video_url column to videos table');

    // Add unique constraint on (user_id, video_url) to prevent duplicates per user
    // Using user_id instead of family_id as it's the current schema's owner identifier
    await pool.query(`
      ALTER TABLE videos
      ADD CONSTRAINT IF NOT EXISTS unique_video_url_per_user
      UNIQUE (user_id, video_url);
    `);
    console.log('✓ Added unique constraint on (user_id, video_url)');

    console.log('\n✅ Migration completed successfully!');
    console.log('Run this script with: node backend/src/db/migrations/001_add_video_url_unique_constraint.js');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Constraint or column already exists. This is safe to ignore if re-running the migration.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
};

// Only run if executed directly
if (require.main === module) {
  addVideoUrlConstraint();
}

module.exports = addVideoUrlConstraint;
