import { lazy } from 'react';
import { EmojiButton } from './common/EmojiButton';

const RhythmMachineViewer = lazy(() => 
  import('./rhythm/RhythmMachineViewer').then(module => ({ 
    default: module.RhythmMachineViewer 
  }))
);

const RhythmMachineWrapper = ({ onClose }: { onClose: () => void }) => (
  <RhythmMachineViewer isOpen={true} onClose={onClose} />
);

export const RhythmMachineButton = () => (
  <EmojiButton
    emoji="🥁"
    ariaLabel="Open Rhythm Machine - AI-powered drum sequencer"
    GalleryComponent={RhythmMachineWrapper}
    position={{ top: '12rem', right: 'calc(2rem - 10px)' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 143, 179, 0.3) 100%)',
      border: 'rgba(255, 107, 157, 0.6)',
      glow: 'rgba(255, 107, 157, 0.4)'
    }}
    title="AI Rhythm Machine - Create beats with AI-powered drum sequencer!"
    className="opacity-80 hover:opacity-100"
  />
);