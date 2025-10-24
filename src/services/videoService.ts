import apiClient from '../utils/axiosConfig';
import { CreateVideoRequest, CreateVideoResponse } from '../types/video';

/**
 * Creates a new video in the family library
 *
 * @param videoData - Video creation request payload
 * @returns Promise<CreateVideoResponse> - Created video response
 * @throws Error with user-friendly message on failure
 */
export async function createVideo(videoData: CreateVideoRequest): Promise<CreateVideoResponse> {
  try {
    console.log('[createVideo] Sending request with data:', videoData);
    const response = await apiClient.post<CreateVideoResponse>('/videos', videoData);

    if (!response.data) {
      throw new Error('Invalid response format from video creation API');
    }

    return response.data;
  } catch (error: any) {
    // Log full error details to console for debugging
    console.error('[createVideo] ERROR:', error);
    console.error('[createVideo] Response status:', error.response?.status);
    console.error('[createVideo] Response data:', error.response?.data);

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
