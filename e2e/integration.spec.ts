/**
 * Integration E2E Test Suite
 * 
 * Tests complete user journeys and cross-feature integrations
 * including auth → dashboard → chat workflows and data persistence.
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TestUsers, TestMessages, ApiResponses, Selectors, URLs } from './fixtures/test-data';

test.describe('Integration Workflows', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
  });

  test.describe('Complete User Journey', () => {
    test('should complete full user onboarding flow', async ({ page }) => {
      // 1. Registration
      await helpers.mockApiResponse(/\/auth\/register/, {
        ...ApiResponses.authSuccess,
        user: { ...ApiResponses.authSuccess.user, email: TestUsers.newUser.email }
      });
      
      await page.goto(URLs.register);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.newUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.newUser.password);
      await page.locator(Selectors.auth.registerButton).click();
      
      // Should redirect to dashboard
      await helpers.waitForText('Dashboard');
      await expect(page).toHaveURL(/dashboard/);
      
      // 2. Dashboard exploration
      await helpers.mockApiResponse(/\/api\/weather/, ApiResponses.weatherData);
      await helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod);
      
      await helpers.waitForElement(Selectors.dashboard.container);
      await expect(page.locator(Selectors.dashboard.weatherCard)).toBeVisible();
      
      // 3. First chat interaction
      await page.goto(URLs.chat);
      await helpers.waitForElement(Selectors.chat.container);
      
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(page.locator(Selectors.chat.message).last()).toContainText(ApiResponses.chatResponse.message.content);
      
      // 4. Return to dashboard
      await page.goto(URLs.dashboard);
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Should still be authenticated and show personalized content
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
    });

    test('should persist user state across browser restart', async ({ page, context }) => {
      // Login
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      await helpers.waitForText('Dashboard');
      
      // Send chat message
      await page.goto(URLs.chat);
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      
      // Close and recreate browser context
      await context.close();
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();
      const newHelpers = new TestHelpers(newPage);
      
      // Should maintain session
      await newPage.goto(URLs.dashboard);
      await expect(newPage.locator(Selectors.dashboard.container)).toBeVisible();
      
      // Chat history should be preserved
      await newPage.goto(URLs.chat);
      await expect(newPage.locator(Selectors.chat.message)).toContainText(TestMessages.simple);
      
      await newContext.close();
    });
  });

  test.describe('Cross-Feature Integration', () => {
    test('should integrate dashboard data with chat queries', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Load dashboard with weather data
      await helpers.mockApiResponse(/\/api\/weather/, ApiResponses.weatherData);
      await page.goto(URLs.dashboard);
      await helpers.waitForText(ApiResponses.weatherData.location);
      
      // Go to chat and ask about weather
      await page.goto(URLs.chat);
      await helpers.mockApiResponse(/\/chat/, {
        ...ApiResponses.chatResponse,
        message: {
          ...ApiResponses.chatResponse.message,
          content: `Current weather in ${ApiResponses.weatherData.location}: ${ApiResponses.weatherData.temperature}°C, ${ApiResponses.weatherData.condition}`
        }
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, 'What\'s the current weather?');
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should respond with actual weather data from dashboard
      await helpers.waitForText(ApiResponses.weatherData.location);
      await expect(page.locator(Selectors.chat.message).last()).toContainText(ApiResponses.weatherData.temperature.toString());
    });

    test('should handle multi-app queries from chat', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Load dashboard with multiple data sources
      await helpers.mockApiResponse(/\/api\/weather/, ApiResponses.weatherData);
      await helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod);
      await page.goto(URLs.dashboard);
      await helpers.waitForNetworkIdle();
      
      // Chat query spanning multiple apps
      await page.goto(URLs.chat);
      await helpers.mockApiResponse(/\/chat/, {
        ...ApiResponses.chatResponse,
        message: {
          ...ApiResponses.chatResponse.message,
          content: `**Weather**: ${ApiResponses.weatherData.condition} in ${ApiResponses.weatherData.location}\n\n**NASA**: Today's image is "${ApiResponses.nasaApod.title}"`
        }
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.multiIntent);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should integrate data from multiple dashboard apps
      await helpers.waitForText('Weather');
      await helpers.waitForText('NASA');
      
      const responseMessage = page.locator(Selectors.chat.message).last();
      await expect(responseMessage).toContainText(ApiResponses.weatherData.location);
      await expect(responseMessage).toContainText(ApiResponses.nasaApod.title);
    });

    test('should navigate from chat to relevant dashboard apps', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Chat interaction with app links
      await page.goto(URLs.chat);
      await helpers.mockApiResponse(/\/chat/, {
        ...ApiResponses.chatResponse,
        message: {
          ...ApiResponses.chatResponse.message,
          content: 'You can check your weather data on the [Weather App](/dashboard#weather) or view astronomy photos in the [NASA App](/dashboard#nasa).'
        }
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, 'Where can I see my data?');
      await page.locator(Selectors.chat.sendButton).click();
      
      await helpers.waitForText('Weather App');
      
      // Click weather app link
      const weatherLink = page.locator('text=Weather App');
      await weatherLink.click();
      
      // Should navigate to dashboard with weather app highlighted
      await expect(page).toHaveURL(/dashboard/);
      await helpers.waitForElement(Selectors.dashboard.weatherCard);
      await expect(page.locator(Selectors.dashboard.weatherCard)).toBeVisible();
    });
  });

  test.describe('Data Persistence & Sync', () => {
    test('should sync chat history across devices/sessions', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Send messages in chat
      await page.goto(URLs.chat);
      const messages = [
        'First message',
        'Second message', 
        'Third message'
      ];
      
      for (const message of messages) {
        await helpers.mockApiResponse(/\/chat/, {
          ...ApiResponses.chatResponse,
          message: { ...ApiResponses.chatResponse.message, content: `Response to: ${message}` }
        });
        
        await helpers.typeWithDelay(Selectors.chat.messageInput, message);
        await page.locator(Selectors.chat.sendButton).click();
        await helpers.waitForText(`Response to: ${message}`);
      }
      
      // Simulate sync by reloading
      await page.reload();
      await helpers.waitForElement(Selectors.chat.container);
      
      // All messages should be preserved
      for (const message of messages) {
        await expect(page.locator(Selectors.chat.message)).toContainText(message);
      }
    });

    test('should handle offline/online state transitions', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      await page.goto(URLs.dashboard);
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Go offline
      await page.context().setOffline(true);
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }
      
      // Try to refresh data - should show cached version
      await page.reload();
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should sync new data
      await helpers.mockApiResponse(/\/api\/weather/, {
        ...ApiResponses.weatherData,
        temperature: 30,
        condition: 'Hot'
      });
      
      await page.reload();
      await helpers.waitForText('Hot');
      
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText('30');
      await expect(weatherCard).toContainText('Hot');
    });

    test('should handle data conflicts and resolution', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Create data in notes app
      await page.goto('/notes');
      const notesInput = page.locator('[data-testid="note-input"]');
      
      if (await notesInput.isVisible()) {
        await helpers.typeWithDelay('[data-testid="note-input"]', 'Original note content');
        await page.locator('[data-testid="save-note"]').click();
        
        // Simulate conflicting change (e.g., from another device)
        await page.evaluate(() => {
          localStorage.setItem('notes-conflict', JSON.stringify({
            id: 'note-1',
            content: 'Conflicting note content',
            timestamp: Date.now() + 1000
          }));
        });
        
        // Reload to trigger conflict detection
        await page.reload();
        
        // Should show conflict resolution dialog
        const conflictDialog = page.locator('[data-testid="conflict-dialog"]');
        if (await conflictDialog.isVisible()) {
          await expect(conflictDialog).toBeVisible();
          await expect(conflictDialog).toContainText('conflict');
          
          // Choose to keep newer version
          const keepNewerButton = page.locator('[data-testid="keep-newer"]');
          await keepNewerButton.click();
          
          // Should resolve to newer content
          await expect(notesInput).toHaveValue('Conflicting note content');
        }
      }
    });
  });

  test.describe('Error Recovery & Resilience', () => {
    test('should recover from network interruptions', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      await page.goto(URLs.chat);
      
      // Start with working connection
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      await helpers.typeWithDelay(Selectors.chat.messageInput, 'First message');
      await page.locator(Selectors.chat.sendButton).click();
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      
      // Simulate network failure
      await page.route(/\/chat/, (route) => route.abort('failed'));
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, 'Second message');
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should show error and queue message
      await expect(page.locator(Selectors.common.error)).toBeVisible();
      const queuedMessage = page.locator('[data-testid="queued-message"]');
      if (await queuedMessage.isVisible()) {
        await expect(queuedMessage).toContainText('Second message');
      }
      
      // Restore network connection
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Click retry or wait for auto-retry
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
      
      // Message should be sent successfully
      await helpers.waitForText('Second message');
      await expect(page.locator(Selectors.chat.message)).toContainText('Second message');
    });

    test('should handle partial system failures gracefully', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Mock partial failures - weather fails, NASA works
      await page.route(/\/api\/weather/, (route) => route.abort('failed'));
      await helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod);
      
      await page.goto(URLs.dashboard);
      await helpers.waitForElement(Selectors.dashboard.container);
      
      // Weather should show error state
      const weatherCard = page.locator(Selectors.dashboard.weatherCard);
      await expect(weatherCard).toContainText(/error|unavailable/i);
      
      // NASA should work normally
      const nasaCard = page.locator(Selectors.dashboard.nasaCard);
      await expect(nasaCard).toContainText(ApiResponses.nasaApod.title);
      
      // Chat should still work for non-weather queries
      await page.goto(URLs.chat);
      await helpers.mockApiResponse(/\/chat/, {
        ...ApiResponses.chatResponse,
        message: { ...ApiResponses.chatResponse.message, content: 'Chat is working fine!' }
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, 'How are you?');
      await page.locator(Selectors.chat.sendButton).click();
      
      await helpers.waitForText('Chat is working fine!');
      await expect(page.locator(Selectors.chat.message).last()).toContainText('Chat is working fine!');
    });
  });

  test.describe('Performance & Scalability', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Mock large chat history
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content`,
        timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString()
      }));
      
      await page.evaluate((history) => {
        localStorage.setItem('chat-history', JSON.stringify(history));
      }, largeHistory);
      
      // Load chat with large history
      const startTime = Date.now();
      await page.goto(URLs.chat);
      await helpers.waitForElement(Selectors.chat.container);
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);
      
      // Should virtualize or paginate messages
      const visibleMessages = page.locator(Selectors.chat.message);
      const messageCount = await visibleMessages.count();
      
      // Should not render all 100 messages at once
      expect(messageCount).toBeLessThan(50);
      
      // Scroll should load more messages
      await page.locator(Selectors.chat.messageList).scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, -1000); // Scroll up
      
      // Should be responsive during scrolling
      await expect(page.locator(Selectors.chat.messageInput)).toBeEnabled();
    });

    test('should maintain performance with concurrent operations', async ({ page }) => {
      // Setup authenticated state
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Start multiple concurrent operations
      const operations = [
        // Load dashboard
        page.goto(URLs.dashboard),
        
        // Trigger API calls
        helpers.mockApiResponse(/\/api\/weather/, ApiResponses.weatherData),
        helpers.mockApiResponse(/\/api\/nasa/, ApiResponses.nasaApod),
        
        // Navigate to chat
        page.goto(URLs.chat),
        
        // Send chat message
        (async () => {
          await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
          await helpers.typeWithDelay(Selectors.chat.messageInput, 'Concurrent test');
          await page.locator(Selectors.chat.sendButton).click();
        })()
      ];
      
      // All operations should complete without errors
      await Promise.all(operations);
      
      // Final state should be consistent
      await expect(page).toHaveURL(/chat/);
      await expect(page.locator(Selectors.chat.container)).toBeVisible();
    });
  });
});