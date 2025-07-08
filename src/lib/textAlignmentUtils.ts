/**
 * Text Alignment Detection Utilities
 * 
 * Provides comprehensive text alignment detection and positioning calculations
 * for dynamic UI element collision detection.
 */

import type { TextMeasurement, TextBounds } from '../types/physics.types'

/**
 * Calculates the precise X position of text based on its alignment
 */
export function calculateTextPosition(
  rect: DOMRect, 
  textWidth: number, 
  computedStyle: CSSStyleDeclaration
): number {
  const textAlign = computedStyle.textAlign;
  const direction = computedStyle.direction || 'ltr';
  
  // Calculate precise X position based on text alignment
  let calculatedX = rect.left; // Default fallback
  
  switch (textAlign) {
    case 'center':
      calculatedX = rect.left + (rect.width - textWidth) / 2;
      break;
    case 'right':
    case 'end':
      calculatedX = direction === 'rtl' ? rect.left : rect.right - textWidth;
      break;
    case 'left':
    case 'start':
      calculatedX = direction === 'rtl' ? rect.right - textWidth : rect.left;
      break;
    case 'justify':
      // For justify, use center as fallback since single words don't justify
      calculatedX = rect.left + (rect.width - textWidth) / 2;
      break;
    case 'inherit':
    case 'initial':
    case 'unset':
      // Fallback to visual detection for inherited/initial values
      calculatedX = calculateInheritedAlignment(rect, textWidth, computedStyle.parentElement);
      break;
    default:
      // Unknown value, use visual center as safest fallback
      calculatedX = rect.left + (rect.width - textWidth) / 2;
  }
  
  return calculatedX;
}

/**
 * Handles inherited text alignment by checking parent element
 */
function calculateInheritedAlignment(
  rect: DOMRect, 
  textWidth: number, 
  parentElement: HTMLElement | null
): number {
  if (!parentElement) {
    return rect.left; // Default to left if no parent
  }
  
  const parentAlign = window.getComputedStyle(parentElement).textAlign;
  
  if (parentAlign === 'center') {
    return rect.left + (rect.width - textWidth) / 2;
  } else if (parentAlign === 'right') {
    return rect.right - textWidth;
  } else {
    return rect.left;
  }
}

/**
 * Validates that calculated position is within container bounds
 */
export function validateTextPosition(
  calculatedX: number, 
  textWidth: number, 
  rect: DOMRect
): number {
  // Check if position is within container bounds
  if (calculatedX >= rect.left && calculatedX + textWidth <= rect.right) {
    // Position is valid, use calculated alignment
    return calculatedX;
  } else {
    // Position is out of bounds, clamp to container bounds
    return Math.max(rect.left, Math.min(calculatedX, rect.right - textWidth));
  }
}

// Global canvas instance for text measurements (performance optimization)
let globalCanvas: HTMLCanvasElement | null = null;
let globalContext: CanvasRenderingContext2D | null = null;

// LRU cache for text measurements
const textMeasurementCache = new Map<string, TextMeasurement>();
const MAX_CACHE_SIZE = 100;

/**
 * Gets or creates the global canvas instance for text measurements
 */
function getGlobalCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  if (!globalCanvas || !globalContext) {
    globalCanvas = document.createElement('canvas');
    globalContext = globalCanvas.getContext('2d');
    if (!globalContext) {
      throw new Error('Could not get canvas context');
    }
  }
  return { canvas: globalCanvas, context: globalContext };
}

/**
 * Creates a cache key for text measurement
 */
function createCacheKey(text: string, fontConfig: string): string {
  return `${text}|${fontConfig}`;
}

/**
 * Manages LRU cache size by removing oldest entries
 */
function pruneCache(): void {
  if (textMeasurementCache.size >= MAX_CACHE_SIZE) {
    const firstKey = textMeasurementCache.keys().next().value;
    textMeasurementCache.delete(firstKey);
  }
}

/**
 * Measures text dimensions using Canvas API for precise calculations
 * Optimized with global canvas reuse and LRU caching
 */
export function measureText(
  text: string, 
  computedStyle: CSSStyleDeclaration
): TextMeasurement {
  const fontSize = parseFloat(computedStyle.fontSize);
  const fontConfig = `${computedStyle.fontWeight} ${fontSize}px ${computedStyle.fontFamily}`;
  const cacheKey = createCacheKey(text, fontConfig);
  
  // Check cache first
  const cached = textMeasurementCache.get(cacheKey);
  if (cached) {
    // Move to end (most recently used)
    textMeasurementCache.delete(cacheKey);
    textMeasurementCache.set(cacheKey, cached);
    return cached;
  }
  
  // Get global canvas instance
  const { context } = getGlobalCanvas();
  
  context.font = fontConfig;
  
  // Get text metrics
  const metrics = context.measureText(text);
  
  const measurement: TextMeasurement = {
    width: metrics.width,
    height: fontSize
  };
  
  // Cache the result
  pruneCache();
  textMeasurementCache.set(cacheKey, measurement);
  
  return measurement;
}

/**
 * Calculates visual text positioning within its container
 */
export function calculateVisualTextBounds(
  rect: DOMRect, 
  fontSize: number
): TextBounds {
  // Calculate visual top of text (where characters actually start)
  const visualTextTop = rect.top + ((rect.height - fontSize) / 2);
  const textBaseline = visualTextTop + (fontSize * 0.8); // Baseline is typically 80% down from top
  
  return {
    top: visualTextTop,
    baseline: textBaseline,
    height: fontSize
  };
}