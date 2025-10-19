const pool = require('../pool');

/**
 * Migration: Add channel_name column to videos table
 *
 * Feature: Add Video via Link (002-add-video-link)
 *
 * Purpose:
 * - Adds channel_name column to videos table to store the channel/creator name
 */

const addChannelName = async () => {
  try {
    console.log('Starting migration: Add channel_name column...');

    // Add channel_name column if it doesn't exist
    await pool.query(`
      ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
    `);
    console.log('✓ Added channel_name column to videos table');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Column already exists. This is safe to ignore if re-running the migration.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
};

// Only run if executed directly
if (require.main === module) {
  addChannelName();
}

module.exports = addChannelName;
