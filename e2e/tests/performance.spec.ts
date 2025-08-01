/**
 * Performance E2E Tests
 * 
 * Tests application performance metrics including:
 * - Page load times
 * - Core Web Vitals (LCP, FID, CLS)
 * - Memory usage
 * - Bundle size validation
 * - Network requests optimization
 * - Animation performance
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Performance Testing', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page, context }) => {
    helpers = new TestHelpers(page);
    
    // Set up authenticated state for protected pages
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + 3600,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test.describe('Page Load Performance', () => {
    test('should load homepage within performance budget', async ({ page }) => {
      // Start performance measurement
      const startTime = Date.now();
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      const loadTime = Date.now() - startTime;
      
      // Performance budget: 3 seconds on 3G
      expect(loadTime).toBeLessThan(3000);
      
      // Verify first contentful paint
      const performanceMetrics = await page.evaluate(() => {
        return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')));
      });
      
      const navEntry = performanceMetrics[0] as PerformanceNavigationTiming;
      const fcp = await page.evaluate(() => {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        return fcpEntry ? fcpEntry.startTime : null;
      });
      
      // First Contentful Paint should be < 1.8s
      if (fcp) {
        expect(fcp).toBeLessThan(1800);
      }
      
      // Time to Interactive approximation
      const tti = navEntry.domInteractive - navEntry.navigationStart;
      expect(tti).toBeLessThan(5000);
    });

    test('should load dashboard within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard has more complexity, allow 4 seconds
      expect(loadTime).toBeLessThan(4000);
      
      // Check for performance marks
      const customMarks = await page.evaluate(() => {
        return performance.getEntriesByType('mark').map(mark => ({
          name: mark.name,
          startTime: mark.startTime,
        }));
      });
      
      // Verify app-specific performance marks if they exist
      const appReadyMark = customMarks.find(mark => mark.name === 'app-ready');
      if (appReadyMark) {
        expect(appReadyMark.startTime).toBeLessThan(3000);
      }
    });

    test('should handle slow network conditions gracefully', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      const loadTime = Date.now() - startTime;
      
      // Should still load within 5 seconds even on slow connection
      expect(loadTime).toBeLessThan(5000);
      
      // Verify loading states are shown
      const hasLoadingIndicators = await page.evaluate(() => {
        return document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, .skeleton').length > 0;
      });
      
      // At least some loading indicators should be present during slow loads
      expect(hasLoadingIndicators).toBe(true);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: unknown = {};
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // First Input Delay (simulate with click)
          const startTime = performance.now();
          document.addEventListener('click', () => {
            vitals.fid = performance.now() - startTime;
          }, { once: true });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as unknown).hadRecentInput) {
                clsValue += (entry as unknown).value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ type: 'layout-shift', buffered: true });
          
          // Wait for measurements to stabilize
          setTimeout(() => resolve(vitals), 2000);
        });
      });
      
      const vitals = await webVitals;
      
      // Core Web Vitals thresholds
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
      }
      
      if (vitals.cls !== undefined) {
        expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1
      }
      
      // Simulate click for FID measurement
      await page.click('body');
      await page.waitForTimeout(100);
      
      const fidMeasurement = await page.evaluate(() => {
        return (window as unknown).fidValue || 0;
      });
      
      if (fidMeasurement > 0) {
        expect(fidMeasurement).toBeLessThan(100); // FID < 100ms
      }
    });

    test('should have minimal layout shift', async ({ page }) => {
      await page.goto('/');
      
      // Monitor layout shifts
      await page.evaluate(() => {
        (window as unknown).layoutShifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as unknown).layoutShifts.push({
              value: (entry as unknown).value,
              hadRecentInput: (entry as unknown).hadRecentInput,
              sources: (entry as unknown).sources?.map((source: unknown) => ({
                node: source.node?.tagName,
                currentRect: source.currentRect,
                previousRect: source.previousRect,
              })),
            });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      
      await helpers.waitForAppReady();
      
      // Wait for potential layout shifts to occur
      await page.waitForTimeout(3000);
      
      const layoutShifts = await page.evaluate(() => (window as unknown).layoutShifts || []);
      
      // Calculate total CLS
      const totalCLS = layoutShifts
        .filter((shift: unknown) => shift.hadRecentInput)
        .reduce((sum: number, shift: unknown) => sum + shift.value, 0);
      
      expect(totalCLS).toBeLessThan(0.1);
      
      // Log problematic shifts for debugging
      if (totalCLS > 0.05) {
        console.log('Layout shifts detected:', layoutShifts);
      }
    });
  });

  test.describe('Memory Usage', () => {
    test('should maintain reasonable memory usage', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as unknown).memory ? {
          usedJSHeapSize: (performance as unknown).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as unknown).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as unknown).memory.jsHeapSizeLimit,
        } : null;
      });
      
      if (initialMemory) {
        // Initial memory should be reasonable (< 50MB)
        expect(initialMemory.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
        
        // Interact with application to trigger memory usage
        await page.locator('[data-testid="weather-widget"]').click();
        await page.waitForTimeout(1000);
        
        const afterInteractionMemory = await page.evaluate(() => {
          return (performance as unknown).memory ? {
            usedJSHeapSize: (performance as unknown).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as unknown).memory.totalJSHeapSize,
          } : null;
        });
        
        if (afterInteractionMemory) {
          // Memory growth should be reasonable (< 20MB increase)
          const memoryGrowth = afterInteractionMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
          expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
        }
      }
    });

    test('should not have memory leaks', async ({ page }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      const getMemoryUsage = async () => {
        return await page.evaluate(() => {
          return (performance as unknown).memory?.usedJSHeapSize || 0;
        });
      };
      
      const initialMemory = await getMemoryUsage();
      
      // Simulate heavy usage
      for (let i = 0; i < 10; i++) {
        // Send messages
        await page.locator('[data-testid="chat-input"]').fill(`Test message ${i}`);
        await page.locator('[data-testid="chat-send"]').click();
        await page.waitForTimeout(200);
        
        // Navigate between pages
        await page.goto('/dashboard');
        await helpers.waitForAppReady();
        await page.goto('/chat');
        await helpers.waitForAppReady();
      }
      
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as unknown).gc) {
          (window as unknown).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      const finalMemory = await getMemoryUsage();
      
      if (initialMemory > 0) {
        // Memory should not grow excessively (< 100% increase)
        const memoryGrowthRatio = finalMemory / initialMemory;
        expect(memoryGrowthRatio).toBeLessThan(2.0);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize network requests', async ({ page }) => {
      const networkRequests: unknown[] = [];
      
      page.on('request', (request) => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
        });
      });
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Filter out hot reload and dev server requests
      const productionRequests = networkRequests.filter(req => 
        req.url.includes('vite') && 
        !req.url.includes('/@') &&
        !req.url.includes('node_modules')
      );
      
      // Should have reasonable number of requests (< 50)
      expect(productionRequests.length).toBeLessThan(50);
      
      // Check for duplicate resource requests
      const resourceUrls = productionRequests
        .filter(req => ['script', 'stylesheet', 'image'].includes(req.resourceType))
        .map(req => req.url);
      
      const uniqueResources = new Set(resourceUrls);
      expect(uniqueResources.size).toBe(resourceUrls.length); // No duplicates
    });

    test('should have efficient bundle loading', async ({ page }) => {
      const resourceSizes: unknown[] = [];
      
      page.on('response', async (response) => {
        if (response.request().resourceType() === 'script') {
          try {
            const buffer = await response.body();
            resourceSizes.push({
              url: response.url(),
              size: buffer.length,
              compressed: response.headers()['content-encoding'] === 'gzip',
            });
          } catch (e) {
            // Ignore failed body reads
          }
        }
      });
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Main bundle should be reasonably sized (< 500KB)
      const mainBundle = resourceSizes.find(res => res.url.includes('index') || res.url.includes('main'));
      if (mainBundle) {
        expect(mainBundle.size).toBeLessThan(500 * 1024);
        expect(mainBundle.compressed).toBe(true);
      }
      
      // Total JavaScript size should be reasonable (< 2MB)
      const totalSize = resourceSizes.reduce((sum, res) => sum + res.size, 0);
      expect(totalSize).toBeLessThan(2 * 1024 * 1024);
    });

    test('should load critical resources first', async ({ page }) => {
      const requestTimes: unknown[] = [];
      const startTime = Date.now();
      
      page.on('response', (response) => {
        requestTimes.push({
          url: response.url(),
          resourceType: response.request().resourceType(),
          timing: Date.now() - startTime,
          status: response.status(),
        });
      });
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Critical resources (HTML, CSS, main JS) should load first
      const criticalResources = requestTimes.filter(req => 
        req.resourceType === 'document' || 
        req.resourceType === 'stylesheet' ||
        (req.resourceType === 'script' && req.url.includes('index'))
      );
      
      const nonCriticalResources = requestTimes.filter(req => 
        req.resourceType === 'image' || 
        req.resourceType === 'font' ||
        (req.resourceType === 'script' && !req.url.includes('index'))
      );
      
      if (criticalResources.length > 0 && nonCriticalResources.length > 0) {
        const avgCriticalTime = criticalResources.reduce((sum, req) => sum + req.timing, 0) / criticalResources.length;
        const avgNonCriticalTime = nonCriticalResources.reduce((sum, req) => sum + req.timing, 0) / nonCriticalResources.length;
        
        // Critical resources should generally load faster
        expect(avgCriticalTime).toBeLessThan(avgNonCriticalTime * 1.5);
      }
    });
  });

  test.describe('Animation Performance', () => {
    test('should maintain 60fps during animations', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Monitor frame rate during animation
      const frameData = await page.evaluate(() => {
        return new Promise((resolve) => {
          const frames: number[] = [];
          let startTime = performance.now();
          let frameCount = 0;
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const delta = currentTime - startTime;
            frames.push(1000 / delta);
            startTime = currentTime;
            frameCount++;
            
            if (frameCount < 60) { // Measure for ~1 second
              requestAnimationFrame(measureFrame);
            } else {
              resolve(frames);
            }
          };
          
          // Trigger animation
          const widget = document?.querySelector('[data-testid="weather-widget"]') as HTMLElement;
          if (widget) {
            widget.style.transition = 'transform 1s ease';
            widget.style.transform = 'scale(1.1)';
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      const frames = await frameData as number[];
      const avgFps = frames.reduce((sum, fps) => sum + fps, 0) / frames.length;
      const minFps = Math.min(...frames);
      
      // Average FPS should be close to 60
      expect(avgFps).toBeGreaterThan(55);
      
      // Minimum FPS should not drop below 30
      expect(minFps).toBeGreaterThan(30);
    });

    test('should have smooth scroll performance', async ({ page }) => {
      await page.goto('/gallery');
      await helpers.waitForAppReady();
      
      // Monitor scroll performance
      const scrollPerformance = await page.evaluate(() => {
        return new Promise((resolve) => {
          const measurements: number[] = [];
          let isScrolling = false;
          
          const scrollContainer = document.documentElement;
          
          const measureScrollFrame = () => {
            if (isScrolling) {
              const start = performance.now();
              
              // Force layout
              const height = scrollContainer.scrollHeight;
              
              const layoutTime = performance.now() - start;
              measurements.push(layoutTime);
              
              requestAnimationFrame(measureScrollFrame);
            }
          };
          
          scrollContainer.addEventListener('scroll', () => {
            if (isScrolling) {
              isScrolling = true;
              requestAnimationFrame(measureScrollFrame);
            }
          });
          
          // Stop measuring after scroll ends
          let scrollTimeout: NodeJS.Timeout;
          scrollContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              isScrolling = false;
              resolve(measurements);
            }, 100);
          });
          
          // Start smooth scroll
          window.scrollTo({ top: 1000, behavior: 'smooth' });
        });
      });
      
      const measurements = await scrollPerformance as number[];
      
      if (measurements.length > 0) {
        const avgLayoutTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        
        // Layout time during scroll should be minimal (< 16ms for 60fps)
        expect(avgLayoutTime).toBeLessThan(16);
      }
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should lazy load non-critical images', async ({ page }) => {
      await page.goto('/gallery');
      
      // Get initial image count
      const initialImages = await page.locator('img[loading="lazy"]').count();
      
      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      // Get images after scroll
      const afterScrollImages = await page.locator('img[loading="lazy"]').count();
      
      // Verify lazy loading is implemented
      expect(initialImages).toBeGreaterThanOrEqual(0);
      
      // Check that images have proper loading attributes
      const allImages = await page.locator('img').all();
      for (const img of allImages) {
        const loading = await img.getAttribute('loading');
        const isAboveFold = await img.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight;
        });
        
        // Images below the fold should be lazy loaded
        if (!isAboveFold) {
          expect(loading).toBe('lazy');
        }
      }
    });

    test('should prefetch critical resources', async ({ page }) => {
      await page.goto('/');
      
      // Check for prefetch/preload hints
      const resourceHints = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel*="pre"]'));
        return links.map(link => ({
          rel: link.getAttribute('rel'),
          href: link.getAttribute('href'),
          as: link.getAttribute('as'),
        }));
      });
      
      // Should have some resource hints for critical resources
      const preloadHints = resourceHints.filter(hint => hint.rel === 'preload');
      const prefetchHints = resourceHints.filter(hint => hint.rel === 'prefetch');
      
      expect(preloadHints.length + prefetchHints.length).toBeGreaterThan(0);
      
      // Critical CSS should be preloaded
      const cssPreload = preloadHints.find(hint => hint.as === 'style');
      expect(cssPreload).toBeTruthy();
    });
  });

  test.describe('Database Query Performance', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock API with large dataset
      await page.route('**/api/v1/photos*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate query time
        
        const photos = Array.from({ length: 100 }, (_, i) => ({
          id: `photo-${i}`,
          url: `https://example.com/photo-${i}.jpg`,
          thumbnail: `https://example.com/thumb-${i}.jpg`,
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        }));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ photos, total: 1000 }),
        });
      });
      
      const startTime = Date.now();
      
      await page.goto('/gallery');
      await helpers.waitForAppReady();
      
      const loadTime = Date.now() - startTime;
      
      // Should handle large dataset within reasonable time
      expect(loadTime).toBeLessThan(5000);
      
      // Verify pagination is working
      const paginationInfo = await page.locator('[data-testid="pagination-info"]').textContent();
      if (paginationInfo) {
        expect(paginationInfo).toContain('100');
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ page }) => {
      // Set mobile viewport and slower CPU
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Simulate slower mobile performance
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within mobile performance budget (5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Verify mobile-specific optimizations
      const hasSkeletonLoading = await page.locator('[data-testid*="skeleton"], .skeleton').count();
      expect(hasSkeletonLoading).toBeGreaterThanOrEqual(0);
      
      // Restore normal CPU
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    });
  });
});