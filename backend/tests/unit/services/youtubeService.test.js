/**
 * T016: YouTube Service Unit Tests
 *
 * Tests the YouTube service that fetches video metadata from YouTube Data API v3.
 * Uses mocks to avoid actual API calls during testing.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

const axios = require('axios');
const youtubeService = require('../../../src/services/youtubeService');

// Mock axios
jest.mock('axios');

describe('YouTube Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchVideoMetadata', () => {
    describe('Successful Metadata Retrieval', () => {
      it('should fetch video metadata successfully for valid video ID', async () => {
        // Arrange
        const videoId = 'dQw4w9WgXcQ';
        const mockResponse = {
          data: {
            items: [
              {
                id: videoId,
                snippet: {
                  title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
                  description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
                  thumbnails: {
                    default: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' },
                    medium: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
                    high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
                  },
                  channelTitle: 'Rick Astley',
                  publishedAt: '2009-10-25T06:57:33Z'
                },
                contentDetails: {
                  duration: 'PT3M33S'
                },
                statistics: {
                  viewCount: '1234567890'
                }
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await youtubeService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.title).toBe('Rick Astley - Never Gonna Give You Up (Official Video)');
        expect(result.description).toBe('The official video for "Never Gonna Give You Up" by Rick Astley');
        expect(result.thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
        expect(result.channelName).toBe('Rick Astley');
        expect(result.duration).toBe('PT3M33S');
        expect(result.viewCount).toBe('1234567890');
        expect(result.publishedAt).toBe('2009-10-25T06:57:33Z');

        // Verify axios was called with correct parameters
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('googleapis.com/youtube/v3/videos'),
          expect.objectContaining({
            params: expect.objectContaining({
              id: videoId,
              part: 'snippet,contentDetails,statistics'
            })
          })
        );
      });

      it('should use API key from environment variables', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockResponse = {
          data: {
            items: [
              {
                id: videoId,
                snippet: {
                  title: 'Test Video',
                  description: 'Test Description',
                  thumbnails: {
                    high: { url: 'https://example.com/thumb.jpg' }
                  },
                  channelTitle: 'Test Channel',
                  publishedAt: '2024-01-01T00:00:00Z'
                },
                contentDetails: {
                  duration: 'PT1M30S'
                },
                statistics: {
                  viewCount: '1000'
                }
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        await youtubeService.fetchVideoMetadata(videoId);

        // Assert
        expect(axios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({
              key: expect.any(String)
            })
          })
        );
      });

      it('should handle videos with missing optional fields', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockResponse = {
          data: {
            items: [
              {
                id: videoId,
                snippet: {
                  title: 'Test Video',
                  description: '',
                  thumbnails: {
                    high: { url: 'https://example.com/thumb.jpg' }
                  },
                  channelTitle: 'Test Channel',
                  publishedAt: '2024-01-01T00:00:00Z'
                },
                contentDetails: {
                  duration: 'PT1M30S'
                },
                statistics: {}
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await youtubeService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.description).toBe('');
        expect(result.viewCount).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should throw error when video is not found (404)', async () => {
        // Arrange
        const videoId = 'nonExistentVideo';
        const mockError = {
          response: {
            status: 404,
            data: {
              error: {
                code: 404,
                message: 'Video not found'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('Video not found');
      });

      it('should throw error when video is private or deleted', async () => {
        // Arrange
        const videoId = 'privateVideo';
        const mockResponse = {
          data: {
            items: []
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('Video not found or is private');
      });

      it('should throw error when API quota is exceeded (403)', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockError = {
          response: {
            status: 403,
            data: {
              error: {
                code: 403,
                message: 'The request cannot be completed because you have exceeded your quota.',
                errors: [
                  {
                    domain: 'youtube.quota',
                    reason: 'quotaExceeded'
                  }
                ]
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('YouTube API quota exceeded');
      });

      it('should throw error when API key is invalid (400)', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockError = {
          response: {
            status: 400,
            data: {
              error: {
                code: 400,
                message: 'API key not valid'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid YouTube API key');
      });

      it('should throw error on network failure', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockError = new Error('Network Error');
        mockError.code = 'ECONNREFUSED';

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('Network error');
      });

      it('should throw error when video ID is missing', async () => {
        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(null)).rejects.toThrow('Video ID is required');
        await expect(youtubeService.fetchVideoMetadata('')).rejects.toThrow('Video ID is required');
        await expect(youtubeService.fetchVideoMetadata(undefined)).rejects.toThrow('Video ID is required');
      });

      it('should throw error when API returns unexpected format', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockResponse = {
          data: null
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(youtubeService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid API response');
      });
    });

    describe('Data Transformation', () => {
      it('should correctly parse ISO 8601 duration format', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const testCases = [
          { apiDuration: 'PT1M30S', expectedSeconds: 90 },
          { apiDuration: 'PT5M', expectedSeconds: 300 },
          { apiDuration: 'PT1H2M3S', expectedSeconds: 3723 },
          { apiDuration: 'PT45S', expectedSeconds: 45 }
        ];

        for (const testCase of testCases) {
          const mockResponse = {
            data: {
              items: [
                {
                  id: videoId,
                  snippet: {
                    title: 'Test Video',
                    description: 'Test',
                    thumbnails: { high: { url: 'https://example.com/thumb.jpg' } },
                    channelTitle: 'Test',
                    publishedAt: '2024-01-01T00:00:00Z'
                  },
                  contentDetails: {
                    duration: testCase.apiDuration
                  },
                  statistics: {}
                }
              ]
            }
          };

          axios.get.mockResolvedValue(mockResponse);

          // Act
          const result = await youtubeService.fetchVideoMetadata(videoId);

          // Assert
          expect(result.durationInSeconds).toBe(testCase.expectedSeconds);
        }
      });

      it('should use high quality thumbnail as default', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockResponse = {
          data: {
            items: [
              {
                id: videoId,
                snippet: {
                  title: 'Test Video',
                  description: 'Test',
                  thumbnails: {
                    default: { url: 'https://example.com/default.jpg' },
                    medium: { url: 'https://example.com/medium.jpg' },
                    high: { url: 'https://example.com/high.jpg' }
                  },
                  channelTitle: 'Test',
                  publishedAt: '2024-01-01T00:00:00Z'
                },
                contentDetails: { duration: 'PT1M' },
                statistics: {}
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await youtubeService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://example.com/high.jpg');
      });

      it('should fallback to medium thumbnail if high quality is unavailable', async () => {
        // Arrange
        const videoId = 'testVideoId';
        const mockResponse = {
          data: {
            items: [
              {
                id: videoId,
                snippet: {
                  title: 'Test Video',
                  description: 'Test',
                  thumbnails: {
                    default: { url: 'https://example.com/default.jpg' },
                    medium: { url: 'https://example.com/medium.jpg' }
                  },
                  channelTitle: 'Test',
                  publishedAt: '2024-01-01T00:00:00Z'
                },
                contentDetails: { duration: 'PT1M' },
                statistics: {}
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await youtubeService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://example.com/medium.jpg');
      });
    });
  });
});
