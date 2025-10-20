/**
 * Vimeo Video Metadata Service
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Spec: specs/002-add-video-link/spec.md
 *
 * Service for fetching video metadata from Vimeo API v3.
 */

const axios = require('axios');
const Sentry = require('@sentry/node');

/**
 * Fetches video metadata from Vimeo API
 * @param {string} videoId - Vimeo video ID
 * @returns {Promise<Object>} Video metadata object
 * @throws {Error} If video not found, API rate limit exceeded, or other errors
 */
async function fetchVideoMetadata(videoId) {
  const accessToken = process.env.VIMEO_ACCESS_TOKEN;

  if (!accessToken) {
    const error = new Error('Vimeo access token not configured');
    Sentry.captureException(error, {
      tags: { service: 'vimeo', operation: 'fetchMetadata' },
      extra: { videoId }
    });
    throw error;
  }

  try {
    const response = await axios.get(`https://api.vimeo.com/videos/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      },
      timeout: 10000
    });

    const video = response.data;

    return {
      videoId: videoId,
      title: video.name,
      description: video.description || '',
      thumbnailUrl: video.pictures?.sizes?.[video.pictures.sizes.length - 1]?.link || '',
      channelName: video.user?.name || 'Unknown',
      duration: formatDuration(video.duration),
      durationInSeconds: video.duration,
      viewCount: video.stats?.plays?.toString() || '0',
      publishedAt: video.created_time
    };
  } catch (error) {
    // Handle specific Vimeo API errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 429) {
        const rateLimitError = new Error('Vimeo API rate limit exceeded');
        Sentry.captureException(rateLimitError, {
          tags: { service: 'vimeo', operation: 'fetchMetadata', errorType: 'rateLimit' },
          extra: { videoId, apiError: errorData }
        });
        throw rateLimitError;
      }

      if (status === 401 || status === 403) {
        const authError = new Error('Invalid Vimeo access token');
        Sentry.captureException(authError, {
          tags: { service: 'vimeo', operation: 'fetchMetadata', errorType: 'auth' },
          extra: { videoId }
        });
        throw authError;
      }

      if (status === 404) {
        throw new Error('Video not found');
      }

      if (status === 403 && errorData.error?.includes('private')) {
        throw new Error('Video is private or restricted');
      }
    }

    // Network or other errors
    Sentry.captureException(error, {
      tags: { service: 'vimeo', operation: 'fetchMetadata' },
      extra: { videoId }
    });

    if (error.message.includes('rate limit')) {
      throw error;
    }

    if (error.message.includes('Video not found')) {
      throw error;
    }

    if (error.message.includes('private') || error.message.includes('restricted')) {
      throw error;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error');
    }

    throw new Error(`Failed to fetch Vimeo video metadata: ${error.message}`);
  }
}

/**
 * Formats duration in seconds to ISO 8601 format
 * @param {number} seconds - Duration in seconds
 * @returns {string} ISO 8601 duration (e.g., "PT5M30S")
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || (hours === 0 && minutes === 0)) duration += `${secs}S`;

  return duration;
}

module.exports = {
  fetchVideoMetadata
};
