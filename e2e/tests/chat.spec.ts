/**
 * Chat Functionality E2E Tests
 * 
 * Tests the complete chat experience including:
 * - Sending and receiving messages
 * - Real-time updates
 * - Message history
 * - Error handling
 * - Special features (code blocks, markdown)
 * - Mobile responsiveness
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Chat Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page, context }) => {
    helpers = new TestHelpers(page);
    
    // Set up authenticated state
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

    // Mock chat API endpoints
    await page.route('**/api/v1/chat/messages', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            messages: [
              {
                id: 'msg-1',
                content: 'Hello! How can I help you today?',
                role: 'assistant',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 'msg-2',
                content: 'What is the weather like?',
                role: 'user',
                timestamp: new Date(Date.now() - 3000000).toISOString(),
              },
              {
                id: 'msg-3',
                content: 'I can help you check the weather. Let me fetch that information for you.',
                role: 'assistant',
                timestamp: new Date(Date.now() - 2900000).toISOString(),
              },
            ],
          }),
        });
      }
    });

    await page.goto('/chat');
    await helpers.waitForAppReady();
  });

  test('should load chat interface with message history', async ({ page }) => {
    // Verify chat container is visible
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
    
    // Verify message history loaded
    const messages = await page.locator('[data-testid="chat-message"]').all();
    expect(messages).toHaveLength(3);
    
    // Verify message content
    await expect(page.locator('[data-testid="chat-message"]').first()).toContainText('Hello! How can I help you today?');
    
    // Verify user vs assistant messages have different styling
    const userMessage = page.locator('[data-testid="chat-message"][data-role="user"]').first();
    const assistantMessage = page.locator('[data-testid="chat-message"][data-role="assistant"]').first();
    
    await expect(userMessage).toHaveClass(/user-message/);
    await expect(assistantMessage).toHaveClass(/assistant-message/);
    
    // Take screenshot
    await helpers.takeTimestampedScreenshot('chat-interface');
  });

  test('should send a message and receive response', async ({ page }) => {
    // Mock message sending
    await page.route('**/api/v1/chat/messages', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-new',
            content: body.content,
            role: 'user',
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    // Mock streaming response
    await page.route('**/api/v1/chat/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"chunk": "I understand you want to know about "}\n\ndata: {"chunk": "TypeScript. "}\n\ndata: {"chunk": "It's a typed superset of JavaScript."}\n\ndata: {"done": true}\n\n`,
      });
    });

    // Type message
    const input = page.locator('[data-testid="chat-input"]');
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'Tell me about TypeScript');
    
    // Verify send button is enabled
    const sendButton = page.locator('[data-testid="chat-send"]');
    await expect(sendButton).toBeEnabled();
    
    // Send message
    await sendButton.click();
    
    // Verify input is cleared
    await expect(input).toHaveValue('');
    
    // Verify message appears in chat
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Tell me about TypeScript');
    
    // Verify typing indicator appears
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:last-child', { timeout: 5000 });
    
    // Verify response content
    const lastMessage = page.locator('[data-testid="chat-message"]').last();
    await expect(lastMessage).toContainText('TypeScript');
    await expect(lastMessage).toContainText('typed superset of JavaScript');
    
    // Verify typing indicator is hidden
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
  });

  test('should handle message sending errors', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/chat/messages', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to send message',
          }),
        });
      }
    });

    // Type and send message
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'This will fail');
    await page.locator('[data-testid="chat-send"]').click();
    
    // Verify error message appears
    await expect(page.locator('[data-testid="chat-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-error"]')).toContainText('Failed to send message');
    
    // Verify retry button
    await expect(page.locator('[data-testid="retry-send"]')).toBeVisible();
    
    // Verify message is still in input (for retry)
    await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('This will fail');
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Focus input
    await page.locator('[data-testid="chat-input"]').focus();
    
    // Type message
    await page.keyboard.type('Test message with keyboard');
    
    // Send with Enter
    await page.keyboard.press('Enter');
    
    // Verify message sent
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Test message with keyboard');
    
    // Test multiline with Shift+Enter
    await page.keyboard.type('Line 1');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
    await page.keyboard.type('Line 2');
    
    // Verify multiline input
    const inputValue = await page.locator('[data-testid="chat-input"]').inputValue();
    expect(inputValue).toContain('Line 1\nLine 2');
    
    // Clear with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('');
  });

  test('should render markdown and code blocks correctly', async ({ page }) => {
    // Mock message with markdown
    await page.route('**/api/v1/chat/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"chunk": "Here's a **bold** text and *italic* text.\\n\\n"}\n\ndata: {"chunk": "\`\`\`javascript\\nconst greeting = 'Hello World';\\nconsole.log(greeting);\\n\`\`\`"}\n\ndata: {"done": true}\n\n`,
      });
    });

    // Send message
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'Show me markdown');
    await page.locator('[data-testid="chat-send"]').click();
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:last-child', { timeout: 5000 });
    
    // Verify markdown rendering
    const lastMessage = page.locator('[data-testid="chat-message"]').last();
    
    // Check bold text
    await expect(lastMessage.locator('strong')).toContainText('bold');
    
    // Check italic text
    await expect(lastMessage.locator('em')).toContainText('italic');
    
    // Check code block
    const codeBlock = lastMessage.locator('pre code');
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toHaveClass(/language-javascript/);
    await expect(codeBlock).toContainText("const greeting = 'Hello World'");
    
    // Check syntax highlighting
    await expect(codeBlock.locator('.token.keyword')).toContainText('const');
    
    // Check copy button
    const copyButton = lastMessage.locator('[data-testid="copy-code"]');
    await expect(copyButton).toBeVisible();
  });

  test('should handle long messages with scroll', async ({ page }) => {
    // Generate long message
    const longMessage = 'Lorem ipsum dolor sit amet. '.repeat(100);
    
    // Send long message
    await page.locator('[data-testid="chat-input"]').fill(longMessage);
    await page.locator('[data-testid="chat-send"]').click();
    
    // Verify message container scrolls
    const chatContainer = page.locator('[data-testid="chat-messages"]');
    const scrollHeight = await chatContainer.evaluate(el => el.scrollHeight);
    const clientHeight = await chatContainer.evaluate(el => el.clientHeight);
    
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    
    // Verify auto-scroll to bottom
    const scrollTop = await chatContainer.evaluate(el => el.scrollTop);
    const maxScroll = await chatContainer.evaluate(el => el.scrollHeight - el.clientHeight);
    
    expect(Math.abs(scrollTop - maxScroll)).toBeLessThan(10);
  });

  test('should show message timestamps on hover', async ({ page }) => {
    // Hover over a message
    const message = page.locator('[data-testid="chat-message"]').first();
    await message.hover();
    
    // Verify timestamp appears
    const timestamp = message.locator('[data-testid="message-timestamp"]');
    await expect(timestamp).toBeVisible();
    
    // Verify timestamp format
    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    
    // Move away and verify timestamp hides
    await page.mouse.move(0, 0);
    await expect(timestamp).not.toBeVisible();
  });

  test('should support message actions', async ({ page }) => {
    // Hover over assistant message
    const assistantMessage = page.locator('[data-testid="chat-message"][data-role="assistant"]').first();
    await assistantMessage.hover();
    
    // Verify action buttons appear
    const copyButton = assistantMessage.locator('[data-testid="copy-message"]');
    const regenerateButton = assistantMessage.locator('[data-testid="regenerate-message"]');
    
    await expect(copyButton).toBeVisible();
    await expect(regenerateButton).toBeVisible();
    
    // Test copy functionality
    await copyButton.click();
    
    // Verify copy feedback
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="copy-success"]')).toContainText('Copied');
    
    // Test regenerate
    await regenerateButton.click();
    
    // Verify regeneration starts
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
  });

  test('should handle network interruptions gracefully', async ({ page, context }) => {
    // Start typing a message
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'Test message');
    
    // Simulate offline
    await context.setOffline(true);
    
    // Try to send
    await page.locator('[data-testid="chat-send"]').click();
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-banner"]')).toContainText('No internet connection');
    
    // Verify message is queued
    await expect(page.locator('[data-testid="message-status-pending"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Verify reconnection
    await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();
    
    // Verify message is sent
    await expect(page.locator('[data-testid="message-status-sent"]')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-chat-header"]')).toBeVisible();
    
    // Verify input is at bottom
    const input = page.locator('[data-testid="chat-input"]');
    const inputBox = await input.boundingBox();
    expect(inputBox?.y).toBeGreaterThan(500);
    
    // Test mobile menu
    await page.locator('[data-testid="mobile-menu-button"]').click();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test keyboard interaction
    await input.click();
    
    // Wait for keyboard (simulated by viewport change)
    await page.waitForTimeout(500);
    
    // Verify input is still visible above keyboard
    const newInputBox = await input.boundingBox();
    expect(newInputBox?.y).toBeLessThan(400);
  });

  test('should support voice input', async ({ page, browserName }) => {
    // Skip on browsers that don't support speech recognition
    test.skip(browserName === 'webkit', 'Speech recognition not supported in WebKit');
    
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Click voice input button
    const voiceButton = page.locator('[data-testid="voice-input"]');
    await expect(voiceButton).toBeVisible();
    await voiceButton.click();
    
    // Verify recording indicator
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="recording-indicator"]')).toHaveClass(/recording/);
    
    // Mock speech recognition result
    await page.evaluate(() => {
      const event = new Event('result');
      event.results = [{
        0: { transcript: 'Hello from voice input' },
        isFinal: true,
      }];
      window.speechRecognition?.dispatchEvent(event);
    });
    
    // Verify text appears in input
    await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('Hello from voice input');
    
    // Stop recording
    await voiceButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible();
  });

  test('should preserve chat state on navigation', async ({ page }) => {
    // Send a message
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'Remember this message');
    await page.locator('[data-testid="chat-send"]').click();
    
    // Navigate away
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
    
    // Navigate back
    await page.goto('/chat');
    await helpers.waitForAppReady();
    
    // Verify message is still there
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Remember this message');
    
    // Verify scroll position is preserved
    const chatContainer = page.locator('[data-testid="chat-messages"]');
    const scrollTop = await chatContainer.evaluate(el => el.scrollTop);
    const maxScroll = await chatContainer.evaluate(el => el.scrollHeight - el.clientHeight);
    
    // Should be scrolled to bottom
    expect(Math.abs(scrollTop - maxScroll)).toBeLessThan(10);
  });
});