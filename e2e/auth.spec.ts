/**
 * Authentication E2E Test Suite
 * 
 * Tests complete authentication flows including login, registration,
 * logout, session management, and error handling.
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TestUsers, ApiResponses, Selectors, URLs } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearStorageData();
    await page.goto(URLs.home);
  });

  test.describe('Login Process', () => {
    test('should display login form on unauthenticated access', async ({ page }) => {
      await page.goto(URLs.dashboard);
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
      await expect(page.locator(Selectors.auth.loginForm)).toBeVisible();
      await expect(page.locator(Selectors.auth.emailInput)).toBeVisible();
      await expect(page.locator(Selectors.auth.passwordInput)).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      // Mock successful authentication
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      
      await page.goto(URLs.login);
      
      // Fill login form
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      
      // Submit form
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should redirect to dashboard
      await helpers.waitForText('Dashboard');
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Mock authentication failure
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authError);
      
      await page.goto(URLs.login);
      
      // Fill form with invalid credentials
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.invalidUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.invalidUser.password);
      
      // Submit form
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should show error message
      await expect(page.locator(Selectors.auth.errorMessage)).toBeVisible();
      await expect(page.locator(Selectors.auth.errorMessage)).toContainText('Invalid credentials');
      
      // Should remain on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(URLs.login);
      
      // Enter invalid email
      await helpers.typeWithDelay(Selectors.auth.emailInput, 'invalid-email');
      await helpers.typeWithDelay(Selectors.auth.passwordInput, 'password123');
      
      // Try to submit
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should show validation error
      const emailInput = page.locator(Selectors.auth.emailInput);
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should require password field', async ({ page }) => {
      await page.goto(URLs.login);
      
      // Enter email but no password
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      
      // Try to submit
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should show validation error
      const passwordInput = page.locator(Selectors.auth.passwordInput);
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });
  });

  test.describe('Registration Process', () => {
    test('should register new user successfully', async ({ page }) => {
      // Mock successful registration
      await helpers.mockApiResponse(/\/auth\/register/, {
        ...ApiResponses.authSuccess,
        user: { ...ApiResponses.authSuccess.user, email: TestUsers.newUser.email }
      });
      
      await page.goto(URLs.register);
      
      // Fill registration form
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.newUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.newUser.password);
      
      // Submit form
      await page.locator(Selectors.auth.registerButton).click();
      
      // Should redirect to dashboard
      await helpers.waitForText('Dashboard');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should show error for existing email', async ({ page }) => {
      // Mock registration failure
      await helpers.mockApiResponse(/\/auth\/register/, {
        success: false,
        error: 'Email already exists'
      });
      
      await page.goto(URLs.register);
      
      // Fill form with existing email
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      
      // Submit form
      await page.locator(Selectors.auth.registerButton).click();
      
      // Should show error
      await expect(page.locator(Selectors.auth.errorMessage)).toContainText('Email already exists');
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto(URLs.register);
      
      // Enter weak password
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.newUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, '123');
      
      // Try to submit
      await page.locator(Selectors.auth.registerButton).click();
      
      // Should show password validation error
      const errorMessage = page.locator(Selectors.auth.errorMessage);
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login first
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Wait for dashboard
      await helpers.waitForText('Dashboard');
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator(Selectors.dashboard.container)).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Wait for dashboard
      await helpers.waitForText('Dashboard');
      
      // Logout
      await page.locator(Selectors.auth.logoutButton).click();
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
      await expect(page.locator(Selectors.auth.loginForm)).toBeVisible();
    });

    test('should handle session expiry', async ({ page }) => {
      // Login first
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Wait for dashboard
      await helpers.waitForText('Dashboard');
      
      // Mock session expiry by returning 401 for API calls
      await helpers.mockApiResponse(/\/api\/.*/, { status: 401, body: { error: 'Session expired' } });
      
      // Try to access protected resource
      await page.goto(URLs.profile);
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
      await expect(page.locator(Selectors.auth.errorMessage)).toContainText('Session expired');
    });
  });

  test.describe('Accessibility & UX', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(URLs.login);
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator(Selectors.auth.emailInput)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(Selectors.auth.passwordInput)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(Selectors.auth.loginButton)).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await helpers.mockApiResponse(/\/auth\/login/, ApiResponses.authSuccess);
      await page.goto(URLs.login);
      
      // Fill form
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      
      // Press Enter to submit
      await page.keyboard.press('Enter');
      
      // Should login successfully
      await helpers.waitForText('Dashboard');
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto(URLs.login);
      
      // Check form accessibility
      await helpers.checkAccessibility();
      
      // Check specific ARIA attributes
      const emailInput = page.locator(Selectors.auth.emailInput);
      const passwordInput = page.locator(Selectors.auth.passwordInput);
      
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route(/\/auth\/login/, (route) => route.abort('failed'));
      
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should show network error
      await expect(page.locator(Selectors.auth.errorMessage)).toBeVisible();
      await expect(page.locator(Selectors.auth.errorMessage)).toContainText(/network|connection/i);
    });

    test('should handle server errors', async ({ page }) => {
      // Mock server error
      await page.route(/\/auth\/login/, (route) => 
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal server error' }) })
      );
      
      await page.goto(URLs.login);
      await helpers.typeWithDelay(Selectors.auth.emailInput, TestUsers.validUser.email);
      await helpers.typeWithDelay(Selectors.auth.passwordInput, TestUsers.validUser.password);
      await page.locator(Selectors.auth.loginButton).click();
      
      // Should show server error
      await expect(page.locator(Selectors.auth.errorMessage)).toBeVisible();
      await expect(page.locator(Selectors.auth.errorMessage)).toContainText(/server error/i);
    });
  });
});