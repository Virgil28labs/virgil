import { useState, useEffect, useRef, useCallback } from 'react';
import { timeService } from '../services/TimeService';
import { ANIMATION_TIMINGS, RACCOON_EMOJIS, WEATHER_EMOJIS } from '../constants/raccoonConstants';
import type { UIElement } from '../types/physics.types';

interface UseRaccoonAnimationsProps {
  isOnGround: boolean;
  isMoving: boolean;
  isPickedUp: boolean;
  isDragging: boolean;
  charging: boolean;
}

interface SleepingEmoji {
  id: number;
  delay: number;
}

interface UseRaccoonAnimationsReturn {
  visualState: {
    bounceCount: number;
    showSparkles: boolean;
    showGif: boolean;
  };
  sleepState: {
    isSleeping: boolean;
    sleepingEmojis: SleepingEmoji[];
  };
  movement: {
    isRunning: boolean;
    facingDirection: 'left' | 'right';
  };
  uiInteraction: {
    isOnUIElement: boolean;
    currentUIElement: UIElement | null;
    currentRaccoonEmoji: string;
  };
  actions: {
    showPickupAnimation: () => void;
    hideGif: () => void;
    setFacingDirection: (direction: 'left' | 'right') => void;
    setRunning: (running: boolean) => void;
    resetSleepTimer: () => void;
    handleUIElementLanding: (element: UIElement | null) => void;
  };
}

