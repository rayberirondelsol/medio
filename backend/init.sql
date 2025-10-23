-- PRODUCTION SCHEMA (matches Fly.io medio-backend-db as of 2025-10-23)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID UNIQUE DEFAULT gen_random_uuid()
);

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT true
);

INSERT INTO platforms (name) VALUES
    ('youtube'),
    ('vimeo'),
    ('dailymotion')
ON CONFLICT DO NOTHING;

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    platform_id UUID REFERENCES platforms(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    platform_video_id VARCHAR(255),
    duration_seconds INTEGER,
    age_rating VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    video_url TEXT,
    channel_name VARCHAR(255),
    CONSTRAINT unique_video_url_per_user UNIQUE(user_id, video_url)
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    daily_limit_minutes INTEGER DEFAULT 60,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nfc_chips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    chip_uid VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_uuid UUID REFERENCES users(user_uuid)
);

CREATE TABLE video_nfc_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id),
    nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id),
    profile_id UUID REFERENCES profiles(id),
    max_watch_time_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, nfc_chip_id, profile_id)
);

CREATE TABLE watch_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    video_id UUID NOT NULL REFERENCES videos(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    stopped_reason VARCHAR(50)
);

CREATE TABLE daily_watch_time (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    total_minutes INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'UTC',
    UNIQUE(profile_id, date)
);

CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_nfc_chips_user_id ON nfc_chips(user_id);
CREATE INDEX idx_watch_sessions_profile_id ON watch_sessions(profile_id);
CREATE INDEX idx_daily_watch_time_profile_date ON daily_watch_time(profile_id, date);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
