import apiClient from '../utils/axiosConfig';
import { VideoMetadata, CreateVideoRequest, CreateVideoResponse } from '../types/video';

/**
 * Fetches video metadata from the backend
 *
 * @param platform - Platform name (e.g., 'youtube')
 * @param videoId - Video ID extracted from URL
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise<VideoMetadata> - Video metadata from platform API
 * @throws Error with user-friendly message on failure
 */
export async function fetchVideoMetadata(
  platform: string,
  videoId: string,
  signal?: AbortSignal
): Promise<VideoMetadata> {
  try {
    const response = await apiClient.get<VideoMetadata>(
      '/videos/metadata',
      {
        params: { platform, videoId },
        signal,
        timeout: 10000, // 10-second timeout (T030)
      }
    );

    // Validate response data
    if (!response.data) {
      throw new Error('Invalid response format from metadata API');
    }

    return response.data;
  } catch (error: any) {
    // Handle AbortError (request was cancelled)
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      throw new Error('Request cancelled');
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      throw new Error(
        'Request timed out. The video platform may be slow to respond. Please try again or enter details manually.'
      );
    }

    // Handle different error scenarios with user-friendly messages
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error;

      if (status === 401) {
        throw new Error('Please log in to fetch video metadata');
      } else if (status === 403) {
        throw new Error('This video is private or unavailable. Please enter details manually.');
      } else if (status === 404) {
        throw new Error('Video not found. Please check the URL and try again.');
      } else if (status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (status === 503) {
        // Service unavailable - use backend's message which is more specific
        throw new Error(message || 'Service temporarily unavailable. Please try again later or enter details manually.');
      } else if (status >= 500) {
        throw new Error('Server error while fetching metadata. Please try again later or enter details manually.');
      } else if (message) {
        throw new Error(message);
      } else {
        throw new Error('Failed to load video metadata. Please try again or enter details manually.');
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else if (error.message) {
      // Something else happened
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred while loading video metadata');
    }
  }
}

/**
 * Creates a new video in the family library
 *
 * @param videoData - Video creation request payload
 * @returns Promise<CreateVideoResponse> - Created video response
 * @throws Error with user-friendly message on failure
 */
export async function createVideo(videoData: CreateVideoRequest): Promise<CreateVideoResponse> {
  try {
    const response = await apiClient.post<CreateVideoResponse>('/videos', videoData);

    if (!response.data) {
      throw new Error('Invalid response format from video creation API');
    }

    return response.data;
  } catch (error: any) {
    // Handle different error scenarios
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error;

      if (status === 400) {
        throw new Error(message || 'Invalid video data. Please check all fields and try again.');
      } else if (status === 401) {
        throw new Error('Please log in to add videos');
      } else if (status === 409) {
        // Duplicate video URL
        throw new Error('This video has already been added to your library.');
      } else if (status >= 500) {
        throw new Error('Server error while saving video. Please try again later.');
      } else if (message) {
        throw new Error(message);
      } else {
        throw new Error('Failed to save video. Please try again.');
      }
    } else if (error.request) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred while saving the video');
    }
  }
}
