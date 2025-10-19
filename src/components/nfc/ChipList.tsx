import React, { useState } from 'react';
import { useNFCChips } from '../../contexts/NFCChipContext';
import { NFCChip } from '../../types/nfc';

const ChipList: React.FC = () => {
  const { chips, loading, deleteChip } = useNFCChips();
  const [deletingChipId, setDeletingChipId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [chipToDelete, setChipToDelete] = useState<NFCChip | null>(null);

  const handleDeleteClick = (chip: NFCChip) => {
    setChipToDelete(chip);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!chipToDelete) return;

    try {
      setDeletingChipId(chipToDelete.chip_id);
      await deleteChip(chipToDelete.chip_id);
    } catch (error) {
      console.error('Fehler beim Löschen des Chips:', error);
    } finally {
      setDeletingChipId(null);
      setShowConfirmModal(false);
      setChipToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setChipToDelete(null);
  };

  if (loading) {
    return <div className="chip-list-loading">Lade NFC-Chips...</div>;
  }

  if (!chips || chips.length === 0) {
    return <div className="chip-list-empty">Keine NFC-Chips registriert</div>;
  }

  return (
    <div className="chip-list">
      <ul className="chip-list-items">
        {chips.map((chip) => (
          <li key={chip.chip_id} className="chip-list-item">
            <div className="chip-info">
              <div className="chip-label">{chip.label}</div>
              <div className="chip-uid">{chip.chip_uid}</div>
            </div>
            <button
              className="chip-delete-button"
              onClick={() => handleDeleteClick(chip)}
              disabled={deletingChipId === chip.chip_id}
            >
              {deletingChipId === chip.chip_id ? 'Wird gelöscht...' : 'Löschen'}
            </button>
          </li>
        ))}
      </ul>

      {showConfirmModal && chipToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Chip löschen</h3>
            <p>Chip '{chipToDelete.label}' wirklich löschen?</p>
            <div className="modal-actions">
              <button
                className="modal-button modal-cancel"
                onClick={handleCancelDelete}
              >
                Abbrechen
              </button>
              <button
                className="modal-button modal-confirm"
                onClick={handleConfirmDelete}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chip-list-loading,
        .chip-list-empty {
          padding: 20px;
          text-align: center;
          color: #666;
        }

        .chip-list {
          width: 100%;
        }

        .chip-list-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .chip-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .chip-list-item:last-child {
          border-bottom: none;
        }

        .chip-info {
          flex: 1;
        }

        .chip-label {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 5px;
        }

        .chip-uid {
          color: #666;
          font-size: 14px;
        }

        .chip-delete-button {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .chip-delete-button:hover:not(:disabled) {
          background-color: #c82333;
        }

        .chip-delete-button:disabled {
          background-color: #e0e0e0;
          color: #999;
          cursor: not-allowed;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 15px;
        }

        .modal-content p {
          margin-bottom: 20px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modal-button {
          padding: 8px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .modal-cancel {
          background-color: #6c757d;
          color: white;
        }

        .modal-cancel:hover {
          background-color: #5a6268;
        }

        .modal-confirm {
          background-color: #dc3545;
          color: white;
        }

        .modal-confirm:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

export default ChipList;
