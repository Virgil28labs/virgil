import React, { memo, useState, useEffect, useCallback } from 'react';
import { nasaService } from '../../lib/nasaService';
import type { ApodImage, NasaApodViewerProps } from '../../types/nasa.types';
import { useNasaFavorites } from './hooks/useNasaFavorites';
import { NasaApodTabs, type NasaTabType } from './NasaApodTabs';
import { NasaApodGallery } from './NasaApodGallery';
import { NasaApodImageView } from './NasaApodImageView';
import { NasaApodModal } from './NasaApodModal';
import styles from './NasaApodViewer.module.css';
import { logger } from '../../lib/logger';
import { timeService } from '../../services/TimeService';

export const NasaApodViewer = memo(function NasaApodViewer({
  isOpen,
  onClose,
  initialDate,
}: NasaApodViewerProps) {
  const [currentApod, setCurrentApod] = useState<ApodImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    initialDate || timeService.toISODateString(),
  );
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<NasaTabType>('browse');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Favorites hook
  const {
    favorites,
    favoriteCount,
    isFavorited,
    toggleFavorite,
    removeFavorite,
  } = useNasaFavorites();

  // Load APOD for specific date
  const loadApodByDate = useCallback(async (date: string) => {
    if (!isOpen || loading) return;

    setLoading(true);
    setError(null);
    setImageLoading(true);

    try {
      const apod = await nasaService.getApodByDate(date);
      setCurrentApod(apod);
      setSelectedDate(date);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load APOD';
      setError(errorMessage);

      // Special handling for rate limit errors
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many requests')) {
        setError('NASA API rate limit reached. Please try again later.');
      }

      logger.error('Failed to load APOD', err as Error, {
        component: 'NasaApodViewer',
        action: 'loadDailyApod',
      });
    } finally {
      setLoading(false);
    }
  }, [isOpen, loading]);

  // Load today's APOD (convenience function)
  const loadTodaysApod = useCallback(async () => {
    const today = timeService.toISODateString();
    await loadApodByDate(today);
  }, [loadApodByDate]);

  // Handle image load complete
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setError('Failed to load APOD image');
  }, []);

  // Handle date change
  const handleDateChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    if (newDate && newDate !== selectedDate) {
      await loadApodByDate(newDate);
    }
  }, [selectedDate, loadApodByDate]);

  // Toggle description expanded state
  const toggleDescription = useCallback(() => {
    setDescriptionExpanded(prev => !prev);
  }, []);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(() => {
    if (currentApod) {
      toggleFavorite(currentApod);
    }
  }, [currentApod, toggleFavorite]);

  // Simple keyboard navigation - just ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load APOD when opened
  useEffect(() => {
    if (isOpen && !currentApod && !loading && !error) {
      loadApodByDate(selectedDate);
    }
  }, [isOpen, selectedDate, currentApod, loading, error, loadApodByDate]);

  // Clear state when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentApod(null);
      setError(null);
      setImageLoading(true);
      setDescriptionExpanded(false);
      setActiveTab('browse');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.nasaApodBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="NASA Astronomy Picture of the Day"
    >
      <div
        className={styles.nasaApodPanel}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className={styles.nasaApodHeader}>
          <div>
            <h2 className={styles.nasaApodTitle}>
              <span>🔭</span>
              Astronomy Picture of the Day
            </h2>
          </div>
          <button
            className={styles.nasaApodClose}
            onClick={onClose}
            aria-label="Close APOD viewer"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <NasaApodTabs
          activeTab={activeTab}
          favoritesCount={favoriteCount}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        <div className={styles.nasaApodContent}>
          {activeTab === 'gallery' ? (
            <NasaApodGallery
              favorites={favorites}
              onRemoveFavorite={removeFavorite}
              onOpenModal={setSelectedImageIndex}
            />
          ) : (
            <>
              {/* Title and Date Picker Header */}
              <div className={styles.nasaApodControls}>
                <div className={styles.nasaApodHeaderContent}>
                  {currentApod && (
                    <h3 className={styles.nasaApodControlTitle}>{currentApod.title}</h3>
                  )}
                  <div className={styles.nasaApodDateWrapper}>
                    <input
                      type="date"
                      className={styles.nasaApodDateInput}
                      value={selectedDate}
                      onChange={handleDateChange}
                      min="1995-06-16"
                      max={timeService.toISODateString()}
                      disabled={loading}
                      aria-label="Select APOD date"
                    />
                  </div>
                </div>
              </div>

              {error ? (
                <div className={styles.nasaApodError}>
                  <div className={styles.nasaApodErrorIcon}>⚠️</div>
                  <div className={styles.nasaApodErrorMessage}>{error}</div>
                  <button
                    className={styles.nasaApodErrorRetry}
                    onClick={loadTodaysApod}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Retry'}
                  </button>
                </div>
              ) : loading && !currentApod ? (
                <div className={styles.nasaApodLoading}>
                  <div className={styles.nasaApodLoadingSpinner} />
                  <div className={styles.nasaApodLoadingText}>Loading today's cosmic wonder...</div>
                </div>
              ) : currentApod ? (
                <>
                  <NasaApodImageView
                    apod={currentApod}
                    isFavorited={isFavorited(currentApod.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                    imageLoading={imageLoading}
                    onImageLoad={handleImageLoad}
                    onImageError={handleImageError}
                  />

                  {/* Expandable Description */}
                  {currentApod.explanation && (
                    <div className={styles.nasaApodDescription}>
                      {descriptionExpanded ? (
                        <p className={styles.nasaApodDescriptionFull}>
                          {currentApod.explanation}
                        </p>
                      ) : (
                        <p className={styles.nasaApodDescriptionPreview}>
                          {currentApod.explanation}
                        </p>
                      )}
                      <button
                        className={`${styles.nasaApodDescriptionToggle} ${descriptionExpanded ? styles.expanded : ''}`}
                        onClick={toggleDescription}
                        aria-label={descriptionExpanded ? 'Show less description' : 'Show full description'}
                      >
                        <span>{descriptionExpanded ? 'Show less' : 'Read more'}</span>
                        <span className={styles.nasaApodDescriptionToggleIcon}>▼</span>
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* NASA APOD Modal */}
      <NasaApodModal
        favorites={favorites}
        currentIndex={selectedImageIndex}
        isFavorited={isFavorited}
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={setSelectedImageIndex}
        onFavoriteToggle={toggleFavorite}
      />
    </div>
  );
});
