/**
 * Performance monitoring utility that works with CSS performance markers
 * Provides hooks for tracking render performance and user interactions
 */

import { timeService } from '../services/TimeService';
import { logger } from '../lib/logger';

export class PerformanceMonitor {
  private markers: Map<string, number> = new Map();
  private observers: Map<string, IntersectionObserver> = new Map();
  
  constructor() {
    this.initializeMarkers();
  }
  
  /**
   * Initialize performance markers and observers
   */
  private initializeMarkers(): void {
    // Mark initial paint timing
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.mark('fcp', entry.startTime);
          } else if (entry.name === 'largest-contentful-paint') {
            this.mark('lcp', entry.startTime);
          }
        }
      });
      
      paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    }
  }
  
  /**
   * Mark a performance milestone
   */
  mark(name: string, time?: number): void {
    const timestamp = time ?? performance.now();
    this.markers.set(name, timestamp);
    
    // Trigger CSS marker
    const element = document.querySelector(`[data-perf-mark="${name}"]`);
    if (element) {
      element.classList.add('marked');
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`${name}: ${timestamp.toFixed(2)}ms`, {
        component: 'PerformanceMonitor',
        action: 'mark',
        metadata: { name, timestamp: timestamp.toFixed(2) },
      });
    }
  }
  
  /**
   * Measure time between two markers
   */
  measure(startMark: string, endMark: string): number | null {
    const start = this.markers.get(startMark);
    const end = this.markers.get(endMark);
    
    if (start === undefined || end === undefined) {
      return null;
    }
    
    return end - start;
  }
  
  /**
   * Mark when app becomes interactive
   */
  markInteractive(): void {
    this.mark('interactive');
    document.body.classList.add('app-interactive');
  }
  
  /**
   * Mark when hero content is rendered
   */
  markHeroRendered(): void {
    this.mark('hero-rendered');
    const hero = document.querySelector('.dashboard');
    hero?.classList.add('hero-rendered');
  }
  
  /**
   * Mark when API data is loaded
   */
  markApiLoaded(): void {
    this.mark('api-loaded');
    document.body.classList.add('api-loaded');
  }
  
  /**
   * Mark when animations are ready
   */
  markAnimationsReady(): void {
    this.mark('animations-ready');
    document.body.classList.add('animations-ready');
  }
  
  /**
   * Observe element visibility for lazy loading
   */
  observeElement(element: Element, callback: (isVisible: boolean) => void): void {
    const observerId = `observer-${timeService.getTimestamp()}`;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          entry.target.classList.toggle('in-viewport', isVisible);
          callback(isVisible);
          
          if (isVisible) {
            this.mark(`viewport-${entry.target.id || entry.target.className}`);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      },
    );
    
    observer.observe(element);
    this.observers.set(observerId, observer);
  }
  
  /**
   * Monitor scroll performance
   */
  monitorScrollPerformance(callback?: (fps: number) => void): void {
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        if (callback) {
          callback(fps);
        }
        
        // Add performance class based on FPS
        document.body.classList.toggle('perf-heavy', fps < 30);
        document.body.classList.toggle('perf-critical', fps < 15);
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  /**
   * Enable visual performance debugging
   */
  enableDebugMode(): void {
    document.body.setAttribute('data-debug-perf', 'true');
    
    // Create performance indicator
    const indicator = document.createElement('div');
    indicator.className = 'perf-indicator';
    indicator.textContent = 'Perf: Loading...';
    document.body.appendChild(indicator);
    
    // Update indicator with metrics
    setInterval(() => {
      const metrics = this.getMetrics();
      indicator.textContent = `FCP: ${metrics.fcp?.toFixed(0)}ms | LCP: ${metrics.lcp?.toFixed(0)}ms`;
    }, 1000);
  }
  
  /**
   * Get all performance metrics
   */
  getMetrics(): Record<string, number | undefined> {
    return {
      fcp: this.markers.get('fcp'),
      lcp: this.markers.get('lcp'),
      interactive: this.markers.get('interactive'),
      heroRendered: this.markers.get('hero-rendered'),
      apiLoaded: this.markers.get('api-loaded'),
      animationsReady: this.markers.get('animations-ready'),
    };
  }
  
  /**
   * Report metrics to analytics
   */
  reportMetrics(): void {
    const metrics = this.getMetrics();
    
    // Report to analytics service
    if (window.gtag) {
      Object.entries(metrics).forEach(([name, value]) => {
        if (value !== undefined && window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: `virgil_${name}`,
            value: Math.round(value),
          });
        }
      });
    }
    
    // Log summary in development
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }
  }
  
  /**
   * Clean up observers
   */
  dispose(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.markers.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  document.addEventListener('DOMContentLoaded', () => {
    // Enable debug mode with Shift+P
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key === 'P') {
        performanceMonitor.enableDebugMode();
      }
    });
  });
}