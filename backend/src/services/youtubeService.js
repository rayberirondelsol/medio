/**
 * YouTube Video Metadata Service
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Spec: specs/002-add-video-link/spec.md
 *
 * Service for fetching video metadata from YouTube Data API v3.
 */

const axios = require('axios');
const Sentry = require('@sentry/node');

/**
 * Fetches video metadata from YouTube Data API
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video metadata object
 * @throws {Error} If video not found, API quota exceeded, or other errors
 */
async function fetchVideoMetadata(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    const error = new Error('YouTube API key not configured');
    Sentry.captureException(error, {
      tags: { service: 'youtube', operation: 'fetchMetadata' },
      extra: { videoId }
    });
    throw error;
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: apiKey
      },
      timeout: 10000
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;

    return {
      videoId: video.id,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      channelName: snippet.channelTitle,
      duration: contentDetails.duration,
      durationInSeconds: parseDuration(contentDetails.duration),
      viewCount: statistics.viewCount,
      publishedAt: snippet.publishedAt
    };
  } catch (error) {
    // Handle specific YouTube API errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 403 && errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
        const quotaError = new Error('YouTube API quota exceeded. Please try again tomorrow.');
        Sentry.captureException(quotaError, {
          tags: { service: 'youtube', operation: 'fetchMetadata', errorType: 'quota' },
          extra: { videoId, apiError: errorData }
        });
        throw quotaError;
      }

      if (status === 400) {
        throw new Error('Invalid video ID format');
      }

      if (status === 404) {
        throw new Error('Video not found or is private');
      }
    }

    // Network or other errors
    Sentry.captureException(error, {
      tags: { service: 'youtube', operation: 'fetchMetadata' },
      extra: { videoId }
    });

    if (error.message.includes('quota')) {
      throw error;
    }

    if (error.message.includes('Video not found')) {
      throw error;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error');
    }

    throw new Error(`Failed to fetch YouTube video metadata: ${error.message}`);
  }
}

/**
 * Parses ISO 8601 duration to seconds
 * @param {string} duration - ISO 8601 duration (e.g., "PT3M33S")
 * @returns {number} Duration in seconds
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

module.exports = {
  fetchVideoMetadata
};
