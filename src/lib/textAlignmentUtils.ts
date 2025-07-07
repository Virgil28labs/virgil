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

/**
 * Measures text dimensions using Canvas API for precise calculations
 */
export function measureText(
  text: string, 
  computedStyle: CSSStyleDeclaration
): TextMeasurement {
  const fontSize = parseFloat(computedStyle.fontSize);
  
  // Create canvas for precise text measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }
  
  context.font = `${computedStyle.fontWeight} ${fontSize}px ${computedStyle.fontFamily}`;
  
  // Get text metrics
  const metrics = context.measureText(text);
  
  return {
    width: metrics.width,
    height: fontSize
  };
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