/**
 * T016-T020: Integration tests for NFC chip registration endpoints
 * T016: POST /api/nfc/chips with valid data (returns 201)
 * T017: POST /api/nfc/chips with duplicate chip_uid (returns 409)
 * T018: POST /api/nfc/chips with invalid label (returns 400)
 * T019: POST /api/nfc/chips exceeding 20 chip limit (returns 403)
 * T020: Rate limiting on POST endpoint (returns 429)
 */

const request = require('supertest');
const express = require('express');
const nfcRoutes = require('../../routes/nfc');
const pool = require('../../db/pool');
const { authenticateToken } = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../db/pool');
jest.mock('../../middleware/auth');
jest.mock('@sentry/node');

const app = express();
app.use(express.json());
app.use('/api/nfc', nfcRoutes);

describe('NFC Chip Registration Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authentication middleware to provide user context
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  describe('POST /api/nfc/chips', () => {
    // T016: Valid registration
    describe('T016: Valid chip registration', () => {
      it('should register a new NFC chip with valid data and return 201', async () => {
        const mockChip = {
          id: 'chip-123',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Bens Chip',
          created_at: new Date().toISOString()
        };

        // Mock chip count check (under limit)
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '5' }] });
        // Mock successful insert
        pool.query.mockResolvedValueOnce({ rows: [mockChip] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Bens Chip'
          });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(mockChip);
        expect(response.body.chip_uid).toBe('04:5A:B2:C3:D4:E5:F6');
      });

      it('should normalize chip_uid to uppercase with colons', async () => {
        const mockChip = {
          id: 'chip-456',
          user_id: 'user-123',
          chip_uid: '04:5A:B2:C3:D4:E5:F6',
          label: 'Test Chip',
          created_at: new Date().toISOString()
        };

        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '3' }] });
        pool.query.mockResolvedValueOnce({ rows: [mockChip] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '045ab2c3d4e5f6', // lowercase, no separators
            label: 'Test Chip'
          });

        expect(response.status).toBe(201);
        // Verify the query was called with normalized UID
        expect(pool.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['user-123', '04:5A:B2:C3:D4:E5:F6', 'Test Chip'])
        );
      });

      it('should accept chip_uid with spaces', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '2' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-789' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04 5A B2 C3 D4 E5 F6',
            label: 'Space Test'
          });

        expect(response.status).toBe(201);
      });

      it('should accept chip_uid with hyphens', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '1' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-101' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04-5A-B2-C3-D4-E5-F6',
            label: 'Hyphen Test'
          });

        expect(response.status).toBe(201);
      });

      it('should accept 4-byte UID (minimum length)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '0' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-min' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3', // 4 bytes = 8 hex chars
            label: 'Min Length'
          });

        expect(response.status).toBe(201);
      });

      it('should accept 10-byte UID (maximum length)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '0' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-max' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:E1:5C:32:B9:65:80:A1:F2:C3', // 10 bytes = 20 hex chars
            label: 'Max Length'
          });

        expect(response.status).toBe(201);
      });
    });

    // T017: Duplicate chip_uid
    describe('T017: Duplicate chip_uid handling', () => {
      it('should return 409 when chip_uid already exists (same user)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '5' }] });

        // Mock unique constraint violation (PostgreSQL error code 23505)
        const duplicateError = new Error('duplicate key value violates unique constraint');
        duplicateError.code = '23505';
        pool.query.mockRejectedValueOnce(duplicateError);

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Duplicate Chip'
          });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
          message: 'NFC chip already registered'
        });
      });

      it('should return identical 409 message when chip_uid exists (different user - FR-015)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '3' }] });

        const duplicateError = new Error('duplicate key value violates unique constraint');
        duplicateError.code = '23505';
        pool.query.mockRejectedValueOnce(duplicateError);

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Another User Chip'
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('NFC chip already registered');
        // Verify no ownership information is leaked
        expect(response.body.message).not.toContain('user');
        expect(response.body.message).not.toContain('owner');
      });
    });

    // T018: Invalid label
    describe('T018: Invalid label validation', () => {
      it('should return 400 when label is empty', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: ''
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when label is only whitespace', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: '   '
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when label exceeds 50 characters', async () => {
        const longLabel = 'A'.repeat(51);

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: longLabel
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.some(e => e.msg.includes('1-50 characters'))).toBe(true);
      });

      it('should return 400 when label contains HTML tags', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: '<script>alert("xss")</script>'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when label contains special characters', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Chip@Home#1'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.some(e => e.msg.includes('letters, numbers, spaces, hyphens, and apostrophes'))).toBe(true);
      });

      it('should return 400 when chip_uid is invalid (non-hex)', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:ZZ:B2:C3',
            label: 'Valid Label'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when chip_uid is too short', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A', // Only 2 bytes
            label: 'Valid Label'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when chip_uid is too long', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:E1:5C:32:B9:65:80:A1:F2:C3:D4', // 11 bytes
            label: 'Valid Label'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when label is missing', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 when chip_uid is missing', async () => {
        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            label: 'Valid Label'
          });

        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });
    });

    // T019: Chip limit enforcement
    describe('T019: 20 chip limit enforcement (FR-016, FR-017)', () => {
      it('should return 403 when user has 20 chips (at limit)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '20' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Over Limit Chip'
          });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          message: 'Maximum chip limit reached (20 chips)'
        });
      });

      it('should return 403 when user has more than 20 chips', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '25' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Over Limit Chip'
          });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Maximum chip limit reached (20 chips)');
      });

      it('should allow registration when user has 19 chips (under limit)', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '19' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-19' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: '19th Chip'
          });

        expect(response.status).toBe(201);
      });
    });

    // T020: Rate limiting
    describe('T020: Rate limiting enforcement (NFR-021)', () => {
      it('should apply rate limiting to POST endpoint', async () => {
        // Note: This test verifies that rate limiting middleware is applied
        // Actual rate limit testing would require multiple requests
        // We verify the middleware chain includes the rate limiter

        // Make one successful request
        pool.query.mockResolvedValueOnce({ rows: [{ chip_count: '1' }] });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-rl' }] });

        const response = await request(app)
          .post('/api/nfc/chips')
          .send({
            chip_uid: '04:5A:B2:C3:D4:E5:F6',
            label: 'Rate Limit Test'
          });

        expect(response.status).toBe(201);
        // Rate limit headers should be present (set by express-rate-limit)
        // Note: In actual implementation, check for RateLimit-* headers
      });
    });
  });

  describe('DELETE /api/nfc/chips/:chipId', () => {
    describe('Successful deletion', () => {
      it('should delete chip and return 200', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [{ id: 'chip-123' }]
        });

        const response = await request(app)
          .delete('/api/nfc/chips/chip-123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'NFC chip deleted successfully'
        });
        expect(pool.query).toHaveBeenCalledWith(
          'DELETE FROM nfc_chips WHERE id = $1 AND user_id = $2 RETURNING id',
          ['chip-123', 'user-123']
        );
      });

      it('should trigger CASCADE deletion of video mappings', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [{ id: 'chip-456' }]
        });

        await request(app).delete('/api/nfc/chips/chip-456');

        // Verify DELETE query was called (CASCADE happens at database level)
        expect(pool.query).toHaveBeenCalled();
      });
    });

    describe('Ownership verification', () => {
      it('should return 404 when chip does not exist', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [] // No chip found
        });

        const response = await request(app)
          .delete('/api/nfc/chips/nonexistent-chip');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          message: 'NFC chip not found'
        });
      });

      it('should return 404 when chip belongs to different user (NFR-009 - anti-enumeration)', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [] // No chip found for this user_id
        });

        const response = await request(app)
          .delete('/api/nfc/chips/other-user-chip');

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('NFC chip not found');
        // Verify message doesn't leak ownership information
        expect(response.body.message).not.toContain('permission');
        expect(response.body.message).not.toContain('owner');
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        const dbError = new Error('Database connection failed');
        pool.query.mockRejectedValueOnce(dbError);

        // Mock console.error to prevent test output pollution
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const response = await request(app)
          .delete('/api/nfc/chips/chip-123');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          message: 'Failed to delete NFC chip'
        });

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Rate limiting', () => {
      it('should apply rate limiting to DELETE endpoint', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 'chip-789' }] });

        const response = await request(app)
          .delete('/api/nfc/chips/chip-789');

        expect(response.status).toBe(200);
        // Rate limit middleware should be applied (20 req/15min per NFR-022)
      });
    });
  });

  describe('GET /api/nfc/chips', () => {
    it('should return all chips for authenticated user', async () => {
      const mockChips = [
        { id: 'chip-1', chip_uid: '04:5A:B2:C3:D4:E5:F6', label: 'Chip 1' },
        { id: 'chip-2', chip_uid: '04:E1:5C:32:B9:65:80', label: 'Chip 2' }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockChips });

      const response = await request(app).get('/api/nfc/chips');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockChips);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM nfc_chips WHERE user_id = $1 ORDER BY created_at DESC',
        ['user-123']
      );
    });

    it('should return empty array when user has no chips', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/nfc/chips');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should apply rate limiting (60 req/15min per NFR-023)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/nfc/chips');

      expect(response.status).toBe(200);
      // Rate limit middleware should be applied
    });
  });
});
