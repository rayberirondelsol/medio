import { createContext, useContext, useState, ReactNode } from 'react';
import { NFCChip, NFCChipContextType } from '../types/nfc';
import * as nfcService from '../services/nfcService';
import * as Sentry from '@sentry/react';

const NFCChipContext = createContext<NFCChipContextType | undefined>(undefined);

interface NFCChipProviderProps {
  children: ReactNode;
}

export const NFCChipProvider: React.FC<NFCChipProviderProps> = ({ children }) => {
  const [chips, setChips] = useState<NFCChip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChips = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const fetchedChips = await nfcService.fetchChips();
      setChips(fetchedChips);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chips';
      setError(errorMessage);
      Sentry.captureException(err, {
        extra: {
          context: 'NFCChipContext.fetchChips',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const registerChip = async (chip_uid: string, label: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const newChip = await nfcService.registerChip(chip_uid, label);
      setChips((prevChips) => [...prevChips, newChip]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register chip';
      setError(errorMessage);
      Sentry.captureException(err, {
        extra: {
          context: 'NFCChipContext.registerChip',
          chip_uid,
          label,
        },
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteChip = async (chipId: string): Promise<void> => {
    // Optimistic update
    const previousChips = chips;
    setChips((prevChips) => prevChips.filter((chip) => chip.id !== chipId));
    setError(null);

    try {
      await nfcService.deleteChip(chipId);
    } catch (err) {
      // Rollback on error
      setChips(previousChips);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chip';
      setError(errorMessage);
      Sentry.captureException(err, {
        extra: {
          context: 'NFCChipContext.deleteChip',
          chipId,
        },
      });
      throw err;
    }
  };

  const value: NFCChipContextType = {
    chips,
    loading,
    error,
    registerChip,
    deleteChip,
    fetchChips,
  };

  return (
    <NFCChipContext.Provider value={value}>
      {children}
    </NFCChipContext.Provider>
  );
};

export const useNFCChips = (): NFCChipContextType => {
  const context = useContext(NFCChipContext);
  if (context === undefined) {
    throw new Error('useNFCChips must be used within an NFCChipProvider');
  }
  return context;
};
