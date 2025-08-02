/**
 * Global window type extensions
 */

declare global {
  interface Window {
    // Google Analytics
    gtag?: (command: string, ...args: any[]) => void;
    
    // Performance monitoring
    performanceMonitor?: {
      mark: (name: string) => void;
      measure: (start: string, end: string) => number | null;
      getMetrics: () => Record<string, number | undefined>;
    };
  }
}

export {};