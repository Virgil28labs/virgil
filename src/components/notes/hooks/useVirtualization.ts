/**
 * Virtual scrolling hook for performance optimization
 * Renders only visible items to handle large lists efficiently
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualizationOptions {
  /** Total number of items */
  itemCount: number
  /** Height of each item in pixels */
  itemHeight: number
  /** Height of the container in pixels */
  containerHeight: number
  /** Number of items to render outside visible area */
  overscan?: number
}

interface VirtualizationResult {
  /** Items that should be rendered */
  visibleRange: { start: number; end: number }
  /** Total height of all items */
  totalHeight: number
  /** Offset for the visible items */
  offsetY: number
  /** Ref to attach to scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Handler for scroll events */
  handleScroll: () => void
}

/**
 * Hook for virtualizing large lists
 * Only renders visible items + overscan for smooth scrolling
 */
export function useVirtualization({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: VirtualizationOptions): VirtualizationResult {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    // Add overscan
    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(itemCount, visibleEnd + overscan);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Calculate total height
  const totalHeight = itemCount * itemHeight;

  // Calculate offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop);
    }
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  return {
    visibleRange,
    totalHeight,
    offsetY,
    scrollContainerRef,
    handleScroll,
  };
}

/**
 * Hook for dynamic height virtualization
 * Handles items with varying heights
 */
export function useDynamicVirtualization<T>(
  items: T[],
  estimatedItemHeight: number,
  containerHeight: number,
  _getItemHeight?: (item: T, index: number) => number,
) {
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate cumulative heights
  const cumulativeHeights = useMemo(() => {
    const heights = [0];
    let total = 0;
    
    for (let i = 0; i < items.length; i++) {
      const height = itemHeights[i] || estimatedItemHeight;
      total += height;
      heights.push(total);
    }
    
    return heights;
  }, [items.length, itemHeights, estimatedItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let start = 0;
    let end = items.length;

    // Binary search for start
    let low = 0;
    let high = items.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (cumulativeHeights[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    start = Math.max(0, low - 1);

    // Find end
    for (let i = start; i < items.length; i++) {
      if (cumulativeHeights[i] > scrollTop + containerHeight) {
        end = i + 1;
        break;
      }
    }

    return { start, end: Math.min(end, items.length) };
  }, [scrollTop, containerHeight, items.length, cumulativeHeights]);

  // Update item height
  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      if (prev[index] !== height) {
        const next = [...prev];
        next[index] = height;
        return next;
      }
      return prev;
    });
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  return {
    visibleRange,
    totalHeight: cumulativeHeights[cumulativeHeights.length - 1],
    getItemOffset: (index: number) => cumulativeHeights[index] || 0,
    scrollContainerRef,
    updateItemHeight,
  };
}