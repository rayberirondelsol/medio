/**
 * T015: Platform Detector Unit Tests
 *
 * Tests the platform detection utility that identifies video platforms
 * from various URL formats.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

import { detectPlatform } from '../../../utils/platformDetector';

describe('detectPlatform', () => {
  describe('YouTube URLs', () => {
    it('should detect youtube platform from standard youtube.com/watch URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from youtube.com/watch URL without www', () => {
      // Arrange
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from youtu.be short URL', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from youtube.com/embed URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from youtube.com/v/ URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from HTTP URLs', () => {
      // Arrange
      const url = 'http://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform with mixed case domain', () => {
      // Arrange
      const url = 'https://www.YouTube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect youtube platform from m.youtube.com (mobile)', () => {
      // Arrange
      const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });
  });

  describe('Non-YouTube URLs', () => {
    it('should return null for Vimeo URLs', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for generic video URLs', () => {
      // Arrange
      const url = 'https://example.com/video.mp4';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-video URLs', () => {
      // Arrange
      const url = 'https://www.google.com';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      // Arrange
      const url = '';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      // Arrange
      const url = null as any;

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Arrange
      const url = undefined as any;

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      // Arrange
      const url = 123 as any;

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for malformed URLs', () => {
      // Arrange
      const url = 'not-a-valid-url';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with query parameters', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=42';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should handle URLs with fragment identifiers', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=42s';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should handle URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ/';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should not detect youtube from URLs containing youtube in path', () => {
      // Arrange
      const url = 'https://example.com/youtube/video';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Future Platform Support', () => {
    // These tests are placeholders for future platform support
    // Currently they should return null, but can be updated when platforms are added

    it('should return null for Vimeo (not yet supported)', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for Twitch (not yet supported)', () => {
      // Arrange
      const url = 'https://www.twitch.tv/videos/123456789';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for Dailymotion (not yet supported)', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x123456';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });
  });
});
