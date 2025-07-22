/**
 * Date and time utilities for the Notes application
 * Provides consistent date formatting and relative time calculations
 */

/**
 * Formats a timestamp into a relative time string
 * @param timestamp The timestamp to format
 * @returns Formatted string like "just now", "5 mins ago", "2 days ago"
 */
export function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const entryDate = new Date(timestamp);
  const diffMs = now.getTime() - entryDate.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return entryDate.toLocaleDateString();
}

/**
 * Checks if two dates are on the same day
 * @param date1 First date
 * @param date2 Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Gets the start of day for a given date
 * @param date The date to get start of day for
 * @returns Date object set to 00:00:00
 */
export function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Gets the end of day for a given date
 * @param date The date to get end of day for
 * @returns Date object set to 23:59:59.999
 */
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Formats a date for display in the UI
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Parses an ISO date string and returns a Date object
 * @param isoString ISO date string
 * @returns Date object
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Converts a Date to ISO string for storage
 * @param date Date object
 * @returns ISO date string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}