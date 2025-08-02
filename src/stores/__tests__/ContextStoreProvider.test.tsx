/**
 * Context Store Provider Tests
 * 
 * Tests for the React provider component that sets up environment
 * monitoring and activity tracking for the store.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextStoreProvider, useActivityLogger, useEnvironmentUtils } from '../ContextStoreProvider';
import { useContextStore } from '../ContextStore';

// Mock dependencies
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getCurrentTime: jest.fn(() => '12:00'),
    getCurrentDate: jest.fn(() => 'January 20, 2024'),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'saturday'),
    getTimestamp: jest.fn(() => 1640995200000),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
    subscribeToTimeUpdates: jest.fn(() => jest.fn()),
  },
}));

// Test components
const TestComponent = () => {
  const environment = useContextStore((state) => state.environment);
  const activity = useContextStore((state) => state.activity);
  
  return (
    <div>
      <div data-testid="online-status">{environment.isOnline ? 'online' : 'offline'}</div>
      <div data-testid="device-type">{environment.deviceType}</div>
      <div data-testid="recent-actions">{activity.recentActions.length}</div>
    </div>
  );
};

const ActivityLoggerTest = () => {
  const { logActivity, logComponentActivity, logUserAction } = useActivityLogger();
  
  return (
    <div>
      <button 
        data-testid="log-activity"
        onClick={() => logActivity('test_action')}
      >
        Log Activity
      </button>
      <button 
        data-testid="log-component-activity"
        onClick={() => logComponentActivity('test_component', 'clicked')}
      >
        Log Component Activity
      </button>
      <button 
        data-testid="log-user-action"
        onClick={() => logUserAction('user_action', 'details')}
      >
        Log User Action
      </button>
    </div>
  );
};

const EnvironmentUtilsTest = () => {
  const utils = useEnvironmentUtils();
  
  return (
    <div>
      <div data-testid="is-mobile">{utils.isMobile ? 'mobile' : 'not-mobile'}</div>
      <div data-testid="is-online">{utils.isOnline ? 'online' : 'offline'}</div>
      <div data-testid="has-geolocation">{utils.hasGeolocation ? 'has-geo' : 'no-geo'}</div>
      <div data-testid="viewport-width">{utils.viewportWidth}</div>
    </div>
  );
};

// Mock global objects
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Override global objects for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(mockMatchMedia),
});

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(navigator, 'language', {
  writable: true,
  value: 'en-US',
});

describe('ContextStoreProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window.matchMedia as jest.Mock).mockImplementation(() => mockMatchMedia(false));
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('Provider Initialization', () => {
    it('should render children correctly', () => {
      render(
        <ContextStoreProvider>
          <div data-testid="test-child">Test Child</div>
        </ContextStoreProvider>,
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should initialize environment state', async () => {
      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('online');
        expect(screen.getByTestId('device-type')).toHaveTextContent(/mobile|tablet|desktop/);
      });
    });

    it('should log initial activity', async () => {
      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      await waitFor(() => {
        const actionsCount = parseInt(screen.getByTestId('recent-actions').textContent || '0');
        expect(actionsCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Environment Monitoring', () => {
    it('should handle online/offline events', async () => {
      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      expect(screen.getByTestId('online-status')).toHaveTextContent('online');

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
      });

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('online');
      });
    });

    it('should handle window resize events', async () => {
      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Mock window resize
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('mobile');
      });
    });

    it('should handle dark mode preference changes', () => {
      let darkModeListener: ((e: MediaQueryListEvent) => void) | undefined;
      
      const mockMatchMediaWithListener = (matches: boolean) => ({
        matches,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn((_, listener) => {
          darkModeListener = listener;
        }),
        removeEventListener: jest.fn(),
      });

      (window.matchMedia as jest.Mock).mockImplementation(() => 
        mockMatchMediaWithListener(false),
      );

      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Simulate dark mode change
      if (darkModeListener) {
        darkModeListener({ matches: true } as MediaQueryListEvent);
      }

      // Check that the event was registered
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('Activity Tracking', () => {
    it('should track user interactions', async () => {
      render(
        <ContextStoreProvider>
          <div data-testid="clickable" onClick={() => {}}>Click me</div>
          <TestComponent />
        </ContextStoreProvider>,
      );

      const initialCount = parseInt(screen.getByTestId('recent-actions').textContent || '0');

      // Simulate user interaction
      fireEvent.click(screen.getByTestId('clickable'));

      await waitFor(() => {
        const newCount = parseInt(screen.getByTestId('recent-actions').textContent || '0');
        expect(newCount).toBeGreaterThan(initialCount);
      });
    });

    it('should handle visibility changes', () => {
      const visibilityHandler = jest.fn();
      jest.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'visibilitychange') {
          visibilityHandler.mockImplementation(handler as () => void);
        }
      });

      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Simulate visibility change
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      visibilityHandler();

      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
    });
  });

  describe('Provider Options', () => {
    it('should respect disabled environment monitoring', () => {
      const resizeHandler = jest.fn();
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'resize') {
          resizeHandler.mockImplementation(handler as () => void);
        }
      });

      render(
        <ContextStoreProvider options={{ enableEnvironmentMonitoring: false }}>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Should not register resize listener
      expect(window.addEventListener).not.toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      );
    });

    it('should respect disabled activity tracking', () => {
      const clickHandler = jest.fn();
      jest.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'click') {
          clickHandler.mockImplementation(handler as () => void);
        }
      });

      render(
        <ContextStoreProvider options={{ enableActivityTracking: false }}>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Should not register interaction listeners
      expect(document.addEventListener).not.toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe('useActivityLogger Hook', () => {
    it('should provide activity logging functions', () => {
      render(
        <ContextStoreProvider>
          <ActivityLoggerTest />
          <TestComponent />
        </ContextStoreProvider>,
      );

      const initialCount = parseInt(screen.getByTestId('recent-actions').textContent || '0');

      fireEvent.click(screen.getByTestId('log-activity'));

      expect(parseInt(screen.getByTestId('recent-actions').textContent || '0'))
        .toBeGreaterThan(initialCount);
    });

    it('should log component activities correctly', () => {
      render(
        <ContextStoreProvider>
          <ActivityLoggerTest />
          <TestComponent />
        </ContextStoreProvider>,
      );

      fireEvent.click(screen.getByTestId('log-component-activity'));

      // Should increase activity count
      expect(parseInt(screen.getByTestId('recent-actions').textContent || '0'))
        .toBeGreaterThan(0);
    });

    it('should log user actions with details', () => {
      render(
        <ContextStoreProvider>
          <ActivityLoggerTest />
          <TestComponent />
        </ContextStoreProvider>,
      );

      fireEvent.click(screen.getByTestId('log-user-action'));

      // Should increase activity count
      expect(parseInt(screen.getByTestId('recent-actions').textContent || '0'))
        .toBeGreaterThan(0);
    });
  });

  describe('useEnvironmentUtils Hook', () => {
    it('should provide environment utilities', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

      render(
        <ContextStoreProvider>
          <EnvironmentUtilsTest />
        </ContextStoreProvider>,
      );

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('mobile');
      expect(screen.getByTestId('is-online')).toHaveTextContent('online');
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('500');
    });

    it('should detect geolocation capability', () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {},
        writable: true,
      });

      render(
        <ContextStoreProvider>
          <EnvironmentUtilsTest />
        </ContextStoreProvider>,
      );

      expect(screen.getByTestId('has-geolocation')).toHaveTextContent('has-geo');
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListener = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      unmount();

      expect(removeEventListener).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { unmount } = render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should handle rapid events efficiently', async () => {
      render(
        <ContextStoreProvider>
          <TestComponent />
        </ContextStoreProvider>,
      );

      const startTime = performance.now();

      // Simulate rapid events
      for (let i = 0; i < 100; i++) {
        fireEvent.click(document);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle events in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });
});