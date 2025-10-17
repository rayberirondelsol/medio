/**
 * T014: YouTube URL Parser Unit Tests
 * T032-T035: Extended URL Parser Tests for Multiple Platforms
 *
 * Tests the URL parsing utilities that extract video IDs
 * from various video platform URL formats.
 *
 * TDD RED Phase: These tests will FAIL until implementation is created.
 */

import {
  extractYouTubeVideoId,
  extractVimeoVideoId,
  extractDailymotionVideoId,
  detectPlatform,
  parseVideoUrl
} from '../../../utils/urlParser';

describe('extractYouTubeVideoId', () => {
  describe('Valid YouTube URLs', () => {
    it('should extract video ID from standard youtube.com/watch URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/watch URL without www', () => {
      // Arrange
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/watch URL with http', () => {
      // Arrange
      const url = 'http://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/watch URL with additional query parameters', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=42';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be short URL', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtu.be URL with query parameters', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ?t=42';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/embed URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/embed URL with parameters', () => {
      // Arrange
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=10';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from youtube.com/v/ URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should handle video IDs with different lengths (11 characters)', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=abc123XYZ-_';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('abc123XYZ-_');
    });
  });

  describe('Invalid URLs', () => {
    it('should return null for non-YouTube URLs', () => {
      // Arrange
      const url = 'https://www.vimeo.com/123456789';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for malformed YouTube URLs', () => {
      // Arrange
      const url = 'https://www.youtube.com/notavideopage';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for YouTube URLs without video ID', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      // Arrange
      const url = '';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      // Arrange
      const url = null as any;

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Arrange
      const url = undefined as any;

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      // Arrange
      const url = 123 as any;

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with mixed case', () => {
      // Arrange
      const url = 'https://www.YouTube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ/';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with fragment identifiers', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=42s';

      // Act
      const result = extractYouTubeVideoId(url);

      // Assert
      expect(result).toBe('dQw4w9WgXcQ');
    });
  });
});

// T033: Vimeo URL Parser Tests
describe('extractVimeoVideoId', () => {
  describe('Valid Vimeo URLs', () => {
    it('should extract video ID from standard vimeo.com URL', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });

    it('should extract video ID from vimeo.com URL without www', () => {
      // Arrange
      const url = 'https://vimeo.com/987654321';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('987654321');
    });

    it('should extract video ID from vimeo.com URL with http', () => {
      // Arrange
      const url = 'http://vimeo.com/555666777';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('555666777');
    });

    it('should extract video ID from player.vimeo.com embed URL', () => {
      // Arrange
      const url = 'https://player.vimeo.com/video/123456789';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });

    it('should extract video ID from player.vimeo.com URL with query parameters', () => {
      // Arrange
      const url = 'https://player.vimeo.com/video/123456789?h=abc123def&title=0';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });

    it('should handle Vimeo URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789/';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });

    it('should handle Vimeo channels/groups URLs', () => {
      // Arrange
      const url = 'https://vimeo.com/channels/staffpicks/123456789';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });

    it('should handle Vimeo album URLs', () => {
      // Arrange
      const url = 'https://vimeo.com/album/1234567/video/123456789';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBe('123456789');
    });
  });

  describe('Invalid Vimeo URLs', () => {
    it('should return null for non-Vimeo URLs', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for malformed Vimeo URLs', () => {
      // Arrange
      const url = 'https://vimeo.com/about';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      // Arrange
      const url = '';

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      // Arrange
      const url = null as any;

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Arrange
      const url = undefined as any;

      // Act
      const result = extractVimeoVideoId(url);

      // Assert
      expect(result).toBeNull();
    });
  });
});

