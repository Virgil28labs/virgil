/**
 * DashboardAppService - Unified Dashboard App Data Access Layer
 * 
 * Provides centralized access to all dashboard app data for Virgil,
 * enabling comprehensive integration with Notes, Pomodoro, Streak Tracker,
 * Camera, and other dashboard applications.
 */

import { logger } from '../lib/logger';
import { timeService } from './TimeService';

export interface AppContextData<T = any> {
  appName: string;
  displayName: string;
  isActive: boolean;
  lastUsed: number;
  data: T;
  summary: string;
  capabilities: string[];
  icon?: string;
}

export interface AggregateableData {
  type: 'image' | 'video' | 'audio' | 'document' | 'score' | 'count' | 'custom';
  count: number;
  label: string;
  appName: string;
  metadata?: any;
}

export interface CrossAppConcept {
  name: string;
  keywords: string[];
  aggregationType: 'sum' | 'list' | 'custom';
  requiresExplicitIntent?: boolean;
}

export interface AppDataAdapter<T = any> {
  // Basic metadata
  readonly appName: string;
  readonly displayName: string;
  readonly icon?: string;
  
  // Data access methods
  getContextData(): AppContextData<T>;
  
  // Real-time subscription (optional)
  subscribe?(callback: (data: T) => void): () => void;
  
  // Query capabilities
  canAnswer(query: string): boolean;
  getKeywords(): string[];
  
  // Response generation
  getResponse?(query: string): Promise<string>;
  
  // Search within app data
  search?(query: string): Promise<any[]>;
  
  // Cross-app aggregation support (optional)
  supportsAggregation?(): boolean;
  getAggregateData?(): AggregateableData[];
}

export interface DashboardAppData {
  apps: Map<string, AppContextData>;
  activeApps: string[];
  lastUpdated: number;
}

