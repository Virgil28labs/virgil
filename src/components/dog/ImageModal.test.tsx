import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageModal } from './ImageModal';
import { downloadImage, copyImageToClipboard } from './utils/imageUtils';
import type { DogImage } from './hooks/useDogApi';
import { logger } from '../../lib/logger';

// Mock imageUtils
jest.mock('./utils/imageUtils', () => ({
  stopEvent: jest.fn((e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  }),
  downloadImage: jest.fn(),
  copyImageToClipboard: jest.fn(),
}));

// Mock logger
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockDownloadImage = downloadImage as jest.MockedFunction<typeof downloadImage>;
const mockCopyImageToClipboard = copyImageToClipboard as jest.MockedFunction<typeof copyImageToClipboard>;

describe('ImageModal', () => {
  const mockDogs: DogImage[] = [
    { url: 'https://example.com/dog1.jpg', breed: 'akita', id: 'dog-1' },
    { url: 'https://example.com/dog2.jpg', breed: 'beagle', id: 'dog-2' },
    { url: 'https://example.com/dog3.jpg', breed: 'corgi', id: 'dog-3' },
  ];

  const defaultProps = {
    dogs: mockDogs,
    currentIndex: 1,
    isFavorited: jest.fn((url: string) => url === 'https://example.com/dog2.jpg'),
    onClose: jest.fn(),
    onNavigate: jest.fn(),
    onFavoriteToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with current dog image', () => {
      render(<ImageModal {...defaultProps} />);

      const image = screen.getByAltText('beagle dog');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/dog2.jpg');
    });

    it('should render null when currentIndex is null', () => {
      const { container } = render(<ImageModal {...defaultProps} currentIndex={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render action buttons', () => {
      render(<ImageModal {...defaultProps} />);

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('Download image')).toBeInTheDocument();
      expect(screen.getByLabelText('Copy image')).toBeInTheDocument();
    });

    it('should render navigation buttons appropriately', () => {
      const { rerender } = render(<ImageModal {...defaultProps} currentIndex={1} />);

      // Middle image - both buttons
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();

      // First image - only next
      rerender(<ImageModal {...defaultProps} currentIndex={0} />);
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();

      // Last image - only previous
      rerender(<ImageModal {...defaultProps} currentIndex={2} />);
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    });

    it('should render counter', () => {
      render(<ImageModal {...defaultProps} />);
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ImageModal {...defaultProps} />);
      expect(screen.getByLabelText('Close image')).toBeInTheDocument();
    });

    it('should show correct favorite button state', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);

      // Favorited
      expect(screen.getByLabelText('Remove from favorites')).toHaveTextContent('❤️');

      // Not favorited
      rerender(<ImageModal {...defaultProps} currentIndex={0} />);
      expect(screen.getByLabelText('Add to favorites')).toHaveTextContent('🤍');
    });
  });

  describe('interactions', () => {
    it('should close modal when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const modal = document.querySelector('.doggo-image-modal');
      if (!modal) throw new Error('Modal not found');
      await user.click(modal);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when clicking image', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const image = screen.getByAltText('beagle dog');
      await user.click(image);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should close modal when clicking close button', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close image');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should navigate to previous image', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const prevButton = screen.getByLabelText('Previous image');
      await user.click(prevButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith(0);
    });

    it('should navigate to next image', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const nextButton = screen.getByLabelText('Next image');
      await user.click(nextButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith(2);
    });

    it('should toggle favorite', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const favoriteButton = screen.getByLabelText('Remove from favorites');
      await user.click(favoriteButton);

      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledWith(mockDogs[1]);
    });

    it('should download image', async () => {
      const user = userEvent.setup();
      mockDownloadImage.mockResolvedValueOnce(undefined);

      render(<ImageModal {...defaultProps} />);

      const downloadButton = screen.getByLabelText('Download image');
      await user.click(downloadButton);

      expect(mockDownloadImage).toHaveBeenCalledWith('https://example.com/dog2.jpg', 'beagle');
    });

    it('should handle download error', async () => {
      const user = userEvent.setup();
      mockDownloadImage.mockRejectedValueOnce(new Error('Download failed'));
      const mockLoggerError = logger.error as jest.Mock;
      mockLoggerError.mockClear();

      render(<ImageModal {...defaultProps} />);

      const downloadButton = screen.getByLabelText('Download image');
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Failed to download image',
          expect.any(Error),
          expect.objectContaining({
            component: 'ImageModal',
            action: 'handleDownload',
            metadata: expect.objectContaining({
              imageUrl: 'https://example.com/dog2.jpg',
            }),
          }),
        );
      });
    });

    it('should copy image URL', async () => {
      const user = userEvent.setup();
      mockCopyImageToClipboard.mockResolvedValueOnce(true);

      render(<ImageModal {...defaultProps} />);

      const copyButton = screen.getByLabelText('Copy image');
      await user.click(copyButton);

      expect(mockCopyImageToClipboard).toHaveBeenCalledWith('https://example.com/dog2.jpg');
    });

    it('should handle copy error', async () => {
      const user = userEvent.setup();
      mockCopyImageToClipboard.mockRejectedValueOnce(new Error('Copy failed'));
      const mockLoggerError = logger.error as jest.Mock;
      mockLoggerError.mockClear();

      render(<ImageModal {...defaultProps} />);

      const copyButton = screen.getByLabelText('Copy image');
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Failed to copy image',
          expect.any(Error),
          expect.objectContaining({
            component: 'ImageModal',
            action: 'handleCopy',
            metadata: expect.objectContaining({
              imageUrl: 'https://example.com/dog2.jpg',
            }),
          }),
        );
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should close modal on Escape key', () => {
      render(<ImageModal {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should navigate to previous image on ArrowLeft', () => {
      render(<ImageModal {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(defaultProps.onNavigate).toHaveBeenCalledWith(0);
    });

    it('should navigate to next image on ArrowRight', () => {
      render(<ImageModal {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(defaultProps.onNavigate).toHaveBeenCalledWith(2);
    });

    it('should not navigate past boundaries', () => {
      const { rerender } = render(<ImageModal {...defaultProps} currentIndex={0} />);

      // Try to go previous from first image
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(defaultProps.onNavigate).not.toHaveBeenCalled();

      // Go to last image
      rerender(<ImageModal {...defaultProps} currentIndex={2} />);

      // Try to go next from last image
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(defaultProps.onNavigate).not.toHaveBeenCalled();
    });

    it('should cleanup keyboard event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<ImageModal {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should not add keyboard listener when currentIndex is null', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      render(<ImageModal {...defaultProps} currentIndex={null} />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });
  });

  describe('memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);
      
      const image = screen.getByAltText('beagle dog');
      const originalImage = image;

      // Re-render with same props
      rerender(<ImageModal {...defaultProps} />);

      // Should be the same element instance
      expect(screen.getByAltText('beagle dog')).toBe(originalImage);
    });

    it('should re-render when currentIndex changes', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);
      
      expect(screen.getByAltText('beagle dog')).toBeInTheDocument();

      rerender(<ImageModal {...defaultProps} currentIndex={0} />);

      expect(screen.getByAltText('akita dog')).toBeInTheDocument();
    });

    it('should re-render when dogs array changes', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);
      
      expect(screen.getByText('2 / 3')).toBeInTheDocument();

      const newDogs = [...mockDogs, { url: 'https://example.com/dog4.jpg', breed: 'husky', id: 'dog-4' }];
      rerender(<ImageModal {...defaultProps} dogs={newDogs} />);

      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('should re-render when isFavorited changes', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();

      const newIsFavorited = jest.fn(() => false);
      rerender(<ImageModal {...defaultProps} isFavorited={newIsFavorited} />);

      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty dogs array', () => {
      const { container } = render(<ImageModal {...defaultProps} dogs={[]} currentIndex={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle out of bounds currentIndex', () => {
      const { container } = render(<ImageModal {...defaultProps} currentIndex={10} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle negative currentIndex', () => {
      const { container } = render(<ImageModal {...defaultProps} currentIndex={-1} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle single dog array', () => {
      render(<ImageModal {...defaultProps} dogs={[mockDogs[0]]} currentIndex={0} />);

      // No navigation buttons
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();

      // Counter shows 1 / 1
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('should handle rapid navigation clicks', async () => {
      const user = userEvent.setup();
      render(<ImageModal {...defaultProps} />);

      const nextButton = screen.getByLabelText('Next image');
      
      // Click multiple times rapidly
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Should only navigate once per click
      expect(defaultProps.onNavigate).toHaveBeenCalledTimes(3);
    });

    it('should handle all actions when no current dog', () => {
      const { rerender } = render(<ImageModal {...defaultProps} />);
      
      // Force a state where currentIndex is valid but dog is not found
      rerender(<ImageModal {...defaultProps} dogs={[]} currentIndex={0} />);

      // Modal should not render
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});