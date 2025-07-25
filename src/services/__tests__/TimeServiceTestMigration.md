# TimeService Test Migration Guide

This guide documents patterns and best practices for migrating test files to use the new TimeService mock infrastructure.

## Migration Checklist

### 1. Add Required Mocks

```typescript
// Mock any modules that use TimeService (e.g., logger)
jest.mock('../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock TimeService with the actual mock implementation
jest.mock('../services/TimeService', () => {
  const actualMock = jest.requireActual('../services/__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../services/TimeService';
const mockTimeService = timeService as any;
```

### 2. Update Test Setup

```typescript
describe('YourComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
  });

  afterEach(() => {
    mockTimeService.destroy();
  });
});
```

### 3. Common Migration Patterns

#### Pattern 1: Simple Time Usage
**Before:**
```typescript
const timestamp = Date.now();
const today = new Date().toISOString().split('T')[0];
```

**After:**
```typescript
const timestamp = mockTimeService.getTimestamp();
const today = mockTimeService.getLocalDate();
```

#### Pattern 2: Time Advancement
**Before:**
```typescript
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
```

**After:**
```typescript
mockTimeService.advanceTime(1000);
```

#### Pattern 3: Specific Date Testing
**Before:**
```typescript
jest.spyOn(Date, 'now').mockReturnValue(1705780800000);
```

**After:**
```typescript
mockTimeService.setMockDate('2024-01-20T12:00:00');
```

#### Pattern 4: Async Operations with Timers
For components that use setTimeout/setInterval (like LocationContext with its 500ms delay):

```typescript
// Option 1: Mock the service to return immediately
mockLocationService.getQuickLocation.mockResolvedValue(data);

// Option 2: If you need to test timer behavior
jest.useFakeTimers();
act(() => {
  jest.advanceTimersByTime(500);
});
jest.useRealTimers();
```

### 4. Common Pitfalls and Solutions

#### Pitfall 1: Logger Errors
**Problem:** Logger uses timeService.toISOString() and isn't mocked
**Solution:** Always mock the logger module

#### Pitfall 2: Missing Mock Methods
**Problem:** Component uses TimeService method not in mock
**Solution:** The mock factory includes all TimeService methods

#### Pitfall 3: Async Timing Issues
**Problem:** Tests timeout waiting for time-based operations
**Solution:** 
- Increase test timeout: `}, 15000);`
- Simplify tests to avoid complex timer interactions
- Mock services to return data immediately

#### Pitfall 4: Multiple Time References
**Problem:** Test has multiple Date.now() or new Date() calls
**Solution:** Replace all with appropriate mockTimeService methods

### 5. Testing Time-Dependent Features

#### Cache Expiry
```typescript
it('respects cache expiry', async () => {
  // Initial fetch
  const result1 = await fetchData();
  
  // Advance time past cache duration
  mockTimeService.advanceTime(CACHE_DURATION + 1);
  
  // Should fetch again
  const result2 = await fetchData();
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

#### Rate Limiting
```typescript
it('enforces rate limits', () => {
  // Make requests up to limit
  for (let i = 0; i < RATE_LIMIT; i++) {
    expect(canMakeRequest()).toBe(true);
  }
  
  // Next request should fail
  expect(canMakeRequest()).toBe(false);
  
  // Advance time past window
  mockTimeService.advanceTime(RATE_WINDOW + 1);
  
  // Should allow requests again
  expect(canMakeRequest()).toBe(true);
});
```

#### Time-Based UI Updates
```typescript
it('updates UI based on time', () => {
  const { result } = renderHook(() => useTimeDisplay());
  
  expect(result.current.timeOfDay).toBe('afternoon');
  
  // Advance to evening
  mockTimeService.setMockDate('2024-01-20T19:00:00');
  
  expect(result.current.timeOfDay).toBe('evening');
});
```

## Migration Priority

1. **High Priority:**
   - Tests that directly use Date.now() or new Date()
   - Tests that use jest.spyOn(Date, ...)
   - Tests with time-based assertions

2. **Medium Priority:**
   - Tests that mock other services using TimeService
   - Tests with setTimeout/setInterval

3. **Low Priority:**
   - Tests that don't use dates/times
   - Simple unit tests without time dependencies

## Verification

After migration, ensure:
1. All tests pass
2. No console errors about missing TimeService methods
3. Time-based assertions are deterministic
4. Tests run faster (no real timers)