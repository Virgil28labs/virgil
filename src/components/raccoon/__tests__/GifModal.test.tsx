/**
 * GifModal Component Test Suite
 * 
 * Tests modal dialog for displaying raccoon celebration GIF.
 * Simple modal component with overlay, image display, and close functionality.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GifModal } from '../GifModal';

// Mock styles
jest.mock('../raccoonStyles', () => ({
  styles: {
    gifModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    gifContainer: {
      position: 'relative',
      maxWidth: '90%',
      maxHeight: '90%',
      background: '#fff',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    },
    gifImage: {
      maxWidth: '100%',
      maxHeight: '70vh',
      borderRadius: '8px',
    },
    gifCloseButton: {
      position: 'absolute',
      top: '10px',
      right: '15px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    },
  },
}));

describe('GifModal', () => {
  const defaultProps = {
    show: false,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    it('renders modal when show is true', () => {
      render(<GifModal {...defaultProps} show />);
      
      expect(screen.getByAltText('Raccoon GIF')).toBeInTheDocument();
      expect(screen.getByTitle('Close GIF')).toBeInTheDocument();
    });

    it('renders nothing when show is false', () => {
      render(<GifModal {...defaultProps} show={false} />);
      
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Close GIF')).not.toBeInTheDocument();
    });

    it('returns null when show is false', () => {
      const { container } = render(<GifModal {...defaultProps} show={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Modal Structure', () => {
    it('renders with correct modal overlay structure', () => {
      render(<GifModal {...defaultProps} show />);
      
      // Should have modal overlay
      const modal = document?.querySelector('[style*="fixed"]');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: '1000',
      });
    });

    it('renders gif container with correct styles', () => {
      render(<GifModal {...defaultProps} show />);
      
      const container = document?.querySelector('[style*="relative"]');
      expect(container).toHaveStyle({
        position: 'relative',
        maxWidth: '90%',
        maxHeight: '90%',
        background: '#fff',
        borderRadius: '10px',
        padding: '20px',
      });
    });

    it('renders gif image with correct attributes', () => {
      render(<GifModal {...defaultProps} show />);
      
      const image = screen.getByAltText('Raccoon GIF');
      expect(image).toHaveAttribute('src', '/racoon_celebration.gif');
      expect(image).toHaveStyle({
        maxWidth: '100%',
        maxHeight: '70vh',
        borderRadius: '8px',
      });
    });

    it('renders close button with correct attributes', () => {
      render(<GifModal {...defaultProps} show />);
      
      const closeButton = screen.getByTitle('Close GIF');
      expect(closeButton).toHaveTextContent('✕');
      expect(closeButton).toHaveStyle({
        position: 'absolute',
        top: '10px',
        right: '15px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
      });
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const closeButton = screen.getByTitle('Close GIF');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when modal overlay is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const overlay = document?.querySelector('[style*="fixed"]');
      if (!overlay) throw new Error('Overlay not found');
      await user.click(overlay);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when gif container is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const gifContainer = document?.querySelector('[style*="relative"]');
      if (!gifContainer) throw new Error('Gif container not found');
      await user.click(gifContainer);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when gif image is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const image = screen.getByAltText('Raccoon GIF');
      await user.click(image);
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Event Propagation', () => {
    it('stops propagation when clicking gif container', () => {
      const onClose = jest.fn();
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const gifContainer = document?.querySelector('[style*="relative"]');
      const event = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
      
      gifContainer?.dispatchEvent(event);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Button Hover Effects', () => {
    it('handles mouse enter on close button', () => {
      render(<GifModal {...defaultProps} show />);
      
      const closeButton = screen.getByTitle('Close GIF') as HTMLButtonElement;
      
      fireEvent.mouseEnter(closeButton);
      
      expect(closeButton.style.background).toBe('rgba(255, 0, 0, 0.8)');
      expect(closeButton.style.transform).toBe('scale(1.1)');
    });

    it('handles mouse leave on close button', () => {
      render(<GifModal {...defaultProps} show />);
      
      const closeButton = screen.getByTitle('Close GIF') as HTMLButtonElement;
      
      // First enter to set hover state
      fireEvent.mouseEnter(closeButton);
      expect(closeButton.style.background).toBe('rgba(255, 0, 0, 0.8)');
      
      // Then leave to reset state
      fireEvent.mouseLeave(closeButton);
      expect(closeButton.style.background).toBe('rgba(0, 0, 0, 0.7)');
      expect(closeButton.style.transform).toBe('scale(1)');
    });
  });

  describe('Accessibility', () => {
    it('has accessible close button with title', () => {
      render(<GifModal {...defaultProps} show />);
      
      const closeButton = screen.getByTitle('Close GIF');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('title', 'Close GIF');
    });

    it('has alt text for gif image', () => {
      render(<GifModal {...defaultProps} show />);
      
      const image = screen.getByAltText('Raccoon GIF');
      expect(image).toBeInTheDocument();
    });

    it('close button is focusable', () => {
      render(<GifModal {...defaultProps} show />);
      
      const closeButton = screen.getByTitle('Close GIF');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    it('supports keyboard interaction on close button', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<GifModal {...defaultProps} show onClose={onClose} />);
      
      const closeButton = screen.getByTitle('Close GIF');
      closeButton.focus();
      
      await user.keyboard('{Enter}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('renders minimal DOM structure when shown', () => {
      const { container } = render(<GifModal {...defaultProps} show />);
      
      // Should have overlay, container, image, and button
      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBe(4);
    });

    it('renders no DOM elements when hidden', () => {
      const { container } = render(<GifModal {...defaultProps} show={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('handles show prop changes efficiently', () => {
      const { rerender } = render(<GifModal {...defaultProps} show={false} />);
      
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
      
      rerender(<GifModal {...defaultProps} show />);
      expect(screen.getByAltText('Raccoon GIF')).toBeInTheDocument();
      
      rerender(<GifModal {...defaultProps} show={false} />);
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles boolean show prop correctly', () => {
      const { rerender } = render(<GifModal {...defaultProps} show />);
      expect(screen.getByAltText('Raccoon GIF')).toBeInTheDocument();
      
      rerender(<GifModal {...defaultProps} show={false} />);
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
    });

    it('handles function onClose prop correctly', () => {
      const mockClose = jest.fn();
      render(<GifModal {...defaultProps} show onClose={mockClose} />);
      
      const closeButton = screen.getByTitle('Close GIF');
      fireEvent.click(closeButton);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('handles missing onClose prop gracefully', () => {
      expect(() => 
        render(<GifModal show onClose={undefined as unknown as () => void} />),
      ).not.toThrow();
    });
  });

  describe('Modal Behavior', () => {
    it('maintains modal overlay on top of content', () => {
      render(<GifModal {...defaultProps} show />);
      
      const overlay = document?.querySelector('[style*="fixed"]');
      expect(overlay).toHaveStyle({ zIndex: '1000' });
    });

    it('centers content in viewport', () => {
      render(<GifModal {...defaultProps} show />);
      
      const overlay = document?.querySelector('[style*="fixed"]');
      expect(overlay).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    it('applies backdrop blur effect', () => {
      render(<GifModal {...defaultProps} show />);
      
      const overlay = document?.querySelector('[style*="fixed"]');
      expect(overlay).toHaveStyle({
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      });
    });
  });

  describe('Image Loading', () => {
    it('handles image load states gracefully', () => {
      render(<GifModal {...defaultProps} show />);
      
      const image = screen.getByAltText('Raccoon GIF');
      
      // Simulate image load
      fireEvent.load(image);
      expect(image).toBeInTheDocument();
      
      // Simulate image error
      fireEvent.error(image);
      expect(image).toBeInTheDocument();
    });

    it('maintains aspect ratio constraints', () => {
      render(<GifModal {...defaultProps} show />);
      
      const image = screen.getByAltText('Raccoon GIF');
      expect(image).toHaveStyle({
        maxWidth: '100%',
        maxHeight: '70vh',
      });
    });
  });
});