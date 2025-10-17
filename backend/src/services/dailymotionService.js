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
    const fields = 'title,description,thumbnail_url,duration,owner.screenname';

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

    // Check if video data is present (deleted videos return empty object)
    if (!video.title && !video.id) {
      throw new Error('Video not found or has been deleted');
    }

    // Extract metadata
    const title = video.title || 'Untitled';
    const description = video.description || '';
    const thumbnailUrl = video.thumbnail_url || '';
    const duration = video.duration || 0; // in seconds
    const channelName = video['owner.screenname'] || 'Unknown';

    // Return normalized metadata (matching YouTube service format)
    return {
      title,
      description,
      thumbnailUrl,
      duration,
      channelName
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
            error: 'Private video or forbidden'
          });
          captureException(error);
        });
        throw new Error('Video is private or access is forbidden');
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
        error.message.includes('Invalid API response') ||
        error.message.includes('Video not found or has been deleted')) {
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
