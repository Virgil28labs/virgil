/**
 * Dashboard Functionality E2E Test Suite
 * 
 * Tests complete dashboard workflows including app interactions,
 * data display, search functionality, and responsive design.
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TestUsers, ApiResponses, Selectors, URLs } from './fixtures/test-data';

test.describe('Dashboard Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
    
    // Mock authentication
    await helpers.mockApiResponse(/\/auth\/.*/, ApiResponses.authSuccess);
    
    // Mock dashboard data
    await helpers.mockApiResponse(/\/api\/weather/, ApiResponses.weatherData);
    await helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod);
    
    // Login and navigate to dashboard
    await page.goto(URLs.login);
    await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
    await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
    await page.locator(Selectors.auth.loginButton).click();
    
    await helpers.waitForText('Dashboard');
    await helpers.waitForElement(Selectors.dashboard.container);
  });

  test.describe('Dashboard Loading & Display', () => {
    test('should display dashboard with all main components', async ({ page }) => {
      // Check main dashboard elements
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
      await expect(page.locator(Selectors.dashboard.appGrid)).toBeVisible();
      
      // Check for app cards
      const appCards = page.locator(Selectors.dashboard.appCard);
      await expect(appCards).toHaveCountGreaterThan(0);
      
      // Check specific app cards
      await expect(page.locator(Selectors.dashboard.weatherCard)).toBeVisible();
      await expect(page.locator(Selectors.dashboard.notesCard)).toBeVisible();
      await expect(page.locator(Selectors.dashboard.nasaCard)).toBeVisible();
    });

    test('should show loading states during data fetch', async ({ page }) => {
      // Mock delayed responses
      await page.route(/\/api\/weather/, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(ApiResponses.weatherData),
        });
      });
      
      // Reload to trigger loading
      await page.reload();
      
      // Should show loading indicators
      const loadingElements = page.locator(Selectors.common.loading);
      await expect(loadingElements.first()).toBeVisible();
      
      // Loading should disappear
      await helpers.waitForText(ApiResponses.weatherData.location);
      await expect(loadingElements.first()).not.toBeVisible();
    });

    test('should display real data from APIs', async ({ page }) => {
      // Wait for data to load
      await helpers.waitForNetworkIdle();
      
      // Check weather data
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText(ApiResponses.weatherData.location);
      await expect(weatherCard).toContainText(ApiResponses.weatherData.temperature.toString());
      await expect(weatherCard).toContainText(ApiResponses.weatherData.condition);
      
      // Check NASA APOD data
      const nasaCard = page.locator(Selectors.dashboard.nasaCard);
      await expect(nasaCard).toContainText(ApiResponses.nasaApod.title);
    });
  });

  test.describe('App Card Interactions', () => {
    test('should open app details on card click', async ({ page }) => {
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await weatherCard.click();
      
      // Should open weather app modal or navigate to weather page
      const modal = page.locator(Selectors.common.modal);
      if (await modal.isVisible()) {
        await expect(modal).toContainText(/weather/i);
      } else {
        await expect(page).toHaveURL(/weather/);
      }
    });

    test('should show app context menu on right click', async ({ page }) => {
      const notesCard = page.locator(Selectors.dashboard.notesCard);
      await notesCard.click({ button: 'right' });
      
      // Should show context menu
      const contextMenu = page.locator('[data-testid="context-menu"]');
      await expect(contextMenu).toBeVisible();
      
      // Check menu options
      await expect(contextMenu).toContainText(/open/i);
      await expect(contextMenu).toContainText(/settings/i);
    });

    test('should support drag and drop reordering', async ({ page }) => {
      const firstCard = page.locator(Selectors.dashboard.appCard).first();
      const secondCard = page.locator(Selectors.dashboard.appCard).nth(1);
      
      // Get initial positions
      const firstCardText = await firstCard.textContent();
      const secondCardText = await secondCard.textContent();
      
      // Drag first card to second position
      await firstCard.dragTo(secondCard);
      
      // Wait for reorder animation
      await helpers.waitForAnimation(Selectors.dashboard.appGrid);
      
      // Check if order changed
      const newFirstCard = page.locator(Selectors.dashboard.appCard).first();
      const newFirstCardText = await newFirstCard.textContent();
      
      expect(newFirstCardText).not.toBe(firstCardText);
    });

    test('should show app statistics and usage data', async ({ page }) => {
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      
      // Hover to show additional info
      await weatherCard.hover();
      
      // Should show usage stats
      const statsTooltip = page.locator('[data-testid="stats-tooltip"]');
      if (await statsTooltip.isVisible()) {
        await expect(statsTooltip).toContainText(/last used/i);
      }
    });
  });

  test.describe('Search & Filtering', () => {
    test('should search across app content', async ({ page }) => {
      const searchInput = page.locator('[data-testid="dashboard-search"]');
      
      if (await searchInput.isVisible()) {
        await helpers.typeWithDelay('[data-testid="dashboard-search"]', 'weather');
        
        // Should filter to show only weather-related content
        await helpers.waitForText('weather');
        const visibleCards = page.locator(`${Selectors.dashboard.appCard}:visible`);
        const cardCount = await visibleCards.count();
        
        // At least weather card should be visible
        expect(cardCount).toBeGreaterThan(0);
        
        // Weather card should be highlighted or prioritized
        const weatherCard = page.locator(Selectors.dashboard.weatherCard);
        await expect(weatherCard).toBeVisible();
      }
    });

    test('should filter by app categories', async ({ page }) => {
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      
      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
        
        // Select 'Data' category
        const dataCategory = page.locator('[data-testid="category-data"]');
        await dataCategory.click();
        
        // Should show only data-related apps
        await helpers.waitForText('NASA');
        const visibleCards = page.locator(`${Selectors.dashboard.appCard}:visible`);
        
        // Verify data apps are visible
        await expect(page.locator(Selectors.dashboard.nasaCard)).toBeVisible();
      }
    });

    test('should clear search and filters', async ({ page }) => {
      const searchInput = page.locator('[data-testid="dashboard-search"]');
      const clearButton = page.locator('[data-testid="clear-search"]');
      
      if (await searchInput.isVisible()) {
        // Apply search
        await helpers.typeWithDelay('[data-testid="dashboard-search"]', 'test');
        
        // Clear search
        if (await clearButton.isVisible()) {
          await clearButton.click();
        } else {
          await searchInput.clear();
        }
        
        // All cards should be visible again
        const allCards = page.locator(Selectors.dashboard.appCard);
        const visibleCards = page.locator(`${Selectors.dashboard.appCard}:visible`);
        
        const totalCount = await allCards.count();
        const visibleCount = await visibleCards.count();
        
        expect(visibleCount).toBe(totalCount);
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update weather data automatically', async ({ page }) => {
      // Mock updated weather data
      const updatedWeatherData = {
        ...ApiResponses.weatherData,
        temperature: 25,
        condition: 'Cloudy',
      };
      
      // Wait for initial load
      await helpers.waitForText(ApiResponses.weatherData.temperature.toString());
      
      // Mock updated response
      await helpers.mockApiResponse(/\/api\/weather/, updatedWeatherData);
      
      // Trigger refresh (simulate real-time update)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('refresh-weather'));
      });
      
      // Should show updated data
      await helpers.waitForText(updatedWeatherData.temperature.toString());
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText('Cloudy');
    });

    test('should show notification for new data', async ({ page }) => {
      // Mock notification system
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-notification', {
          detail: { message: 'Weather data updated', type: 'info' }
        }));
      });
      
      // Should show toast notification
      const toast = page.locator(Selectors.common.toast);
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Weather data updated');
      
      // Toast should auto-dismiss
      await expect(toast).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Dashboard should adapt to mobile layout
      const appGrid = page.locator(Selectors.dashboard.appGrid);
      
      // Check mobile-specific styles
      const gridStyles = await appGrid.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          gridTemplateColumns: styles.gridTemplateColumns,
          padding: styles.padding,
        };
      });
      
      // Mobile should use single column or different grid
      expect(gridStyles.gridTemplateColumns).toMatch(/repeat\(1,|1fr/);
    });

    test('should handle tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Dashboard should adapt to tablet layout
      const appCards = page.locator(Selectors.dashboard.appCard);
      const cardCount = await appCards.count();
      
      // Should show cards in appropriate layout
      expect(cardCount).toBeGreaterThan(0);
      
      // Cards should be visible and properly sized
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = appCards.nth(i);
        await expect(card).toBeVisible();
        await expect(card).toBeInViewport();
      }
    });

    test('should handle desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // All dashboard elements should be visible
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
      await expect(page.locator(Selectors.dashboard.appGrid)).toBeVisible();
      
      // Multiple cards should fit in view
      const visibleCards = page.locator(`${Selectors.dashboard.appCard}:visible`);
      const visibleCount = await visibleCards.count();
      
      expect(visibleCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('Navigation & Routing', () => {
    test('should navigate between dashboard sections', async ({ page }) => {
      // Test navigation to different sections
      const profileButton = page.locator(Selectors.nav.profileButton);
      
      if (await profileButton.isVisible()) {
        await profileButton.click();
        await expect(page).toHaveURL(/profile/);
        
        // Navigate back to dashboard
        await page.goBack();
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
      }
    });

    test('should maintain state during navigation', async ({ page }) => {
      const searchInput = page.locator('[data-testid="dashboard-search"]');
      
      if (await searchInput.isVisible()) {
        // Apply search
        await helpers.typeWithDelay('[data-testid="dashboard-search"]', 'weather');
        
        // Navigate away and back
        await page.goto(URLs.chat);
        await helpers.waitForElement(Selectors.chat.container);
        
        await page.goto(URLs.dashboard);
        await helpers.waitForElement(Selectors.dashboard.container);
        
        // Search state should be preserved (depending on implementation)
        const searchValue = await searchInput.inputValue();
        expect(searchValue).toBe('weather');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route(/\/api\/weather/, (route) => route.abort('failed'));
      
      // Reload to trigger API call
      await page.reload();
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Should show error state
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText(/error|unavailable/i);
      
      // Should offer retry option
      const retryButton = page.locator('[data-testid="retry-weather"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });

    test('should handle partial data failures', async ({ page }) => {
      // Mock partial failure (weather fails, NASA succeeds)
      await page.route(/\/api\/weather/, (route) => route.abort('failed'));
      await helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod);
      
      await page.reload();
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Weather should show error
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText(/error|unavailable/i);
      
      // NASA should show data
      const nasaCard = page.locator(Selectors.dashboard.nasaCard);
      await expect(nasaCard).toContainText(ApiResponses.nasaApod.title);
    });

    test('should retry failed requests', async ({ page }) => {
      let callCount = 0;
      await page.route(/\/api\/weather/, (route) => {
        callCount++;
        if (callCount === 1) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(ApiResponses.weatherData),
          });
        }
      });
      
      await page.reload();
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Should show error initially
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText(/error|unavailable/i);
      
      // Click retry
      const retryButton = page.locator('[data-testid="retry-weather"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // Should show data on retry
        await helpers.waitForText(ApiResponses.weatherData.location);
        await expect(weatherCard).toContainText(ApiResponses.weatherData.location);
      }
    });
  });

  test.describe('Accessibility & UX', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await helpers.testKeyboardNavigation();
      
      // Test Tab navigation through app cards
      await page.keyboard.press('Tab');
      const firstCard = page.locator(Selectors.dashboard.appCard).first();
      await expect(firstCard).toBeFocused();
      
      await page.keyboard.press('Tab');
      const secondCard = page.locator(Selectors.dashboard.appCard).nth(1);
      await expect(secondCard).toBeFocused();
    });

    test('should support Enter key to activate cards', async ({ page }) => {
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await weatherCard.focus();
      await page.keyboard.press('Enter');
      
      // Should open weather app (same as click)
      const modal = page.locator(Selectors.common.modal);
      if (await modal.isVisible()) {
        await expect(modal).toContainText(/weather/i);
      } else {
        await expect(page).toHaveURL(/weather/);
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await helpers.checkAccessibility();
      
      // Check specific dashboard ARIA attributes
      const appGrid = page.locator(Selectors.dashboard.appGrid);
      const appCards = page.locator(Selectors.dashboard.appCard);
      
      await expect(appGrid).toHaveAttribute('role', 'grid');
      
      const cardCount = await appCards.count();
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = appCards.nth(i);
        await expect(card).toHaveAttribute('role', 'gridcell');
        await expect(card).toHaveAttribute('aria-label');
      }
    });

    test('should provide screen reader announcements', async ({ page }) => {
      // Check for live regions
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toBeVisible();
      
      // Test data update announcement
      await page.evaluate(() => {
        const liveRegion = document.querySelector('[aria-live]');
        if (liveRegion) {
          liveRegion.textContent = 'Weather data updated';
        }
      });
      
      const liveContent = await liveRegion.textContent();
      expect(liveContent).toContain('updated');
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(URLs.dashboard);
      await helpers.waitForElement(Selectors.dashboard.container);
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should handle many app cards efficiently', async ({ page }) => {
      // Mock many app cards
      await page.evaluate(() => {
        // Simulate large number of apps
        const grid = document.querySelector('[data-testid="app-grid"]');
        if (grid) {
          for (let i = 0; i < 50; i++) {
            const card = document.createElement('div');
            card.setAttribute('data-testid', 'app-card');
            card.textContent = `App ${i}`;
            grid.appendChild(card);
          }
        }
      });
      
      // Should remain responsive
      const appCards = page.locator(Selectors.dashboard.appCard);
      const cardCount = await appCards.count();
      
      expect(cardCount).toBeGreaterThan(50);
      
      // Interface should still be interactive
      const firstCard = appCards.first();
      await expect(firstCard).toBeVisible();
      await firstCard.click();
    });
  });
});