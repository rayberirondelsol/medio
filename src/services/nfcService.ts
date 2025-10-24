import axiosInstance from '../utils/axiosConfig';
import { NFCChip } from '../types/nfc';

export const fetchChips = async (): Promise<NFCChip[]> => {
  try {
    const response = await axiosInstance.get('/nfc/chips');
    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const registerChip = async (chip_uid: string, label: string): Promise<NFCChip> => {
  try {
    const response = await axiosInstance.post('/nfc/chips', { chip_uid, label });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const deleteChip = async (chipId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/nfc/chips/${chipId}`);
  } catch (error: any) {
    // T067: User-friendly German error messages
    const status = error.response?.status;
    if (status === 404) {
      throw new Error('NFC-Chip nicht gefunden');
    } else if (status === 429) {
      throw new Error('Zu viele Anfragen. Bitte versuchen Sie es später erneut');
    } else if (status >= 500) {
      throw new Error('Serverfehler beim Löschen des Chips');
    } else {
      throw new Error(error.response?.data?.message || 'Fehler beim Löschen des Chips');
    }
  }
};

/**
 * Feature: 007-nfc-video-assignment
 * Get videos assigned to an NFC chip in sequence order
 */
export const getChipVideos = async (chipId: string): Promise<any> => {
  try {
    const response = await axiosInstance.get(`/nfc/chips/${chipId}/videos`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 404) {
      throw new Error('Chip not found or not owned by user');
    } else if (status === 401) {
      throw new Error('Unauthorized. Please log in.');
    } else {
      throw new Error(error.response?.data?.message || 'Failed to load videos');
    }
  }
};

/**
 * Feature: 007-nfc-video-assignment
 * Update video assignments for an NFC chip (batch update)
 */
export const updateChipVideos = async (chipId: string, payload: { videos: Array<{ video_id: string; sequence_order: number }> }): Promise<any> => {
  try {
    const response = await axiosInstance.put(`/nfc/chips/${chipId}/videos`, payload);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 400) {
      if (code === 'MAX_VIDEOS_EXCEEDED') {
        throw new Error('Maximum 50 videos per chip');
      } else if (code === 'NON_CONTIGUOUS_SEQUENCE') {
        throw new Error('Sequence must be contiguous (1, 2, 3, ...)');
      } else if (code === 'DUPLICATE_VIDEO') {
        throw new Error('Cannot assign the same video multiple times');
      } else {
        throw new Error(error.response?.data?.message || 'Invalid video assignments');
      }
    } else if (status === 404) {
      throw new Error('Chip not found');
    } else if (status === 409) {
      throw new Error('One or more videos not found');
    } else {
      throw new Error(error.response?.data?.message || 'Failed to update video assignments');
    }
  }
};

/**
 * Feature: 007-nfc-video-assignment
 * Remove a video from an NFC chip
 */
export const removeChipVideo = async (chipId: string, videoId: string): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`/nfc/chips/${chipId}/videos/${videoId}`);
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;

    if (status === 404) {
      throw new Error('Video mapping not found');
    } else if (status === 401) {
      throw new Error('Unauthorized');
    } else {
      throw new Error(error.response?.data?.message || 'Failed to remove video');
    }
  }
};
