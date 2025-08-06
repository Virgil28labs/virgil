/**
 * Sparkles Component Test Suite
 * 
 * Tests sparkle animation effects for raccoon interactions.
 * Simple conditional rendering component with position-based animations.
 */

import { render, screen } from '@testing-library/react';
import { Sparkles } from '../Sparkles';

// Mock sparkle positions from constants
jest.mock('../../../constants/raccoonConstants', () => ({
  SPARKLE_POSITIONS: [
    { x: -20, y: -10, emoji: '✨' },
    { x: 20, y: -15, emoji: '💫' },
    { x: 0, y: -25, emoji: '⭐' },
    { x: -10, y: 5, emoji: '✨' },
    { x: 15, y: -5, emoji: '💫' },
  ],
}));

// Mock styles
jest.mock('../raccoonStyles', () => ({
  styles: {
    sparkleContainer: {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 10,
    },
    sparklePosition: (pos: { x: number; y: number }) => ({
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      fontSize: '16px',
      animation: 'sparkle 1s ease-out',
      pointerEvents: 'none',
    }),
  },
}));

describe('Sparkles', () => {
  describe('Conditional Rendering', () => {
    it('renders sparkles when show is true', () => {
      render(<Sparkles show />);
      
      // Should render sparkle container
      const container = document?.querySelector('[style*="absolute"]');
      expect(container).toBeInTheDocument();
      
      // Should render all sparkle emojis (there may be multiple of each type)
      expect(screen.getAllByText('✨')).toHaveLength(2); // There are 2 ✨ emojis
      expect(screen.getAllByText('💫')).toHaveLength(2); // There are 2 💫 emojis  
      expect(screen.getByText('⭐')).toBeInTheDocument(); // There is 1 ⭐ emoji
    });

    it('renders nothing when show is false', () => {
      render(<Sparkles show={false} />);
      
      // Should not render any sparkles
      expect(screen.queryByText('✨')).not.toBeInTheDocument();
      expect(screen.queryByText('💫')).not.toBeInTheDocument();
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    it('returns null when show is false', () => {
      const { container } = render(<Sparkles show={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Sparkle Positioning', () => {
    it('renders sparkles at correct positions', () => {
      render(<Sparkles show />);
      
      const sparkleElements = document.querySelectorAll('[style*="absolute"]');
      
      // Should have container plus individual sparkles
      expect(sparkleElements.length).toBeGreaterThan(5);
      
      // Check that sparkles have position styles applied
      const sparkles = Array.from(sparkleElements).slice(1); // Skip container
      sparkles.forEach(sparkle => {
        const style = (sparkle as HTMLElement).style;
        expect(style.position).toBe('absolute');
        expect(style.left).toMatch(/^-?\d+px$/);
        expect(style.top).toMatch(/^-?\d+px$/);
      });
    });

    it('applies correct emoji to each sparkle', () => {
      render(<Sparkles show />);
      
      // Should render multiple sparkle emojis (some may be duplicated)
      const allSparkles = screen.getAllByText(/[✨💫⭐]/u);
      expect(allSparkles.length).toBe(5);
      
      // Check specific emojis are present
      expect(screen.getAllByText('✨')).toHaveLength(2); // Appears twice in mock data
      expect(screen.getAllByText('💫')).toHaveLength(2); // Appears twice in mock data
      expect(screen.getAllByText('⭐')).toHaveLength(1); // Appears once in mock data
    });
  });

  describe('Styling', () => {
    it('applies sparkle container styles', () => {
      render(<Sparkles show />);
      
      const container = document?.querySelector('[style*="absolute"]');
      expect(container).toHaveStyle({
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: '10',
      });
    });

    it('applies individual sparkle styles', () => {
      render(<Sparkles show />);
      
      const sparkleElements = document.querySelectorAll('[style*="absolute"]');
      const sparkles = Array.from(sparkleElements).slice(1); // Skip container
      
      sparkles.forEach(sparkle => {
        const element = sparkle as HTMLElement;
        expect(element.style.position).toBe('absolute');
        expect(element.style.fontSize).toBe('16px');
        expect(element.style.animation).toBe('sparkle 1s ease-out');
        expect(element.style.pointerEvents).toBe('none');
      });
    });
  });

  describe('Animation Properties', () => {
    it('applies sparkle animation to all sparkles', () => {
      render(<Sparkles show />);
      
      const sparkleElements = document.querySelectorAll('[style*="sparkle 1s ease-out"]');
      expect(sparkleElements.length).toBe(5);
    });

    it('disables pointer events for all sparkles', () => {
      render(<Sparkles show />);
      
      const sparkleElements = document.querySelectorAll('[style*="pointer-events: none"]');
      expect(sparkleElements.length).toBeGreaterThanOrEqual(5); // Container + sparkles
    });
  });

  describe('Accessibility', () => {
    it('sparkles are decorative and not interactive', () => {
      render(<Sparkles show />);
      
      const sparkleElements = document.querySelectorAll('[style*="pointer-events: none"]');
      sparkleElements.forEach(sparkle => {
        expect(sparkle).toHaveStyle({ pointerEvents: 'none' });
      });
    });

    it('does not interfere with screen readers when hidden', () => {
      const { container } = render(<Sparkles show={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal DOM nodes', () => {
      const { container } = render(<Sparkles show />);
      
      // Should create minimal DOM structure
      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBe(6); // Container + 5 sparkles
    });

    it('handles show prop changes efficiently', () => {
      const { rerender } = render(<Sparkles show={false} />);
      
      // Initially hidden
      expect(screen.queryByText('✨')).not.toBeInTheDocument();
      
      // Show sparkles
      rerender(<Sparkles show />);
      expect(screen.getAllByText('✨').length).toBeGreaterThan(0);
      
      // Hide sparkles again
      rerender(<Sparkles show={false} />);
      expect(screen.queryByText('✨')).not.toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles boolean show prop correctly', () => {
      // Test true
      const { rerender } = render(<Sparkles show />);
      expect(screen.getAllByText('✨').length).toBeGreaterThan(0);
      
      // Test false
      rerender(<Sparkles show={false} />);
      expect(screen.queryByText('✨')).not.toBeInTheDocument();
    });

    it('handles undefined show prop gracefully', () => {
      // TypeScript would catch this, but test runtime behavior
      expect(() => render(<Sparkles show={undefined as unknown as boolean} />)).not.toThrow();
    });
  });
});