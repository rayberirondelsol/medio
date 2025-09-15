const request = require('supertest');
const express = require('express');
const nfcRoutes = require('../routes/nfc');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/nfc', nfcRoutes);

describe('NFC Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  describe('POST /nfc/scan/public', () => {
    it('should scan NFC chip and return video for public endpoint', async () => {
      const mockVideo = {
        id: 'video-123',
        title: 'Test Video',
        platform_name: 'YouTube',
        max_watch_time_minutes: 30
      };

      pool.query.mockResolvedValueOnce({ rows: [mockVideo] });

      const response = await request(app)
        .post('/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32',
          profile_id: 'profile-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVideo);
    });

    it('should validate NFC UID format', async () => {
      const response = await request(app)
        .post('/nfc/scan/public')
        .send({
          chip_uid: 'invalid-uid',
          profile_id: 'profile-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should check daily limit when profile is provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // No video found
      pool.query.mockResolvedValueOnce({
        rows: [{
          daily_limit_minutes: 60,
          watched_today: 65
        }]
      });

      const response = await request(app)
        .post('/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32',
          profile_id: 'profile-123'
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 when no video is mapped to chip', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/nfc/scan/public')
        .send({
          chip_uid: '04:E1:5C:32'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No video assigned to this chip');
    });
  });

  describe('POST /nfc/chips', () => {
    it('should register a new NFC chip', async () => {
      const mockChip = {
        id: 'chip-123',
        chip_uid: '04:E1:5C:32:B9:65:80',
        label: 'My Chip',
        user_id: 'user-123'
      };

      pool.query.mockResolvedValueOnce({ rows: [] }); // UID uniqueness check
      pool.query.mockResolvedValueOnce({ rows: [mockChip] }); // Insert

      const response = await request(app)
        .post('/nfc/chips')
        .send({
          chip_uid: '04:e1:5c:32:b9:65:80',
          label: 'My Chip'
        });

      expect(response.status).toBe(201);
      expect(response.body.chip_uid).toBe('04:E1:5C:32:B9:65:80');
    });

    it('should reject duplicate chip UID', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-chip' }]
      });

      const response = await request(app)
        .post('/nfc/chips')
        .send({
          chip_uid: '04:E1:5C:32:B9:65:80',
          label: 'Duplicate Chip'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('This NFC chip is already registered');
    });

    it('should validate chip UID length', async () => {
      const response = await request(app)
        .post('/nfc/chips')
        .send({
          chip_uid: '04',
          label: 'Too Short'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /nfc/chips', () => {
    it('should get all chips for authenticated user', async () => {
      const mockChips = [
        { id: 'chip-1', chip_uid: '04:E1:5C:32', label: 'Chip 1' },
        { id: 'chip-2', chip_uid: '04:E1:5C:33', label: 'Chip 2' }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockChips });

      const response = await request(app)
        .get('/nfc/chips');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockChips);
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-123']
      );
    });
  });

  describe('DELETE /nfc/chips/:id', () => {
    it('should delete chip owned by user', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'chip-123' }]
      });

      const response = await request(app)
        .delete('/nfc/chips/chip-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('NFC chip deleted successfully');
    });

    it('should return 404 for non-existent chip', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/nfc/chips/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('NFC chip not found');
    });
  });
});