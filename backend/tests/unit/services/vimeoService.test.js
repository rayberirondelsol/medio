/**
 * T036: Vimeo Service Unit Tests
 *
 * Tests the Vimeo service that fetches video metadata from Vimeo API.
 * Uses mocks to avoid actual API calls during testing.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

const axios = require('axios');
const vimeoService = require('../../../src/services/vimeoService');

// Mock axios
jest.mock('axios');

describe('Vimeo Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchVideoMetadata', () => {
    describe('Successful Metadata Retrieval', () => {
      it('should fetch video metadata successfully for valid video ID', async () => {
        // Arrange
        const videoId = '123456789';
        const mockResponse = {
          data: {
            name: 'Sample Vimeo Video',
            description: 'This is a sample Vimeo video description',
            pictures: {
              sizes: [
                { width: 100, link: 'https://i.vimeocdn.com/video/100.jpg' },
                { width: 640, link: 'https://i.vimeocdn.com/video/640.jpg' },
                { width: 1280, link: 'https://i.vimeocdn.com/video/1280.jpg' }
              ]
            },
            user: {
              name: 'Test Creator'
            },
            duration: 180,
            stats: {
              plays: 50000
            },
            created_time: '2024-01-15T10:30:00+00:00',
            link: 'https://vimeo.com/123456789'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.title).toBe('Sample Vimeo Video');
        expect(result.description).toBe('This is a sample Vimeo video description');
        expect(result.thumbnailUrl).toBe('https://i.vimeocdn.com/video/1280.jpg');
        expect(result.channelName).toBe('Test Creator');
        expect(result.duration).toBe('PT3M');
        expect(result.durationInSeconds).toBe(180);
        expect(result.viewCount).toBe('50000');
        expect(result.publishedAt).toBe('2024-01-15T10:30:00+00:00');

        // Verify axios was called with correct parameters
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining(`api.vimeo.com/videos/${videoId}`),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer')
            })
          })
        );
      });

      it('should use access token from environment variables', async () => {
        // Arrange
        const videoId = '987654321';
        const mockResponse = {
          data: {
            name: 'Test Video',
            description: 'Test',
            pictures: {
              sizes: [{ width: 640, link: 'https://example.com/thumb.jpg' }]
            },
            user: { name: 'Test User' },
            duration: 120,
            stats: { plays: 1000 },
            created_time: '2024-01-01T00:00:00+00:00',
            link: 'https://vimeo.com/987654321'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(axios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer')
            })
          })
        );
      });

      it('should handle videos with missing optional fields', async () => {
        // Arrange
        const videoId = '555666777';
        const mockResponse = {
          data: {
            name: 'Minimal Video',
            description: null,
            pictures: {
              sizes: [{ width: 640, link: 'https://example.com/thumb.jpg' }]
            },
            user: { name: 'Minimal User' },
            duration: 60,
            stats: {},
            created_time: '2024-01-01T00:00:00+00:00',
            link: 'https://vimeo.com/555666777'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(result).toBeDefined();
        expect(result.videoId).toBe(videoId);
        expect(result.description).toBeNull();
        expect(result.viewCount).toBe('0');
      });

      it('should fallback to smaller thumbnail if large one is unavailable', async () => {
        // Arrange
        const videoId = '111222333';
        const mockResponse = {
          data: {
            name: 'Test Video',
            description: 'Test',
            pictures: {
              sizes: [
                { width: 100, link: 'https://example.com/100.jpg' },
                { width: 640, link: 'https://example.com/640.jpg' }
              ]
            },
            user: { name: 'Test' },
            duration: 90,
            stats: { plays: 500 },
            created_time: '2024-01-01T00:00:00+00:00',
            link: 'https://vimeo.com/111222333'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://example.com/640.jpg');
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
              error: 'The requested video could not be found'
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Video not found');
      });

      it('should throw error when video is private', async () => {
        // Arrange
        const videoId = 'privateVideo';
        const mockError = {
          response: {
            status: 403,
            data: {
              error: 'You do not have permission to access this video'
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Video is private or restricted');
      });

      it('should throw error when access token is invalid (401)', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = {
          response: {
            status: 401,
            data: {
              error: 'The access token provided is invalid'
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid Vimeo access token');
      });

      it('should throw error when API rate limit is exceeded (429)', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = {
          response: {
            status: 429,
            data: {
              error: 'Rate limit exceeded'
            }
          }
        };

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Vimeo API rate limit exceeded');
      });

      it('should throw error on network failure', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockError = new Error('Network Error');
        mockError.code = 'ECONNREFUSED';

        axios.get.mockRejectedValue(mockError);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Network error');
      });

      it('should throw error when video ID is missing', async () => {
        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(null)).rejects.toThrow('Video ID is required');
        await expect(vimeoService.fetchVideoMetadata('')).rejects.toThrow('Video ID is required');
        await expect(vimeoService.fetchVideoMetadata(undefined)).rejects.toThrow('Video ID is required');
      });

      it('should throw error when API returns unexpected format', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockResponse = {
          data: null
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid API response');
      });

      it('should throw error when API returns empty data', async () => {
        // Arrange
        const videoId = 'testVideo';
        const mockResponse = {
          data: {}
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act & Assert
        await expect(vimeoService.fetchVideoMetadata(videoId)).rejects.toThrow('Invalid API response');
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
              name: 'Test Video',
              description: 'Test',
              pictures: {
                sizes: [{ width: 640, link: 'https://example.com/thumb.jpg' }]
              },
              user: { name: 'Test' },
              duration: testCase.seconds,
              stats: { plays: 1000 },
              created_time: '2024-01-01T00:00:00+00:00',
              link: 'https://vimeo.com/123456'
            }
          };

          axios.get.mockResolvedValue(mockResponse);

          // Act
          const result = await vimeoService.fetchVideoMetadata('123456');

          // Assert
          expect(result.duration).toBe(testCase.expected);
          expect(result.durationInSeconds).toBe(testCase.seconds);
        }
      });

      it('should select largest available thumbnail', async () => {
        // Arrange
        const videoId = '123456';
        const mockResponse = {
          data: {
            name: 'Test Video',
            description: 'Test',
            pictures: {
              sizes: [
                { width: 100, link: 'https://example.com/100.jpg' },
                { width: 200, link: 'https://example.com/200.jpg' },
                { width: 640, link: 'https://example.com/640.jpg' },
                { width: 1280, link: 'https://example.com/1280.jpg' },
                { width: 1920, link: 'https://example.com/1920.jpg' }
              ]
            },
            user: { name: 'Test' },
            duration: 60,
            stats: { plays: 1000 },
            created_time: '2024-01-01T00:00:00+00:00',
            link: 'https://vimeo.com/123456'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.thumbnailUrl).toBe('https://example.com/1920.jpg');
      });

      it('should handle view count as string', async () => {
        // Arrange
        const videoId = '123456';
        const mockResponse = {
          data: {
            name: 'Test Video',
            description: 'Test',
            pictures: {
              sizes: [{ width: 640, link: 'https://example.com/thumb.jpg' }]
            },
            user: { name: 'Test' },
            duration: 60,
            stats: { plays: 1234567 },
            created_time: '2024-01-01T00:00:00+00:00',
            link: 'https://vimeo.com/123456'
          }
        };

        axios.get.mockResolvedValue(mockResponse);

        // Act
        const result = await vimeoService.fetchVideoMetadata(videoId);

        // Assert
        expect(result.viewCount).toBe('1234567');
        expect(typeof result.viewCount).toBe('string');
      });
    });
  });
});
