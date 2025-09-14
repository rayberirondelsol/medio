const pool = require('./pool');

const createTables = async () => {
  try {
    // Create users table (parents) with soft delete support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        deleted_at TIMESTAMP,
        deleted_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create child profiles table with soft delete support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        daily_limit_minutes INTEGER DEFAULT 60,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create platforms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platforms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        icon_url VARCHAR(500),
        api_endpoint VARCHAR(500),
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create videos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_id UUID REFERENCES platforms(id),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(500),
        platform_video_id VARCHAR(255),
        duration_seconds INTEGER,
        age_rating VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create NFC chips table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_chips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chip_uid VARCHAR(255) UNIQUE NOT NULL,
        label VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video-NFC mapping table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_nfc_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id) ON DELETE CASCADE,
        profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        max_watch_time_minutes INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, nfc_chip_id, profile_id)
      )
    `);

    // Create watch sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watch_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_seconds INTEGER,
        stopped_reason VARCHAR(50) -- 'manual', 'time_limit', 'daily_limit', 'error'
      )
    `);

    // Create daily watch time table with timezone support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_watch_time (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_minutes INTEGER DEFAULT 0,
        timezone VARCHAR(50) DEFAULT 'UTC',
        UNIQUE(profile_id, date)
      )
    `);

    // Create token blacklist table for session invalidation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_jti VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // Insert default platforms
    await pool.query(`
      INSERT INTO platforms (name, icon_url, api_endpoint, is_active) VALUES
        ('YouTube', '/icons/youtube.svg', 'https://www.youtube.com/embed/', true),
        ('Netflix', '/icons/netflix.svg', '', false),
        ('Prime Video', '/icons/prime.svg', '', false),
        ('Disney+', '/icons/disney.svg', '', false),
        ('Custom', '/icons/custom.svg', '', true)
      ON CONFLICT DO NOTHING
    `);

    // Create indexes for performance
    console.log('Creating indexes...');
    
    // Index for watch_sessions.profile_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_watch_sessions_profile_id 
      ON watch_sessions(profile_id);
    `);
    
    // Composite index for daily_watch_time
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_watch_time_profile_date 
      ON daily_watch_time(profile_id, date);
    `);
    
    // Index for video_nfc_mappings.nfc_chip_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_nfc_mappings_chip_id 
      ON video_nfc_mappings(nfc_chip_id);
    `);
    
    // Index for profiles.user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
      ON profiles(user_id);
    `);
    
    // Index for videos.user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id 
      ON videos(user_id);
    `);
    
    // Index for nfc_chips.chip_uid
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nfc_chips_uid 
      ON nfc_chips(chip_uid);
    `);
    
    // Index for watch_sessions date queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_watch_sessions_started_at 
      ON watch_sessions(started_at);
    `);
    
    // Index for token blacklist cleanup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at 
      ON token_blacklist(expires_at);
    `);

    console.log('Database tables and indexes created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

createTables();