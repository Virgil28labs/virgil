/**
 * TimeService Mock Factory
 * 
 * Provides comprehensive mocking utilities for TimeService in tests.
 * Enables time control, travel, and consistent behavior across test suites.
 */

import type { TimeService as OriginalTimeService, TimeUpdate } from '../TimeService';

export class MockTimeService implements OriginalTimeService {
  private mockDate: Date;
  private frozenTime: boolean = false;
  private timeListeners: ((time: TimeUpdate) => void)[] = [];
  private mockTimer?: NodeJS.Timeout;
  
  constructor(initialDate: Date = new Date('2024-01-20T12:00:00')) {
    this.mockDate = new Date(initialDate);
  }

  // Time Control Methods
  setMockDate(date: Date | string | number): void {
    this.mockDate = new Date(date);
    this.notifyListeners();
  }

  advanceTime(ms: number): void {
    if (!this.frozenTime) {
      this.mockDate = new Date(this.mockDate.getTime() + ms);
      this.notifyListeners();
    }
  }

  freezeTime(): void {
    this.frozenTime = true;
  }

  unfreezeTime(): void {
    this.frozenTime = false;
  }

  // Core TimeService Methods
  getLocalDate(): string {
    return this.formatDateToLocal(this.mockDate);
  }

  formatDateToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (options) {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCurrentDateTime(): Date {
    return new Date(this.mockDate);
  }

  getTimestamp(): number {
    return this.mockDate.getTime();
  }

  formatDate(date?: Date): string {
    const dateObj = date || this.mockDate;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);
  }

  getCurrentTime(): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(this.mockDate);
  }

  getCurrentDate(): string {
    return this.formatDate(this.mockDate);
  }

  getDayOfWeek(): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(this.mockDate).toLowerCase();
  }

  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = this.mockDate.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Subscription Methods
  subscribeToTimeUpdates(callback: (time: TimeUpdate) => void): () => void {
    this.timeListeners.push(callback);
    // Send initial update
    callback({
      currentTime: this.getCurrentTime(),
      currentDate: this.getCurrentDate(),
      dateObject: this.getCurrentDateTime(),
    });
    
    return () => {
      this.timeListeners = this.timeListeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    const update: TimeUpdate = {
      currentTime: this.getCurrentTime(),
      currentDate: this.getCurrentDate(),
      dateObject: this.getCurrentDateTime(),
    };
    this.timeListeners.forEach(listener => listener(update));
  }

  // Date Arithmetic
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  subtractMonths(date: Date, months: number): Date {
    return this.addMonths(date, -months);
  }

  addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  subtractYears(date: Date, years: number): Date {
    return this.addYears(date, -years);
  }

  addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  subtractHours(date: Date, hours: number): Date {
    return this.addHours(date, -hours);
  }

  addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  subtractMinutes(date: Date, minutes: number): Date {
    return this.addMinutes(date, -minutes);
  }

  // ISO String Helpers
  toISOString(date?: Date): string {
    return (date || this.mockDate).toISOString();
  }

  toISODateString(date?: Date): string {
    const dateStr = (date || this.mockDate).toISOString();
    return dateStr.split('T')[0];
  }

  // Date Boundaries
  startOfDay(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfDay(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  startOfWeek(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfWeek(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? 0 : 7);
    result.setDate(diff);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  startOfMonth(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  endOfMonth(date?: Date): Date {
    const result = new Date(date || this.mockDate);
    result.setMonth(result.getMonth() + 1, 0);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  // Date Comparison
  isToday(date: Date): boolean {
    return this.isSameDay(date, this.mockDate);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getHoursDifference(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  // Relative Time
  getTimeAgo(date: Date): string {
    const seconds = Math.floor((this.mockDate.getTime() - date.getTime()) / 1000);
    
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

  getRelativeTime(date: Date): string {
    const ms = date.getTime() - this.mockDate.getTime();
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
    return isPast ? `${days} days ago` : `in ${days} days`;
  }

  // Validation
  isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  parseDate(dateString: string): Date | null {
    const date = new Date(dateString);
    return this.isValidDate(date) ? date : null;
  }

  // Form Helpers
  formatForDateTimeInput(date?: Date): string {
    const d = date || this.mockDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatForDateInput(date?: Date): string {
    return this.formatDateToLocal(date || this.mockDate);
  }

  // Conversion
  fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  createDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day);
  }

  // Localization
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

  formatTimeToLocal(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options,
    };
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  }

  // Lifecycle
  startTimer(): void {
    // Mock implementation - no real timer needed
    if (!this.frozenTime && !this.mockTimer) {
      this.mockTimer = setInterval(() => {
        this.advanceTime(1000);
      }, 1000);
    }
  }

  destroy(): void {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = undefined;
    }
    this.timeListeners = [];
  }
}

// Factory for creating mock instances
export function createMockTimeService(initialDate?: Date | string): MockTimeService {
  return new MockTimeService(initialDate ? new Date(initialDate) : undefined);
}

// Pre-configured mocks for common scenarios
export const mockTimeServicePresets = {
  morning: () => createMockTimeService('2024-01-20T08:00:00'),
  afternoon: () => createMockTimeService('2024-01-20T14:00:00'),
  evening: () => createMockTimeService('2024-01-20T19:00:00'),
  night: () => createMockTimeService('2024-01-20T23:00:00'),
  weekend: () => createMockTimeService('2024-01-21T12:00:00'), // Sunday
  monthEnd: () => createMockTimeService('2024-01-31T12:00:00'),
  yearEnd: () => createMockTimeService('2024-12-31T23:59:59'),
};

// Default export for jest.mock()
export const timeService = createMockTimeService();