// T034: Dailymotion URL Parser Tests
describe('extractDailymotionVideoId', () => {
  describe('Valid Dailymotion URLs', () => {
    it('should extract video ID from standard dailymotion.com/video URL', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x8abcd1';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8abcd1');
    });

    it('should extract video ID from dailymotion.com URL without www', () => {
      // Arrange
      const url = 'https://dailymotion.com/video/x8efgh2';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8efgh2');
    });

    it('should extract video ID from dai.ly short URL', () => {
      // Arrange
      const url = 'https://dai.ly/x8ijkl3';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8ijkl3');
    });

    it('should extract video ID from dai.ly URL without www', () => {
      // Arrange
      const url = 'https://dai.ly/x8mnop4';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8mnop4');
    });

    it('should extract video ID from dailymotion.com URL with query parameters', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x8qrst5?playlist=x9uvwx';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8qrst5');
    });

    it('should extract video ID from embed URL', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/embed/video/x8abcd1';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8abcd1');
    });

    it('should handle Dailymotion URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x8abcd1/';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8abcd1');
    });

    it('should handle dai.ly URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://dai.ly/x8abcd1/';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8abcd1');
    });

    it('should handle HTTP URLs', () => {
      // Arrange
      const url = 'http://www.dailymotion.com/video/x8abcd1';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBe('x8abcd1');
    });
  });

  describe('Invalid Dailymotion URLs', () => {
    it('should return null for non-Dailymotion URLs', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for malformed Dailymotion URLs', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/about';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      // Arrange
      const url = '';

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      // Arrange
      const url = null as any;

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Arrange
      const url = undefined as any;

      // Act
      const result = extractDailymotionVideoId(url);

      // Assert
      expect(result).toBeNull();
    });
  });
});

// T035: Platform Detection Tests
describe('detectPlatform', () => {
  describe('Platform Detection', () => {
    it('should detect YouTube platform from youtube.com URL', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect YouTube platform from youtu.be URL', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('youtube');
    });

    it('should detect Vimeo platform from vimeo.com URL', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('vimeo');
    });

    it('should detect Vimeo platform from player.vimeo.com URL', () => {
      // Arrange
      const url = 'https://player.vimeo.com/video/123456789';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('vimeo');
    });

    it('should detect Dailymotion platform from dailymotion.com URL', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x8abcd1';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('dailymotion');
    });

    it('should detect Dailymotion platform from dai.ly URL', () => {
      // Arrange
      const url = 'https://dai.ly/x8abcd1';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBe('dailymotion');
    });

    it('should return null for unsupported platform', () => {
      // Arrange
      const url = 'https://www.example.com/video/123';

      // Act
      const result = detectPlatform(url);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for invalid URL', () => {
      // Arrange
      const url = 'not-a-valid-url';

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
  });
});

// T035: Unified URL Parser Tests
describe('parseVideoUrl', () => {
  describe('Successful Parsing', () => {
    it('should parse YouTube URL and return platform and videoId', () => {
      // Arrange
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        isValid: true
      });
    });

    it('should parse Vimeo URL and return platform and videoId', () => {
      // Arrange
      const url = 'https://vimeo.com/123456789';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'vimeo',
        videoId: '123456789',
        isValid: true
      });
    });

    it('should parse Dailymotion URL and return platform and videoId', () => {
      // Arrange
      const url = 'https://www.dailymotion.com/video/x8abcd1';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'dailymotion',
        videoId: 'x8abcd1',
        isValid: true
      });
    });

    it('should parse YouTube short URL', () => {
      // Arrange
      const url = 'https://youtu.be/dQw4w9WgXcQ';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        isValid: true
      });
    });

    it('should parse Dailymotion short URL', () => {
      // Arrange
      const url = 'https://dai.ly/x8abcd1';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'dailymotion',
        videoId: 'x8abcd1',
        isValid: true
      });
    });
  });

  describe('Invalid Parsing', () => {
    it('should return invalid result for unsupported platform', () => {
      // Arrange
      const url = 'https://www.example.com/video/123';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: null,
        videoId: null,
        isValid: false,
        error: 'Unsupported platform'
      });
    });

    it('should return invalid result for malformed URL', () => {
      // Arrange
      const url = 'not-a-valid-url';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: null,
        videoId: null,
        isValid: false,
        error: 'Invalid URL format'
      });
    });

    it('should return invalid result for URL without video ID', () => {
      // Arrange
      const url = 'https://www.youtube.com/';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: 'youtube',
        videoId: null,
        isValid: false,
        error: 'Could not extract video ID'
      });
    });

    it('should return invalid result for empty string', () => {
      // Arrange
      const url = '';

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: null,
        videoId: null,
        isValid: false,
        error: 'URL is required'
      });
    });

    it('should return invalid result for null input', () => {
      // Arrange
      const url = null as any;

      // Act
      const result = parseVideoUrl(url);

      // Assert
      expect(result).toEqual({
        platform: null,
        videoId: null,
        isValid: false,
        error: 'URL is required'
      });
    });
  });
});
