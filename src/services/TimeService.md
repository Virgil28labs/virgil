# TimeService Developer Guide

## Overview
TimeService is Virgil's single source of truth for all date/time operations. It ensures consistent timezone handling and prevents UTC-related bugs.

**Key Rule**: Never use `new Date()` directly in components. Always use TimeService methods.

## Performance Optimizations
- **Memoized Formatters**: All `Intl.DateTimeFormat` instances are created once and reused
- **Smart Caching**: Local date cached for 60 seconds to reduce repeated calculations
- **Pre-calculated Constants**: Common time durations (minute, hour, day) are static constants
- **Efficient Loops**: Uses `for...of` instead of `forEach` for better performance
- **Optimized Date Arithmetic**: Time-based calculations use milliseconds directly

## Quick Reference

### Import
```typescript
// Option 1: Through DashboardContextService (maintains backward compatibility)
import { dashboardContextService } from '../services/DashboardContextService';

// Option 2: Direct import (recommended for new code)
import { timeService } from '../services/TimeService';
```

### API Reference

### Basic Date/Time Methods
```typescript
// Get current values
const now = timeService.getCurrentDateTime();          // Current Date object
const timestamp = timeService.getTimestamp();          // Milliseconds since epoch
const today = timeService.getLocalDate();              // "2024-01-20" (YYYY-MM-DD)
const time = timeService.getCurrentTime();             // "14:30" (24-hour format)
const date = timeService.getCurrentDate();             // "January 20, 2024"
const day = timeService.getDayOfWeek();                // "monday"
const period = timeService.getTimeOfDay();             // "morning" | "afternoon" | "evening" | "night"

// Format dates
const dateStr = timeService.formatDateToLocal(date);   // "2024-01-20" (YYYY-MM-DD)
const display = timeService.formatDate(date);          // "January 20, 2024"
```

### Date Arithmetic
```typescript
// Add/subtract time periods
const tomorrow = timeService.addDays(today, 1);
const yesterday = timeService.subtractDays(today, 1);
const nextMonth = timeService.addMonths(today, 1);
const lastMonth = timeService.subtractMonths(today, 1);
const later = timeService.addHours(now, 2);
const earlier = timeService.subtractHours(now, 2);
```

### Date Manipulation
```typescript
// Get boundaries
const dayStart = timeService.startOfDay(date);         // 00:00:00.000
const dayEnd = timeService.endOfDay(date);             // 23:59:59.999
const weekStart = timeService.startOfWeek(date);       // Monday 00:00:00.000
const weekEnd = timeService.endOfWeek(date);           // Sunday 23:59:59.999
const monthStart = timeService.startOfMonth(date);     // 1st at 00:00:00.000
const monthEnd = timeService.endOfMonth(date);         // Last day at 23:59:59.999
```

### Date Comparison
```typescript
// Check relationships
const isToday = timeService.isToday(date);
const isSame = timeService.isSameDay(date1, date2);
const days = timeService.getDaysBetween(start, end);   // Number of days
const hours = timeService.getHoursDifference(start, end); // Number of hours
```

### Relative Time Formatting
```typescript
// Human-readable time differences
const ago = timeService.getTimeAgo(pastDate);          // "2 hours ago"
const relative = timeService.getRelativeTime(date);    // "in 3 days" or "2 hours ago"
```

### ISO String Helpers
```typescript
// ISO format conversions
const iso = timeService.toISOString(date);             // "2024-01-20T14:30:00.000Z"
const isoDate = timeService.toISODateString(date);     // "2024-01-20" (UTC)
```

### Form Input Helpers
```typescript
// Format for HTML inputs
const dateInput = timeService.formatForDateInput(date);     // "2024-01-20"
const dateTimeInput = timeService.formatForDateTimeInput(date); // "2024-01-20T14:30"
```

### Validation & Parsing
```typescript
// Safe date handling
const isValid = timeService.isValidDate(value);        // Type guard
const parsed = timeService.parseDate(dateString);      // Date | null
```

### Subscribe to Time Updates
```typescript
// Real-time updates (1-second precision)
const unsubscribe = timeService.subscribeToTimeUpdates(({ currentTime, currentDate, dateObject }) => {
  // currentTime: "14:30" (24-hour format)
  // currentDate: "January 20, 2024"
  // dateObject: Date object
});

// Don't forget to cleanup!
useEffect(() => {
  const unsubscribe = timeService.subscribeToTimeUpdates(callback);
  return unsubscribe;
}, []);
```

## Common Use Cases

## Migration Examples

### Cache Expiry Checks
```typescript
// ❌ OLD:
if (Date.now() - this.lastFetchTime > this.CACHE_DURATION)

// ✅ NEW:
if (timeService.getTimestamp() - this.lastFetchTime > this.CACHE_DURATION)
```

