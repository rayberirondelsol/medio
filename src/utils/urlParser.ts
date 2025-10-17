/**
 * Video URL Parser Utility
 *
 * Extracts video IDs from various platform URL formats.
 *
 * Supported platforms:
 * - YouTube (youtube.com, youtu.be)
 * - Vimeo (vimeo.com, player.vimeo.com)
 * - Dailymotion (dailymotion.com, dai.ly)
 */

import { detectPlatform } from './platformDetector';

/**
 * Result of parsing a video URL
 */
export interface ParsedVideoUrl {
  platform: string | null;
  videoId: string | null;
  isValid: boolean;
  error?: string;
}

/**
 * Extracts the YouTube video ID from a YouTube URL
 *
 * @param url - The YouTube URL to parse
 * @returns The video ID if found, null otherwise
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  // Validate input
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    // Normalize the URL by ensuring it has a protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Parse the URL
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a YouTube domain
    const youtubeHosts = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be'
    ];

    if (!youtubeHosts.includes(hostname)) {
      return null;
    }

    // Extract video ID based on URL format
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      // Format: https://youtu.be/VIDEO_ID
      // The video ID is the first segment of the pathname
      const pathname = urlObj.pathname;
      const match = pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    } else if (urlObj.pathname === '/watch') {
      // Format: https://www.youtube.com/watch?v=VIDEO_ID
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.pathname.startsWith('/embed/')) {
      // Format: https://www.youtube.com/embed/VIDEO_ID
      const match = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    } else if (urlObj.pathname.startsWith('/v/')) {
      // Format: https://www.youtube.com/v/VIDEO_ID
      const match = urlObj.pathname.match(/^\/v\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    } else if (urlObj.pathname.startsWith('/shorts/')) {
      // Format: https://www.youtube.com/shorts/VIDEO_ID
      const match = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    }

    // Validate video ID format (YouTube video IDs are 11 characters)
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }

    return null;
  } catch (error) {
    // Invalid URL or parsing error
    return null;
  }
}

/**
 * Extracts the Vimeo video ID from a Vimeo URL
 *
 * Supported formats:
 * - https://vimeo.com/VIDEO_ID
 * - https://www.vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 * - https://vimeo.com/channels/channelname/VIDEO_ID
 * - https://vimeo.com/groups/groupname/videos/VIDEO_ID
 *
 * @param url - The Vimeo URL to parse
 * @returns The video ID if found, null otherwise
 */
export function extractVimeoVideoId(url: string | null | undefined): string | null {
  // Validate input
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    // Normalize the URL by ensuring it has a protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Parse the URL
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a Vimeo domain
    const vimeoHosts = [
      'vimeo.com',
      'www.vimeo.com',
      'player.vimeo.com'
    ];

    if (!vimeoHosts.includes(hostname)) {
      return null;
    }

    // Extract video ID based on URL format
    let videoId: string | null = null;

    if (hostname === 'player.vimeo.com') {
      // Format: https://player.vimeo.com/video/VIDEO_ID
      const match = urlObj.pathname.match(/^\/video\/(\d+)/);
      if (match) {
        videoId = match[1];
      }
    } else {
      // Format: https://vimeo.com/VIDEO_ID
      // Format: https://vimeo.com/channels/channelname/VIDEO_ID
      // Format: https://vimeo.com/groups/groupname/videos/VIDEO_ID
      // Format: https://vimeo.com/album/1234567/video/123456789
      const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);

      // For album URLs, look for a segment after 'video'
      const videoIndex = pathSegments.indexOf('video');
      if (videoIndex !== -1 && videoIndex < pathSegments.length - 1) {
        const candidateId = pathSegments[videoIndex + 1];
        if (/^\d+$/.test(candidateId)) {
          videoId = candidateId;
        }
      } else {
        // Find the first segment that is purely numeric
        for (const segment of pathSegments) {
          if (/^\d+$/.test(segment)) {
            videoId = segment;
            break;
          }
        }
      }
    }

    // Validate video ID format (Vimeo IDs are numeric)
    if (videoId && /^\d+$/.test(videoId)) {
      return videoId;
    }

    return null;
  } catch (error) {
    // Invalid URL or parsing error
    return null;
  }
}

