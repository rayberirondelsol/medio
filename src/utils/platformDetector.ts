/**
 * Platform Detector Utility
 *
 * Detects video platforms from URLs.
 *
 * Supported platforms:
 * - YouTube
 * - Vimeo
 * - Dailymotion
 *
 * Future support planned for:
 * - Twitch
 */

/**
 * Detects the video platform from a URL
 *
 * @param url - The URL to analyze
 * @returns The platform name (lowercase) if detected, null otherwise
 */
export function detectPlatform(url: string | null | undefined): string | null {
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

    // Check for YouTube
    const youtubeHosts = [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be'
    ];

    if (youtubeHosts.includes(hostname)) {
      return 'youtube';
    }

    // Check for Vimeo
    const vimeoHosts = [
      'vimeo.com',
      'www.vimeo.com',
      'player.vimeo.com'
    ];

    if (vimeoHosts.includes(hostname)) {
      return 'vimeo';
    }

    // Check for Dailymotion
    const dailymotionHosts = [
      'dailymotion.com',
      'www.dailymotion.com',
      'dai.ly'
    ];

    if (dailymotionHosts.includes(hostname)) {
      return 'dailymotion';
    }

    // Platform not supported
    return null;
  } catch (error) {
    // Invalid URL or parsing error
    return null;
  }
}
