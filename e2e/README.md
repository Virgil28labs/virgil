# Virgil E2E Tests

Comprehensive end-to-end testing suite with multi-browser support powered by Playwright.

## Features

- 🌐 **Multi-Browser Testing**: Chrome, Firefox, Safari, and mobile browsers
- 📸 **Visual Regression Testing**: Automated screenshot comparison
- ⚡ **Performance Testing**: Core Web Vitals and custom metrics
- ♿ **Accessibility Testing**: WCAG compliance and screen reader support
- 📱 **Responsive Testing**: Multiple viewport sizes
- 🎨 **Theme Testing**: Light/dark mode variations
- 🔄 **Cross-Tab Sync Testing**: LocalStorage synchronization
- 📊 **Detailed Reporting**: HTML, JUnit, and JSON reports

## Setup

1. Install dependencies:
```bash
cd e2e
npm install
```

2. Install browsers:
```bash
npm run install-browsers
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Browser
```bash
npm run test:chrome
npm run test:firefox
npm run test:safari
```

### Mobile Tests
```bash
npm run test:mobile
```

### Performance Tests
```bash
npm run test:performance
```

### Accessibility Tests
```bash
npm run test:accessibility
```

### Visual Regression Tests
```bash
npm run test:visual
```

### Debug Mode
```bash
npm run test:debug
```

### UI Mode (Interactive)
```bash
npm run test:ui
```

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from './utils/test-helpers';

test('should do something', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Virgil');
});
```

### Using Test Helpers
```typescript
import { TestHelpers } from './utils/test-helpers';

test('with helpers', async ({ page }) => {
  // Mock API
  await TestHelpers.mockAPI(page, 'weather', { temp: 72 });
  
  // Wait for app
  await TestHelpers.waitForAppLoad(page);
  
  // Take screenshot
  await TestHelpers.screenshot(page, 'home-page');
});
```

### Visual Regression
```typescript
import { VisualRegression } from './utils/visual-regression';

test('visual test', async ({ page }) => {
  await page.goto('/');
  
  // Compare full page
  await VisualRegression.comparePageSnapshot(page, 'home');
  
  // Compare element
  await VisualRegression.compareElementSnapshot(
    page,
    '[data-testid="header"]',
    'header'
  );
  
  // Test responsive
  await VisualRegression.testResponsiveDesign(page, 'home', [
    VisualRegression.VIEWPORTS.mobile,
    VisualRegression.VIEWPORTS.desktop,
  ]);
});
```

### Performance Testing
```typescript
import { PerformanceTest } from './utils/performance';

test('performance', async ({ page }) => {
  const budget = {
    lcp: 2500, // 2.5s
    fcp: 1800, // 1.8s
    cls: 0.1,
  };
  
  const { metrics, violations } = await PerformanceTest.runTest(
    page,
    '/',
    budget
  );
  
  expect(violations).toHaveLength(0);
});
```

### Accessibility Testing
```typescript
import { AccessibilityTest } from './utils/accessibility';

test('accessibility', async ({ page }) => {
  await page.goto('/');
  
  const violations = await AccessibilityTest.scan(page);
  expect(violations).toHaveLength(0);
});
```

## Configuration

See `playwright.config.ts` for all configuration options.

### Environment Variables
- `PLAYWRIGHT_BASE_URL`: Base URL for tests (default: http://localhost:3000)
- `CI`: Set to true for CI-specific behavior

## Reports

After running tests, view reports:
```bash
npm run test:report
```

Reports are saved to:
- HTML: `test-results/html/`
- JUnit: `test-results/junit.xml`
- JSON: `test-results/results.json`
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`

## Updating Visual Baselines

When intentional visual changes are made:
```bash
npm run update-snapshots
```

## Tips

1. **Use data-testid**: Add `data-testid` attributes to elements for reliable selection
2. **Mock External APIs**: Use `TestHelpers.mockAPI()` for consistent tests
3. **Wait for Stability**: Use `waitForLoadState('networkidle')` before screenshots
4. **Browser-Specific Tests**: Use `test.skip()` for browser-specific features
5. **Parallel Execution**: Tests run in parallel by default for speed

## Troubleshooting

### Tests Failing on CI
- Check if browsers are installed: `npm run install-browsers`
- Verify environment variables are set
- Check for timing issues - add explicit waits if needed

### Visual Tests Failing
- Review diff images in `test-results/`
- Update baselines if changes are intentional
- Check for animation or dynamic content issues

### Performance Tests Failing
- Run on consistent hardware
- Close other applications
- Use performance budgets appropriate for test environment