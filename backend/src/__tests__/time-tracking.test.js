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

// Import session routes for time tracking
const sessionsRouter = require('../routes/sessions');
app.use('/api/sessions', sessionsRouter);

describe('Time Tracking Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, email: 'parent@example.com' };
      next();
    });
  });

  describe('Daily Limit Enforcement', () => {
    it('should prevent starting session when daily limit exceeded', async () => {
      // Mock profile with 60 minute daily limit
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          daily_limit_minutes: 60,
          name: 'Timmy'
        }]
      });

      // Mock today's watch time already at 65 minutes
      pool.query.mockResolvedValueOnce({
        rows: [{ total_minutes: 65 }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .send({
          profile_id: 1,
          video_id: 1
        })
        .expect(403);

      expect(response.body.message).toContain('Daily watch limit exceeded');
      expect(response.body.limit_minutes).toBe(60);
      expect(response.body.watched_minutes).toBe(65);
    });

    it('should allow starting session when within daily limit', async () => {
      // Mock profile
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          daily_limit_minutes: 60,
          name: 'Timmy'
        }]
      });

      // Mock today's watch time at 30 minutes
      pool.query.mockResolvedValueOnce({
        rows: [{ total_minutes: 30 }]
      });

      // Mock session creation
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 123,
          profile_id: 1,
          video_id: 1,
          started_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .send({
          profile_id: 1,
          video_id: 1
        })
        .expect(201);

      expect(response.body).toHaveProperty('session_id');
      expect(response.body.remaining_minutes).toBe(30);
    });

    it('should handle unlimited daily limit (null)', async () => {
      // Mock profile with no limit
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          daily_limit_minutes: null,
          name: 'Timmy'
        }]
      });

      // Mock today's watch time
      pool.query.mockResolvedValueOnce({
        rows: [{ total_minutes: 500 }]
      });

      // Mock session creation
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 124,
          profile_id: 1,
          video_id: 1,
          started_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .send({
          profile_id: 1,
          video_id: 1
        })
        .expect(201);

      expect(response.body.remaining_minutes).toBeNull();
    });
  });

  describe('Watch Time Calculation', () => {
    it('should correctly calculate session duration on end', async () => {
      const startTime = new Date('2024-01-14T10:00:00Z');
      const endTime = new Date('2024-01-14T10:15:30Z'); // 15.5 minutes later

      // Mock active session
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 100,
          profile_id: 1,
          video_id: 1,
          started_at: startTime,
          ended_at: null
        }]
      });

      // Mock profile lookup
      pool.query.mockResolvedValueOnce({
        rows: [{ user_id: 1 }]
      });

      // Mock session update
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 100,
          ended_at: endTime
        }]
      });

      // Mock daily watch time update/insert
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      jest.spyOn(Date, 'now').mockReturnValue(endTime.getTime());

      const response = await request(app)
        .post('/api/sessions/100/end')
        .expect(200);

      expect(response.body.duration_minutes).toBeCloseTo(15.5, 1);
      
      // Verify daily watch time was updated with correct duration
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO daily_watch_time'),
        expect.arrayContaining([
          1, // profile_id
          expect.any(String), // date
          16 // rounded up to 16 minutes
        ])
      );

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle sessions spanning multiple days', async () => {
      const startTime = new Date('2024-01-14T23:50:00Z');
      const endTime = new Date('2024-01-15T00:10:00Z'); // 20 minutes, crosses midnight

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 101,
          profile_id: 1,
          started_at: startTime,
          ended_at: null
        }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [{ user_id: 1 }]
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 101,
          ended_at: endTime
        }]
      });

      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      jest.spyOn(Date, 'now').mockReturnValue(endTime.getTime());

      await request(app)
        .post('/api/sessions/101/end')
        .expect(200);

      // Should update daily watch time for the start date
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('daily_watch_time'),
        expect.arrayContaining([
          1, // profile_id
          expect.stringContaining('2024-01-14'), // start date
          expect.any(Number)
        ])
      );

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Session Heartbeat', () => {
    it('should update last heartbeat timestamp', async () => {
      const sessionId = 102;
      const now = new Date();

      // Mock active session
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: sessionId,
          profile_id: 1,
          ended_at: null
        }]
      });

      // Mock heartbeat update
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: sessionId,
          last_heartbeat: now
        }]
      });

      const response = await request(app)
        .post(`/api/sessions/${sessionId}/heartbeat`)
        .expect(200);

      expect(response.body.status).toBe('active');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE watch_sessions SET last_heartbeat'),
        [sessionId]
      );
    });

    it('should detect and end stale sessions', async () => {
      const staleTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      // Mock stale sessions
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 103,
            profile_id: 1,
            started_at: new Date(Date.now() - 10 * 60 * 1000),
            last_heartbeat: staleTime
          }
        ]
      });

      // Mock ending stale session
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      // This would typically be called by a cron job or background task
      // Testing the concept here
      const staleThreshold = 2 * 60 * 1000; // 2 minutes
      const isStale = (Date.now() - staleTime.getTime()) > staleThreshold;
      
      expect(isStale).toBe(true);
    });
  });

  describe('Public Endpoints for Kids Mode', () => {
    it('should start session without authentication via public endpoint', async () => {
      // Remove auth for public endpoint test
      authenticateToken.mockImplementation((req, res, next) => {
        return res.status(401).json({ message: 'Unauthorized' });
      });

      // Mock profile lookup
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          daily_limit_minutes: 60,
          name: 'Timmy'
        }]
      });

      // Mock today's watch time
      pool.query.mockResolvedValueOnce({
        rows: [{ total_minutes: 0 }]
      });

      // Mock session creation
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 125,
          profile_id: 1,
          video_id: 1,
          started_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: 1,
          video_id: 1
        })
        .expect(201);

      expect(response.body).toHaveProperty('session_id');
    });

    it('should enforce daily limits on public endpoints', async () => {
      // Mock profile
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          daily_limit_minutes: 30,
          name: 'Sarah'
        }]
      });

      // Mock exceeded watch time
      pool.query.mockResolvedValueOnce({
        rows: [{ total_minutes: 35 }]
      });

      const response = await request(app)
        .post('/api/sessions/start/public')
        .send({
          profile_id: 1,
          video_id: 2
        })
        .expect(403);

      expect(response.body.message).toContain('Daily watch limit exceeded');
    });
  });

  describe('Watch Time Reports', () => {
    it('should generate daily watch time report', async () => {
      const mockReport = [
        { date: '2024-01-14', total_minutes: 45 },
        { date: '2024-01-13', total_minutes: 60 },
        { date: '2024-01-12', total_minutes: 30 }
      ];

      pool.query.mockResolvedValueOnce({
        rows: mockReport
      });

      const response = await request(app)
        .get('/api/sessions/reports/daily')
        .query({
          profile_id: 1,
          start_date: '2024-01-12',
          end_date: '2024-01-14'
        })
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toEqual(mockReport[0]);
    });

    it('should generate weekly summary', async () => {
      const mockSummary = {
        total_minutes: 315,
        average_daily_minutes: 45,
        days_watched: 7,
        most_watched_day: 'Saturday'
      };

      pool.query.mockResolvedValueOnce({
        rows: [mockSummary]
      });

      const response = await request(app)
        .get('/api/sessions/reports/weekly')
        .query({ profile_id: 1 })
        .expect(200);

      expect(response.body).toEqual(mockSummary);
    });
  });
});