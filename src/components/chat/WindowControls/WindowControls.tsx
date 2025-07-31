import { memo } from 'react';
import styles from './WindowControls.module.css';

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
    <div className={styles.controls}>
      <button
        className={styles.minimizeButton}
        onClick={onMinimize}
        title="Close to floating bubble"
        aria-label="Close to floating bubble"
      >
        —
      </button>
      <button
        className={styles.sizeToggleButton}
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