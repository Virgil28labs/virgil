import { useCallback, useRef, useEffect } from 'react';

interface TouchInteractionOptions {
  onTap?: (event: TouchEvent) => void;
  onDoubleTap?: (event: TouchEvent) => void;
  onLongPress?: (event: TouchEvent) => void;
  onSwipeLeft?: (event: TouchEvent) => void;
  onSwipeRight?: (event: TouchEvent) => void;
  onSwipeUp?: (event: TouchEvent) => void;
  onSwipeDown?: (event: TouchEvent) => void;
  longPressDelay?: number;
  swipeThreshold?: number;
  doubleTapDelay?: number;
}

export function useTouch(options: TouchInteractionOptions = {}) {
  const {
    onTap,
    onDoubleTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    longPressDelay = 500,
    swipeThreshold = 50,
    doubleTapDelay = 300
  } = options;

  const touchRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress(event);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((_event: TouchEvent) => {
    // Cancel long press if user moves finger
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touchEnd = event.changedTouches[0];
    const touchStart = touchStartRef.current;

    if (!touchEnd || !touchStart) return;

    const deltaX = touchEnd.clientX - touchStart.x;
    const deltaY = touchEnd.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Check for swipe gestures
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(event);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(event);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(event);
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(event);
        }
      }
      return;
    }

    // Check for tap gestures
    if (absDeltaX < 10 && absDeltaY < 10 && deltaTime < 500) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
        // Double tap detected
        onDoubleTap(event);
        lastTapRef.current = 0; // Reset to prevent triple tap
      } else {
        // Single tap (wait to see if double tap follows)
        if (onTap && !onDoubleTap) {
          // No double tap handler, execute immediately
          onTap(event);
        } else if (onTap) {
          // Wait for potential double tap
          setTimeout(() => {
            const finalTimeSinceLastTap = Date.now() - lastTapRef.current;
            if (finalTimeSinceLastTap >= doubleTapDelay) {
              onTap(event);
            }
          }, doubleTapDelay);
        }
        lastTapRef.current = now;
      }
    }

    touchStartRef.current = null;
  }, [onTap, onDoubleTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, doubleTapDelay]);

  useEffect(() => {
    const element = touchRef.current;
    if (!element) return;

    // Add passive listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      // Clear any pending timers
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { touchRef };
}

// Utility function to prevent zoom on double tap
export function preventDoubleTabZoom(element: HTMLElement) {
  let lastTouchEnd = 0;
  
  element.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

// Utility to improve touch responsiveness
export function optimizeTouchResponse(element: HTMLElement) {
  // Add touch-action CSS property for better touch handling
  element.style.touchAction = 'manipulation';
  
  // Prevent context menu on long press
  element.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  
  // Improve button press feedback
  element.addEventListener('touchstart', () => {
    element.style.transform = 'scale(0.98)';
  }, { passive: true });
  
  element.addEventListener('touchend', () => {
    element.style.transform = 'scale(1)';
  }, { passive: true });
  
  element.addEventListener('touchcancel', () => {
    element.style.transform = 'scale(1)';
  }, { passive: true });
}