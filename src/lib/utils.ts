import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge class names
 * Used by shadcn/ui components for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
