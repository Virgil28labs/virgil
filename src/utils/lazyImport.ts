import { type ComponentType, lazy } from 'react';
import type React from 'react';
import { logger } from '../lib/logger';

/**
 * Enhanced lazy import with retry logic and error boundaries
 */
export function lazyImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  componentName?: string,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importFn();
      
      // Handle both default and named exports
      if ('default' in module) {
        return { default: module.default };
      }
      
      // If componentName is provided, look for named export
      if (componentName && componentName in module) {
        return { default: module[componentName] as T };
      }
      
      // Fallback to first export if no default
      const firstExport = Object.values(module)[0] as T;
      if (firstExport) {
        return { default: firstExport };
      }
      
      throw new Error('No valid export found in module');
    } catch (error) {
      // Log error for debugging
      logger.error(`Failed to lazy load component${componentName ? ` ${componentName}` : ''}`, error as Error, {
        component: 'lazyImport',
        action: 'loadComponent',
        metadata: { componentName },
      });
      
      // Retry once after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const module = await importFn();
        if ('default' in module) {
          return { default: module.default };
        }
        if (componentName && componentName in module) {
          return { default: module[componentName] as T };
        }
        const firstExport = Object.values(module)[0] as T;
        if (firstExport) {
          return { default: firstExport };
        }
        throw new Error('No valid export found in module after retry');
      } catch (retryError) {
        logger.error('Component lazy load retry failed', retryError as Error, {
          component: 'lazyImport',
          action: 'retryLoadComponent',
          metadata: { componentName },
        });
        throw retryError;
      }
    }
  });
}

/**
 * Preload a lazy component to improve perceived performance
 */
export function preloadComponent(
  lazyComponent: React.LazyExoticComponent<ComponentType<unknown>>,
): void {
  // Access the internal _payload to trigger loading
  interface LazyComponentWithPayload {
    _payload?: () => void;
  }
  const componentWithPayload = lazyComponent as unknown as LazyComponentWithPayload;
  if (componentWithPayload._payload && typeof componentWithPayload._payload === 'function') {
    componentWithPayload._payload();
  }
}

/**
 * Create a lazy component with automatic preloading on hover
 */
export function lazyWithPreload<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  componentName?: string,
): {
  Component: React.LazyExoticComponent<T>;
  preload: () => void;
} {
  const Component = lazyImport(importFn, componentName);
  
  return {
    Component,
    preload: () => preloadComponent(Component),
  };
}