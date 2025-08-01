import { memo } from 'react';
import type { TabType } from '../../types';
import styles from './DogGallery.module.css';

interface DogImageStatesProps {
  loading: boolean
  error: string | null
  dogsCount: number
  activeTab: TabType
  onSwitchToFetch?: () => void
}

export const DogImageStates = memo(function DogImageStates({
  loading,
  error,
  dogsCount,
  activeTab,
  onSwitchToFetch,
}: DogImageStatesProps) {
  // Loading State
  if (loading) {
    return (
      <div className={styles.doggoLoading}>
        <div className={styles.doggoLoadingSpinner} />
        <p className={styles.doggoLoadingText}>Fetching adorable doggos...</p>
      </div>
    );
  }

  // Error State
  if (error && !loading) {
    return (
      <div className={styles.doggoError}>
        <div className={styles.doggoErrorIcon}>😢</div>
        <p className={styles.doggoErrorMessage}>{error}</p>
      </div>
    );
  }

  // Empty State
  if (!loading && !error && dogsCount === 0) {
    return (
      <div className={styles.doggoEmpty}>
        <div className={styles.doggoEmptyIcon}>🏠</div>
        <h3 className={styles.doggoEmptyTitle}>
          {activeTab === 'fetch'
            ? 'Ready to meet some doggos?'
            : 'Your Doggo Sanctuary is empty!'}
        </h3>
        <p className={styles.doggoEmptyMessage}>
          {activeTab === 'fetch'
            ? "Choose your preferences and click 'Fetch'"
            : 'Start by fetching some adorable friends'}
        </p>
        {activeTab === 'gallery' && onSwitchToFetch && (
          <button
            className={styles.doggoEmptyButton}
            onClick={onSwitchToFetch}
            aria-label="Switch to fetch tab to get dogs"
          >
            Go Fetch →
          </button>
        )}
      </div>
    );
  }

  // Return null if there are dogs to display
  return null;
});

// Specialized loading component for individual images
export const DogImageSkeleton = memo(function DogImageSkeleton() {
  return <div className={styles.doggoImageSkeleton} />;
});

// Specialized error component for individual images
export const DogImageError = memo(function DogImageError() {
  return (
    <div className={styles.doggoImageError} aria-label="Image failed to load">
      🐕‍🦺
    </div>
  );
});