### Date Arithmetic
```typescript
// ❌ OLD:
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);

// ✅ NEW:
const weekAgo = timeService.subtractDays(timeService.getCurrentDateTime(), 7);
```

### Start of Day
```typescript
// ❌ OLD:
const today = new Date();
today.setHours(0, 0, 0, 0);

// ✅ NEW:
const today = timeService.startOfDay();
```

### Time Ago Formatting
```typescript
// ❌ OLD:
const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
if (seconds < 60) return 'just now';
// ... complex logic

// ✅ NEW:
const timeAgo = timeService.getTimeAgo(date);
```

### ISO Date Strings
```typescript
// ❌ OLD:
const dateStr = new Date().toISOString().split('T')[0];

// ✅ NEW:
const dateStr = timeService.toISODateString();
```

### Date Validation
```typescript
// ❌ OLD:
const date = new Date(dateString);
if (!isNaN(date.getTime())) { /* valid */ }

// ✅ NEW:
const date = timeService.parseDate(dateString);
if (date) { /* valid */ }
```

### Creating Date-Based Keys
```typescript
// ❌ DON'T do this:
const key = `stats-${new Date().toISOString().split('T')[0]}`;

// ✅ DO this instead:
const key = `stats-${timeService.getLocalDate()}`;
```

### Formatting Timestamps for Display
```typescript
// ❌ DON'T do this:
const formatted = new Date(timestamp).toLocaleString();

// ✅ DO this instead:
const formatted = timeService.formatDate(new Date(timestamp));
```

### Working with Timezones
The existing TimezoneWidget already handles timezone display using Luxon. TimeService methods always work with local timezone, which integrates seamlessly with the timezone features.

## Integration with Dashboard Apps

When creating new dashboard apps, register them with DashboardAppService and use TimeService for any date/time needs:

```typescript
// In your adapter
import { dashboardContextService } from '../services/DashboardContextService';

export class MyAppAdapter implements AppDataAdapter {
  getContextData() {
    const today = dashboardContextService.getLocalDate();
    return {
      lastUpdated: dashboardContextService.getTimestamp(),
      currentDate: today,
      // ... other data
    };
  }
}
```

## Testing

### New Recommended Pattern (Phase 1 Migration)

Use the comprehensive TimeService mock factory for consistent, controllable time in tests:

```typescript
import { setupTimeTest } from '../test-utils/timeTestUtils';

// Mock TimeService
jest.mock('../services/TimeService');

// Create time test context
const timeContext = setupTimeTest('2024-01-20T12:00:00');

describe('MyComponent', () => {
  beforeAll(() => {
    // Apply mock to the imported timeService
    const { timeService } = require('../services/TimeService');
    Object.assign(timeService, timeContext.timeService);
  });

  afterEach(() => {
    timeContext.cleanup();
  });

  it('handles time-based operations', () => {
    // Advance time by 1 hour
    timeContext.advanceTime(60 * 60 * 1000);
    
    // Set specific time
    timeContext.setTime('2024-01-21T08:00:00');
    
    // Freeze time for consistent tests
    timeContext.freezeTime();
    
    // Assert time-based expectations
    timeContext.expectTimeAgo(oldDate, '2 hours ago');
  });
});
```

### Time Travel Utilities

```typescript
import { setupTimeTest, TimeTravel } from '../test-utils/timeTestUtils';

const timeContext = setupTimeTest();
const timeTravel = new TimeTravel(timeContext.timeService);

// Jump forward/backward
timeTravel.forward.hours(2);
timeTravel.backward.days(7);

// Jump to specific times
timeTravel.to.morning();    // 8:00 AM
timeTravel.to.evening();    // 7:00 PM
timeTravel.to.startOfMonth();
```

### Legacy Pattern (For Quick Fixes)

```typescript
// Mock the service
jest.mock('../services/TimeService', () => ({
  timeService: {
    getCurrentDateTime: () => new Date('2024-01-20T12:00:00'),
    getLocalDate: () => '2024-01-20',
    formatDateToLocal: (date) => '2024-01-20',
    getTimestamp: () => 1705752000000,
    // ... other methods
  }
}));
```

## Common Pitfalls

1. **UTC vs Local**: TimeService always returns local times. Don't convert to UTC unless explicitly needed for API calls.

2. **Direct Date Usage**: ESLint will warn about `new Date()` usage. Use TimeService methods instead.

3. **Timezone Assumptions**: Don't assume user's timezone. TimeService handles local time correctly.

## Questions?

Check the implementation in:
- `TimeService.ts` - The standalone time service
- `DashboardContextService.ts` lines 192-241 - Backward-compatible wrapper methods