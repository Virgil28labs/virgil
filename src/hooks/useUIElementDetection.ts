import { useState, useEffect, useRef, useCallback } from 'react';
import { timeService } from '../services/TimeService';
import { UI_SELECTORS } from '../constants/raccoonConstants';
import type { UIElement, Position } from '../types/physics.types';

interface UseUIElementDetectionProps {
  raccoonPosition: Position;
  address?: { formatted?: string } | null;
  ipLocation?: { ip?: string } | null;
  hasGPSLocation: boolean;
  hasIpLocation: boolean;
}

interface UseUIElementDetectionReturn {
  uiElements: UIElement[];
  detectUIElements: () => UIElement[];
}

export const useUIElementDetection = ({
  raccoonPosition,
  address,
  ipLocation,
  hasGPSLocation,
  hasIpLocation,
}: UseUIElementDetectionProps): UseUIElementDetectionReturn => {
  const [uiElements, setUiElements] = useState<UIElement[]>([]);

  // Cache for UI element detection results
  const uiElementsCache = useRef<{
    elements: UIElement[];
    lastUpdate: number;
    lastHash: string;
    lastRaccoonPos: Position;
  }>({
    elements: [],
    lastUpdate: 0,
    lastHash: '',
    lastRaccoonPos: { x: 0, y: 0 },
  });

  /**
   * Creates a hash of current DOM state to detect changes
   */
  const createDOMHash = useCallback((): string => {
    const relevantData = [
      address?.formatted || '',
      ipLocation?.ip || '',
      hasGPSLocation.toString(),
      hasIpLocation.toString(),
      window.innerWidth,
      window.innerHeight,
    ];
    return relevantData.join('|');
  }, [address, ipLocation, hasGPSLocation, hasIpLocation]);

  /**
   * Detects and measures UI elements that the raccoon can interact with
   * Uses caching and only updates when DOM changes or raccoon moves significantly
   */
  const detectUIElements = useCallback((): UIElement[] => {
    const now = timeService.getTimestamp();
    const currentHash = createDOMHash();
    const cache = uiElementsCache.current;

    // Check if raccoon has moved significantly (more than 50px)
    const raccoonMoved = Math.abs(raccoonPosition.x - cache.lastRaccoonPos.x) > 50 ||
                        Math.abs(raccoonPosition.y - cache.lastRaccoonPos.y) > 50;

    // Return cached result if DOM hasn't changed, cache is recent, and raccoon hasn't moved much
    if (cache.lastHash === currentHash &&
        now - cache.lastUpdate < 1000 &&
        !raccoonMoved) {
      return cache.elements;
    }

    const elements: UIElement[] = [];

    // Define text element selectors once
    const textSelectors = new Set([
      '.virgil-logo',
      '.datetime-display .time',
      '.datetime-display .date',
      '.datetime-display .day',
      '.user-name',
      '.user-email',
      '.street-address',
      '.ip-address',
      '.elevation',
    ]);

    UI_SELECTORS.forEach((selector) => {
      const domElements = document.querySelectorAll(selector);
      domElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Only visible elements

          // For text elements, calculate precise text bounds
          let adjustedWidth = rect.width;
          let adjustedX = rect.left;
          let adjustedY = rect.top;
          let textBaseline = rect.top;

          if (textSelectors.has(selector)) {
            // Simplified text collision detection for better performance
            const computedStyle = window.getComputedStyle(element);
            const textAlign = computedStyle.textAlign;
            const fontSize = parseFloat(computedStyle.fontSize);

            // Simple width estimation for collision (good enough for most text)
            const textContent = (element.textContent || '').trim();
            const estimatedWidth = textContent.length * fontSize * 0.6; // Rough approximation

            // Calculate text position based on alignment (simplified)
            if (textAlign === 'center') {
              adjustedX = rect.left + (rect.width - estimatedWidth) / 2;
            } else if (textAlign === 'right') {
              adjustedX = rect.right - estimatedWidth;
            } else {
              adjustedX = rect.left; // Default to left
            }

            // Simple vertical positioning
            adjustedY = rect.top;
            textBaseline = rect.top + fontSize * 0.8;
            adjustedWidth = Math.min(estimatedWidth, rect.width);
          }

          elements.push({
            id: `${selector.replace(/[.\s]/g, '')}_${index}`,
            type: selector,
            x: adjustedX,
            y: adjustedY,
            width: adjustedWidth,
            height: rect.height,
            bottom: rect.bottom,
            right: adjustedX + adjustedWidth,
            element: element as HTMLElement,
            textBaseline: textBaseline,
            isText: textSelectors.has(selector),
            isPowerButton: selector === '.power-button',
            isWeatherWidget: selector === '.weather-widget',
          });
        }
      });
    });

    // Update cache
    uiElementsCache.current = {
      elements,
      lastUpdate: now,
      lastHash: currentHash,
      lastRaccoonPos: { ...raccoonPosition },
    };

    return elements;
  }, [createDOMHash, raccoonPosition]);

  // Update UI elements with optimized caching
  useEffect(() => {
    const updateUIElements = () => {
      setUiElements(detectUIElements());
    };

    // Initial detection
    updateUIElements();

    // Update on resize
    const handleResize = () => {
      // Clear cache on resize to force recomputation
      uiElementsCache.current.lastHash = '';
      updateUIElements();
    };

    window.addEventListener('resize', handleResize);

    // Reduced frequency since we now have smart caching
    const interval = setInterval(updateUIElements, 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [detectUIElements]);

  // Update when raccoon moves significantly
  useEffect(() => {
    const updateUIElements = () => {
      setUiElements(detectUIElements());
    };
    updateUIElements();
  }, [raccoonPosition.x, raccoonPosition.y, detectUIElements]);

  return {
    uiElements,
    detectUIElements,
  };
};
