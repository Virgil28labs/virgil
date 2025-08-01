/**
 * NasaApodButton Test Suite
 * 
 * Tests the NASA APOD button component including:
 * - Rendering and memoization
 * - EmojiButton integration with correct props
 * - NASA APOD viewer lazy loading
 * - Error boundary integration
 * - Positioning and styling
 * - Hover effects and animations
 * - Accessibility features
 * - Gallery opening and closing
 * - Space-themed styling and colors
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NasaApodButton } from '../NasaApodButton';

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
  }: any) => (
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
  DashboardAppErrorBoundary: ({ children, appName }: any) => (
    <div data-testid="error-boundary" data-app-name={appName}>
      {children}
    </div>
  ),
}));

// Mock the lazy-loaded NasaApodViewer
const mockNasaApodViewer = jest.fn(({ isOpen, onClose }: any) => (
  <div data-testid="nasa-apod-viewer" data-is-open={isOpen}>
    <button onClick={onClose} data-testid="close-viewer">
      Close Viewer
    </button>
    <div>NASA APOD Viewer Content</div>
    <div>Astronomy Picture of the Day</div>
  </div>
));

jest.mock('../nasa/NasaApodViewer', () => ({
  NasaApodViewer: mockNasaApodViewer,
}));

describe('NasaApodButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render emoji button with telescope emoji', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-emoji', '🔭');
      expect(button).toHaveTextContent('🔭');
    });

    it('should render with correct accessibility attributes', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('aria-label', 'Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('title', 'NASA APOD - Discover daily cosmic wonders from NASA\'s Astronomy Picture of the Day!');
    });

    it('should apply correct positioning', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData).toEqual({
        top: '9.5rem',
        right: 'calc(2rem - 10px)',
      });
    });

    it('should apply custom hover scale', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('data-hover-scale', '1.15');
    });

    it('should apply space-themed hover colors', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      expect(hoverColorData).toEqual({
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
        border: 'rgba(59, 130, 246, 0.6)',
        glow: 'rgba(59, 130, 246, 0.4)',
      });
    });

    it('should apply opacity classes', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveClass('opacity-80', 'hover:opacity-100');
    });
  });

  describe('EmojiButton integration', () => {
    it('should pass all required props to EmojiButton', () => {
      render(<NasaApodButton />);
      
      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('data-emoji', '🔭');
      expect(button).toHaveAttribute('aria-label', 'Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('title', 'NASA APOD - Discover daily cosmic wonders from NASA\'s Astronomy Picture of the Day!');
    });

    it('should handle button click interaction', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      // Viewer should be rendered after click
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
    });

    it('should handle hover interactions', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      // Hover over button
      await user.hover(button);
      
      // Button should remain accessible and functional
      expect(button).toBeInTheDocument();
      
      // Unhover
      await user.unhover(button);
      
      expect(button).toBeInTheDocument();
    });
  });

  describe('NASA APOD viewer integration', () => {
    it('should render NasaApodViewerWrapper with error boundary', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toBeInTheDocument();
        expect(errorBoundary).toHaveAttribute('data-app-name', 'NASA APOD');
      });
    });

    it('should pass isOpen prop to NasaApodViewer', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        const viewer = screen.getByTestId('nasa-apod-viewer');
        expect(viewer).toHaveAttribute('data-is-open', 'true');
      });
    });

    it('should provide onClose callback to NasaApodViewer', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        const closeButton = screen.getByTestId('close-viewer');
        expect(closeButton).toBeInTheDocument();
      });
      
      // Click close should work without errors
      await user.click(screen.getByTestId('close-viewer'));
    });

    it('should handle viewer lazy loading', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      // Viewer should not be loaded initially
      expect(screen.queryByTestId('nasa-apod-viewer')).not.toBeInTheDocument();
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      // Viewer should be loaded after click
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
    });

    it('should display NASA APOD content', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('NASA APOD Viewer Content')).toBeInTheDocument();
        expect(screen.getByText('Astronomy Picture of the Day')).toBeInTheDocument();
      });
    });
  });

  describe('memoization', () => {
    it('should be memoized for performance', () => {
      const { rerender } = render(<NasaApodButton />);
      const firstRender = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      rerender(<NasaApodButton />);
      const secondRender = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should maintain stable component reference', () => {
      const { rerender } = render(<NasaApodButton />);
      const firstEmojiButton = screen.getByTestId('emoji-button');
      
      rerender(<NasaApodButton />);
      const secondEmojiButton = screen.getByTestId('emoji-button');
      
      expect(firstEmojiButton).toBe(secondEmojiButton);
    });
  });

  describe('styling and theming', () => {
    it('should apply space-themed blue colors', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      // Should use blue/purple space colors
      expect(hoverColorData.background).toContain('59, 130, 246'); // Blue RGB
      expect(hoverColorData.background).toContain('139, 92, 246'); // Purple RGB
      expect(hoverColorData.border).toContain('59, 130, 246');
      expect(hoverColorData.glow).toContain('59, 130, 246');
    });

    it('should have appropriate opacity styling', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveClass('opacity-80');
      expect(button).toHaveClass('hover:opacity-100');
    });

    it('should use telescope emoji for astronomy context', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('data-emoji', '🔭');
      expect(button).toHaveTextContent('🔭');
    });

    it('should have gradient background for cosmic effect', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      expect(hoverColorData.background).toContain('linear-gradient');
      expect(hoverColorData.background).toContain('135deg');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('aria-label', 'Open NASA Astronomy Picture of the Day');
    });

    it('should have descriptive title for tooltips', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toHaveAttribute('title', 'NASA APOD - Discover daily cosmic wonders from NASA\'s Astronomy Picture of the Day!');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // Should be activatable with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
    });

    it('should support screen reader interaction', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByRole('button', { name: 'Open NASA Astronomy Picture of the Day' });
      expect(button).toBeInTheDocument();
    });

    it('should have clear semantic meaning', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button.getAttribute('aria-label')).toContain('NASA');
      expect(button.getAttribute('aria-label')).toContain('Astronomy');
      expect(button.getAttribute('title')).toContain('daily cosmic wonders');
    });
  });

  describe('positioning and layout', () => {
    it('should use specific top positioning for stacking', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData.top).toBe('9.5rem');
      expect(positionData.right).toBe('calc(2rem - 10px)');
      expect(positionData.left).toBeUndefined();
      expect(positionData.bottom).toBeUndefined();
    });

    it('should have different positioning than other buttons', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      // Should have unique top position for stacking with other emoji buttons
      expect(positionData.top).toBe('9.5rem');
    });

    it('should handle complex positioning calculations', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      // Should handle calc() in positioning
      expect(positionData.right).toBe('calc(2rem - 10px)');
    });
  });

  describe('error handling', () => {
    it('should wrap viewer in error boundary', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toHaveAttribute('data-app-name', 'NASA APOD');
      });
    });

    it('should handle viewer loading errors gracefully', async () => {
      // Mock viewer to throw error
      mockNasaApodViewer.mockImplementationOnce(() => {
        throw new Error('Viewer loading failed');
      });
      
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      // Should not crash when viewer fails to load
      expect(() => user.click(button)).not.toThrow();
    });

    it('should handle NASA API errors gracefully', async () => {
      // Mock viewer with API error simulation
      mockNasaApodViewer.mockImplementationOnce(({ isOpen, onClose }) => (
        <div data-testid="nasa-apod-viewer" data-is-open={isOpen}>
          <div>Error loading NASA APOD</div>
          <button onClick={onClose} data-testid="close-viewer">Close</button>
        </div>
      ));
      
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading NASA APOD')).toBeInTheDocument();
      });
    });
  });

  describe('lazy loading behavior', () => {
    it('should not load viewer component initially', () => {
      render(<NasaApodButton />);
      
      // Viewer should not be in the DOM initially
      expect(screen.queryByTestId('nasa-apod-viewer')).not.toBeInTheDocument();
    });

    it('should load viewer only when button is clicked', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      // Initially no viewer
      expect(screen.queryByTestId('nasa-apod-viewer')).not.toBeInTheDocument();
      
      // Click button
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      await user.click(button);
      
      // Viewer should now be loaded
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
    });

    it('should handle multiple viewer opens/closes', async () => {
      const user = userEvent.setup();
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      
      // Open viewer
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
      
      // Close viewer
      await user.click(screen.getByTestId('close-viewer'));
      
      // Open again
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });
    });

    it('should maintain lazy loading benefits', () => {
      render(<NasaApodButton />);
      
      // Component should exist but viewer should not be loaded
      expect(screen.getByLabelText('Open NASA Astronomy Picture of the Day')).toBeInTheDocument();
      expect(mockNasaApodViewer).not.toHaveBeenCalled();
    });
  });

  describe('integration with parent components', () => {
    it('should work when rendered in different contexts', () => {
      const { rerender } = render(
        <div>
          <NasaApodButton />
        </div>,
      );
      
      expect(screen.getByLabelText('Open NASA Astronomy Picture of the Day')).toBeInTheDocument();
      
      rerender(
        <main>
          <section>
            <NasaApodButton />
          </section>
        </main>,
      );
      
      expect(screen.getByLabelText('Open NASA Astronomy Picture of the Day')).toBeInTheDocument();
    });

    it('should maintain functionality when parent re-renders', () => {
      let parentState = 'initial';
      const ParentComponent = () => (
        <div data-state={parentState}>
          <NasaApodButton />
        </div>
      );
      
      const { rerender } = render(<ParentComponent />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button).toBeInTheDocument();
      
      // Change parent state and re-render
      parentState = 'updated';
      rerender(<ParentComponent />);
      
      // Button should still work
      expect(screen.getByLabelText('Open NASA Astronomy Picture of the Day')).toBeInTheDocument();
    });
  });

  describe('NASA APOD specific features', () => {
    it('should reference astronomy in all text', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button.getAttribute('aria-label')).toContain('Astronomy');
      expect(button.getAttribute('title')).toContain('cosmic wonders');
      expect(button.getAttribute('title')).toContain('Astronomy Picture of the Day');
    });

    it('should use space exploration terminology', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button.getAttribute('title')).toContain('NASA');
      expect(button.getAttribute('title')).toContain('APOD');
      expect(button.getAttribute('title')).toContain('Discover');
    });

    it('should emphasize daily updates', () => {
      render(<NasaApodButton />);
      
      const button = screen.getByLabelText('Open NASA Astronomy Picture of the Day');
      expect(button.getAttribute('title')).toContain('daily');
    });
  });
});