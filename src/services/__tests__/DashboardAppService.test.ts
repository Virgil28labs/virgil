import type { AppDataAdapter, AppContextData, AggregateableData } from '../DashboardAppService';
import { DashboardAppService } from '../DashboardAppService';
import { logger } from '../../lib/logger';

jest.mock('../../lib/logger');

// Mock adapter implementation
class MockAdapter implements AppDataAdapter {
  constructor(
    public appName: string,
    public displayName: string,
    private mockData: any = {},
    private keywords: string[] = [],
    private canAnswerFn?: (query: string) => boolean,
  ) {}

  icon = '🎯';
  
  getContextData(): AppContextData {
    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive: this.mockData.isActive || false,
      lastUsed: Date.now(),
      data: this.mockData,
      summary: this.mockData.summary || 'Test summary',
      capabilities: this.mockData.capabilities || ['test'],
      icon: this.icon,
    };
  }

  subscribe(callback: (data: any) => void) {
    this.mockData.callback = callback;
    return () => {
      delete this.mockData.callback;
    };
  }

  canAnswer(query: string): boolean {
    if (this.canAnswerFn) {
      return this.canAnswerFn(query);
    }
    return this.keywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  getKeywords(): string[] {
    return this.keywords;
  }

  async getResponse(query: string): Promise<string> {
    if (this.mockData.response) {
      return this.mockData.response;
    }
    return `Response from ${this.appName} for: ${query}`;
  }

  async search(query: string): Promise<any[]> {
    if (this.mockData.searchResults) {
      return this.mockData.searchResults;
    }
    return [`Result from ${this.appName}`];
  }

  supportsAggregation(): boolean {
    return this.mockData.supportsAggregation || false;
  }

  getAggregateData(): AggregateableData[] {
    return this.mockData.aggregateData || [];
  }
}

