-- Initial database setup for Medio platform
-- This file runs automatically when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
    platform_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platforms
INSERT INTO platforms (name, display_name) VALUES
    ('youtube', 'YouTube'),
    ('vimeo', 'Vimeo'),
    ('dailymotion', 'Dailymotion')
ON CONFLICT (name) DO NOTHING;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    video_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    platform_uuid UUID NOT NULL REFERENCES platforms(platform_uuid),
    video_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    age_rating VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_uuid, platform_uuid, video_id)
);

-- Create nfc_chips table
CREATE TABLE IF NOT EXISTS nfc_chips (
    chip_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    chip_uid VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chip_uid)
);

-- Create profiles table (for child profiles)
CREATE TABLE IF NOT EXISTS profiles (
    profile_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age_rating_limit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create watch_sessions table
CREATE TABLE IF NOT EXISTS watch_sessions (
    session_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES users(user_uuid) ON DELETE CASCADE,
    video_uuid UUID NOT NULL REFERENCES videos(video_uuid) ON DELETE CASCADE,
    profile_uuid UUID REFERENCES profiles(profile_uuid) ON DELETE SET NULL,
    chip_uuid UUID REFERENCES nfc_chips(chip_uuid) ON DELETE SET NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Create token_blacklist table for JWT token revocation
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_videos_user_uuid ON videos(user_uuid);
CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform_uuid);
CREATE INDEX IF NOT EXISTS idx_nfc_chips_user_uuid ON nfc_chips(user_uuid);
CREATE INDEX IF NOT EXISTS idx_nfc_chips_uid ON nfc_chips(chip_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_user_uuid ON profiles(user_uuid);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_user_uuid ON watch_sessions(user_uuid);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video_uuid ON watch_sessions(video_uuid);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfc_chips_updated_at BEFORE UPDATE ON nfc_chips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
