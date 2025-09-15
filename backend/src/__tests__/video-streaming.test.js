const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('../db/pool');
jest.mock('../middleware/auth');
jest.mock('fs');

const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

describe('Video Streaming Endpoints', () => {
  let app;
  let server;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      next();
    });
    
    // Set up the video streaming route
    const videoStreamRouter = require('../routes/video-stream');
    app.use('/api/videos', videoStreamRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (server) {
      server.close();
    }
  });

  describe('GET /api/videos/:id/stream', () => {
    it('should stream video with range requests', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      const videoSize = 10485760; // 10MB
      
      // Mock database query
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      // Mock file system
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: videoSize
      });
      
      // Mock createReadStream
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      fs.createReadStream.mockReturnValue(mockStream);
      
      const response = await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .set('Range', 'bytes=0-1023')
        .expect(206);
      
      expect(response.headers['content-range']).toBe('bytes 0-1023/10485760');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe('1024');
      expect(response.headers['content-type']).toBe('video/mp4');
      
      expect(fs.createReadStream).toHaveBeenCalledWith(videoPath, {
        start: 0,
        end: 1023
      });
    });

    it('should return full video when no range header', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      const videoSize = 1024;
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: videoSize
      });
      
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      fs.createReadStream.mockReturnValue(mockStream);
      
      const response = await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .expect(200);
      
      expect(response.headers['content-length']).toBe(videoSize.toString());
      expect(response.headers['content-type']).toBe('video/mp4');
      
      expect(fs.createReadStream).toHaveBeenCalledWith(videoPath);
    });

    it('should handle invalid range headers', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      const videoSize = 1024;
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: videoSize
      });
      
      const response = await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .set('Range', 'bytes=2000-3000')
        .expect(416);
      
      expect(response.headers['content-range']).toBe('bytes */1024');
    });

    it('should return 404 for non-existent video', async () => {
      const videoId = 'non-existent-id';
      
      pool.query.mockResolvedValueOnce({
        rows: []
      });
      
      await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('Video not found');
        });
    });

    it('should return 404 when video file does not exist', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/missing-video.mp4';
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(false);
      
      await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .expect(404)
        .expect(res => {
          expect(res.body.message).toBe('Video file not found');
        });
    });

    it('should handle stream errors gracefully', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 1024
      });
      
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Stream error'));
          }
        }),
        destroy: jest.fn()
      };
      fs.createReadStream.mockReturnValue(mockStream);
      
      await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .expect(500);
    });

    it('should support multiple range formats', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      const videoSize = 10000;
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: videoSize
      });
      
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      fs.createReadStream.mockReturnValue(mockStream);
      
      // Test range with only start
      const response = await request(app)
        .get(`/api/videos/${videoId}/stream`)
        .set('Range', 'bytes=5000-')
        .expect(206);
      
      expect(response.headers['content-range']).toBe('bytes 5000-9999/10000');
      expect(response.headers['content-length']).toBe('5000');
    });

    it('should clean up stream on client disconnect', async () => {
      const videoId = 'test-video-id';
      const videoPath = '/path/to/video.mp4';
      
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: videoId,
          title: 'Test Video',
          file_path: videoPath,
          user_id: 'test-user-id'
        }]
      });
      
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 1024
      });
      
      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      fs.createReadStream.mockReturnValue(mockStream);
      
      const res = await request(app)
        .get(`/api/videos/${videoId}/stream`);
      
      // Simulate client disconnect
      res.abort();
      
      // Verify stream was destroyed
      setTimeout(() => {
        expect(mockStream.destroy).toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Video Content-Type Detection', () => {
    it('should detect correct content type for different video formats', async () => {
      const testCases = [
        { extension: '.mp4', contentType: 'video/mp4' },
        { extension: '.webm', contentType: 'video/webm' },
        { extension: '.ogg', contentType: 'video/ogg' },
        { extension: '.mov', contentType: 'video/quicktime' },
        { extension: '.avi', contentType: 'video/x-msvideo' }
      ];
      
      for (const testCase of testCases) {
        const videoId = 'test-video-id';
        const videoPath = `/path/to/video${testCase.extension}`;
        
        pool.query.mockResolvedValueOnce({
          rows: [{
            id: videoId,
            title: 'Test Video',
            file_path: videoPath,
            user_id: 'test-user-id'
          }]
        });
        
        fs.existsSync.mockReturnValue(true);
        fs.statSync.mockReturnValue({
          size: 1024
        });
        
        const mockStream = {
          pipe: jest.fn(),
          on: jest.fn(),
          destroy: jest.fn()
        };
        fs.createReadStream.mockReturnValue(mockStream);
        
        const response = await request(app)
          .get(`/api/videos/${videoId}/stream`)
          .expect(200);
        
        expect(response.headers['content-type']).toBe(testCase.contentType);
      }
    });
  });
});