import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Extend Playwright test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  mockGeolocation: void;
}>({
  // Fixture for authenticated page
  authenticatedPage: async ({ page, context }, use) => {
    // Mock authentication by setting local storage
    await context.addInitScript(() => {
      // Note: virgil-user key removed - using virgil-user-v1 from ContextStore instead
      // If needed for tests, use: window.localStorage.setItem('virgil-user-v1', ...)
    });
    
    await use(page);
  },
  
  // Fixture for mocking geolocation
  mockGeolocation: [async ({ context }, use) => {
    // Set San Francisco coordinates
    await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    await context.grantPermissions(['geolocation']);
    await use();
  }, { auto: true }],
});

export { expect };

/**
 * Utility functions for E2E tests
 */
export class TestHelpers {
  /**
   * Wait for the app to be fully loaded
   */
  static async waitForAppLoad(page: Page) {
    // Wait for React to mount
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    
    // Wait for any loading indicators to disappear
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 30000 });
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
  }
  
  /**
   * Take a screenshot with consistent naming
   */
  static async screenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `e2e/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }
  
  /**
   * Mock API responses
   */
  static async mockAPI(page: Page, endpoint: string, response: any) {
    await page.route(`**/api/v1/${endpoint}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }
  
  /**
   * Check accessibility
   */
  static async checkA11y(page: Page, options?: any) {
    // This would integrate with axe-core or similar
    // For now, basic checks
    const violations = [];
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
    if (imagesWithoutAlt > 0) {
      violations.push(`${imagesWithoutAlt} images without alt text`);
    }
    
    // Check for form labels
    const inputsWithoutLabel = await page.$$eval('input:not([aria-label]):not([id])', inputs => inputs.length);
    if (inputsWithoutLabel > 0) {
      violations.push(`${inputsWithoutLabel} inputs without labels`);
    }
    
    return violations;
  }
  
  /**
   * Measure performance metrics
   */
  static async getPerformanceMetrics(page: Page) {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalBlockingTime: 0, // Would need more complex calculation
      };
    });
    
    return metrics;
  }
  
  /**
   * Upload test files
   */
  static async uploadTestImage(page: Page, selector: string) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const testImagePath = join(__dirname, '../fixtures/test-image.jpg');
    
    await page.setInputFiles(selector, testImagePath);
  }
}