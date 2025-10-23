-- Migration: Fix column naming to match backend code
--
-- This migration renames all *_uuid columns to match backend expectations:
-- - Primary keys: *_uuid → id
-- - Foreign keys: user_uuid → user_id, platform_uuid → platform_id, etc.
--
-- IMPORTANT: Run this ONLY if your database was created with the old init.sql
-- To check if you need this migration:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name = 'user_uuid';
-- If this returns a row, you NEED this migration.

BEGIN;

-- Step 1: Rename primary keys
ALTER TABLE users RENAME COLUMN user_uuid TO id;
ALTER TABLE platforms RENAME COLUMN platform_uuid TO id;
ALTER TABLE videos RENAME COLUMN video_uuid TO id;
ALTER TABLE nfc_chips RENAME COLUMN chip_uuid TO id;
ALTER TABLE profiles RENAME COLUMN profile_uuid TO id;
ALTER TABLE watch_sessions RENAME COLUMN session_uuid TO id;

-- Step 2: Rename foreign keys in videos table
ALTER TABLE videos RENAME COLUMN user_uuid TO user_id;
ALTER TABLE videos RENAME COLUMN platform_uuid TO platform_id;

-- Step 3: Rename foreign keys in nfc_chips table
ALTER TABLE nfc_chips RENAME COLUMN user_uuid TO user_id;

-- Step 4: Rename foreign keys in profiles table
ALTER TABLE profiles RENAME COLUMN profile_uuid TO id;
ALTER TABLE profiles RENAME COLUMN user_uuid TO user_id;

-- Step 5: Rename foreign keys in watch_sessions table
ALTER TABLE watch_sessions RENAME COLUMN user_uuid TO user_id;
ALTER TABLE watch_sessions RENAME COLUMN video_uuid TO video_id;
ALTER TABLE watch_sessions RENAME COLUMN profile_uuid TO profile_id;
ALTER TABLE watch_sessions RENAME COLUMN chip_uuid TO nfc_chip_id;

-- Step 6: Rename video_id column in videos table (if exists)
-- Old schema used 'video_id' for the platform's video ID
-- New schema uses 'platform_video_id'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'video_id'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'videos' AND column_name = 'platform_video_id'
        )
    ) THEN
        ALTER TABLE videos RENAME COLUMN video_id TO platform_video_id;
    END IF;
END $$;

-- Step 7: Add missing columns if they don't exist
ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE watch_sessions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Step 8: Update constraint names
-- Drop old unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'videos_user_uuid_platform_uuid_video_id_key'
    ) THEN
        ALTER TABLE videos DROP CONSTRAINT videos_user_uuid_platform_uuid_video_id_key;
    END IF;
END $$;

-- Add new unique constraints
ALTER TABLE videos ADD CONSTRAINT IF NOT EXISTS unique_video_url_per_user UNIQUE(user_id, video_url);
ALTER TABLE videos ADD CONSTRAINT IF NOT EXISTS unique_platform_video_per_user UNIQUE(user_id, platform_id, platform_video_id);

-- Step 9: Drop old indexes
DROP INDEX IF EXISTS idx_videos_user_uuid;
DROP INDEX IF EXISTS idx_videos_platform;
DROP INDEX IF EXISTS idx_nfc_chips_user_uuid;
DROP INDEX IF EXISTS idx_profiles_user_uuid;
DROP INDEX IF EXISTS idx_watch_sessions_user_uuid;
DROP INDEX IF EXISTS idx_watch_sessions_video_uuid;

-- Step 10: Create new indexes
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_platform_id ON videos(platform_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_chips_user_id ON nfc_chips(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_user_id ON watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video_id ON watch_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_started_at ON watch_sessions(started_at DESC);

COMMIT;

-- Verification queries (run after migration):
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'videos';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'nfc_chips';
