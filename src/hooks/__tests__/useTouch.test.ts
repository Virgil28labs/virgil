import { renderHook, act } from '@testing-library/react';
import { useTouch, preventDoubleTabZoom, optimizeTouchResponse } from '../useTouch';

describe('useTouch', () => {
  let element: HTMLDivElement;
  let mockHandlers: {
    onTap: jest.Mock;
    onDoubleTap: jest.Mock;
    onLongPress: jest.Mock;
    onSwipeLeft: jest.Mock;
    onSwipeRight: jest.Mock;
    onSwipeUp: jest.Mock;
    onSwipeDown: jest.Mock;
  };

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    
    mockHandlers = {
      onTap: jest.fn(),
      onDoubleTap: jest.fn(),
      onLongPress: jest.fn(),
      onSwipeLeft: jest.fn(),
      onSwipeRight: jest.fn(),
      onSwipeUp: jest.fn(),
      onSwipeDown: jest.fn()
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(element);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }> = []) => {
    const touchList = touches.map(touch => ({
      ...touch,
      identifier: 0,
      screenX: touch.clientX,
      screenY: touch.clientY,
      pageX: touch.clientX,
      pageY: touch.clientY,
      target: element,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 1
    }));

    const event = new Event(type, { bubbles: true }) as any;
    event.touches = touchList;
    event.changedTouches = touchList;
    event.targetTouches = touchList;
    return event;
  };

  describe('initialization', () => {
    it('should return touchRef', () => {
      const { result } = renderHook(() => useTouch());
      expect(result.current.touchRef).toBeDefined();
    });

    it('should attach event listeners when ref is set', () => {
      const addEventListenerSpy = jest.spyOn(element, 'addEventListener');
      const { result } = renderHook(() => useTouch(mockHandlers));

      act(() => {
        result.current.touchRef.current = element;
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
    });
  });

  describe('tap gestures', () => {
    it('should detect single tap', async () => {
      const { result } = renderHook(() => useTouch({ onTap: mockHandlers.onTap }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      // Simulate tap
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 105, clientY: 105 }]);

      act(() => {
        element.dispatchEvent(touchStart);
      });

      act(() => {
        element.dispatchEvent(touchEnd);
      });

      expect(mockHandlers.onTap).toHaveBeenCalledWith(touchEnd);
    });

    it('should detect double tap', () => {
      const { result } = renderHook(() => useTouch({ 
        onDoubleTap: mockHandlers.onDoubleTap 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      // First tap
      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      });

      // Second tap within doubleTapDelay
      act(() => {
        jest.advanceTimersByTime(100);
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      });

      expect(mockHandlers.onDoubleTap).toHaveBeenCalled();
    });

    it('should delay single tap when double tap handler exists', () => {
      const { result } = renderHook(() => useTouch({ 
        onTap: mockHandlers.onTap,
        onDoubleTap: mockHandlers.onDoubleTap 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      // Single tap
      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      });

      // onTap should not be called immediately
      expect(mockHandlers.onTap).not.toHaveBeenCalled();

      // Wait for double tap delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockHandlers.onTap).toHaveBeenCalled();
      expect(mockHandlers.onDoubleTap).not.toHaveBeenCalled();
    });
  });

  describe('long press', () => {
    it('should detect long press', () => {
      const { result } = renderHook(() => useTouch({ 
        onLongPress: mockHandlers.onLongPress,
        longPressDelay: 500 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);

      act(() => {
        element.dispatchEvent(touchStart);
      });

      expect(mockHandlers.onLongPress).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockHandlers.onLongPress).toHaveBeenCalledWith(touchStart);
    });

    it('should cancel long press on move', () => {
      const { result } = renderHook(() => useTouch({ 
        onLongPress: mockHandlers.onLongPress 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(createTouchEvent('touchmove', [{ clientX: 150, clientY: 150 }]));
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockHandlers.onLongPress).not.toHaveBeenCalled();
    });

    it('should cancel long press on early end', () => {
      const { result } = renderHook(() => useTouch({ 
        onLongPress: mockHandlers.onLongPress 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        jest.advanceTimersByTime(250);
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockHandlers.onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('swipe gestures', () => {
    it('should detect swipe left', () => {
      const { result } = renderHook(() => useTouch({ 
        onSwipeLeft: mockHandlers.onSwipeLeft,
        swipeThreshold: 50 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      const touchEnd = createTouchEvent('touchend', [{ clientX: 20, clientY: 100 }]);

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(touchEnd);
      });

      expect(mockHandlers.onSwipeLeft).toHaveBeenCalledWith(touchEnd);
    });

    it('should detect swipe right', () => {
      const { result } = renderHook(() => useTouch({ 
        onSwipeRight: mockHandlers.onSwipeRight,
        swipeThreshold: 50 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      const touchEnd = createTouchEvent('touchend', [{ clientX: 180, clientY: 100 }]);

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(touchEnd);
      });

      expect(mockHandlers.onSwipeRight).toHaveBeenCalledWith(touchEnd);
    });

    it('should detect swipe up', () => {
      const { result } = renderHook(() => useTouch({ 
        onSwipeUp: mockHandlers.onSwipeUp,
        swipeThreshold: 50 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 20 }]);

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(touchEnd);
      });

      expect(mockHandlers.onSwipeUp).toHaveBeenCalledWith(touchEnd);
    });

    it('should detect swipe down', () => {
      const { result } = renderHook(() => useTouch({ 
        onSwipeDown: mockHandlers.onSwipeDown,
        swipeThreshold: 50 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 180 }]);

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(touchEnd);
      });

      expect(mockHandlers.onSwipeDown).toHaveBeenCalledWith(touchEnd);
    });

    it('should prefer horizontal swipe over vertical when equal distance', () => {
      const { result } = renderHook(() => useTouch({ 
        onSwipeRight: mockHandlers.onSwipeRight,
        onSwipeDown: mockHandlers.onSwipeDown,
        swipeThreshold: 50 
      }));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 160, clientY: 160 }]));
      });

      expect(mockHandlers.onSwipeRight).toHaveBeenCalled();
      expect(mockHandlers.onSwipeDown).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing touch data', () => {
      const { result } = renderHook(() => useTouch(mockHandlers));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      // Event with no touches
      const emptyEvent = new Event('touchstart') as any;
      emptyEvent.touches = [];

      expect(() => {
        element.dispatchEvent(emptyEvent);
      }).not.toThrow();
    });

    it('should handle touchend without touchstart', () => {
      const { result } = renderHook(() => useTouch(mockHandlers));
      
      act(() => {
        result.current.touchRef.current = element;
      });

      expect(() => {
        element.dispatchEvent(createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]));
      }).not.toThrow();

      expect(mockHandlers.onTap).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');
      const { result, unmount } = renderHook(() => useTouch(mockHandlers));

      act(() => {
        result.current.touchRef.current = element;
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('should clear long press timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { result, unmount } = renderHook(() => useTouch({ 
        onLongPress: mockHandlers.onLongPress 
      }));

      act(() => {
        result.current.touchRef.current = element;
      });

      act(() => {
        element.dispatchEvent(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});

describe('preventDoubleTabZoom', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should prevent default on double tap', () => {
    preventDoubleTabZoom(element);

    const preventDefault = jest.fn();
    const touchEnd1 = new Event('touchend') as any;
    const touchEnd2 = new Event('touchend') as any;
    touchEnd2.preventDefault = preventDefault;

    element.dispatchEvent(touchEnd1);
    // Second tap within 300ms
    element.dispatchEvent(touchEnd2);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('should not prevent default on single tap', () => {
    preventDoubleTabZoom(element);

    const preventDefault = jest.fn();
    const touchEnd = new Event('touchend') as any;
    touchEnd.preventDefault = preventDefault;

    element.dispatchEvent(touchEnd);

    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('optimizeTouchResponse', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should set touch-action style', () => {
    optimizeTouchResponse(element);
    expect(element.style.touchAction).toBe('manipulation');
  });

  it('should prevent context menu', () => {
    optimizeTouchResponse(element);

    const preventDefault = jest.fn();
    const contextMenuEvent = new Event('contextmenu') as any;
    contextMenuEvent.preventDefault = preventDefault;

    element.dispatchEvent(contextMenuEvent);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('should add press feedback on touchstart', () => {
    optimizeTouchResponse(element);

    element.dispatchEvent(new Event('touchstart'));
    expect(element.style.transform).toBe('scale(0.98)');
  });

  it('should remove press feedback on touchend', () => {
    optimizeTouchResponse(element);

    element.style.transform = 'scale(0.98)';
    element.dispatchEvent(new Event('touchend'));
    expect(element.style.transform).toBe('scale(1)');
  });

  it('should remove press feedback on touchcancel', () => {
    optimizeTouchResponse(element);

    element.style.transform = 'scale(0.98)';
    element.dispatchEvent(new Event('touchcancel'));
    expect(element.style.transform).toBe('scale(1)');
  });
});