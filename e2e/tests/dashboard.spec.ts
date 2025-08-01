/**
 * Dashboard Functionality E2E Tests
 * 
 * Tests the dashboard experience including:
 * - Widget interactions (weather, camera, etc.)
 * - Real-time updates
 * - Widget configuration
 * - Responsive layout
 * - Error states
 * - Performance metrics
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Dashboard Functionality', () => {
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

    // Mock API endpoints
    await mockDashboardAPIs(page);
    
    // Grant permissions
    await context.grantPermissions(['geolocation', 'camera']);
    
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
  });

  test('should display all dashboard widgets', async ({ page }) => {
    // Verify dashboard container
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Check for all expected widgets
    const widgets = [
      'weather-widget',
      'camera-widget',
      'chat-widget',
      'virgil-widget',
      'nasa-widget',
      'rhythm-widget',
    ];
    
    for (const widget of widgets) {
      await expect(page.locator(`[data-testid="${widget}"]`)).toBeVisible();
    }
    
    // Verify widget grid layout
    const dashboardGrid = page.locator('[data-testid="dashboard-grid"]');
    const gridStyles = await dashboardGrid.getAttribute('class');
    expect(gridStyles).toContain('grid');
    
    // Take screenshot
    await helpers.takeTimestampedScreenshot('dashboard-overview');
  });

  test('should interact with weather widget', async ({ page }) => {
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    
    // Verify weather data loaded
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toBeVisible();
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toContainText('72°F');
    
    // Verify location
    await expect(weatherWidget.locator('[data-testid="location"]')).toContainText('New York, NY');
    
    // Toggle temperature unit
    const unitToggle = weatherWidget.locator('[data-testid="unit-toggle"]');
    await unitToggle.click();
    
    // Verify unit changed to Celsius
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toContainText('22°C');
    
    // Hover to show forecast
    await weatherWidget.hover();
    
    // Wait for forecast to appear
    const forecast = page.locator('[data-testid="weather-forecast"]');
    await expect(forecast).toBeVisible({ timeout: 2000 });
    
    // Verify forecast days
    const forecastDays = await forecast.locator('[data-testid="forecast-day"]').all();
    expect(forecastDays).toHaveLength(5);
    
    // Click refresh button
    const refreshButton = weatherWidget.locator('[data-testid="refresh-weather"]');
    await refreshButton.click();
    
    // Verify loading state
    await expect(weatherWidget.locator('[data-testid="weather-loading"]')).toBeVisible();
    
    // Verify data reloaded
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toBeVisible();
  });

  test('should interact with camera widget', async ({ page, browserName }) => {
    // Skip on browsers with known camera issues in CI
    test.skip(browserName === 'webkit', 'Camera tests unreliable in WebKit CI');
    
    const cameraWidget = page.locator('[data-testid="camera-widget"]');
    
    // Click to open camera
    await cameraWidget.click();
    
    // Verify camera modal opens
    const cameraModal = page.locator('[data-testid="camera-modal"]');
    await expect(cameraModal).toBeVisible();
    
    // Verify camera permission prompt or stream
    const cameraStream = cameraModal.locator('[data-testid="camera-stream"]');
    const permissionPrompt = cameraModal.locator('[data-testid="camera-permission"]');
    
    // Either stream is visible or permission prompt
    const streamVisible = await cameraStream.isVisible().catch(() => false);
    const promptVisible = await permissionPrompt.isVisible().catch(() => false);
    
    expect(streamVisible || promptVisible).toBeTruthy();
    
    if (streamVisible) {
      // Test camera controls
      const captureButton = cameraModal.locator('[data-testid="capture-photo"]');
      await expect(captureButton).toBeVisible();
      
      // Take photo
      await captureButton.click();
      
      // Verify photo preview
      await expect(cameraModal.locator('[data-testid="photo-preview"]')).toBeVisible();
      
      // Test retake
      const retakeButton = cameraModal.locator('[data-testid="retake-photo"]');
      await retakeButton.click();
      
      // Verify back to camera stream
      await expect(cameraStream).toBeVisible();
    }
    
    // Close modal
    const closeButton = cameraModal.locator('[data-testid="close-camera"]');
    await closeButton.click();
    
    // Verify modal closed
    await expect(cameraModal).not.toBeVisible();
  });

  test('should interact with Virgil (physics raccoon)', async ({ page }) => {
    const virgilWidget = page.locator('[data-testid="virgil-widget"]');
    
    // Verify Virgil is rendered
    const virgilCanvas = virgilWidget.locator('canvas');
    await expect(virgilCanvas).toBeVisible();
    
    // Get initial position
    const initialBounds = await virgilCanvas.boundingBox();
    
    // Interact with physics - click to apply force
    await virgilCanvas.click({ position: { x: 50, y: 50 } });
    
    // Wait for physics animation
    await page.waitForTimeout(500);
    
    // Drag interaction
    await virgilCanvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    
    // Verify physics response (canvas should update)
    await expect(virgilCanvas).toBeVisible();
    
    // Test reset button if available
    const resetButton = virgilWidget.locator('[data-testid="reset-physics"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      // Verify reset animation
      await page.waitForTimeout(300);
    }
  });

  test('should interact with NASA APOD widget', async ({ page }) => {
    const nasaWidget = page.locator('[data-testid="nasa-widget"]');
    
    // Click to open APOD
    await nasaWidget.click();
    
    // Verify modal opens
    const apodModal = page.locator('[data-testid="apod-modal"]');
    await expect(apodModal).toBeVisible();
    
    // Verify content loaded
    await expect(apodModal.locator('[data-testid="apod-title"]')).toBeVisible();
    await expect(apodModal.locator('[data-testid="apod-title"]')).toContainText('Spiral Galaxy NGC 1232');
    
    // Verify image loaded
    const apodImage = apodModal.locator('[data-testid="apod-image"]');
    await expect(apodImage).toBeVisible();
    
    // Verify description
    await expect(apodModal.locator('[data-testid="apod-description"]')).toBeVisible();
    
    // Test date navigation
    const prevButton = apodModal.locator('[data-testid="apod-prev"]');
    await prevButton.click();
    
    // Verify loading state
    await expect(apodModal.locator('[data-testid="apod-loading"]')).toBeVisible();
    
    // Verify new content loaded
    await expect(apodModal.locator('[data-testid="apod-title"]')).not.toContainText('Spiral Galaxy NGC 1232');
    
    // Test fullscreen if available
    const fullscreenButton = apodModal.locator('[data-testid="apod-fullscreen"]');
    if (await fullscreenButton.isVisible()) {
      await fullscreenButton.click();
      // Note: Can't fully test fullscreen in headless mode
      await page.keyboard.press('Escape'); // Exit fullscreen
    }
    
    // Close modal
    await apodModal.locator('[data-testid="close-apod"]').click();
    await expect(apodModal).not.toBeVisible();
  });

  test('should interact with rhythm widget', async ({ page }) => {
    const rhythmWidget = page.locator('[data-testid="rhythm-widget"]');
    
    // Click to open rhythm maker
    await rhythmWidget.click();
    
    // Verify modal opens
    const rhythmModal = page.locator('[data-testid="rhythm-modal"]');
    await expect(rhythmModal).toBeVisible();
    
    // Verify drum grid
    const drumGrid = rhythmModal.locator('[data-testid="drum-grid"]');
    await expect(drumGrid).toBeVisible();
    
    // Count drum tracks
    const drumTracks = await drumGrid.locator('[data-testid="drum-track"]').all();
    expect(drumTracks).toHaveLength(5); // Kick, Snare, HiHat, OpenHat, Clap
    
    // Toggle some beats
    const beatCells = drumGrid.locator('[data-testid="beat-cell"]');
    await beatCells.nth(0).click(); // First beat of kick
    await beatCells.nth(20).click(); // Fifth beat of snare
    
    // Verify beat states changed
    await expect(beatCells.nth(0)).toHaveClass(/active/);
    await expect(beatCells.nth(20)).toHaveClass(/active/);
    
    // Test play button
    const playButton = rhythmModal.locator('[data-testid="rhythm-play"]');
    await playButton.click();
    
    // Verify playing state
    await expect(playButton).toHaveAttribute('data-playing', 'true');
    
    // Test tempo control
    const tempoSlider = rhythmModal.locator('[data-testid="tempo-slider"]');
    await tempoSlider.fill('140');
    
    // Verify tempo updated
    await expect(rhythmModal.locator('[data-testid="tempo-display"]')).toContainText('140 BPM');
    
    // Stop playback
    await playButton.click();
    await expect(playButton).toHaveAttribute('data-playing', 'false');
    
    // Test pattern generation
    const generateButton = rhythmModal.locator('[data-testid="generate-pattern"]');
    await generateButton.click();
    
    // Verify loading state
    await expect(rhythmModal.locator('[data-testid="generating"]')).toBeVisible();
    
    // Verify new pattern loaded
    await expect(rhythmModal.locator('[data-testid="generating"]')).not.toBeVisible();
    
    // Close modal
    await rhythmModal.locator('[data-testid="close-rhythm"]').click();
    await expect(rhythmModal).not.toBeVisible();
  });

  test('should handle widget errors gracefully', async ({ page }) => {
    // Mock weather API error
    await page.route('**/api/v1/weather/current', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Weather service unavailable' }),
      });
    });
    
    // Reload page to trigger error
    await page.reload();
    await helpers.waitForAppReady();
    
    // Verify error state in weather widget
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    await expect(weatherWidget.locator('[data-testid="widget-error"]')).toBeVisible();
    await expect(weatherWidget.locator('[data-testid="widget-error"]')).toContainText('Unable to load weather');
    
    // Verify retry button
    const retryButton = weatherWidget.locator('[data-testid="retry-widget"]');
    await expect(retryButton).toBeVisible();
    
    // Mock successful response
    await page.route('**/api/v1/weather/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          temperature: 72,
          condition: 'Sunny',
          location: 'New York, NY',
        }),
      });
    });
    
    // Retry
    await retryButton.click();
    
    // Verify widget loads successfully
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toBeVisible();
  });

  test('should adapt layout for mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    const dashboardGrid = page.locator('[data-testid="dashboard-grid"]');
    const gridStyles = await dashboardGrid.getAttribute('class');
    
    // Should have mobile-specific grid classes
    expect(gridStyles).toContain('grid-cols-1');
    
    // Verify widgets stack vertically
    const widgets = await page.locator('[data-testid$="-widget"]').all();
    let previousY = 0;
    
    for (const widget of widgets) {
      const box = await widget.boundingBox();
      if (box) {
        expect(box.y).toBeGreaterThan(previousY);
        previousY = box.y + box.height;
      }
    }
    
    // Test swipe gestures for widget interaction
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    const box = await weatherWidget.boundingBox();
    
    if (box) {
      // Simulate swipe up for more info
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 10 });
      await page.mouse.up();
      
      // Verify expanded info
      await expect(page.locator('[data-testid="weather-details"]')).toBeVisible();
    }
  });

  test('should save widget preferences', async ({ page }) => {
    // Open widget settings
    const settingsButton = page.locator('[data-testid="dashboard-settings"]');
    await settingsButton.click();
    
    // Verify settings modal
    const settingsModal = page.locator('[data-testid="widget-settings"]');
    await expect(settingsModal).toBeVisible();
    
    // Toggle widget visibility
    const nasaToggle = settingsModal.locator('[data-testid="toggle-nasa-widget"]');
    await nasaToggle.click();
    
    // Save settings
    await settingsModal.locator('[data-testid="save-settings"]').click();
    
    // Verify modal closes
    await expect(settingsModal).not.toBeVisible();
    
    // Verify NASA widget is hidden
    await expect(page.locator('[data-testid="nasa-widget"]')).not.toBeVisible();
    
    // Reload page
    await page.reload();
    await helpers.waitForAppReady();
    
    // Verify preference persisted
    await expect(page.locator('[data-testid="nasa-widget"]')).not.toBeVisible();
  });

  test('should show performance metrics', async ({ page }) => {
    // Enable performance monitoring
    await page.evaluate(() => {
      window.localStorage.setItem('show-performance-metrics', 'true');
    });
    
    // Reload to apply setting
    await page.reload();
    await helpers.waitForAppReady();
    
    // Verify performance overlay
    const perfOverlay = page.locator('[data-testid="performance-overlay"]');
    await expect(perfOverlay).toBeVisible();
    
    // Check metrics
    await expect(perfOverlay.locator('[data-testid="fps-counter"]')).toBeVisible();
    await expect(perfOverlay.locator('[data-testid="render-time"]')).toBeVisible();
    await expect(perfOverlay.locator('[data-testid="memory-usage"]')).toBeVisible();
    
    // Verify FPS is reasonable
    const fpsText = await perfOverlay.locator('[data-testid="fps-counter"]').textContent();
    const fps = parseInt(fpsText?.match(/\d+/)?.[0] || '0');
    expect(fps).toBeGreaterThan(30);
  });

  test('should handle real-time updates', async ({ page }) => {
    // Set up SSE mock for real-time weather updates
    await page.route('**/api/v1/weather/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"temperature": 75, "condition": "Partly Cloudy"}\n\n',
      });
    });
    
    // Wait for initial render
    const weatherWidget = page.locator('[data-testid="weather-widget"]');
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toContainText('72°F');
    
    // Trigger real-time update check
    await page.evaluate(() => {
      window.dispatchEvent(new Event('check-updates'));
    });
    
    // Wait for update
    await expect(weatherWidget.locator('[data-testid="temperature"]')).toContainText('75°F');
    await expect(weatherWidget.locator('[data-testid="condition"]')).toContainText('Partly Cloudy');
    
    // Verify update indicator
    await expect(weatherWidget.locator('[data-testid="live-indicator"]')).toBeVisible();
    await expect(weatherWidget.locator('[data-testid="live-indicator"]')).toHaveClass(/pulse/);
  });
});

/**
 * Mock dashboard API responses
 */
async function mockDashboardAPIs(page: Page) {
  // Mock weather API
  await page.route('**/api/v1/weather/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        temperature: 72,
        temperatureCelsius: 22,
        condition: 'Sunny',
        humidity: 45,
        windSpeed: 10,
        location: 'New York, NY',
        icon: 'sunny',
      }),
    });
  });

  // Mock weather forecast
  await page.route('**/api/v1/weather/forecast', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
        explanation: 'A spectacular spiral galaxy...',
        url: 'https://apod.nasa.gov/apod/image/sample.jpg',
        date: new Date().toISOString().split('T')[0],
        media_type: 'image',
      }),
    });
  });

  // Mock geolocation
  await page.route('**/api/v1/location/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'NY',
        country: 'US',
      }),
    });
  });
}