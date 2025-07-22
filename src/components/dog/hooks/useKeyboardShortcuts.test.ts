import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, type KeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('event listener management', () => {
    it('should add keydown event listener on mount', () => {
      const shortcuts = { 'Escape': jest.fn() };
      renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keydown event listener on unmount', () => {
      const shortcuts = { 'Escape': jest.fn() };
      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should not add event listener when disabled', () => {
      const shortcuts = { 'Escape': jest.fn() };
      renderHook(() => useKeyboardShortcuts(shortcuts, false));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should update event listener when shortcuts change', () => {
      const { rerender } = renderHook(
        (props: { shortcuts: KeyboardShortcuts }) => useKeyboardShortcuts(props.shortcuts),
        {
          initialProps: { shortcuts: { 'Escape': jest.fn() } as KeyboardShortcuts },
        },
      );

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(0);

      rerender({ shortcuts: { 'Escape': jest.fn(), 'ArrowLeft': jest.fn() } });

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    it('should update event listener when enabled state changes', () => {
      const shortcuts = { 'Escape': jest.fn() };
      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts(shortcuts, enabled),
        {
          initialProps: { enabled: true },
        },
      );

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

      // Disable
      rerender({ enabled: false });
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);

      // Re-enable
      rerender({ enabled: true });
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    });
  });

  const createKeyboardEvent = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key });
    jest.spyOn(event, 'preventDefault');
    return event;
  };

  describe('keyboard event handling', () => {

    it('should call the correct handler for Escape key', () => {
      const escapeHandler = jest.fn();
      const shortcuts = { 'Escape': escapeHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('Escape');
      window.dispatchEvent(event);

      expect(escapeHandler).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should call the correct handler for ArrowLeft key', () => {
      const leftHandler = jest.fn();
      const shortcuts = { 'ArrowLeft': leftHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event);

      expect(leftHandler).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should call the correct handler for ArrowRight key', () => {
      const rightHandler = jest.fn();
      const shortcuts = { 'ArrowRight': rightHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('ArrowRight');
      window.dispatchEvent(event);

      expect(rightHandler).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should call the correct handler for f key', () => {
      const fetchHandler = jest.fn();
      const shortcuts = { 'f': fetchHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('f');
      window.dispatchEvent(event);

      expect(fetchHandler).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should call the correct handler for g key', () => {
      const galleryHandler = jest.fn();
      const shortcuts = { 'g': galleryHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('g');
      window.dispatchEvent(event);

      expect(galleryHandler).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple shortcuts', () => {
      const escapeHandler = jest.fn();
      const leftHandler = jest.fn();
      const rightHandler = jest.fn();
      const shortcuts = {
        'Escape': escapeHandler,
        'ArrowLeft': leftHandler,
        'ArrowRight': rightHandler,
      };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      window.dispatchEvent(createKeyboardEvent('Escape'));
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'));
      window.dispatchEvent(createKeyboardEvent('ArrowRight'));

      expect(escapeHandler).toHaveBeenCalledTimes(1);
      expect(leftHandler).toHaveBeenCalledTimes(1);
      expect(rightHandler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler for unregistered keys', () => {
      const escapeHandler = jest.fn();
      const shortcuts = { 'Escape': escapeHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('Enter');
      window.dispatchEvent(event);

      expect(escapeHandler).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not call handlers when disabled', () => {
      const escapeHandler = jest.fn();
      const shortcuts = { 'Escape': escapeHandler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts, false));

      window.dispatchEvent(createKeyboardEvent('Escape'));

      expect(escapeHandler).not.toHaveBeenCalled();
    });

    it('should update handlers when shortcuts change', () => {
      const oldHandler = jest.fn();
      const newHandler = jest.fn();
      
      const { rerender } = renderHook(
        ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
        {
          initialProps: { shortcuts: { 'Escape': oldHandler } },
        },
      );

      window.dispatchEvent(createKeyboardEvent('Escape'));
      expect(oldHandler).toHaveBeenCalledTimes(1);
      expect(newHandler).not.toHaveBeenCalled();

      rerender({ shortcuts: { 'Escape': newHandler } });

      window.dispatchEvent(createKeyboardEvent('Escape'));
      expect(oldHandler).toHaveBeenCalledTimes(1);
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined shortcuts gracefully', () => {
      const shortcuts = {
        'Escape': undefined,
        'f': jest.fn(),
      };
      
      renderHook(() => useKeyboardShortcuts(shortcuts as any));

      const escapeEvent = createKeyboardEvent('Escape');
      const fEvent = createKeyboardEvent('f');
      
      window.dispatchEvent(escapeEvent);
      window.dispatchEvent(fEvent);

      expect(escapeEvent.preventDefault).not.toHaveBeenCalled();
      expect(fEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(shortcuts.f).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    const createKeyboardEvent = (key: string): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key });
      jest.spyOn(event, 'preventDefault');
      return event;
    };

    it('should handle empty shortcuts object', () => {
      const shortcuts = {};
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent('Escape');
      window.dispatchEvent(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle rapid key presses', () => {
      const handler = jest.fn();
      const shortcuts = { 'f': handler };
      
      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Simulate rapid key presses
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(createKeyboardEvent('f'));
      }

      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should cleanup properly when unmounted during event', () => {
      const handler = jest.fn();
      const shortcuts = { 'Escape': handler };
      
      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      // Unmount immediately
      unmount();

      // Try to trigger event after unmount
      window.dispatchEvent(createKeyboardEvent('Escape'));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});