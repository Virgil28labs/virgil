import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let container: HTMLDivElement;
  
  beforeEach(() => {
    // Create a test container with focusable elements
    container = document.createElement('div');
    container.innerHTML = `
      <button data-keyboard-nav>Button 1</button>
      <input type="text" data-keyboard-nav placeholder="Input 1" />
      <a href="#" data-keyboard-nav>Link 1</a>
      <button>Button 2</button>
      <select data-keyboard-nav>
        <option>Option 1</option>
      </select>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns container ref and navigation functions', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.focusFirst).toBeDefined();
    expect(result.current.focusLast).toBeDefined();
    expect(result.current.focusNext).toBeDefined();
    expect(result.current.focusPrevious).toBeDefined();
    expect(result.current.focusElement).toBeDefined();
  });

  it('navigates forward with ArrowDown', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    // Set the container ref
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus first element
    const firstButton = container.querySelector('button') as HTMLElement;
    firstButton.focus();
    
    // Press ArrowDown
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    // Should focus the next focusable element
    expect(document.activeElement).toBe(container.querySelector('input'));
  });

  it('navigates backward with ArrowUp', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus the input (second element)
    const input = container.querySelector('input') as HTMLElement;
    input.focus();
    
    // Press ArrowUp
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      document.dispatchEvent(event);
    });
    
    // Should focus the previous element
    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  it('loops when reaching the end with loop enabled', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ loop: true }));
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus the last focusable element
    const select = container.querySelector('select') as HTMLElement;
    select.focus();
    
    // Press ArrowDown
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    // Should loop back to first element
    expect(document.activeElement).toBe(container.querySelector('button'));
  });

  it('does not loop when loop is disabled', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ loop: false }));
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus the last element
    const select = container.querySelector('select') as HTMLElement;
    select.focus();
    
    // Press ArrowDown
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    // Should stay on last element
    expect(document.activeElement).toBe(select);
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEscape }));
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });
    
    expect(onEscape).toHaveBeenCalled();
  });

  it('blurs active element when Escape is pressed without onEscape callback', () => {
    renderHook(() => useKeyboardNavigation());
    
    // Focus an element
    const button = container.querySelector('button') as HTMLElement;
    button.focus();
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });
    
    expect(document.activeElement).toBe(document.body);
  });

  it('calls onEnter with current element when Enter is pressed', () => {
    const onEnter = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEnter }));
    
    // Focus an element
    const button = container.querySelector('button') as HTMLElement;
    button.focus();
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);
    });
    
    expect(onEnter).toHaveBeenCalledWith(button);
  });

  it('calls arrow key callbacks when provided', () => {
    const onArrowUp = jest.fn();
    const onArrowDown = jest.fn();
    const onArrowLeft = jest.fn();
    const onArrowRight = jest.fn();
    
    renderHook(() => useKeyboardNavigation({
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
    }));
    
    // Test each arrow key
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    
    expect(onArrowUp).toHaveBeenCalled();
    expect(onArrowDown).toHaveBeenCalled();
    expect(onArrowLeft).toHaveBeenCalled();
    expect(onArrowRight).toHaveBeenCalled();
  });

  it('navigates with Tab and Shift+Tab', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus first element
    const firstButton = container.querySelector('button') as HTMLElement;
    const input = container.querySelector('input') as HTMLElement;
    firstButton.focus();
    
    // Tab doesn't navigate but just tracks - we need to simulate native tab behavior
    // Since JSDOM doesn't implement tab navigation, we'll manually focus the next element
    input.focus();
    
    // Dispatch Tab event to trigger tracking
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(event);
    });
    
    // The hook should track the focus change but not change it
    expect(document.activeElement).toBe(input);
    
    // Similarly for Shift+Tab
    firstButton.focus();
    
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      document.dispatchEvent(event);
    });
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('uses custom selector when provided', () => {
    const { result } = renderHook(() => 
      useKeyboardNavigation({ selector: 'button' }),
    );
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus first button
    const buttons = container.querySelectorAll('button');
    (buttons[0] as HTMLElement).focus();
    
    // Press ArrowDown - should skip to next button, ignoring other elements
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('does not navigate when disabled', () => {
    const { result } = renderHook(() => 
      useKeyboardNavigation({ enabled: false }),
    );
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    const firstButton = container.querySelector('button') as HTMLElement;
    firstButton.focus();
    
    // Try to navigate
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    // Should remain on first button
    expect(document.activeElement).toBe(firstButton);
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useKeyboardNavigation());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('handles empty container gracefully', () => {
    const emptyContainer = document.createElement('div');
    document.body.appendChild(emptyContainer);
    
    const { result } = renderHook(() => useKeyboardNavigation());
    
    act(() => {
      result.current.containerRef.current = emptyContainer;
    });
    
    // Should not throw when trying to navigate
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      document.dispatchEvent(event);
    });
    
    document.body.removeChild(emptyContainer);
  });

  it('handles focus management', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Test focusFirst
    act(() => {
      result.current.focusFirst();
    });
    
    expect(document.activeElement).toBe(container.querySelector('button'));
    
    // Test focusLast
    act(() => {
      result.current.focusLast();
    });
    
    expect(document.activeElement).toBe(container.querySelector('select'));
    
    // Test focusNext
    const input = container.querySelector('input') as HTMLElement;
    input.focus();
    
    act(() => {
      result.current.focusNext();
    });
    
    expect(document.activeElement).toBe(container.querySelector('a'));
  });

  it('focuses specific element with focusElement', () => {
    const { result } = renderHook(() => useKeyboardNavigation());
    
    act(() => {
      result.current.containerRef.current = container;
    });
    
    // Focus specific index
    act(() => {
      result.current.focusElement(2);
    });
    
    // Should focus the link (third focusable element with data-keyboard-nav)
    expect(document.activeElement).toBe(container.querySelector('a'));
  });
});