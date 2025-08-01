/**
 * Accessibility E2E Tests
 * 
 * Tests compliance with WCAG 2.1 guidelines including:
 * - Keyboard navigation
 * - Screen reader support
 * - Color contrast
 * - Focus management
 * - ARIA attributes
 * - Semantic HTML
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Accessibility Compliance', () => {
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

  test.describe('Login Page Accessibility', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      // Inject axe-core
      await injectAxe(page);
      
      // Run accessibility checks
      const violations = await getViolations(page);
      
      // Log violations for debugging
      if (violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(violations, null, 2));
      }
      
      // Assert no violations
      expect(violations).toHaveLength(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      // Start keyboard navigation
      await page.keyboard.press('Tab');
      
      // Verify first focusable element
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBeTruthy();
      
      // Tab through all interactive elements
      const focusableElements = [];
      for (let i = 0; i < 10; i++) {
        const element = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          testId: document.activeElement?.getAttribute('data-testid'),
          ariaLabel: document.activeElement?.getAttribute('aria-label'),
        }));
        
        if (element.tag) {
          focusableElements.push(element);
        }
        
        await page.keyboard.press('Tab');
        
        // Check if we've cycled back
        const currentTestId = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-testid')
        );
        if (currentTestId === focusableElements[0]?.testId) break;
      }
      
      // Verify we have focusable elements
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Verify all have proper labels
      focusableElements.forEach(el => {
        expect(el.ariaLabel || el.testId).toBeTruthy();
      });
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      // Get all headings
      const headings = await page.evaluate(() => {
        const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return allHeadings.map(h => ({
          level: parseInt(h.tagName[1]),
          text: h.textContent,
        }));
      });
      
      // Verify h1 exists
      const h1Count = headings.filter(h => h.level === 1).length;
      expect(h1Count).toBe(1);
      
      // Verify proper hierarchy (no skipped levels)
      let previousLevel = 0;
      headings.forEach(h => {
        expect(h.level - previousLevel).toBeLessThanOrEqual(1);
        previousLevel = h.level;
      });
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      await injectAxe(page);
      
      // Check only color contrast
      const violations = await getViolations(page, {
        runOnly: ['color-contrast'],
      });
      
      expect(violations).toHaveLength(0);
    });

    test('should announce form errors to screen readers', async ({ page }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      // Mock authentication error
      await page.route('**/auth/v1/token', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        });
      });
      
      // Try to login
      await page.locator('[data-testid="provider-email"]').click();
      await page.locator('[data-testid="email-input"]').fill('test@example.com');
      await page.locator('[data-testid="password-input"]').fill('wrong');
      await page.locator('[data-testid="login-submit"]').click();
      
      // Check for ARIA live region
      const liveRegion = await page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
      await expect(liveRegion).toBeVisible();
      await expect(liveRegion).toContainText('Invalid login credentials');
    });
  });

  test.describe('Dashboard Accessibility', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      await injectAxe(page);
      const violations = await getViolations(page);
      
      expect(violations).toHaveLength(0);
    });

    test('should have proper landmark regions', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Check for main landmarks
      await expect(page.locator('nav[role="navigation"], [role="navigation"]')).toBeVisible();
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      
      // Check for complementary regions if sidebars exist
      const sidebar = page.locator('aside, [role="complementary"]');
      const sidebarCount = await sidebar.count();
      expect(sidebarCount).toBeGreaterThanOrEqual(0);
    });

    test('should manage focus on widget interactions', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Click weather widget
      const weatherWidget = page.locator('[data-testid="weather-widget"]');
      await weatherWidget.click();
      
      // If modal opens, check focus management
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 1000 })) {
        // Verify focus moved to modal
        const focusedElement = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
        expect(focusedElement).toBeTruthy();
        
        // Verify focus trap
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Focus should still be within modal
        const stillInModal = await page.evaluate(() => 
          document.activeElement?.closest('[role="dialog"]') !== null
        );
        expect(stillInModal).toBeTruthy();
        
        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
        
        // Verify focus returned to trigger
        const focusBack = await page.evaluate(() => 
          document.activeElement?.closest('[data-testid="weather-widget"]') !== null
        );
        expect(focusBack).toBeTruthy();
      }
    });

    test('should have accessible widget descriptions', async ({ page }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Check all widgets have proper labels
      const widgets = await page.locator('[data-testid$="-widget"]').all();
      
      for (const widget of widgets) {
        const ariaLabel = await widget.getAttribute('aria-label');
        const ariaDescribedBy = await widget.getAttribute('aria-describedby');
        const title = await widget.getAttribute('title');
        
        // At least one accessibility attribute should be present
        expect(ariaLabel || ariaDescribedBy || title).toBeTruthy();
      }
    });
  });

  test.describe('Chat Interface Accessibility', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      await injectAxe(page);
      const violations = await getViolations(page, {
        exclude: [['.monaco-editor']], // Exclude code editor if present
      });
      
      expect(violations).toHaveLength(0);
    });

    test('should properly label chat messages', async ({ page }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      // Check message structure
      const messages = await page.locator('[data-testid="chat-message"]').all();
      
      for (const message of messages) {
        // Check role indication
        const role = await message.getAttribute('data-role');
        expect(['user', 'assistant']).toContain(role);
        
        // Check ARIA label
        const ariaLabel = await message.getAttribute('aria-label');
        expect(ariaLabel).toContain(role);
        
        // Check timestamp accessibility
        const timestamp = message.locator('[data-testid="message-timestamp"]');
        if (await timestamp.isVisible()) {
          const timeLabel = await timestamp.getAttribute('aria-label');
          expect(timeLabel).toContain('at');
        }
      }
    });

    test('should handle chat input accessibility', async ({ page }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Check label
      const label = await chatInput.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label).toContain('message');
      
      // Check multiline support
      const multiline = await chatInput.getAttribute('aria-multiline');
      expect(multiline).toBe('true');
      
      // Check character limit announcement if present
      await chatInput.fill('Test message');
      const charCount = page.locator('[data-testid="char-count"]');
      if (await charCount.isVisible()) {
        const ariaLive = await charCount.getAttribute('aria-live');
        expect(ariaLive).toBe('polite');
      }
    });
  });

  test.describe('Photo Gallery Accessibility', () => {
    test('should support keyboard navigation in gallery', async ({ page }) => {
      await page.goto('/gallery');
      await helpers.waitForAppReady();
      
      // Focus first photo
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip navigation
      
      // Check if focused on gallery item
      const focusedElement = await page.evaluate(() => 
        document.activeElement?.closest('[data-testid="gallery-photo"]')
      );
      expect(focusedElement).toBeTruthy();
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      
      // Check focus moved
      const newFocusedElement = await page.evaluate(() => 
        document.activeElement?.getAttribute('data-testid')
      );
      expect(newFocusedElement).toBeTruthy();
      
      // Open with Enter
      await page.keyboard.press('Enter');
      
      // Check modal opened
      const photoViewer = page.locator('[data-testid="photo-viewer"]');
      await expect(photoViewer).toBeVisible();
      
      // Navigate with arrows in viewer
      await page.keyboard.press('ArrowRight');
      await expect(photoViewer.locator('[data-testid="photo-index"]')).toContainText('2');
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(photoViewer).not.toBeVisible();
    });

    test('should provide alt text for images', async ({ page }) => {
      await page.goto('/gallery');
      await helpers.waitForAppReady();
      
      // Check all images have alt text
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should have sufficient touch target sizes', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Check interactive elements
      const buttons = await page.locator('button, [role="button"], a').all();
      
      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG 2.1 requires 44x44 pixels minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support zoom without horizontal scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Zoom to 200%
      await page.evaluate(() => {
        document.documentElement.style.zoom = '2';
      });
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => 
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      
      expect(hasHorizontalScroll).toBeFalsy();
    });
  });

  test.describe('Focus Indicators', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      
      // Check focus styles
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        
        const styles = window.getComputedStyle(el);
        const focusStyles = window.getComputedStyle(el, ':focus');
        
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineColor: styles.outlineColor,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });
      
      // Verify some focus indication exists
      expect(
        focusedElement?.outline !== 'none' ||
        focusedElement?.boxShadow !== 'none' ||
        parseInt(focusedElement?.outlineWidth || '0') > 0
      ).toBeTruthy();
    });
  });

  test.describe('Forms Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/settings');
      await helpers.waitForAppReady();
      
      // Find all form inputs
      const inputs = await page.locator('input, textarea, select').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          // Check for associated label
          const label = await page.locator(`label[for="${id}"]`).count();
          expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
        } else {
          // Must have ARIA label
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should indicate required fields', async ({ page }) => {
      await page.goto('/settings');
      await helpers.waitForAppReady();
      
      // Find required fields
      const requiredInputs = await page.locator('input[required], textarea[required], select[required]').all();
      
      for (const input of requiredInputs) {
        // Check for required indication
        const ariaRequired = await input.getAttribute('aria-required');
        const required = await input.getAttribute('required');
        
        expect(ariaRequired === 'true' || required !== null).toBeTruthy();
        
        // Check label indicates required
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          if (await label.isVisible()) {
            const labelText = await label.textContent();
            expect(labelText).toMatch(/\*|required/i);
          }
        }
      }
    });
  });

  test.describe('Error Handling Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      // Mock network error
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/dashboard');
      
      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"], [role="alert"]', { timeout: 5000 });
      
      // Check error announcement
      const errorElement = page.locator('[data-testid="error-message"], [role="alert"]').first();
      const role = await errorElement.getAttribute('role');
      const ariaLive = await errorElement.getAttribute('aria-live');
      
      expect(role === 'alert' || ariaLive === 'assertive').toBeTruthy();
    });
  });

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Press Tab to reveal skip link
      await page.keyboard.press('Tab');
      
      // Check for skip link
      const skipLink = await page.evaluate(() => {
        const link = document.activeElement;
        return {
          text: link?.textContent,
          href: link?.getAttribute('href'),
          isVisible: link ? window.getComputedStyle(link).visibility !== 'hidden' : false,
        };
      });
      
      if (skipLink.text?.toLowerCase().includes('skip')) {
        expect(skipLink.href).toContain('#main');
        
        // Activate skip link
        await page.keyboard.press('Enter');
        
        // Check focus moved to main
        const mainFocused = await page.evaluate(() => 
          document.activeElement?.id === 'main' || 
          document.activeElement?.getAttribute('role') === 'main'
        );
        expect(mainFocused).toBeTruthy();
      }
    });
  });
});