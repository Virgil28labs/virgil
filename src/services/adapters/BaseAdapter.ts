/**
 * BaseAdapter - Abstract base class for Dashboard App Adapters
 * 
 * Provides common functionality for all dashboard app adapters,
 * reducing code duplication and ensuring consistent behavior.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import { CONFIDENCE_THRESHOLDS } from '../DashboardAppService';
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';
import { vectorMemoryService } from '../VectorMemoryService';

export abstract class BaseAdapter<T> implements AppDataAdapter<T> {
  // Required properties that must be implemented by subclasses
  abstract readonly appName: string;
  abstract readonly displayName: string;
  abstract readonly icon: string;
  
  // Common properties with defaults
  protected subscribers: ((data: T) => void)[] = [];
  protected lastFetchTime = 0;
  protected readonly CACHE_DURATION = 5000; // 5 seconds default
  
  // Regex cache for performance optimization
  private regexCache: Map<string, RegExp> = new Map();
  
  /**
   * Get context data for Virgil - must be implemented by subclasses
   */
  abstract getContextData(): AppContextData<T>;
  
  /**
   * Transform raw data to adapter format - must be implemented by subclasses
   */
  protected abstract transformData(): T;
  
  /**
   * Generate summary of current data - must be implemented by subclasses
   */
  protected abstract generateSummary(data: T): string;
  
  /**
   * Load data from storage or API - must be implemented by subclasses
   */
  protected abstract loadData(): void;
  
  /**
   * Get keywords for query matching - must be implemented by subclasses
   */
  abstract getKeywords(): string[];
  
  /**
   * Subscribe to data updates
   */
  subscribe(callback: (data: T) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  /**
   * Get confidence score for answering a query (0.0 to 1.0)
   * Uses semantic similarity first, then falls back to keyword matching
   */
  async getConfidence(query: string): Promise<number> {
    try {
      // Try semantic search first for more accurate intent matching
      const semanticScore = await vectorMemoryService.getSemanticConfidence(query, this.appName);
      
      // If we have a good semantic match, use it
      if (semanticScore > 0.5) {
        return semanticScore;
      }
    } catch (error) {
      // Log error but continue with fallback
      this.logError('Semantic confidence check failed', error, 'getConfidence');
    }
    
    // Fallback to keyword matching for backward compatibility
    return this.getKeywordConfidence(query);
  }

  /**
   * Original keyword-based confidence scoring
   * Kept as fallback for when semantic search is unavailable
   */
  protected getKeywordConfidence(query: string): number {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    let maxConfidence = 0;
    
    for (const keyword of keywords) {
      // Exact word match = high confidence
      const exactRegex = this.getOrCreateRegex(keyword);
      if (exactRegex.test(lowerQuery)) {
        maxConfidence = Math.max(maxConfidence, 0.9);
      }
      // Partial match = low confidence (backward compatibility)
      else if (lowerQuery.includes(keyword)) {
        maxConfidence = Math.max(maxConfidence, 0.3);
      }
    }
    
    return maxConfidence;
  }
  
  /**
   * Get or create a cached regex for a keyword
   * Improves performance by avoiding repeated regex creation
   */
  private getOrCreateRegex(keyword: string): RegExp {
    const cacheKey = `word_${keyword}`;
    let regex = this.regexCache.get(cacheKey);
    
    if (!regex) {
      // Escape special regex characters in the keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
      this.regexCache.set(cacheKey, regex);
    }
    
    return regex;
  }

  /**
   * Common advice/recommendation patterns that should be handled by LLM
   */
  protected static readonly ADVICE_PATTERNS = [
    'what should', 'how to', 'how do i', 'recommend', 
    'suggestion', 'advice', 'tips', 'help me', 'guide',
    'best way', 'improve', 'better', 'plan',
    'strategy', 'method', 'approach', 'technique',
    'organize',
  ];

  /**
   * Check if user is asking for advice/recommendations rather than status
   */
  protected isAskingForAdvice(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return BaseAdapter.ADVICE_PATTERNS.some(pattern => 
      lowerQuery.includes(pattern),
    );
  }
  
  /**
   * Default implementation of getResponse - can be overridden
   */
  async getResponse(_query: string): Promise<string | null> {
    const contextData = this.getContextData();
    if (!contextData.isActive || !contextData.data) {
      return this.getInactiveResponse();
    }
    
    // Subclasses should override this for custom responses
    return `I can help you with ${this.displayName}. ${contextData.summary}`;
  }
  
  /**
   * Default implementation of search - can be overridden
   */
  async search(_query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    // Subclasses should override this for custom search
    return [];
  }
  
  /**
   * Get response when app is inactive
   */
  protected getInactiveResponse(): string {
    return `The ${this.displayName} app is not currently active or has no data available.`;
  }
  
  /**
   * Ensure data is fresh (not stale from cache)
   */
  protected ensureFreshData(): void {
    if (timeService.getTimestamp() - this.lastFetchTime > this.CACHE_DURATION) {
      this.loadData();
    }
  }
  
  /**
   * Notify all subscribers of data changes
   */
  protected notifySubscribers(data: T): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error notifying subscriber in ${this.appName}`, error as Error, {
          component: `${this.appName}Adapter`,
          action: 'notifySubscribers',
        });
      }
    });
  }
  
  /**
   * Check if a date string represents today
   */
  protected isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return dateStr === timeService.getLocalDate();
  }
  
  /**
   * Get timestamp from various date formats
   */
  protected getTimestamp(date: string | Date | null): number {
    if (!date) return 0;
    
    if (typeof date === 'string') {
      const parsed = timeService.parseDate(date);
      // eslint-disable-next-line no-restricted-syntax
      return parsed ? parsed.getTime() : 0;
    }
    
    // eslint-disable-next-line no-restricted-syntax
    return date.getTime();
  }
  
  /**
   * Format a date for display
   */
  protected formatDate(date: string | Date | null): string {
    if (!date) return 'Never';
    
    const dateObj = typeof date === 'string' ? timeService.parseDate(date) : date;
    if (!dateObj) return 'Invalid date';
    
    return timeService.formatDate(dateObj);
  }
  
  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  protected getRelativeTime(date: string | Date | null): string {
    if (!date) return 'Never';
    
    const dateObj = typeof date === 'string' ? timeService.parseDate(date) : date;
    if (!dateObj) return 'Invalid date';
    
    return timeService.getTimeAgo(dateObj);
  }
  
  /**
   * Get capabilities array with defaults
   */
  protected getCapabilities(): string[] {
    // Subclasses can override to add specific capabilities
    return ['data-access', 'query-response', 'real-time-updates'];
  }
  
  /**
   * Log errors with consistent format
   */
  protected logError(message: string, error: unknown, action: string): void {
    logger.error(message, error as Error, {
      component: `${this.appName}Adapter`,
      action,
    });
  }
  
  /**
   * Safe data access with fallback
   */
  protected safeGet<K>(obj: unknown, path: string, defaultValue: K): K {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
          result = (result as Record<string, unknown>)[key];
        } else {
          return defaultValue;
        }
      }
      
      return result as K;
    } catch {
      return defaultValue;
    }
  }
  
  /**
   * Common search implementation for text fields
   */
  protected searchInFields(
    data: Record<string, unknown>,
    query: string,
    fields: Array<{ path: string; label: string; type?: string }>,
  ): Array<{ type: string; label: string; value: string; field: string }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];
    
    for (const field of fields) {
      const value = this.safeGet(data, field.path, '');
      if (value && String(value).toLowerCase().includes(lowerQuery)) {
        results.push({
          type: field.type || 'field',
          label: field.label,
          value: String(value),
          field: field.path,
        });
      }
    }
    
    return results;
  }
}