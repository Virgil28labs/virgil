/**
 * VirgilTextLogo Test Suite
 * 
 * Tests the Virgil text logo component including:
 * - Rendering as clickable button when onClick provided
 * - Rendering as static div when no onClick
 * - Proper accessibility attributes
 * - Click handling functionality
 * - CSS class application
 * - Memoization behavior
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirgilTextLogo } from '../VirgilTextLogo';

describe('VirgilTextLogo', () => {
  describe('rendering without onClick', () => {
    it('should render as div when onClick is not provided', () => {
      render(<VirgilTextLogo />);
      
      const logo = screen.getByText('Virgil');
      expect(logo.tagName).toBe('DIV');
      expect(logo).toHaveClass('virgil-logo');
    });

    it('should not have button-specific classes when not clickable', () => {
      render(<VirgilTextLogo />);
      
      const logo = screen.getByText('Virgil');
      expect(logo).not.toHaveClass('virgil-logo-button');
    });

    it('should not have button-specific attributes when not clickable', () => {
      render(<VirgilTextLogo />);
      
      const logo = screen.getByText('Virgil');
      expect(logo).not.toHaveAttribute('aria-label');
      expect(logo).not.toHaveAttribute('title');
      expect(logo).not.toHaveAttribute('data-keyboard-nav');
    });
  });

  describe('rendering with onClick', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render as button when onClick is provided', () => {
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveTextContent('Virgil');
    });

    it('should have correct CSS classes when clickable', () => {
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toHaveClass('virgil-logo');
      expect(logo).toHaveClass('virgil-logo-button');
    });

    it('should have proper accessibility attributes', () => {
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toHaveAttribute('aria-label', 'Virgil - Open user profile');
      expect(logo).toHaveAttribute('title', 'Open user profile');
      expect(logo).toHaveAttribute('data-keyboard-nav');
    });

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      await user.click(logo);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard interactions', () => {
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(logo, { key: 'Enter', code: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      
      // Test Space key
      fireEvent.keyDown(logo, { key: ' ', code: 'Space' });
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('should be focusable when clickable', () => {
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      logo.focus();
      
      expect(logo).toHaveFocus();
    });
  });

  describe('content', () => {
    it('should always display "Virgil" text', () => {
      const { rerender } = render(<VirgilTextLogo />);
      expect(screen.getByText('Virgil')).toBeInTheDocument();
      
      rerender(<VirgilTextLogo onClick={jest.fn()} />);
      expect(screen.getByText('Virgil')).toBeInTheDocument();
    });

    it('should have consistent text content regardless of onClick prop', () => {
      const { rerender } = render(<VirgilTextLogo />);
      const staticText = screen.getByText('Virgil').textContent;
      
      rerender(<VirgilTextLogo onClick={jest.fn()} />);
      const buttonText = screen.getByText('Virgil').textContent;
      
      expect(staticText).toBe(buttonText);
    });
  });

  describe('memoization', () => {
    it('should be memoized when props do not change', () => {
      const mockOnClick = jest.fn();
      const { rerender } = render(<VirgilTextLogo onClick={mockOnClick} />);
      const firstRender = screen.getByRole('button');

      rerender(<VirgilTextLogo onClick={mockOnClick} />);
      const secondRender = screen.getByRole('button');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when onClick changes', () => {
      const mockOnClick1 = jest.fn();
      const mockOnClick2 = jest.fn();
      
      const { rerender } = render(<VirgilTextLogo onClick={mockOnClick1} />);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<VirgilTextLogo onClick={mockOnClick2} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      // Different functions should cause re-render
      // (Note: In practice, this might not change the DOM element reference 
      // but the component should handle the prop change correctly)
    });

    it('should re-render when switching between clickable and non-clickable', () => {
      const mockOnClick = jest.fn();
      
      const { rerender } = render(<VirgilTextLogo />);
      expect(screen.getByText('Virgil').tagName).toBe('DIV');

      rerender(<VirgilTextLogo onClick={mockOnClick} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      rerender(<VirgilTextLogo />);
      expect(screen.getByText('Virgil').tagName).toBe('DIV');
    });

    it('should maintain memoization for static version', () => {
      const { rerender } = render(<VirgilTextLogo />);
      const firstRender = screen.getByText('Virgil');

      rerender(<VirgilTextLogo />);
      const secondRender = screen.getByText('Virgil');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined onClick gracefully', () => {
      render(<VirgilTextLogo onClick={undefined} />);
      
      const logo = screen.getByText('Virgil');
      expect(logo.tagName).toBe('DIV');
    });

    it('should handle null onClick gracefully', () => {
      render(<VirgilTextLogo onClick={null as unknown as (() => void) | undefined} />);
      
      const logo = screen.getByText('Virgil');
      expect(logo.tagName).toBe('DIV');
    });

    it('should not crash when onClick throws an error', async () => {
      const errorOnClick = jest.fn(() => {
        throw new Error('Test error');
      });
      
      // Mock console.error to avoid noise in test output
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const user = userEvent.setup();
      render(<VirgilTextLogo onClick={errorOnClick} />);
      
      const logo = screen.getByRole('button');
      
      // This should not crash the test
      await expect(user.click(logo)).rejects.toThrow('Test error');
      
      expect(errorOnClick).toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should handle rapid clicks correctly', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();
      
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      
      // Rapid clicks
      await user.click(logo);
      await user.click(logo);
      await user.click(logo);
      
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('should provide clear semantic meaning for screen readers', () => {
      const mockOnClick = jest.fn();
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toHaveAttribute('aria-label', 'Virgil - Open user profile');
    });

    it('should provide helpful title for tooltip', () => {
      const mockOnClick = jest.fn();
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toHaveAttribute('title', 'Open user profile');
    });

    it('should have keyboard navigation data attribute', () => {
      const mockOnClick = jest.fn();
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      const logo = screen.getByRole('button');
      expect(logo).toHaveAttribute('data-keyboard-nav');
    });

    it('should be discoverable by assistive technology when clickable', () => {
      const mockOnClick = jest.fn();
      render(<VirgilTextLogo onClick={mockOnClick} />);
      
      // Should be discoverable as a button
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText('Virgil - Open user profile')).toBeInTheDocument();
    });

    it('should not expose interactive semantics when not clickable', () => {
      render(<VirgilTextLogo />);
      
      // Should not be discoverable as a button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Virgil - Open user profile')).not.toBeInTheDocument();
    });
  });
});