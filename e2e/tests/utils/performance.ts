import { Page, BrowserContext } from '@playwright/test';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  
  // Additional metrics
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
  tbt: number; // Total Blocking Time
  
  // Memory metrics
  jsHeapSize: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  
  // Network metrics
  totalRequests: number;
  totalTransferSize: number;
  cachedRequests: number;
}

export interface PerformanceBudget {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  tti?: number;
  tbt?: number;
  jsHeapSize?: number;
  totalTransferSize?: number;
}

/**
 * Performance testing utilities
 */
export class PerformanceTest {
  /**
   * Collect Core Web Vitals and other performance metrics
   */
  static async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    // Inject web-vitals library
    await page.addScriptTag({
      content: `
        // Web Vitals collection
        window.webVitals = { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 };
        
        // Simulated web-vitals collection (in real app, use the actual library)
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              window.webVitals.lcp = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              window.webVitals.fcp = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });
      `,
    });
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow metrics to settle
    
    // Collect metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      // Calculate Total Blocking Time (simplified)
      let tbt = 0;
      const longTasks = performance.getEntriesByType('longtask') || [];
      longTasks.forEach((task: any) => {
        if (task.duration > 50) {
          tbt += task.duration - 50;
        }
      });
      
      // Calculate Cumulative Layout Shift (simplified)
      let cls = 0;
      const layoutShifts = performance.getEntriesByType('layout-shift') || [];
      layoutShifts.forEach((shift: any) => {
        if (!shift.hadRecentInput) {
          cls += shift.value;
        }
      });
      
      // Network metrics
      const totalRequests = resources.length;
      const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const cachedRequests = resources.filter(r => r.transferSize === 0).length;
      
      return {
        // Core Web Vitals
        lcp: (window as any).webVitals?.lcp || 0,
        fid: 0, // Requires user interaction
        cls: cls,
        
        // Additional metrics
        fcp: (window as any).webVitals?.fcp || 0,
        ttfb: navigation.responseStart - navigation.requestStart,
        tti: navigation.domInteractive - navigation.fetchStart,
        tbt: tbt,
        
        // Memory metrics
        jsHeapSize: (performance as any).memory?.jsHeapSizeLimit || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        
        // Network metrics
        totalRequests,
        totalTransferSize,
        cachedRequests,
      };
    });
    
    return metrics;
  }
  
  /**
   * Run performance test with budget validation
   */
  static async runTest(
    page: Page,
    url: string,
    budget: PerformanceBudget
  ): Promise<{ metrics: PerformanceMetrics; violations: string[] }> {
    // Enable performance APIs
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Performance.enable');
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Collect metrics
    const metrics = await this.collectMetrics(page);
    
    // Check budget violations
    const violations: string[] = [];
    
    if (budget.lcp && metrics.lcp > budget.lcp) {
      violations.push(`LCP (${metrics.lcp.toFixed(0)}ms) exceeds budget (${budget.lcp}ms)`);
    }
    if (budget.fid && metrics.fid > budget.fid) {
      violations.push(`FID (${metrics.fid.toFixed(0)}ms) exceeds budget (${budget.fid}ms)`);
    }
    if (budget.cls && metrics.cls > budget.cls) {
      violations.push(`CLS (${metrics.cls.toFixed(3)}) exceeds budget (${budget.cls})`);
    }
    if (budget.fcp && metrics.fcp > budget.fcp) {
      violations.push(`FCP (${metrics.fcp.toFixed(0)}ms) exceeds budget (${budget.fcp}ms)`);
    }
    if (budget.ttfb && metrics.ttfb > budget.ttfb) {
      violations.push(`TTFB (${metrics.ttfb.toFixed(0)}ms) exceeds budget (${budget.ttfb}ms)`);
    }
    if (budget.jsHeapSize && metrics.usedJSHeapSize > budget.jsHeapSize) {
      violations.push(`JS Heap (${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB) exceeds budget (${(budget.jsHeapSize / 1024 / 1024).toFixed(1)}MB)`);
    }
    if (budget.totalTransferSize && metrics.totalTransferSize > budget.totalTransferSize) {
      violations.push(`Transfer size (${(metrics.totalTransferSize / 1024).toFixed(0)}KB) exceeds budget (${(budget.totalTransferSize / 1024).toFixed(0)}KB)`);
    }
    
    return { metrics, violations };
  }
  
  /**
   * Profile JavaScript execution
   */
  static async profileJavaScript(page: Page, actions: () => Promise<void>) {
    const cdpSession = await page.context().newCDPSession(page);
    
    // Start profiling
    await cdpSession.send('Profiler.enable');
    await cdpSession.send('Profiler.start');
    
    // Run actions
    await actions();
    
    // Stop profiling
    const { profile } = await cdpSession.send('Profiler.stop');
    await cdpSession.send('Profiler.disable');
    
    // Analyze profile (simplified)
    const totalTime = profile.endTime - profile.startTime;
    const nodes = profile.nodes || [];
    const hotspots = nodes
      .filter((node: any) => node.hitCount > 0)
      .sort((a: any, b: any) => b.hitCount - a.hitCount)
      .slice(0, 10);
    
    return {
      totalTime,
      hotspots,
    };
  }
  
  /**
   * Test performance under different network conditions
   */
  static async testNetworkConditions(page: Page, url: string) {
    const conditions = {
      '4G': { download: 12 * 1024 * 1024 / 8, upload: 3 * 1024 * 1024 / 8, latency: 20 },
      '3G': { download: 1.6 * 1024 * 1024 / 8, upload: 768 * 1024 / 8, latency: 100 },
      'Slow 3G': { download: 400 * 1024 / 8, upload: 400 * 1024 / 8, latency: 400 },
    };
    
    const results: Record<string, PerformanceMetrics> = {};
    
    for (const [name, condition] of Object.entries(conditions)) {
      // Emulate network conditions
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: condition.download,
        uploadThroughput: condition.upload,
        latency: condition.latency,
      });
      
      // Navigate and collect metrics
      await page.goto(url, { waitUntil: 'networkidle' });
      results[name] = await this.collectMetrics(page);
      
      // Reset network conditions
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    }
    
    return results;
  }
}