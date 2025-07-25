# TimeService Migration - Phase 2: Cross-Tab Synchronization

## Overview

Phase 2 introduces cross-tab synchronization capabilities to ensure consistent time across all browser tabs in the application.

## New Features

### 1. BroadcastChannel Integration
- Automatic cross-tab communication
- Leader election for resource efficiency
- Real-time synchronization

### 2. Drift Detection
- Monotonic clock comparison
- Automatic drift correction
- 100ms threshold for detection

### 3. Tab Management
- Active tab tracking
- Stale tab cleanup
- Leadership transfer

## Migration Steps

### Step 1: Import Enhanced Service

Replace current TimeService imports:

```typescript
// Before
import { timeService } from './services/TimeService';

// After
import { timeServiceEnhanced as timeService } from './services/TimeServiceEnhanced';
```

### Step 2: Update Service References

The enhanced service is backwards compatible, so no code changes are required for existing functionality.

### Optional: Access New Features

```typescript
// Get active tabs
const activeTabs = timeService.getActiveTabs();
console.log(`${activeTabs.length} tabs active`);

// Get monotonic timestamp (unaffected by system time changes)
const monotonicTime = timeService.getMonotonicTimestamp();

// Disable synchronization for specific use cases
timeService.setSyncEnabled(false);
```

## Benefits

1. **Consistency**: All tabs show the same time
2. **Efficiency**: Only one timer runs across all tabs
3. **Reliability**: Automatic drift detection and correction
4. **Performance**: Reduced CPU usage with leader election

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (14+)
- Fallback: Single-tab mode for unsupported browsers

## Testing

Run the new test suite:
```bash
npm test TimeServiceEnhanced.test.ts
```

## Rollback Plan

If issues arise, revert to standard TimeService:
```typescript
import { timeService } from './services/TimeService';
```

## Next Steps

- Phase 3: Timezone consistency with Luxon
- Phase 4: Performance optimization
- Phase 5: Server synchronization