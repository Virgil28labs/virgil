// Central export for all utility functions

export * from './format';
export * from './validation';

// cn utility for combining class names with Tailwind CSS
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}