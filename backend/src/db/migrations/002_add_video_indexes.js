const pool = require('../pool');

/**
 * Migration: Add performance indexes for video queries
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Task: T002
 *
 * Purpose:
 * - Adds index on user_id for fast video listing by family/user
 * - Adds index on platform_id for filtering videos by platform
 * - Adds index on created_at (added_date) for sorting videos by newest first
 *
 * Note: These indexes improve query performance for common operations:
 * - Listing all videos for a user/family
 * - Filtering videos by platform
 * - Sorting videos by date added
 */

const addVideoIndexes = async () => {
  try {
    console.log('Starting migration: Add video table indexes...');

    // Index on user_id (family_id equivalent) for fast video listing
    // Speeds up queries like: SELECT * FROM videos WHERE user_id = ?
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id
      ON videos(user_id);
    `);
    console.log('✓ Added index on videos.user_id (family/owner lookup)');

    // Index on platform_id for filtering by platform
    // Speeds up queries like: SELECT * FROM videos WHERE platform_id = ?
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_platform_id
      ON videos(platform_id);
    `);
    console.log('✓ Added index on videos.platform_id (platform filtering)');

    // Index on created_at (added_date) for sorting by newest first
    // Speeds up queries like: SELECT * FROM videos ORDER BY created_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_created_at
      ON videos(created_at DESC);
    `);
    console.log('✓ Added index on videos.created_at (date sorting)');

    // Composite index for combined queries (user_id + created_at)
    // Speeds up queries like: SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_created
      ON videos(user_id, created_at DESC);
    `);
    console.log('✓ Added composite index on videos(user_id, created_at)');

    console.log('\n✅ Migration completed successfully!');
    console.log('Run this script with: node backend/src/db/migrations/002_add_video_indexes.js');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Index already exists. This is safe to ignore if re-running the migration.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
};

// Only run if executed directly
if (require.main === module) {
  addVideoIndexes();
}

module.exports = addVideoIndexes;