describe('DashboardAppService', () => {
  let service: DashboardAppService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create new instance to avoid state pollution
    service = new DashboardAppService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('registerAdapter', () => {
    it('registers an adapter successfully', () => {
      const adapter = new MockAdapter('testApp', 'Test App');
      
      service.registerAdapter(adapter);
      
      const appData = service.getAppData('testApp');
      expect(appData).toBeTruthy();
      expect(appData?.appName).toBe('testApp');
      expect(appData?.displayName).toBe('Test App');
    });

    it('subscribes to adapter updates if supported', () => {
      const adapter = new MockAdapter('testApp', 'Test App');
      const subscribeSpy = jest.spyOn(adapter, 'subscribe');
      
      service.registerAdapter(adapter);
      
      expect(subscribeSpy).toHaveBeenCalled();
    });

    it('notifies listeners when adapter is registered', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      const adapter = new MockAdapter('testApp', 'Test App');
      service.registerAdapter(adapter);
      
      // Initial call + registration call
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('unregisterAdapter', () => {
    it('removes adapter and clears cache', () => {
      const adapter = new MockAdapter('testApp', 'Test App');
      service.registerAdapter(adapter);
      
      service.unregisterAdapter('testApp');
      
      const appData = service.getAppData('testApp');
      expect(appData).toBeNull();
    });

    it('notifies listeners when adapter is unregistered', () => {
      const adapter = new MockAdapter('testApp', 'Test App');
      service.registerAdapter(adapter);
      
      const listener = jest.fn();
      service.subscribe(listener);
      listener.mockClear();
      
      service.unregisterAdapter('testApp');
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getAllAppData', () => {
    it('returns data from all registered apps', () => {
      // Create new service instance to avoid cache issues
      const testService = new DashboardAppService();
      
      const adapter1 = new MockAdapter('app1', 'App 1', { isActive: true });
      const adapter2 = new MockAdapter('app2', 'App 2', { isActive: false });
      
      testService.registerAdapter(adapter1);
      testService.registerAdapter(adapter2);
      
      const allData = testService.getAllAppData();
      
      expect(allData.apps.size).toBe(2);
      expect(allData.apps.has('app1')).toBe(true);
      expect(allData.apps.has('app2')).toBe(true);
      expect(allData.activeApps).toContain('app1');
      expect(allData.activeApps).not.toContain('app2');
      
      testService.destroy();
    });

    it('handles errors from adapters gracefully', () => {
      const badAdapter = new MockAdapter('badApp', 'Bad App');
      badAdapter.getContextData = () => {
        throw new Error('Adapter error');
      };
      
      service.registerAdapter(badAdapter);
      
      const allData = service.getAllAppData();
      
      expect(allData.apps.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting data from badApp',
        expect.any(Error),
        expect.any(Object),
      );
    });

    it('uses cached data when available', () => {
      const adapter = new MockAdapter('app1', 'App 1');
      const getContextSpy = jest.spyOn(adapter, 'getContextData');
      
      service.registerAdapter(adapter);
      
      // First call - should hit adapter
      service.getAllAppData();
      expect(getContextSpy).toHaveBeenCalledTimes(1);
      
      // Second call within cache TTL - should use cache
      service.getAllAppData();
      expect(getContextSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAppData', () => {
    it('returns data for specific app', () => {
      const adapter = new MockAdapter('testApp', 'Test App', {
        isActive: true,
        summary: 'Custom summary',
      });
      
      service.registerAdapter(adapter);
      
      const appData = service.getAppData('testApp');
      
      expect(appData).toBeTruthy();
      expect(appData?.summary).toBe('Custom summary');
      expect(appData?.isActive).toBe(true);
    });

    it('returns null for unregistered app', () => {
      const appData = service.getAppData('nonExistent');
      expect(appData).toBeNull();
    });

    it('handles adapter errors', () => {
      const adapter = new MockAdapter('badApp', 'Bad App');
      adapter.getContextData = () => {
        throw new Error('Adapter error');
      };
      
      service.registerAdapter(adapter);
      
      const appData = service.getAppData('badApp');
      expect(appData).toBeNull();
    });
  });

  describe('findAppsForQuery', () => {
    it('finds apps that can answer the query', () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {}, ['notes', 'reminders']);
      const adapter2 = new MockAdapter('app2', 'App 2', {}, ['photos', 'images']);
      const adapter3 = new MockAdapter('app3', 'App 3', {}, ['music', 'audio']);
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      service.registerAdapter(adapter3);
      
      const appsForNotes = service.findAppsForQuery('show my notes');
      expect(appsForNotes).toHaveLength(1);
      expect(appsForNotes[0].appName).toBe('app1');
      
      const appsForPhotos = service.findAppsForQuery('my photos');
      expect(appsForPhotos).toHaveLength(1);
      expect(appsForPhotos[0].appName).toBe('app2');
    });

    it('returns empty array when no apps match', () => {
      const adapter = new MockAdapter('app1', 'App 1', {}, ['notes']);
      service.registerAdapter(adapter);
      
      const apps = service.findAppsForQuery('show videos');
      expect(apps).toHaveLength(0);
    });
  });

  describe('getResponseForQuery', () => {
    it('returns response from single matching app', async () => {
      const adapter = new MockAdapter('app1', 'App 1', {
        response: 'Custom response',
      }, ['notes']);
      
      service.registerAdapter(adapter);
      
      const result = await service.getResponseForQuery('show notes');
      
      expect(result).toBeTruthy();
      expect(result?.appName).toBe('app1');
      expect(result?.response).toBe('Custom response');
    });

    it('handles cross-app aggregation for favorites', async () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {
        supportsAggregation: true,
        aggregateData: [{
          type: 'image',
          count: 5,
          label: 'favorite photos',
          appName: 'app1',
        }],
      }, ['favorites', 'photos']);
      
      const adapter2 = new MockAdapter('app2', 'App 2', {
        supportsAggregation: true,
        aggregateData: [{
          type: 'image',
          count: 3,
          label: 'dog favorites',
          appName: 'app2',
        }],
      }, ['favorites', 'dogs']);
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const result = await service.getResponseForQuery('show all my favorites');
      
      expect(result).toBeTruthy();
      expect(result?.appName).toBe('dashboard');
      expect(result?.response).toContain('8 favorites across your apps');
    });

    it('handles cross-app aggregation for images', async () => {
      const adapter1 = new MockAdapter('camera', 'Camera', {
        supportsAggregation: true,
        aggregateData: [{
          type: 'image',
          count: 20,
          label: 'photos',
          appName: 'camera',
        }],
      }, ['photos', 'camera', 'image', 'images']);
      
      const adapter2 = new MockAdapter('nasa', 'NASA', {
        supportsAggregation: true,
        aggregateData: [{
          type: 'image',
          count: 10,
          label: 'space images',
          appName: 'nasa',
        }],
      }, ['nasa', 'space', 'image', 'images']);
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const result = await service.getResponseForQuery('how many images across all apps');
      
      expect(result).toBeTruthy();
      expect(result?.appName).toBe('dashboard');
      expect(result?.response).toContain('30 images across all apps');
    });

    it('returns null when no apps can answer', async () => {
      const adapter = new MockAdapter('app1', 'App 1', {}, ['notes']);
      service.registerAdapter(adapter);
      
      const result = await service.getResponseForQuery('show videos');
      expect(result).toBeNull();
    });

    it('handles adapter errors gracefully', async () => {
      const adapter = new MockAdapter('app1', 'App 1', {}, ['notes']);
      adapter.getResponse = async () => {
        throw new Error('Response error');
      };
      
      service.registerAdapter(adapter);
      
      const result = await service.getResponseForQuery('show notes');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('searchAllApps', () => {
    it('searches across all apps with search capability', async () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {
        searchResults: ['Note 1', 'Note 2'],
      });
      
      const adapter2 = new MockAdapter('app2', 'App 2', {
        searchResults: ['Photo 1'],
      });
      
      const adapter3 = new MockAdapter('app3', 'App 3');
      adapter3.search = undefined; // No search capability
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      service.registerAdapter(adapter3);
      
      const results = await service.searchAllApps('test query');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        appName: 'app1',
        results: ['Note 1', 'Note 2'],
      });
      expect(results[1]).toEqual({
        appName: 'app2',
        results: ['Photo 1'],
      });
    });

    it('handles search errors gracefully', async () => {
      const adapter = new MockAdapter('badApp', 'Bad App');
      adapter.search = async () => {
        throw new Error('Search error');
      };
      
      service.registerAdapter(adapter);
      
      const results = await service.searchAllApps('test');
      
      expect(results).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getContextSummary', () => {
    it('returns summary of all active apps', () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {
        isActive: true,
        summary: 'App 1 is active',
      });
      
      const adapter2 = new MockAdapter('app2', 'App 2', {
        isActive: false,
        summary: 'App 2 is inactive',
      });
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const summary = service.getContextSummary();
      
      expect(summary).toContain('Dashboard Apps:');
      expect(summary).toContain('App 1: App 1 is active');
      expect(summary).toContain('App 2: App 2 is inactive');
    });

    it('returns no active apps message when empty', () => {
      const summary = service.getContextSummary();
      expect(summary).toBe('No active dashboard apps');
    });
  });

  describe('getDetailedContext', () => {
    it('returns detailed context for specified apps', () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {
        isActive: true,
        summary: 'App 1 summary',
        capabilities: ['notes', 'reminders'],
      });
      
      const adapter2 = new MockAdapter('app2', 'App 2', {
        isActive: false,
        summary: 'App 2 summary',
        capabilities: ['photos'],
      });
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const context = service.getDetailedContext(['app1']);
      
      expect(context).toContain('APP 1:');
      expect(context).toContain('Status: Active');
      expect(context).toContain('App 1 summary');
      expect(context).toContain('Can help with: notes, reminders');
      expect(context).not.toContain('APP 2:');
    });

    it('returns context for all apps when none specified', () => {
      const adapter1 = new MockAdapter('app1', 'App 1', { isActive: true });
      const adapter2 = new MockAdapter('app2', 'App 2', { isActive: false });
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const context = service.getDetailedContext();
      
      expect(context).toContain('APP 1:');
      expect(context).toContain('APP 2:');
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers of changes', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      // Should receive initial data
      expect(listener).toHaveBeenCalledTimes(1);
      
      // Register new app
      const adapter = new MockAdapter('app1', 'App 1');
      service.registerAdapter(adapter);
      
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          apps: expect.any(Map),
          activeApps: expect.any(Array),
          lastUpdated: expect.any(Number),
        }),
      );
      
      // Unsubscribe
      unsubscribe();
      service.registerAdapter(new MockAdapter('app2', 'App 2'));
      
      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllKeywords', () => {
    it('returns keywords from all adapters', () => {
      const adapter1 = new MockAdapter('app1', 'App 1', {}, ['notes', 'reminders']);
      const adapter2 = new MockAdapter('app2', 'App 2', {}, ['photos', 'images']);
      
      service.registerAdapter(adapter1);
      service.registerAdapter(adapter2);
      
      const keywords = service.getAllKeywords();
      
      expect(keywords.size).toBe(2);
      expect(keywords.get('app1')).toEqual(['notes', 'reminders']);
      expect(keywords.get('app2')).toEqual(['photos', 'images']);
    });
  });

  describe('cache management', () => {
    it('invalidates cache when adapter notifies change', () => {
      // Create new service instance
      const testService = new DashboardAppService();
      const adapter = new MockAdapter('app1', 'App 1');
      const getContextSpy = jest.spyOn(adapter, 'getContextData');
      let adapterCallback: ((data: any) => void) | undefined;
      
      // Override subscribe to capture the callback
      adapter.subscribe = (callback: (data: any) => void) => {
        adapterCallback = callback;
        return () => {};
      };
      
      testService.registerAdapter(adapter);
      
      // First call
      testService.getAppData('app1');
      expect(getContextSpy).toHaveBeenCalledTimes(1);
      
      // Trigger change through adapter callback
      if (adapterCallback) {
        adapterCallback({});
      }
      
      // Should fetch fresh data
      testService.getAppData('app1');
      expect(getContextSpy).toHaveBeenCalledTimes(2); // Initial + fresh fetch after cache invalidation
      
      testService.destroy();
    });

    it('expires cache after TTL', () => {
      const adapter = new MockAdapter('app1', 'App 1');
      const getContextSpy = jest.spyOn(adapter, 'getContextData');
      
      service.registerAdapter(adapter);
      
      // First call
      service.getAppData('app1');
      expect(getContextSpy).toHaveBeenCalledTimes(1);
      
      // Advance time beyond cache TTL
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6000); // 6 seconds later
      
      // Should fetch fresh data
      service.getAppData('app1');
      expect(getContextSpy).toHaveBeenCalledTimes(2);
      
      // Restore
      Date.now = originalNow;
    });
  });

  describe('destroy', () => {
    it('cleans up all resources', () => {
      const adapter = new MockAdapter('app1', 'App 1');
      service.registerAdapter(adapter);
      
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.destroy();
      
      // Should clear everything
      expect(service.getAppData('app1')).toBeNull();
      expect(service.getAllAppData().apps.size).toBe(0);
      
      // Listeners should be cleared
      service.registerAdapter(new MockAdapter('app2', 'App 2'));
      expect(listener).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('edge cases', () => {
    it('handles empty aggregate data gracefully', async () => {
      // Create a service with multiple adapters that support aggregation
      const testService = new DashboardAppService();
      
      const adapter1 = new MockAdapter('app1', 'App 1', {
        supportsAggregation: true,
        aggregateData: [],
      }, ['favorites', 'all', 'across']);
      
      const adapter2 = new MockAdapter('app2', 'App 2', {
        supportsAggregation: true,
        aggregateData: [],
      }, ['favorites', 'all', 'across']);
      
      testService.registerAdapter(adapter1);
      testService.registerAdapter(adapter2);
      
      const result = await testService.getResponseForQuery('show all favorites across apps');
      
      // When aggregation detects no data, it falls back to single app response
      expect(result).toBeTruthy();
      // The result will be from the first matching app
      expect(result?.appName).toBe('app1');
      expect(result?.response).toContain('Response from app1');
      
      testService.destroy();
    });

    it('handles no matching concept in aggregation', async () => {
      const adapter = new MockAdapter('app1', 'App 1', {
        supportsAggregation: true,
        aggregateData: [{
          type: 'custom',
          count: 5,
          label: 'custom items',
          appName: 'app1',
        }],
      }, ['custom']);
      
      service.registerAdapter(adapter);
      
      const result = await service.getResponseForQuery('show all custom items across apps');
      
      expect(result).toBeTruthy();
      expect(result?.response).toContain('5 items');
    });
  });
});