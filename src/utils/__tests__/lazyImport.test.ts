/**
 * lazyImport Test Suite
 * 
 * Tests lazy loading utilities for React components with retry logic,
 * error handling, and preloading capabilities.
 */

import React from 'react';
import { lazyImport, preloadComponent, lazyWithPreload } from '../lazyImport';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock React.lazy
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  lazy: jest.fn(),
}));

// Mock component for testing
const MockComponent = () => React.createElement('div', null, 'Mock Component');
const MockNamedComponent = () => React.createElement('div', null, 'Named Component');

describe('lazyImport', () => {
  const mockLazy = React.lazy as jest.MockedFunction<typeof React.lazy>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset React.lazy mock
    mockLazy.mockImplementation((factory) => {
      // Return a mock lazy component that calls the factory
      const lazyComponent = {
        _factory: factory,
        _payload: factory,
        $$typeof: Symbol.for('react.lazy'),
      };
      return lazyComponent as React.LazyExoticComponent<React.ComponentType>;
    });
  });

  describe('lazyImport', () => {
    it('handles default exports correctly', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      lazyImport(mockImportFn);
      
      expect(React.lazy).toHaveBeenCalled();
      
      // Get the factory function passed to React.lazy
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockComponent });
      expect(mockImportFn).toHaveBeenCalled();
    });

    it('handles named exports with componentName', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        NamedComponent: MockNamedComponent,
        otherExport: () => 'other',
      });

      lazyImport(mockImportFn, 'NamedComponent');
      
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockNamedComponent });
    });

    it('falls back to first export when no default', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        FirstComponent: MockComponent,
        SecondComponent: MockNamedComponent,
      });

      lazyImport(mockImportFn);
      
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockComponent });
    });

    it('throws error when no valid export found', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({});

      lazyImport(mockImportFn);
      
      const factory = mockLazy.mock.calls[0][0];
      
      // Since this will trigger retry logic, let's expect a different error
      await expect(factory()).rejects.toThrow();
    });

    it('logs error when component fails to load', async () => {
      const importError = new Error('Module load failed');
      const mockImportFn = jest.fn().mockRejectedValue(importError);

      lazyImport(mockImportFn, 'TestComponent');
      
      const factory = mockLazy.mock.calls[0][0];
      
      try {
        await factory();
      } catch (_error) {
        // Expected to throw
      }
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to lazy load component TestComponent',
        importError,
        {
          component: 'lazyImport',
          action: 'loadComponent',
          metadata: { componentName: 'TestComponent' },
        },
      );
    });
  });

  describe('preloadComponent', () => {
    it('calls _payload function when available', () => {
      const mockPayload = jest.fn();
      const mockLazyComponent = {
        _payload: mockPayload,
      } as React.LazyExoticComponent<React.ComponentType> & { _payload?: unknown };

      preloadComponent(mockLazyComponent);

      expect(mockPayload).toHaveBeenCalled();
    });

    it('handles lazy component without _payload', () => {
      const mockLazyComponent = {} as React.LazyExoticComponent<React.ComponentType> & { _payload?: unknown };

      expect(() => preloadComponent(mockLazyComponent)).not.toThrow();
    });

    it('handles lazy component with non-function _payload', () => {
      const mockLazyComponent = {
        _payload: 'not a function',
      } as React.LazyExoticComponent<React.ComponentType> & { _payload?: unknown };

      expect(() => preloadComponent(mockLazyComponent)).not.toThrow();
    });
  });

  describe('lazyWithPreload', () => {
    it('returns component and preload function', () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      const result = lazyWithPreload(mockImportFn, 'TestComponent');

      expect(result).toHaveProperty('Component');
      expect(result).toHaveProperty('preload');
      expect(typeof result.preload).toBe('function');
      expect(React.lazy).toHaveBeenCalled();
    });

    it('preload function triggers component loading', () => {
      const mockPayload = jest.fn();
      
      // Mock React.lazy to return a component with _payload
      mockLazy.mockImplementation((factory) => ({
        _factory: factory,
        _payload: mockPayload,
        _result: null,
        $$typeof: Symbol.for('react.lazy'),
      }) as React.LazyExoticComponent<React.ComponentType> & { _payload?: () => void });

      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      const { preload } = lazyWithPreload(mockImportFn);

      preload();

      expect(mockPayload).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined componentName gracefully', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      lazyImport(mockImportFn, undefined);
      
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockComponent });
    });

    it('handles empty string componentName', async () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      lazyImport(mockImportFn, '');
      
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockComponent });
    });

    it('handles import function returning null', () => {
      const mockImportFn = jest.fn().mockResolvedValue(null);

      expect(() => lazyImport(mockImportFn)).not.toThrow();
    });

    it('handles import function returning undefined', () => {
      const mockImportFn = jest.fn().mockResolvedValue(undefined);

      expect(() => lazyImport(mockImportFn)).not.toThrow();
    });

    it('preserves component types', () => {
      const mockImportFn = jest.fn().mockResolvedValue({
        default: MockComponent,
      });

      const LazyComponent = lazyImport<typeof MockComponent>(mockImportFn);
      
      // Should not throw TypeScript errors
      expect(LazyComponent).toBeDefined();
    });

    it('handles complex module structures', async () => {
      const complexModule = {
        default: MockComponent,
        NamedExport: MockNamedComponent,
        utilities: {
          helper: () => 'helper',
        },
        constants: {
          VERSION: '1.0.0',
        },
      };

      const mockImportFn = jest.fn().mockResolvedValue(complexModule);

      // Test with default export (should use default)
      lazyImport(mockImportFn);
      
      const factory = mockLazy.mock.calls[0][0];
      const result = await factory();
      
      expect(result).toEqual({ default: MockComponent });
    });
  });
});