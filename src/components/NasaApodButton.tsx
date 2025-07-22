import { lazy } from 'react';
import { EmojiButton } from './common/EmojiButton';

const NasaApodViewer = lazy(() => 
  import('./nasa/NasaApodViewer').then(module => ({ 
    default: module.NasaApodViewer, 
  })),
);

const NasaApodViewerWrapper = ({ onClose }: { onClose: () => void }) => (
  <NasaApodViewer isOpen onClose={onClose} />
);

export const NasaApodButton = () => (
  <EmojiButton
    emoji="🔭"
    ariaLabel="Open NASA Astronomy Picture of the Day"
    GalleryComponent={NasaApodViewerWrapper}
    position={{ top: '9.5rem', right: 'calc(2rem - 10px)' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
      border: 'rgba(59, 130, 246, 0.6)',
      glow: 'rgba(59, 130, 246, 0.4)',
    }}
    title="NASA APOD - Discover daily cosmic wonders from NASA's Astronomy Picture of the Day!"
    className="opacity-80 hover:opacity-100"
  />
);