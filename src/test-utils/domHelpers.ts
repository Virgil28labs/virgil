/**
 * DOM Helper utilities for tests
 * Provides safe element access methods to avoid non-null assertions
 */

/**
 * Safely get the parent element of an HTML element
 * @param element - The child element
 * @returns The parent element
 * @throws Error if no parent element exists
 */
export function getParentElement(element: HTMLElement): HTMLElement {
  const parent = element.parentElement;
  if (!parent) {
    throw new Error(`Element has no parent: ${element.tagName}`);
  }
  return parent;
}

/**
 * Assert that an element exists and return it
 * @param element - The element that might be null
 * @param message - Optional error message
 * @returns The non-null element
 * @throws Error if element is null
 */
export function assertElement<T extends Element>(
  element: T | null,
  message?: string,
): T {
  if (!element) {
    throw new Error(message || 'Element not found');
  }
  return element;
}

/**
 * Get an element and assert it exists
 * @param container - The container to query within
 * @param selector - The CSS selector
 * @returns The found element
 * @throws Error if element not found
 */
export function getRequiredElement<T extends Element = Element>(
  container: ParentNode,
  selector: string,
): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

/**
 * Get the closest ancestor that matches a selector
 * @param element - The starting element
 * @param selector - The CSS selector
 * @returns The matching ancestor
 * @throws Error if no matching ancestor found
 */
export function getClosestElement<T extends Element = Element>(
  element: Element,
  selector: string,
): T {
  const closest = element.closest<T>(selector);
  if (!closest) {
    throw new Error(`No ancestor found matching: ${selector}`);
  }
  return closest;
}