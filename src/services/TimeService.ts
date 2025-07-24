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
  private timeFormatter: Intl.DateTimeFormat;
  private dateFormatter: Intl.DateTimeFormat;
  private dayFormatter: Intl.DateTimeFormat;
  
  // Cache for frequently called methods (cleared every minute)
  private localDateCache: { date: string; timestamp: number } | null = null;
  
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
    if (this.localDateCache && (now - this.localDateCache.timestamp) < 60000) {
      return this.localDateCache.date;
    }
    
    // Generate new date and cache it
    const date = this.formatDateToLocal(new Date());
    this.localDateCache = { date, timestamp: now };
    return date;
  }
  
  /**
   * Format any date to local YYYY-MM-DD format
   * @param date Date object to format
   * @returns Local date string (e.g., "2024-01-15")
   */
  formatDateToLocal(date: Date): string {
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
    const dateObj = date || new Date();
    return this.dateFormatter.format(dateObj);
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
    // Update time listeners every second
    this.mainTimer = setInterval(() => {
      if (this.timeListeners.length > 0) {
        const timeUpdate: TimeUpdate = {
          currentTime: this.getCurrentTime(),
          currentDate: this.getCurrentDate(),
          dateObject: new Date(),
        };
        
        this.timeListeners.forEach(callback => {
          try {
            callback(timeUpdate);
          } catch (error) {
            console.error('Error in time update callback:', error);
          }
        });
      }
    }, 1000);
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
  }
}

// Singleton instance
export const timeService = new TimeService();