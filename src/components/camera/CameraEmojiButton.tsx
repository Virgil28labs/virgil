import { lazy, memo } from 'react';
import { EmojiButton } from '../common/EmojiButton';
import { DashboardAppErrorBoundary } from '../common/DashboardAppErrorBoundary';

const CameraApp = lazy(() =>
  import('./CameraApp').then(module => ({
    default: module.CameraApp,
  })),
);

const CameraAppWrapper = ({ onClose }: { onClose: () => void }) => (
  <DashboardAppErrorBoundary appName="Virgil Camera">
    <CameraApp isOpen onClose={onClose} />
  </DashboardAppErrorBoundary>
);

export const CameraEmojiButton = memo(() => (
  <EmojiButton
    emoji="📸"
    ariaLabel="Open Virgil Camera"
    GalleryComponent={CameraAppWrapper}
    position={{ top: '7rem', left: '1.9rem' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(239, 176, 194, 0.3) 100%)',
      border: 'rgba(239, 176, 194, 0.6)',
      glow: 'rgba(108, 59, 170, 0.4)',
    }}
    title="Take selfies with Virgil Camera!"
    className="opacity-80 hover:opacity-100"
  />
));
