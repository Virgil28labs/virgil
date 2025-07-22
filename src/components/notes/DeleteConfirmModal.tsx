import { useCallback } from 'react';
import './DeleteConfirmModal.css';

interface DeleteConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmModal = ({ isOpen, onConfirm, onCancel }: DeleteConfirmModalProps) => {
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <div className="delete-confirm-backdrop" onClick={handleCancel}>
      <div className="delete-confirm-dialog" onClick={e => e.stopPropagation()}>
        <h3 className="delete-confirm-title">Delete Note</h3>
        <p className="delete-confirm-message">
          Are you sure you want to delete this note? This action cannot be undone.
        </p>
        <div className="delete-confirm-actions">
          <button 
            onClick={handleCancel} 
            className="delete-confirm-button cancel"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="delete-confirm-button delete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};