import { useCallback } from 'react';
import styles from './Notes.module.css';

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
    <div className={styles.deleteConfirmBackdrop} onClick={handleCancel}>
      <div className={styles.deleteConfirmDialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.deleteConfirmTitle}>Delete Note</h3>
        <p className={styles.deleteConfirmMessage}>
          Are you sure you want to delete this note? This action cannot be undone.
        </p>
        <div className={styles.deleteConfirmActions}>
          <button
            onClick={handleCancel}
            className={`${styles.deleteConfirmButton} ${styles.cancel}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`${styles.deleteConfirmButton} ${styles.delete}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
