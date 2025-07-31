/**
 * E2E Test Helper Utilities
 * 
 * Common utilities for Playwright E2E tests including authentication,
 * element waiting, and test data management.
 */

import { Page, Locator, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for application to be ready
   */
  async waitForAppReady() {
    // Wait for React to mount
    await this.page.waitForSelector('[data-testid="app-container"]', { 
      timeout: 10000 
    });
    
    // Wait for initial loading to complete
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
      return loadingElements.length === 0;
    }, { timeout: 15000 });
  }

  /**
   * Clear all local storage and session data
   */
  async clearStorageData() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB databases
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    });
  }

  /**
   * Wait for element with custom timeout
   */
  async waitForElement(selector: string, timeout = 5000): Promise<Locator> {
    await this.page.waitForSelector(selector, { timeout });
    return this.page.locator(selector);
  }

  /**
   * Wait for text to appear on page
   */
  async waitForText(text: string, timeout = 5000) {
    await this.page.waitForFunction(
      (searchText) => document.body.textContent?.includes(searchText),
      text,
      { timeout }
    );
  }

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Simulate typing with human-like delays
   */
  async typeWithDelay(selector: string, text: string, delay = 50) {
    const element = await this.waitForElement(selector);
    await element.click();
    await element.fill(''); // Clear existing text
    
    for (const char of text) {
      await element.type(char, { delay });
    }
  }

  /**
   * Wait for network requests to settle
   */
  async waitForNetworkIdle(timeout = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Check if element is visible in viewport
   */
  async isElementInViewport(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (!box) return false;

    const viewport = this.page.viewportSize();
    if (!viewport) return false;

    return (
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    );
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout = 10000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Mock API responses for testing
   */
  async mockApiResponse(urlPattern: string | RegExp, responseData: any) {
    await this.page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Check accessibility violations
   */
  async checkAccessibility() {
    // Basic accessibility checks
    const missingAltImages = await this.page.locator('img:not([alt])').count();
    expect(missingAltImages).toBe(0);

    const missingLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    expect(missingLabels).toBe(0);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Test Tab navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => 
      document.activeElement?.tagName
    );
    expect(focusedElement).toBeTruthy();
  }

  /**
   * Wait for animation to complete
   */
  async waitForAnimation(selector: string) {
    await this.page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return true;
        const styles = window.getComputedStyle(element);
        return styles.animationPlayState === 'paused' || 
               styles.animationPlayState === 'running' && 
               styles.animationDuration === '0s';
      },
      selector,
      { timeout: 5000 }
    );
  }
}