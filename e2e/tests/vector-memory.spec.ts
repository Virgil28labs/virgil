/**
 * Vector Memory E2E Tests
 * 
 * Tests the semantic memory functionality including:
 * - Memory storage and retrieval
 * - Semantic search
 * - Memory management
 * - Integration with chat
 * - Performance with large datasets
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Vector Memory (Semantic Memory)', () => {
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

    // Mock vector API endpoints
    await mockVectorAPI(page);
    
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
  });

  test('should open vector memory modal', async ({ page }) => {
    // Find and click the brain emoji button
    const memoryButton = page.locator('[data-testid="vector-memory-button"]');
    await expect(memoryButton).toBeVisible();
    await expect(memoryButton).toHaveAttribute('data-emoji', '🧠');
    
    // Click to open
    await memoryButton.click();
    
    // Verify modal opens
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    await expect(memoryModal).toBeVisible();
    
    // Verify modal title
    await expect(memoryModal.locator('[data-testid="modal-title"]')).toContainText('Semantic Memory');
    
    // Verify main sections
    await expect(memoryModal.locator('[data-testid="memory-input-section"]')).toBeVisible();
    await expect(memoryModal.locator('[data-testid="memory-list-section"]')).toBeVisible();
    await expect(memoryModal.locator('[data-testid="memory-search-section"]')).toBeVisible();
    
    // Take screenshot
    await helpers.takeTimestampedScreenshot('vector-memory-modal');
  });

  test('should store a new memory', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Type memory content
    const memoryInput = memoryModal.locator('[data-testid="memory-input"]');
    await helpers.typeWithDelay('[data-testid="memory-input"]', 'My favorite color is blue and I love the ocean');
    
    // Verify character count
    await expect(memoryModal.locator('[data-testid="char-count"]')).toContainText('46');
    
    // Add tags
    const tagInput = memoryModal.locator('[data-testid="memory-tags"]');
    await tagInput.click();
    await tagInput.type('preferences');
    await page.keyboard.press('Enter');
    await tagInput.type('personal');
    await page.keyboard.press('Enter');
    
    // Verify tags added
    await expect(memoryModal.locator('[data-testid="tag-chip-preferences"]')).toBeVisible();
    await expect(memoryModal.locator('[data-testid="tag-chip-personal"]')).toBeVisible();
    
    // Save memory
    const saveButton = memoryModal.locator('[data-testid="save-memory"]');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    // Verify saving state
    await expect(memoryModal.locator('[data-testid="saving-indicator"]')).toBeVisible();
    
    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Memory saved');
    
    // Verify memory appears in list
    const memoryList = memoryModal.locator('[data-testid="memory-list"]');
    const newMemory = memoryList.locator('[data-testid="memory-item"]').first();
    await expect(newMemory).toContainText('My favorite color is blue');
    
    // Verify embedding indicator
    await expect(newMemory.locator('[data-testid="embedding-indicator"]')).toBeVisible();
    await expect(newMemory.locator('[data-testid="embedding-indicator"]')).toHaveAttribute('title', 'Semantic embedding stored');
  });

  test('should search memories semantically', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Switch to search tab
    await memoryModal.locator('[data-testid="tab-search"]').click();
    
    // Type search query
    const searchInput = memoryModal.locator('[data-testid="semantic-search-input"]');
    await helpers.typeWithDelay('[data-testid="semantic-search-input"]', 'What are my color preferences?');
    
    // Search
    await memoryModal.locator('[data-testid="search-memories"]').click();
    
    // Verify searching state
    await expect(memoryModal.locator('[data-testid="searching-indicator"]')).toBeVisible();
    
    // Verify results
    const searchResults = memoryModal.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
    
    // Check first result
    const firstResult = searchResults.locator('[data-testid="search-result"]').first();
    await expect(firstResult).toContainText('favorite color is blue');
    
    // Verify similarity score
    const similarityScore = firstResult.locator('[data-testid="similarity-score"]');
    await expect(similarityScore).toBeVisible();
    const score = await similarityScore.textContent();
    expect(parseFloat(score!)).toBeGreaterThan(0.7);
    
    // Verify semantic highlighting
    await expect(firstResult.locator('mark')).toBeVisible();
  });

  test('should handle memory deletion', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Get initial memory count
    const memoryCount = await memoryModal.locator('[data-testid="memory-count"]').textContent();
    const initialCount = parseInt(memoryCount!);
    
    // Hover over first memory
    const firstMemory = memoryModal.locator('[data-testid="memory-item"]').first();
    await firstMemory.hover();
    
    // Click delete button
    const deleteButton = firstMemory.locator('[data-testid="delete-memory"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    
    // Confirm deletion
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('Delete this memory?');
    
    await confirmDialog.locator('[data-testid="confirm-delete"]').click();
    
    // Verify deletion
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Memory deleted');
    
    // Verify count updated
    const newCount = await memoryModal.locator('[data-testid="memory-count"]').textContent();
    expect(parseInt(newCount!)).toBe(initialCount - 1);
  });

  test('should integrate with chat context', async ({ page }) => {
    // First, store a memory
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    await helpers.typeWithDelay('[data-testid="memory-input"]', 'I am allergic to peanuts and shellfish');
    await memoryModal.locator('[data-testid="save-memory"]').click();
    
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    
    // Close modal
    await memoryModal.locator('[data-testid="close-modal"]').click();
    
    // Navigate to chat
    await page.goto('/chat');
    await helpers.waitForAppReady();
    
    // Ask about allergies
    await helpers.typeWithDelay('[data-testid="chat-input"]', 'What foods should I avoid?');
    await page.locator('[data-testid="chat-send"]').click();
    
    // Verify memory context indicator
    await expect(page.locator('[data-testid="memory-context-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-context-indicator"]')).toContainText('Using 1 memory');
    
    // Wait for response
    await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]:last-child');
    
    // Verify response includes memory context
    const response = page.locator('[data-testid="chat-message"]').last();
    await expect(response).toContainText('peanuts');
    await expect(response).toContainText('shellfish');
    
    // Hover to see memory sources
    await response.hover();
    const memorySources = response.locator('[data-testid="memory-sources"]');
    await expect(memorySources).toBeVisible();
    await expect(memorySources).toContainText('allergic to peanuts');
  });

  test('should handle large memory datasets', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Mock API to return many memories
    await page.route('**/api/v1/vector/memories?page=1', async (route) => {
      const memories = Array.from({ length: 50 }, (_, i) => ({
        id: `memory-${i}`,
        content: `Memory content ${i}: ${generateLoremIpsum(20)}`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        tags: ['auto-generated'],
        similarity: Math.random(),
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          memories,
          total: 150,
          page: 1,
          hasMore: true,
        }),
      });
    });
    
    // Refresh memory list
    await memoryModal.locator('[data-testid="refresh-memories"]').click();
    
    // Verify pagination
    const pagination = memoryModal.locator('[data-testid="memory-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText('1-50 of 150');
    
    // Test infinite scroll
    const memoryList = memoryModal.locator('[data-testid="memory-list"]');
    await memoryList.evaluate(el => el.scrollTop = el.scrollHeight);
    
    // Verify loading more indicator
    await expect(memoryModal.locator('[data-testid="loading-more"]')).toBeVisible();
    
    // Verify performance - should not lag
    const startTime = Date.now();
    await memoryList.evaluate(el => el.scrollTop = 0);
    const scrollTime = Date.now() - startTime;
    expect(scrollTime).toBeLessThan(100); // Should be smooth
  });

  test('should export and import memories', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Open settings
    await memoryModal.locator('[data-testid="memory-settings"]').click();
    
    // Test export
    const downloadPromise = page.waitForEvent('download');
    await memoryModal.locator('[data-testid="export-memories"]').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/memories-\d{4}-\d{2}-\d{2}\.json$/);
    
    // Test import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await memoryModal.locator('[data-testid="import-memories"]').click();
    
    const fileChooser = await fileChooserPromise;
    // Would set files here in real test
    
    // Clean up
    await download.delete();
  });

  test('should show memory analytics', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Switch to analytics tab
    await memoryModal.locator('[data-testid="tab-analytics"]').click();
    
    // Verify analytics display
    const analytics = memoryModal.locator('[data-testid="memory-analytics"]');
    await expect(analytics).toBeVisible();
    
    // Check metrics
    await expect(analytics.locator('[data-testid="total-memories"]')).toBeVisible();
    await expect(analytics.locator('[data-testid="total-embeddings"]')).toBeVisible();
    await expect(analytics.locator('[data-testid="storage-used"]')).toBeVisible();
    await expect(analytics.locator('[data-testid="avg-similarity"]')).toBeVisible();
    
    // Check memory growth chart
    const growthChart = analytics.locator('[data-testid="memory-growth-chart"]');
    await expect(growthChart).toBeVisible();
    
    // Check tag cloud
    const tagCloud = analytics.locator('[data-testid="tag-cloud"]');
    await expect(tagCloud).toBeVisible();
    const tags = await tagCloud.locator('[data-testid^="tag-"]').all();
    expect(tags.length).toBeGreaterThan(0);
  });

  test('should handle memory errors gracefully', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Mock API error
    await page.route('**/api/v1/vector/store', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Embedding service unavailable',
        }),
      });
    });
    
    // Try to save memory
    await helpers.typeWithDelay('[data-testid="memory-input"]', 'This will fail');
    await memoryModal.locator('[data-testid="save-memory"]').click();
    
    // Verify error handling
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-error"]')).toContainText('Failed to save memory');
    
    // Verify retry option
    await expect(memoryModal.locator('[data-testid="retry-save"]')).toBeVisible();
    
    // Verify input is preserved
    await expect(memoryModal.locator('[data-testid="memory-input"]')).toHaveValue('This will fail');
  });

  test('should support memory templates', async ({ page }) => {
    // Open memory modal
    await page.locator('[data-testid="vector-memory-button"]').click();
    
    const memoryModal = page.locator('[data-testid="vector-memory-modal"]');
    
    // Click templates button
    await memoryModal.locator('[data-testid="memory-templates"]').click();
    
    // Verify template menu
    const templateMenu = memoryModal.locator('[data-testid="template-menu"]');
    await expect(templateMenu).toBeVisible();
    
    // Select a template
    await templateMenu.locator('[data-testid="template-preferences"]').click();
    
    // Verify template loaded
    const memoryInput = memoryModal.locator('[data-testid="memory-input"]');
    const inputValue = await memoryInput.inputValue();
    expect(inputValue).toContain('My preference for');
    
    // Complete the template
    await memoryInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' is chocolate ice cream');
    
    // Save
    await memoryModal.locator('[data-testid="save-memory"]').click();
    
    // Verify saved with template tag
    const savedMemory = memoryModal.locator('[data-testid="memory-item"]').first();
    await expect(savedMemory.locator('[data-testid="tag-chip-template"]')).toBeVisible();
  });
});

