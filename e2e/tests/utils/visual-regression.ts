import { Page, expect } from '@playwright/test';
import { join } from 'path';

export interface VisualRegressionOptions {
  threshold?: number;
  maxDiffPixels?: number;
  animations?: 'disabled' | 'allow';
  mask?: string[];
  clip?: { x: number; y: number; width: number; height: number };
}

/**
 * Visual regression testing utilities
 */
export class VisualRegression {
  private static baselineDir = 'e2e/baselines';
  private static diffDir = 'e2e/diffs';
  
  /**
   * Compare page screenshot with baseline
   */
  static async comparePageSnapshot(
    page: Page,
    name: string,
    options: VisualRegressionOptions = {}
  ) {
    const {
      threshold = 0.2,
      maxDiffPixels = 100,
      animations = 'disabled',
      mask = [],
      clip,
    } = options;
    
    // Disable animations for consistent screenshots
    if (animations === 'disabled') {
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `,
      });
    }
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    
    // Take screenshot
    await expect(page).toHaveScreenshot(`${name}.png`, {
      threshold,
      maxDiffPixels,
      mask: mask.map(selector => page.locator(selector)),
      clip,
      fullPage: true,
      animations,
    });
  }
  
  /**
   * Compare element screenshot with baseline
   */
  static async compareElementSnapshot(
    page: Page,
    selector: string,
    name: string,
    options: VisualRegressionOptions = {}
  ) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible' });
    
    const {
      threshold = 0.2,
      maxDiffPixels = 100,
      animations = 'disabled',
    } = options;
    
    await expect(element).toHaveScreenshot(`${name}.png`, {
      threshold,
      maxDiffPixels,
      animations,
    });
  }
  
  /**
   * Test responsive design across viewports
   */
  static async testResponsiveDesign(
    page: Page,
    name: string,
    viewports: Array<{ width: number; height: number; label: string }>
  ) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow layout to settle
      
      await this.comparePageSnapshot(
        page,
        `${name}-${viewport.label}`,
        { animations: 'disabled' }
      );
    }
  }
  
  /**
   * Test dark/light theme variations
   */
  static async testThemeVariations(page: Page, name: string) {
    // Test light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await this.comparePageSnapshot(page, `${name}-light-theme`);
    
    // Test dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await this.comparePageSnapshot(page, `${name}-dark-theme`);
  }
  
  /**
   * Common viewports for responsive testing
   */
  static readonly VIEWPORTS = {
    mobile: { width: 375, height: 667, label: 'mobile' },
    tablet: { width: 768, height: 1024, label: 'tablet' },
    desktop: { width: 1920, height: 1080, label: 'desktop' },
    '4k': { width: 3840, height: 2160, label: '4k' },
  };
}