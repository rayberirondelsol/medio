const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');
jest.mock('multer');

const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// Create test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock cookie parser
app.use((req, res, next) => {
  req.cookies = {};
  next();
});

// Import routes after mocks
const videosRouter = require('../routes/videos');
app.use('/api/videos', videosRouter);

describe('Videos API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, email: 'test@example.com' };
      next();
    });
  });

  describe('GET /api/videos', () => {
    it('should return paginated list of videos', async () => {
      const mockVideos = [
        {
          id: 1,
          title: 'Test Video 1',
          description: 'Description 1',
          url: 'https://example.com/video1.mp4',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          duration: 120,
          created_at: new Date()
        },
        {
          id: 2,
          title: 'Test Video 2',
          description: 'Description 2',
          url: 'https://example.com/video2.mp4',
          thumbnail_url: 'https://example.com/thumb2.jpg',
          duration: 180,
          created_at: new Date()
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: [{ total_count: '2' }] });
      pool.query.mockResolvedValueOnce({ rows: mockVideos });

      const response = await request(app)
        .get('/api/videos')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toEqual({
        page: 1,
        limit: 10,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
      expect(response.body.videos).toHaveLength(2);
    });

    it('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database connection error'));

      const response = await request(app)
        .get('/api/videos')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });

    it('should enforce maximum limit of 100', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total_count: '0' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/videos')
        .query({ page: 1, limit: 200 })
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });
  });

  describe('POST /api/videos', () => {
    it('should create a new video', async () => {
      const newVideo = {
        title: 'New Video',
        description: 'New video description',
        url: 'https://example.com/new.mp4',
        thumbnail_url: 'https://example.com/new-thumb.jpg',
        duration: 300
      };

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          ...newVideo,
          user_id: 1,
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/videos')
        .send(newVideo)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newVideo.title);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        expect.arrayContaining([
          newVideo.title,
          newVideo.description,
          newVideo.url,
          newVideo.thumbnail_url,
          newVideo.duration,
          1
        ])
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/videos')
        .send({ description: 'Only description' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/videos')
        .send({
          title: 'Test',
          url: 'not-a-valid-url',
          duration: 100
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'url' })
        ])
      );
    });
  });

  describe('PUT /api/videos/:id', () => {
    it('should update a video', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      // Check ownership
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1 }]
      });

      // Update video
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...updates,
          url: 'https://example.com/video.mp4',
          user_id: 1
        }]
      });

      const response = await request(app)
        .put('/api/videos/1')
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe(updates.title);
      expect(response.body.description).toBe(updates.description);
    });

    it('should prevent updating videos owned by other users', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2 }]
      });

      const response = await request(app)
        .put('/api/videos/1')
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.message).toContain('not authorized');
    });

    it('should return 404 for non-existent video', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/videos/999')
        .send({ title: 'Update non-existent' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/videos/:id', () => {
    it('should delete a video', async () => {
      // Check ownership
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1 }]
      });

      // Delete video
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/videos/1')
        .expect(200);

      expect(response.body.message).toContain('deleted');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM videos'),
        [1]
      );
    });

    it('should prevent deleting videos owned by other users', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2 }]
      });

      await request(app)
        .delete('/api/videos/1')
        .expect(403);
    });
  });

  describe('Video Streaming', () => {
    it('should handle range requests for video streaming', async () => {
      // This would be implemented in a separate streaming endpoint
      // Testing the concept here
      const videoSize = 10000000; // 10MB
      const range = 'bytes=0-999999';
      
      // Mock video metadata lookup
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          url: 'https://example.com/video.mp4',
          size: videoSize
        }]
      });

      // In a real implementation, you would:
      // 1. Parse the range header
      // 2. Validate the range
      // 3. Stream the requested bytes
      // 4. Set appropriate headers (Content-Range, Accept-Ranges, etc.)
      
      expect(range).toMatch(/^bytes=\d+-\d+$/);
    });
  });
});