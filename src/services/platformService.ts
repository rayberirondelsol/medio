import apiClient from '../utils/axiosConfig';

export interface Platform {
  id: string;
  name: string;
  requiresAuth: boolean;
}

// In-memory cache for platforms
let platformsCache: Platform[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches available platforms from the backend API
 * Uses in-memory caching to reduce unnecessary API calls
 * @returns Promise<Platform[]> - List of available platforms
 * @throws Error with user-friendly message on failure
 */
export async function getPlatforms(): Promise<Platform[]> {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (platformsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return platformsCache;
    }

    // Fetch from API
    const response = await apiClient.get<Platform[]>('/platforms');

    // Validate response data
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from platforms API');
    }

    // Update cache
    platformsCache = response.data;
    cacheTimestamp = now;

    return response.data;
  } catch (error: any) {
    // Clear cache on error
    platformsCache = null;
    cacheTimestamp = null;

    // Handle different error scenarios with user-friendly messages
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error;

      if (status === 401) {
        throw new Error('Please log in to view available platforms');
      } else if (status === 403) {
        throw new Error('You do not have permission to access platforms');
      } else if (status === 404) {
        throw new Error('Platforms service is not available');
      } else if (status >= 500) {
        throw new Error('Server error while fetching platforms. Please try again later.');
      } else if (message) {
        throw new Error(message);
      } else {
        throw new Error('Failed to load platforms. Please try again.');
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    } else if (error.message) {
      // Something else happened
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred while loading platforms');
    }
  }
}

/**
 * Clears the platforms cache
 * Useful for forcing a fresh fetch after data changes
 */
export function clearPlatformsCache(): void {
  platformsCache = null;
  cacheTimestamp = null;
}