export class DashboardAppService {
  private adapters: Map<string, AppDataAdapter> = new Map();
  private listeners: ((data: DashboardAppData) => void)[] = [];
  private cache: Map<string, { data: AppContextData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  
  // Define cross-app concepts that naturally span multiple apps
  private readonly crossAppConcepts: CrossAppConcept[] = [
    { 
      name: 'favorites', 
      keywords: ['favorite', 'favorites', 'starred', 'liked', 'saved favorite'],
      aggregationType: 'sum',
    },
    { 
      name: 'images', 
      keywords: ['image', 'images', 'photo', 'photos', 'picture', 'pictures', 'pic', 'pics'],
      aggregationType: 'sum',
    },
    { 
      name: 'saved', 
      keywords: ['saved', 'stored', 'collected', 'kept'],
      aggregationType: 'sum',
    },
    { 
      name: 'media', 
      keywords: ['media', 'content', 'files'],
      aggregationType: 'sum',
    },
  ];
  
  constructor() {
    // Service will be initialized with adapters in Dashboard component
  }

  /**
   * Register an app adapter
   */
  registerAdapter(adapter: AppDataAdapter): void {
    this.adapters.set(adapter.appName, adapter);
    
    // Subscribe to real-time updates if supported
    if (adapter.subscribe) {
      adapter.subscribe(() => {
        this.invalidateCache(adapter.appName);
        this.notifyListeners();
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Unregister an app adapter
   */
  unregisterAdapter(appName: string): void {
    this.adapters.delete(appName);
    this.cache.delete(appName);
    this.notifyListeners();
  }

  /**
   * Get data from all registered apps
   */
  getAllAppData(): DashboardAppData {
    const apps = new Map<string, AppContextData>();
    const activeApps: string[] = [];
    
    for (const [appName, adapter] of this.adapters) {
      const cachedData = this.getCachedData(appName);
      
      if (cachedData) {
        apps.set(appName, cachedData);
        if (cachedData.isActive) {
          activeApps.push(appName);
        }
      } else {
        try {
          const data = adapter.getContextData();
          apps.set(appName, data);
          this.setCacheData(appName, data);
          
          if (data.isActive) {
            activeApps.push(appName);
          }
        } catch (error) {
          logger.error(`Error getting data from ${appName}`, error as Error, {
            component: 'DashboardAppService',
            action: 'getCompleteContext',
            metadata: { appName },
          });
        }
      }
    }
    
    return {
      apps,
      activeApps,
      lastUpdated: timeService.getTimestamp(),
    };
  }

  /**
   * Get data from a specific app
   */
  getAppData(appName: string): AppContextData | null {
    const adapter = this.adapters.get(appName);
    if (!adapter) return null;
    
    const cachedData = this.getCachedData(appName);
    if (cachedData) return cachedData;
    
    try {
      const data = adapter.getContextData();
      this.setCacheData(appName, data);
      return data;
    } catch (error) {
      console.error(`Error getting data from ${appName}:`, error);
      return null;
    }
  }

  /**
   * Find apps that can answer a specific query
   */
  findAppsForQuery(query: string): AppDataAdapter[] {
    const relevantApps: AppDataAdapter[] = [];
    
    for (const adapter of this.adapters.values()) {
      if (adapter.canAnswer(query)) {
        relevantApps.push(adapter);
      }
    }
    
    return relevantApps;
  }

  /**
   * Detect if a query is asking for cross-app aggregation
   */
  private isCrossAppQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const crossAppKeywords = [
      'all apps',
      'across apps',
      'across all apps',
      'everywhere',
      'total across',
      'combined',
      'all dashboard',
      'entire dashboard',
      'everything',
      'all saved',
      'all my',
    ];
    
    return crossAppKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Detect which cross-app concepts are present in the query
   */
  private detectCrossAppConcepts(query: string): CrossAppConcept[] {
    const lowerQuery = query.toLowerCase();
    const detectedConcepts: CrossAppConcept[] = [];
    
    for (const concept of this.crossAppConcepts) {
      const hasKeyword = concept.keywords.some(keyword => 
        lowerQuery.includes(keyword.toLowerCase()),
      );
      
      if (hasKeyword) {
        detectedConcepts.push(concept);
      }
    }
    
    return detectedConcepts;
  }

  /**
   * Check if multiple apps have relevant data for the query
   */
  private async shouldAggregateResponses(query: string): Promise<{ shouldAggregate: boolean; relevantApps: AppDataAdapter[] }> {
    // First check explicit cross-app keywords
    if (this.isCrossAppQuery(query)) {
      const relevantApps = this.findAppsForQuery(query);
      return { shouldAggregate: true, relevantApps };
    }
    
    // Check for cross-app concepts
    const concepts = this.detectCrossAppConcepts(query);
    if (concepts.length === 0) {
      return { shouldAggregate: false, relevantApps: [] };
    }
    
    // Find apps that can answer the query
    const relevantApps = this.findAppsForQuery(query);
    
    // If multiple apps can provide data, check if they actually have data
    if (relevantApps.length >= 2) {
      // For now, aggregate if 2+ apps match
      // Future enhancement: check if apps actually have non-zero data
      return { shouldAggregate: true, relevantApps };
    }
    
    return { shouldAggregate: false, relevantApps };
  }

  /**
   * Get aggregated data from all apps that support it
   */
  private getAggregatedData(): Map<string, AggregateableData[]> {
    const aggregatedByType = new Map<string, AggregateableData[]>();
    
    for (const adapter of this.adapters.values()) {
      if (adapter.supportsAggregation && adapter.supportsAggregation()) {
        const data = adapter.getAggregateData ? adapter.getAggregateData() : [];
        
        data.forEach(item => {
          const existing = aggregatedByType.get(item.type) || [];
          existing.push(item);
          aggregatedByType.set(item.type, existing);
        });
      }
    }
    
    return aggregatedByType;
  }

  /**
   * Build a natural language response from aggregated data
   */
  private buildAggregatedResponse(query: string, aggregatedData: Map<string, AggregateableData[]>): string {
    const lowerQuery = query.toLowerCase();
    
    // Check if query is about favorites
    if (lowerQuery.includes('favorite') || lowerQuery.includes('starred')) {
      const imageData = aggregatedData.get('image') || [];
      const videoData = aggregatedData.get('video') || [];
      const allFavorites = [...imageData, ...videoData];
      
      if (allFavorites.length === 0) {
        return "You don't have any favorites saved across your dashboard apps yet.";
      }
      
      // Filter only items that are actually favorites (based on label)
      const favoriteItems = allFavorites.filter(item => 
        item.label.toLowerCase().includes('favorite') || 
        item.label.toLowerCase().includes('dog') || // Dog Gallery favorites
        item.label.toLowerCase().includes('space'), // NASA favorites
      );
      
      if (favoriteItems.length === 0) {
        return "You don't have any favorites saved across your dashboard apps yet.";
      }
      
      // Calculate total favorites
      const total = favoriteItems.reduce((sum, item) => sum + item.count, 0);
      
      // Build response
      let response = `You have ${total} favorite`;
      
      // Determine if we're talking about images specifically
      const isImageQuery = lowerQuery.includes('image') || lowerQuery.includes('photo') || lowerQuery.includes('picture');
      if (isImageQuery) {
        response += ' images';
      } else {
        response += 's';
      }
      
      if (favoriteItems.length === 1 && total > 0) {
        const item = favoriteItems[0];
        const adapter = this.adapters.get(item.appName);
        const displayName = adapter ? adapter.displayName : item.appName;
        response += ` in ${displayName}`;
      } else if (favoriteItems.length > 1) {
        response += ' across your apps: ';
        const parts = favoriteItems
          .filter(item => item.count > 0)
          .map(item => {
            const adapter = this.adapters.get(item.appName);
            const displayName = adapter ? adapter.displayName : item.appName;
            return `${item.count} ${item.label} in ${displayName}`;
          });
        
        if (parts.length > 2) {
          const last = parts.pop();
          response += parts.join(', ') + ', and ' + last;
        } else {
          response += parts.join(' and ');
        }
      }
      
      response += '.';
      return response;
    }
    
    // Check if query is specifically about images
    if (lowerQuery.includes('image') || lowerQuery.includes('photo') || lowerQuery.includes('picture')) {
      const imageData = aggregatedData.get('image') || [];
      
      if (imageData.length === 0) {
        return "You don't have any images saved across your dashboard apps yet.";
      }
      
      // Calculate total
      const total = imageData.reduce((sum, item) => sum + item.count, 0);
      
      // Build response
      let response = `You have ${total} images across all apps`;
      
      if (imageData.length > 1) {
        response += ': ';
        const parts = imageData
          .filter(item => item.count > 0)
          .map(item => {
            // Get display name from the adapter
            const adapter = this.adapters.get(item.appName);
            const displayName = adapter ? adapter.displayName : item.appName;
            return `${item.count} ${item.label} in ${displayName}`;
          });
        
        if (parts.length > 2) {
          const last = parts.pop();
          response += parts.join(', ') + ', and ' + last;
        } else {
          response += parts.join(' and ');
        }
      }
      
      response += '.';
      return response;
    }
    
    // For general "everything" queries
    if (lowerQuery.includes('everything') || lowerQuery.includes('all')) {
      const summary: string[] = [];
      
      aggregatedData.forEach((items, type) => {
        const total = items.reduce((sum, item) => sum + item.count, 0);
        if (total > 0) {
          const typeLabel = type === 'image' ? 'images' : 
            type === 'video' ? 'videos' :
              type === 'audio' ? 'audio files' :
                type === 'document' ? 'documents' :
                  'items';
          summary.push(`${total} ${typeLabel}`);
        }
      });
      
      if (summary.length === 0) {
        return "You don't have any saved content across your dashboard apps yet.";
      }
      
      let response = 'Across all dashboard apps, you have: ';
      if (summary.length > 2) {
        const last = summary.pop();
        response += summary.join(', ') + ', and ' + last;
      } else {
        response += summary.join(' and ');
      }
      
      response += '.';
      return response;
    }
    
    // Default to showing everything
    return this.buildAggregatedResponse(query + ' everything', aggregatedData);
  }

  /**
   * Get response from the most relevant app for a query
   */
  async getResponseForQuery(query: string): Promise<{ appName: string; response: string } | null> {
    // Check if we should aggregate responses
    const { shouldAggregate, relevantApps } = await this.shouldAggregateResponses(query);
    
    if (shouldAggregate && relevantApps.length > 0) {
      const aggregatedData = this.getAggregatedData();
      
      if (aggregatedData.size > 0) {
        const response = this.buildAggregatedResponse(query, aggregatedData);
        return { appName: 'dashboard', response };
      }
    }
    
    // Fall back to single-app logic if not aggregating
    if (relevantApps.length === 0) {
      // Find apps that can answer if we haven't already
      const apps = this.findAppsForQuery(query);
      if (apps.length === 0) return null;
      
      // Use the first app that can provide a response
      for (const app of apps) {
        if (app.getResponse) {
          try {
            const response = await app.getResponse(query);
            if (response) {
              return { appName: app.appName, response };
            }
          } catch (error) {
            logger.error(`Error getting response from ${app.appName}`, error as Error, {
              component: 'DashboardAppService',
              action: 'handleAppAction',
              metadata: { appName: app.appName },
            });
          }
        }
      }
    } else {
      // Use the relevant apps we already found
      for (const app of relevantApps) {
        if (app.getResponse) {
          try {
            const response = await app.getResponse(query);
            if (response) {
              return { appName: app.appName, response };
            }
          } catch (error) {
            logger.error(`Error getting response from ${app.appName}`, error as Error, {
              component: 'DashboardAppService',
              action: 'handleAppAction',
              metadata: { appName: app.appName },
            });
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Search across all apps
   */
  async searchAllApps(query: string): Promise<{ appName: string; results: any[] }[]> {
    const searchResults: { appName: string; results: any[] }[] = [];
    
    for (const adapter of this.adapters.values()) {
      if (adapter.search) {
        try {
          const results = await adapter.search(query);
          if (results.length > 0) {
            searchResults.push({
              appName: adapter.appName,
              results,
            });
          }
        } catch (error) {
          logger.error(`Error searching ${adapter.appName}`, error as Error, {
            component: 'DashboardAppService',
            action: 'searchAllApps',
            metadata: { appName: adapter.appName, query },
          });
        }
      }
    }
    
    return searchResults;
  }

  /**
   * Get summary of all app states for Virgil's context
   */
  getContextSummary(): string {
    const appData = this.getAllAppData();
    const summaries: string[] = [];
    
    for (const [_appName, data] of appData.apps) {
      if (data.isActive || data.summary) {
        summaries.push(`${data.displayName}: ${data.summary}`);
      }
    }
    
    if (summaries.length === 0) {
      return 'No active dashboard apps';
    }
    
    return `Dashboard Apps:\n${summaries.join('\n')}`;
  }

  /**
   * Get detailed context for specific apps
   */
  getDetailedContext(appNames?: string[]): string {
    const appData = this.getAllAppData();
    const contexts: string[] = [];
    
    const appsToInclude = appNames || Array.from(appData.apps.keys());
    
    for (const appName of appsToInclude) {
      const data = appData.apps.get(appName);
      if (data) {
        let context = `\n${data.displayName.toUpperCase()}:`;
        context += `\n- Status: ${data.isActive ? 'Active' : 'Inactive'}`;
        
        if (data.summary) {
          context += `\n- ${data.summary}`;
        }
        
        if (data.capabilities.length > 0) {
          context += `\n- Can help with: ${data.capabilities.join(', ')}`;
        }
        
        contexts.push(context);
      }
    }
    
    return contexts.join('\n');
  }

  /**
   * Subscribe to app data changes
   */
  subscribe(callback: (data: DashboardAppData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getAllAppData());
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Get all registered app keywords for query analysis
   */
  getAllKeywords(): Map<string, string[]> {
    const keywordMap = new Map<string, string[]>();
    
    for (const [appName, adapter] of this.adapters) {
      keywordMap.set(appName, adapter.getKeywords());
    }
    
    return keywordMap;
  }

  // Cache management
  private getCachedData(appName: string): AppContextData | null {
    const cached = this.cache.get(appName);
    if (!cached) return null;
    
    if (timeService.getTimestamp() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(appName);
      return null;
    }
    
    return cached.data;
  }

  private setCacheData(appName: string, data: AppContextData): void {
    this.cache.set(appName, {
      data,
      timestamp: timeService.getTimestamp(),
    });
  }

  private invalidateCache(appName?: string): void {
    if (appName) {
      this.cache.delete(appName);
    } else {
      this.cache.clear();
    }
  }

  private notifyListeners(): void {
    const data = this.getAllAppData();
    this.listeners.forEach(listener => listener(data));
  }

  // Cleanup
  destroy(): void {
    this.adapters.clear();
    this.cache.clear();
    this.listeners = [];
  }
}

// Singleton instance
export const dashboardAppService = new DashboardAppService();