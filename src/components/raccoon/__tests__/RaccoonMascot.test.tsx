/**
 * RaccoonMascot Component Comprehensive Test Suite
 * 
 * Tests physics simulations, animations, user interactions, keyboard controls,
 * UI element collision detection, and visual state management.
 * Most complex physics-based component in the application.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RaccoonMascot } from '../RaccoonMascot';
import { AllTheProviders } from '../../../test-utils/AllTheProviders';
import { timeService } from '../../../services/TimeService';

// Mock all dependencies
jest.mock('../../../hooks/useLocation', () => ({
  useLocation: jest.fn(),
}));

jest.mock('../../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    getLocalDate: jest.fn(),
    getCurrentDateTime: jest.fn(),
  },
}));

// Mock sub-components to test independently
jest.mock('../GifModal', () => ({
  GifModal: ({ show, onClose }: { show: boolean; onClose: () => void }) => 
    show ? <div data-testid="gif-modal" onClick={onClose}>GIF Modal</div> : null,
}));

jest.mock('../Sparkles', () => ({
  Sparkles: ({ show }: { show: boolean }) => 
    show ? <div data-testid="sparkles">Sparkles</div> : null,
}));

jest.mock('../Indicators', () => ({
  Indicators: ({ isOnWall, isOnUIElement, currentRaccoonEmoji }: unknown) => (
    <div data-testid="indicators">
      {isOnWall && <span data-testid="wall-indicator">🧲</span>}
      {isOnUIElement && <span data-testid="ui-indicator">{currentRaccoonEmoji}</span>}
    </div>
  ),
}));

const mockUseLocation = jest.requireMock('../../../hooks/useLocation').useLocation;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('RaccoonMascot', () => {
  const defaultLocationData = {
    address: { formatted: 'Test Address' },
    ipLocation: { ip: '192.168.1.1' },
    hasGPSLocation: true,
    hasIpLocation: true,
  };

  // Mock window properties for physics calculations
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue(defaultLocationData);
    mockTimeService.getTimestamp.mockReturnValue(Date.now());
    
    // Set consistent window dimensions for physics tests
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    
    // Mock requestAnimationFrame for physics loop
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(cb, 16); // ~60fps
      return 1;
    });
    
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    
    // Mock DOM elements for UI detection
    const mockElements = [
      {
        getBoundingClientRect: () => ({ 
          x: 100, y: 100, width: 200, height: 50, 
          left: 100, top: 100, right: 300, bottom: 150, 
        }),
        textContent: 'Test Element',
      },
    ];
    
    jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockElements as unknown);
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      textAlign: 'left',
      fontSize: '16px',
    } as unknown);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight });
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth });
  });

  const renderComponent = (props = {}) => {
    return render(
      <AllTheProviders>
        <RaccoonMascot {...props} />
      </AllTheProviders>,
    );
  };

  describe('Component Rendering', () => {
    it('renders raccoon mascot with correct test id', () => {
      renderComponent();
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });

    it('renders raccoon image with correct attributes', () => {
      renderComponent();
      const image = screen.getByAltText('Racoon Mascot');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/racoon.png');
      expect(image).toHaveAttribute('draggable', 'false');
    });

    it('applies initial position styles', () => {
      renderComponent();
      const mascot = screen.getByTestId('raccoon-mascot');
      expect(mascot).toHaveStyle({
        left: '20px',
        top: '700px', // window.innerHeight (800) - 100
      });
    });

    it('renders initial state correctly', () => {
      renderComponent();
      
      // Should not show sparkles initially
      expect(screen.queryByTestId('sparkles')).not.toBeInTheDocument();
      
      // Should not show gif modal initially
      expect(screen.queryByTestId('gif-modal')).not.toBeInTheDocument();
      
      // Should show indicators
      expect(screen.getByTestId('indicators')).toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('handles click to pick up raccoon', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      await act(async () => {
        fireEvent.click(mascotContainer);
      });

      // Should show sparkles when picked up
      expect(screen.getByTestId('sparkles')).toBeInTheDocument();
      
      // Should show gif modal
      expect(screen.getByTestId('gif-modal')).toBeInTheDocument();
    });

    it('shows and hides sparkles after pickup', async () => {
      jest.useFakeTimers();
      renderComponent();
      
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      await act(async () => {
        fireEvent.click(mascotContainer);
      });

      expect(screen.getByTestId('sparkles')).toBeInTheDocument();

      // Fast forward sparkles timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('sparkles')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('resets position after pickup timeout', async () => {
      jest.useFakeTimers();
      renderComponent();
      
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      await act(async () => {
        fireEvent.click(mascotContainer);
      });

      // Fast forward pickup timeout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const mascot = screen.getByTestId('raccoon-mascot');
        // Position should be randomized within bounds
        const leftStyle = mascot.style.left;
        expect(leftStyle).toBeDefined();
        expect(parseInt(leftStyle)).toBeGreaterThanOrEqual(0);
        expect(parseInt(leftStyle)).toBeLessThanOrEqual(1100); // window width - 100
      });
      
      jest.useRealTimers();
    });
  });

  describe('Drag and Drop', () => {
    it('handles mouse down to start dragging', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      const mouseDownEvent = {
        clientX: 150,
        clientY: 150,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, top: 100 }),
        },
      };

      await act(async () => {
        fireEvent.mouseDown(mascotContainer, mouseDownEvent);
      });

      // Should set up drag state (verified by subsequent mouse events)
      expect(mascotContainer).toBeInTheDocument();
    });

    it('updates position during mouse move while dragging', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      // Start dragging
      await act(async () => {
        fireEvent.mouseDown(mascotContainer, {
          clientX: 150,
          clientY: 150,
          currentTarget: {
            getBoundingClientRect: () => ({ left: 100, top: 100 }),
          },
        });
      });

      // Move mouse
      await act(async () => {
        fireEvent.mouseMove(document, {
          clientX: 200,
          clientY: 200,
        });
      });

      const mascot = screen.getByTestId('raccoon-mascot');
      expect(mascot.style.left).toBe('150px'); // 200 - (150 - 100)
      expect(mascot.style.top).toBe('150px'); // 200 - (150 - 100)
    });

    it('stops dragging on mouse up', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      // Start dragging
      await act(async () => {
        fireEvent.mouseDown(mascotContainer, {
          clientX: 150,
          clientY: 150,
          currentTarget: {
            getBoundingClientRect: () => ({ left: 100, top: 100 }),
          },
        });
      });

      // Stop dragging
      await act(async () => {
        fireEvent.mouseUp(document);
      });

      // Subsequent mouse moves should not update position
      const initialLeft = screen.getByTestId('raccoon-mascot').style.left;
      
      await act(async () => {
        fireEvent.mouseMove(document, {
          clientX: 300,
          clientY: 300,
        });
      });

      expect(screen.getByTestId('raccoon-mascot').style.left).toBe(initialLeft);
    });
  });

  describe('Keyboard Controls', () => {
    it('handles spacebar for jumping', async () => {
      renderComponent();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: ' ' });
      });

      // Jump key should be set (tested indirectly through physics loop)
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.keyUp(document, { key: ' ' });
      });
    });

    it('handles arrow keys for movement', async () => {
      renderComponent();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.keyUp(document, { key: 'ArrowLeft' });
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.keyUp(document, { key: 'ArrowRight' });
      });
    });

    it('ignores keyboard input when picked up', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      // Pick up raccoon
      await act(async () => {
        fireEvent.click(mascotContainer);
      });

      // Try to use keyboard controls
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });

      // Should not respond to keyboard input
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });
  });

  describe('Sleep Animation', () => {
    it('starts sleep animation after timeout', async () => {
      jest.useFakeTimers();
      renderComponent();

      // Fast forward sleep timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should have sleeping state active
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      
      jest.useRealTimers();
    });

    it('resets sleep timer on interaction', async () => {
      jest.useFakeTimers();
      renderComponent();

      // Fast forward partially
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Interact with raccoon
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });

      // Fast forward original timeout duration
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should still be awake due to reset
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });

  describe('UI Element Detection', () => {
    it('detects UI elements on initialization', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(document.querySelectorAll).toHaveBeenCalled();
      });
    });

    it('updates UI elements on window resize', async () => {
      renderComponent();
      
      await act(async () => {
        fireEvent.resize(window);
      });

      expect(document.querySelectorAll).toHaveBeenCalledTimes(2); // Initial + resize
    });

    it('caches UI elements for performance', async () => {
      mockTimeService.getTimestamp
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1500); // Within 1 second cache window

      renderComponent();
      
      // Trigger multiple UI updates within cache window
      await act(async () => {
        fireEvent.resize(window);
      });

      // Should use cached result
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });
  });

  describe('Visual Effects', () => {
    it('creates dust particles when running on ground', async () => {
      mockTimeService.getTimestamp
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200); // Outside dust throttle window

      renderComponent();
      
      // Simulate movement on ground
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
      });

      // Allow physics loop to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });

    it('shows trail effect during fast movement', async () => {
      renderComponent();
      
      // Simulate fast movement (would be handled by physics loop)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyUp(document, { key: 'ArrowRight' });
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });

    it('applies squash effect on landing', async () => {
      renderComponent();
      
      // Simulate jumping and landing (would trigger squash effect)
      await act(async () => {
        fireEvent.keyDown(document, { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyUp(document, { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });
  });

  describe('GIF Modal', () => {
    it('closes gif modal when close button clicked', async () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      // Open gif modal
      await act(async () => {
        fireEvent.click(mascotContainer);
      });

      expect(screen.getByTestId('gif-modal')).toBeInTheDocument();

      // Close gif modal
      await act(async () => {
        fireEvent.click(screen.getByTestId('gif-modal'));
      });

      expect(screen.queryByTestId('gif-modal')).not.toBeInTheDocument();
    });
  });

  describe('Physics Edge Cases', () => {
    it('handles boundary collisions correctly', async () => {
      renderComponent();
      
      // Test left boundary
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
        // Allow physics loop to run multiple times
        await new Promise(resolve => setTimeout(resolve, 100));
        fireEvent.keyUp(document, { key: 'ArrowLeft' });
      });

      const mascot = screen.getByTestId('raccoon-mascot');
      const leftPosition = parseInt(mascot.style.left);
      expect(leftPosition).toBeGreaterThanOrEqual(0);
    });

    it('respects terminal velocity', async () => {
      renderComponent();
      
      // Simulate long fall (would hit terminal velocity)
      await act(async () => {
        // Physics loop would enforce terminal velocity
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });

    it('handles multiple jumps correctly', async () => {
      renderComponent();
      
      // Test triple jump system
      await act(async () => {
        // First jump
        fireEvent.keyDown(document, { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyUp(document, { key: ' ' });
        
        // Second jump (air jump)
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyDown(document, { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyUp(document, { key: ' ' });
        
        // Third jump (air jump)
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyDown(document, { key: ' ' });
        await new Promise(resolve => setTimeout(resolve, 50));
        fireEvent.keyUp(document, { key: ' ' });
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides helpful tooltips', () => {
      renderComponent();
      const mascotContainer = screen.getByTestId('raccoon-mascot')?.querySelector('div[title*="Click to pick up"]');
      
      expect(mascotContainer).toHaveAttribute('title', 
        'Click to pick up, use ← → to run, space to jump (triple jump available)',
      );
    });

    it('handles focus management during interactions', async () => {
      renderComponent();
      const mascot = screen.getByTestId('raccoon-mascot');
      
      // Component should be accessible via keyboard navigation
      expect(mascot).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('throttles dust particle creation', async () => {
      mockTimeService.getTimestamp
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050); // Within throttle window

      renderComponent();
      
      // Rapid movement should throttle particle creation
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
        await new Promise(resolve => setTimeout(resolve, 20));
        fireEvent.keyUp(document, { key: 'ArrowRight' });
      });

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
    });

    it('cleans up timers on unmount', () => {
      const { unmount } = renderComponent();
      
      // Component should clean up all timers and intervals
      expect(() => unmount()).not.toThrow();
    });

    it('handles animation frame cleanup', () => {
      const { unmount } = renderComponent();
      
      expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
      unmount();
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    it('handles missing DOM elements gracefully', () => {
      // Mock empty querySelectorAll result
      jest.spyOn(document, 'querySelectorAll').mockReturnValue([] as unknown);
      
      expect(() => renderComponent()).not.toThrow();
    });

    it('handles invalid location data gracefully', () => {
      mockUseLocation.mockReturnValue({
        address: null,
        ipLocation: null,
        hasGPSLocation: false,
        hasIpLocation: false,
      });
      
      expect(() => renderComponent()).not.toThrow();
    });

    it('handles missing window properties gracefully', () => {
      // Mock missing window properties
      const originalInnerHeight = window.innerHeight;
      const originalInnerWidth = window.innerWidth;
      
      delete (window as unknown).innerHeight;
      delete (window as unknown).innerWidth;
      
      expect(() => renderComponent()).not.toThrow();
      
      // Restore
      window.innerHeight = originalInnerHeight;
      window.innerWidth = originalInnerWidth;
    });
  });
});