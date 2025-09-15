/**
 * Sanitizes and validates video IDs to prevent security issues
 */

// YouTube video ID pattern: alphanumeric, underscore, hyphen, 11 characters
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

// Vimeo video ID pattern: numeric, 1-11 digits
const VIMEO_VIDEO_ID_PATTERN = /^[0-9]{1,11}$/;

// Generic video ID pattern: alphanumeric, underscore, hyphen, 1-20 characters
const GENERIC_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{1,20}$/;

export interface SanitizedVideo {
  id: string;
  title: string;
  platform_video_id: string;
  platform_name: string;
  embedUrl?: string;
}

/**
 * Sanitizes a video ID for safe use in iframe src
 * @param videoId - The video ID to sanitize
 * @param platform - The platform name (YouTube, Vimeo, etc.)
 * @returns Sanitized video ID or null if invalid
 */
export function sanitizeVideoId(videoId: string, platform: string): string | null {
  if (!videoId || typeof videoId !== 'string') {
    return null;
  }

  // Remove any whitespace
  const trimmedId = videoId.trim();

  switch (platform.toLowerCase()) {
    case 'youtube':
      return YOUTUBE_VIDEO_ID_PATTERN.test(trimmedId) ? trimmedId : null;
    
    case 'vimeo':
      return VIMEO_VIDEO_ID_PATTERN.test(trimmedId) ? trimmedId : null;
    
    default:
      return GENERIC_VIDEO_ID_PATTERN.test(trimmedId) ? trimmedId : null;
  }
}

/**
 * Generates a safe embed URL for a video
 * @param video - The video object
 * @returns Safe embed URL or null if invalid
 */
export function getSecureEmbedUrl(video: SanitizedVideo): string | null {
  const sanitizedId = sanitizeVideoId(video.platform_video_id, video.platform_name);
  
  if (!sanitizedId) {
    console.error(`Invalid video ID for ${video.platform_name}: ${video.platform_video_id}`);
    return null;
  }

  switch (video.platform_name.toLowerCase()) {
    case 'youtube':
      // Use youtube-nocookie.com for enhanced privacy mode
      return `https://www.youtube-nocookie.com/embed/${sanitizedId}?modestbranding=1&rel=0&showinfo=0`;
    
    case 'vimeo':
      return `https://player.vimeo.com/video/${sanitizedId}?title=0&byline=0&portrait=0`;
    
    default:
      // For other platforms, return null and handle with custom player
      return null;
  }
}

/**
 * Validates and sanitizes a video object
 * @param video - The video object to sanitize
 * @returns Sanitized video object with secure embed URL
 */
export function sanitizeVideo(video: any): SanitizedVideo | null {
  if (!video || typeof video !== 'object') {
    return null;
  }

  // Validate required fields
  if (!video.id || !video.title || !video.platform_video_id || !video.platform_name) {
    console.error('Invalid video object: missing required fields');
    return null;
  }

  // Sanitize title (remove any HTML/script tags)
  const sanitizedTitle = video.title
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  const sanitizedVideo: SanitizedVideo = {
    id: String(video.id),
    title: sanitizedTitle,
    platform_video_id: String(video.platform_video_id),
    platform_name: String(video.platform_name),
  };

  // Generate secure embed URL
  const embedUrl = getSecureEmbedUrl(sanitizedVideo);
  if (embedUrl) {
    sanitizedVideo.embedUrl = embedUrl;
  }

  return sanitizedVideo;
}

/**
 * Checks if a URL is from a trusted video platform
 * @param url - The URL to check
 * @returns True if the URL is from a trusted platform
 */
export function isTrustedVideoUrl(url: string): boolean {
  const trustedDomains = [
    'youtube.com',
    'youtube-nocookie.com',
    'youtu.be',
    'vimeo.com',
    'player.vimeo.com',
  ];

  try {
    const urlObj = new URL(url);
    return trustedDomains.some(domain => 
      urlObj.hostname === domain || 
      urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}