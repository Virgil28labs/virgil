import { lazy } from 'react';
import { EmojiButton } from './common/EmojiButton';

const MinimalHabitTracker = lazy(() => 
  import('./streak/MinimalHabitTracker').then(module => ({ 
    default: module.MinimalHabitTracker 
  }))
);

const HabitTrackerWrapper = ({ onClose }: { onClose: () => void }) => (
  <MinimalHabitTracker isOpen={true} onClose={onClose} />
);

export const StreakTrackerButton = () => (
  <EmojiButton
    emoji="🔥"
    ariaLabel="Open Habit Tracker - Track your daily habits with fire streaks!"
    GalleryComponent={HabitTrackerWrapper}
    position={{ top: '4.5rem', left: '1.9rem' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(90, 50, 140, 0.3) 100%)',
      border: 'rgba(108, 59, 170, 0.6)',
      glow: 'rgba(108, 59, 170, 0.4)'
    }}
    title="Habit Streaks - Track up to 10 habits and build fire streaks!"
    className="opacity-80 hover:opacity-100"
  />
);