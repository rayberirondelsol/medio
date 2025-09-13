const pool = require('./pool');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');

    // Create demo parent account
    const passwordHash = await bcrypt.hash('demo123', 10);
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ('demo@medio.app', $1, 'Demo Parent')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [passwordHash]);

    const userId = userResult.rows[0].id;
    console.log('Created demo user: demo@medio.app / demo123');

    // Create child profiles
    const profiles = await pool.query(`
      INSERT INTO profiles (user_id, name, avatar_url, daily_limit_minutes)
      VALUES 
        ($1, 'Emma', '🦄', 60),
        ($1, 'Max', '🦁', 90)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [userId]);

    console.log(`Created ${profiles.rows.length} child profiles`);

    // Get platform IDs
    const platformResult = await pool.query(`
      SELECT id, name FROM platforms WHERE name = 'YouTube'
    `);
    
    if (platformResult.rows.length > 0) {
      const youtubeId = platformResult.rows[0].id;

      // Add sample videos
      const videos = await pool.query(`
        INSERT INTO videos (user_id, platform_id, title, description, platform_video_id, thumbnail_url, age_rating)
        VALUES 
          ($1, $2, 'Peppa Pig Episodes', 'Collection of Peppa Pig episodes', 'D0prFpEEiLw', 'https://i.ytimg.com/vi/D0prFpEEiLw/maxresdefault.jpg', 'G'),
          ($1, $2, 'Baby Shark Dance', 'The famous Baby Shark song', 'XqZsoesa55w', 'https://i.ytimg.com/vi/XqZsoesa55w/maxresdefault.jpg', 'G'),
          ($1, $2, 'Cocomelon Nursery Rhymes', 'Educational songs for kids', 'qt5v42oisSs', 'https://i.ytimg.com/vi/qt5v42oisSs/maxresdefault.jpg', 'G')
        ON CONFLICT DO NOTHING
        RETURNING id, title
      `, [userId, youtubeId]);

      console.log(`Added ${videos.rows.length} sample videos`);

      // Register NFC chips
      const chips = await pool.query(`
        INSERT INTO nfc_chips (user_id, chip_uid, label)
        VALUES 
          ($1, 'CHIP001', 'Blue Dinosaur Card'),
          ($1, 'CHIP002', 'Pink Unicorn Card'),
          ($1, 'CHIP003', 'Green Robot Card')
        ON CONFLICT (chip_uid) DO NOTHING
        RETURNING id, chip_uid
      `, [userId]);

      console.log(`Registered ${chips.rows.length} NFC chips`);

      // Map videos to chips
      if (videos.rows.length > 0 && chips.rows.length > 0) {
        await pool.query(`
          INSERT INTO video_nfc_mappings (video_id, nfc_chip_id, max_watch_time_minutes)
          VALUES 
            ($1, $2, 30),
            ($3, $4, 30)
          ON CONFLICT DO NOTHING
        `, [
          videos.rows[0]?.id, chips.rows[0]?.id,
          videos.rows[1]?.id, chips.rows[1]?.id
        ]);

        console.log('Created video-NFC mappings');
      }
    }

    console.log('Database seed completed successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: demo@medio.app');
    console.log('Password: demo123');
    console.log('\nTest NFC chips: CHIP001, CHIP002, CHIP003');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

seedDatabase();