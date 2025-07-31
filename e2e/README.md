# Virgil E2E Test Suite

Comprehensive end-to-end testing for critical user flows using Playwright.

## Test Coverage

### 🔐 Authentication Flow (`auth.spec.ts`)
- Login/logout workflows
- Registration process
- Session management
- Error handling and validation
- Accessibility and keyboard navigation

### 💬 Chat Functionality (`chat.spec.ts`)
- Message sending and receiving
- Streaming responses
- Multi-intent queries
- Error recovery and retry logic
- Accessibility and screen reader support

### 📊 Dashboard Functionality (`dashboard.spec.ts`)
- App card interactions
- Real-time data updates
- Search and filtering
- Responsive design
- Performance with large datasets

### 🔄 Integration Workflows (`integration.spec.ts`)
- Complete user journeys
- Cross-feature data integration
- Offline/online state handling
- Data persistence and sync
- System resilience testing

## Quick Start

```bash
# Install dependencies
npm install

# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run in headed mode to see browser
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# View test reports
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── auth.spec.ts           # Authentication workflows
├── chat.spec.ts           # Chat functionality
├── dashboard.spec.ts      # Dashboard interactions
├── integration.spec.ts    # Full user journeys
├── fixtures/
│   └── test-data.ts       # Test data and constants
├── utils/
│   └── test-helpers.ts    # Common utilities
└── setup/
    ├── global-setup.ts    # Pre-test setup
    └── global-teardown.ts # Post-test cleanup
```

## Test Data

All test data is centralized in `fixtures/test-data.ts`:

- **TestUsers**: Valid/invalid user credentials
- **TestMessages**: Chat message variations
- **ApiResponses**: Mock API response data
- **Selectors**: UI element selectors
- **URLs**: Application routes

## Test Helpers

Common utilities in `utils/test-helpers.ts`:

- **waitForAppReady()**: Wait for React app initialization
- **clearStorageData()**: Clean storage between tests
- **mockApiResponse()**: Mock API endpoints
- **checkAccessibility()**: Basic accessibility validation
- **testKeyboardNavigation()**: Keyboard interaction testing

## Configuration

See `playwright.config.ts` for:

- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot/video capture on failure
- Network conditions and timeouts

## CI Integration

Tests are configured for CI with:

- Parallel execution
- Retry on failure
- Multiple output formats (HTML, JSON, JUnit)
- Performance monitoring

## Best Practices

1. **Use data-testid attributes** for stable element selection
2. **Mock external APIs** to ensure test reliability  
3. **Test real user workflows** rather than implementation details
4. **Include accessibility testing** in all user interface tests
5. **Handle async operations** with proper waiting strategies
6. **Clean up state** between tests to avoid interference

## Debugging

For debugging failed tests:

```bash
# Run specific test file
npx playwright test auth.spec.ts

# Run specific test case
npx playwright test -g "should login successfully"

# Debug with browser developer tools
npx playwright test --debug

# Generate and view trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Maintenance

- Update selectors when UI changes
- Refresh test data when API contracts change
- Review and update accessibility checks
- Monitor test execution times and optimize slow tests