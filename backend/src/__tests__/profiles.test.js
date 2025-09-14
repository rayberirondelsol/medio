const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');

const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Create test app
const app = express();
app.use(express.json());

// Mock cookie parser
app.use((req, res, next) => {
  req.cookies = {};
  next();
});

// Import routes after mocks
const profilesRouter = require('../routes/profiles');
app.use('/api/profiles', profilesRouter);

describe('Profiles API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, email: 'parent@example.com' };
      next();
    });
  });

  describe('GET /api/profiles', () => {
    it('should return paginated list of user profiles', async () => {
      const mockProfiles = [
        {
          id: 1,
          user_id: 1,
          name: 'Timmy',
          age: 8,
          avatar_url: 'https://example.com/avatar1.jpg',
          daily_limit_minutes: 60,
          created_at: new Date()
        },
        {
          id: 2,
          user_id: 1,
          name: 'Sarah',
          age: 10,
          avatar_url: 'https://example.com/avatar2.jpg',
          daily_limit_minutes: 90,
          created_at: new Date()
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: [{ total_count: '2' }] });
      pool.query.mockResolvedValueOnce({ rows: mockProfiles });

      const response = await request(app)
        .get('/api/profiles')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.profiles).toHaveLength(2);
      expect(response.body.metadata.totalCount).toBe(2);
    });

    it('should only return profiles for authenticated user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total_count: '0' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/profiles')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('POST /api/profiles', () => {
    it('should create a new profile', async () => {
      const newProfile = {
        name: 'Bobby',
        age: 7,
        avatar_url: 'https://example.com/bobby.jpg',
        daily_limit_minutes: 45
      };

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          ...newProfile,
          user_id: 1,
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/profiles')
        .send(newProfile)
        .expect(201);

      expect(response.body.name).toBe(newProfile.name);
      expect(response.body.age).toBe(newProfile.age);
      expect(response.body.daily_limit_minutes).toBe(newProfile.daily_limit_minutes);
    });

    it('should validate profile name', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({
          name: 'A', // Too short
          age: 5
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'name' })
        ])
      );
    });

    it('should validate age range', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({
          name: 'Test',
          age: 20 // Too old for kids platform
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'age' })
        ])
      );
    });

    it('should validate daily limit', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({
          name: 'Test',
          age: 8,
          daily_limit_minutes: 500 // Too high (max 300)
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'daily_limit_minutes' })
        ])
      );
    });
  });

  describe('PUT /api/profiles/:id', () => {
    it('should update a profile', async () => {
      const updates = {
        name: 'Bobby Updated',
        daily_limit_minutes: 120
      };

      // Check ownership
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1 }]
      });

      // Update profile
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...updates,
          age: 7,
          user_id: 1
        }]
      });

      const response = await request(app)
        .put('/api/profiles/1')
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.daily_limit_minutes).toBe(updates.daily_limit_minutes);
    });

    it('should prevent updating profiles owned by other users', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2 }]
      });

      await request(app)
        .put('/api/profiles/1')
        .send({ name: 'Unauthorized' })
        .expect(403);
    });

    it('should return 404 for non-existent profile', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .put('/api/profiles/999')
        .send({ name: 'Update' })
        .expect(404);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    it('should delete a profile and associated data', async () => {
      // Check ownership
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1 }]
      });

      // Begin transaction
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      // Mock transaction queries
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rowCount: 5 }); // Delete sessions
      mockClient.query.mockResolvedValueOnce({ rowCount: 30 }); // Delete daily watch time
      mockClient.query.mockResolvedValueOnce({ rowCount: 3 }); // Delete NFC mappings
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); // Delete profile
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const response = await request(app)
        .delete('/api/profiles/1')
        .expect(200);

      expect(response.body.message).toContain('deleted');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1 }]
      });

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Delete failed')); // Delete sessions fails

      await request(app)
        .delete('/api/profiles/1')
        .expect(500);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('GET /api/profiles/:id/stats', () => {
    it('should return profile watch statistics', async () => {
      const profileStats = {
        total_watch_time: 3600,
        videos_watched: 15,
        average_session_length: 240,
        today_watch_time: 1800,
        daily_limit_remaining: 1800
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, daily_limit_minutes: 60 }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [profileStats]
      });

      const response = await request(app)
        .get('/api/profiles/1/stats')
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining(profileStats));
    });
  });
});