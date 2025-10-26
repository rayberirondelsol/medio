const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise fall back to individual settings
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: String(process.env.DB_PASSWORD)
      }
);

async function runMigration() {
  try {
    // Check if migration is needed
    console.log('Checking current schema...');
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('user_uuid', 'id')
      ORDER BY column_name
    `);

    console.log('Found columns in users table:', checkResult.rows.map(r => r.column_name).join(', '));

    if (checkResult.rows.some(r => r.column_name === 'id')) {
      console.log('✅ Schema already migrated (using "id" columns)');
      console.log('No migration needed.');
      return;
    }

    if (!checkResult.rows.some(r => r.column_name === 'user_uuid')) {
      console.log('⚠️  WARNING: Neither user_uuid nor id found in users table!');
      console.log('This might indicate a different schema issue.');
      return;
    }

    console.log('❌ Migration NEEDED: Found user_uuid column (old schema)');
    console.log('Running migration 001_fix_column_naming.sql...\n');

    // Execute migration in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      console.log('Step 1: Renaming primary keys...');
      await client.query('ALTER TABLE users RENAME COLUMN user_uuid TO id');
      await client.query('ALTER TABLE platforms RENAME COLUMN platform_uuid TO id');
      await client.query('ALTER TABLE videos RENAME COLUMN video_uuid TO id');
      await client.query('ALTER TABLE nfc_chips RENAME COLUMN chip_uuid TO id');
      await client.query('ALTER TABLE profiles RENAME COLUMN profile_uuid TO id');
      await client.query('ALTER TABLE watch_sessions RENAME COLUMN session_uuid TO id');

      console.log('Step 2: Renaming foreign keys in videos table...');
      await client.query('ALTER TABLE videos RENAME COLUMN user_uuid TO user_id');
      await client.query('ALTER TABLE videos RENAME COLUMN platform_uuid TO platform_id');

      console.log('Step 3: Renaming foreign keys in nfc_chips table...');
      await client.query('ALTER TABLE nfc_chips RENAME COLUMN user_uuid TO user_id');

      console.log('Step 4: Renaming foreign keys in profiles table...');
      await client.query('ALTER TABLE profiles RENAME COLUMN user_uuid TO user_id');

      console.log('Step 5: Renaming foreign keys in watch_sessions table...');
      await client.query('ALTER TABLE watch_sessions RENAME COLUMN user_uuid TO user_id');
      await client.query('ALTER TABLE watch_sessions RENAME COLUMN video_uuid TO video_id');
      await client.query('ALTER TABLE watch_sessions RENAME COLUMN profile_uuid TO profile_id');

      // Check if chip_uuid exists before renaming
      const chipUuidCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'watch_sessions' AND column_name = 'chip_uuid'
      `);
      if (chipUuidCheck.rows.length > 0) {
        await client.query('ALTER TABLE watch_sessions RENAME COLUMN chip_uuid TO nfc_chip_id');
      }

      console.log('Step 6: Adding missing columns...');
      await client.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url TEXT');
      await client.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER');
      await client.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255)');
      await client.query('ALTER TABLE platforms ADD COLUMN IF NOT EXISTS icon_url TEXT');
      await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER');
      await client.query('ALTER TABLE watch_sessions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE');

      await client.query('COMMIT');
      console.log('✅ Migration committed successfully\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Verify
    console.log('Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'id'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification passed: "id" column exists in users table');
      console.log('\n🎉 Migration successful! You can now login with benjamin@eilersonline.de');
    } else {
      console.error('❌ Verification failed: "id" column not found in users table');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
