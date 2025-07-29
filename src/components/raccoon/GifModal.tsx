import React from 'react';
import { styles } from './raccoonStyles';

interface GifModalProps {
  show: boolean;
  onClose: () => void;
}

export const GifModal: React.FC<GifModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div style={styles.gifModal} onClick={onClose}>
      <div style={styles.gifContainer} onClick={(e) => e.stopPropagation()}>
        <img
          src="/racoon_celebration.gif"
          alt="Raccoon GIF"
          style={styles.gifImage}
        />
        <button
          onClick={onClose}
          style={styles.gifCloseButton}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(255, 0, 0, 0.8)';
            (e.target as HTMLElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(0, 0, 0, 0.7)';
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
          title="Close GIF"
        >
          ✕
        </button>
      </div>
    </div>
  );
};