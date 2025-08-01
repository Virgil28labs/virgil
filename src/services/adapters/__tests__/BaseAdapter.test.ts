/**
 * BaseAdapter Comprehensive Test Suite
 * 
 * Tests the abstract base class for dashboard app adapters.
 * Critical foundation for all adapter functionality.
 */

import { BaseAdapter } from '../BaseAdapter';
import type { AppContextData } from '../../DashboardAppService';
import { timeService } from '../../TimeService';
import { logger } from '../../../lib/logger';

// Mock dependencies
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1234567890),
    getLocalDate: jest.fn(() => '2024-01-20'),
    parseDate: jest.fn((date: string) => {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }),
    formatDate: jest.fn((_date: Date) => 'January 20, 2024'),
    getTimeAgo: jest.fn(() => '2 hours ago'),
  },
}));

// Concrete implementation for testing
class TestAdapter extends BaseAdapter<{ message: string; count: number }> {
  readonly appName = 'test';
  readonly displayName = 'Test Adapter';
  readonly icon = 'test-icon';

  private data: { message: string; count: number } | null = null;
  private isActive = true;

  getContextData(): AppContextData<{ message: string; count: number }> {
    return {
      appName: 'test-adapter',
      displayName: 'Test Adapter',
      isActive: this.isActive,
      lastUsed: this.lastFetchTime,
      data: this.data ?? {},
      summary: this.data ? this.generateSummary(this.data) : 'No data available',
      capabilities: ['test', 'mock'],
    };
  }

  protected transformData(): { message: string; count: number } {
    return this.data || { message: 'default', count: 0 };
  }

  protected generateSummary(data: { message: string; count: number }): string {
    return `Message: ${data.message}, Count: ${data.count}`;
  }

  protected loadData(): void {
    this.data = { message: 'loaded', count: 42 };
    this.lastFetchTime = timeService.getTimestamp();
  }

  getKeywords(): string[] {
    return ['test', 'adapter', 'mock'];
  }

  // Test helper methods
  setActive(active: boolean): void {
    this.isActive = active;
  }

  setData(data: { message: string; count: number } | null): void {
    this.data = data;
  }

  getData(): { message: string; count: number } | null {
    return this.data;
  }

  public getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  public setCacheTime(time: number): void {
    this.lastFetchTime = time;
  }

  // Expose protected methods for testing
  public testGetKeywordConfidence(query: string): number {
    return this.getKeywordConfidence(query);
  }

  public testIsAskingForAdvice(query: string): boolean {
    return this.isAskingForAdvice(query);
  }

  public testNotifySubscribers(data: { message: string; count: number }): void {
    this.notifySubscribers(data);
  }

  public testIsToday(dateStr: string | null): boolean {
    return this.isToday(dateStr);
  }

  public testGetTimestamp(date: string | Date | null): number {
    return this.getTimestamp(date);
  }

  public testFormatDate(date: string | Date | null): string {
    return this.formatDate(date);
  }

  public testGetRelativeTime(date: string | Date | null): string {
    return this.getRelativeTime(date);
  }

  public testSafeGet<K>(obj: unknown, path: string, defaultValue: K): K {
    return this.safeGet(obj, path, defaultValue);
  }

