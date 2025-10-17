/**
 * T037: Dailymotion Service Unit Tests
 *
 * Tests the Dailymotion service that fetches video metadata from Dailymotion API.
 * Uses mocks to avoid actual API calls during testing.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

const axios = require('axios');
const dailymotionService = require('../../../src/services/dailymotionService');

// Mock axios
jest.mock('axios');

describe('Dailymotion Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchVideoMetadata', () => {
    describe('Successful Metadata Retrieval', () => {
      it('should fetch video metadata successfully for valid video ID', async () => {
        // Arrange
        const videoId = 'x8abcd1';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Sample Dailymotion Video',
            description: 'This is a sample Dailymotion video description',
            thumbnail_720_url: 'https://s2.dmcdn.net/v/AbCdE1/x720',
            thumbnail_480_url: 'https://s2.dmcdn.net/v/AbCdE1/x480',
            thumbnail_240_url: 'https://s2.dmcdn.net/v/AbCdE1/x240',
            'owner.screenname': 'Test Creator',
            duration: 300,
            views_total: 75000,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.title).toBe('Sample Dailymotion Video');
        expect(result.description).toBe('This is a sample Dailymotion video description');
        expect(result.thumbnailUrl).toBe('https://s2.dmcdn.net/v/AbCdE1/x720');
        expect(result.channelName).toBe('Test Creator');
        expect(result.duration).toBe('PT5M');
        expect(result.durationInSeconds).toBe(300);
        expect(result.viewCount).toBe('75000');
        expect(result.publishedAt).toBe('2024-01-15T10:30:00.000Z');

        // Verify axios was called with correct parameters
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining(`api.dailymotion.com/video/${videoId}`),
          expect.objectContaining({
            params: expect.objectContaining({
              fields: expect.stringContaining('title,description')
            })
          })
        );
      });

      it('should handle videos with missing optional fields', async () => {
        // Arrange
        const videoId = 'x8efgh2';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Minimal Video',
            description: '',
            thumbnail_720_url: 'https://s2.dmcdn.net/v/Test1/x720',
            'owner.screenname': 'Minimal User',
            duration: 120,
            views_total: 0,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.description).toBe('');
        expect(result.viewCount).toBe('0');
      });

      it('should fallback to smaller thumbnail if high quality is unavailable', async () => {
        // Arrange
        const videoId = 'x8ijkl3';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Test Video',
            description: 'Test',
            thumbnail_480_url: 'https://s2.dmcdn.net/v/Test1/x480',
            thumbnail_240_url: 'https://s2.dmcdn.net/v/Test1/x240',
            'owner.screenname': 'Test',
            duration: 90,
            views_total: 500,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://s2.dmcdn.net/v/Test1/x480');
      });

      it('should use thumbnail_1080_url if available', async () => {
        // Arrange
        const videoId = 'x8mnop4';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'HD Video',
            description: 'Test',
            thumbnail_1080_url: 'https://s2.dmcdn.net/v/Test1/x1080',
            thumbnail_720_url: 'https://s2.dmcdn.net/v/Test1/x720',
            'owner.screenname': 'Test',
            duration: 90,
            views_total: 500,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://s2.dmcdn.net/v/Test1/x1080');
      });
    });

    describe('Error Handling', () => {
      it('should throw error when video is not found (404)', async () => {
        // Arrange
        const videoId = 'nonExistent';
        const mockError = {
          response: {
            status: 404,
            data: {
              error: {
                message: 'Video not found',
                type: 'not_found'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Video not found');
      });

      it('should throw error when video is private or restricted', async () => {
        // Arrange
        const videoId = 'privateVideo';
        const mockError = {
          response: {
            status: 403,
            data: {
              error: {
                message: 'Access to this video is restricted',
                type: 'access_forbidden'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Video is private or restricted');
      });

      it('should throw error when API key is invalid (401)', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = {
          response: {
            status: 401,
            data: {
              error: {
                message: 'Invalid API key',
                type: 'authentication_error'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid Dailymotion API credentials');
      });

      it('should throw error when API rate limit is exceeded (429)', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = {
          response: {
            status: 429,
            data: {
              error: {
                message: 'Rate limit exceeded',
                type: 'rate_limit_exceeded'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Dailymotion API rate limit exceeded');
      });

      it('should throw error on network failure', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = new Error('Network Error');
        mockError.code = 'ECONNREFUSED';

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Network error');
      });

      it('should throw error when video ID is missing', async () => {
        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(null)).rejects.toThrow('Video ID is required');
        await expect(dailymotionService.fetchVideoMetadata('')).rejects.toThrow('Video ID is required');
        await expect(dailymotionService.fetchVideoMetadata(undefined)).rejects.toThrow('Video ID is required');
      });

      it('should throw error when API returns unexpected format', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockResponse = {
          data: null
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid API response');
      });

      it('should throw error when API returns empty data', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockResponse = {
          data: {}
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid API response');
      });

      it('should throw error for videos that have been deleted', async () => {
        // Arrange
        const videoId = 'deletedVideo';
        const mockError = {
          response: {
            status: 410,
            data: {
              error: {
                message: 'This video has been deleted',
                type: 'gone'
              }
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(dailymotionService.fetchVideoMetadata(videoId)).rejects.toThrow('Video has been deleted');
      });
    });

    describe('Data Transformation', () => {
      it('should correctly convert duration in seconds to ISO 8601 format', async () => {
        // Arrange
        const testCases = [
          { seconds: 90, expected: 'PT1M30S' },
          { seconds: 300, expected: 'PT5M' },
          { seconds: 3723, expected: 'PT1H2M3S' },
          { seconds: 45, expected: 'PT45S' },
          { seconds: 3600, expected: 'PT1H' }
        ];

        for (const testCase of testCases) {
          const mockResponse = {
            data: {
              id: 'x8test1',
              title: 'Test Video',
              description: 'Test',
              thumbnail_720_url: 'https://example.com/thumb.jpg',
              'owner.screenname': 'Test',
              duration: testCase.seconds,
              views_total: 1000,
              created_time: 1705320600
            }
          };

          axios.get.mockResolvedValue(mockResponse);

          // Act
          const result = await dailymotionService.fetchVideoMetadata('x8test1');

          // Assert
          expect(result.duration).toBe(testCase.expected);
          expect(result.durationInSeconds).toBe(testCase.seconds);
        }
      });

      it('should convert Unix timestamp to ISO 8601 date format', async () => {
        // Arrange
        const videoId = 'x8test2';
        const unixTimestamp = 1705320600; // 2024-01-15 10:30:00 UTC
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Test Video',
            description: 'Test',
            thumbnail_720_url: 'https://example.com/thumb.jpg',
            'owner.screenname': 'Test',
            duration: 60,
            views_total: 1000,
            created_time: unixTimestamp
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.publishedAt).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should handle view count as string', async () => {
        // Arrange
        const videoId = 'x8test3';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Test Video',
            description: 'Test',
            thumbnail_720_url: 'https://example.com/thumb.jpg',
            'owner.screenname': 'Test',
            duration: 60,
            views_total: 1234567,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.viewCount).toBe('1234567');
        expect(typeof result.viewCount).toBe('string');
      });

      it('should handle missing thumbnail gracefully', async () => {
        // Arrange
        const videoId = 'x8test4';
        const mockResponse = {
          data: {
            id: videoId,
            title: 'Test Video',
            description: 'Test',
            'owner.screenname': 'Test',
            duration: 60,
            views_total: 1000,
            created_time: 1705320600
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await dailymotionService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBeUndefined();
      });
    });
  });
});
