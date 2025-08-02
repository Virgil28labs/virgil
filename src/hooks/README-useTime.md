# useTime Hooks - React Time Utilities

A collection of React hooks that provide easy access to TimeService functionality with automatic updates and proper cleanup.

## Available Hooks

### useCurrentTime(updateInterval?)
Returns the current time with live updates.

```tsx
import { useCurrentTime } from '@/hooks';

function Clock() {
  const { currentTime, currentDate, dateObject } = useCurrentTime();
  
  return (
    <div>
      <p>Time: {currentTime}</p>
      <p>Date: {currentDate}</p>
    </div>
  );
}
```

### useTimeAgo(date, updateInterval?)
Shows relative time that automatically updates (e.g., "2 hours ago").

```tsx
import { useTimeAgo } from '@/hooks';

function Comment({ createdAt }) {
  const timeAgo = useTimeAgo(createdAt);
  
  return <span>Posted {timeAgo}</span>;
}
```

### useRelativeTime(date, updateInterval?)
Shows relative time for past or future dates (e.g., "in 2 hours", "3 days ago").

```tsx
import { useRelativeTime } from '@/hooks';

function EventTimer({ eventDate }) {
  const relativeTime = useRelativeTime(eventDate);
  
  return <span>Event {relativeTime}</span>;
}
```

### useDateFormatter()
Provides memoized formatting functions.

```tsx
import { useDateFormatter } from '@/hooks';

function DateDisplay({ date }) {
  const { formatDate, formatDateToLocal, toISOString } = useDateFormatter();
  
  return (
    <div>
      <p>Display: {formatDate(date)}</p>
      <p>Local: {formatDateToLocal(date)}</p>
      <p>ISO: {toISOString(date)}</p>
    </div>
  );
}
```

### useDateMath()
Provides date arithmetic operations.

```tsx
import { useDateMath } from '@/hooks';

function DateCalculator() {
  const { addDays, subtractMonths, getDaysBetween } = useDateMath();
  const today = new Date();
  
  const nextWeek = addDays(today, 7);
  const lastMonth = subtractMonths(today, 1);
  const daysUntilNextWeek = getDaysBetween(today, nextWeek);
  
  return (
    <div>
      <p>Next week: {nextWeek.toDateString()}</p>
      <p>Last month: {lastMonth.toDateString()}</p>
      <p>Days until next week: {daysUntilNextWeek}</p>
    </div>
  );
}
```

### useDateBoundaries()
Provides functions for getting date boundaries.

```tsx
import { useDateBoundaries } from '@/hooks';

function DateRangePicker() {
  const { startOfDay, endOfDay, startOfMonth, endOfMonth } = useDateBoundaries();
  
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  
  return (
    <div>
      <p>Today: {todayStart.toISOString()} - {todayEnd.toISOString()}</p>
      <p>This month: {monthStart.toISOString()} - {monthEnd.toISOString()}</p>
    </div>
  );
}
```

### useDateValidation()
Provides date validation utilities.

```tsx
import { useDateValidation } from '@/hooks';

function DateInput({ value, onChange }) {
  const { isValidDate, parseDate, isToday } = useDateValidation();
  
  const handleChange = (e) => {
    const parsed = parseDate(e.target.value);
    if (parsed && isValidDate(parsed)) {
      onChange(parsed);
    }
  };
  
  return (
    <input
      type="date"
      value={value}
      onChange={handleChange}
      className={isToday(value) ? 'today' : ''}
    />
  );
}
```

### useTimeHelpers()
Provides common time values and utilities.

```tsx
import { useTimeHelpers } from '@/hooks';

function DashboardGreeting() {
  const { localDate, timeOfDay, dayOfWeek } = useTimeHelpers();
  
  const greeting = timeOfDay === 'morning' ? 'Good morning' :
                  timeOfDay === 'afternoon' ? 'Good afternoon' :
                  timeOfDay === 'evening' ? 'Good evening' : 'Good night';
  
  return (
    <div>
      <h1>{greeting}!</h1>
      <p>Today is {dayOfWeek}, {localDate}</p>
    </div>
  );
}
```

## Benefits

1. **Automatic Updates**: Hooks automatically update when time changes
2. **Proper Cleanup**: All intervals and subscriptions are cleaned up on unmount
3. **Memoized Functions**: Formatting functions are memoized to prevent unnecessary re-renders
4. **Type Safety**: Full TypeScript support with proper types
5. **Consistent with TimeService**: All operations use TimeService internally

## Performance Considerations

- `useCurrentTime` updates every second by default - consider using a longer interval if you don't need second precision
- `useTimeAgo` and `useRelativeTime` update every minute by default - this is usually sufficient
- All formatting functions from `useDateFormatter` are memoized
- `useTimeHelpers` updates every minute for values that change over time

## Migration Guide

Replace direct TimeService usage in components:

```tsx
// Before
import { timeService } from '@/services/TimeService';

function Component() {
  const [time, setTime] = useState(timeService.getCurrentTime());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(timeService.getCurrentTime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <span>{time}</span>;
}

// After
import { useCurrentTime } from '@/hooks';

function Component() {
  const { currentTime } = useCurrentTime();
  return <span>{currentTime}</span>;
}
```