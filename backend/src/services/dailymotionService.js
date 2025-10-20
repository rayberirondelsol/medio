/**
 * Dailymotion Video Metadata Service
 *
 * Feature: Add Video via Link (002-add-video-link)
 * Spec: specs/002-add-video-link/spec.md
 *
 * Service for fetching video metadata from Dailymotion API.
 */

const axios = require('axios');
const Sentry = require('@sentry/node');

/**
 * Fetches video metadata from Dailymotion API
 * @param {string} videoId - Dailymotion video ID
 * @returns {Promise<Object>} Video metadata object
 * @throws {Error} If video not found, API rate limit exceeded, or other errors
 */
async function fetchVideoMetadata(videoId) {
  try {
    const response = await axios.get(`https://api.dailymotion.com/video/${videoId}`, {
      params: {
        fields: 'id,title,description,thumbnail_720_url,owner.screenname,duration,views_total,created_time'
      },
      timeout: 10000
    });

    const video = response.data;

    return {
      videoId: video.id,
      title: video.title,
      description: video.description || '',
      thumbnailUrl: video.thumbnail_720_url || '',
      channelName: video['owner.screenname'] || 'Unknown',
      duration: formatDuration(video.duration),
      durationInSeconds: video.duration,
      viewCount: video.views_total?.toString() || '0',
      publishedAt: new Date(video.created_time * 1000).toISOString()
    };
  } catch (error) {
    // Handle specific Dailymotion API errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 429) {
        const rateLimitError = new Error('Dailymotion API rate limit exceeded');
        Sentry.captureException(rateLimitError, {
          tags: { service: 'dailymotion', operation: 'fetchMetadata', errorType: 'rateLimit' },
          extra: { videoId, apiError: errorData }
        });
        throw rateLimitError;
      }

      if (status === 404) {
        throw new Error('Video not found');
      }

      if (status === 403) {
        throw new Error('Video is private or restricted');
      }

      if (status === 410) {
        throw new Error('Video has been deleted');
      }
    }

    // Network or other errors
    Sentry.captureException(error, {
      tags: { service: 'dailymotion', operation: 'fetchMetadata' },
      extra: { videoId }
    });

    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      throw error;
    }

    if (error.message.includes('Video not found')) {
      throw error;
    }

    if (error.message.includes('private') || error.message.includes('restricted')) {
      throw error;
    }

    if (error.message.includes('deleted')) {
      throw error;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error');
    }

    throw new Error(`Failed to fetch Dailymotion video metadata: ${error.message}`);
  }
}

/**
 * Formats duration in seconds to ISO 8601 format
 * @param {number} seconds - Duration in seconds
 * @returns {string} ISO 8601 duration (e.g., "PT4M20S")
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
