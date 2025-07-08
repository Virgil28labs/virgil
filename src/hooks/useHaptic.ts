import { useCallback } from 'react';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function useHaptic() {
  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    // Check if device supports haptic feedback
    if (!('vibrate' in navigator)) {
      return;
    }

    // Check for iOS haptic feedback API
    if ('hapticFeedback' in navigator) {
      try {
        (navigator as any).hapticFeedback.impact(type);
        return;
      } catch (error) {
        console.debug('Haptic feedback not available:', error);
      }
    }

    // Fallback to vibration API with different patterns for different feedback types
    const vibrationPatterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      selection: [5],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [50, 100, 50, 100, 50]
    };

    try {
      navigator.vibrate(vibrationPatterns[type]);
    } catch (error) {
      console.debug('Vibration not available:', error);
    }
  }, []);

  const success = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const error = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const warning = useCallback(() => triggerHaptic('warning'), [triggerHaptic]);
  const selection = useCallback(() => triggerHaptic('selection'), [triggerHaptic]);
  const light = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const medium = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  const heavy = useCallback(() => triggerHaptic('heavy'), [triggerHaptic]);

  return {
    triggerHaptic,
    success,
    error,
    warning,
    selection,
    light,
    medium,
    heavy
  };
}