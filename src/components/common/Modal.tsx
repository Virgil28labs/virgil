import React, { useCallback, useEffect , memo } from 'react';

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string | React.ReactNode
  children: React.ReactNode
  className?: string
  size?: 'small' | 'medium' | 'large' | 'extra-large'
}

export const Modal = memo(function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  size = 'medium', 
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-panel modal-${size} ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {typeof title === 'string' ? (
            <h2 className="modal-title">{title}</h2>
          ) : (
            <div className="modal-title">{title}</div>
          )}
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
});