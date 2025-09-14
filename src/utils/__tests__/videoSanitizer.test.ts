import { sanitizeVideoId, getSecureEmbedUrl, sanitizeVideo, isTrustedVideoUrl } from '../videoSanitizer';

describe('Video Sanitizer', () => {
  describe('sanitizeVideoId', () => {
    it('should validate YouTube video IDs', () => {
      expect(sanitizeVideoId('dQw4w9WgXcQ', 'YouTube')).toBe('dQw4w9WgXcQ');
      expect(sanitizeVideoId('_invalid_id', 'YouTube')).toBeNull();
      expect(sanitizeVideoId('12345678901234567890', 'YouTube')).toBeNull(); // Too long
      expect(sanitizeVideoId('abc', 'YouTube')).toBeNull(); // Too short
    });

    it('should validate Vimeo video IDs', () => {
      expect(sanitizeVideoId('123456789', 'Vimeo')).toBe('123456789');
      expect(sanitizeVideoId('abc123', 'Vimeo')).toBeNull(); // Contains letters
      expect(sanitizeVideoId('123456789012', 'Vimeo')).toBeNull(); // Too long
    });

    it('should handle whitespace', () => {
      expect(sanitizeVideoId('  dQw4w9WgXcQ  ', 'YouTube')).toBe('dQw4w9WgXcQ');
    });

    it('should reject invalid inputs', () => {
      expect(sanitizeVideoId('', 'YouTube')).toBeNull();
      expect(sanitizeVideoId(null as any, 'YouTube')).toBeNull();
      expect(sanitizeVideoId(undefined as any, 'YouTube')).toBeNull();
      expect(sanitizeVideoId({} as any, 'YouTube')).toBeNull();
    });

    it('should handle generic platform IDs', () => {
      expect(sanitizeVideoId('valid_id-123', 'CustomPlatform')).toBe('valid_id-123');
      expect(sanitizeVideoId('invalid@id!', 'CustomPlatform')).toBeNull();
    });
  });

  describe('getSecureEmbedUrl', () => {
    it('should generate secure YouTube embed URLs', () => {
      const video = {
        id: '1',
        title: 'Test Video',
        platform_video_id: 'dQw4w9WgXcQ',
        platform_name: 'YouTube'
      };
      
      const url = getSecureEmbedUrl(video);
      expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?modestbranding=1&rel=0&showinfo=0');
    });

    it('should generate secure Vimeo embed URLs', () => {
      const video = {
        id: '2',
        title: 'Test Video',
        platform_video_id: '123456789',
        platform_name: 'Vimeo'
      };
      
      const url = getSecureEmbedUrl(video);
      expect(url).toBe('https://player.vimeo.com/video/123456789?title=0&byline=0&portrait=0');
    });

    it('should return null for invalid video IDs', () => {
      const video = {
        id: '3',
        title: 'Test Video',
        platform_video_id: 'invalid@id',
        platform_name: 'YouTube'
      };
      
      expect(getSecureEmbedUrl(video)).toBeNull();
    });

    it('should return null for unsupported platforms', () => {
      const video = {
        id: '4',
        title: 'Test Video',
        platform_video_id: 'some_id',
        platform_name: 'UnknownPlatform'
      };
      
      expect(getSecureEmbedUrl(video)).toBeNull();
    });
  });

  describe('sanitizeVideo', () => {
    it('should sanitize valid video objects', () => {
      const video = {
        id: '1',
        title: 'Test <script>alert("xss")</script> Video',
        platform_video_id: 'dQw4w9WgXcQ',
        platform_name: 'YouTube'
      };
      
      const sanitized = sanitizeVideo(video);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.title).toBe('Test  Video');
      expect(sanitized!.embedUrl).toContain('youtube-nocookie.com');
    });

    it('should reject invalid video objects', () => {
      expect(sanitizeVideo(null)).toBeNull();
      expect(sanitizeVideo(undefined)).toBeNull();
      expect(sanitizeVideo({})).toBeNull();
      expect(sanitizeVideo({ id: '1' })).toBeNull(); // Missing required fields
    });

    it('should remove HTML and script tags from title', () => {
      const video = {
        id: '1',
        title: '<h1>Title</h1><script>alert("xss")</script><b>Bold</b>',
        platform_video_id: 'dQw4w9WgXcQ',
        platform_name: 'YouTube'
      };
      
      const sanitized = sanitizeVideo(video);
      expect(sanitized!.title).toBe('TitleBold');
    });
  });

  describe('isTrustedVideoUrl', () => {
    it('should validate trusted video URLs', () => {
      expect(isTrustedVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isTrustedVideoUrl('https://youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(true);
      expect(isTrustedVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isTrustedVideoUrl('https://vimeo.com/123456789')).toBe(true);
      expect(isTrustedVideoUrl('https://player.vimeo.com/video/123456789')).toBe(true);
    });

    it('should reject untrusted URLs', () => {
      expect(isTrustedVideoUrl('https://malicious.com/video')).toBe(false);
      expect(isTrustedVideoUrl('https://youtube.malicious.com/video')).toBe(false);
      expect(isTrustedVideoUrl('javascript:alert("xss")')).toBe(false);
      expect(isTrustedVideoUrl('not-a-url')).toBe(false);
    });

    it('should handle subdomains correctly', () => {
      expect(isTrustedVideoUrl('https://m.youtube.com/watch?v=test')).toBe(true);
      expect(isTrustedVideoUrl('https://www.player.vimeo.com/video/123')).toBe(true);
    });
  });
});