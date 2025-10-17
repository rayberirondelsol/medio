/**
 * Dailymotion Service
 *
 * Handles interactions with Dailymotion API to fetch video metadata.
 * API Documentation: https://developers.dailymotion.com/api/
 *
 * Note: Dailymotion public API does not require authentication for public videos.
 */

const axios = require('axios');
const { captureException, withScope } = require('../utils/sentry');

const DAILYMOTION_API_BASE_URL = 'https://api.dailymotion.com';

/**
 * Convert duration in seconds to ISO 8601 format (PT#H#M#S)
 *
 * @param {number} seconds - Duration in seconds
 * @returns {string} ISO 8601 duration format (e.g., "PT5M", "PT1H2M3S")
 */
function convertSecondsToISO8601(seconds) {
  if (!seconds || seconds <= 0) {
    return 'PT0S';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';

  if (hours > 0) {
    duration += `${hours}H`;
  }
  if (minutes > 0) {
    duration += `${minutes}M`;
  }
  if (secs > 0) {
    duration += `${secs}S`;
  }

  // If only PT remains (all values were 0), return PT0S
  if (duration === 'PT') {
    return 'PT0S';
  }

  return duration;
}

/**
 * Fetch video metadata from Dailymotion API
 *
 * @param {string} videoId - The Dailymotion video ID (alphanumeric, typically starts with 'x')
 * @returns {Promise<Object>} Video metadata
 * @throws {Error} When video is not found, API error occurs, or invalid input
 */
async function fetchVideoMetadata(videoId) {
  // Validate input
  if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
    throw new Error('Video ID is required');
  }

  // Validate video ID format (alphanumeric)
  if (!/^[a-z0-9]+$/i.test(videoId)) {
    throw new Error('Invalid Dailymotion video ID format');
  }

  try {
    // Make request to Dailymotion API
    // Request specific fields to get video metadata
    const fields = 'id,title,description,thumbnail_1080_url,thumbnail_720_url,thumbnail_480_url,thumbnail_240_url,duration,owner.screenname,created_time,views_total';

    const response = await axios.get(`${DAILYMOTION_API_BASE_URL}/video/${videoId}`, {
      params: {
        fields
      },
      timeout: 10000 // 10 second timeout
    });

    // Validate response structure
    if (!response.data) {
      throw new Error('Invalid API response');
    }

    const video = response.data;

    // Check if video data is present (empty object = invalid response)
    if (!video || Object.keys(video).length === 0 || !video.id) {
      throw new Error('Invalid API response');
    }

    // Extract metadata
    const title = video.title || 'Untitled';
    const description = video.description || '';
    const channelName = video['owner.screenname'] || 'Unknown';

    // Select best quality thumbnail (priority: 1080 > 720 > 480 > 240)
    let thumbnailUrl;
    if (video.thumbnail_1080_url) {
      thumbnailUrl = video.thumbnail_1080_url;
    } else if (video.thumbnail_720_url) {
      thumbnailUrl = video.thumbnail_720_url;
    } else if (video.thumbnail_480_url) {
      thumbnailUrl = video.thumbnail_480_url;
    } else if (video.thumbnail_240_url) {
      thumbnailUrl = video.thumbnail_240_url;
    } else {
      thumbnailUrl = undefined;
    }

    // Duration conversion
    const durationInSeconds = video.duration || 0;
    const duration = convertSecondsToISO8601(durationInSeconds);

    // Convert Unix timestamp to ISO 8601 (created_time is in seconds)
    const publishedAt = video.created_time
      ? new Date(video.created_time * 1000).toISOString()
      : undefined;

    // Convert view count to string
    const viewCount = video.views_total !== undefined
      ? String(video.views_total)
      : undefined;

    // Return normalized metadata (matching YouTube service format)
    return {
      videoId: video.id,
      title,
      description,
      thumbnailUrl,
      duration,
      durationInSeconds,
      channelName,
      viewCount,
      publishedAt
    };
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 404) {
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Video not found'
          });
          captureException(error);
        });
        throw new Error('Video not found');
      }

      if (status === 410) {
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Video deleted'
          });
          captureException(error);
        });
        throw new Error('Video has been deleted');
      }

      if (status === 403) {
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Private video or restricted'
          });
          captureException(error);
        });
        throw new Error('Video is private or restricted');
      }

      if (status === 401) {
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Invalid API credentials'
          });
          captureException(error);
        });
        throw new Error('Invalid Dailymotion API credentials');
      }

      if (status === 429) {
        // Log to Sentry with context
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Rate limit exceeded'
          });
          captureException(error);
        });
        throw new Error('Dailymotion API rate limit exceeded');
      }

      if (status === 400) {
        withScope((scope) => {
          scope.setContext('dailymotion_api', {
            videoId,
            status,
            error: 'Invalid request'
          });
          captureException(error);
        });
        throw new Error('Invalid request to Dailymotion API');
      }

      // Generic API error - log to Sentry
      withScope((scope) => {
        scope.setContext('dailymotion_api', {
          videoId,
          status,
          errorMessage: errorData.error?.message
        });
        captureException(error);
      });

      throw new Error(`Dailymotion API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      withScope((scope) => {
        scope.setContext('dailymotion_api', {
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
        error.message.includes('Invalid Dailymotion video ID format') ||
        error.message.includes('Invalid API response')) {
      throw error;
    }

    // Unknown error - log to Sentry
    withScope((scope) => {
      scope.setContext('dailymotion_api', {
        videoId,
        error: 'Unknown error',
        message: error.message
      });
      captureException(error);
    });

    throw new Error('Failed to fetch video metadata');
  }
}

module.exports = {
  fetchVideoMetadata
};