export const useRaccoonAnimations = ({
  isOnGround,
  isMoving,
  isPickedUp,
  isDragging,
  charging,
}: UseRaccoonAnimationsProps): UseRaccoonAnimationsReturn => {
  // Visual State
  const [visualState, setVisualState] = useState({
    bounceCount: 0,
    showSparkles: false,
    showGif: false,
  });
  
  // Sleeping Animation State
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [sleepingEmojis, setSleepingEmojis] = useState<SleepingEmoji[]>([]);
  const lastActivityTime = useRef<number>(timeService.getTimestamp());
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepEmojiTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepEmojiCounter = useRef<number>(0);
  
  // Running Animation State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [facingDirection, setFacingDirection] = useState<'left' | 'right'>('right');
  
  // UI Element Interaction State
  const [isOnUIElement, setIsOnUIElement] = useState<boolean>(false);
  const [currentUIElement, setCurrentUIElement] = useState<UIElement | null>(null);
  const [currentRaccoonEmoji, setCurrentRaccoonEmoji] = useState<string>('🦝');
  const wasOnUIElement = useRef<boolean>(false);
  
  /**
   * Returns a random raccoon-related emoji
   */
  const getRandomRaccoonEmoji = useCallback(() => {
    return RACCOON_EMOJIS[Math.floor(Math.random() * RACCOON_EMOJIS.length)];
  }, []);
  
  /**
   * Returns a random weather-related emoji
   */
  const getRandomWeatherEmoji = useCallback(() => {
    return WEATHER_EMOJIS[Math.floor(Math.random() * WEATHER_EMOJIS.length)];
  }, []);
  
  /**
   * Starts the sleeping animation with floating zzz emojis
   */
  const startSleepingAnimation = useCallback(() => {
    sleepEmojiCounter.current = 0;
    
    // Add initial floating emojis
    const initialEmojis = [
      { id: sleepEmojiCounter.current++, delay: 0 },
      { id: sleepEmojiCounter.current++, delay: 0.5 },
      { id: sleepEmojiCounter.current++, delay: 1.0 },
    ];
    setSleepingEmojis(initialEmojis);
    
    // Continue spawning new emojis every 2.5 seconds
    sleepEmojiTimer.current = setInterval(() => {
      setSleepingEmojis(prev => {
        // Keep max 3 emojis, remove oldest and add new one
        const newEmojis = prev.length >= 3 ? prev.slice(1) : prev;
        return [...newEmojis, { id: sleepEmojiCounter.current++, delay: 0 }];
      });
    }, ANIMATION_TIMINGS.SLEEP_EMOJI_INTERVAL);
  }, []);
  
  /**
   * Resets the sleep timer and records activity
   */
  const resetSleepTimer = useCallback(() => {
    lastActivityTime.current = timeService.getTimestamp();
    
    // Clear existing sleep timer
    if (sleepTimer.current) {
      clearTimeout(sleepTimer.current);
      sleepTimer.current = null;
    }
    
    // Wake up if sleeping
    setIsSleeping(current => {
      if (current) {
        setSleepingEmojis([]);
        if (sleepEmojiTimer.current) {
          clearInterval(sleepEmojiTimer.current);
          sleepEmojiTimer.current = null;
        }
        return false;
      }
      return current;
    });
    
    // Start new sleep timer
    sleepTimer.current = setTimeout(() => {
      // Check conditions before sleeping
      if (!isPickedUp && !isDragging && !charging && isOnGround) {
        setIsSleeping(true);
        startSleepingAnimation();
      }
    }, ANIMATION_TIMINGS.SLEEP_TIMEOUT);
  }, [isPickedUp, isDragging, charging, isOnGround, startSleepingAnimation]);
  
  /**
   * Shows pickup animation with sparkles
   */
  const showPickupAnimation = useCallback(() => {
    setVisualState(prev => ({ 
      ...prev, 
      bounceCount: prev.bounceCount + 1,
      showSparkles: true,
      showGif: true,
    }));
    
    // Hide sparkles after animation
    setTimeout(() => {
      setVisualState(prev => ({ ...prev, showSparkles: false }));
    }, ANIMATION_TIMINGS.SPARKLE_DURATION);
  }, []);
  
  /**
   * Hides the GIF modal
   */
  const hideGif = useCallback(() => {
    setVisualState(prev => ({ ...prev, showGif: false }));
  }, []);
  
  /**
   * Handles landing on UI element
   */
  const handleUIElementLanding = useCallback((element: UIElement | null) => {
    if (element) {
      setIsOnUIElement(true);
      setCurrentUIElement(element);
      
      // Only set new random emoji if just landed
      if (!wasOnUIElement.current) {
        if (element.isPowerButton) {
          setCurrentRaccoonEmoji('⚡');
        } else if (element.isWeatherWidget) {
          setCurrentRaccoonEmoji(getRandomWeatherEmoji());
        } else {
          setCurrentRaccoonEmoji(getRandomRaccoonEmoji());
        }
      }
      
      // Add glow effect to element
      if (element.element) {
        if (element.isPowerButton) {
          element.element.style.boxShadow = '0 0 25px rgba(239, 176, 194, 1), 0 0 35px rgba(244, 114, 182, 0.8)';
          element.element.style.transform = 'scale(1.2)';
          element.element.style.transition = 'all 0.3s ease';
        } else if (element.isWeatherWidget) {
          element.element.style.boxShadow = '0 0 25px rgba(108, 59, 170, 0.8), 0 0 35px rgba(139, 123, 161, 0.6)';
          element.element.style.transform = 'scale(1.1) translateY(-3px)';
          element.element.style.transition = 'all 0.3s ease';
          element.element.style.background = 'rgba(108, 59, 170, 0.15)';
          element.element.style.borderColor = 'rgba(108, 59, 170, 0.6)';
        } else if (element.isText) {
          element.element.style.textShadow = '0 0 15px rgba(108, 59, 170, 0.8)';
          element.element.style.transition = 'text-shadow 0.3s ease';
        } else {
          element.element.style.boxShadow = '0 0 20px rgba(108, 59, 170, 0.6)';
          element.element.style.transition = 'box-shadow 0.3s ease';
        }
      }
      
      wasOnUIElement.current = true;
    } else {
      // Clear glow effect from previous UI element
      if (currentUIElement && currentUIElement.element) {
        if (currentUIElement.isPowerButton) {
          currentUIElement.element.style.boxShadow = '';
          currentUIElement.element.style.transform = '';
        } else if (currentUIElement.isWeatherWidget) {
          currentUIElement.element.style.boxShadow = '';
          currentUIElement.element.style.transform = '';
          currentUIElement.element.style.background = '';
          currentUIElement.element.style.borderColor = '';
        } else if (currentUIElement.isText) {
          currentUIElement.element.style.textShadow = '';
        } else {
          currentUIElement.element.style.boxShadow = '';
        }
      }
      
      setIsOnUIElement(false);
      setCurrentUIElement(null);
      wasOnUIElement.current = false;
    }
  }, [currentUIElement, getRandomRaccoonEmoji, getRandomWeatherEmoji]);
  
  // Initialize sleep timer
  useEffect(() => {
    resetSleepTimer();
    
    // Cleanup timers on unmount
    return () => {
      if (sleepTimer.current) {
        clearTimeout(sleepTimer.current);
      }
      if (sleepEmojiTimer.current) {
        clearInterval(sleepEmojiTimer.current);
      }
    };
  }, [resetSleepTimer]);
  
  // Reset sleep timer on activity
  useEffect(() => {
    if (isMoving || isPickedUp || isDragging || charging) {
      resetSleepTimer();
    }
  }, [isMoving, isPickedUp, isDragging, charging, resetSleepTimer]);
  
  return {
    visualState,
    sleepState: {
      isSleeping,
      sleepingEmojis,
    },
    movement: {
      isRunning,
      facingDirection,
    },
    uiInteraction: {
      isOnUIElement,
      currentUIElement,
      currentRaccoonEmoji,
    },
    actions: {
      showPickupAnimation,
      hideGif,
      setFacingDirection,
      setIsRunning,
      resetSleepTimer,
      handleUIElementLanding,
    },
  };
};