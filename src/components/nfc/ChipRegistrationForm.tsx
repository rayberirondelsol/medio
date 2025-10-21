import { useState } from 'react';
import { useNFCChips } from '../../contexts/NFCChipContext';
import { validateChipUID, validateLabel } from '../../utils/nfcValidation';
import NFCScanButton from './NFCScanButton';

interface FormErrors {
  chipUid: string | null;
  label: string | null;
}

const ChipRegistrationForm: React.FC = () => {
  const [chipUid, setChipUid] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({ chipUid: null, label: null });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { registerChip } = useNFCChips();

  const handleNFCScan = (scannedChipUid: string) => {
    setChipUid(scannedChipUid);
    setErrors({ ...errors, chipUid: null });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous messages
    setErrors({ chipUid: null, label: null });
    setSuccessMessage(null);

    // Validate inputs
    const chipUidError = validateChipUID(chipUid);
    const labelError = validateLabel(label);

    if (chipUidError || labelError) {
      setErrors({
        chipUid: chipUidError?.message || null,
        label: labelError?.message || null,
      });
      return;
    }

    // Submit form
    setIsSubmitting(true);
    try {
      await registerChip(chipUid, label);

      // Clear form on success
      setChipUid('');
      setLabel('');
      setSuccessMessage('Chip erfolgreich registriert!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Registrieren des Chips';
      setErrors({ ...errors, chipUid: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chip-registration-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="chipUid">Chip-ID</label>
          <NFCScanButton onScan={handleNFCScan} disabled={isSubmitting} />
          <input
            id="chipUid"
            type="text"
            value={chipUid}
            onChange={(e) => setChipUid(e.target.value)}
            placeholder="04:5A:B2:C3:D4:E5:F6"
            className={errors.chipUid ? 'error' : ''}
            disabled={isSubmitting}
            aria-invalid={!!errors.chipUid}
            aria-describedby={errors.chipUid ? 'chipUid-error' : undefined}
          />
          {errors.chipUid && (
            <div id="chipUid-error" className="error-message" role="alert" aria-live="polite">{errors.chipUid}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="label">Label</label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. Bens Chip"
            maxLength={50}
            className={errors.label ? 'error' : ''}
            disabled={isSubmitting}
            aria-invalid={!!errors.label}
            aria-describedby={errors.label ? 'label-error' : undefined}
          />
          {errors.label && (
            <div id="label-error" className="error-message" role="alert" aria-live="polite">{errors.label}</div>
          )}
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registriere...' : 'Chip Registrieren'}
        </button>

        {successMessage && (
          <div className="success-message" role="status" aria-live="polite">{successMessage}</div>
        )}
      </form>
    </div>
  );
};

export default ChipRegistrationForm;
