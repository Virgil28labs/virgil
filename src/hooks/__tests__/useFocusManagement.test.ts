import { renderHook, act } from '@testing-library/react';
import { useFocusManagement } from '../useFocusManagement';

describe('useFocusManagement', () => {
  let container: HTMLDivElement;
  let previousActiveElement: HTMLButtonElement;

  beforeEach(() => {
    // Create container with focusable elements
    container = document.createElement('div');
    container.innerHTML = `
      <input type="text" id="input1" />
      <button id="button1">Button 1</button>
      <select id="select1">
        <option>Option 1</option>
      </select>
      <textarea id="textarea1"></textarea>
      <a href="#" id="link1">Link 1</a>
      <div tabindex="0" id="div1">Focusable Div</div>
      <button id="button2" disabled>Disabled Button</button>
      <input type="text" id="input2" tabindex="-1" />
    `;
    document.body.appendChild(container);

    // Create an element that was previously focused
    previousActiveElement = document.createElement('button');
    previousActiveElement.id = 'previousButton';
    document.body.appendChild(previousActiveElement);
    previousActiveElement.focus();
  });

  afterEach(() => {
    document.body.removeChild(container);
    if (document.body.contains(previousActiveElement)) {
      document.body.removeChild(previousActiveElement);
    }
  });

  describe('basic functionality', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      expect(result.current.containerRef.current).toBeNull();
      expect(result.current.focusFirstElement).toBeDefined();
      expect(result.current.focusElement).toBeDefined();
      expect(result.current.getFocusableElements).toBeDefined();
      expect(result.current.contains).toBeDefined();
    });

    it('should set container ref', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      expect(result.current.containerRef.current).toBe(container);
    });
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();

      expect(focusableElements).toHaveLength(5); // input1, button1, select1, textarea1, link1, div1
      expect(focusableElements.map(el => el.id)).toEqual([
        'input1',
        'button1',
        'select1',
        'textarea1',
        'link1',
        'div1'
      ]);
    });

    it('should exclude disabled elements', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();
      const ids = focusableElements.map(el => el.id);

      expect(ids).not.toContain('button2'); // Disabled button
    });

    it('should exclude tabindex="-1" elements', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();
      const ids = focusableElements.map(el => el.id);

      expect(ids).not.toContain('input2'); // tabindex="-1"
    });

    it('should return empty array when container is null', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      const focusableElements = result.current.getFocusableElements();
      expect(focusableElements).toEqual([]);
    });
  });

  describe('focusFirstElement', () => {
    it('should focus the first focusable element', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusFirstElement();
      });

      expect(document.activeElement?.id).toBe('input1');
    });

    it('should focus element matching initial selector', () => {
      const { result } = renderHook(() => 
        useFocusManagement(false, { initialFocusSelector: 'button' })
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusFirstElement();
      });

      expect(document.activeElement?.id).toBe('button1');
    });

    it('should return null when no focusable elements', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);

      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = emptyContainer;
      });

      const focused = result.current.focusFirstElement();
      expect(focused).toBeNull();

      document.body.removeChild(emptyContainer);
    });
  });

  describe('focusElement', () => {
    it('should focus element by selector', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusElement('#button1');
      });

      expect(document.activeElement?.id).toBe('button1');
    });

    it('should return null when element not found', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      const focused = result.current.focusElement('#nonexistent');
      expect(focused).toBeNull();
    });

    it('should return null when container is null', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      const focused = result.current.focusElement('#button1');
      expect(focused).toBeNull();
    });
  });

  describe('contains', () => {
    it('should return true for elements within container', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      const button = container.querySelector('#button1');
      expect(result.current.contains(button)).toBe(true);
    });

    it('should return false for elements outside container', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      act(() => {
        result.current.containerRef.current = container;
      });

      expect(result.current.contains(previousActiveElement)).toBe(false);
    });

    it('should return false when container is null', () => {
      const { result } = renderHook(() => useFocusManagement(false));

      const button = container.querySelector('#button1');
      expect(result.current.contains(button)).toBe(false);
    });
  });

  describe('autoFocus behavior', () => {
    it('should auto-focus first element when active', async () => {
      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { autoFocus: true }),
        { initialProps: { isActive: false } }
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Activate the hook
      rerender({ isActive: true });

      // Wait for the timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(document.activeElement?.id).toBe('input1');
    });

    it('should not auto-focus when autoFocus is false', async () => {
      previousActiveElement.focus();
      const initialActiveId = document.activeElement?.id;

      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { autoFocus: false }),
        { initialProps: { isActive: false } }
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      rerender({ isActive: true });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      expect(document.activeElement?.id).toBe(initialActiveId);
    });
  });

  describe('restoreFocus behavior', () => {
    it('should store and restore previous focus', () => {
      previousActiveElement.focus();
      expect(document.activeElement?.id).toBe('previousButton');

      const { rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { 
          restoreFocus: true,
          autoFocus: false 
        }),
        { initialProps: { isActive: false } }
      );

      // Activate
      rerender({ isActive: true });
      
      // Focus something else
      container.querySelector<HTMLElement>('#button1')?.focus();
      expect(document.activeElement?.id).toBe('button1');

      // Deactivate
      rerender({ isActive: false });

      // Should restore focus to previous element
      expect(document.activeElement?.id).toBe('previousButton');
    });

    it('should not restore focus when restoreFocus is false', () => {
      previousActiveElement.focus();

      const { rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { 
          restoreFocus: false,
          autoFocus: false 
        }),
        { initialProps: { isActive: false } }
      );

      rerender({ isActive: true });
      container.querySelector<HTMLElement>('#button1')?.focus();
      rerender({ isActive: false });

      expect(document.activeElement?.id).toBe('button1');
    });
  });

  describe('trapFocus behavior', () => {
    it('should trap focus within container on Tab', () => {
      const { result } = renderHook(() => 
        useFocusManagement(true, { trapFocus: true })
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Focus last focusable element
      const lastElement = container.querySelector<HTMLElement>('#div1');
      lastElement?.focus();

      // Press Tab
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });

      act(() => {
        document.dispatchEvent(tabEvent);
      });

      // Should wrap to first element
      expect(document.activeElement?.id).toBe('input1');
    });

    it('should trap focus within container on Shift+Tab', () => {
      const { result } = renderHook(() => 
        useFocusManagement(true, { trapFocus: true })
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Focus first focusable element
      const firstElement = container.querySelector<HTMLElement>('#input1');
      firstElement?.focus();

      // Press Shift+Tab
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true
      });

      act(() => {
        document.dispatchEvent(shiftTabEvent);
      });

      // Should wrap to last element
      expect(document.activeElement?.id).toBe('div1');
    });

    it('should not trap focus when trapFocus is false', () => {
      const { result } = renderHook(() => 
        useFocusManagement(true, { trapFocus: false })
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      const lastElement = container.querySelector<HTMLElement>('#div1');
      lastElement?.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });

      act(() => {
        document.dispatchEvent(tabEvent);
      });

      // Focus should not be trapped
      expect(document.activeElement?.id).toBe('div1');
    });

    it('should restore focus on Escape when trapFocus is true', () => {
      previousActiveElement.focus();

      const { result } = renderHook(() => 
        useFocusManagement(true, { 
          trapFocus: true,
          restoreFocus: true,
          autoFocus: false
        })
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Focus something in container
      container.querySelector<HTMLElement>('#button1')?.focus();

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });

      act(() => {
        document.dispatchEvent(escapeEvent);
      });

      // Should restore focus to previous element
      expect(document.activeElement?.id).toBe('previousButton');
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners when inactive', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { trapFocus: true }),
        { initialProps: { isActive: true } }
      );

      // Deactivate
      rerender({ isActive: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2); // Tab and Escape handlers

      removeEventListenerSpy.mockRestore();
    });

    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => 
        useFocusManagement(true, { autoFocus: true })
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});