import { useEffect } from 'react';
import { NFCChipProvider, useNFCChips } from '../contexts/NFCChipContext';
import NFCChipErrorBoundary from '../components/common/NFCChipErrorBoundary';
import ChipRegistrationForm from '../components/nfc/ChipRegistrationForm';
import ChipList from '../components/nfc/ChipList';

/**
 * Internal page content component that uses the NFC chip context
 */
const NFCChipsPageContent: React.FC = () => {
  const { fetchChips } = useNFCChips();

  useEffect(() => {
    fetchChips();
  }, [fetchChips]);

  return (
    <div className="nfc-chips-page">
      <div className="page-header">
        <h1>NFC Chip Verwaltung</h1>
        <p className="subtitle">Registrieren Sie NFC-Chips für Ihre Kinder</p>
      </div>

      <div className="page-content">
        <section className="registration-section">
          <ChipRegistrationForm />
        </section>

        <hr className="section-divider" />

        <section className="chip-list-section">
          <ChipList />
        </section>
      </div>
    </div>
  );
};

/**
 * NFC Chips Page - Main page component for NFC chip management
 *
 * Provides context and error boundary wrapping for the chip management interface.
 * Allows parents to register NFC chips and associate them with children.
 */
const NFCChipsPage: React.FC = () => {
  return (
    <NFCChipErrorBoundary>
      <NFCChipProvider>
        <NFCChipsPageContent />
      </NFCChipProvider>
    </NFCChipErrorBoundary>
  );
};

export default NFCChipsPage;
