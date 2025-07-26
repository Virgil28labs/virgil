import { memo } from 'react';
import './ui-controls.css';

interface WindowControlsProps {
  windowSize: 'normal' | 'large' | 'fullscreen';
  onSizeToggle: () => void;
  onMinimize: () => void;
}

const WindowControls = memo(function WindowControls({
  windowSize,
  onSizeToggle,
  onMinimize,
}: WindowControlsProps) {
  return (
    <div className="window-controls">
      <button
        className="minimize-btn"
        onClick={onMinimize}
        title="Close to floating bubble"
        aria-label="Close to floating bubble"
      >
        —
      </button>
      <button
        className="size-toggle-btn"
        onClick={onSizeToggle}
        title={`Current: ${windowSize} - Click to toggle`}
        aria-label={`Toggle window size (current: ${windowSize})`}
      >
        ⧉
      </button>
    </div>
  );
});

export { WindowControls };
export default WindowControls;
