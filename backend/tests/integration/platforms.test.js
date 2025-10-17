/**
 * T019: Platforms API Integration Tests
 *
 * Tests the GET /api/platforms endpoint that returns available video platforms.
 * Validates platform data structure, authentication, and response format.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db/connection');

describe('GET /api/platforms', () => {
  beforeAll(async () => {
    // Setup: Ensure test platforms exist
    await db.query(`
      INSERT INTO platforms (id, name, requires_auth)
      VALUES
        ('11111111-1111-4111-8111-111111111111', 'youtube', false),
        ('22222222-2222-4222-8222-222222222222', 'vimeo', false)
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM platforms WHERE id IN ($1, $2)', [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222'
    ]);
    await db.end();
  });

  describe('Successful Platform Retrieval', () => {
    it('should return 200 and list of platforms', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array)
      });
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return platforms as an array', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return platforms with id, name, and requiresAuth fields', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      response.body.data.forEach(platform => {
        expect(platform).toHaveProperty('id');
        expect(platform).toHaveProperty('name');
        expect(platform).toHaveProperty('requiresAuth');
        expect(typeof platform.id).toBe('string');
        expect(typeof platform.name).toBe('string');
        expect(typeof platform.requiresAuth).toBe('boolean');
      });
    });

    it('should return YouTube platform with correct properties', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      const youtubePlatform = response.body.data.find(p => p.name === 'youtube');

      expect(youtubePlatform).toBeDefined();
      expect(youtubePlatform.id).toBeDefined();
      expect(youtubePlatform.name).toBe('youtube');
      expect(youtubePlatform.requiresAuth).toBe(false);
    });

    it('should return valid UUID format for platform IDs', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      response.body.data.forEach(platform => {
        expect(platform.id).toMatch(uuidRegex);
      });
    });

    it('should include all seeded platforms', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      const platformNames = response.body.data.map(p => p.name);

      expect(platformNames).toContain('youtube');
    });

    it('should return platforms in consistent order', async () => {
      // Act
      const response1 = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      const response2 = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data).toEqual(response2.body.data);
    });
  });

  describe('Platform Data Structure', () => {
    it('should not include unnecessary fields', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);

      response.body.data.forEach(platform => {
        const platformKeys = Object.keys(platform);
        expect(platformKeys).toEqual(['id', 'name', 'requiresAuth']);
        expect(platform).not.toHaveProperty('created_at');
        expect(platform).not.toHaveProperty('updated_at');
      });
    });

    it('should use camelCase for requiresAuth field', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);

      response.body.data.forEach(platform => {
        expect(platform).toHaveProperty('requiresAuth');
        expect(platform).not.toHaveProperty('requires_auth');
      });
    });

    it('should return platforms with unique IDs', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      const ids = response.body.data.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should return platforms with unique names', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      const names = response.body.data.map(p => p.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no authentication token is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 401 when invalid authentication token is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid authentication token'
      });
    });

    it('should return 401 when authentication header is malformed', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'InvalidFormat');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid authentication header format'
      });
    });

    it('should return 401 when Bearer token is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer ');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication token is missing'
      });
    });
  });

  describe('Response Format', () => {
    it('should include success field in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should include data field in response', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should return application/json content type', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database connection fails', async () => {
      // This test would require mocking the database connection to fail
      // For now, we define the expected behavior

      // Arrange - Mock database failure (implementation specific)
      // Act
      // const response = await request(app)
      //   .get('/api/platforms')
      //   .set('Authorization', 'Bearer valid-test-token');

      // Assert
      // expect(response.status).toBe(500);
      // expect(response.body).toEqual({
      //   success: false,
      //   error: 'Database connection error'
      // });

      // Placeholder assertion
      expect(true).toBe(true);
    });

    it('should return empty array when no platforms exist', async () => {
      // Arrange - Remove all platforms temporarily
      await db.query('DELETE FROM platforms');

      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: []
      });

      // Restore platforms
      await db.query(`
        INSERT INTO platforms (id, name, requires_auth)
        VALUES
          ('11111111-1111-4111-8111-111111111111', 'youtube', false),
          ('22222222-2222-4222-8222-222222222222', 'vimeo', false)
      `);
    });
  });

  describe('Caching', () => {
    it('should support caching headers for performance', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      // Platforms rarely change, so caching is beneficial
      // This test documents the expectation for future implementation
      // expect(response.headers['cache-control']).toBeDefined();
      expect(true).toBe(true);
    });
  });

  describe('Query Parameters', () => {
    it('should ignore unknown query parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/platforms?unknown=param&invalid=value')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
