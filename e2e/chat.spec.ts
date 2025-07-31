/**
 * Chat Functionality E2E Test Suite
 * 
 * Tests complete chat workflows including message sending, streaming responses,
 * context management, error handling, and multi-intent queries.
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TestUsers, TestMessages, ApiResponses, Selectors, URLs } from './fixtures/test-data';

test.describe('Chat Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
    
    // Mock authentication for all tests
    await helpers.mockApiResponse(/\/auth\/.*/, ApiResponses.authSuccess);
    
    // Login and navigate to chat
    await page.goto(URLs.login);
    await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
    await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
    await page.locator(Selectors.auth.loginButton).click();
    
    await helpers.waitForText('Dashboard');
    await page.goto(URLs.chat);
    await helpers.waitForElement(Selectors.chat.container);
  });

  test.describe('Basic Chat Interface', () => {
    test('should display chat interface correctly', async ({ page }) => {
      // Check main chat elements
      await expect(page.locator(Selectors.chat.container)).toBeVisible();
      await expect(page.locator(Selectors.chat.messageInput)).toBeVisible();
      await expect(page.locator(Selectors.chat.sendButton)).toBeVisible();
      await expect(page.locator(Selectors.chat.messageList)).toBeVisible();
      
      // Check input placeholder
      const messageInput = page.locator(Selectors.chat.messageInput);
      await expect(messageInput).toHaveAttribute('placeholder', /type.*message/i);
    });

    test('should enable send button only when message is typed', async ({ page }) => {
      const sendButton = page.locator(Selectors.chat.sendButton);
      const messageInput = page.locator(Selectors.chat.messageInput);
      
      // Initially disabled
      await expect(sendButton).toBeDisabled();
      
      // Type message
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await expect(sendButton).toBeEnabled();
      
      // Clear message
      await messageInput.clear();
      await expect(sendButton).toBeDisabled();
    });

    test('should focus message input on page load', async ({ page }) => {
      await expect(page.locator(Selectors.chat.messageInput)).toBeFocused();
    });
  });

  test.describe('Message Sending', () => {
    test('should send simple message successfully', async ({ page }) => {
      // Mock chat response
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Type and send message
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Check user message appears
      const messages = page.locator(Selectors.chat.message);
      await expect(messages.first()).toContainText(TestMessages.simple);
      
      // Check assistant response appears
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(messages.last()).toContainText(ApiResponses.chatResponse.message.content);
      
      // Input should be cleared
      await expect(page.locator(Selectors.chat.messageInput)).toHaveValue('');
    });

    test('should send message with Enter key', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Type message and press Enter
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.keyboard.press('Enter');
      
      // Should send message
      await helpers.waitForText(TestMessages.simple);
      await expect(page.locator(Selectors.chat.message).first()).toContainText(TestMessages.simple);
    });

    test('should handle multiline messages with Shift+Enter', async ({ page }) => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      
      // Type multiline message
      await page.locator(Selectors.chat.messageInput).click();
      await page.keyboard.type('Line 1');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line 2');
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line 3');
      
      // Verify multiline content
      const inputValue = await page.locator(Selectors.chat.messageInput).inputValue();
      expect(inputValue).toBe(multilineMessage);
      
      // Send message
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      await page.keyboard.press('Enter');
      
      // Should preserve line breaks in displayed message
      await helpers.waitForText('Line 1');
      const messageElement = page.locator(Selectors.chat.message).first();
      await expect(messageElement).toContainText('Line 1');
      await expect(messageElement).toContainText('Line 2');
      await expect(messageElement).toContainText('Line 3');
    });

    test('should handle special characters and emojis', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.withSpecialChars);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should display special characters correctly
      await helpers.waitForText(TestMessages.withSpecialChars);
      await expect(page.locator(Selectors.chat.message).first()).toContainText('🚀');
      await expect(page.locator(Selectors.chat.message).first()).toContainText('spéciäl');
    });

    test('should handle long messages', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.longMessage, 10);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should handle and display long message
      await helpers.waitForText(TestMessages.longMessage.substring(0, 50));
      const messageElement = page.locator(Selectors.chat.message).first();
      await expect(messageElement).toContainText(TestMessages.longMessage.substring(0, 100));
    });

    test('should handle code snippets', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      await page.locator(Selectors.chat.messageInput).fill(TestMessages.codeSnippet);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should preserve code formatting
      await helpers.waitForText('function test()');
      const messageElement = page.locator(Selectors.chat.message).first();
      await expect(messageElement).toContainText('function test()');
      await expect(messageElement).toContainText('console.log');
    });
  });

  test.describe('Message Display & History', () => {
    test('should display message timestamps', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Check for timestamp elements
      await helpers.waitForText(TestMessages.simple);
      const timestampElements = page.locator('[data-testid*="timestamp"]');
      await expect(timestampElements.first()).toBeVisible();
    });

    test('should scroll to latest message', async ({ page }) => {
      // Send multiple messages to create scroll
      for (let i = 0; i < 10; i++) {
        await helpers.mockApiResponse(/\/chat/, {
          ...ApiResponses.chatResponse,
          message: { ...ApiResponses.chatResponse.message, content: `Message ${i}` }
        });
        
        await helpers.typeWithDelay(Selectors.chat.messageInput, `Test message ${i}`);
        await page.locator(Selectors.chat.sendButton).click();
        await helpers.waitForText(`Message ${i}`);
      }
      
      // Latest message should be visible
      const latestMessage = page.locator(Selectors.chat.message).last();
      await expect(latestMessage).toBeInViewport();
    });

    test('should persist chat history across page reloads', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Send a message
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      await helpers.waitForText(TestMessages.simple);
      
      // Reload page
      await page.reload();
      await helpers.waitForElement(Selectors.chat.container);
      
      // Message should still be visible
      await expect(page.locator(Selectors.chat.message)).toContainText(TestMessages.simple);
    });

    test('should clear chat history', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Send a message
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      await helpers.waitForText(TestMessages.simple);
      
      // Clear chat
      await page.locator(Selectors.chat.clearButton).click();
      
      // Confirm clearing
      const confirmButton = page.locator('[data-testid="confirm-clear"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Messages should be cleared
      await expect(page.locator(Selectors.chat.message)).toHaveCount(0);
    });
  });

  test.describe('Streaming Responses', () => {
    test('should show typing indicator during response', async ({ page }) => {
      // Mock streaming response
      await page.route(/\/chat/, async (route) => {
        // Delay response to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(ApiResponses.chatResponse),
        });
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should show loading indicator
      await expect(page.locator(Selectors.chat.loadingIndicator)).toBeVisible();
      
      // Loading should disappear when response arrives
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(page.locator(Selectors.chat.loadingIndicator)).not.toBeVisible();
    });

    test('should disable input during response generation', async ({ page }) => {
      await page.route(/\/chat/, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(ApiResponses.chatResponse),
        });
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Input should be disabled during processing
      await expect(page.locator(Selectors.chat.messageInput)).toBeDisabled();
      await expect(page.locator(Selectors.chat.sendButton)).toBeDisabled();
      
      // Should re-enable after response
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(page.locator(Selectors.chat.messageInput)).toBeEnabled();
      await expect(page.locator(Selectors.chat.sendButton)).toBeEnabled();
    });
  });

  test.describe('Multi-Intent Queries', () => {
    test('should handle multi-intent queries', async ({ page }) => {
      const multiIntentResponse = {
        ...ApiResponses.chatResponse,
        message: {
          ...ApiResponses.chatResponse.message,
          content: '**Notes**: Here are your notes...\n\n**Weather**: Current weather is sunny...'
        }
      };
      
      await helpers.mockApiResponse(/\/chat/, multiIntentResponse);
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.multiIntent);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should receive structured response
      await helpers.waitForText('Notes');
      await helpers.waitForText('Weather');
      
      const responseMessage = page.locator(Selectors.chat.message).last();
      await expect(responseMessage).toContainText('**Notes**');
      await expect(responseMessage).toContainText('**Weather**');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route(/\/chat/, (route) => route.abort('failed'));
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should show error message
      await expect(page.locator(Selectors.common.error)).toBeVisible();
      await expect(page.locator(Selectors.common.error)).toContainText(/network|connection/i);
      
      // Input should be re-enabled
      await expect(page.locator(Selectors.chat.messageInput)).toBeEnabled();
    });

    test('should handle server errors', async ({ page }) => {
      await page.route(/\/chat/, (route) =>
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ error: 'Internal server error' }) 
        })
      );
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should show error message
      await expect(page.locator(Selectors.common.error)).toBeVisible();
      await expect(page.locator(Selectors.common.error)).toContainText(/server error/i);
    });

    test('should retry failed messages', async ({ page }) => {
      let callCount = 0;
      await page.route(/\/chat/, (route) => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          route.abort('failed');
        } else {
          // Second call succeeds
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(ApiResponses.chatResponse),
          });
        }
      });
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Should show error and retry button
      await expect(page.locator(Selectors.common.error)).toBeVisible();
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
      
      // Click retry
      await retryButton.click();
      
      // Should succeed on retry
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(page.locator(Selectors.chat.message).last()).toContainText(ApiResponses.chatResponse.message.content);
    });
  });

  test.describe('Accessibility & UX', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await helpers.testKeyboardNavigation();
      
      // Test specific chat keyboard shortcuts
      await page.keyboard.press('Tab');
      await expect(page.locator(Selectors.chat.messageInput)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(Selectors.chat.sendButton)).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await helpers.checkAccessibility();
      
      // Check specific chat ARIA attributes
      const messageInput = page.locator(Selectors.chat.messageInput);
      const sendButton = page.locator(Selectors.chat.sendButton);
      const messageList = page.locator(Selectors.chat.messageList);
      
      await expect(messageInput).toHaveAttribute('aria-label');
      await expect(sendButton).toHaveAttribute('aria-label');
      await expect(messageList).toHaveAttribute('role', 'log');
    });

    test('should announce new messages to screen readers', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Check for aria-live region
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toBeVisible();
      
      // New message should be announced
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      const liveContent = await liveRegion.textContent();
      expect(liveContent).toContain('New message');
    });

    test('should maintain focus management', async ({ page }) => {
      await helpers.mockApiResponse(/\/chat/, ApiResponses.chatResponse);
      
      // Send message
      await helpers.typeWithDelay(Selectors.chat.messageInput, TestMessages.simple);
      await page.locator(Selectors.chat.sendButton).click();
      
      // Focus should return to input after sending
      await helpers.waitForText(ApiResponses.chatResponse.message.content);
      await expect(page.locator(Selectors.chat.messageInput)).toBeFocused();
    });
  });

  test.describe('Performance', () => {
    test('should handle large chat histories efficiently', async ({ page }) => {
      // Send many messages to test performance
      for (let i = 0; i < 50; i++) {
        await helpers.mockApiResponse(/\/chat/, {
          ...ApiResponses.chatResponse,
          message: { ...ApiResponses.chatResponse.message, content: `Response ${i}` }
        });
        
        await page.locator(Selectors.chat.messageInput).fill(`Message ${i}`);
        await page.locator(Selectors.chat.sendButton).click();
        
        if (i % 10 === 0) {
          // Periodic checks to ensure responsiveness
          await helpers.waitForText(`Response ${i}`);
        }
      }
      
      // Interface should remain responsive
      await expect(page.locator(Selectors.chat.messageInput)).toBeEnabled();
      await expect(page.locator(Selectors.chat.sendButton)).toBeEnabled();
      
      // Latest message should be visible
      const latestMessage = page.locator(Selectors.chat.message).last();
      await expect(latestMessage).toBeInViewport();
    });
  });
});