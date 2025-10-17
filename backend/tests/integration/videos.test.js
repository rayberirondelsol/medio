/**
 * T018: Videos API Integration Tests
 *
 * Tests the POST /api/videos endpoint for creating new videos with YouTube metadata.
 * Validates database constraints, UUID handling, and data integrity.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db/connection');

describe('POST /api/videos', () => {
  let testUserId;
  let testPlatformId;

  beforeAll(async () => {
    // Setup: Create test user and platform
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      ['test@example.com', 'hashed_password', 'Test User']
    );
    testUserId = userResult.rows[0].id;

    const platformResult = await db.query(
      'INSERT INTO platforms (name, requires_auth) VALUES ($1, $2) RETURNING id',
      ['youtube', false]
    );
    testPlatformId = platformResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await db.query('DELETE FROM videos WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM platforms WHERE id = $1', [testPlatformId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await db.end();
  });

  afterEach(async () => {
    // Clean up videos after each test
    await db.query('DELETE FROM videos WHERE user_id = $1', [testUserId]);
  });

  describe('Successful Video Creation', () => {
    it('should create a new video with all metadata fields', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        external_id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
        description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration_seconds: 213,
        channel_name: 'Rick Astley',
        view_count: '1234567890',
        published_at: '2009-10-25T06:57:33Z',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          platform_id: testPlatformId,
          video_url: videoData.video_url,
          external_id: videoData.external_id,
          title: videoData.title,
          description: videoData.description,
          thumbnail_url: videoData.thumbnail_url,
          duration_seconds: videoData.duration_seconds,
          channel_name: videoData.channel_name,
          view_count: videoData.view_count,
          age_rating: videoData.age_rating,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        })
      });

      // Verify video was inserted into database
      const dbResult = await db.query(
        'SELECT * FROM videos WHERE external_id = $1',
        [videoData.external_id]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].title).toBe(videoData.title);
    });

    it('should create video with minimal required fields', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideoId',
        external_id: 'testVideoId',
        title: 'Test Video Title',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe(videoData.title);
    });

    it('should generate valid UUID for video ID', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=uuidTestVideo',
        external_id: 'uuidTestVideo',
        title: 'UUID Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(201);
      const videoId = response.body.data.id;

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(videoId).toMatch(uuidRegex);
    });

    it('should set created_at and updated_at timestamps', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=timestampTest',
        external_id: 'timestampTest',
        title: 'Timestamp Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.created_at).toBeDefined();
      expect(response.body.data.updated_at).toBeDefined();

      const createdAt = new Date(response.body.data.created_at);
      const updatedAt = new Date(response.body.data.updated_at);
      expect(createdAt).toBeInstanceOf(Date);
      expect(updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 when platform_id is missing', async () => {
      // Arrange
      const videoData = {
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Platform ID is required'
      });
    });

    it('should return 400 when video_url is missing', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Video URL is required'
      });
    });

    it('should return 400 when external_id is missing', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'External ID is required'
      });
    });

    it('should return 400 when title is missing', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Title is required'
      });
    });

    it('should return 400 when age_rating is missing', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Age rating is required'
      });
    });

    it('should return 400 for invalid age_rating value', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'invalid_rating'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid age rating. Must be one of: all_ages, 6+, 12+, 16+, 18+'
      });
    });

    it('should return 400 for invalid platform_id UUID', async () => {
      // Arrange
      const videoData = {
        platform_id: 'not-a-valid-uuid',
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid platform ID format'
      });
    });
  });

  describe('Uniqueness Constraints', () => {
    it('should return 409 when video_url already exists', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=duplicateUrl',
        external_id: 'duplicateUrl',
        title: 'Duplicate Video',
        age_rating: 'all_ages'
      };

      // Create first video
      await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'Video with this URL already exists'
      });
    });

    it('should allow same video from different platforms', async () => {
      // Arrange
      const anotherPlatformResult = await db.query(
        'INSERT INTO platforms (name, requires_auth) VALUES ($1, $2) RETURNING id',
        ['vimeo', false]
      );
      const anotherPlatformId = anotherPlatformResult.rows[0].id;

      const videoData1 = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=sameExternalId',
        external_id: 'sameExternalId',
        title: 'Same Video on YouTube',
        age_rating: 'all_ages'
      };

      const videoData2 = {
        platform_id: anotherPlatformId,
        video_url: 'https://vimeo.com/sameExternalId',
        external_id: 'sameExternalId',
        title: 'Same Video on Vimeo',
        age_rating: 'all_ages'
      };

      // Act
      const response1 = await request(app)
        .post('/api/videos')
        .send(videoData1)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      const response2 = await request(app)
        .post('/api/videos')
        .send(videoData2)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Cleanup
      await db.query('DELETE FROM platforms WHERE id = $1', [anotherPlatformId]);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should return 400 when platform_id does not exist', async () => {
      // Arrange
      const videoData = {
        platform_id: '00000000-0000-4000-8000-000000000000',
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer valid-test-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid platform ID'
      });
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no authentication token is provided', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 401 when invalid authentication token is provided', async () => {
      // Arrange
      const videoData = {
        platform_id: testPlatformId,
        video_url: 'https://www.youtube.com/watch?v=testVideo',
        external_id: 'testVideo',
        title: 'Test Video',
        age_rating: 'all_ages'
      };

      // Act
      const response = await request(app)
        .post('/api/videos')
        .send(videoData)
        .set('Authorization', 'Bearer invalid-token')
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid authentication token'
      });
    });
  });
});
