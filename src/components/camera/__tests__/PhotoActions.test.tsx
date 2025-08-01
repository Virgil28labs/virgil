/**
 * PhotoActions Component Test Suite
 * 
 * Tests photo action buttons, favorite toggle, download/share functionality,
 * delete confirmation flow, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoActions } from '../PhotoActions';
import { CameraUtils } from '../utils/cameraUtils';
import { PhotoExport } from '../utils/photoExport';
import { logger } from '../../../lib/logger';
import type { SavedPhoto } from '../../../types/camera.types';

// Mock dependencies
jest.mock('../utils/cameraUtils', () => ({
  CameraUtils: {
    generatePhotoName: jest.fn(),
    downloadPhoto: jest.fn(),
    formatFileSize: jest.fn((bytes) => {
      if (bytes === 0) return '0 B';
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }
      return `${(bytes / 1024).toFixed(1)} KB`;
    }),
  },
}));

jest.mock('../utils/photoExport', () => ({
  PhotoExport: {
    shareSinglePhoto: jest.fn(),
  },
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;
const mockPhotoExport = PhotoExport as jest.Mocked<typeof PhotoExport>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock photo data
const mockPhoto: SavedPhoto = {
  id: 'photo-1',
  dataUrl: 'data:image/jpeg;base64,photo1',
  timestamp: 1640995200000,
  isFavorite: false,
  name: 'Test Photo',
  size: 1024,
};

const mockPhotoWithoutName: SavedPhoto = {
  id: 'photo-2',
  dataUrl: 'data:image/jpeg;base64,photo2',
  timestamp: 1641081600000,
  isFavorite: true,
};

describe('PhotoActions', () => {
  const mockOnFavoriteToggle = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraUtils.generatePhotoName.mockReturnValue('Virgil_20220101_120000.jpg');
    mockCameraUtils.downloadPhoto.mockResolvedValue();
    mockPhotoExport.shareSinglePhoto.mockResolvedValue();
  });

  const renderPhotoActions = (props = {}) => {
    const defaultProps = {
      photo: mockPhoto,
      onFavoriteToggle: mockOnFavoriteToggle,
      onDelete: mockOnDelete,
      onClose: mockOnClose,
    };
    return render(<PhotoActions {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('should render all action buttons', () => {
      renderPhotoActions();

      expect(screen.getByRole('button', { name: /favorite/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should show favorite state correctly for non-favorite photo', () => {
      renderPhotoActions({ photo: { ...mockPhoto, isFavorite: false } });

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      expect(favoriteButton).toHaveAttribute('title', 'Add to favorites');
    });

    it('should show favorite state correctly for favorite photo', () => {
      renderPhotoActions({ photo: { ...mockPhoto, isFavorite: true } });

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      expect(favoriteButton).toHaveAttribute('title', 'Remove from favorites');
    });

    it('should apply custom className', () => {
      const { container } = renderPhotoActions({ className: 'custom-class' });

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show photo metadata', () => {
      renderPhotoActions();

      expect(screen.getByText('Test Photo')).toBeInTheDocument();
      expect(screen.getByText(/1\.0 KB/)).toBeInTheDocument();
    });

    it('should show formatted timestamp', () => {
      renderPhotoActions();

      // Should show some time-related text
      expect(screen.getByText(/ago|at/)).toBeInTheDocument();
    });
  });

  describe('favorite toggle', () => {
    it('should call onFavoriteToggle when clicked', async () => {
      renderPhotoActions();

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      await userEvent.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith('photo-1');
    });

    it('should handle favorite toggle for already favorite photo', async () => {
      renderPhotoActions({ photo: { ...mockPhoto, isFavorite: true } });

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      await userEvent.click(favoriteButton);

      expect(mockOnFavoriteToggle).toHaveBeenCalledWith('photo-1');
    });
  });

  describe('download functionality', () => {
    it('should download photo with provided name', async () => {
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(
          mockPhoto.dataUrl,
          'Test Photo',
        );
      });
    });

    it('should download photo with generated name when no name provided', async () => {
      renderPhotoActions({ photo: mockPhotoWithoutName });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockCameraUtils.generatePhotoName).toHaveBeenCalledWith(mockPhotoWithoutName.timestamp);
        expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(
          mockPhotoWithoutName.dataUrl,
          'Virgil_20220101_120000.jpg',
        );
      });
    });

    it('should handle download errors', async () => {
      mockCameraUtils.downloadPhoto.mockRejectedValue(new Error('Download failed'));
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error downloading photo',
          expect.any(Error),
          expect.objectContaining({
            component: 'PhotoActions',
            action: 'handleDownload',
            metadata: { photoId: 'photo-1' },
          }),
        );
      });
    });

    it('should show processing state during download', async () => {
      // Mock slow download
      mockCameraUtils.downloadPhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      
      // Click and check processing state
      await userEvent.click(downloadButton);
      
      // Should be disabled during processing
      await waitFor(() => {
        expect(downloadButton).toBeDisabled();
      });

      // Wait for the download to complete
      await waitFor(() => {
        expect(downloadButton).toBeEnabled();
      });
    });

    it('should handle non-Error exceptions in download', async () => {
      mockCameraUtils.downloadPhoto.mockRejectedValue('String error');
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error downloading photo',
          expect.any(Error),
          expect.objectContaining({
            component: 'PhotoActions',
            action: 'handleDownload',
          }),
        );
      });
    });
  });

  describe('share functionality', () => {
    it('should share photo successfully', async () => {
      renderPhotoActions();

      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(mockPhotoExport.shareSinglePhoto).toHaveBeenCalledWith(mockPhoto);
      });
    });

    it('should fallback to download when share fails', async () => {
      mockPhotoExport.shareSinglePhoto.mockRejectedValue(new Error('Share not supported'));
      renderPhotoActions();

      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(mockPhotoExport.shareSinglePhoto).toHaveBeenCalledWith(mockPhoto);
      });

      await waitFor(() => {
        expect(mockCameraUtils.downloadPhoto).toHaveBeenCalled();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error sharing photo',
        expect.any(Error),
        expect.objectContaining({
          component: 'PhotoActions',
          action: 'handleShare',
          metadata: { photoId: 'photo-1' },
        }),
      );
    });

    it('should show processing state during share', async () => {
      // Mock slow share
      mockPhotoExport.shareSinglePhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      
      renderPhotoActions();

      const shareButton = screen.getByRole('button', { name: /share/i });
      
      // Click and check processing state
      await userEvent.click(shareButton);
      
      // Should be disabled during processing
      await waitFor(() => {
        expect(shareButton).toBeDisabled();
      });

      // Wait for the share to complete
      await waitFor(() => {
        expect(shareButton).toBeEnabled();
      });
    });

    it('should handle non-Error exceptions in share', async () => {
      mockPhotoExport.shareSinglePhoto.mockRejectedValue('String error');
      renderPhotoActions();

      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error sharing photo',
          expect.any(Error),
          expect.objectContaining({
            component: 'PhotoActions',
            action: 'handleShare',
          }),
        );
      });
    });
  });

  describe('delete functionality', () => {
    it('should show delete confirmation when delete clicked', async () => {
      renderPhotoActions();

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(screen.getByText('Delete Photo?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should cancel delete confirmation', async () => {
      renderPhotoActions();

      // Show confirmation
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      // Should return to normal view
      expect(screen.queryByText('Delete Photo?')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should confirm delete and call callbacks', async () => {
      renderPhotoActions();

      // Show confirmation
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith('photo-1');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle delete without onClose callback', async () => {
      renderPhotoActions({ onClose: undefined });

      // Show confirmation
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith('photo-1');
      // Should not throw error when onClose is undefined
    });
  });

  describe('processing state', () => {
    it('should disable all buttons during processing', async () => {
      // Mock slow operation
      mockCameraUtils.downloadPhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      const shareButton = screen.getByRole('button', { name: /share/i });
      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      
      // Start processing
      await userEvent.click(downloadButton);
      
      // All buttons should be disabled
      await waitFor(() => {
        expect(downloadButton).toBeDisabled();
        expect(shareButton).toBeDisabled();
        expect(favoriteButton).toBeDisabled();
        expect(deleteButton).toBeDisabled();
      });

      // Wait for the operation to complete
      await waitFor(() => {
        expect(downloadButton).toBeEnabled();
        expect(shareButton).toBeEnabled();
        expect(favoriteButton).toBeEnabled();
        expect(deleteButton).toBeEnabled();
      });
    });

    it('should show processing indicator', async () => {
      // Mock slow operation
      mockCameraUtils.downloadPhoto.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );
      
      renderPhotoActions();

      const downloadButton = screen.getByRole('button', { name: /download/i });
      
      // Start processing
      await userEvent.click(downloadButton);
      
      // Should show processing state
      await waitFor(() => {
        const processingElement = screen.getByText(/processing|loading/i);
        expect(processingElement).toBeInTheDocument();
      });

      // Wait for processing to complete
      await waitFor(() => {
        expect(screen.queryByText(/processing|loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and titles', () => {
      renderPhotoActions();

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      expect(favoriteButton).toHaveAttribute('title');

      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toHaveAttribute('title');

      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toHaveAttribute('title');

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toHaveAttribute('title');
    });

    it('should handle keyboard navigation', async () => {
      renderPhotoActions();

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      favoriteButton.focus();
      
      expect(document.activeElement).toBe(favoriteButton);

      // Tab to next button
      fireEvent.keyDown(favoriteButton, { key: 'Tab' });
      
      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(document.activeElement).toBe(downloadButton);
    });

    it('should support Enter key activation', async () => {
      renderPhotoActions();

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      favoriteButton.focus();
      
      fireEvent.keyDown(favoriteButton, { key: 'Enter' });
      
      expect(mockOnFavoriteToggle).toHaveBeenCalledWith('photo-1');
    });

    it('should support Space key activation', async () => {
      renderPhotoActions();

      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      favoriteButton.focus();
      
      fireEvent.keyDown(favoriteButton, { key: ' ' });
      
      expect(mockOnFavoriteToggle).toHaveBeenCalledWith('photo-1');
    });
  });

  describe('edge cases', () => {
    it('should handle photo without size', () => {
      const photoWithoutSize = { ...mockPhoto, size: undefined };
      renderPhotoActions({ photo: photoWithoutSize });

      expect(screen.getByText('Test Photo')).toBeInTheDocument();
      // Should not crash when size is undefined
    });

    it('should handle photo with zero size', () => {
      const photoWithZeroSize = { ...mockPhoto, size: 0 };
      renderPhotoActions({ photo: photoWithZeroSize });

      expect(screen.getByText(/0 B/)).toBeInTheDocument();
    });

    it('should handle large file sizes', () => {
      const largePhoto = { ...mockPhoto, size: 1024 * 1024 * 5 }; // 5MB
      renderPhotoActions({ photo: largePhoto });

      expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
    });

    it('should handle photo without timestamp', () => {
      const photoWithoutTimestamp = { ...mockPhoto, timestamp: 0 };
      renderPhotoActions({ photo: photoWithoutTimestamp });

      // Should not crash
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
    });
  });
});