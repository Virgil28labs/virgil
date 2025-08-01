/**
 * Visual Regression E2E Tests
 * 
 * Tests visual consistency across browsers and updates including:
 * - Screenshot comparison testing
 * - Cross-browser visual consistency
 * - Component visual states
 * - Responsive design validation
 * - Dark/light theme consistency
 * - Animation state capture
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Visual Regression Testing', () => {
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

    // Mock API responses for consistent screenshots
    await mockAPIsForVisualTesting(page);
  });

  test.describe('Homepage Visual Tests', () => {
    test('should match homepage layout across browsers', async ({ page, browserName }) => {
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Wait for any animations to complete
      await page.waitForTimeout(1000);
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot(`homepage-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle empty states consistently', async ({ page, browserName }) => {
      // Mock empty API responses
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], items: [], messages: [] }),
        });
      });

      await page.goto('/');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`homepage-empty-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should display error states consistently', async ({ page, browserName }) => {
      // Mock error responses
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' }),
        });
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="error-state"]', { timeout: 5000 });
      
      await expect(page).toHaveScreenshot(`homepage-error-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Dashboard Visual Tests', () => {
    test('should match dashboard layout', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Wait for all widgets to load
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should display widget states consistently', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Capture individual widget states
      const widgets = await page.locator('[data-testid$="-widget"]').all();
      
      for (let i = 0; i < widgets.length; i++) {
        const widget = widgets[i];
        const widgetId = await widget.getAttribute('data-testid');
        
        await expect(widget).toHaveScreenshot(`widget-${widgetId}-${browserName}.png`, {
          animations: 'disabled',
        });
      }
    });

    test('should handle loading states consistently', async ({ page, browserName }) => {
      // Mock slow API responses
      let resolveAPIs: (() => void)[] = [];
      
      await page.route('**/api/v1/**', async (route) => {
        await new Promise<void>((resolve) => {
          resolveAPIs.push(resolve);
        });
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: 'loaded' }),
        });
      });

      await page.goto('/dashboard');
      
      // Capture loading state
      await page.waitForSelector('[data-testid*="loading"]', { timeout: 2000 });
      
      await expect(page).toHaveScreenshot(`dashboard-loading-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
      
      // Resolve APIs to clean up
      resolveAPIs.forEach(resolve => resolve());
    });
  });

  test.describe('Chat Interface Visual Tests', () => {
    test('should match chat interface layout', async ({ page, browserName }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`chat-interface-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should display message types consistently', async ({ page, browserName }) => {
      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      // Get specific message elements
      const userMessage = page.locator('[data-testid="chat-message"][data-role="user"]').first();
      const assistantMessage = page.locator('[data-testid="chat-message"][data-role="assistant"]').first();
      
      if (await userMessage.isVisible()) {
        await expect(userMessage).toHaveScreenshot(`user-message-${browserName}.png`);
      }
      
      if (await assistantMessage.isVisible()) {
        await expect(assistantMessage).toHaveScreenshot(`assistant-message-${browserName}.png`);
      }
    });

    test('should handle code blocks consistently', async ({ page, browserName }) => {
      // Mock message with code block
      await page.route('**/api/v1/chat/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            messages: [{
              id: 'msg-code',
              content: 'Here\'s a JavaScript example:\n\n```javascript\nconst greeting = "Hello World";\nconsole.log(greeting);\n```',
              role: 'assistant',
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      });

      await page.goto('/chat');
      await helpers.waitForAppReady();
      
      // Wait for code block to render
      await page.waitForSelector('pre code', { timeout: 5000 });
      
      const codeBlock = page.locator('pre code').first();
      await expect(codeBlock).toHaveScreenshot(`code-block-${browserName}.png`);
    });
  });

  test.describe('Modal and Dialog Visual Tests', () => {
    test('should display modals consistently', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Open camera modal
      await page.locator('[data-testid="camera-widget"]').click();
      
      const modal = page.locator('[data-testid="camera-modal"]');
      await expect(modal).toBeVisible();
      
      await expect(modal).toHaveScreenshot(`camera-modal-${browserName}.png`);
      
      // Close modal and test another
      await page.keyboard.press('Escape');
      
      // Open NASA APOD modal
      await page.locator('[data-testid="nasa-widget"]').click();
      
      const apodModal = page.locator('[data-testid="apod-modal"]');
      await expect(apodModal).toBeVisible();
      
      await expect(apodModal).toHaveScreenshot(`nasa-modal-${browserName}.png`);
    });

    test('should handle confirmation dialogs consistently', async ({ page, browserName }) => {
      await page.goto('/gallery');
      await helpers.waitForAppReady();
      
      // Trigger delete confirmation
      await page.locator('[data-testid="select-photos"]').click();
      
      const firstPhoto = page.locator('[data-testid="gallery-photo"]').first();
      if (await firstPhoto.isVisible()) {
        await firstPhoto.locator('[data-testid="photo-checkbox"]').click();
        await page.locator('[data-testid="delete-selected"]').click();
        
        const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        await expect(confirmDialog).toHaveScreenshot(`confirm-dialog-${browserName}.png`);
      }
    });
  });

  test.describe('Responsive Design Visual Tests', () => {
    test('should display correctly on mobile', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`dashboard-mobile-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should display correctly on tablet', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`dashboard-tablet-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle navigation on mobile', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Open mobile menu if it exists
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        await expect(mobileMenu).toBeVisible();
        
        await expect(page).toHaveScreenshot(`mobile-menu-${browserName}.png`);
      }
    });
  });

  test.describe('Theme Visual Tests', () => {
    test('should display dark theme consistently', async ({ page, browserName }) => {
      // Set dark theme
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`dashboard-dark-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should display light theme consistently', async ({ page, browserName }) => {
      // Set light theme
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
      });
      
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      await expect(page).toHaveScreenshot(`dashboard-light-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle theme transitions', async ({ page, browserName }) => {
      await page.goto('/settings');
      await helpers.waitForAppReady();
      
      // Find theme toggle
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        // Capture initial state
        await expect(page.locator('[data-testid="settings-panel"]')).toHaveScreenshot(`settings-theme-before-${browserName}.png`);
        
        // Toggle theme
        await themeToggle.click();
        
        // Wait for transition
        await page.waitForTimeout(500);
        
        // Capture after state
        await expect(page.locator('[data-testid="settings-panel"]')).toHaveScreenshot(`settings-theme-after-${browserName}.png`);
      }
    });
  });

  test.describe('Animation Visual Tests', () => {
    test('should capture loading animations consistently', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      
      // Capture loading spinners
      const loadingElements = await page.locator('[data-testid*="loading"], .loading, .spinner').all();
      
      for (let i = 0; i < loadingElements.length; i++) {
        const element = loadingElements[i];
        if (await element.isVisible()) {
          await expect(element).toHaveScreenshot(`loading-animation-${i}-${browserName}.png`);
        }
      }
    });

    test('should capture hover states', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Test widget hover states
      const widget = page.locator('[data-testid="weather-widget"]').first();
      
      // Capture normal state
      await expect(widget).toHaveScreenshot(`widget-normal-${browserName}.png`);
      
      // Capture hover state
      await widget.hover();
      await page.waitForTimeout(200); // Wait for hover animation
      
      await expect(widget).toHaveScreenshot(`widget-hover-${browserName}.png`);
    });

    test('should capture focus states', async ({ page, browserName }) => {
      await page.goto('/');
      await helpers.waitForAppReady();
      
      // Focus first interactive element
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        await expect(focusedElement).toHaveScreenshot(`focus-state-${browserName}.png`);
      }
    });
  });

  test.describe('Form Visual Tests', () => {
    test('should display form states consistently', async ({ page, browserName }) => {
      await page.goto('/login');
      await helpers.waitForAppReady();
      
      // Capture initial form
      await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot(`login-form-initial-${browserName}.png`);
      
      // Fill form and show validation
      await page.locator('[data-testid="email-input"]').fill('invalid-email');
      await page.locator('[data-testid="password-input"]').click(); // Trigger validation
      
      // Capture validation state if present
      const validationError = page.locator('[data-testid="validation-error"]');
      if (await validationError.isVisible()) {
        await expect(page.locator('[data-testid="login-form"]')).toHaveScreenshot(`login-form-validation-${browserName}.png`);
      }
    });

    test('should display input states consistently', async ({ page, browserName }) => {
      await page.goto('/settings');
      await helpers.waitForAppReady();
      
      const inputs = await page.locator('input, textarea, select').all();
      
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        const input = inputs[i];
        
        // Normal state
        await expect(input).toHaveScreenshot(`input-normal-${i}-${browserName}.png`);
        
        // Focus state
        await input.focus();
        await expect(input).toHaveScreenshot(`input-focus-${i}-${browserName}.png`);
        
        // Filled state
        if (await input.getAttribute('type') !== 'file') {
          await input.fill('test value');
          await expect(input).toHaveScreenshot(`input-filled-${i}-${browserName}.png`);
        }
      }
    });
  });

  test.describe('Data Visualization Visual Tests', () => {
    test('should display charts consistently', async ({ page, browserName }) => {
      await page.goto('/analytics');
      await helpers.waitForAppReady();
      
      // Wait for charts to render
      await page.waitForTimeout(2000);
      
      const charts = await page.locator('[data-testid*="chart"], .chart, canvas').all();
      
      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        if (await chart.isVisible()) {
          await expect(chart).toHaveScreenshot(`chart-${i}-${browserName}.png`);
        }
      }
    });

    test('should display data tables consistently', async ({ page, browserName }) => {
      await page.goto('/data');
      await helpers.waitForAppReady();
      
      const tables = await page.locator('table, [role="table"]').all();
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        if (await table.isVisible()) {
          await expect(table).toHaveScreenshot(`table-${i}-${browserName}.png`);
        }
      }
    });
  });

  test.describe('Print Styles Visual Tests', () => {
    test('should display print layout correctly', async ({ page, browserName }) => {
      await page.goto('/dashboard');
      await helpers.waitForAppReady();
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      await expect(page).toHaveScreenshot(`dashboard-print-${browserName}.png`, {
        fullPage: true,
      });
      
      // Reset to screen media
      await page.emulateMedia({ media: 'screen' });
    });
  });
});

