/**
 * TimeService - Single Source of Truth for Time/Date Operations
 * 
 * Provides consistent time and date handling across the application.
 * All methods work with local timezone to prevent UTC-related bugs.
 * 
 * @see src/services/TimeService.md for developer guide
 */

export interface TimeUpdate {
  currentTime: string;
  currentDate: string;
  dateObject: Date;
}

export class TimeService {
  private timeListeners: ((time: TimeUpdate) => void)[] = [];
  private mainTimer?: NodeJS.Timeout;
  
  // Memoized formatters for performance
  private readonly timeFormatter: Intl.DateTimeFormat;
  private readonly dateFormatter: Intl.DateTimeFormat;
  private readonly dayFormatter: Intl.DateTimeFormat;
  
  // Cache for frequently called methods (cleared every minute)
  private localDateCache: { date: string; timestamp: number } | null = null;
  
  // Performance optimization: Pre-calculate constants
  private static readonly MINUTE_MS = 60 * 1000;
  private static readonly HOUR_MS = 60 * 60 * 1000;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  
  constructor() {
    // Initialize memoized formatters
    this.timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    this.dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    
    this.dayFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    });
    
    this.startTimer();
  }
  
  /**
   * Get current date in local YYYY-MM-DD format
   * @returns Local date string (e.g., "2024-01-15")
   */
  getLocalDate(): string {
    const now = Date.now();
    
    // Check cache (valid for 60 seconds)
    if (this.localDateCache && (now - this.localDateCache.timestamp) < TimeService.MINUTE_MS) {
      return this.localDateCache.date;
    }
    
    // Generate new date and cache it
    const date = this.formatDateToLocal(new Date(now));
    this.localDateCache = { date, timestamp: now };
    return date;
  }
  
  /**
   * Format any date to local YYYY-MM-DD format, or with custom options
   * @param date Date object to format
   * @param options Optional Intl.DateTimeFormat options for custom formatting
   * @returns Local date string (e.g., "2024-01-15" or "Jan 15, 2024")
   */
  formatDateToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (options) {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
    // Default YYYY-MM-DD format for backward compatibility
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current Date object (local timezone)
   * @returns Current local Date object
   */
  getCurrentDateTime(): Date {
    return new Date(); // Always return current time, not cached
  }

  /**
   * Get current timestamp
   * @returns Current timestamp in milliseconds
   */
  getTimestamp(): number {
    return Date.now(); // Always return current timestamp, not cached
  }

  /**
   * Format a date for display purposes
   * @param date Date to format (optional, defaults to current date)
   * @returns Formatted date string
   */
  formatDate(date?: Date): string {
    return this.dateFormatter.format(date || new Date());
  }

  /**
   * Get current time in HH:MM format
   * @returns Time string (e.g., "14:30")
   */
  getCurrentTime(): string {
    return this.timeFormatter.format(new Date());
  }

  /**
   * Get current date for display
   * @returns Date string (e.g., "January 20, 2024")
   */
  getCurrentDate(): string {
    return this.dateFormatter.format(new Date());
  }

  /**
   * Get current day of week
   * @returns Day string (e.g., "monday")
   */
  getDayOfWeek(): string {
    return this.dayFormatter.format(new Date()).toLowerCase();
  }

  /**
   * Get time of day category
   * @returns Time period
   */
  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Subscribe to real-time time updates (1-second precision)
   * @param callback Function called with time updates
   * @returns Unsubscribe function
   */
  subscribeToTimeUpdates(callback: (time: TimeUpdate) => void): () => void {
    this.timeListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.timeListeners = this.timeListeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Start the internal timer for time updates
   */
  private startTimer(): void {
    // Only run timer if there are listeners
    if (!this.mainTimer) {
      this.mainTimer = setInterval(() => {
        if (this.timeListeners.length > 0) {
          const now = new Date();
          const timeUpdate: TimeUpdate = {
            currentTime: this.timeFormatter.format(now),
            currentDate: this.dateFormatter.format(now),
            dateObject: now,
          };
          
          // Use for...of for better performance
          for (const callback of this.timeListeners) {
            try {
              callback(timeUpdate);
            } catch (_error) {
              // Silent fail for callback errors to prevent cascade failures
            }
          }
        }
      }, 1000);
    }
  }

  // ==========================================
  // DATE COMPONENT EXTRACTION METHODS
  // ==========================================

  /**
   * Get the year from a date
   * @param date Date to extract year from (optional, defaults to now)
   * @returns Full year (e.g., 2024)
   */
  getYear(date?: Date): number {
    return (date || new Date()).getFullYear();
  }

  /**
   * Get the month from a date (1-12, not 0-11 like native JS)
   * @param date Date to extract month from (optional, defaults to now)
   * @returns Month number 1-12
   */
  getMonth(date?: Date): number {
    return (date || new Date()).getMonth() + 1;
  }

  /**
   * Get the day of month from a date
   * @param date Date to extract day from (optional, defaults to now)
   * @returns Day of month 1-31
   */
  getDay(date?: Date): number {
    return (date || new Date()).getDate();
  }

  /**
   * Get the hours from a date
   * @param date Date to extract hours from (optional, defaults to now)
   * @returns Hours 0-23
   */
  getHours(date?: Date): number {
    return (date || new Date()).getHours();
  }

  /**
   * Get the minutes from a date
   * @param date Date to extract minutes from (optional, defaults to now)
   * @returns Minutes 0-59
   */
  getMinutes(date?: Date): number {
    return (date || new Date()).getMinutes();
  }

  /**
   * Get the seconds from a date
   * @param date Date to extract seconds from (optional, defaults to now)
   * @returns Seconds 0-59
   */
  getSeconds(date?: Date): number {
    return (date || new Date()).getSeconds();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = undefined;
    }
    this.timeListeners = [];
    this.localDateCache = null;
  }

  // ==========================================
  // DATE ARITHMETIC METHODS
  // ==========================================

  /**
   * Add days to a date
   * @param date Source date
   * @param days Number of days to add
   * @returns New Date object
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Subtract days from a date
   * @param date Source date
   * @param days Number of days to subtract
   * @returns New Date object
   */
  subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  /**
   * Add months to a date
   * @param date Source date
   * @param months Number of months to add
   * @returns New Date object
   */
  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Subtract months from a date
   * @param date Source date
   * @param months Number of months to subtract
   * @returns New Date object
   */
  subtractMonths(date: Date, months: number): Date {
    return this.addMonths(date, -months);
  }

  /**
   * Add years to a date
   * @param date Source date
   * @param years Number of years to add
   * @returns New Date object
   */
  addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Subtract years from a date
   * @param date Source date
   * @param years Number of years to subtract
   * @returns New Date object
   */
  subtractYears(date: Date, years: number): Date {
    return this.addYears(date, -years);
  }

  /**
   * Add hours to a date
   * @param date Source date
   * @param hours Number of hours to add
   * @returns New Date object
   */
  addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * TimeService.HOUR_MS);
  }

  /**
   * Subtract hours from a date
   * @param date Source date
   * @param hours Number of hours to subtract
   * @returns New Date object
   */
  subtractHours(date: Date, hours: number): Date {
    return this.addHours(date, -hours);
  }

  /**
   * Add minutes to a date
   * @param date Source date
   * @param minutes Number of minutes to add
   * @returns New Date object
   */
  addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * TimeService.MINUTE_MS);
  }

  /**
   * Subtract minutes from a date
   * @param date Source date
   * @param minutes Number of minutes to subtract
   * @returns New Date object
   */
  subtractMinutes(date: Date, minutes: number): Date {
    return this.addMinutes(date, -minutes);
  }

  // ==========================================
  // ISO STRING HELPERS
  // ==========================================

  /**
   * Convert date to ISO string (UTC)
   * @param date Date to convert (optional, defaults to now)
   * @returns ISO string (e.g., "2024-01-15T14:30:00.000Z")
   */
  toISOString(date?: Date): string {
    return (date || new Date()).toISOString();
  }

  /**
   * Get ISO date string (YYYY-MM-DD) in LOCAL timezone
   * @param date Date to convert (optional, defaults to now)
   * @returns ISO date string in local timezone (e.g., "2024-01-15")
   */
  toISODateString(date?: Date): string {
    // Use formatDateToLocal to get local date instead of UTC
    return this.formatDateToLocal(date || new Date());
  }

  // ==========================================
  // DATE MANIPULATION METHODS
  // ==========================================

  /**
   * Get start of day (00:00:00.000)
   * @param date Source date (optional, defaults to today)
   * @returns New Date at start of day
   */
  startOfDay(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day (23:59:59.999)
   * @param date Source date (optional, defaults to today)
   * @returns New Date at end of day
   */
  endOfDay(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Get start of week (Monday at 00:00:00.000)
   * @param date Source date (optional, defaults to this week)
   * @returns New Date at start of week
   */
  startOfWeek(date?: Date): Date {
    const result = new Date(date || new Date());
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of week (Sunday at 23:59:59.999)
   * @param date Source date (optional, defaults to this week)
   * @returns New Date at end of week
   */
  endOfWeek(date?: Date): Date {
    const result = this.startOfWeek(date);
    result.setDate(result.getDate() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Get start of month (1st at 00:00:00.000)
   * @param date Source date (optional, defaults to this month)
   * @returns New Date at start of month
   */
  startOfMonth(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of month (last day at 23:59:59.999)
   * @param date Source date (optional, defaults to this month)
   * @returns New Date at end of month
   */
  endOfMonth(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setMonth(result.getMonth() + 1, 0); // 0th day of next month = last day of current
    result.setHours(23, 59, 59, 999);
    return result;
  }

  // ==========================================
  // COMPARISON METHODS
  // ==========================================

  /**
   * Check if date is today
   * @param date Date to check
   * @returns True if date is today
   */
  isToday(date: Date): boolean {
    return this.formatDateToLocal(date) === this.getLocalDate();
  }

  /**
   * Check if two dates are on the same day
   * @param date1 First date
   * @param date2 Second date
   * @returns True if dates are on same day
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return this.formatDateToLocal(date1) === this.formatDateToLocal(date2);
  }

  /**
   * Get number of days between two dates
   * @param date1 First date
   * @param date2 Second date
   * @returns Number of days (positive if date2 is after date1)
   */
  getDaysBetween(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / TimeService.DAY_MS);
  }

  /**
   * Get number of hours between two dates
   * @param date1 First date
   * @param date2 Second date
   * @returns Number of hours (positive if date2 is after date1)
   */
  getHoursDifference(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / TimeService.HOUR_MS);
  }

  // ==========================================
  // RELATIVE TIME FORMATTING
  // ==========================================

  /**
   * Get human-readable time ago string
   * @param date Date to compare to now
   * @returns String like "2 hours ago", "3 days ago", etc.
   */
  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week ago';
    if (weeks < 4) return `${weeks} weeks ago`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    
    const years = Math.floor(days / 365);
    if (years === 1) return '1 year ago';
    return `${years} years ago`;
  }

  /**
   * Get relative time string (can be past or future)
   * @param date Date to compare to now
   * @returns String like "in 2 hours", "3 days ago", etc.
   */
  getRelativeTime(date: Date): string {
    const ms = date.getTime() - Date.now();
    const seconds = Math.floor(Math.abs(ms) / 1000);
    const isPast = ms < 0;
    
    if (seconds < 60) return isPast ? 'just now' : 'in a moment';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return isPast ? '1 minute ago' : 'in 1 minute';
    if (minutes < 60) return isPast ? `${minutes} minutes ago` : `in ${minutes} minutes`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return isPast ? '1 hour ago' : 'in 1 hour';
    if (hours < 24) return isPast ? `${hours} hours ago` : `in ${hours} hours`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return isPast ? '1 day ago' : 'in 1 day';
    if (days < 7) return isPast ? `${days} days ago` : `in ${days} days`;
    
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return isPast ? '1 week ago' : 'in 1 week';
    if (weeks < 4) return isPast ? `${weeks} weeks ago` : `in ${weeks} weeks`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return isPast ? '1 month ago' : 'in 1 month';
    if (months < 12) return isPast ? `${months} months ago` : `in ${months} months`;
    
    const years = Math.floor(days / 365);
    if (years === 1) return isPast ? '1 year ago' : 'in 1 year';
    return isPast ? `${years} years ago` : `in ${years} years`;
  }

  // ==========================================
  // VALIDATION HELPERS
  // ==========================================

  /**
   * Check if a value is a valid date
   * @param date Value to check
   * @returns True if valid date
   */
  isValidDate(date: unknown): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Parse a date string safely
   * @param dateString String to parse
   * @returns Date object or null if invalid
   */
  parseDate(dateString: string): Date | null {
    const date = new Date(dateString);
    return this.isValidDate(date) ? date : null;
  }

  /**
   * Format date for HTML datetime-local input
   * @param date Date to format (optional, defaults to now)
   * @returns String in format "YYYY-MM-DDTHH:mm"
   */
  formatForDateTimeInput(date?: Date): string {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Format date for HTML date input
   * @param date Date to format (optional, defaults to now)
   * @returns String in format "YYYY-MM-DD"
   */
  formatForDateInput(date?: Date): string {
    return this.formatDateToLocal(date || new Date());
  }

  /**
   * Create a Date object from a timestamp
   * @param timestamp Timestamp in milliseconds
   * @returns Date object
   */
  fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * Create a Date object from year, month, and day
   * @param year Full year (e.g., 2024)
   * @param month Month (0-indexed, so January = 0)
   * @param day Day of month (1-31)
   * @returns Date object
   */
  createDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day);
  }

  /**
   * Format date and time with locale support
   * @param date Date to format
   * @param options Intl.DateTimeFormatOptions
   * @returns Formatted date and time string
   */
  formatDateTimeToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options,
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  }

  /**
   * Format time with locale support
   * @param date Date to format
   * @param options Intl.DateTimeFormatOptions
   * @returns Formatted time string
   */
  formatTimeToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options,
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  }
}

// Singleton instance
export const timeService = new TimeService();