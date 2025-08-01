import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for multi-browser E2E testing
 * Supports Chrome, Firefox, Safari, and mobile browsers
 */
export default defineConfig({
  testDir: './tests',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 15000,
    
    // Test timeout
    navigationTimeout: 30000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    
    // Accessibility testing
    {
      name: 'chromium-accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility testing
        // This will check for WCAG violations
      },
    },
    
    // Performance testing
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        // Collect performance metrics
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
    },
  ],
  
  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'cd server && npm start',
      port: 5002,
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});