/**
 * Extracts the Dailymotion video ID from a Dailymotion URL
 *
 * Supported formats:
 * - https://www.dailymotion.com/video/VIDEO_ID
 * - https://dailymotion.com/video/VIDEO_ID
 * - https://dai.ly/VIDEO_ID
 * - https://www.dailymotion.com/embed/video/VIDEO_ID
 *
 * @param url - The Dailymotion URL to parse
 * @returns The video ID if found, null otherwise
 */
export function extractDailymotionVideoId(url: string | null | undefined): string | null {
  // Validate input
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    // Normalize the URL by ensuring it has a protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Parse the URL
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's a Dailymotion domain
    const dailymotionHosts = [
      'dailymotion.com',
      'www.dailymotion.com',
      'dai.ly'
    ];

    if (!dailymotionHosts.includes(hostname)) {
      return null;
    }

    // Extract video ID based on URL format
    let videoId: string | null = null;

    if (hostname === 'dai.ly') {
      // Format: https://dai.ly/VIDEO_ID
      // The video ID is the first segment of the pathname
      const match = urlObj.pathname.match(/^\/([a-z0-9]+)/i);
      if (match) {
        videoId = match[1];
      }
    } else {
      // Format: https://www.dailymotion.com/video/VIDEO_ID
      // Format: https://www.dailymotion.com/embed/video/VIDEO_ID
      if (urlObj.pathname.includes('/video/')) {
        const match = urlObj.pathname.match(/\/video\/([a-z0-9]+)/i);
        if (match) {
          videoId = match[1];
        }
      } else if (urlObj.pathname.includes('/embed/video/')) {
        const match = urlObj.pathname.match(/\/embed\/video\/([a-z0-9]+)/i);
        if (match) {
          videoId = match[1];
        }
      }
    }

    // Validate video ID format (Dailymotion IDs are alphanumeric, typically starting with 'x')
    if (videoId && /^[a-z0-9]+$/i.test(videoId)) {
      return videoId;
    }

    return null;
  } catch (error) {
    // Invalid URL or parsing error
    return null;
  }
}

/**
 * Unified URL parser that detects platform and extracts video ID
 *
 * @param url - The video URL to parse
 * @returns Parsed result with platform, videoId, and validity
 */
export function parseVideoUrl(url: string | null | undefined): ParsedVideoUrl {
  // Validate input
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      platform: null,
      videoId: null,
      isValid: false,
      error: 'URL is required'
    };
  }

  // First validate URL format and ensure it has proper structure
  try {
    const testUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(testUrl);

    // Check if URL has a proper domain structure (contains at least one dot)
    if (!urlObj.hostname.includes('.')) {
      return {
        platform: null,
        videoId: null,
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  } catch {
    return {
      platform: null,
      videoId: null,
      isValid: false,
      error: 'Invalid URL format'
    };
  }

  // Detect platform
  const platform = detectPlatform(url);

  if (!platform) {
    return {
      platform: null,
      videoId: null,
      isValid: false,
      error: 'Unsupported platform'
    };
  }

  // Extract video ID based on platform
  let videoId: string | null = null;

  if (platform === 'youtube') {
    videoId = extractYouTubeVideoId(url);
  } else if (platform === 'vimeo') {
    videoId = extractVimeoVideoId(url);
  } else if (platform === 'dailymotion') {
    videoId = extractDailymotionVideoId(url);
  }

  if (!videoId) {
    return {
      platform,
      videoId: null,
      isValid: false,
      error: 'Could not extract video ID'
    };
  }

  return {
    platform,
    videoId,
    isValid: true
  };
}

// Re-export detectPlatform for convenience
export { detectPlatform };
