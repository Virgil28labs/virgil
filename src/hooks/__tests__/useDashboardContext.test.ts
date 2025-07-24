import { renderHook, act } from '@testing-library/react';
import { useDashboardContext } from '../useDashboardContext';
import { dashboardContextService } from '../../services/DashboardContextService';
import type { DashboardContext } from '../../services/DashboardContextService';

// Mock dependencies
jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    subscribe: jest.fn(),
    getContext: jest.fn(),
    generateSuggestions: jest.fn(),
  },
}));

describe('useDashboardContext Hook', () => {
  const mockDispatch = jest.fn();
  const mockUnsubscribe = jest.fn();
  
  const mockContext: DashboardContext = {
    location: { city: 'Santa Monica', country: 'USA' },
    weather: {
      temp: 72,
      description: 'Sunny',
      humidity: 65,
      windSpeed: 10,
    },
    user: null,
    activities: ['weather-checked', 'location-updated'],
    appStates: {
      weather: { lastUpdate: Date.now() },
    },
    lastUpdated: Date.now(),
  };

  const mockSuggestions = [
    'Check the weather forecast',
    'View your location on the map',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    (dashboardContextService.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);
    (dashboardContextService.getContext as jest.Mock).mockReturnValue(mockContext);
    (dashboardContextService.generateSuggestions as jest.Mock).mockReturnValue(mockSuggestions);
  });

  it('initializes dashboard context on mount', () => {
    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    // Should subscribe to context updates
    expect(dashboardContextService.subscribe).toHaveBeenCalledWith(expect.any(Function));

    // Should get initial context and suggestions
    expect(dashboardContextService.getContext).toHaveBeenCalled();
    expect(dashboardContextService.generateSuggestions).toHaveBeenCalled();

    // Should dispatch initial state
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: {
        context: mockContext,
        suggestions: mockSuggestions,
      },
    });
  });

  it('handles context updates through subscription', () => {
    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    // Get the subscription callback
    const subscriptionCallback = (dashboardContextService.subscribe as jest.Mock).mock.calls[0][0];

    // Clear initial dispatch calls
    mockDispatch.mockClear();

    // Simulate context update
    const updatedContext: DashboardContext = {
      ...mockContext,
      weather: {
        temp: 75,
        description: 'Partly cloudy',
        humidity: 70,
        windSpeed: 12,
      },
    };

    const updatedSuggestions = ['New suggestion 1', 'New suggestion 2'];
    (dashboardContextService.generateSuggestions as jest.Mock).mockReturnValue(updatedSuggestions);

    act(() => {
      subscriptionCallback(updatedContext);
    });

    // Should generate new suggestions
    expect(dashboardContextService.generateSuggestions).toHaveBeenCalled();

    // Should dispatch updated state
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: {
        context: updatedContext,
        suggestions: updatedSuggestions,
      },
    });
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => 
      useDashboardContext({ dispatch: mockDispatch })
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('memoizes initializeDashboardContext function', () => {
    const { result, rerender } = renderHook(() => 
      useDashboardContext({ dispatch: mockDispatch })
    );

    const init1 = result.current.initializeDashboardContext;

    rerender();

    const init2 = result.current.initializeDashboardContext;

    expect(init1).toBe(init2);
  });

  it('updates initializeDashboardContext when dispatch changes', () => {
    const { result, rerender } = renderHook(
      (props) => useDashboardContext(props),
      { initialProps: { dispatch: mockDispatch } }
    );

    const init1 = result.current.initializeDashboardContext;

    const newDispatch = jest.fn();
    rerender({ dispatch: newDispatch });

    const init2 = result.current.initializeDashboardContext;

    expect(init1).not.toBe(init2);
  });

  it('handles multiple rapid context updates', () => {
    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    const subscriptionCallback = (dashboardContextService.subscribe as jest.Mock).mock.calls[0][0];

    // Clear initial dispatch
    mockDispatch.mockClear();

    // Simulate multiple rapid updates
    act(() => {
      for (let i = 0; i < 5; i++) {
        const context = {
          ...mockContext,
          activities: [...mockContext.activities, `activity-${i}`],
        };
        subscriptionCallback(context);
      }
    });

    // Should handle all updates
    expect(mockDispatch).toHaveBeenCalledTimes(5);
    expect(dashboardContextService.generateSuggestions).toHaveBeenCalledTimes(5);
  });

  it('continues to work if generateSuggestions returns empty array', () => {
    (dashboardContextService.generateSuggestions as jest.Mock).mockReturnValue([]);

    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: {
        context: mockContext,
        suggestions: [],
      },
    });
  });

  it('handles errors in subscription callback gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    const subscriptionCallback = (dashboardContextService.subscribe as jest.Mock).mock.calls[0][0];

    // Make generateSuggestions throw an error
    (dashboardContextService.generateSuggestions as jest.Mock).mockImplementation(() => {
      throw new Error('Suggestions error');
    });

    // Should not throw when callback is called
    expect(() => {
      act(() => {
        subscriptionCallback(mockContext);
      });
    }).not.toThrow();

    consoleErrorSpy.mockRestore();
  });

  it('returns unsubscribe function from initializeDashboardContext', () => {
    const { result } = renderHook(() => 
      useDashboardContext({ dispatch: mockDispatch })
    );

    const unsubscribeResult = result.current.initializeDashboardContext();

    expect(unsubscribeResult).toBe(mockUnsubscribe);
  });

  it('handles null or undefined context gracefully', () => {
    (dashboardContextService.getContext as jest.Mock).mockReturnValue(null);

    renderHook(() => useDashboardContext({ dispatch: mockDispatch }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: {
        context: null,
        suggestions: mockSuggestions,
      },
    });
  });
});