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

// Time constants
const TIME_CONSTANTS = {
  MINUTE_MS: 60 * 1000,
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,
  CACHE_DURATION: 60 * 1000,
} as const;

// Relative time units for formatting
const RELATIVE_TIME_UNITS = [
  { threshold: 60, divisor: 1, unit: 'second' },
  { threshold: 3600, divisor: 60, unit: 'minute' },
  { threshold: 86400, divisor: 3600, unit: 'hour' },
  { threshold: 604800, divisor: 86400, unit: 'day' },
  { threshold: 2592000, divisor: 604800, unit: 'week' },
  { threshold: 31536000, divisor: 2592000, unit: 'month' },
  { threshold: Infinity, divisor: 31536000, unit: 'year' },
] as const;

export class TimeService {
  private timeListeners: ((time: TimeUpdate) => void)[] = [];
  private mainTimer?: NodeJS.Timeout;
  private localDateCache: { date: string; timestamp: number } | null = null;

  // Memoized formatters for performance
  private readonly formatters = {
    time: new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    date: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    day: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }),
  };

  constructor() {
    this.startTimer();
  }

  // ==========================================
  // CORE METHODS
  // ==========================================

  getLocalDate(): string {
    const now = Date.now();
    if (this.localDateCache && (now - this.localDateCache.timestamp) < TIME_CONSTANTS.CACHE_DURATION) {
      return this.localDateCache.date;
    }
    const date = this.formatDateToLocal(new Date(now));
    this.localDateCache = { date, timestamp: now };
    return date;
  }

  formatDateToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (options) {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
    // Default YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCurrentDateTime = (): Date => new Date();
  getTimestamp = (): number => Date.now();

  formatDate(date?: Date): string {
    const dateObj = date || new Date();
    return this.isValidDate(dateObj) ? this.formatters.date.format(dateObj) : 'Invalid Date';
  }

  getCurrentTime = (): string => this.formatters.time.format(new Date());
  getCurrentDate = (): string => this.formatters.date.format(new Date());
  getDayOfWeek = (): string => this.formatters.day.format(new Date()).toLowerCase();

  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  subscribeToTimeUpdates(callback: (time: TimeUpdate) => void): () => void {
    this.timeListeners.push(callback);
    return () => {
      this.timeListeners = this.timeListeners.filter(listener => listener !== callback);
    };
  }

  private startTimer(): void {
    if (!this.mainTimer) {
      this.mainTimer = setInterval(() => {
        if (this.timeListeners.length > 0) {
          const now = new Date();
          const timeUpdate: TimeUpdate = {
            currentTime: this.formatters.time.format(now),
            currentDate: this.formatters.date.format(now),
            dateObject: now,
          };
          for (const callback of this.timeListeners) {
            try {
              callback(timeUpdate);
            } catch (_error) {
              // Silent fail to prevent cascade failures
            }
          }
        }
      }, 1000);
    }
  }

  // ==========================================
  // DATE COMPONENT EXTRACTION
  // ==========================================

  getDatePart(date: Date | undefined, part: 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds'): number {
    const d = date || new Date();
    switch (part) {
      case 'year': return d.getFullYear();
      case 'month': return d.getMonth() + 1; // Return 1-12
      case 'day': return d.getDate();
      case 'hours': return d.getHours();
      case 'minutes': return d.getMinutes();
      case 'seconds': return d.getSeconds();
    }
  }

  // Convenience methods for backward compatibility
  getYear = (date?: Date): number => this.getDatePart(date, 'year');
  getMonth = (date?: Date): number => this.getDatePart(date, 'month');
  getDay = (date?: Date): number => this.getDatePart(date, 'day');
  getHours = (date?: Date): number => this.getDatePart(date, 'hours');
  getMinutes = (date?: Date): number => this.getDatePart(date, 'minutes');
  getSeconds = (date?: Date): number => this.getDatePart(date, 'seconds');

  // ==========================================
  // DATE ARITHMETIC
  // ==========================================

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  addHours = (date: Date, hours: number): Date => 
    new Date(date.getTime() + hours * TIME_CONSTANTS.HOUR_MS);

  addMinutes = (date: Date, minutes: number): Date => 
    new Date(date.getTime() + minutes * TIME_CONSTANTS.MINUTE_MS);

  // Subtract methods just use add with negative values
  subtractDays = (date: Date, days: number): Date => this.addDays(date, -days);
  subtractMonths = (date: Date, months: number): Date => this.addMonths(date, -months);
  subtractYears = (date: Date, years: number): Date => this.addYears(date, -years);
  subtractHours = (date: Date, hours: number): Date => this.addHours(date, -hours);
  subtractMinutes = (date: Date, minutes: number): Date => this.addMinutes(date, -minutes);

  // ==========================================
  // DATE BOUNDARIES
  // ==========================================

  startOfDay(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfDay(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setHours(23, 59, 59, 999);
    return result;
  }

  startOfWeek(date?: Date): Date {
    const result = new Date(date || new Date());
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfWeek(date?: Date): Date {
    const result = this.startOfWeek(date);
    result.setDate(result.getDate() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  startOfMonth(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfMonth(date?: Date): Date {
    const result = new Date(date || new Date());
    result.setMonth(result.getMonth() + 1, 0);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  // ==========================================
  // COMPARISON & VALIDATION
  // ==========================================

  isToday = (date: Date): boolean => 
    this.formatDateToLocal(date) === this.getLocalDate();

  isSameDay = (date1: Date, date2: Date): boolean => 
    this.formatDateToLocal(date1) === this.formatDateToLocal(date2);

  getDaysBetween = (date1: Date, date2: Date): number => 
    Math.floor((date2.getTime() - date1.getTime()) / TIME_CONSTANTS.DAY_MS);

  getHoursDifference = (date1: Date, date2: Date): number => 
    Math.floor((date2.getTime() - date1.getTime()) / TIME_CONSTANTS.HOUR_MS);

  isValidDate = (date: unknown): date is Date => 
    date instanceof Date && !isNaN(date.getTime());

  parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return this.isValidDate(date) ? date : null;
  }

  // ==========================================
  // RELATIVE TIME FORMATTING
  // ==========================================

  private getRelativeTimeUnit(seconds: number): { value: number; unit: string; plural: boolean } {
    const unit = RELATIVE_TIME_UNITS.find(u => seconds < u.threshold)!;
    const value = Math.floor(seconds / unit.divisor);
    return { value, unit: unit.unit, plural: value !== 1 };
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    
    const { value, unit, plural } = this.getRelativeTimeUnit(seconds);
    return `${value} ${unit}${plural ? 's' : ''} ago`;
  }

  getRelativeTime(date: Date): string {
    const ms = date.getTime() - Date.now();
    const seconds = Math.floor(Math.abs(ms) / 1000);
    const isPast = ms < 0;
    
    if (seconds < 60) return isPast ? 'just now' : 'in a moment';
    
    const { value, unit, plural } = this.getRelativeTimeUnit(seconds);
    const unitStr = `${value} ${unit}${plural ? 's' : ''}`;
    return isPast ? `${unitStr} ago` : `in ${unitStr}`;
  }

  // ==========================================
  // FORMATTING HELPERS
  // ==========================================

  formatWithLocale(date: Date, type: 'date' | 'time' | 'datetime', options?: Intl.DateTimeFormatOptions): string {
    const defaults: Record<string, Intl.DateTimeFormatOptions> = {
      date: { year: 'numeric' as const, month: 'numeric' as const, day: 'numeric' as const },
      time: { hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const },
      datetime: { 
        year: 'numeric' as const, month: 'numeric' as const, day: 'numeric' as const,
        hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const,
      },
    };
    return new Intl.DateTimeFormat('en-US', { ...defaults[type], ...options }).format(date);
  }

  // Backward compatibility methods
  formatDateTimeToLocal = (date: Date, options?: Intl.DateTimeFormatOptions): string => 
    this.formatWithLocale(date, 'datetime', options);

  formatTimeToLocal = (date: Date, options?: Intl.DateTimeFormatOptions): string => 
    this.formatWithLocale(date, 'time', options);

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  toISOString = (date?: Date): string => (date || new Date()).toISOString();
  toISODateString = (date?: Date): string => this.formatDateToLocal(date || new Date());
  formatForDateInput = (date?: Date): string => this.formatDateToLocal(date || new Date());
  fromTimestamp = (timestamp: number): Date => new Date(timestamp);
  toTimestamp = (date: Date): number => date.getTime();
  createDate = (year: number, month: number, day: number): Date => new Date(year, month, day);

  formatForDateTimeInput(date?: Date): string {
    const d = date || new Date();
    const dateStr = this.formatDateToLocal(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr}T${hours}:${minutes}`;
  }

  destroy(): void {
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = undefined;
    }
    this.timeListeners = [];
    this.localDateCache = null;
  }
}

// Singleton instance
export const timeService = new TimeService();