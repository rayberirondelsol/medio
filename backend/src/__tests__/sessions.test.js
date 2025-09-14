const request = require('supertest');
const express = require('express');
const sessionRoutes = require('../routes/sessions');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/sessions', sessionRoutes);

describe('Session Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
  });

  describe('Public Endpoints', () => {
    describe('POST /sessions/start/public', () => {
      it('should start a session without authentication', async () => {
        const mockSession = {
          id: 'session-123',
          started_at: new Date().toISOString()
        };

        pool.query.mockResolvedValueOnce({ rows: [mockSession] });
        pool.query.mockResolvedValueOnce({
          rows: [{
            daily_limit_minutes: 60,
            watched_today: 30
          }]
        });

        const response = await request(app)
          .post('/sessions/start/public')
          .send({
            profile_id: 'profile-123',
            video_id: 'video-123'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('session_id');
        expect(response.body).toHaveProperty('started_at');
        expect(response.body.max_watch_time_minutes).toBe(30);
      });

      it('should start session without profile', async () => {
        const mockSession = {
          id: 'session-123',
          started_at: new Date().toISOString()
        };

        pool.query.mockResolvedValueOnce({ rows: [mockSession] });

        const response = await request(app)
          .post('/sessions/start/public')
          .send({
            video_id: 'video-123'
          });

        expect(response.status).toBe(201);
        expect(response.body.max_watch_time_minutes).toBeNull();
      });
    });

    describe('POST /sessions/end/public', () => {
      it('should end a session and update watch time', async () => {
        const mockSession = {
          id: 'session-123',
          profile_id: 'profile-123',
          duration_seconds: 1800,
          stopped_reason: 'manual'
        };

        pool.query.mockResolvedValueOnce({ rows: [mockSession] });
        pool.query.mockResolvedValueOnce({ rows: [] }); // Watch time update

        const response = await request(app)
          .post('/sessions/end/public')
          .send({
            session_id: 'session-123',
            stopped_reason: 'manual'
          });

        expect(response.status).toBe(200);
        expect(response.body.duration_seconds).toBe(1800);
        expect(response.body.stopped_reason).toBe('manual');
      });

      it('should handle non-existent session', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/sessions/end/public')
          .send({
            session_id: 'non-existent'
          });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Session not found or already ended');
      });
    });

    describe('POST /sessions/heartbeat/public', () => {
      it('should check session status and daily limits', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [{
            id: 'session-123',
            daily_limit_minutes: 60,
            total_watched: 65
          }]
        });

        const response = await request(app)
          .post('/sessions/heartbeat/public')
          .send({
            session_id: 'session-123'
          });

        expect(response.status).toBe(200);
        expect(response.body.should_stop).toBe(true);
        expect(response.body.stop_reason).toBe('daily_limit');
        expect(response.body.watched_minutes).toBe(65);
      });

      it('should continue session when under limit', async () => {
        pool.query.mockResolvedValueOnce({
          rows: [{
            id: 'session-123',
            daily_limit_minutes: 60,
            total_watched: 30
          }]
        });

        const response = await request(app)
          .post('/sessions/heartbeat/public')
          .send({
            session_id: 'session-123'
          });

        expect(response.status).toBe(200);
        expect(response.body.should_stop).toBe(false);
        expect(response.body.stop_reason).toBeNull();
      });
    });
  });

  describe('Authenticated Endpoints', () => {
    describe('POST /sessions/start', () => {
      it('should verify profile ownership', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // Profile check fails

        const response = await request(app)
          .post('/sessions/start')
          .send({
            profile_id: 'not-owned-profile',
            video_id: 'video-123'
          });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Profile not found or access denied');
      });

      it('should start session for owned profile', async () => {
        const mockSession = {
          id: 'session-123',
          started_at: new Date().toISOString()
        };

        pool.query.mockResolvedValueOnce({
          rows: [{ id: 'profile-123' }]
        }); // Profile ownership check
        pool.query.mockResolvedValueOnce({ rows: [mockSession] }); // Create session
        pool.query.mockResolvedValueOnce({
          rows: [{
            daily_limit_minutes: 60,
            watched_today: 0
          }]
        }); // Limit check

        const response = await request(app)
          .post('/sessions/start')
          .send({
            profile_id: 'profile-123',
            video_id: 'video-123'
          });

        expect(response.status).toBe(201);
        expect(response.body.max_watch_time_minutes).toBe(60);
      });
    });

    describe('POST /sessions/end', () => {
      it('should verify session ownership', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // Ownership check fails

        const response = await request(app)
          .post('/sessions/end')
          .send({
            session_id: 'not-owned-session'
          });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Session not found or access denied');
      });

      it('should end owned session', async () => {
        const mockSession = {
          id: 'session-123',
          profile_id: 'profile-123',
          duration_seconds: 900,
          stopped_reason: 'manual'
        };

        pool.query.mockResolvedValueOnce({
          rows: [{ id: 'session-123' }]
        }); // Ownership check
        pool.query.mockResolvedValueOnce({ rows: [mockSession] }); // End session
        pool.query.mockResolvedValueOnce({ rows: [] }); // Update watch time

        const response = await request(app)
          .post('/sessions/end')
          .send({
            session_id: 'session-123',
            stopped_reason: 'manual'
          });

        expect(response.status).toBe(200);
        expect(response.body.duration_seconds).toBe(900);
      });
    });
  });

  describe('Validation', () => {
    it('should validate session_id as UUID', async () => {
      const response = await request(app)
        .post('/sessions/end/public')
        .send({
          session_id: 'not-a-uuid'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate stopped_reason values', async () => {
      const response = await request(app)
        .post('/sessions/end/public')
        .send({
          session_id: '123e4567-e89b-12d3-a456-426614174000',
          stopped_reason: 'invalid-reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});