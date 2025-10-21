const pool = require('./src/db/pool');

async function createNFCTable() {
  try {
    console.log('Creating nfc_chips table...');

    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_chips (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chip_uid VARCHAR(30) NOT NULL UNIQUE,
        label VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Table nfc_chips created');

    // Add index on user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nfc_chips_user_id ON nfc_chips(user_id);
    `);
    console.log('✓ Index idx_nfc_chips_user_id created');

    // Verify setup
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nfc_chips'
      ORDER BY ordinal_position;
    `);

    console.log('✓ Table structure:');
    console.log(JSON.stringify(result.rows, null, 2));

    await pool.end();
    console.log('\n✅ NFC table creation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating NFC table:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createNFCTable();