  public testSearchInFields(
    data: Record<string, unknown>,
    query: string,
    fields: Array<{ path: string; label: string; type?: string }>,
  ) {
    return this.searchInFields(data, query, fields);
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new TestAdapter();
  });

  describe('Subscription System', () => {
    it('allows subscribing to data updates', () => {
      const callback = jest.fn();
      const unsubscribe = adapter.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(adapter['subscribers']).toContain(callback);
    });

    it('allows unsubscribing from data updates', () => {
      const callback = jest.fn();
      const unsubscribe = adapter.subscribe(callback);

      unsubscribe();

      expect(adapter['subscribers']).not.toContain(callback);
    });

    it('notifies subscribers of data changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const testData = { message: 'test', count: 5 };

      adapter.subscribe(callback1);
      adapter.subscribe(callback2);

      adapter.testNotifySubscribers(testData);

      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
    });

    it('handles subscriber errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = jest.fn();
      const testData = { message: 'test', count: 5 };

      adapter.subscribe(errorCallback);
      adapter.subscribe(goodCallback);

      expect(() => adapter.testNotifySubscribers(testData)).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error notifying subscriber in test',
        expect.any(Error),
        {
          component: 'testAdapter',
          action: 'notifySubscribers',
        },
      );
      expect(goodCallback).toHaveBeenCalledWith(testData);
    });

    it('removes specific subscriber when unsubscribing', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      adapter.subscribe(callback1);
      const unsubscribe2 = adapter.subscribe(callback2);
      
      unsubscribe2();
      
      const testData = { message: 'test', count: 1 };
      adapter.testNotifySubscribers(testData);
      
      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Confidence Scoring', () => {
    it('returns high confidence for exact keyword matches', async () => {
      const confidence = await adapter.getConfidence('test this adapter');
      expect(confidence).toBe(0.9);
    });

    it('returns low confidence for partial matches', async () => {
      const confidence = await adapter.getConfidence('testing');
      expect(confidence).toBe(0.3);
    });

    it('returns zero confidence for no matches', async () => {
      const confidence = await adapter.getConfidence('completely unrelated query');
      expect(confidence).toBe(0);
    });

    it('handles case insensitive matching', async () => {
      const confidence = await adapter.getConfidence('TEST ADAPTER');
      expect(confidence).toBe(0.9);
    });

    it('uses keyword confidence scoring', () => {
      const confidence = adapter.testGetKeywordConfidence('test this adapter');
      expect(confidence).toBe(0.9);
    });

    it('finds maximum confidence across multiple keywords', () => {
      const confidence = adapter.testGetKeywordConfidence('this is a mock test');
      expect(confidence).toBe(0.9); // Should match both 'test' and 'mock'
    });

    it('handles regex special characters in keywords', () => {
      // Override keywords to include special regex characters
      jest.spyOn(adapter, 'getKeywords').mockReturnValue(['test.+', 'adapter*']);
      
      const confidence = adapter.testGetKeywordConfidence('test.+ something');
      // Should get partial match (0.3) since the literal string doesn't match as a word
      expect(confidence).toBe(0.3);
    });
  });

  describe('Advice Detection', () => {
    it('detects advice patterns correctly', () => {
      const adviceQueries = [
        'what should I do',
        'how to improve',
        'recommend something',
        'give me tips',
        'help me with this',
        'what is the best way',
      ];

      adviceQueries.forEach(query => {
        expect(adapter.testIsAskingForAdvice(query)).toBe(true);
      });
    });

    it('does not detect advice in status queries', () => {
      const statusQueries = [
        'what is the status',
        'show me data',
        'current information',
        'display results',
      ];

      statusQueries.forEach(query => {
        expect(adapter.testIsAskingForAdvice(query)).toBe(false);
      });
    });

    it('handles case insensitive advice detection', () => {
      expect(adapter.testIsAskingForAdvice('HOW TO IMPROVE')).toBe(true);
      expect(adapter.testIsAskingForAdvice('What Should I do')).toBe(true);
    });
  });

  describe('Response Generation', () => {
    it('returns default response when active with data', async () => {
      adapter.setData({ message: 'test', count: 10 });
      
      const response = await adapter.getResponse('test query');
      
      expect(response).toBe('I can help you with Test Adapter. Message: test, Count: 10');
    });

    it('returns inactive response when not active', async () => {
      adapter.setActive(false);
      
      const response = await adapter.getResponse('test query');
      
      expect(response).toBe('The Test Adapter app is not currently active or has no data available.');
    });

    it('returns inactive response when no data', async () => {
      adapter.setData(null);
      
      const response = await adapter.getResponse('test query');
      
      expect(response).toBe('The Test Adapter app is not currently active or has no data available.');
    });
  });

  describe('Data Caching', () => {
    it('loads fresh data when cache is expired', () => {
      const oldTime = 1000000000;
      const currentTime = 1000005001; // More than 5 seconds later
      
      adapter.setCacheTime(oldTime);
      (timeService.getTimestamp as jest.Mock).mockReturnValue(currentTime);
      
      const spy = jest.spyOn(adapter as unknown as { loadData: () => void }, 'loadData');
      adapter['ensureFreshData']();
      
      expect(spy).toHaveBeenCalled();
    });

    it('does not load data when cache is fresh', () => {
      const currentTime = 1000000000;
      
      adapter.setCacheTime(currentTime - 1000); // 1 second ago
      (timeService.getTimestamp as jest.Mock).mockReturnValue(currentTime);
      
      const spy = jest.spyOn(adapter as unknown as { loadData: () => void }, 'loadData');
      adapter['ensureFreshData']();
      
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Date Utilities', () => {
    it('checks if date string is today', () => {
      expect(adapter.testIsToday('2024-01-20')).toBe(true);
      expect(adapter.testIsToday('2024-01-19')).toBe(false);
      expect(adapter.testIsToday(null)).toBe(false);
    });

    it('gets timestamp from string dates', () => {
      const dateStr = '2024-01-20T12:00:00';
      const expectedDate = new Date(dateStr);
      
      (timeService.parseDate as jest.Mock).mockReturnValue(expectedDate);
      
      const timestamp = adapter.testGetTimestamp(dateStr);
      expect(timestamp).toBe(expectedDate.getTime());
      expect(timeService.parseDate).toHaveBeenCalledWith(dateStr);
    });

    it('gets timestamp from Date objects', () => {
      const date = new Date('2024-01-20T12:00:00');
      const timestamp = adapter.testGetTimestamp(date);
      expect(timestamp).toBe(date.getTime());
    });

    it('handles null dates for timestamp', () => {
      expect(adapter.testGetTimestamp(null)).toBe(0);
    });

    it('handles invalid date strings', () => {
      (timeService.parseDate as jest.Mock).mockReturnValue(null);
      expect(adapter.testGetTimestamp('invalid-date')).toBe(0);
    });

    it('formats dates for display', () => {
      const date = new Date('2024-01-20T12:00:00');
      const formatted = adapter.testFormatDate(date);
      expect(formatted).toBe('January 20, 2024');
      expect(timeService.formatDate).toHaveBeenCalledWith(date);
    });

    it('formats string dates', () => {
      const dateStr = '2024-01-20T12:00:00';
      const parsedDate = new Date(dateStr);
      
      (timeService.parseDate as jest.Mock).mockReturnValue(parsedDate);
      
      const formatted = adapter.testFormatDate(dateStr);
      expect(formatted).toBe('January 20, 2024');
    });

    it('handles null dates in formatting', () => {
      expect(adapter.testFormatDate(null)).toBe('Never');
    });

    it('handles invalid dates in formatting', () => {
      (timeService.parseDate as jest.Mock).mockReturnValue(null);
      expect(adapter.testFormatDate('invalid')).toBe('Invalid date');
    });

    it('gets relative time strings', () => {
      const date = new Date('2024-01-20T10:00:00');
      const relativeTime = adapter.testGetRelativeTime(date);
      expect(relativeTime).toBe('2 hours ago');
      expect(timeService.getTimeAgo).toHaveBeenCalledWith(date);
    });

    it('handles null dates in relative time', () => {
      expect(adapter.testGetRelativeTime(null)).toBe('Never');
    });
  });

  describe('Safe Data Access', () => {
    it('safely gets nested object properties', () => {
      const obj = {
        user: {
          profile: {
            name: 'John Doe',
            age: 30,
          },
        },
      };

      expect(adapter.testSafeGet(obj, 'user.profile.name', 'Unknown')).toBe('John Doe');
      expect(adapter.testSafeGet(obj, 'user.profile.age', 0)).toBe(30);
    });

    it('returns default value for missing properties', () => {
      const obj = { user: { name: 'John' } };

      expect(adapter.testSafeGet(obj, 'user.profile.name', 'Unknown')).toBe('Unknown');
      expect(adapter.testSafeGet(obj, 'nonexistent.path', 'Default')).toBe('Default');
    });

    it('handles null and undefined objects', () => {
      expect(adapter.testSafeGet(null, 'any.path', 'Default')).toBe('Default');
      expect(adapter.testSafeGet(undefined, 'any.path', 'Default')).toBe('Default');
    });

    it('handles exceptions gracefully', () => {
      const obj = {};
      // Create object that throws on property access
      Object.defineProperty(obj, 'throwingProp', {
        get() { throw new Error('Property access error'); },
      });

      expect(adapter.testSafeGet(obj, 'throwingProp.nested', 'Default')).toBe('Default');
    });
  });

  describe('Search in Fields', () => {
    it('searches text fields correctly', () => {
      const data = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        description: 'Test description content',
      };

      const fields = [
        { path: 'user.name', label: 'Name' },
        { path: 'user.email', label: 'Email', type: 'contact' },
        { path: 'description', label: 'Description' },
      ];

      const results = adapter.testSearchInFields(data, 'john', fields);

      expect(results).toHaveLength(2);
      expect(results).toContainEqual({
        type: 'field',
        label: 'Name',
        value: 'John Doe',
        field: 'user.name',
      });
      expect(results).toContainEqual({
        type: 'contact',
        label: 'Email',
        value: 'john@example.com',
        field: 'user.email',
      });
    });

    it('performs case insensitive search', () => {
      const data = { title: 'Important Meeting' };
      const fields = [{ path: 'title', label: 'Title' }];

      const results = adapter.testSearchInFields(data, 'IMPORTANT', fields);

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Important Meeting');
    });

    it('returns empty array when no matches', () => {
      const data = { title: 'Meeting' };
      const fields = [{ path: 'title', label: 'Title' }];

      const results = adapter.testSearchInFields(data, 'nomatch', fields);

      expect(results).toHaveLength(0);
    });

    it('handles missing fields gracefully', () => {
      const data = { existing: 'value' };
      const fields = [
        { path: 'existing', label: 'Existing' },
        { path: 'nonexistent', label: 'Missing' },
      ];

      const results = adapter.testSearchInFields(data, 'value', fields);

      expect(results).toHaveLength(1);
      expect(results[0].field).toBe('existing');
    });
  });

  describe('Default Search Implementation', () => {
    it('returns empty array by default', async () => {
      const results = await adapter.search('test query');
      expect(results).toEqual([]);
    });
  });

  describe('Capabilities', () => {
    it('returns default capabilities', () => {
      const capabilities = adapter['getCapabilities']();
      expect(capabilities).toEqual(['data-access', 'query-response', 'real-time-updates']);
    });
  });

  describe('Error Logging', () => {
    it('logs errors with consistent format', () => {
      const error = new Error('Test error');
      adapter['logError']('Test message', error, 'testAction');

      expect(logger.error).toHaveBeenCalledWith(
        'Test message',
        error,
        {
          component: 'testAdapter',
          action: 'testAction',
        },
      );
    });
  });

  describe('Abstract Method Requirements', () => {
    it('has required abstract properties implemented', () => {
      expect(adapter.appName).toBe('test');
      expect(adapter.displayName).toBe('Test Adapter');
      expect(adapter.icon).toBe('test-icon');
    });

    it('has required abstract methods implemented', () => {
      expect(typeof adapter.getContextData).toBe('function');
      expect(typeof adapter.getKeywords).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty keyword arrays', () => {
      jest.spyOn(adapter, 'getKeywords').mockReturnValue([]);
      const confidence = adapter.testGetKeywordConfidence('any query');
      expect(confidence).toBe(0);
    });

    it('handles empty queries', async () => {
      const confidence = await adapter.getConfidence('');
      expect(confidence).toBe(0);
    });

    it('handles regex cache correctly', () => {
      // Call same keyword multiple times to test caching
      adapter.testGetKeywordConfidence('test query');
      adapter.testGetKeywordConfidence('test again');
      
      // Should reuse cached regex
      expect(adapter['regexCache'].size).toBeGreaterThan(0);
    });
  });
});