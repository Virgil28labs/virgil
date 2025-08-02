/**
 * CameraApp Component Test Suite
 * 
 * Tests main camera app modal, photo gallery integration, keyboard shortcuts,
 * photo selection and modal functionality, and error handling.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraApp } from '../CameraApp';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { useToast } from '../../../hooks/useToast';
import { AllTheProviders } from '../../../test-utils/AllTheProviders';
import type { SavedPhoto } from '../../../types/camera.types';

// Mock dependencies
jest.mock('../hooks/usePhotoGallery', () => ({
  usePhotoGallery: jest.fn(),
}));

jest.mock('../../../hooks/useToast', () => ({
  useToast: jest.fn(),
}));

interface MockPhotoGalleryProps {
  onPhotoSelect: (photo: unknown) => void;
  onError: (error: string) => void;
}

jest.mock('../PhotoGallery', () => ({
  PhotoGallery: ({ onPhotoSelect, onError }: MockPhotoGalleryProps) => (
    <div data-testid="photo-gallery">
      <button onClick={() => onPhotoSelect(mockPhoto1)}>Select Photo 1</button>
      <button onClick={() => onPhotoSelect(mockPhoto2)}>Select Photo 2</button>
      <button onClick={() => onError('Test error')}>Trigger Error</button>
    </div>
  ),
}));

interface MockPhotoModalProps {
  photo?: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

jest.mock('../PhotoModal', () => ({
  PhotoModal: ({ photo, isOpen, onClose, onNext, onPrevious, onFavoriteToggle, onDelete, onShare }: MockPhotoModalProps) => (
    isOpen ? (
      <div data-testid="photo-modal">
        <div>Photo: {photo?.name}</div>
        <button onClick={onClose}>Close Modal</button>
        {onNext && <button onClick={onNext}>Next</button>}
        {onPrevious && <button onClick={onPrevious}>Previous</button>}
        <button onClick={() => photo?.id && onFavoriteToggle(photo.id)}>Toggle Favorite</button>
        <button onClick={() => photo?.id && onDelete(photo.id)}>Delete</button>
        <button onClick={() => photo?.id && onShare(photo.id)}>Share</button>
      </div>
    ) : null
  ),
}));

const mockUsePhotoGallery = usePhotoGallery as jest.MockedFunction<typeof usePhotoGallery>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock photo data
const mockPhoto1: SavedPhoto = {
  id: 'photo-1',
  dataUrl: 'data:image/jpeg;base64,photo1',
  timestamp: 1640995200000,
  isFavorite: false,
  name: 'Photo 1',
};

const mockPhoto2: SavedPhoto = {
  id: 'photo-2',
  dataUrl: 'data:image/jpeg;base64,photo2',
  timestamp: 1641081600000,
  isFavorite: true,
  name: 'Photo 2',
};

const mockGalleryState = {
  photos: [mockPhoto1, mockPhoto2],
  favorites: [mockPhoto2],
  activeTab: 'gallery' as const,
  selectedPhoto: null,
  selectedPhotos: new Set<string>(),
  searchQuery: '',
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  isSelectionMode: false,
  isLoading: false,
  filter: 'all' as const,
};

const mockPhotoGalleryReturn = {
  galleryState: mockGalleryState,
  loading: false,
  error: null,
  getCurrentPhotos: jest.fn(() => [mockPhoto1, mockPhoto2]),
  setActiveTab: jest.fn(),
  setSelectedPhoto: jest.fn(),
  togglePhotoSelection: jest.fn(),
  selectAllPhotos: jest.fn(),
  clearSelection: jest.fn(),
  setSearchQuery: jest.fn(),
  setSortBy: jest.fn(),
  setSortOrder: jest.fn(),
  setFilter: jest.fn(),
  handlePhotoCapture: jest.fn(),
  handlePhotoDelete: jest.fn(),
  handleBulkDelete: jest.fn(),
  handleFavoriteToggle: jest.fn(),
  handleBulkFavorite: jest.fn(),
  navigatePhoto: jest.fn(),
  getPhotoStats: jest.fn(),
  clearError: jest.fn(),
  loadPhotos: jest.fn(),
};

const mockAddToast = jest.fn();
const mockRemoveToast = jest.fn();
const mockClearToasts = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockWarning = jest.fn();
const mockInfo = jest.fn();

describe('CameraApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhotoGallery.mockReturnValue(mockPhotoGalleryReturn);
    mockUseToast.mockReturnValue({
      toasts: [],
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
      clearToasts: mockClearToasts,
      success: mockSuccess,
      error: mockError,
      warning: mockWarning,
      info: mockInfo,
    });
  });

  const renderCameraApp = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
    };
    return render(
      <AllTheProviders>
        <CameraApp {...defaultProps} {...props} />
      </AllTheProviders>,
    );
  };

  describe('rendering', () => {
    it('should render when open', () => {
      renderCameraApp();

      expect(screen.getByText('Virgil Camera')).toBeInTheDocument();
      expect(screen.getByTestId('photo-gallery')).toBeInTheDocument();
      expect(screen.getByText('2 photos')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderCameraApp({ isOpen: false });

      expect(screen.queryByText('Virgil Camera')).not.toBeInTheDocument();
    });

    it('should show correct photo count for gallery tab', () => {
      mockPhotoGalleryReturn.galleryState = { ...mockGalleryState, activeTab: 'gallery' };
      renderCameraApp();

      expect(screen.getByText('2 photos')).toBeInTheDocument();
    });

    it('should show correct favorites count for favorites tab', () => {
      const favoritesGalleryState = { ...mockGalleryState, activeTab: 'favorites' as const };
      mockUsePhotoGallery.mockReturnValue({
        ...mockPhotoGalleryReturn,
        galleryState: favoritesGalleryState,
      });
      renderCameraApp();

      expect(screen.getByText('1 favorite')).toBeInTheDocument();
    });

    it('should show singular form for one photo', () => {
      mockPhotoGalleryReturn.galleryState = { ...mockGalleryState, photos: [mockPhoto1] };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1]);
      renderCameraApp();

      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });

    it('should show keyboard shortcut hint', () => {
      renderCameraApp();

      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText('to close', { exact: false })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should close on close button click', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ onClose: mockOnClose });

      const closeButton = screen.getByRole('button', { name: /close camera app/i });
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on backdrop click', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ onClose: mockOnClose });

      const backdrop = screen.getByRole('button', { name: /close camera app/i }).closest('.camera-app-backdrop');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close on panel click', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ onClose: mockOnClose });

      const panel = screen.getByText('Virgil Camera').closest('.camera-app-panel');
      if (panel) {
        fireEvent.click(panel);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle photo selection', async () => {
      renderCameraApp();

      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      expect(screen.getByTestId('photo-modal')).toBeInTheDocument();
      expect(screen.getByText('Photo: Photo 1')).toBeInTheDocument();
    });

    it('should handle error from PhotoGallery', async () => {
      renderCameraApp();

      const errorButton = screen.getByText('Trigger Error');
      await userEvent.click(errorButton);

      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Test error',
        duration: 5000,
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close on Escape key when photo modal is not open', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ onClose: mockOnClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close on Escape key when photo modal is open', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ onClose: mockOnClose });

      // Open photo modal first
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not handle keyboard events when camera app is closed', async () => {
      const mockOnClose = jest.fn();
      renderCameraApp({ isOpen: false, onClose: mockOnClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('photo modal', () => {
    beforeEach(async () => {
      // Ensure we have multiple photos for navigation
      mockPhotoGalleryReturn.galleryState = { 
        ...mockGalleryState, 
        photos: [mockPhoto1, mockPhoto2],
      };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1, mockPhoto2]);
      
      renderCameraApp();
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);
    });

    it('should close photo modal', async () => {
      expect(screen.getByTestId('photo-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Modal');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('photo-modal')).not.toBeInTheDocument();
    });

    it('should navigate to next photo', async () => {
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      expect(mockPhotoGalleryReturn.navigatePhoto).toHaveBeenCalledWith('next');
      expect(screen.getByText('Photo: Photo 2')).toBeInTheDocument();
    });

    it('should navigate to previous photo', async () => {
      const prevButton = screen.getByText('Previous');
      await userEvent.click(prevButton);

      expect(mockPhotoGalleryReturn.navigatePhoto).toHaveBeenCalledWith('previous');
      expect(screen.getByText('Photo: Photo 2')).toBeInTheDocument();
    });


    it('should handle favorite toggle', async () => {
      mockPhotoGalleryReturn.handleFavoriteToggle.mockResolvedValue(true);

      const favoriteButton = screen.getByText('Toggle Favorite');
      await userEvent.click(favoriteButton);

      await waitFor(() => {
        expect(mockPhotoGalleryReturn.handleFavoriteToggle).toHaveBeenCalledWith('photo-1');
      });

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Added to favorites',
          duration: 2000,
        });
      });
    });

    it('should handle photo delete success', async () => {
      mockPhotoGalleryReturn.handlePhotoDelete.mockResolvedValue(true);

      const deleteButton = screen.getByText('Delete');
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockPhotoGalleryReturn.handlePhotoDelete).toHaveBeenCalledWith('photo-1');
      });

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Photo deleted',
          duration: 2000,
        });
      });

      expect(screen.queryByTestId('photo-modal')).not.toBeInTheDocument();
    });

    it('should handle photo delete failure', async () => {
      mockPhotoGalleryReturn.handlePhotoDelete.mockResolvedValue(false);

      const deleteButton = screen.getByText('Delete');
      await userEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to delete photo',
          duration: 3000,
        });
      });

      expect(screen.getByTestId('photo-modal')).toBeInTheDocument();
    });

    it('should handle share action', async () => {
      const shareButton = screen.getByText('Share');
      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith({
          type: 'info',
          message: 'Share functionality not yet implemented',
          duration: 3000,
        });
      });
    });
  });

  describe('single photo modal', () => {
    it('should not show navigation when only one photo', async () => {
      // Set up single photo scenario
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1]);
      mockPhotoGalleryReturn.galleryState = { 
        ...mockGalleryState, 
        photos: [mockPhoto1],
      };
      
      renderCameraApp();
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      expect(screen.queryByText('Next')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    });
  });

  describe('photo navigation in modal', () => {
    beforeEach(() => {
      // Ensure we have multiple photos for navigation
      mockPhotoGalleryReturn.galleryState = { 
        ...mockGalleryState, 
        photos: [mockPhoto1, mockPhoto2],
      };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1, mockPhoto2]);
    });

    it('should wrap to first photo when navigating next from last', async () => {
      renderCameraApp();
      
      // Select last photo (photo 2)
      const selectButton = screen.getByText('Select Photo 2');
      await userEvent.click(selectButton);

      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      // Should show first photo (photo 1)
      expect(screen.getByText('Photo: Photo 1')).toBeInTheDocument();
    });

    it('should wrap to last photo when navigating previous from first', async () => {
      renderCameraApp();
      
      // Select first photo (photo 1)
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      const prevButton = screen.getByText('Previous');
      await userEvent.click(prevButton);

      // Should show last photo (photo 2)
      expect(screen.getByText('Photo: Photo 2')).toBeInTheDocument();
    });

    it('should update selected photo when photo is not found', async () => {
      renderCameraApp();
      
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      // Mock photo not found scenario
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([]);

      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      // Should maintain current photo
      expect(screen.getByText('Photo: Photo 1')).toBeInTheDocument();
    });
  });

  describe('favorite toggle in modal', () => {
    it('should update local state when toggling favorite', async () => {
      mockPhotoGalleryReturn.handleFavoriteToggle.mockResolvedValue(true);
      renderCameraApp();
      
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      const favoriteButton = screen.getByText('Toggle Favorite');
      await userEvent.click(favoriteButton);

      await waitFor(() => {
        expect(mockPhotoGalleryReturn.handleFavoriteToggle).toHaveBeenCalledWith('photo-1');
      });
    });

    it('should not update state when favorite toggle fails', async () => {
      mockPhotoGalleryReturn.handleFavoriteToggle.mockResolvedValue(false);
      renderCameraApp();
      
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      const favoriteButton = screen.getByText('Toggle Favorite');
      await userEvent.click(favoriteButton);

      await waitFor(() => {
        expect(mockPhotoGalleryReturn.handleFavoriteToggle).toHaveBeenCalledWith('photo-1');
      });

      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderCameraApp();

      expect(screen.getByRole('button', { name: /close camera app/i })).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      renderCameraApp();

      const closeButton = screen.getByRole('button', { name: /close camera app/i });
      closeButton.focus();
      
      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('edge cases', () => {
    it('should handle empty photo list', () => {
      mockPhotoGalleryReturn.galleryState = { ...mockGalleryState, photos: [] };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([]);
      renderCameraApp();

      expect(screen.getByText('0 photos')).toBeInTheDocument();
    });

    it('should handle undefined selected photo', async () => {
      // Reset to normal state with multiple photos
      mockPhotoGalleryReturn.galleryState = { 
        ...mockGalleryState, 
        photos: [mockPhoto1, mockPhoto2],
      };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1, mockPhoto2]);
      
      renderCameraApp();
      
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      // Simulate undefined selected photo
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      // Should still be functional
      expect(screen.getByTestId('photo-modal')).toBeInTheDocument();
    });

    it('should handle photo modal close after navigation', async () => {
      // Reset to normal state with multiple photos
      mockPhotoGalleryReturn.galleryState = { 
        ...mockGalleryState, 
        photos: [mockPhoto1, mockPhoto2],
      };
      mockPhotoGalleryReturn.getCurrentPhotos.mockReturnValue([mockPhoto1, mockPhoto2]);
      
      renderCameraApp();
      
      const selectButton = screen.getByText('Select Photo 1');
      await userEvent.click(selectButton);

      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);

      const closeButton = screen.getByText('Close Modal');
      await userEvent.click(closeButton);

      expect(screen.queryByTestId('photo-modal')).not.toBeInTheDocument();
    });
  });
});