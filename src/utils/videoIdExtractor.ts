/**
 * Simple video ID extractor for YouTube, Vimeo, and Dailymotion URLs
 */

/**
 * Extract video ID from a YouTube URL
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Remove leading /
    }

    // youtube.com/embed/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/')[2];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from a Vimeo URL
 * Supports formats:
 * - https://vimeo.com/VIDEO_ID
 * - https://player.vimeo.com/video/VIDEO_ID
 */
function extractVimeoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // vimeo.com/VIDEO_ID
    if (urlObj.hostname === 'vimeo.com') {
      const segments = urlObj.pathname.split('/').filter(s => s);
      return segments[0] || null;
    }

    // player.vimeo.com/video/VIDEO_ID
    if (urlObj.hostname === 'player.vimeo.com' && urlObj.pathname.startsWith('/video/')) {
      return urlObj.pathname.split('/')[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from a Dailymotion URL
 * Supports formats:
 * - https://www.dailymotion.com/video/VIDEO_ID
 * - https://dai.ly/VIDEO_ID
 */
function extractDailymotionId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // dailymotion.com/video/VIDEO_ID
    if (urlObj.hostname.includes('dailymotion.com') && urlObj.pathname.startsWith('/video/')) {
      return urlObj.pathname.split('/')[2] || null;
    }

    // dai.ly/VIDEO_ID
    if (urlObj.hostname === 'dai.ly') {
      return urlObj.pathname.slice(1) || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from a URL based on platform
 * @param url - The video URL
 * @param platformName - Platform name ('YouTube', 'Vimeo', 'Dailymotion')
 * @returns Video ID or null if extraction failed
 */
export function extractVideoId(url: string, platformName: string): string | null {
  const platform = platformName.toLowerCase();

  if (platform === 'youtube') {
    return extractYouTubeId(url);
  }

  if (platform === 'vimeo') {
    return extractVimeoId(url);
  }

  if (platform === 'dailymotion') {
    return extractDailymotionId(url);
  }

  // If platform is not recognized, try to extract anyway
  // This provides a fallback
  return extractYouTubeId(url) || extractVimeoId(url) || extractDailymotionId(url);
}
