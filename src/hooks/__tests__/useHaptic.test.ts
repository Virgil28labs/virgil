import { renderHook, act } from '@testing-library/react';
import { useHaptic } from '../useHaptic';

describe('useHaptic', () => {
  let originalNavigator: any;
  let vibrateMock: jest.Mock;
  let hapticFeedbackMock: jest.Mock;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    originalNavigator = global.navigator;
    vibrateMock = jest.fn();
    hapticFeedbackMock = jest.fn();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    consoleDebugSpy.mockRestore();
  });

  describe('initialization', () => {
    it('should return all haptic methods', () => {
      const { result } = renderHook(() => useHaptic());

      expect(result.current).toHaveProperty('triggerHaptic');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('selection');
      expect(result.current).toHaveProperty('light');
      expect(result.current).toHaveProperty('medium');
      expect(result.current).toHaveProperty('heavy');
    });
  });

  describe('when haptic feedback is not supported', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });
    });

    it('should handle gracefully when no vibration API', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.triggerHaptic('light');
      });

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('when iOS haptic feedback is available', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          vibrate: vibrateMock,
          hapticFeedback: {
            impact: hapticFeedbackMock
          }
        },
        writable: true,
        configurable: true
      });
    });

    it('should use iOS haptic feedback when available', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.triggerHaptic('medium');
      });

      expect(hapticFeedbackMock).toHaveBeenCalledWith('medium');
      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('should fall back to vibration when iOS haptic fails', () => {
      hapticFeedbackMock.mockImplementation(() => {
        throw new Error('Not supported');
      });

      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.triggerHaptic('light');
      });

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light');
      expect(vibrateMock).toHaveBeenCalledWith([10]);
      expect(consoleDebugSpy).toHaveBeenCalledWith('Haptic feedback not available:', expect.any(Error));
    });
  });

  describe('when only vibration API is available', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          vibrate: vibrateMock
        },
        writable: true,
        configurable: true
      });
    });

    it('should use vibration patterns for different feedback types', () => {
      const { result } = renderHook(() => useHaptic());

      const testCases = [
        { type: 'light' as const, pattern: [10] },
        { type: 'medium' as const, pattern: [20] },
        { type: 'heavy' as const, pattern: [30] },
        { type: 'selection' as const, pattern: [5] },
        { type: 'success' as const, pattern: [10, 50, 10] },
        { type: 'warning' as const, pattern: [20, 100, 20] },
        { type: 'error' as const, pattern: [50, 100, 50, 100, 50] }
      ];

      testCases.forEach(({ type, pattern }) => {
        vibrateMock.mockClear();
        
        act(() => {
          result.current.triggerHaptic(type);
        });

        expect(vibrateMock).toHaveBeenCalledWith(pattern);
      });
    });

    it('should default to light feedback when no type specified', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.triggerHaptic();
      });

      expect(vibrateMock).toHaveBeenCalledWith([10]);
    });

    it('should handle vibration API errors gracefully', () => {
      vibrateMock.mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.triggerHaptic('light');
      });

      expect(consoleDebugSpy).toHaveBeenCalledWith('Vibration not available:', expect.any(Error));
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          vibrate: vibrateMock
        },
        writable: true,
        configurable: true
      });
    });

    it('should trigger success haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.success();
      });

      expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('should trigger error haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.error();
      });

      expect(vibrateMock).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
    });

    it('should trigger warning haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.warning();
      });

      expect(vibrateMock).toHaveBeenCalledWith([20, 100, 20]);
    });

    it('should trigger selection haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.selection();
      });

      expect(vibrateMock).toHaveBeenCalledWith([5]);
    });

    it('should trigger light haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.light();
      });

      expect(vibrateMock).toHaveBeenCalledWith([10]);
    });

    it('should trigger medium haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.medium();
      });

      expect(vibrateMock).toHaveBeenCalledWith([20]);
    });

    it('should trigger heavy haptic', () => {
      const { result } = renderHook(() => useHaptic());

      act(() => {
        result.current.heavy();
      });

      expect(vibrateMock).toHaveBeenCalledWith([30]);
    });
  });

  describe('memoization', () => {
    it('should memoize triggerHaptic function', () => {
      const { result, rerender } = renderHook(() => useHaptic());

      const triggerHaptic1 = result.current.triggerHaptic;
      
      rerender();
      
      const triggerHaptic2 = result.current.triggerHaptic;

      expect(triggerHaptic1).toBe(triggerHaptic2);
    });

    it('should memoize convenience methods', () => {
      const { result, rerender } = renderHook(() => useHaptic());

      const methods1 = {
        success: result.current.success,
        error: result.current.error,
        warning: result.current.warning,
        selection: result.current.selection,
        light: result.current.light,
        medium: result.current.medium,
        heavy: result.current.heavy
      };

      rerender();

      const methods2 = {
        success: result.current.success,
        error: result.current.error,
        warning: result.current.warning,
        selection: result.current.selection,
        light: result.current.light,
        medium: result.current.medium,
        heavy: result.current.heavy
      };

      Object.keys(methods1).forEach(key => {
        expect(methods1[key as keyof typeof methods1]).toBe(methods2[key as keyof typeof methods2]);
      });
    });
  });
});