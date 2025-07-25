import type { 
  NasaApodResponse,
  ApodImage,
  NasaApodParams,
} from '../types/nasa.types';
import { retryWithBackoff } from './retryUtils';
import { dashboardContextService } from '../services/DashboardContextService';
import { timeService } from '../services/TimeService';

// Environment-configurable API settings
const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const NASA_APOD_BASE = import.meta.env.VITE_NASA_APOD_URL || 'https://api.nasa.gov/planetary/apod';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (APOD doesn't change during the day)
const FIRST_APOD_DATE = '1995-06-16'; // First APOD date

class NasaApodService {
  private cache: Map<string, { data: ApodImage; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<ApodImage>> = new Map();
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // Minimum 1 second between requests
  private rateLimitInfo = {
    remaining: null as number | null,
    limit: null as number | null,
    reset: null as number | null,
  };
  private defaultParams = {
    api_key: NASA_API_KEY,
    hd: true, // Always request HD URLs when available
  };

  constructor() {
    if (!NASA_API_KEY || NASA_API_KEY === 'your_nasa_api_key_here') {
      console.warn('NASA API key not configured. Using DEMO_KEY with limited requests per hour.');
    }
    
    // Load cache from localStorage
    this.loadCacheFromStorage();
  }

  /**
   * Load cached data from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const storedCache = localStorage.getItem('nasa-apod-cache');
      if (storedCache) {
        const parsed = JSON.parse(storedCache);
        const now = timeService.getTimestamp();
        
        // Restore valid cache entries
        Object.entries(parsed).forEach(([key, value]: [string, unknown]) => {
          if (value && typeof value === 'object' && 'timestamp' in value && 'data' in value) {
            const cacheEntry = value as { data: ApodImage; timestamp: number };
            if (now - cacheEntry.timestamp < CACHE_DURATION) {
              this.cache.set(key, cacheEntry);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load NASA APOD cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      const cacheObject: Record<string, { data: ApodImage; timestamp: number }> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem('nasa-apod-cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save NASA APOD cache to localStorage:', error);
    }
  }

  /**
   * Convert NASA APOD API response to our simplified format
   */
  private transformApodResponse(response: NasaApodResponse): ApodImage {
    const id = response.date; // Use date as unique identifier
    
    // Calculate aspect ratio if available (for layout optimization)
    let aspectRatio: number | undefined;
    if (response.media_type === 'image') {
      // We'll calculate this when the image loads in the component
      aspectRatio = undefined;
    }

    return {
      id,
      date: response.date,
      title: response.title,
      explanation: response.explanation,
      imageUrl: response.url,
      hdImageUrl: response.hdurl,
      mediaType: response.media_type,
      copyright: response.copyright,
      concepts: response.concepts,
      isHD: !!response.hdurl,
      aspectRatio,
    };
  }

  /**
   * Throttle requests to prevent hitting rate limits
   */
  private async throttleRequest(): Promise<void> {
    const now = timeService.getTimestamp();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = timeService.getTimestamp();
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response: Response): void {
    try {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const limit = response.headers.get('X-RateLimit-Limit');
      const reset = response.headers.get('X-RateLimit-Reset');
      
      if (remaining !== null) {
        this.rateLimitInfo.remaining = parseInt(remaining, 10);
      }
      if (limit !== null) {
        this.rateLimitInfo.limit = parseInt(limit, 10);
      }
      if (reset !== null) {
        this.rateLimitInfo.reset = parseInt(reset, 10) * 1000; // Convert to milliseconds
      }
      
      // Log rate limit status
      if (this.rateLimitInfo.remaining !== null && this.rateLimitInfo.limit !== null) {
        const percentage = (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100;
        if (percentage < 20) {
          console.warn(`NASA API rate limit warning: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} requests remaining`);
        }
      }
    } catch (_error) {
      // Silently ignore header parsing errors
    }
  }

  /**
   * Make authenticated API request to NASA APOD
   */
  private async makeNasaRequest(params: NasaApodParams = {}): Promise<Response> {
    const url = new URL(NASA_APOD_BASE);
    
    // Add API key and merge with default params
    const allParams = {
      ...this.defaultParams,
      ...params,
    };

    // Add parameters to URL
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    // Throttle requests to prevent rate limiting
    await this.throttleRequest();

    try {
      const response = await retryWithBackoff(
        async () => {
          const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Virgil-App/1.0',
            },
          });

          if (!res.ok) {
            let errorMessage = 'NASA APOD API request failed';
            try {
              const errorData = await res.json();
              errorMessage = errorData.error?.message || errorData.msg || `HTTP ${res.status}`;
            } catch {
              errorMessage = `HTTP ${res.status}: ${res.statusText}`;
            }
            
            throw new ApodServiceError(errorMessage, res.status);
          }
          
          // Extract rate limit info from successful response
          this.extractRateLimitInfo(res);
          
          return res;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`NASA APOD API retry ${attempt}:`, error.message);
          },
          shouldRetry: (error) => {
            // Don't retry rate limit errors (429) or client errors (4xx)
            if (error instanceof ApodServiceError) {
              return error.status ? error.status >= 500 : true;
            }
            return true;
          },
        },
      );

      return response;
    } catch (error) {
      if (error instanceof ApodServiceError) {
        throw error;
      }
      throw new ApodServiceError(`Failed to connect to NASA APOD API: ${error}`);
    }
  }

  /**
   * Get today's APOD
   */
  async getTodaysApod(): Promise<ApodImage> {
    const today = dashboardContextService.getLocalDate(); // Local YYYY-MM-DD format
    return this.getApodByDate(today);
  }

  /**
   * Get APOD for a specific date
   */
  async getApodByDate(date: string): Promise<ApodImage> {
    // Validate date format and range
    if (!this.isValidDate(date)) {
      throw new ApodServiceError('Invalid date format. Use YYYY-MM-DD');
    }
    
    if (!this.isDateInRange(date)) {
      throw new ApodServiceError(`Date must be between ${FIRST_APOD_DATE} and today`);
    }

    const cacheKey = `apod-${date}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && timeService.getTimestamp() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request for this date
    const pendingRequest = this.pendingRequests.get(date);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        const response = await this.makeNasaRequest({ date });
        const data: NasaApodResponse = await response.json();

        const apodImage = this.transformApodResponse(data);

        // Cache the result
        this.cache.set(cacheKey, {
          data: apodImage,
          timestamp: timeService.getTimestamp(),
        });
        
        // Save cache to localStorage
        this.saveCacheToStorage();

        return apodImage;
      } catch (error) {
        if (error instanceof ApodServiceError) {
          throw error;
        }
        throw new ApodServiceError(`Failed to fetch APOD for date ${date}: ${error}`);
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(date);
      }
    })();

    // Store the pending request
    this.pendingRequests.set(date, requestPromise);

    return requestPromise;
  }

  /**
   * Get a random APOD from the archive
   */
  async getRandomApod(): Promise<ApodImage> {
    const randomDate = this.getRandomHistoricalDate();
    return this.getApodByDate(randomDate);
  }

  /**
   * Get previous day's APOD
   */
  async getPreviousApod(currentDate: string): Promise<ApodImage> {
    const prevDate = this.addDays(currentDate, -1);
    
    if (!this.isDateInRange(prevDate)) {
      throw new ApodServiceError('No previous APOD available');
    }
    
    return this.getApodByDate(prevDate);
  }

  /**
   * Get next day's APOD
   */
  async getNextApod(currentDate: string): Promise<ApodImage> {
    const nextDate = this.addDays(currentDate, 1);
    const today = dashboardContextService.getLocalDate();
    
    if (nextDate > today) {
      throw new ApodServiceError('No future APOD available');
    }
    
    return this.getApodByDate(nextDate);
  }

  /**
   * Check if we can navigate to previous day
   */
  canNavigatePrevious(currentDate: string): boolean {
    const prevDate = this.addDays(currentDate, -1);
    return this.isDateInRange(prevDate);
  }

  /**
   * Check if we can navigate to next day
   */
  canNavigateNext(currentDate: string): boolean {
    const nextDate = this.addDays(currentDate, 1);
    const today = dashboardContextService.getLocalDate();
    return nextDate <= today;
  }

  /**
   * Download APOD image to device
   */
  async downloadApod(apod: ApodImage, useHD: boolean = false, filename?: string): Promise<void> {
    const imageUrl = useHD && apod.hdImageUrl ? apod.hdImageUrl : apod.imageUrl;
    
    if (apod.mediaType !== 'image') {
      throw new ApodServiceError('Cannot download video content');
    }

    try {
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `nasa-apod-${apod.date}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new ApodServiceError(`Download failed: ${error}`);
    }
  }

  /**
   * Share APOD
   */
  getShareData(apod: ApodImage): { title: string; text: string; url: string } {
    return {
      title: apod.title,
      text: `${apod.title} - NASA Astronomy Picture of the Day for ${apod.date}`,
      url: `https://apod.nasa.gov/apod/ap${apod.date.replace(/-/g, '').slice(2)}.html`,
    };
  }

  /**
   * Copy APOD link to clipboard
   */
  async copyApodLink(apod: ApodImage): Promise<boolean> {
    const shareData = this.getShareData(apod);
    
    try {
      await navigator.clipboard.writeText(shareData.url);
      return true;
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      
      // Fallback: try to copy using execCommand
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch {
        return false;
      }
    }
  }

  /**
   * Utility: Validate date format (YYYY-MM-DD)
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = timeService.parseDate(dateString);
    return date !== null;
  }

  /**
   * Utility: Check if date is within available range
   */
  private isDateInRange(dateString: string): boolean {
    const date = timeService.parseDate(dateString);
    if (!date) return false;
    const firstDate = timeService.parseDate(FIRST_APOD_DATE) || timeService.getCurrentDateTime();
    const today = timeService.getCurrentDateTime();
    
    return date >= firstDate && date <= today;
  }

  /**
   * Utility: Add days to a date string
   */
  private addDays(dateString: string, days: number): string {
    const date = timeService.parseDate(dateString) || timeService.getCurrentDateTime();
    const newDate = timeService.addDays(date, days);
    return timeService.toISODateString(newDate);
  }

  /**
   * Utility: Get a random historical date
   */
  private getRandomHistoricalDate(): string {
    const firstDate = timeService.parseDate(FIRST_APOD_DATE) || timeService.getCurrentDateTime();
    const today = timeService.getCurrentDateTime();
    const timeDiff = today.getTime() - firstDate.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: calculating time difference
    const randomTime = Math.random() * timeDiff;
    const randomDate = timeService.fromTimestamp(firstDate.getTime() + randomTime); // eslint-disable-line no-restricted-syntax -- Valid use: calculating timestamp
    
    return timeService.toISODateString(randomDate);
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
    try {
      localStorage.removeItem('nasa-apod-cache');
    } catch (error) {
      console.warn('Failed to clear NASA APOD cache from localStorage:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    remaining: number | null;
    limit: number | null;
    reset: Date | null;
    percentage: number | null;
    } {
    const percentage = this.rateLimitInfo.remaining !== null && this.rateLimitInfo.limit !== null
      ? (this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100
      : null;
    
    return {
      remaining: this.rateLimitInfo.remaining,
      limit: this.rateLimitInfo.limit,
      reset: this.rateLimitInfo.reset ? timeService.fromTimestamp(this.rateLimitInfo.reset) : null,
      percentage,
    };
  }

  /**
   * Preload adjacent dates for faster navigation
   */
  async preloadAdjacentDates(currentDate: string): Promise<void> {
    const promises: Promise<ApodImage>[] = [];
    
    // Preload previous day
    if (this.canNavigatePrevious(currentDate)) {
      const prevDate = this.addDays(currentDate, -1);
      if (!this.cache.has(`apod-${prevDate}`)) {
        promises.push(this.getApodByDate(prevDate).catch(() => ({} as ApodImage)));
      }
    }
    
    // Preload next day
    if (this.canNavigateNext(currentDate)) {
      const nextDate = this.addDays(currentDate, 1);
      if (!this.cache.has(`apod-${nextDate}`)) {
        promises.push(this.getApodByDate(nextDate).catch(() => ({} as ApodImage)));
      }
    }
    
    // Execute preloads in background (don't await)
    Promise.all(promises).catch(() => {
      // Silently handle preload failures
    });
  }
}

// Custom error class for NASA APOD service
export class ApodServiceError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'ApodServiceError';
  }
}

// Export singleton instance
export const nasaService = new NasaApodService();