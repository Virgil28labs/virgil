import React from 'react';
import { styles } from './raccoonStyles';

interface IndicatorsProps {
  isOnWall: boolean;
  isOnUIElement: boolean;
  currentRaccoonEmoji: string;
}

export const Indicators: React.FC<IndicatorsProps> = ({ 
  isOnWall, 
  isOnUIElement, 
  currentRaccoonEmoji, 
}) => {
  return (
    <>
      {/* Wall stick indicator */}
      {isOnWall && (
        <div
          style={{
            ...styles.indicator,
            ...styles.wallIndicator,
          }}
        >
          🧲
        </div>
      )}

      {/* UI Element sitting indicator */}
      {isOnUIElement && (
        <div
          style={{
            ...styles.indicator,
            ...styles.uiIndicator,
          }}
        >
          {currentRaccoonEmoji}
        </div>
      )}
    </>
  );
};