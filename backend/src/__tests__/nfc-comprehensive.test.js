const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');

const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

describe('NFC Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    });
    
    // Set up the NFC route
    const nfcRouter = require('../routes/nfc');
    app.use('/api/nfc', nfcRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NFC Chip Registration', () => {
    it('should register a new NFC chip with valid UID', async () => {
      const chipData = {
        chip_uid: '04:E1:5C:32:B9:65:80',
        label: 'Living Room Chip'
      };
      
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // Check for existing chip
        .mockResolvedValueOnce({
          rows: [{
            id: 'chip-id',
            chip_uid: chipData.chip_uid,
            label: chipData.label,
            is_active: true
          }]
        }); // Insert new chip
      
      const response = await request(app)
        .post('/api/nfc/register')
        .send(chipData)
        .expect(201);
      
      expect(response.body.chip_uid).toBe(chipData.chip_uid);
      expect(response.body.label).toBe(chipData.label);
      expect(response.body.is_active).toBe(true);
    });

    it('should normalize NFC UID format', async () => {
      const variations = [
        '04e15c32b96580',
        '04-e1-5c-32-b9-65-80',
        '04E15C32B96580',
        '04:e1:5c:32:b9:65:80'
      ];
      
      for (const uid of variations) {
        pool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 'chip-id',
              chip_uid: '04:E1:5C:32:B9:65:80', // Normalized format
              label: 'Test Chip',
              is_active: true
            }]
          });
        
        const response = await request(app)
          .post('/api/nfc/register')
          .send({ chip_uid: uid, label: 'Test Chip' })
          .expect(201);
        
        expect(response.body.chip_uid).toBe('04:E1:5C:32:B9:65:80');
      }
    });

    it('should reject invalid NFC UID formats', async () => {
      const invalidUIDs = [
        'invalid',
        '12:34', // Too short
        '01:02:03:04:05:06:07:08:09:10:11', // Too long
        'ZZ:XX:YY:WW', // Non-hex characters
        ''
      ];
      
      for (const uid of invalidUIDs) {
        const response = await request(app)
          .post('/api/nfc/register')
          .send({ chip_uid: uid, label: 'Test Chip' })
          .expect(400);
        
        expect(response.body.message).toContain('Invalid NFC UID format');
      }
    });

    it('should prevent duplicate chip registration', async () => {
      const chipData = {
        chip_uid: '04:E1:5C:32:B9:65:80',
        label: 'Duplicate Chip'
      };
      
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-chip-id' }]
      });
      
      const response = await request(app)
        .post('/api/nfc/register')
        .send(chipData)
        .expect(409);
      
      expect(response.body.message).toBe('NFC chip already registered');
    });
  });

  describe('NFC Chip Scanning', () => {
    it('should scan chip and return mapped video for profile', async () => {
      const scanData = {
        chip_uid: '04:E1:5C:32:B9:65:80',
        profile_id: 'profile-id'
      };
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          video_id: 'video-id',
          video_title: 'Kids Video',
          thumbnail_url: 'https://example.com/thumb.jpg',
          platform_id: 'youtube',
          platform_video_id: 'abc123',
          max_watch_time_minutes: 30,
          profile_id: 'profile-id',
          profile_name: 'Child Name',
          daily_limit_minutes: 60
        }]
      });
      
      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send(scanData)
        .expect(200);
      
      expect(response.body.video).toBeDefined();
      expect(response.body.video.id).toBe('video-id');
      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.id).toBe('profile-id');
      expect(response.body.maxWatchTime).toBe(30);
    });

    it('should return 404 for unregistered chip', async () => {
      const scanData = {
        chip_uid: '04:E1:5C:32:B9:65:80'
      };
      
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await request(app)
        .post('/api/nfc/scan/public')
        .send(scanData)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('No video mapped to this NFC chip');
        });
    });

    it('should handle chip without profile mapping', async () => {
      const scanData = {
        chip_uid: '04:E1:5C:32:B9:65:80'
      };
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          video_id: 'video-id',
          video_title: 'Kids Video',
          thumbnail_url: 'https://example.com/thumb.jpg',
          platform_id: 'youtube',
          platform_video_id: 'abc123',
          max_watch_time_minutes: null,
          profile_id: null,
          profile_name: null,
          daily_limit_minutes: null
        }]
      });
      
      const response = await request(app)
        .post('/api/nfc/scan/public')
        .send(scanData)
        .expect(200);
      
      expect(response.body.video).toBeDefined();
      expect(response.body.profile).toBeNull();
    });
  });

  describe('Video-NFC Mapping', () => {
    it('should map video to NFC chip', async () => {
      const mappingData = {
        video_id: 'video-id',
        nfc_chip_id: 'chip-id',
        profile_id: 'profile-id',
        max_watch_time_minutes: 30
      };
      
      // Mock ownership checks
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'video-id' }] }) // Video exists
        .mockResolvedValueOnce({ rows: [{ id: 'chip-id' }] }) // Chip exists
        .mockResolvedValueOnce({ rows: [] }) // No existing mapping
        .mockResolvedValueOnce({
          rows: [{
            id: 'mapping-id',
            ...mappingData
          }]
        }); // Insert mapping
      
      const response = await request(app)
        .post('/api/nfc/map')
        .send(mappingData)
        .expect(201);
      
      expect(response.body.id).toBe('mapping-id');
      expect(response.body.video_id).toBe(mappingData.video_id);
      expect(response.body.nfc_chip_id).toBe(mappingData.nfc_chip_id);
    });

    it('should update existing mapping', async () => {
      const mappingData = {
        video_id: 'video-id',
        nfc_chip_id: 'chip-id',
        profile_id: 'profile-id',
        max_watch_time_minutes: 45
      };
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'video-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'chip-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'existing-mapping' }] }) // Existing mapping
        .mockResolvedValueOnce({
          rows: [{
            id: 'existing-mapping',
            ...mappingData
          }]
        }); // Update mapping
      
      const response = await request(app)
        .post('/api/nfc/map')
        .send(mappingData)
        .expect(200);
      
      expect(response.body.max_watch_time_minutes).toBe(45);
    });

    it('should reject mapping for non-owned video', async () => {
      const mappingData = {
        video_id: 'video-id',
        nfc_chip_id: 'chip-id'
      };
      
      pool.query.mockResolvedValueOnce({ rows: [] }); // Video not found
      
      await request(app)
        .post('/api/nfc/map')
        .send(mappingData)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('Video not found');
        });
    });

    it('should reject mapping for non-owned chip', async () => {
      const mappingData = {
        video_id: 'video-id',
        nfc_chip_id: 'chip-id'
      };
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 'video-id' }] })
        .mockResolvedValueOnce({ rows: [] }); // Chip not found
      
      await request(app)
        .post('/api/nfc/map')
        .send(mappingData)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('NFC chip not found');
        });
    });
  });

  describe('NFC Chip Management', () => {
    it('should list all user chips', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'chip-1',
            chip_uid: '04:E1:5C:32:B9:65:80',
            label: 'Living Room',
            is_active: true,
            created_at: new Date()
          },
          {
            id: 'chip-2',
            chip_uid: '04:E1:5C:32:B9:65:81',
            label: 'Bedroom',
            is_active: true,
            created_at: new Date()
          }
        ]
      });
      
      const response = await request(app)
        .get('/api/nfc/chips')
        .expect(200);
      
      expect(response.body).toHaveLength(2);
      expect(response.body[0].label).toBe('Living Room');
      expect(response.body[1].label).toBe('Bedroom');
    });

    it('should activate/deactivate chip', async () => {
      const chipId = 'chip-id';
      
      // Mock ownership check
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: chipId }] })
        .mockResolvedValueOnce({
          rows: [{
            id: chipId,
            is_active: false
          }]
        });
      
      const response = await request(app)
        .put(`/api/nfc/chips/${chipId}`)
        .send({ is_active: false })
        .expect(200);
      
      expect(response.body.is_active).toBe(false);
    });

    it('should delete chip and all mappings', async () => {
      const chipId = 'chip-id';
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: chipId }] }) // Ownership check
        .mockResolvedValueOnce({ rows: [] }); // Delete chip (cascades to mappings)
      
      await request(app)
        .delete(`/api/nfc/chips/${chipId}`)
        .expect(200)
        .expect(res => {
          expect(res.body.message).toBe('NFC chip deleted successfully');
        });
    });

    it('should prevent deletion of non-owned chip', async () => {
      const chipId = 'chip-id';
      
      pool.query.mockResolvedValueOnce({ rows: [] }); // Not found
      
      await request(app)
        .delete(`/api/nfc/chips/${chipId}`)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('NFC chip not found');
        });
    });
  });

  describe('NFC Rate Limiting', () => {
    it('should rate limit public scan endpoint', async () => {
      // Note: This test assumes rate limiting middleware is applied
      // In a real test, you would need to mock the rate limiter or test with actual delays
      
      const scanData = {
        chip_uid: '04:E1:5C:32:B9:65:80'
      };
      
      pool.query.mockResolvedValue({ rows: [] });
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/nfc/scan/public')
            .send(scanData)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Check that some requests were rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});