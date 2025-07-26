import { lazy } from 'react';
import { EmojiButton } from './common/EmojiButton';

const VectorMemory = lazy(() =>
  import('./VectorMemory').then(module => ({
    default: module.VectorMemory,
  })),
);

const VectorMemoryWrapper = ({ onClose }: { onClose: () => void }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
  >
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative',
    }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 1001,
        }}
        aria-label="Close"
      >
        ✖️
      </button>
      <VectorMemory />
    </div>
  </div>
);

export const VectorMemoryButton = () => (
  <EmojiButton
    emoji="🧠"
    ariaLabel="Open Semantic Memory"
    GalleryComponent={VectorMemoryWrapper}
    position={{ top: '14rem', left: '1.9rem' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)',
      border: 'rgba(108, 59, 170, 0.6)',
      glow: 'rgba(108, 59, 170, 0.4)',
    }}
    title="Semantic Memory - AI-powered memory with vector embeddings"
    className="opacity-80 hover:opacity-100"
  />
);
