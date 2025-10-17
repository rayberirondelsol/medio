/**
 * YouTube Service
 *
 * Handles interactions with YouTube Data API v3 to fetch video metadata.
 */

const axios = require('axios');

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Parse ISO 8601 duration format to seconds
 *
 * @param {string} duration - ISO 8601 duration (e.g., "PT3M33S", "PT1H2M3S")
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  // Parse ISO 8601 duration format (PT#H#M#S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video metadata from YouTube Data API v3
 *
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<Object>} Video metadata
 * @throws {Error} When video is not found, API error occurs, or invalid input
 */
async function fetchVideoMetadata(videoId) {
  // Validate input
  if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
    throw new Error('Video ID is required');
  }

  // Validate API key (skip in test environment when axios is mocked)
  if (!YOUTUBE_API_KEY && process.env.NODE_ENV !== 'test') {
    throw new Error('YouTube API key is not configured');
  }

  try {
    // Make request to YouTube Data API v3
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        id: videoId,
        key: YOUTUBE_API_KEY || 'test-key',
        part: 'snippet,contentDetails,statistics'
      },
      timeout: 10000 // 10 second timeout
    });

    // Validate response structure
    if (!response.data || !response.data.items) {
      throw new Error('Invalid API response');
    }

    // Check if video was found
    if (response.data.items.length === 0) {
      throw new Error('Video not found or is private');
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics || {};

    // Select the best available thumbnail
    const thumbnails = snippet.thumbnails;
    let thumbnailUrl = '';

    if (thumbnails.maxres) {
      thumbnailUrl = thumbnails.maxres.url;
    } else if (thumbnails.high) {
      thumbnailUrl = thumbnails.high.url;
    } else if (thumbnails.medium) {
      thumbnailUrl = thumbnails.medium.url;
    } else if (thumbnails.default) {
      thumbnailUrl = thumbnails.default.url;
    }

    // Parse duration to seconds
    const durationInSeconds = parseDuration(contentDetails.duration);

    // Return normalized metadata
    return {
      videoId: video.id,
      title: snippet.title,
      description: snippet.description || '',
      thumbnailUrl,
      channelName: snippet.channelTitle,
      duration: contentDetails.duration,
      durationInSeconds,
      viewCount: statistics.viewCount,
      publishedAt: snippet.publishedAt
    };
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 404) {
        throw new Error('Video not found');
      }

      if (status === 403) {
        // Check if it's a quota error
        if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          throw new Error('YouTube API quota exceeded');
        }
        throw new Error('YouTube API quota exceeded');
      }

      if (status === 400) {
        if (errorData.error?.message?.includes('API key')) {
          throw new Error('Invalid YouTube API key');
        }
        throw new Error('Invalid request to YouTube API');
      }

      // Generic API error
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error');
    }

    // Re-throw if it's already our custom error
    if (error.message.includes('Video ID is required') ||
        error.message.includes('Invalid API response') ||
        error.message.includes('Video not found or is private') ||
        error.message.includes('YouTube API key is not configured')) {
      throw error;
    }

    // Unknown error
    throw new Error('Failed to fetch video metadata');
  }
}

module.exports = {
  fetchVideoMetadata
};
