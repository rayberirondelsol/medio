/**
 * Vimeo Service
 *
 * Handles interactions with Vimeo API v3 to fetch video metadata.
 * API Documentation: https://developer.vimeo.com/api/reference/videos
 */

const axios = require('axios');

const VIMEO_API_BASE_URL = 'https://api.vimeo.com';
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;

/**
 * Fetch video metadata from Vimeo API v3
 *
 * @param {string} videoId - The Vimeo video ID (numeric)
 * @returns {Promise<Object>} Video metadata
 * @throws {Error} When video is not found, API error occurs, or invalid input
 */
async function fetchVideoMetadata(videoId) {
  // Validate input
  if (!videoId || typeof videoId !== 'string' || videoId.trim() === '') {
    throw new Error('Video ID is required');
  }

  // Validate video ID format (numeric)
  if (!/^\d+$/.test(videoId)) {
    throw new Error('Invalid Vimeo video ID format');
  }

  try {
    // Build request headers
    const headers = {};

    // Add authorization header if token is available
    // Many Vimeo videos are public and don't require authentication
    if (VIMEO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${VIMEO_ACCESS_TOKEN}`;
    }

    // Make request to Vimeo API v3
    const response = await axios.get(`${VIMEO_API_BASE_URL}/videos/${videoId}`, {
      headers,
      timeout: 10000 // 10 second timeout
    });

    // Validate response structure
    if (!response.data) {
      throw new Error('Invalid API response');
    }

    const video = response.data;

    // Extract metadata
    const title = video.name || 'Untitled';
    const description = video.description || '';
    const duration = video.duration || 0; // in seconds
    const channelName = video.user?.name || 'Unknown';

    // Select the best available thumbnail
    let thumbnailUrl = '';
    if (video.pictures?.sizes && video.pictures.sizes.length > 0) {
      // Get the largest thumbnail (last in array)
      const sizes = video.pictures.sizes;
      thumbnailUrl = sizes[sizes.length - 1]?.link || '';
    }

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
        throw new Error('Video not found');
      }

      if (status === 403) {
        throw new Error('Video is private or access is forbidden');
      }

      if (status === 401) {
        throw new Error('Unauthorized - Vimeo access token may be invalid or missing');
      }

      // Generic API error
      throw new Error(`Vimeo API error: ${errorData.error || 'Unknown error'}`);
    }

    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Network error');
    }

    // Re-throw if it's already our custom error
    if (error.message.includes('Video ID is required') ||
        error.message.includes('Invalid Vimeo video ID format') ||
        error.message.includes('Invalid API response')) {
      throw error;
    }

    // Unknown error
    throw new Error('Failed to fetch video metadata');
  }
}

module.exports = {
  fetchVideoMetadata
};
