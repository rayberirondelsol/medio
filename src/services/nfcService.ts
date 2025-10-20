import axiosInstance from '../utils/axiosConfig';
import { NFCChip } from '../types/nfc';

export const fetchChips = async (): Promise<NFCChip[]> => {
  try {
    const response = await axiosInstance.get('/api/nfc/chips');
    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const registerChip = async (chip_uid: string, label: string): Promise<NFCChip> => {
  try {
    const response = await axiosInstance.post('/api/nfc/chips', { chip_uid, label });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const deleteChip = async (chipId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/nfc/chips/${chipId}`);
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
