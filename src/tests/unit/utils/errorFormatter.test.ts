/**
 * T054: Error Message Formatter Unit Tests (Phase 5: Error Handling)
 *
 * Tests the error formatting utility that converts technical errors
 * into user-friendly, actionable error messages.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

import { formatErrorMessage, ErrorType } from '../../../utils/errorFormatter';

describe('formatErrorMessage', () => {
  describe('Invalid URL Errors', () => {
    it('should format invalid URL error with user-friendly message', () => {
      // Arrange
      const error = new Error('Invalid URL format');

      // Act
      const result = formatErrorMessage(error, ErrorType.INVALID_URL);

      // Assert
      expect(result).toEqual({
        title: 'Invalid Video URL',
        message: 'Please enter a valid video URL from YouTube, Vimeo, or Dailymotion.',
        actionable: 'Double-check the URL and try again.',
        type: ErrorType.INVALID_URL
      });
    });

    it('should format unsupported platform error', () => {
      // Arrange
      const error = new Error('Unsupported platform');

      // Act
      const result = formatErrorMessage(error, ErrorType.UNSUPPORTED_PLATFORM);

      // Assert
      expect(result).toEqual({
        title: 'Unsupported Platform',
        message: 'We currently support YouTube, Vimeo, and Dailymotion videos only.',
        actionable: 'Please use a URL from one of these platforms.',
        type: ErrorType.UNSUPPORTED_PLATFORM
      });
    });

    it('should format malformed URL error', () => {
      // Arrange
      const error = new Error('Could not extract video ID');

      // Act
      const result = formatErrorMessage(error, ErrorType.MALFORMED_URL);

      // Assert
      expect(result).toEqual({
        title: 'Unable to Extract Video',
        message: 'The URL format is not recognized.',
        actionable: 'Make sure you copied the complete URL from the video page.',
        type: ErrorType.MALFORMED_URL
      });
    });
  });

  describe('Private Video Errors', () => {
    it('should format private video error', () => {
      // Arrange
      const error = new Error('Video is private or restricted');

      // Act
      const result = formatErrorMessage(error, ErrorType.PRIVATE_VIDEO);

      // Assert
      expect(result).toEqual({
        title: 'Video is Private',
        message: 'This video is private or restricted and cannot be added to your library.',
        actionable: 'Try a different video or check with the video owner for access.',
        type: ErrorType.PRIVATE_VIDEO
      });
    });

    it('should format access restricted error', () => {
      // Arrange
      const error = new Error('Access denied: Video requires authentication');

      // Act
      const result = formatErrorMessage(error, ErrorType.ACCESS_RESTRICTED);

      // Assert
      expect(result).toEqual({
        title: 'Access Restricted',
        message: 'This video requires authentication or special permissions.',
        actionable: 'Only publicly accessible videos can be added.',
        type: ErrorType.ACCESS_RESTRICTED
      });
    });
  });

  describe('Video Not Found Errors', () => {
    it('should format video not found error', () => {
      // Arrange
      const error = new Error('Video not found');

      // Act
      const result = formatErrorMessage(error, ErrorType.VIDEO_NOT_FOUND);

      // Assert
      expect(result).toEqual({
        title: 'Video Not Found',
        message: 'The video could not be found. It may have been deleted or removed.',
        actionable: 'Verify the URL is correct and the video still exists.',
        type: ErrorType.VIDEO_NOT_FOUND
      });
    });

    it('should format deleted video error', () => {
      // Arrange
      const error = new Error('Video has been deleted');

      // Act
      const result = formatErrorMessage(error, ErrorType.VIDEO_DELETED);

      // Assert
      expect(result).toEqual({
        title: 'Video Deleted',
        message: 'This video has been removed by the owner or platform.',
        actionable: 'Try a different video.',
        type: ErrorType.VIDEO_DELETED
      });
    });
  });

  describe('API Errors', () => {
    it('should format API quota exceeded error', () => {
      // Arrange
      const error = new Error('YouTube API quota exceeded');

      // Act
      const result = formatErrorMessage(error, ErrorType.API_QUOTA_EXCEEDED);

      // Assert
      expect(result).toEqual({
        title: 'Service Temporarily Unavailable',
        message: 'Our video service has reached its daily limit.',
        actionable: 'Please try again in a few hours or tomorrow.',
        type: ErrorType.API_QUOTA_EXCEEDED
      });
    });

    it('should format API authentication error', () => {
      // Arrange
      const error = new Error('Invalid API key');

      // Act
      const result = formatErrorMessage(error, ErrorType.API_AUTH_ERROR);

      // Assert
      expect(result).toEqual({
        title: 'Service Configuration Error',
        message: 'There is a problem with our video service configuration.',
        actionable: 'Please contact support if this issue persists.',
        type: ErrorType.API_AUTH_ERROR
      });
    });

    it('should format API rate limit error', () => {
      // Arrange
      const error = new Error('Rate limit exceeded');

      // Act
      const result = formatErrorMessage(error, ErrorType.API_RATE_LIMIT);

      // Assert
      expect(result).toEqual({
        title: 'Too Many Requests',
        message: 'You have made too many requests in a short time.',
        actionable: 'Please wait a moment and try again.',
        type: ErrorType.API_RATE_LIMIT
      });
    });
  });

  describe('Network Errors', () => {
    it('should format network timeout error', () => {
      // Arrange
      const error = new Error('Request timeout');

      // Act
      const result = formatErrorMessage(error, ErrorType.TIMEOUT);

      // Assert
      expect(result).toEqual({
        title: 'Request Timed Out',
        message: 'The video service is taking too long to respond.',
        actionable: 'Check your internet connection and try again.',
        type: ErrorType.TIMEOUT
      });
    });

    it('should format network connection error', () => {
      // Arrange
      const error = new Error('Network error');

      // Act
      const result = formatErrorMessage(error, ErrorType.NETWORK_ERROR);

      // Assert
      expect(result).toEqual({
        title: 'Connection Error',
        message: 'Unable to connect to the video service.',
        actionable: 'Check your internet connection and try again.',
        type: ErrorType.NETWORK_ERROR
      });
    });

    it('should format DNS resolution error', () => {
      // Arrange
      const error = new Error('ENOTFOUND');

      // Act
      const result = formatErrorMessage(error, ErrorType.DNS_ERROR);

      // Assert
      expect(result).toEqual({
        title: 'Connection Error',
        message: 'Unable to reach the video platform.',
        actionable: 'Check your internet connection or try again later.',
        type: ErrorType.DNS_ERROR
      });
    });
  });

  describe('Duplicate Video Errors', () => {
    it('should format duplicate video error', () => {
      // Arrange
      const error = new Error('Video already exists');

      // Act
      const result = formatErrorMessage(error, ErrorType.DUPLICATE_VIDEO);

      // Assert
      expect(result).toEqual({
        title: 'Video Already Added',
        message: 'This video is already in your library.',
        actionable: 'Check your library or add a different video.',
        type: ErrorType.DUPLICATE_VIDEO
      });
    });

    it('should format duplicate URL error', () => {
      // Arrange
      const error = new Error('Video with this URL already exists');

      // Act
      const result = formatErrorMessage(error, ErrorType.DUPLICATE_URL);

      // Assert
      expect(result).toEqual({
        title: 'Duplicate Video',
        message: 'You have already added this video to your library.',
        actionable: 'View it in your library or add a different video.',
        type: ErrorType.DUPLICATE_URL
      });
    });
  });

  describe('Server Errors', () => {
    it('should format internal server error', () => {
      // Arrange
      const error = new Error('Internal server error');

      // Act
      const result = formatErrorMessage(error, ErrorType.SERVER_ERROR);

      // Assert
      expect(result).toEqual({
        title: 'Server Error',
        message: 'An unexpected error occurred on our server.',
        actionable: 'Please try again later or contact support if the issue persists.',
        type: ErrorType.SERVER_ERROR
      });
    });

    it('should format database error', () => {
      // Arrange
      const error = new Error('Database connection failed');

      // Act
      const result = formatErrorMessage(error, ErrorType.DATABASE_ERROR);

      // Assert
      expect(result).toEqual({
        title: 'Service Error',
        message: 'We are experiencing technical difficulties.',
        actionable: 'Please try again in a few moments.',
        type: ErrorType.DATABASE_ERROR
      });
    });
  });

  describe('Generic Errors', () => {
    it('should format unknown error with generic message', () => {
      // Arrange
      const error = new Error('Something unexpected happened');

      // Act
      const result = formatErrorMessage(error, ErrorType.UNKNOWN);

      // Assert
      expect(result).toEqual({
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        actionable: 'Please try again or contact support if the problem continues.',
        type: ErrorType.UNKNOWN
      });
    });

    it('should handle error without message', () => {
      // Arrange
      const error = new Error();

      // Act
      const result = formatErrorMessage(error, ErrorType.UNKNOWN);

      // Assert
      expect(result).toEqual({
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        actionable: 'Please try again or contact support if the problem continues.',
        type: ErrorType.UNKNOWN
      });
    });

    it('should handle null error', () => {
      // Arrange
      const error = null as any;

      // Act
      const result = formatErrorMessage(error, ErrorType.UNKNOWN);

      // Assert
      expect(result).toEqual({
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        actionable: 'Please try again or contact support if the problem continues.',
        type: ErrorType.UNKNOWN
      });
    });
  });

  describe('Auto-detection from Error Message', () => {
    it('should auto-detect private video from error message', () => {
      // Arrange
      const error = new Error('This video is private');

      // Act
      const result = formatErrorMessage(error);

      // Assert
      expect(result.type).toBe(ErrorType.PRIVATE_VIDEO);
      expect(result.title).toBe('Video is Private');
    });

    it('should auto-detect quota exceeded from error message', () => {
      // Arrange
      const error = new Error('API quota exceeded');

      // Act
      const result = formatErrorMessage(error);

      // Assert
      expect(result.type).toBe(ErrorType.API_QUOTA_EXCEEDED);
      expect(result.title).toBe('Service Temporarily Unavailable');
    });

    it('should auto-detect timeout from error message', () => {
      // Arrange
      const error = new Error('ETIMEDOUT');

      // Act
      const result = formatErrorMessage(error);

      // Assert
      expect(result.type).toBe(ErrorType.TIMEOUT);
      expect(result.title).toBe('Request Timed Out');
    });

    it('should auto-detect network error from error code', () => {
      // Arrange
      const error: any = new Error('Network request failed');
      error.code = 'ERR_NETWORK';

      // Act
      const result = formatErrorMessage(error);

      // Assert
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.title).toBe('Connection Error');
    });
  });

  describe('Platform-Specific Errors', () => {
    it('should format YouTube-specific quota error', () => {
      // Arrange
      const error = new Error('YouTube API quota exceeded');

      // Act
      const result = formatErrorMessage(error, ErrorType.API_QUOTA_EXCEEDED, 'youtube');

      // Assert
      expect(result.message).toContain('video service');
      expect(result.actionable).toContain('try again');
    });

    it('should format Vimeo-specific access error', () => {
      // Arrange
      const error = new Error('Vimeo API rate limit exceeded');

      // Act
      const result = formatErrorMessage(error, ErrorType.API_RATE_LIMIT, 'vimeo');

      // Assert
      expect(result.title).toBe('Too Many Requests');
      expect(result.message).toContain('too many requests');
    });

    it('should format Dailymotion-specific error', () => {
      // Arrange
      const error = new Error('Dailymotion video not found');

      // Act
      const result = formatErrorMessage(error, ErrorType.VIDEO_NOT_FOUND, 'dailymotion');

      // Assert
      expect(result.title).toBe('Video Not Found');
      expect(result.message).toContain('could not be found');
    });
  });
});
