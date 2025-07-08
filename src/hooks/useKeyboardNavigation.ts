import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  enabled?: boolean;
  loop?: boolean;
  selector?: string;
  onEscape?: () => void;
  onEnter?: (element: HTMLElement) => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enabled = true,
    loop = true,
    selector = '[data-keyboard-nav], button, input, select, textarea, a[href]',
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef<number>(-1);

  const getFocusableElements = useCallback((): NodeListOf<HTMLElement> => {
    if (!containerRef.current) return document.querySelectorAll(selector);
    return containerRef.current.querySelectorAll(selector);
  }, [selector]);

  const focusElement = useCallback((index: number) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let targetIndex = index;
    if (loop) {
      if (targetIndex < 0) targetIndex = elements.length - 1;
      if (targetIndex >= elements.length) targetIndex = 0;
    } else {
      targetIndex = Math.max(0, Math.min(targetIndex, elements.length - 1));
    }

    const element = elements[targetIndex];
    if (element) {
      element.focus();
      currentIndexRef.current = targetIndex;
    }
  }, [getFocusableElements, loop]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const elements = getFocusableElements();
    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = Array.from(elements).indexOf(currentElement);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        if (onEscape) {
          onEscape();
        } else {
          (document.activeElement as HTMLElement)?.blur();
        }
        break;

      case 'Enter':
        if (onEnter && currentElement) {
          event.preventDefault();
          onEnter(currentElement);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (onArrowUp) {
          onArrowUp();
        } else {
          focusElement(currentIndex - 1);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (onArrowDown) {
          onArrowDown();
        } else {
          focusElement(currentIndex + 1);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (onArrowLeft) {
          onArrowLeft();
        } else {
          focusElement(currentIndex - 1);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (onArrowRight) {
          onArrowRight();
        } else {
          focusElement(currentIndex + 1);
        }
        break;

      case 'Tab':
        // Let native tab behavior work, but update our tracking
        setTimeout(() => {
          const newCurrentElement = document.activeElement as HTMLElement;
          const newIndex = Array.from(elements).indexOf(newCurrentElement);
          currentIndexRef.current = newIndex;
        }, 0);
        break;
    }
  }, [enabled, getFocusableElements, focusElement, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current || document;
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    focusElement(elements.length - 1);
  }, [focusElement, getFocusableElements]);

  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = Array.from(elements).indexOf(currentElement);
    focusElement(currentIndex + 1);
  }, [focusElement, getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = Array.from(elements).indexOf(currentElement);
    focusElement(currentIndex - 1);
  }, [focusElement, getFocusableElements]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement
  };
}