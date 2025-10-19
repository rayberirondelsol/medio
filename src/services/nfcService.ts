import axios from 'axios';
import { NFCChip } from '../types/nfc';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const fetchChips = async (): Promise<NFCChip[]> => {
  try {
    const response = await api.get('/api/nfc/chips');
    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const registerChip = async (chip_uid: string, label: string): Promise<NFCChip> => {
  try {
    const response = await api.post('/api/nfc/chips', { chip_uid, label });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const deleteChip = async (chipId: string): Promise<void> => {
  try {
    await api.delete(`/api/nfc/chips/${chipId}`);
  } catch (error: any) {
    throw new Error(error.message);
  }
};
