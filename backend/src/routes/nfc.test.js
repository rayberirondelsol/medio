const request = require('supertest');
const express = require('express');
const nfcRoutes = require('./nfc');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/nfc', nfcRoutes);

describe('NFC Routes', () => {
  beforeEach(() => {
    // Mock authentication middleware for protected routes
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/nfc/scan/public', () => {
    it('should scan NFC chip without authentication', async () => {
      const mockVideo = {
        id: 'video-123',
        title: 'Test Video',
        url: 'https://example.com/video',
        max_watch_time_minutes: 30
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockVideo]
      });

      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'video-123');
      expect(response.body).toHaveProperty('title', 'Test Video');
    });

    it('should validate NFC UID format', async () => {
      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send({
          chip_uid: 'invalid-uid'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should check daily limits when profile_id is provided', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'video-123',
          title: 'Test Video'
        }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          daily_limit_minutes: 60,
          watched_today: 45
        }]
      });

      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32',
          profile_id: 'profile-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('remaining_minutes', 15);
    });

    it('should reject when daily limit is reached', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'video-123',
          title: 'Test Video'
        }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          daily_limit_minutes: 60,
          watched_today: 60
        }]
      });

      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32',
          profile_id: 'profile-123'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('limit_reached', true);
    });
  });

  describe('POST /api/nfc/scan', () => {
    it('should require authentication for regular scan endpoint', async () => {
      // Remove auth mock to test authentication requirement
      authenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/nfc/scan')
        .send({
          chip_uid: '04:E1:5C:32'
        });

      expect(response.status).toBe(401);
    });

    it('should include user context in authenticated scan', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'user-123' };
        next();
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'video-123',
          title: 'Test Video'
        }]
      });

      const response = await request(app)
        .post('/api/nfc/scan')
        .send({
          chip_uid: '04:E1:5C:32'
        });

      expect(response.status).toBe(200);
      // Verify user context was included in query
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['04:E1:5C:32', null, 'user-123'])
      );
    });
  });

  describe('NFC UID Validation', () => {
    const validUIDs = [
      '04:E1:5C:32',
      '04E15C32',
      '04-E1-5C-32',
      '04 E1 5C 32',
      '04:E1:5C:32:B9:65:80'
    ];

    validUIDs.forEach(uid => {
      it(`should accept valid UID format: ${uid}`, async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/nfc/scan/public')
          .send({ chip_uid: uid });

        expect(response.status).not.toBe(400);
      });
    });

    const invalidUIDs = [
      'XYZ',
      '04:E1:5C:G2',
      '04',
      ''
    ];

    invalidUIDs.forEach(uid => {
      it(`should reject invalid UID format: ${uid}`, async () => {
        const response = await request(app)
          .post('/api/nfc/scan/public')
          .send({ chip_uid: uid });

        expect(response.status).toBe(400);
      });
    });
  });
});