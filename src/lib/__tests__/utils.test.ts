/**
 * Utils Tests
 * 
 * Tests the utility functions including:
 * - Class name merging with clsx integration
 * - Conditional class names and styling
 * - Array and object class name inputs
 * - Boolean conditions for classes
 * - Edge cases and type safety
 */

import { cn } from '../utils';

describe('cn (class name utility)', () => {
  it('should merge simple class names', () => {
    const result = cn('class1', 'class2', 'class3');
    
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle conditional class names', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'base-class',
      isActive && 'active',
      isDisabled && 'disabled',
    );
    
    expect(result).toBe('base-class active');
  });

  it('should handle object-based class names', () => {
    const result = cn({
      'btn': true,
      'btn-primary': true,
      'btn-disabled': false,
      'btn-large': true,
    });
    
    expect(result).toBe('btn btn-primary btn-large');
  });

  it('should handle array-based class names', () => {
    const result = cn(['btn', 'btn-primary'], ['text-white', 'font-bold']);
    
    expect(result).toBe('btn btn-primary text-white font-bold');
  });

  it('should handle mixed input types', () => {
    const isVisible = true;
    
    const result = cn(
      'component',
      ['flex', 'items-center'],
      {
        'hidden': !isVisible,
        'visible': isVisible,
      },
      isVisible && 'opacity-100',
    );
    
    expect(result).toBe('component flex items-center visible opacity-100');
  });

  it('should handle empty and falsy values', () => {
    const result = cn(
      'base',
      '',
      null,
      undefined,
      false,
      0,
      'valid-class',
    );
    
    expect(result).toBe('base valid-class');
  });

  it('should handle no arguments', () => {
    const result = cn();
    
    expect(result).toBe('');
  });

  it('should handle duplicate class names', () => {
    const result = cn('btn', 'btn', 'primary', 'btn');
    
    // clsx preserves duplicates unless specifically configured otherwise
    expect(result).toBe('btn btn primary btn');
  });

  it('should handle nested arrays', () => {
    const result = cn([
      'outer',
      ['inner1', 'inner2'],
      [['deep1', 'deep2']],
    ]);
    
    expect(result).toBe('outer inner1 inner2 deep1 deep2');
  });

  it('should handle complex conditional logic', () => {
    const theme: string = 'dark';
    const size: string = 'large';
    const isDisabled = false;
    const hasError = true;
    
    const result = cn(
      // Base classes
      'button',
      'rounded',
      
      // Theme classes
      {
        'bg-white text-black': theme === 'light',
        'bg-black text-white': theme === 'dark',
      },
      
      // Size classes
      theme === 'dark' && {
        'px-2 py-1 text-sm': size === 'small',
        'px-4 py-2 text-base': size === 'medium',
        'px-6 py-3 text-lg': size === 'large',
      },
      
      // State classes
      isDisabled && 'opacity-50 cursor-not-allowed',
      hasError && 'border-red-500',
      !isDisabled && !hasError && 'hover:shadow-lg',
    );
    
    expect(result).toBe('button rounded bg-black text-white px-6 py-3 text-lg border-red-500');
  });

  it('should handle string interpolation scenarios', () => {
    const variant = 'primary';
    const size = 'md';
    
    const result = cn(
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      variant === 'primary' && 'shadow-md',
    );
    
    expect(result).toBe('btn btn-primary btn-md shadow-md');
  });

  it('should work with Tailwind CSS utility classes', () => {
    const result = cn(
      'flex',
      'items-center',
      'justify-between',
      'p-4',
      'bg-gray-100',
      'hover:bg-gray-200',
      'transition-colors',
      'duration-200',
    );
    
    expect(result).toBe('flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 transition-colors duration-200');
  });

  it('should handle responsive design classes', () => {
    const isMobile = false;
    const isTablet = true;
    
    const result = cn(
      'w-full',
      {
        'sm:w-1/2': !isMobile,
        'md:w-1/3': !isMobile && !isTablet,
        'lg:w-1/4': !isMobile && !isTablet,
        'xl:w-1/5': !isMobile && !isTablet,
      },
      isTablet && 'md:w-1/2',
      isMobile && 'w-full',
    );
    
    expect(result).toBe('w-full sm:w-1/2 md:w-1/2');
  });

  it('should handle function return values', () => {
    const getStateClasses = (isActive: boolean, isError: boolean) => {
      if (isError) return 'text-red-500 border-red-300';
      if (isActive) return 'text-blue-500 border-blue-300';
      return 'text-gray-500 border-gray-300';
    };
    
    const result = cn(
      'input',
      'px-3 py-2',
      getStateClasses(false, true),
    );
    
    expect(result).toBe('input px-3 py-2 text-red-500 border-red-300');
  });

  it('should handle CSS module classes', () => {
    const styles = {
      component: 'component_abc123',
      active: 'active_def456',
      disabled: 'disabled_ghi789',
    };
    
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      styles.component,
      {
        [styles.active]: isActive,
        [styles.disabled]: isDisabled,
      },
    );
    
    expect(result).toBe('component_abc123 active_def456');
  });

  it('should maintain performance with many classes', () => {
    const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
    
    const startTime = performance.now();
    const result = cn(...manyClasses);
    const endTime = performance.now();
    
    expect(result).toContain('class-0');
    expect(result).toContain('class-99');
    expect(endTime - startTime).toBeLessThan(10); // Should be very fast
  });

  it('should handle edge case characters in class names', () => {
    const result = cn(
      'normal-class',
      'class-with-dashes',
      'class_with_underscores',
      'class123with456numbers',
      'UPPERCASE-CLASS',
    );
    
    expect(result).toBe('normal-class class-with-dashes class_with_underscores class123with456numbers UPPERCASE-CLASS');
  });
});