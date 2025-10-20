/**
 * T013: Unit tests for chip count validation (max 20)
 * Tests FR-016 and FR-017: Maximum chip limit enforcement
 */

const { validateChipLimit } = require('../chipLimitValidator');
const pool = require('../../db/pool');

// Mock database pool
jest.mock('../../db/pool');

describe('chipLimitValidator Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request, response, and next
    req = {
      user: { id: 'user-123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateChipLimit', () => {
    it('should allow registration when user has 0 chips', async () => {
      pool.query.mockResolvedValue({
        rows: [{ chip_count: '0' }]
      });

      await validateChipLimit(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as chip_count FROM nfc_chips WHERE user_id = $1',
        ['user-123']
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow registration when user has 19 chips (under limit)', async () => {
      pool.query.mockResolvedValue({
        rows: [{ chip_count: '19' }]
      });

      await validateChipLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block registration when user has exactly 20 chips (at limit)', async () => {
      pool.query.mockResolvedValue({
        rows: [{ chip_count: '20' }]
      });

      await validateChipLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Maximum chip limit reached (20 chips)'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block registration when user has more than 20 chips', async () => {
      pool.query.mockResolvedValue({
        rows: [{ chip_count: '25' }]
      });

      await validateChipLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Maximum chip limit reached (20 chips)'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = null;

      await validateChipLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 401 if user.id is missing', async () => {
      req.user = {};

      await validateChipLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      pool.query.mockRejectedValue(dbError);

      // Mock console.error to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await validateChipLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to validate chip limit'
      });
      expect(next).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating chip limit:', dbError);

      consoleErrorSpy.mockRestore();
    });

    it('should parse chip_count as integer correctly', async () => {
      pool.query.mockResolvedValue({
        rows: [{ chip_count: '15' }]
      });

      await validateChipLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