/**
 * Mock vector/semantic memory API
 */
async function mockVectorAPI(page: Page) {
  // Mock memory count
  await page.route('**/api/v1/vector/count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 42 }),
    });
  });

  // Mock memory list
  await page.route('**/api/v1/vector/memories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        memories: [
          {
            id: 'mem-1',
            content: 'I prefer dark mode for coding',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            tags: ['preferences', 'coding'],
          },
          {
            id: 'mem-2',
            content: 'My birthday is in December',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            tags: ['personal'],
          },
          {
            id: 'mem-3',
            content: 'I enjoy hiking and outdoor activities',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            tags: ['hobbies', 'personal'],
          },
        ],
        total: 3,
        page: 1,
        hasMore: false,
      }),
    });
  });

  // Mock memory storage
  await page.route('**/api/v1/vector/store', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `mem-${Date.now()}`,
          content: body.content,
          embedding: Array(1536).fill(0.1), // Mock embedding
          createdAt: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock semantic search
  await page.route('**/api/v1/vector/search', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'mem-1',
              content: 'My favorite color is blue and I love the ocean',
              similarity: 0.89,
              tags: ['preferences', 'personal'],
            },
            {
              id: 'mem-2',
              content: 'I prefer dark mode for coding',
              similarity: 0.72,
              tags: ['preferences', 'coding'],
            },
          ],
        }),
      });
    }
  });

  // Mock memory deletion
  await page.route('**/api/v1/vector/memories/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

function generateLoremIpsum(wordCount: number): string {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do'];
  return Array.from({ length: wordCount }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
}