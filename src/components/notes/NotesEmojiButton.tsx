import { lazy, memo } from 'react';
import { EmojiButton } from '../common/EmojiButton';

const NotesApp = lazy(() =>
  import('./NotesApp').then(module => ({
    default: module.NotesApp,
  })),
);

const NotesAppWrapper = ({ onClose }: { onClose: () => void }) => (
  <NotesApp isOpen onClose={onClose} />
);

export const NotesEmojiButton = memo(() => (
  <EmojiButton
    emoji="📝"
    ariaLabel="Open Notes"
    GalleryComponent={NotesAppWrapper}
    position={{ top: '12rem', left: '1.9rem' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)',
      border: 'rgba(108, 59, 170, 0.6)',
      glow: 'rgba(108, 59, 170, 0.4)',
    }}
    title="Notes - Capture your thoughts effortlessly"
    className="opacity-80 hover:opacity-100"
  />
));
