/**
 * URL Validator Utility
 *
 * Provides validation functions for video streaming platform URLs
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Task: T009
 */

/**
 * Validate if a URL is a valid video URL from supported platforms
 *
 * Supported platforms:
 * - YouTube: youtube.com, youtu.be
 * - Vimeo: vimeo.com
 * - Dailymotion: dailymotion.com, dai.ly
 *
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and from a supported platform
 */
const isValidVideoUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    // Parse the URL using the built-in URL class
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // YouTube patterns
    const youtubeHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
    if (youtubeHosts.includes(hostname)) {
      // For youtu.be, path should contain video ID
      if (hostname === 'youtu.be') {
        return parsedUrl.pathname.length > 1;
      }
      // For youtube.com, check for valid video URL patterns
      if (hostname.includes('youtube.com')) {
        return parsedUrl.pathname.includes('/watch') ||
               parsedUrl.pathname.includes('/embed/') ||
               parsedUrl.pathname.includes('/v/') ||
               parsedUrl.pathname.startsWith('/shorts/');
      }
    }

    // Vimeo patterns
    const vimeoHosts = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];
    if (vimeoHosts.includes(hostname)) {
      // Vimeo URLs should have a numeric video ID in the path
      const pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
      return pathParts.length > 0 && /^\d+$/.test(pathParts[pathParts.length - 1]);
    }

    // Dailymotion patterns
    const dailymotionHosts = ['dailymotion.com', 'www.dailymotion.com', 'dai.ly'];
    if (dailymotionHosts.includes(hostname)) {
      // dai.ly short URLs
      if (hostname === 'dai.ly') {
        return parsedUrl.pathname.length > 1;
      }
      // dailymotion.com URLs
      if (hostname.includes('dailymotion.com')) {
        return parsedUrl.pathname.includes('/video/') ||
               parsedUrl.pathname.includes('/embed/video/');
      }
    }

    // URL doesn't match any supported platform
    return false;

  } catch (error) {
    // Invalid URL format
    return false;
  }
};

module.exports = {
  isValidVideoUrl
};
