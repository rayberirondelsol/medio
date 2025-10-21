const pool = require('./src/db/pool');

(async () => {
  try {
    console.log('Checking videos table schema...');
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'videos'
      ORDER BY ordinal_position
    `);

    console.log('\n=== VIDEOS TABLE COLUMNS ===');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    await pool.end();
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
