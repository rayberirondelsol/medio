#!/bin/sh
# Inline migration script for production
node -e "
const pool = require('./src/db/pool');

(async () => {
  try {
    console.log('Adding video_url column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url TEXT');
    console.log('✓ video_url added');

    console.log('Adding unique constraint...');
    await pool.query(\`
      DO \$\$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_video_url_per_user') THEN
          ALTER TABLE videos ADD CONSTRAINT unique_video_url_per_user UNIQUE (user_id, video_url);
        END IF;
      END \$\$;
    \`);
    console.log('✓ constraint added');

    console.log('Adding channel_name column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255)');
    console.log('✓ channel_name added');

    console.log('\\n✅ Migrations complete!');
    await pool.end();
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
"