/**
 * Mock APIs for consistent visual testing
 */
async function mockAPIsForVisualTesting(page: Page) {
  // Mock weather API
  await page.route('**/api/v1/weather/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        temperature: 72,
        condition: 'Sunny',
        location: 'New York, NY',
        humidity: 45,
        windSpeed: 10,
        forecast: [
          { day: 'MON', high: 75, low: 60, condition: 'sunny' },
          { day: 'TUE', high: 73, low: 58, condition: 'cloudy' },
          { day: 'WED', high: 70, low: 55, condition: 'rainy' },
          { day: 'THU', high: 72, low: 57, condition: 'sunny' },
          { day: 'FRI', high: 76, low: 61, condition: 'partly-cloudy' },
        ],
      }),
    });
  });

  // Mock NASA APOD
  await page.route('**/api/v1/nasa/apod', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Spiral Galaxy NGC 1232',
        explanation: 'A spectacular spiral galaxy located in the constellation Eridanus...',
        url: 'https://apod.nasa.gov/apod/image/sample.jpg',
        date: '2024-01-15',
        media_type: 'image',
      }),
    });
  });

  // Mock chat messages
  await page.route('**/api/v1/chat/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            id: 'msg-1',
            content: 'Hello! How can I help you today?',
            role: 'assistant',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            id: 'msg-2',
            content: 'What is the weather like?',
            role: 'user',
            timestamp: '2024-01-15T10:01:00Z',
          },
          {
            id: 'msg-3',
            content: 'The weather is currently sunny with a temperature of 72°F in New York.',
            role: 'assistant',
            timestamp: '2024-01-15T10:01:30Z',
          },
        ],
      }),
    });
  });

  // Mock photos
  await page.route('**/api/v1/photos', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        photos: [
          {
            id: 'photo-1',
            url: 'https://picsum.photos/300/200?random=1',
            thumbnail: 'https://picsum.photos/150/100?random=1',
            caption: 'Beautiful sunset',
            createdAt: '2024-01-15T09:00:00Z',
          },
          {
            id: 'photo-2',
            url: 'https://picsum.photos/300/200?random=2',
            thumbnail: 'https://picsum.photos/150/100?random=2',
            caption: 'Mountain landscape',
            createdAt: '2024-01-14T15:30:00Z',
          },
        ],
      }),
    });
  });

  // Mock vector memories
  await page.route('**/api/v1/vector/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        memories: [
          {
            id: 'mem-1',
            content: 'I prefer dark mode for coding.',
            createdAt: '2024-01-15T08:00:00Z',
            tags: ['preferences', 'coding'],
          },
        ],
        count: 5,
      }),
    });
  });
}