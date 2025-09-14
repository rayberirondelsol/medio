const pool = require('./pool');

const addIndexes = async () => {
  try {
    console.log('Adding performance indexes...');

    // Index for watch_sessions.profile_id - speeds up session queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_watch_sessions_profile_id 
      ON watch_sessions(profile_id);
    `);
    console.log('✓ Added index for watch_sessions.profile_id');

    // Composite index for daily_watch_time (profile_id, date) - speeds up daily limit checks
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_watch_time_profile_date 
      ON daily_watch_time(profile_id, date);
    `);
    console.log('✓ Added composite index for daily_watch_time(profile_id, date)');

    // Index for video_nfc_mappings.nfc_chip_id - speeds up NFC chip lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_nfc_mappings_chip_id 
      ON video_nfc_mappings(nfc_chip_id);
    `);
    console.log('✓ Added index for video_nfc_mappings.nfc_chip_id');

    // Additional useful indexes for common queries
    
    // Index for profiles.user_id - speeds up profile lookups by parent
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
      ON profiles(user_id);
    `);
    console.log('✓ Added index for profiles.user_id');

    // Index for videos.user_id - speeds up video library queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id 
      ON videos(user_id);
    `);
    console.log('✓ Added index for videos.user_id');

    // Index for nfc_chips.chip_uid - speeds up NFC scanning
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nfc_chips_uid 
      ON nfc_chips(chip_uid);
    `);
    console.log('✓ Added index for nfc_chips.chip_uid');

    // Index for watch_sessions date range queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_watch_sessions_started_at 
      ON watch_sessions(started_at);
    `);
    console.log('✓ Added index for watch_sessions.started_at');

    console.log('\n✅ All indexes added successfully!');
    console.log('Run this script with: node backend/src/db/add-indexes.js');
  } catch (error) {
    console.error('Error adding indexes:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Only run if executed directly
if (require.main === module) {
  addIndexes();
}

module.exports = addIndexes;