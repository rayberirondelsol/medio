const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    // Check if migration is needed
    console.log('Checking if migration is needed...');
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'video_nfc_mappings'
      AND column_name = 'sequence_order'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Migration already applied (sequence_order column exists)');
      return;
    }

    console.log('Running migration 007_add_sequence_order.sql...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src', 'db', 'migrations', '007_add_sequence_order.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log('✓ Migration completed successfully');

    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'video_nfc_mappings'
      AND column_name = 'sequence_order'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✓ Verification passed: sequence_order column exists');
    } else {
      console.error('✗ Verification failed: sequence_order column not found');
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
