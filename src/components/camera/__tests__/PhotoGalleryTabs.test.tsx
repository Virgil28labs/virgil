/**
 * PhotoGalleryTabs Component Test Suite
 * 
 * Tests tab navigation, active state display, photo counts,
 * accessibility features, and user interactions.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGalleryTabs } from '../PhotoGalleryTabs';

describe('PhotoGalleryTabs', () => {
  const mockOnTabChange = jest.fn();

  const defaultProps = {
    activeTab: 'camera' as const,
    onTabChange: mockOnTabChange,
    photoCount: 5,
    favoriteCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPhotoGalleryTabs = (props = {}) => {
    return render(<PhotoGalleryTabs {...defaultProps} {...props} />);
  };

  describe('rendering', () => {
    it('should render all tabs', () => {
      renderPhotoGalleryTabs();

      expect(screen.getByRole('button', { name: /switch to camera tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to gallery tab/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to favorites tab/i })).toBeInTheDocument();
    });

    it('should show correct tab icons', () => {
      renderPhotoGalleryTabs();

      expect(screen.getByText('📸')).toBeInTheDocument(); // Camera icon
      expect(screen.getByText('🖼️')).toBeInTheDocument(); // Gallery icon
      expect(screen.getByText('❤️')).toBeInTheDocument(); // Favorites icon
    });

    it('should show correct tab labels', () => {
      renderPhotoGalleryTabs();

      expect(screen.getByText('Camera')).toBeInTheDocument();
      expect(screen.getByText('Gallery')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should show photo count for gallery tab', () => {
      renderPhotoGalleryTabs();

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      expect(galleryTab).toHaveTextContent('5');
    });

    it('should show favorite count for favorites tab', () => {
      renderPhotoGalleryTabs();

      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });
      expect(favoritesTab).toHaveTextContent('2');
    });

    it('should not show count for camera tab', () => {
      renderPhotoGalleryTabs();

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      expect(cameraTab).not.toHaveTextContent(/\d/);
    });

    it('should show zero counts correctly', () => {
      renderPhotoGalleryTabs({ photoCount: 0, favoriteCount: 0 });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab).toHaveTextContent('0');
      expect(favoritesTab).toHaveTextContent('0');
    });

    it('should show large counts correctly', () => {
      renderPhotoGalleryTabs({ photoCount: 999, favoriteCount: 123 });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab).toHaveTextContent('999');
      expect(favoritesTab).toHaveTextContent('123');
    });
  });

  describe('active state', () => {
    it('should mark camera tab as active', () => {
      renderPhotoGalleryTabs({ activeTab: 'camera' });

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      expect(cameraTab).toHaveClass('active');

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });
      expect(galleryTab).not.toHaveClass('active');
      expect(favoritesTab).not.toHaveClass('active');
    });

    it('should mark gallery tab as active', () => {
      renderPhotoGalleryTabs({ activeTab: 'gallery' });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      expect(galleryTab).toHaveClass('active');

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });
      expect(cameraTab).not.toHaveClass('active');
      expect(favoritesTab).not.toHaveClass('active');
    });

    it('should mark favorites tab as active', () => {
      renderPhotoGalleryTabs({ activeTab: 'favorites' });

      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });
      expect(favoritesTab).toHaveClass('active');

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      expect(cameraTab).not.toHaveClass('active');
      expect(galleryTab).not.toHaveClass('active');
    });
  });

  describe('user interactions', () => {
    it('should call onTabChange when camera tab is clicked', async () => {
      renderPhotoGalleryTabs({ activeTab: 'gallery' });

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      await userEvent.click(cameraTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('camera');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should call onTabChange when gallery tab is clicked', async () => {
      renderPhotoGalleryTabs({ activeTab: 'camera' });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      await userEvent.click(galleryTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('gallery');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should call onTabChange when favorites tab is clicked', async () => {
      renderPhotoGalleryTabs({ activeTab: 'camera' });

      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });
      await userEvent.click(favoritesTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('favorites');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should call onTabChange even when clicking active tab', async () => {
      renderPhotoGalleryTabs({ activeTab: 'camera' });

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      await userEvent.click(cameraTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('camera');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid clicks', async () => {
      renderPhotoGalleryTabs();

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      await userEvent.click(galleryTab);
      await userEvent.click(favoritesTab);
      await userEvent.click(galleryTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'gallery');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'favorites');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'gallery');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderPhotoGalleryTabs();

      expect(screen.getByRole('button', { name: 'Switch to Camera tab' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Gallery tab' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Favorites tab' })).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderPhotoGalleryTabs();

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });

      // Focus first tab
      cameraTab.focus();
      expect(document.activeElement).toBe(cameraTab);

      // Tab to next button
      await userEvent.tab();
      expect(document.activeElement).toBe(galleryTab);
    });

    it('should support Enter key activation', async () => {
      renderPhotoGalleryTabs();

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      galleryTab.focus();

      await userEvent.keyboard('{Enter}');

      expect(mockOnTabChange).toHaveBeenCalledWith('gallery');
    });

    it('should support Space key activation', async () => {
      renderPhotoGalleryTabs();

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      galleryTab.focus();

      await userEvent.keyboard(' ');

      expect(mockOnTabChange).toHaveBeenCalledWith('gallery');
    });
  });

  describe('styling and structure', () => {
    it('should have correct CSS classes', () => {
      renderPhotoGalleryTabs();

      const container = screen.getByRole('button', { name: /switch to camera tab/i }).parentElement;
      expect(container).toHaveClass('photo-gallery-tabs');

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      expect(cameraTab).toHaveClass('photo-gallery-tab');
      expect(cameraTab).toHaveClass('active');
    });

    it('should show tab structure correctly', () => {
      renderPhotoGalleryTabs();

      const cameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      
      // Should contain icon, label, and no count
      expect(cameraTab?.querySelector('.tab-icon')).toHaveTextContent('📸');
      expect(cameraTab?.querySelector('.tab-label')).toHaveTextContent('Camera');
      expect(cameraTab?.querySelector('.tab-count')).toBeNull();
    });

    it('should show count elements for tabs with counts', () => {
      renderPhotoGalleryTabs();

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab?.querySelector('.tab-count')).toHaveTextContent('5');
      expect(favoritesTab?.querySelector('.tab-count')).toHaveTextContent('2');
    });
  });

  describe('memoization', () => {
    it('should be memoized and not re-render with same props', () => {
      const { rerender } = renderPhotoGalleryTabs();
      
      const initialCameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      
      // Re-render with same props
      rerender(<PhotoGalleryTabs {...defaultProps} />);
      
      const rerenderCameraTab = screen.getByRole('button', { name: /switch to camera tab/i });
      
      // Should be the same element due to memoization
      expect(initialCameraTab).toBe(rerenderCameraTab);
    });

    it('should re-render when props change', () => {
      const { rerender } = renderPhotoGalleryTabs();
      
      const initialGalleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      expect(initialGalleryTab).toHaveTextContent('5');
      
      // Re-render with different photo count
      rerender(<PhotoGalleryTabs {...defaultProps} photoCount={10} />);
      
      const updatedGalleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      expect(updatedGalleryTab).toHaveTextContent('10');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined callback gracefully', () => {
      const { container } = render(
        <PhotoGalleryTabs
          activeTab="camera"
          onTabChange={undefined as any}
          photoCount={5}
          favoriteCount={2}
        />,
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle negative counts', () => {
      renderPhotoGalleryTabs({ photoCount: -1, favoriteCount: -5 });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab).toHaveTextContent('-1');
      expect(favoritesTab).toHaveTextContent('-5');
    });

    it('should handle very large numbers', () => {
      renderPhotoGalleryTabs({ photoCount: 99999, favoriteCount: 12345 });

      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab).toHaveTextContent('99999');
      expect(favoritesTab).toHaveTextContent('12345');
    });
  });

  describe('performance', () => {
    it('should handle frequent prop changes efficiently', () => {
      const { rerender } = renderPhotoGalleryTabs();

      // Simulate frequent count updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <PhotoGalleryTabs
            {...defaultProps}
            photoCount={i}
            favoriteCount={i * 2}
          />,
        );
      }

      // Should render final values correctly
      const galleryTab = screen.getByRole('button', { name: /switch to gallery tab/i });
      const favoritesTab = screen.getByRole('button', { name: /switch to favorites tab/i });

      expect(galleryTab).toHaveTextContent('9');
      expect(favoritesTab).toHaveTextContent('18');
    });

    it('should handle frequent active tab changes', () => {
      const { rerender } = renderPhotoGalleryTabs();

      const tabs: Array<'camera' | 'gallery' | 'favorites'> = ['camera', 'gallery', 'favorites'];

      // Simulate rapid tab changes
      tabs.forEach(tab => {
        rerender(<PhotoGalleryTabs {...defaultProps} activeTab={tab} />);
        
        const activeTab = screen.getByRole('button', { name: new RegExp(`switch to ${tab} tab`, 'i') });
        expect(activeTab).toHaveClass('active');
      });
    });
  });
});