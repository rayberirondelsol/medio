/**
 * Integration Tests: Kids Mode Watch Time Enforcement
 *
 * Tests for Phase 7: Watch Time Enforcement Backend
 * Validates session start, heartbeat, end endpoints with daily limit enforcement
 */

const request = require('supertest');
const pool = require('../../src/db/pool');
const app = require('../../src/app');

describe('Kids Mode Watch Time Enforcement', () => {
  let testUserId;
  let testProfileId;
  let testNfcChipId;
  let testVideoId;
  let testPlatformId;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ('kidsmode@test.com', 'hash123', 'Kids Mode Test User')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Get YouTube platform
    const platformResult = await pool.query(`
      SELECT id FROM platforms WHERE name = 'youtube' LIMIT 1
    `);
    testPlatformId = platformResult.rows[0].id;

    // Create test profile with 60 minute daily limit
    const profileResult = await pool.query(`
      INSERT INTO profiles (user_id, name, daily_limit_minutes)
      VALUES ($1, 'Test Child', 60)
      RETURNING id
    `, [testUserId]);
    testProfileId = profileResult.rows[0].id;

    // Create test NFC chip
    const chipResult = await pool.query(`
      INSERT INTO nfc_chips (user_id, chip_uid, label, is_active)
      VALUES ($1, 'TEST:CHIP:001', 'Test Chip', true)
      RETURNING id
    `, [testUserId]);
    testNfcChipId = chipResult.rows[0].id;

    // Create test video
    const videoResult = await pool.query(`
      INSERT INTO videos (user_id, platform_id, title, platform_video_id, duration_seconds)
      VALUES ($1, $2, 'Test Video', 'test123', 600)
      RETURNING id
    `, [testUserId, testPlatformId]);
    testVideoId = videoResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await pool.query('DELETE FROM daily_watch_time WHERE profile_id = $1', [testProfileId]);
    await pool.query('DELETE FROM watch_sessions WHERE profile_id = $1', [testProfileId]);
    await pool.query('DELETE FROM videos WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM nfc_chips WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up sessions and daily watch time before each test
    await pool.query('DELETE FROM daily_watch_time WHERE profile_id = $1', [testProfileId]);
    await pool.query('DELETE FROM watch_sessions WHERE profile_id = $1', [testProfileId]);
  });

  describe('POST /api/sessions/start/public', () => {
    it('should start a new watch session with remaining minutes', async () => {
      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: testProfileId,
          nfc_chip_id: testNfcChipId,
          video_id: testVideoId
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body.remaining_minutes).toBe(60);
      expect(response.body.daily_limit_minutes).toBe(60);
    });

    it('should return 403 when daily limit already reached', async () => {
      // Set daily watch time to 60 minutes (limit reached)
      await pool.query(`
        INSERT INTO daily_watch_time (profile_id, date, total_minutes)
        VALUES ($1, CURRENT_DATE, 60)
      `, [testProfileId]);

      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: testProfileId,
          nfc_chip_id: testNfcChipId,
          video_id: testVideoId
        });

      expect(response.status).toBe(403);
      expect(response.body.limit_reached).toBe(true);
      expect(response.body.message).toContain('watched enough for today');
    });

    it('should return 403 when NFC chip does not belong to profile', async () => {
      // Create another user's NFC chip
      const otherUserResult = await pool.query(`
        INSERT INTO users (email, password_hash, name)
        VALUES ('other@test.com', 'hash123', 'Other User')
        RETURNING id
      `);
      const otherUserId = otherUserResult.rows[0].id;

      const otherChipResult = await pool.query(`
        INSERT INTO nfc_chips (user_id, chip_uid, label, is_active)
        VALUES ($1, 'OTHER:CHIP:001', 'Other Chip', true)
        RETURNING id
      `, [otherUserId]);
      const otherChipId = otherChipResult.rows[0].id;

      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: testProfileId,
          nfc_chip_id: otherChipId,
          video_id: testVideoId
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid NFC chip');

      // Cleanup
      await pool.query('DELETE FROM nfc_chips WHERE id = $1', [otherChipId]);
      await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });

    it('should calculate correct remaining minutes after partial watch time', async () => {
      // Set daily watch time to 35 minutes
      await pool.query(`
        INSERT INTO daily_watch_time (profile_id, date, total_minutes)
        VALUES ($1, CURRENT_DATE, 35)
      `, [testProfileId]);

      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: testProfileId,
          nfc_chip_id: testNfcChipId,
          video_id: testVideoId
        });

      expect(response.status).toBe(201);
      expect(response.body.remaining_minutes).toBe(25);
      expect(response.body.daily_limit_minutes).toBe(60);
    });
  });

  describe('POST /api/sessions/:sessionId/heartbeat', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a test session
      const sessionResult = await pool.query(`
        INSERT INTO watch_sessions (profile_id, video_id, started_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '2 minutes')
        RETURNING id
      `, [testProfileId, testVideoId]);
      sessionId = sessionResult.rows[0].id;
    });

    it('should return elapsed time and remaining minutes', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/heartbeat`)
        .send({
          current_position_seconds: 120
        });

      expect(response.status).toBe(200);
      expect(response.body.session_id).toBe(sessionId);
      expect(response.body.elapsed_seconds).toBeGreaterThanOrEqual(120);
      expect(response.body.limit_reached).toBe(false);
      expect(response.body.remaining_minutes).toBeLessThanOrEqual(60);
    });

    it('should return 403 when daily limit reached during playback', async () => {
      // Set daily watch time to 58 minutes (2 minutes remaining, session is 2 minutes old)
      await pool.query(`
        INSERT INTO daily_watch_time (profile_id, date, total_minutes)
        VALUES ($1, CURRENT_DATE, 58)
      `, [testProfileId]);

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/heartbeat`)
        .send({
          current_position_seconds: 120
        });

      expect(response.status).toBe(403);
      expect(response.body.limit_reached).toBe(true);
      expect(response.body.remaining_minutes).toBe(0);
      expect(response.body.message).toContain('Time\'s up');
    });

    it('should reject invalid playback position (tampering protection)', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/heartbeat`)
        .send({
          current_position_seconds: 9999 // Video is only 600 seconds
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid playback position');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/sessions/${fakeSessionId}/heartbeat`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Session not found');
    });
  });

  describe('POST /api/sessions/:sessionId/end', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a test session
      const sessionResult = await pool.query(`
        INSERT INTO watch_sessions (profile_id, video_id, started_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '5 minutes')
        RETURNING id
      `, [testProfileId, testVideoId]);
      sessionId = sessionResult.rows[0].id;
    });

    it('should end session and update daily watch time', async () => {
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({
          stopped_reason: 'completed',
          final_position_seconds: 600
        });

      expect(response.status).toBe(200);
      expect(response.body.session_id).toBe(sessionId);
      expect(response.body.duration_seconds).toBeGreaterThanOrEqual(300);
      expect(response.body.stopped_reason).toBe('completed');
      expect(response.body.total_watched_today).toBeGreaterThan(0);

      // Verify session was ended in database
      const sessionCheck = await pool.query(
        'SELECT ended_at, duration_seconds FROM watch_sessions WHERE id = $1',
        [sessionId]
      );
      expect(sessionCheck.rows[0].ended_at).not.toBeNull();
      expect(sessionCheck.rows[0].duration_seconds).toBeGreaterThanOrEqual(300);

      // Verify daily watch time was updated
      const watchTimeCheck = await pool.query(
        'SELECT total_minutes FROM daily_watch_time WHERE profile_id = $1 AND date = CURRENT_DATE',
        [testProfileId]
      );
      expect(watchTimeCheck.rows[0].total_minutes).toBeGreaterThan(0);
    });

    it('should handle different stop reasons', async () => {
      const stopReasons = ['completed', 'manual', 'daily_limit', 'swipe_exit', 'error'];

      for (const reason of stopReasons) {
        // Create new session for each test
        const newSessionResult = await pool.query(`
          INSERT INTO watch_sessions (profile_id, video_id, started_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '1 minute')
          RETURNING id
        `, [testProfileId, testVideoId]);
        const newSessionId = newSessionResult.rows[0].id;

        const response = await request(app)
          .post(`/api/sessions/${newSessionId}/end`)
          .send({
            stopped_reason: reason
          });

        expect(response.status).toBe(200);
        expect(response.body.stopped_reason).toBe(reason);
      }
    });

    it('should return 404 for already ended session', async () => {
      // End the session first
      await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({ stopped_reason: 'manual' });

      // Try to end again
      const response = await request(app)
        .post(`/api/sessions/${sessionId}/end`)
        .send({ stopped_reason: 'manual' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('already ended');
    });
  });

  describe('GET /api/profiles/:id/watch-time', () => {
    it('should return watch time statistics for profile', async () => {
      // Set some watch time
      await pool.query(`
        INSERT INTO daily_watch_time (profile_id, date, total_minutes)
        VALUES ($1, CURRENT_DATE, 25)
      `, [testProfileId]);

      const response = await request(app)
        .get(`/api/profiles/${testProfileId}/watch-time`);

      expect(response.status).toBe(200);
      expect(response.body.watched_minutes).toBe(25);
      expect(response.body.daily_limit).toBe(60);
      expect(response.body.remaining).toBe(35);
    });

    it('should return zero watched time for new day', async () => {
      const response = await request(app)
        .get(`/api/profiles/${testProfileId}/watch-time`);

      expect(response.status).toBe(200);
      expect(response.body.watched_minutes).toBe(0);
      expect(response.body.daily_limit).toBe(60);
      expect(response.body.remaining).toBe(60);
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeProfileId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/profiles/${fakeProfileId}/watch-time`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Profile not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit public session endpoints after 10 requests per minute', async () => {
      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/sessions/start/public')
          .send({
            profile_id: testProfileId,
            nfc_chip_id: testNfcChipId,
            video_id: testVideoId
          });

        // First 10 should succeed or fail with business logic (not rate limit)
        expect([201, 403]).toContain(response.status);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: testProfileId,
          nfc_chip_id: testNfcChipId,
          video_id: testVideoId
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    }, 15000); // Increase timeout for rate limit test
  });
});
