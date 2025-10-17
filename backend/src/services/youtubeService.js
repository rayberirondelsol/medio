/**
 * YouTube Service
 *
 * Handles interactions with YouTube Data API v3 to fetch video metadata.
 * T082: Enhanced with API quota monitoring and usage tracking
 */

const axios = require('axios');
const { captureException, withScope } = require('../utils/sentry');

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// T082: API quota monitoring counters
let apiCallCount = 0;
let quotaExceededCount = 0;
let lastQuotaExceeded = null;

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
    // T082: Track API call
    apiCallCount++;

    // T082: Log usage metrics every 100 calls
    if (apiCallCount % 100 === 0) {
      console.log(`[YouTube API] Usage stats - Total calls: ${apiCallCount}, Quota exceeded: ${quotaExceededCount}`);
    }

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
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('youtube_api', {
            videoId,
            status,
            error: 'Video not found'
          });
          captureException(error);
        });
        throw new Error('Video not found');
      }

      if (status === 403) {
        // Check if it's a quota error
        const isQuotaError = errorData.error?.errors?.[0]?.reason === 'quotaExceeded';

        // T082: Track quota exceeded events
        quotaExceededCount++;
        lastQuotaExceeded = new Date();

        // T082: Log quota exceeded with usage metrics
        console.error(`[YouTube API] QUOTA EXCEEDED - Call #${apiCallCount}, Total exceeded: ${quotaExceededCount}, Timestamp: ${lastQuotaExceeded.toISOString()}`);

        // Log quota errors to Sentry with high priority and usage metrics
        withScope((scope) => {
          scope.setLevel('error');
          scope.setContext('youtube_api', {
            videoId,
            status,
            error: 'API quota exceeded',
            errorData,
            // T082: Add quota monitoring metrics
            usageMetrics: {
              totalCalls: apiCallCount,
              quotaExceededCount,
              lastQuotaExceeded: lastQuotaExceeded.toISOString()
            }
          });
          captureException(error);
        });

        throw new Error('YouTube API quota exceeded');
      }

      if (status === 400) {
        withScope((scope) => {
          scope.setContext('youtube_api', {
            videoId,
            status,
            error: 'Invalid request'
          });
          captureException(error);
        });

        if (errorData.error?.message?.includes('API key')) {
          throw new Error('Invalid YouTube API key');
        }
        throw new Error('Invalid request to YouTube API');
      }

      // Generic API error - log to Sentry
      withScope((scope) => {
        scope.setContext('youtube_api', {
          videoId,
          status,
          errorMessage: errorData.error?.message
        });
        captureException(error);
      });

      throw new Error(`YouTube API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      withScope((scope) => {
        scope.setContext('youtube_api', {
          videoId,
          errorCode: error.code,
          error: 'Network error'
        });
        captureException(error);
      });

      throw new Error('Network error');
    }

    // Re-throw if it's already our custom error
    if (error.message.includes('Video ID is required') ||
        error.message.includes('Invalid API response') ||
        error.message.includes('Video not found or is private') ||
        error.message.includes('YouTube API key is not configured')) {
      throw error;
    }

    // Unknown error - log to Sentry
    withScope((scope) => {
      scope.setContext('youtube_api', {
        videoId,
        error: 'Unknown error',
        message: error.message
      });
      captureException(error);
    });

    throw new Error('Failed to fetch video metadata');
  }
}

/**
 * T082: Get API quota statistics
 *
 * Returns current usage metrics for monitoring and alerting
 *
 * @returns {Object} Quota statistics
 */
function getQuotaStats() {
  return {
    totalCalls: apiCallCount,
    quotaExceededCount,
    lastQuotaExceeded: lastQuotaExceeded ? lastQuotaExceeded.toISOString() : null,
    quotaExceededRate: apiCallCount > 0 ? (quotaExceededCount / apiCallCount) * 100 : 0
  };
}

/**
 * T082: Reset quota statistics
 *
 * Useful for testing or periodic resets
 */
function resetQuotaStats() {
  apiCallCount = 0;
  quotaExceededCount = 0;
  lastQuotaExceeded = null;
}

module.exports = {
  fetchVideoMetadata,
  getQuotaStats, // T082
  resetQuotaStats // T082
};
