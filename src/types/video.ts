/**
 * Video-related TypeScript type definitions
 * Used for video metadata, platform data, and video CRUD operations
 */

/**
 * Metadata for a video (typically fetched from platform API)
 */
export interface VideoMetadata {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // seconds
  channelName: string;
}

/**
 * Platform information (e.g., YouTube, Vimeo)
 */
export interface Platform {
  id: string;
  name: string;
  requiresAuth: boolean;
}

/**
 * Age rating options for videos
 */
export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R';

/**
 * Request payload for creating a new video
 */
export interface CreateVideoRequest {
  platform_id: string; // UUID
  video_id: string;
  video_url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  age_rating: AgeRating;
  channel_name?: string;
}

/**
 * Complete video object returned from the API
 */
export interface Video {
  id: string;
  platform_id: string;
  video_id: string;
  video_url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  age_rating: AgeRating;
  channel_name: string | null;
  added_date: string; // ISO 8601 format
}

/**
 * Response from video creation endpoint
 */
export interface CreateVideoResponse {
  video: Video;
  message?: string;
}

/**
 * Error response from video-related API calls
 */
export interface VideoError {
  error: string;
  message?: string;
  details?: any;
}
