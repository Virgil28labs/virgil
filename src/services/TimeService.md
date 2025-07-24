# TimeService Developer Guide

## Overview
TimeService is Virgil's single source of truth for all date/time operations. It ensures consistent timezone handling and prevents UTC-related bugs.

**Key Rule**: Never use `new Date()` directly in components. Always use TimeService methods.

## Quick Reference

### Import
```typescript
// Option 1: Through DashboardContextService (maintains backward compatibility)
import { dashboardContextService } from '../services/DashboardContextService';

// Option 2: Direct import (recommended for new code)
import { timeService } from '../services/TimeService';
```

### Common Use Cases

#### Get Current Date/Time
```typescript
// Using timeService directly (recommended)
const now = timeService.getCurrentDateTime();
const timestamp = timeService.getTimestamp();
const today = timeService.getLocalDate(); // "2024-01-20"

// Or through dashboardContextService (backward compatible)
const now = dashboardContextService.getCurrentDateTime();
const timestamp = dashboardContextService.getTimestamp();
const today = dashboardContextService.getLocalDate(); // "2024-01-20"
```

#### Format Dates
```typescript
// Format any date to YYYY-MM-DD (for filenames, keys, etc.)
const dateStr = dashboardContextService.formatDateToLocal(myDate);

// Format for display (January 20, 2024)
const displayDate = dashboardContextService.formatDate(myDate);
```

#### Subscribe to Time Updates
```typescript
// Subscribe to real-time updates (1-second precision)
const unsubscribe = dashboardContextService.subscribeToTimeUpdates(({ currentTime, currentDate, dateObject }) => {
  // currentTime: "14:30" (24-hour format)
  // currentDate: "January 20, 2024"
  // dateObject: Date object
});

// Don't forget to cleanup!
useEffect(() => {
  const unsubscribe = dashboardContextService.subscribeToTimeUpdates(callback);
  return unsubscribe;
}, []);
```

## Examples

### Creating Date-Based Keys
```typescript
// ❌ DON'T do this:
const key = `stats-${new Date().toISOString().split('T')[0]}`;

// ✅ DO this instead:
const key = `stats-${dashboardContextService.getLocalDate()}`;
```

### Formatting Timestamps for Display
```typescript
// ❌ DON'T do this:
const formatted = new Date(timestamp).toLocaleString();

// ✅ DO this instead:
const formatted = dashboardContextService.formatDate(new Date(timestamp));
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

When testing components that use TimeService:

```typescript
// Mock the service
jest.mock('../services/DashboardContextService', () => ({
  dashboardContextService: {
    getCurrentDateTime: () => new Date('2024-01-20T12:00:00'),
    getLocalDate: () => '2024-01-20',
    formatDateToLocal: (date) => '2024-01-20',
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