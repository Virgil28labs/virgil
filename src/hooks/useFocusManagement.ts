import { useEffect, useRef, useCallback } from 'react';

export interface FocusManagementOptions {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  initialFocusSelector?: string;
}

export function useFocusManagement(isActive: boolean, options: FocusManagementOptions = {}) {
  const {
    autoFocus = true,
    restoreFocus = true,
    trapFocus = false,
    initialFocusSelector = 'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'input:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors))
      .filter((element): element is HTMLElement => {
        if (!(element instanceof HTMLElement)) return false;
        
        // In test environment, skip visibility check as jsdom doesn't have layout
        const isTestEnv = process.env.NODE_ENV === 'test';
        const isVisible = isTestEnv || element.offsetParent !== null;
        
        // Check if element is disabled (only form elements have this property)
        const isDisabled = 'disabled' in element && element.disabled === true;
        
        return isVisible && !isDisabled;
      });
  }, []);

  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Try to find element matching initial focus selector first
      let targetElement = focusableElements.find(el => 
        el.matches(initialFocusSelector)
      );
      
      // Fallback to first focusable element
      if (!targetElement) {
        targetElement = focusableElements[0];
      }
      
      targetElement?.focus();
      return targetElement;
    }
    return null;
  }, [getFocusableElements, initialFocusSelector]);

  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [trapFocus, getFocusableElements]);

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && trapFocus) {
      event.preventDefault();
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }
  }, [trapFocus, restoreFocus]);

  // Setup focus management when component becomes active
  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      if (restoreFocus) {
        previousActiveElementRef.current = document.activeElement as HTMLElement;
      }

      // Auto-focus first element
      if (autoFocus) {
        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(focusFirstElement, 10);
        return () => clearTimeout(timeoutId);
      }
    } else {
      // Restore focus when component becomes inactive
      if (restoreFocus && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [isActive, autoFocus, restoreFocus, focusFirstElement]);

  // Setup keyboard event listeners
  useEffect(() => {
    if (!isActive || !trapFocus) return;

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive, trapFocus, handleTabKey, handleEscapeKey]);

  const focusElement = useCallback((selector: string) => {
    if (!containerRef.current) return null;
    
    const element = containerRef.current.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return element;
    }
    return null;
  }, []);

  const contains = useCallback((element: Element | null): boolean => {
    return containerRef.current?.contains(element) ?? false;
  }, []);

  return {
    containerRef,
    focusFirstElement,
    focusElement,
    getFocusableElements,
    contains
  };
}