import { renderHook, act } from '@testing-library/react';
import { useResponsive, useMediaQuery, useViewport } from './useResponsive';

describe('useResponsive', () => {
  // Store original window properties
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  // Helper to set window dimensions
  const setWindowSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  };

  afterEach(() => {
    // Restore original window properties
    setWindowSize(originalInnerWidth, originalInnerHeight);
  });

  describe('initial state', () => {
    it('returns correct initial values based on window size', () => {
      setWindowSize(1200, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.windowSize).toEqual({ width: 1200, height: 800 });
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false); // 1200 > 1024 so not desktop
      expect(result.current.isWide).toBe(true); // 1200 > 1024 so it's wide
      expect(result.current.deviceType).toBe('wide'); // 1200 > 1024
    });

    it('detects mobile screen size', () => {
      setWindowSize(375, 667);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(false);
      expect(result.current.deviceType).toBe('mobile');
    });

    it('detects tablet screen size', () => {
      setWindowSize(600, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(false);
      expect(result.current.deviceType).toBe('tablet');
    });

    it('detects wide screen size', () => {
      setWindowSize(1600, 900);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isWide).toBe(true);
      expect(result.current.deviceType).toBe('wide');
    });
  });

  describe('orientation detection', () => {
    it('detects portrait orientation', () => {
      setWindowSize(375, 667);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.orientation).toBe('portrait');
    });

    it('detects landscape orientation', () => {
      setWindowSize(667, 375);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('combined breakpoints', () => {
    it('correctly identifies mobile or tablet', () => {
      setWindowSize(600, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isMobileOrTablet).toBe(true);
      expect(result.current.isDesktopOrWide).toBe(false);
    });

    it('correctly identifies desktop or wide', () => {
      setWindowSize(1200, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isMobileOrTablet).toBe(false);
      expect(result.current.isDesktopOrWide).toBe(true);
    });
  });

  describe('custom breakpoints', () => {
    it('uses custom breakpoints when provided', () => {
      const customBreakpoints = {
        mobile: 600,
        tablet: 900,
        desktop: 1200,
        wide: 1600,
      };
      
      setWindowSize(500, 800);
      
      const { result } = renderHook(() => useResponsive(customBreakpoints));
      
      expect(result.current.isMobile).toBe(true);
      expect(result.current.breakpoints).toEqual(customBreakpoints);
    });
  });

  describe('resize events', () => {
    it('updates values when window is resized', () => {
      setWindowSize(1200, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isWide).toBe(true); // 1200 > 1024 so it's wide, not desktop
      
      act(() => {
        setWindowSize(375, 667);
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current.windowSize).toEqual({ width: 375, height: 667 });
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isWide).toBe(false); // 375 < 480 so it's mobile, not wide
      expect(result.current.orientation).toBe('portrait');
    });

    it('handles orientation change event', () => {
      setWindowSize(375, 667);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.orientation).toBe('portrait');
      
      act(() => {
        setWindowSize(667, 375);
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      expect(result.current.orientation).toBe('landscape');
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useResponsive());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('touch device detection', () => {
    it('detects touch device when ontouchstart exists', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: () => {},
      });
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isTouchDevice).toBe(true);
      
      // Clean up
      delete (window as any).ontouchstart;
    });

    it('detects touch device when maxTouchPoints > 0', () => {
      // Mock navigator.maxTouchPoints
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.isTouchDevice).toBe(true);
      
      // Reset
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 0,
      });
    });
  });
});

describe('useMediaQuery', () => {
  // Mock matchMedia
  const mockMatchMedia = (matches: boolean) => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    
    const mediaQueryList = {
      matches,
      addEventListener: jest.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      }),
      removeEventListener: jest.fn((_event: string, handler: (event: MediaQueryListEvent) => void) => {
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }),
      dispatchEvent: (event: MediaQueryListEvent) => {
        listeners.forEach(listener => listener(event));
      },
    };
    
    return jest.fn().mockReturnValue(mediaQueryList);
  };

  it('returns initial match state', () => {
    window.matchMedia = mockMatchMedia(true);
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(true);
  });

  it('returns false when query does not match', () => {
    window.matchMedia = mockMatchMedia(false);
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(false);
  });

  it('updates when media query changes', () => {
    const matchMediaMock = mockMatchMedia(false);
    window.matchMedia = matchMediaMock;
    
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    expect(result.current).toBe(false);
    
    const mediaQueryList = matchMediaMock();
    
    act(() => {
      // Simulate media query change
      const event = new Event('change') as MediaQueryListEvent;
      Object.defineProperty(event, 'matches', { value: true });
      mediaQueryList.dispatchEvent(event);
    });
    
    expect(result.current).toBe(true);
  });

  it('removes event listener on unmount', () => {
    const matchMediaMock = mockMatchMedia(true);
    window.matchMedia = matchMediaMock;
    
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    
    const mediaQueryList = matchMediaMock();
    
    unmount();
    
    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('handles query change', () => {
    window.matchMedia = mockMatchMedia(true);
    
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(min-width: 768px)' } },
    );
    
    expect(result.current).toBe(true);
    
    // Change query
    window.matchMedia = mockMatchMedia(false);
    rerender({ query: '(min-width: 1024px)' });
    
    expect(result.current).toBe(false);
  });
});

describe('useViewport', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('returns initial viewport values', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    
    const { result } = renderHook(() => useViewport());
    
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.visualViewportHeight).toBe(768);
    expect(result.current.isKeyboardOpen).toBe(false);
  });

  it('updates values on resize', () => {
    const { result } = renderHook(() => useViewport());
    
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
      window.dispatchEvent(new Event('resize'));
    });
    
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });

  it('detects keyboard open when visual viewport is smaller', () => {
    // Mock visualViewport
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: {
        height: 400,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });
    
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
    
    const { result } = renderHook(() => useViewport());
    
    expect(result.current.isKeyboardOpen).toBe(true);
    
    // Clean up
    delete (window as any).visualViewport;
  });

  it('handles visual viewport resize', () => {
    const listeners: { [key: string]: Function[] } = { resize: [] };
    
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: {
        height: 600,
        addEventListener: jest.fn((event: string, handler: Function) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(handler);
        }),
        removeEventListener: jest.fn(),
      },
    });
    
    const { result } = renderHook(() => useViewport());
    
    expect(result.current.visualViewportHeight).toBe(600);
    
    act(() => {
      // Simulate visual viewport resize
      (window.visualViewport as any).height = 400;
      listeners.resize.forEach(handler => handler());
    });
    
    expect(result.current.visualViewportHeight).toBe(400);
    expect(result.current.isKeyboardOpen).toBe(true);
    
    // Clean up
    delete (window as any).visualViewport;
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const visualViewportRemoveEventListenerSpy = jest.fn();
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: {
        height: 600,
        addEventListener: jest.fn(),
        removeEventListener: visualViewportRemoveEventListenerSpy,
      },
    });
    
    const { unmount } = renderHook(() => useViewport());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(visualViewportRemoveEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
    delete (window as any).visualViewport;
  });
});