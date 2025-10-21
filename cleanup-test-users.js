const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'medio',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'medio',
  password: process.env.DB_PASSWORD || 'medio_dev_password',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function cleanupTestUsers() {
  try {
    console.log('Connecting to database...');

    // Find all test users
    const findResult = await pool.query(
      "SELECT email, created_at FROM users WHERE email LIKE 'proxy-test-%' ORDER BY created_at DESC"
    );

    console.log(`Found ${findResult.rows.length} test users:`);
    findResult.rows.forEach(row => {
      console.log(`  - ${row.email} (created: ${row.created_at})`);
    });

    if (findResult.rows.length === 0) {
      console.log('No test users to clean up.');
      await pool.end();
      return;
    }

    // Delete all test users
    const deleteResult = await pool.query(
      "DELETE FROM users WHERE email LIKE 'proxy-test-%'"
    );

    console.log(`✓ Deleted ${deleteResult.rowCount} test users successfully.`);

    await pool.end();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error cleaning up test users:', error);
    await pool.end();
    process.exit(1);
  }
}

cleanupTestUsers();
