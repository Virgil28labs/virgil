import React, { useState, useCallback, useEffect } from 'react';
import { PhotoGallery } from './PhotoGallery';
import { PhotoModal } from './PhotoModal';
import { usePhotoGallery } from './hooks/usePhotoGallery';
import { useToast } from '../../hooks/useToast';
import type { CameraModalProps, SavedPhoto } from '../../types/camera.types';
import './Camera.css';

export const CameraApp: React.FC<CameraModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<SavedPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const {
    galleryState,
    getCurrentPhotos,
    handleFavoriteToggle,
    handlePhotoDelete,
    navigatePhoto,
  } = usePhotoGallery();

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showPhotoModal) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, showPhotoModal, onClose]);

  const handleError = useCallback((error: string) => {
    addToast({
      type: 'error',
      message: error,
      duration: 5000,
    });
  }, [addToast]);

  const handlePhotoSelect = useCallback((photo: SavedPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  }, []);

  const handlePhotoModalClose = useCallback(() => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  }, []);

  const handlePhotoModalNext = useCallback(() => {
    navigatePhoto('next');
    const currentPhotos = getCurrentPhotos();
    const currentIndex = selectedPhoto ? 
      currentPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;
    
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % currentPhotos.length;
      setSelectedPhoto(currentPhotos[nextIndex]);
    }
  }, [navigatePhoto, getCurrentPhotos, selectedPhoto]);

  const handlePhotoModalPrevious = useCallback(() => {
    navigatePhoto('previous');
    const currentPhotos = getCurrentPhotos();
    const currentIndex = selectedPhoto ? 
      currentPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;
    
    if (currentIndex !== -1) {
      const prevIndex = currentIndex === 0 ? 
        currentPhotos.length - 1 : currentIndex - 1;
      setSelectedPhoto(currentPhotos[prevIndex]);
    }
  }, [navigatePhoto, getCurrentPhotos, selectedPhoto]);

  const handleFavoriteToggleModal = useCallback(async (photoId: string) => {
    const success = await handleFavoriteToggle(photoId);
    if (success) {
      // Update the selected photo if it's the same one
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
      addToast({
        type: 'success',
        message: success ? 'Added to favorites' : 'Removed from favorites',
        duration: 2000,
      });
    }
  }, [handleFavoriteToggle, selectedPhoto, addToast]);

  const handleDeleteModal = useCallback(async (photoId: string) => {
    const success = await handlePhotoDelete(photoId);
    if (success) {
      addToast({
        type: 'success',
        message: 'Photo deleted',
        duration: 2000,
      });
      handlePhotoModalClose();
    } else {
      addToast({
        type: 'error',
        message: 'Failed to delete photo',
        duration: 3000,
      });
    }
  }, [handlePhotoDelete, handlePhotoModalClose, addToast]);

  const handleShareModal = useCallback(async (_photoId: string) => {
    // Share functionality would be implemented here
    // For now, we'll show a success message
    addToast({
      type: 'info',
      message: 'Share functionality not yet implemented',
      duration: 3000,
    });
  }, [addToast]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !showPhotoModal) {
      onClose();
    }
  }, [onClose, showPhotoModal]);

  if (!isOpen) {
    return null;
  }

  const currentPhotos = getCurrentPhotos();
  const hasNavigation = currentPhotos.length > 1;

  return (
    <>
      {/* Main Camera App Modal */}
      <div className="camera-app-backdrop" onClick={handleBackdropClick}>
        <div className="camera-app-panel" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="camera-app-header">
            <div className="camera-app-title">
              <span className="camera-app-icon">📸</span>
              <h2>Virgil Camera</h2>
            </div>
            <button
              className="camera-app-close"
              onClick={onClose}
              aria-label="Close camera app"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="camera-app-content">
            <PhotoGallery
              onPhotoSelect={handlePhotoSelect}
              onError={handleError}
            />
          </div>

          {/* Footer */}
          <div className="camera-app-footer">
            <div className="camera-app-info">
              {galleryState.activeTab === 'gallery' && (
                <span>{galleryState.photos.length} photo{galleryState.photos.length !== 1 ? 's' : ''}</span>
              )}
              {galleryState.activeTab === 'favorites' && (
                <span>{galleryState.favorites.length} favorite{galleryState.favorites.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            
            <div className="camera-app-shortcuts">
              <span className="shortcut-hint">
                Press <kbd>Esc</kbd> to close
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        isOpen={showPhotoModal}
        onClose={handlePhotoModalClose}
        onNext={hasNavigation ? handlePhotoModalNext : undefined}
        onPrevious={hasNavigation ? handlePhotoModalPrevious : undefined}
        onFavoriteToggle={handleFavoriteToggleModal}
        onDelete={handleDeleteModal}
        onShare={handleShareModal}
      />
    </>
  );
};