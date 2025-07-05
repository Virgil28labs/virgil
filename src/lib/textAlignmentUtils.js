/**
 * Text Alignment Detection Utilities
 * 
 * Provides comprehensive text alignment detection and positioning calculations
 * for dynamic UI element collision detection.
 */

/**
 * Calculates the precise X position of text based on its alignment
 * @param {DOMRect} rect - Element bounding rectangle
 * @param {number} textWidth - Measured text width
 * @param {CSSStyleDeclaration} computedStyle - Element computed styles
 * @returns {number} Calculated X position for text start
 */
export function calculateTextPosition(rect, textWidth, computedStyle) {
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
 * @param {DOMRect} rect - Element bounding rectangle
 * @param {number} textWidth - Measured text width
 * @param {HTMLElement} parentElement - Parent element to check
 * @returns {number} Calculated X position
 */
function calculateInheritedAlignment(rect, textWidth, parentElement) {
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
 * @param {number} calculatedX - Calculated X position
 * @param {number} textWidth - Text width
 * @param {DOMRect} rect - Container bounds
 * @returns {number} Validated and potentially clamped X position
 */
export function validateTextPosition(calculatedX, textWidth, rect) {
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
 * @param {string} text - Text content to measure
 * @param {CSSStyleDeclaration} computedStyle - Element computed styles
 * @returns {object} Object with width and height measurements
 */
export function measureText(text, computedStyle) {
  const fontSize = parseFloat(computedStyle.fontSize);
  
  // Create canvas for precise text measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
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
 * @param {DOMRect} rect - Element bounding rectangle
 * @param {number} fontSize - Font size in pixels
 * @returns {object} Object with x, y positioning and baseline info
 */
export function calculateVisualTextBounds(rect, fontSize) {
  // Calculate visual top of text (where characters actually start)
  const visualTextTop = rect.top + ((rect.height - fontSize) / 2);
  const textBaseline = visualTextTop + (fontSize * 0.8); // Baseline is typically 80% down from top
  
  return {
    top: visualTextTop,
    baseline: textBaseline,
    height: fontSize
  };
}