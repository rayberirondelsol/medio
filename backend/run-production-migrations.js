#!/usr/bin/env node

/**
 * Production Migration Runner
 *
 * Runs all pending migrations on the production database.
 * Safe to run multiple times - uses "IF NOT EXISTS" clauses.
 */

const pool = require('./src/db/pool');

const runMigrations = async () => {
  console.log('===================================');
  console.log('  PRODUCTION MIGRATION RUNNER');
  console.log('===================================\n');

  try {
    // Migration 1: Add video_url column and unique constraint
    console.log('[1/4] Adding video_url column and constraint...');
    await pool.query(`
      ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS video_url TEXT;
    `);
    console.log('  ✓ Added video_url column');

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_video_url_per_user'
        ) THEN
          ALTER TABLE videos
          ADD CONSTRAINT unique_video_url_per_user UNIQUE (user_id, video_url);
        END IF;
      END $$;
    `);
    console.log('  ✓ Added unique constraint on (user_id, video_url)');

    // Migration 2: Add channel_name column
    console.log('\n[2/4] Adding channel_name column...');
    await pool.query(`
      ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
    `);
    console.log('  ✓ Added channel_name column');

    // Migration 3: Add user_uuid to users table (Feature 006 - BFF Proxy Auth)
    console.log('\n[3/4] Adding user_uuid to users table...');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS user_uuid UUID UNIQUE DEFAULT gen_random_uuid();
    `);
    console.log('  ✓ Added user_uuid column to users');

    // Migration 4: Add user_uuid to nfc_chips table (Feature 006 - BFF Proxy Auth)
    console.log('\n[4/4] Adding user_uuid to nfc_chips table...');

    // First check if the column exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'nfc_chips'
      AND column_name = 'user_uuid'
    `);

    if (columnCheck.rows.length === 0) {
      // Column doesn't exist, add it
      await pool.query(`
        ALTER TABLE nfc_chips
        ADD COLUMN user_uuid UUID;
      `);
      console.log('  ✓ Added user_uuid column to nfc_chips');

      // Add foreign key constraint
      await pool.query(`
        ALTER TABLE nfc_chips
        ADD CONSTRAINT fk_nfc_chips_user_uuid
        FOREIGN KEY (user_uuid) REFERENCES users(user_uuid) ON DELETE CASCADE;
      `);
      console.log('  ✓ Added foreign key constraint on nfc_chips(user_uuid)');
    } else {
      console.log('  ✓ user_uuid column already exists in nfc_chips');
    }

    // Verify the schema
    console.log('\n===================================');
    console.log('  VERIFYING SCHEMA');
    console.log('===================================\n');

    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'videos'
      ORDER BY ordinal_position
    `);

    console.log('Videos table columns:');
    result.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  - ${row.column_name}: ${row.data_type}${length}`);
    });

    console.log('\n✅ All migrations completed successfully!');
    console.log('✅ Production database is up to date.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run migrations
runMigrations();
