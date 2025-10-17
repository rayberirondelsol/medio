/**
 * T017: Video Metadata API Integration Tests
 * T038-T039: Extended Tests for Vimeo and Dailymotion
 *
 * Tests the GET /api/videos/metadata endpoint that fetches video metadata
 * from external platforms (YouTube, Vimeo, Dailymotion).
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-64-characters-long-for-security';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const request = require('supertest');

// Mock database pool before requiring app
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
}));

// Mock auth middleware before requiring app
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-test-token') {
      req.user = { id: 1, email: 'test@example.com' };
      next();
    } else if (!req.headers.authorization) {
      res.status(401).json({ success: false, error: 'Authentication required' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }
  }),
  generateToken: jest.fn(),
}));

// Mock the platform services to avoid actual API calls
jest.mock('../../src/services/youtubeService');
jest.mock('../../src/services/vimeoService');
jest.mock('../../src/services/dailymotionService');

const app = require('../../src/app');
const youtubeService = require('../../src/services/youtubeService');
const vimeoService = require('../../src/services/vimeoService');
const dailymotionService = require('../../src/services/dailymotionService');

describe('GET /api/videos/metadata', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Successful Metadata Retrieval', () => {
    it('should return 200 and video metadata for valid YouTube video', async () => {
      // Arrange
      const mockMetadata = {
        videoId: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
        description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        channelName: 'Rick Astley',
        duration: 'PT3M33S',
        durationInSeconds: 213,
        viewCount: '1234567890',
        publishedAt: '2009-10-25T06:57:33Z'
      };

      youtubeService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockMetadata
      });
      expect(youtubeService.fetchVideoMetadata).toHaveBeenCalledWith('dQw4w9WgXcQ');
      expect(youtubeService.fetchVideoMetadata).toHaveBeenCalledTimes(1);
    });

    it('should return metadata with all required fields', async () => {
      // Arrange
      const mockMetadata = {
        videoId: 'testVideoId',
        title: 'Test Video Title',
        description: 'Test video description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        channelName: 'Test Channel',
        duration: 'PT5M30S',
        durationInSeconds: 330,
        viewCount: '1000',
        publishedAt: '2024-01-01T00:00:00Z'
      };

      youtubeService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'testVideoId'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('videoId');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('thumbnailUrl');
      expect(response.body.data).toHaveProperty('channelName');
      expect(response.body.data).toHaveProperty('duration');
      expect(response.body.data).toHaveProperty('durationInSeconds');
      expect(response.body.data).toHaveProperty('viewCount');
      expect(response.body.data).toHaveProperty('publishedAt');
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 when platform parameter is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Platform parameter is required'
      });
    });

    it('should return 400 when videoId parameter is missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Video ID parameter is required'
      });
    });

    it('should return 400 when both parameters are missing', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for unsupported platform', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'tiktok',
          videoId: '123456789'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Unsupported platform: tiktok'
      });
    });

    it('should return 400 for invalid videoId format', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: ''
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for videoId with invalid characters', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'invalid@video#id'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid video ID format'
      });
    });
  });

  describe('Video Not Found Errors (404)', () => {
    it('should return 404 when video does not exist', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Video not found')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'nonExistentVideo'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Video not found'
      });
    });

    it('should return 404 when video is private', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Video not found or is private')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'privateVideo'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Video not found or is private'
      });
    });

    it('should return 404 when video is deleted', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Video not found or is private')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'deletedVideo'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Server Errors (500)', () => {
    it('should return 500 when YouTube API quota is exceeded', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('YouTube API quota exceeded')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'YouTube API quota exceeded'
      });
    });

    it('should return 500 for network errors', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should return 500 for invalid API key', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Invalid YouTube API key')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid YouTube API key'
      });
    });

    it('should return 500 for unexpected service errors', async () => {
      // Arrange
      youtubeService.fetchVideoMetadata.mockRejectedValue(
        new Error('Unexpected error occurred')
      );

      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer valid-test-token');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no authentication token is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should return 401 when invalid authentication token is provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/videos/metadata')
        .query({
          platform: 'youtube',
          videoId: 'dQw4w9WgXcQ'
        })
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid authentication token'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to prevent abuse', async () => {
      // Arrange
      const mockMetadata = {
        videoId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        description: 'Test',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        channelName: 'Test',
        duration: 'PT1M',
        durationInSeconds: 60,
        viewCount: '1000',
        publishedAt: '2024-01-01T00:00:00Z'
      };

      youtubeService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

      // Act - Make multiple rapid requests
      const requests = Array(100).fill(null).map(() =>
        request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'youtube',
            videoId: 'dQw4w9WgXcQ'
          })
          .set('Authorization', 'Bearer valid-test-token')
      );

      const responses = await Promise.all(requests);

      // Assert - At least one should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  // T038: Vimeo Platform Tests
  describe('Vimeo Platform Support', () => {
    describe('Successful Vimeo Metadata Retrieval', () => {
      it('should return 200 and video metadata for valid Vimeo video', async () => {
        // Arrange
        const mockMetadata = {
          videoId: '123456789',
          title: 'Sample Vimeo Video',
          description: 'This is a sample Vimeo video',
          thumbnailUrl: 'https://i.vimeocdn.com/video/123456789_1280.jpg',
          channelName: 'Vimeo Creator',
          duration: 'PT5M30S',
          durationInSeconds: 330,
          viewCount: '50000',
          publishedAt: '2024-01-15T10:30:00+00:00'
        };

        vimeoService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: '123456789'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: mockMetadata
        });
        expect(vimeoService.fetchVideoMetadata).toHaveBeenCalledWith('123456789');
        expect(vimeoService.fetchVideoMetadata).toHaveBeenCalledTimes(1);
      });

      it('should return metadata with all required Vimeo fields', async () => {
        // Arrange
        const mockMetadata = {
          videoId: '987654321',
          title: 'Test Vimeo Video',
          description: 'Test description',
          thumbnailUrl: 'https://i.vimeocdn.com/video/test.jpg',
          channelName: 'Test Channel',
          duration: 'PT2M15S',
          durationInSeconds: 135,
          viewCount: '1000',
          publishedAt: '2024-01-01T00:00:00+00:00'
        };

        vimeoService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: '987654321'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('videoId');
        expect(response.body.data).toHaveProperty('title');
        expect(response.body.data).toHaveProperty('description');
        expect(response.body.data).toHaveProperty('thumbnailUrl');
        expect(response.body.data).toHaveProperty('channelName');
        expect(response.body.data).toHaveProperty('duration');
        expect(response.body.data).toHaveProperty('durationInSeconds');
        expect(response.body.data).toHaveProperty('viewCount');
        expect(response.body.data).toHaveProperty('publishedAt');
      });
    });

    describe('Vimeo Error Handling', () => {
      it('should return 404 when Vimeo video does not exist', async () => {
        // Arrange
        vimeoService.fetchVideoMetadata.mockRejectedValue(
          new Error('Video not found')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: 'nonExistent'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          error: 'Video not found'
        });
      });

      it('should return 404 when Vimeo video is private', async () => {
        // Arrange
        vimeoService.fetchVideoMetadata.mockRejectedValue(
          new Error('Video is private or restricted')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: 'privateVideo'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          error: 'Video is private or restricted'
        });
      });

      it('should return 500 when Vimeo API rate limit is exceeded', async () => {
        // Arrange
        vimeoService.fetchVideoMetadata.mockRejectedValue(
          new Error('Vimeo API rate limit exceeded')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: '123456789'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Vimeo API rate limit exceeded'
        });
      });

      it('should return 500 for invalid Vimeo access token', async () => {
        // Arrange
        vimeoService.fetchVideoMetadata.mockRejectedValue(
          new Error('Invalid Vimeo access token')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: '123456789'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid Vimeo access token'
        });
      });

      it('should return 500 for Vimeo network errors', async () => {
        // Arrange
        vimeoService.fetchVideoMetadata.mockRejectedValue(
          new Error('Network error')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'vimeo',
            videoId: '123456789'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Network error'
        });
      });
    });
  });

  // T039: Dailymotion Platform Tests
  describe('Dailymotion Platform Support', () => {
    describe('Successful Dailymotion Metadata Retrieval', () => {
      it('should return 200 and video metadata for valid Dailymotion video', async () => {
        // Arrange
        const mockMetadata = {
          videoId: 'x8abcd1',
          title: 'Sample Dailymotion Video',
          description: 'This is a sample Dailymotion video',
          thumbnailUrl: 'https://s2.dmcdn.net/v/AbCdE1/x720',
          channelName: 'Dailymotion Creator',
          duration: 'PT4M20S',
          durationInSeconds: 260,
          viewCount: '75000',
          publishedAt: '2024-01-15T10:30:00.000Z'
        };

        dailymotionService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'x8abcd1'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: mockMetadata
        });
        expect(dailymotionService.fetchVideoMetadata).toHaveBeenCalledWith('x8abcd1');
        expect(dailymotionService.fetchVideoMetadata).toHaveBeenCalledTimes(1);
      });

      it('should return metadata with all required Dailymotion fields', async () => {
        // Arrange
        const mockMetadata = {
          videoId: 'x8efgh2',
          title: 'Test Dailymotion Video',
          description: 'Test description',
          thumbnailUrl: 'https://s2.dmcdn.net/v/Test1/x720',
          channelName: 'Test Channel',
          duration: 'PT3M',
          durationInSeconds: 180,
          viewCount: '2000',
          publishedAt: '2024-01-01T00:00:00.000Z'
        };

        dailymotionService.fetchVideoMetadata.mockResolvedValue(mockMetadata);

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'x8efgh2'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('videoId');
        expect(response.body.data).toHaveProperty('title');
        expect(response.body.data).toHaveProperty('description');
        expect(response.body.data).toHaveProperty('thumbnailUrl');
        expect(response.body.data).toHaveProperty('channelName');
        expect(response.body.data).toHaveProperty('duration');
        expect(response.body.data).toHaveProperty('durationInSeconds');
        expect(response.body.data).toHaveProperty('viewCount');
        expect(response.body.data).toHaveProperty('publishedAt');
      });
    });

    describe('Dailymotion Error Handling', () => {
      it('should return 404 when Dailymotion video does not exist', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Video not found')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'nonExistent'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          error: 'Video not found'
        });
      });

      it('should return 404 when Dailymotion video is private', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Video is private or restricted')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'privateVideo'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          error: 'Video is private or restricted'
        });
      });

      it('should return 404 when Dailymotion video has been deleted', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Video has been deleted')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'deletedVideo'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          success: false,
          error: 'Video has been deleted'
        });
      });

      it('should return 500 when Dailymotion API rate limit is exceeded', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Dailymotion API rate limit exceeded')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'x8abcd1'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Dailymotion API rate limit exceeded'
        });
      });

      it('should return 500 for invalid Dailymotion API credentials', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Invalid Dailymotion API credentials')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'x8abcd1'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid Dailymotion API credentials'
        });
      });

      it('should return 500 for Dailymotion network errors', async () => {
        // Arrange
        dailymotionService.fetchVideoMetadata.mockRejectedValue(
          new Error('Network error')
        );

        // Act
        const response = await request(app)
          .get('/api/videos/metadata')
          .query({
            platform: 'dailymotion',
            videoId: 'x8abcd1'
          })
          .set('Authorization', 'Bearer valid-test-token');

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Network error'
        });
      });
    });
  });
});
