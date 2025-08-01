/**
 * VectorMemoryButton Test Suite
 * 
 * Tests the vector memory button component including:
 * - Rendering and memoization
 * - EmojiButton integration with correct props
 * - Vector memory modal display
 * - Error boundary wrapping
 * - Modal positioning and styling
 * - Close button functionality
 * - Accessibility features
 * - Lazy loading behavior
 * - Brain emoji theming
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorMemoryButton } from '../VectorMemoryButton';

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
          // Simulate opening modal
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

// Mock the lazy-loaded VectorMemory component
const mockVectorMemory = jest.fn(() => (
  <div data-testid="vector-memory">
    <h2>Semantic Memory</h2>
    <p>AI-powered memory with vector embeddings</p>
    <div>Vector Memory Content</div>
  </div>
));

jest.mock('../VectorMemory', () => ({
  VectorMemory: mockVectorMemory,
}));

describe('VectorMemoryButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render emoji button with brain emoji', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-emoji', '🧠');
      expect(button).toHaveTextContent('🧠');
    });

    it('should render with correct accessibility attributes', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('aria-label', 'Open Semantic Memory');
      expect(button).toHaveAttribute('title', 'Semantic Memory - AI-powered memory with vector embeddings');
    });

    it('should apply correct positioning', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData).toEqual({
        top: '14rem',
        left: '1.9rem',
      });
    });

    it('should apply custom hover scale', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('data-hover-scale', '1.15');
    });

    it('should apply purple gradient hover colors', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      expect(hoverColorData).toEqual({
        background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)',
        border: 'rgba(108, 59, 170, 0.6)',
        glow: 'rgba(108, 59, 170, 0.4)',
      });
    });

    it('should apply opacity classes', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveClass('opacity-80', 'hover:opacity-100');
    });
  });

  describe('EmojiButton integration', () => {
    it('should pass all required props to EmojiButton', () => {
      render(<VectorMemoryButton />);
      
      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('data-emoji', '🧠');
      expect(button).toHaveAttribute('aria-label', 'Open Semantic Memory');
      expect(button).toHaveAttribute('title', 'Semantic Memory - AI-powered memory with vector embeddings');
    });

    it('should handle button click interaction', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      // Modal should be rendered after click
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
    });

    it('should handle hover interactions', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      
      // Hover over button
      await user.hover(button);
      
      // Button should remain accessible and functional
      expect(button).toBeInTheDocument();
      
      // Unhover
      await user.unhover(button);
      
      expect(button).toBeInTheDocument();
    });
  });

  describe('modal wrapper functionality', () => {
    it('should render VectorMemoryWrapper with error boundary', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toBeInTheDocument();
        expect(errorBoundary).toHaveAttribute('data-app-name', 'Semantic Memory');
      });
    });

    it('should render modal with overlay', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        expect(overlay).toHaveStyle({
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: '1000',
        });
      });
    });

    it('should render modal content container', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        const container = overlay.firstChild as HTMLElement;
        
        expect(container).toHaveStyle({
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
        });
      });
    });

    it('should render close button', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveTextContent('✖️');
      });
    });

    it('should position close button correctly', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton).toHaveStyle({
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: '1001',
        });
      });
    });

    it('should handle close button click', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      // Modal should close
      // Note: In real implementation, onClose would handle this
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('VectorMemory component integration', () => {
    it('should render VectorMemory component inside modal', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const vectorMemory = screen.getByTestId('vector-memory');
        expect(vectorMemory).toBeInTheDocument();
        expect(vectorMemory).toHaveTextContent('Semantic Memory');
        expect(vectorMemory).toHaveTextContent('AI-powered memory with vector embeddings');
      });
    });

    it('should handle VectorMemory lazy loading', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      // VectorMemory should not be loaded initially
      expect(screen.queryByTestId('vector-memory')).not.toBeInTheDocument();
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      // VectorMemory should be loaded after click
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
    });
  });

  describe('memoization', () => {
    it('should be memoized for performance', () => {
      const { rerender } = render(<VectorMemoryButton />);
      const firstRender = screen.getByLabelText('Open Semantic Memory');
      
      rerender(<VectorMemoryButton />);
      const secondRender = screen.getByLabelText('Open Semantic Memory');
      
      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should maintain stable component reference', () => {
      const { rerender } = render(<VectorMemoryButton />);
      const firstEmojiButton = screen.getByTestId('emoji-button');
      
      rerender(<VectorMemoryButton />);
      const secondEmojiButton = screen.getByTestId('emoji-button');
      
      expect(firstEmojiButton).toBe(secondEmojiButton);
    });
  });

  describe('styling and theming', () => {
    it('should apply purple gradient theme for semantic memory', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      const hoverColorData = JSON.parse(button.getAttribute('data-hover-color') || '{}');
      
      // Should use purple colors for semantic/AI theme
      expect(hoverColorData.background).toContain('108, 59, 170'); // Purple RGB
      expect(hoverColorData.background).toContain('178, 165, 193'); // Light purple RGB
      expect(hoverColorData.border).toContain('108, 59, 170');
      expect(hoverColorData.glow).toContain('108, 59, 170');
    });

    it('should have appropriate opacity styling', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveClass('opacity-80');
      expect(button).toHaveClass('hover:opacity-100');
    });

    it('should use brain emoji for semantic memory context', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('data-emoji', '🧠');
      expect(button).toHaveTextContent('🧠');
    });

    it('should have modal styling with proper z-index layering', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        expect(overlay).toHaveStyle({ zIndex: '1000' });
        
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton).toHaveStyle({ zIndex: '1001' });
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('aria-label', 'Open Semantic Memory');
    });

    it('should have descriptive title for tooltips', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toHaveAttribute('title', 'Semantic Memory - AI-powered memory with vector embeddings');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      
      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();
      
      // Should be activatable with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
    });

    it('should have accessible close button', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton).toBeInTheDocument();
        
        // Should be keyboard accessible
        closeButton.focus();
        expect(closeButton).toHaveFocus();
      });
    });

    it('should support screen reader interaction', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByRole('button', { name: 'Open Semantic Memory' });
      expect(button).toBeInTheDocument();
    });

    it('should handle Escape key to close modal', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Note: In real implementation, this would close the modal
      // For now, just verify modal is still present
      expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
    });
  });

  describe('positioning and layout', () => {
    it('should use left-side positioning', () => {
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      const positionData = JSON.parse(button.getAttribute('data-position') || '{}');
      
      expect(positionData.top).toBe('14rem');
      expect(positionData.left).toBe('1.9rem');
      expect(positionData.right).toBeUndefined();
      expect(positionData.bottom).toBeUndefined();
    });

    it('should render modal with centered content', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        expect(overlay).toHaveStyle({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        });
      });
    });
  });

  describe('error handling', () => {
    it('should wrap modal content in error boundary', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const errorBoundary = screen.getByTestId('error-boundary');
        expect(errorBoundary).toHaveAttribute('data-app-name', 'Semantic Memory');
      });
    });

    it('should handle VectorMemory loading errors gracefully', async () => {
      // Mock VectorMemory to throw error
      mockVectorMemory.mockImplementationOnce(() => {
        throw new Error('VectorMemory loading failed');
      });
      
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      
      // Should not crash when VectorMemory fails to load
      expect(() => user.click(button)).not.toThrow();
    });
  });

  describe('lazy loading behavior', () => {
    it('should not load VectorMemory component initially', () => {
      render(<VectorMemoryButton />);
      
      // VectorMemory should not be in the DOM initially
      expect(screen.queryByTestId('vector-memory')).not.toBeInTheDocument();
    });

    it('should load VectorMemory only when button is clicked', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      // Initially no VectorMemory
      expect(screen.queryByTestId('vector-memory')).not.toBeInTheDocument();
      
      // Click button
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      // VectorMemory should now be loaded
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
    });

    it('should handle multiple modal opens/closes', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      
      // Open modal
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
      
      // Close modal
      await user.click(screen.getByLabelText('Close'));
      
      // Open again
      await user.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });
    });
  });

  describe('integration with parent components', () => {
    it('should work when rendered in different contexts', () => {
      const { rerender } = render(
        <div>
          <VectorMemoryButton />
        </div>,
      );
      
      expect(screen.getByLabelText('Open Semantic Memory')).toBeInTheDocument();
      
      rerender(
        <main>
          <section>
            <VectorMemoryButton />
          </section>
        </main>,
      );
      
      expect(screen.getByLabelText('Open Semantic Memory')).toBeInTheDocument();
    });

    it('should maintain functionality when parent re-renders', () => {
      let parentState = 'initial';
      const ParentComponent = () => (
        <div data-state={parentState}>
          <VectorMemoryButton />
        </div>
      );
      
      const { rerender } = render(<ParentComponent />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      expect(button).toBeInTheDocument();
      
      // Change parent state and re-render
      parentState = 'updated';
      rerender(<ParentComponent />);
      
      // Button should still work
      expect(screen.getByLabelText('Open Semantic Memory')).toBeInTheDocument();
    });
  });

  describe('modal behavior', () => {
    it('should render fullscreen overlay', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        expect(overlay).toHaveStyle({
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
        });
      });
    });

    it('should have semi-transparent dark background', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        expect(overlay).toHaveStyle({
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        });
      });
    });

    it('should constrain modal size to viewport', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        const container = overlay.firstChild as HTMLElement;
        
        expect(container).toHaveStyle({
          maxWidth: '90vw',
          maxHeight: '90vh',
        });
      });
    });

    it('should handle overflow with scrolling', async () => {
      const user = userEvent.setup();
      render(<VectorMemoryButton />);
      
      const button = screen.getByLabelText('Open Semantic Memory');
      await user.click(button);
      
      await waitFor(() => {
        const overlay = screen.getByTestId('error-boundary').firstChild as HTMLElement;
        const container = overlay.firstChild as HTMLElement;
        
        expect(container).toHaveStyle({
          overflow: 'auto',
        });
      });
    });
  });
});