import { test, expect } from '../utils/test-helpers';
import { TestHelpers } from '../utils/test-helpers';
import { VisualRegression } from '../utils/visual-regression';
import { PerformanceTest } from '../utils/performance';
import { AccessibilityTest } from '../utils/accessibility';

/**
 * Example multi-browser test suite demonstrating all capabilities
 */
test.describe('Multi-Browser Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await TestHelpers.mockAPI(page, 'weather', {
      temp: 72,
      condition: 'sunny',
      location: 'San Francisco',
    });
    
    await TestHelpers.mockAPI(page, 'chat', {
      message: { content: 'Hello from mocked API', role: 'assistant' },
    });
  });
  
  test('should work across all browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Wait for app to load
    await TestHelpers.waitForAppLoad(page);
    
    // Take browser-specific screenshot
    await TestHelpers.screenshot(page, `home-${browserName}`);
    
    // Basic functionality test
    const title = await page.locator('h1').textContent();
    expect(title).toContain('Virgil');
    
    // Test browser-specific features
    if (browserName === 'chromium') {
      // Chrome-specific tests
      console.log('Running Chrome-specific tests');
    } else if (browserName === 'firefox') {
      // Firefox-specific tests
      console.log('Running Firefox-specific tests');
    } else if (browserName === 'webkit') {
      // Safari-specific tests
      console.log('Running Safari-specific tests');
    }
  });
  
  test('should maintain visual consistency', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppLoad(page);
    
    // Test responsive design
    await VisualRegression.testResponsiveDesign(page, 'home-page', [
      VisualRegression.VIEWPORTS.mobile,
      VisualRegression.VIEWPORTS.tablet,
      VisualRegression.VIEWPORTS.desktop,
    ]);
    
    // Test theme variations
    await VisualRegression.testThemeVariations(page, 'home-page');
    
    // Test specific components
    await VisualRegression.compareElementSnapshot(
      page,
      '[data-testid="raccoon-animation"]',
      'raccoon-component',
      { animations: 'allow' } // Allow animations for this component
    );
  });
  
  test('should meet performance budgets', async ({ page, browserName }) => {
    // Skip performance tests on non-Chromium browsers
    test.skip(browserName !== 'chromium', 'Performance metrics only available in Chromium');
    
    const budget = {
      lcp: 2500, // 2.5s
      fid: 100, // 100ms
      cls: 0.1,
      fcp: 1800, // 1.8s
      ttfb: 600, // 600ms
      totalTransferSize: 500 * 1024, // 500KB
    };
    
    const { metrics, violations } = await PerformanceTest.runTest(
      page,
      '/',
      budget
    );
    
    // Log metrics
    console.log('Performance Metrics:', {
      LCP: `${metrics.lcp.toFixed(0)}ms`,
      FCP: `${metrics.fcp.toFixed(0)}ms`,
      CLS: metrics.cls.toFixed(3),
      TTFB: `${metrics.ttfb.toFixed(0)}ms`,
      'Transfer Size': `${(metrics.totalTransferSize / 1024).toFixed(0)}KB`,
    });
    
    // Assert no violations
    expect(violations).toHaveLength(0);
  });
  
  test('should be accessible', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppLoad(page);
    
    // Run automated accessibility scan
    const violations = await AccessibilityTest.scan(page, {
      detailedReport: true,
    });
    
    // Check specific accessibility features
    const keyboardViolations = await AccessibilityTest.testKeyboardNavigation(page, [
      'button',
      'a',
      'input',
      '[role="button"]',
    ]);
    
    const focusViolations = await AccessibilityTest.testFocusManagement(page);
    const screenReaderIssues = await AccessibilityTest.testScreenReader(page);
    const formIssues = await AccessibilityTest.testFormAccessibility(page);
    
    // Combine all issues
    const allIssues = [
      ...violations.map(v => v.description),
      ...keyboardViolations,
      ...focusViolations,
      ...screenReaderIssues,
      ...formIssues,
    ];
    
    // Assert no critical issues
    expect(allIssues).toHaveLength(0);
  });
  
  test('should handle network conditions gracefully', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Network emulation only available in Chromium');
    
    const results = await PerformanceTest.testNetworkConditions(page, '/');
    
    // Log results for each network condition
    Object.entries(results).forEach(([condition, metrics]) => {
      console.log(`${condition} Performance:`, {
        LCP: `${metrics.lcp.toFixed(0)}ms`,
        FCP: `${metrics.fcp.toFixed(0)}ms`,
        TTFB: `${metrics.ttfb.toFixed(0)}ms`,
      });
    });
    
    // Assert app loads within reasonable time even on slow networks
    expect(results['Slow 3G'].lcp).toBeLessThan(10000); // 10 seconds
    expect(results['3G'].lcp).toBeLessThan(5000); // 5 seconds
    expect(results['4G'].lcp).toBeLessThan(3000); // 3 seconds
  });
  
  test('should handle user interactions', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppLoad(page);
    
    // Test photo capture
    await page.click('[data-testid="camera-button"]');
    await page.waitForSelector('[data-testid="camera-modal"]');
    
    // Mock camera permissions
    await page.context().grantPermissions(['camera']);
    
    // Take photo (mocked)
    await page.click('[data-testid="capture-button"]');
    await page.waitForSelector('[data-testid="photo-preview"]');
    
    // Save photo
    await page.click('[data-testid="save-photo"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Test chat interaction
    await page.fill('[data-testid="chat-input"]', 'Hello Virgil!');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Wait for response
    await expect(page.locator('[data-testid="chat-response"]')).toContainText('Hello from mocked API');
  });
  
  test('should sync data across tabs', async ({ context }) => {
    // Open two tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Navigate both to app
    await page1.goto('/');
    await page2.goto('/');
    
    // Wait for both to load
    await TestHelpers.waitForAppLoad(page1);
    await TestHelpers.waitForAppLoad(page2);
    
    // Make change in first tab
    await page1.click('[data-testid="theme-toggle"]');
    
    // Verify change reflected in second tab
    await page2.waitForTimeout(500); // Allow for sync
    const theme2 = await page2.getAttribute('html', 'data-theme');
    expect(theme2).toBe('dark');
  });
});