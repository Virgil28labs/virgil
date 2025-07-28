import { lazy, memo } from 'react';
import { EmojiButton } from './common/EmojiButton';
import { DashboardAppErrorBoundary } from './common/DashboardAppErrorBoundary';

const GiphyGallery = lazy(() =>
  import('./giphy/GiphyGallery').then(module => ({
    default: module.GiphyGallery,
  })),
);

const GiphyGalleryWrapper = ({ onClose }: { onClose: () => void }) => (
  <DashboardAppErrorBoundary appName="GIF Gallery">
    <GiphyGallery isOpen onClose={onClose} />
  </DashboardAppErrorBoundary>
);

export const GiphyEmojiButton = memo(() => (
  <EmojiButton
    emoji="🎬"
    ariaLabel="Open GIF Gallery"
    GalleryComponent={GiphyGalleryWrapper}
    position={{ top: '7rem', right: 'calc(2rem - 10px)' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 107, 157, 0.3) 100%)',
      border: 'rgba(255, 107, 157, 0.6)',
      glow: 'rgba(255, 107, 157, 0.4)',
    }}
    title="Open GIF Gallery - Search and save your favorite GIFs!"
    className="opacity-80 hover:opacity-100"
  />
));
