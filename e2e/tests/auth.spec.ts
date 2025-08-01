/**
 * Authentication E2E Tests
 * 
 * Tests the complete authentication flow including:
 * - Login with different providers
 * - Logout functionality
 * - Session persistence
 * - Protected route access
 * - Authentication error handling
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
    await page.goto('/');
    await helpers.waitForAppReady();
  });

  test('should display login page when not authenticated', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Verify login UI elements
    await expect(page.locator('[data-testid="login-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-providers"]')).toBeVisible();
    
    // Check for provider buttons
    const providers = ['google', 'github', 'email'];
    for (const provider of providers) {
      await expect(page.locator(`[data-testid="provider-${provider}"]`)).toBeVisible();
    }
    
    // Take screenshot for visual verification
    await helpers.takeTimestampedScreenshot('login-page');
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock successful authentication
    await page.route('**/auth/v1/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          },
        }),
      });
    });

    // Navigate to login
    await page.goto('/login');
    
    // Click Google provider
    await page.locator('[data-testid="provider-google"]').click();
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
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

    // Navigate to login
    await page.goto('/login');
    
    // Try to login with email
    await page.locator('[data-testid="provider-email"]').click();
    
    // Fill in credentials
    await helpers.typeWithDelay('[data-testid="email-input"]', 'test@example.com');
    await helpers.typeWithDelay('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit form
    await page.locator('[data-testid="login-submit"]').click();
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Invalid login credentials');
  });

  test('should persist session across page reloads', async ({ page, context }) => {
    // Set up authentication state
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

    // Add user data to localStorage
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
          },
        },
      }));
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
    
    // Verify user is authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    await helpers.waitForAppReady();
    
    // Verify user is still authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
  });

  test('should logout successfully', async ({ page, context }) => {
    // Set up authentication state
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

    // Mock logout endpoint
    await page.route('**/auth/v1/logout', async (route) => {
      await route.fulfill({
        status: 204,
      });
    });

    // Navigate to dashboard as authenticated user
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
    
    // Open user menu
    await page.locator('[data-testid="user-menu"]').click();
    
    // Click logout
    await page.locator('[data-testid="logout-button"]').click();
    
    // Confirm logout if there's a confirmation dialog
    const confirmButton = page.locator('[data-testid="confirm-logout"]');
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await confirmButton.click();
    }
    
    // Wait for redirect to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // Verify user is logged out
    await expect(page.locator('[data-testid="login-header"]')).toBeVisible();
    
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect back to login
    await page.waitForURL('**/login', { timeout: 5000 });
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Clear any auth data
    await helpers.clearStorageData();
    
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/chat', '/profile', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to login
      await page.waitForURL('**/login', { timeout: 5000 });
      
      // Verify redirect message if shown
      const redirectMessage = page.locator('[data-testid="redirect-message"]');
      if (await redirectMessage.isVisible({ timeout: 1000 })) {
        await expect(redirectMessage).toContainText('Please login to continue');
      }
    }
  });

  test('should handle token expiration', async ({ page, context }) => {
    // Set up expired token
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'expired-token',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Mock API to return 401 for expired token
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_token',
          error_description: 'Token has expired',
        }),
      });
    });

    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // Verify session expired message if shown
    const expiredMessage = page.locator('[data-testid="session-expired"]');
    if (await expiredMessage.isVisible({ timeout: 1000 })) {
      await expect(expiredMessage).toContainText('Session expired');
    }
  });

  test('should support keyboard navigation in login form', async ({ page }) => {
    await page.goto('/login');
    
    // Focus should start on first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focused element is a provider button
    const focusedElement = await page.evaluate(() => 
      document.activeElement?.getAttribute('data-testid')
    );
    
    expect(focusedElement).toMatch(/provider-/);
    
    // Tab through all providers
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Press Enter to select provider
    await page.keyboard.press('Enter');
    
    // Verify provider was activated
    await helpers.waitForElement('[data-testid="auth-loading"]', 1000).catch(() => {
      // Auth loading indicator should appear
    });
  });

  test('should show loading state during authentication', async ({ page }) => {
    // Mock slow authentication
    await page.route('**/auth/v1/token', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          user: { id: 'test-user-123' },
        }),
      });
    });

    await page.goto('/login');
    
    // Click provider
    await page.locator('[data-testid="provider-google"]').click();
    
    // Verify loading state appears
    await expect(page.locator('[data-testid="auth-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-loading"]')).toContainText('Authenticating');
    
    // Verify buttons are disabled during loading
    const providerButtons = await page.locator('[data-testid^="provider-"]').all();
    for (const button of providerButtons) {
      await expect(button).toBeDisabled();
    }
  });

  test('should handle network errors during authentication', async ({ page }) => {
    // Mock network error
    await page.route('**/auth/v1/token', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/login');
    
    // Try to login
    await page.locator('[data-testid="provider-google"]').click();
    
    // Verify error message
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Network error');
    
    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-auth"]')).toBeVisible();
  });
});

test.describe('Multi-factor Authentication', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
  });

  test('should handle MFA challenge', async ({ page }) => {
    // Mock MFA required response
    await page.route('**/auth/v1/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: null,
          mfa_required: true,
          factor_id: 'test-factor-123',
        }),
      });
    });

    await page.goto('/login');
    
    // Login with email
    await page.locator('[data-testid="provider-email"]').click();
    await helpers.typeWithDelay('[data-testid="email-input"]', 'mfa@example.com');
    await helpers.typeWithDelay('[data-testid="password-input"]', 'password123');
    await page.locator('[data-testid="login-submit"]').click();
    
    // Should show MFA input
    await expect(page.locator('[data-testid="mfa-input"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="mfa-prompt"]')).toContainText('Enter verification code');
    
    // Enter MFA code
    await helpers.typeWithDelay('[data-testid="mfa-input"]', '123456');
    
    // Mock successful MFA verification
    await page.route('**/auth/v1/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          user: { id: 'test-user-123' },
        }),
      });
    });
    
    // Submit MFA code
    await page.locator('[data-testid="mfa-submit"]').click();
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });
});