import React from 'react';
import { styles } from './raccoonStyles';
import { SPARKLE_POSITIONS } from '../../constants/raccoonConstants';

interface SparklesProps {
  show: boolean;
}

export const Sparkles: React.FC<SparklesProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div style={styles.sparkleContainer}>
      {SPARKLE_POSITIONS.map((pos, i) => (
        <span key={i} style={styles.sparklePosition(pos)}>
          {pos.emoji}
        </span>
      ))}
    </div>
  );
};