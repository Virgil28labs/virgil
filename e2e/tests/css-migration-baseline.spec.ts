import { test, expect } from '@playwright/test';

test.describe('CSS Migration Baseline Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set a consistent viewport for screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('capture auth page baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on auth page or need to sign out first
    const authPage = page.locator('.auth-page');
    const isVisible = await authPage.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Try to sign out if we're logged in
      const signOutButton = page.locator('.power-button');
      if (await signOutButton.isVisible()) {
        await signOutButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    await expect(page.locator('.auth-page')).toBeVisible();
    await expect(page).toHaveScreenshot('01-auth-page-baseline.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('capture dashboard baseline', async ({ page }) => {
    // Use existing auth from browser context if available
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // If on auth page, we'll skip dashboard test
    const dashboardContent = page.locator('.dashboard-content');
    const isVisible = await dashboardContent.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(page).toHaveScreenshot('02-dashboard-baseline.png', {
        fullPage: true,
        animations: 'disabled'
      });
      
      // Capture specific sections
      await expect(page.locator('.user-info')).toHaveScreenshot('03-user-info-baseline.png');
      await expect(page.locator('.location-info')).toHaveScreenshot('04-location-info-baseline.png');
    }
  });

  test('capture VirgilChatbot baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open chatbot if visible
    const chatBubble = page.locator('.virgil-chatbot-bubble');
    if (await chatBubble.isVisible()) {
      await chatBubble.click();
      await page.waitForTimeout(500); // Wait for animation
      
      const chatContainer = page.locator('.virgil-chatbot-container');
      await expect(chatContainer).toBeVisible();
      await expect(chatContainer).toHaveScreenshot('05-chatbot-container-baseline.png');
      
      // Close chatbot
      await page.locator('[aria-label="Minimize chat"]').click();
    }
  });

  test('capture component buttons baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const dashboardContent = page.locator('.dashboard-content');
    if (await dashboardContent.isVisible()) {
      // Capture quick action buttons area
      const quickActions = page.locator('.quick-actions');
      if (await quickActions.isVisible()) {
        await expect(quickActions).toHaveScreenshot('06-quick-actions-baseline.png');
      }
    }
  });
});

// Responsive baseline tests
test.describe('CSS Migration Responsive Baseline', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' }
  ];

  for (const viewport of viewports) {
    test(`capture ${viewport.name} baseline`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`07-${viewport.name}-baseline.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });
  }
});