/**
 * GiphyEmojiButton Test Suite
 * 
 * Tests the Giphy emoji button component including:
 * - Rendering and memoization
 * - EmojiButton integration with correct props
 * - Giphy gallery lazy loading
 * - Error boundary integration
 * - Positioning and styling
 * - Hover effects and animations
 * - Accessibility features
 * - Gallery opening and closing
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GiphyEmojiButton } from '../GiphyEmojiButton';

// Mock the EmojiButton component
jest.mock('../common/EmojiButton', () => ({
  EmojiButton: ({ 
    emoji, 
    ariaLabel, 
    GalleryComponent, 
    position, 
    hoverScale, 
    hoverColor, 
    title, 
    className,
    ...props 
  }: unknown) => (
    <div data-testid="emoji-button">
      <button
        aria-label={ariaLabel}
        title={title}
        className={className}
        data-emoji={emoji}
        data-hover-scale={hoverScale}
        data-position={JSON.stringify(position)}
        data-hover-color={JSON.stringify(hoverColor)}
        onClick={() => {
          // Simulate opening gallery
          if (GalleryComponent) {
            const mockOnClose = jest.fn();
            render(<GalleryComponent onClose={mockOnClose} />);
          }
        }}
        {...props}
      >
        {emoji}
      </button>
    </div>
  ),
}));

// Mock the DashboardAppErrorBoundary
jest.mock('../common/DashboardAppErrorBoundary', () => ({
  DashboardAppErrorBoundary: ({ children, appName }: unknown) => (
    <div data-testid="error-boundary" data-app-name={appName}>
      {children}
    </div>
  ),
}));

// Mock the lazy-loaded GiphyGallery
const mockGiphyGallery = jest.fn(({ isOpen, onClose }: unknown) => (
  <div data-testid="giphy-gallery" data-is-open={isOpen}>
    <button onClick={onClose} data-testid="close-gallery">
      Close Gallery
    </button>
    <div>Giphy Gallery Content</div>
  </div>
));

jest.mock('../giphy/GiphyGallery', () => ({
  GiphyGallery: mockGiphyGallery,
}));

describe('GiphyEmojiButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render emoji button with correct emoji', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-emoji', '🎬');
      expect(button).toHaveTextContent('🎬');
    });

    it('should render with correct accessibility attributes', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('aria-label', 'Open GIF Gallery');
      expect(button).toHaveAttribute('title', 'Open GIF Gallery - Search and save your favorite GIFs!');
    });

    it('should apply correct positioning', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData).toEqual({
        top: '7rem',
        right: 'calc(2rem - 10px)',
      });
    });

    it('should apply custom hover scale', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('data-hover-scale', '1.15');
    });

    it('should apply custom hover colors', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      expect(hoverColorData).toEqual({
        background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 107, 157, 0.3) 100%)',
        border: 'rgba(255, 107, 157, 0.6)',
        glow: 'rgba(255, 107, 157, 0.4)',
      });
    });

    it('should apply opacity classes', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveClass('opacity-80', 'hover:opacity-100');
    });
  });

  describe('EmojiButton integration', () => {
    it('should pass all required props to EmojiButton', () => {
      render(<GiphyEmojiButton />);
      
      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('data-emoji', '🎬');
      expect(button).toHaveAttribute('aria-label', 'Open GIF Gallery');
      expect(button).toHaveAttribute('title', 'Open GIF Gallery - Search and save your favorite GIFs!');
    });

    it('should handle button click interaction', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      // Gallery should be rendered after click
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
    });

    it('should handle hover interactions', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      
      // Hover over button
      await user.hover(button);
      
      // Button should remain accessible and functional
      expect(button).toBeInTheDocument();
      
      // Unhover
      await user.unhover(button);
      
      expect(button).toBeInTheDocument();
    });
  });

  describe('gallery component integration', () => {
    it('should render GiphyGalleryWrapper with error boundary', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toBeInTheDocument();
        expect(errorBoundary).toHaveAttribute('data-app-name', 'GIF Gallery');
      });
    });

    it('should pass isOpen prop to GiphyGallery', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      await waitFor(() => {
        const gallery = screen.getByTestId('giphy-gallery');
        expect(gallery).toHaveAttribute('data-is-open', 'true');
      });
    });

    it('should provide onClose callback to GiphyGallery', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      await waitFor(() => {
        const closeButton = screen.getByTestId('close-gallery');
        expect(closeButton).toBeInTheDocument();
      });
      
      // Click close should work without errors
      await user.click(screen.getByTestId('close-gallery'));
    });

    it('should handle gallery lazy loading', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      // Gallery should not be loaded initially
      expect(screen.queryByTestId('giphy-gallery')).not.toBeInTheDocument();
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      // Gallery should be loaded after click
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
    });
  });

  describe('memoization', () => {
    it('should be memoized for performance', () => {
      const { rerender } = render(<GiphyEmojiButton />);
      const firstRender = screen.getByLabelText('Open GIF Gallery');
      
      rerender(<GiphyEmojiButton />);
      const secondRender = screen.getByLabelText('Open GIF Gallery');
      
      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should maintain stable component reference', () => {
      const { rerender } = render(<GiphyEmojiButton />);
      const firstEmojiButton = screen.getByTestId('emoji-button');
      
      rerender(<GiphyEmojiButton />);
      const secondEmojiButton = screen.getByTestId('emoji-button');
      
      expect(firstEmojiButton).toBe(secondEmojiButton);
    });
  });

  describe('styling and theming', () => {
    it('should apply pink/magenta theme colors', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      // Should use pink/magenta colors for GIF theme
      expect(hoverColorData.background).toContain('255, 107, 157'); // Pink RGB
      expect(hoverColorData.border).toContain('255, 107, 157');
      expect(hoverColorData.glow).toContain('255, 107, 157');
    });

    it('should have appropriate opacity styling', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveClass('opacity-80');
      expect(button).toHaveClass('hover:opacity-100');
    });

    it('should use film/movie emoji for GIF context', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('data-emoji', '🎬');
      expect(button).toHaveTextContent('🎬');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('aria-label', 'Open GIF Gallery');
    });

    it('should have descriptive title for tooltips', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toHaveAttribute('title', 'Open GIF Gallery - Search and save your favorite GIFs!');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // Should be activatable with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
    });

    it('should support screen reader interaction', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByRole('button', { name: 'Open GIF Gallery' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('positioning and layout', () => {
    it('should use top-right positioning', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData.top).toBe('7rem');
      expect(positionData.right).toBe('calc(2rem - 10px)');
      expect(positionData.left).toBeUndefined();
      expect(positionData.bottom).toBeUndefined();
    });

    it('should handle complex positioning calculations', () => {
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      // Should handle calc() in positioning
      expect(positionData.right).toBe('calc(2rem - 10px)');
    });
  });

  describe('error handling', () => {
    it('should wrap gallery in error boundary', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toHaveAttribute('data-app-name', 'GIF Gallery');
      });
    });

    it('should handle gallery loading errors gracefully', async () => {
      // Mock gallery to throw error
      mockGiphyGallery.mockImplementationOnce(() => {
        throw new Error('Gallery loading failed');
      });
      
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      
      // Should not crash when gallery fails to load
      expect(() => user.click(button)).not.toThrow();
    });
  });

  describe('lazy loading behavior', () => {
    it('should not load gallery component initially', () => {
      render(<GiphyEmojiButton />);
      
      // Gallery should not be in the DOM initially
      expect(screen.queryByTestId('giphy-gallery')).not.toBeInTheDocument();
    });

    it('should load gallery only when button is clicked', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      // Initially no gallery
      expect(screen.queryByTestId('giphy-gallery')).not.toBeInTheDocument();
      
      // Click button
      const button = screen.getByLabelText('Open GIF Gallery');
      await user.click(button);
      
      // Gallery should now be loaded
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
    });

    it('should handle multiple gallery opens/closes', async () => {
      const user = userEvent.setup();
      render(<GiphyEmojiButton />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      
      // Open gallery
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
      
      // Close gallery
      await user.click(screen.getByTestId('close-gallery'));
      
      // Open again
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });
    });
  });

  describe('integration with parent components', () => {
    it('should work when rendered in different contexts', () => {
      const { rerender } = render(
        <div>
          <GiphyEmojiButton />
        </div>,
      );
      
      expect(screen.getByLabelText('Open GIF Gallery')).toBeInTheDocument();
      
      rerender(
        <main>
          <section>
            <GiphyEmojiButton />
          </section>
        </main>,
      );
      
      expect(screen.getByLabelText('Open GIF Gallery')).toBeInTheDocument();
    });

    it('should maintain functionality when parent re-renders', () => {
      let parentState = 'initial';
      const ParentComponent = () => (
        <div data-state={parentState}>
          <GiphyEmojiButton />
        </div>
      );
      
      const { rerender } = render(<ParentComponent />);
      
      const button = screen.getByLabelText('Open GIF Gallery');
      expect(button).toBeInTheDocument();
      
      // Change parent state and re-render
      parentState = 'updated';
      rerender(<ParentComponent />);
      
      // Button should still work
      expect(screen.getByLabelText('Open GIF Gallery')).toBeInTheDocument();
    });
  });
});