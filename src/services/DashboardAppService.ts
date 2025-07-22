/**
 * DashboardAppService - Unified Dashboard App Data Access Layer
 * 
 * Provides centralized access to all dashboard app data for Virgil,
 * enabling comprehensive integration with Notes, Pomodoro, Streak Tracker,
 * Camera, and other dashboard applications.
 */

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
      } else {
        try {
          const data = adapter.getContextData();
          apps.set(appName, data);
          this.setCacheData(appName, data);
          
          if (data.isActive) {
            activeApps.push(appName);
          }
        } catch (error) {
          console.error(`Error getting data from ${appName}:`, error);
        }
      }
    }
    
    return {
      apps,
      activeApps,
      lastUpdated: Date.now(),
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
   * Get response from the most relevant app for a query
   */
  async getResponseForQuery(query: string): Promise<{ appName: string; response: string } | null> {
    const relevantApps = this.findAppsForQuery(query);
    
    if (relevantApps.length === 0) return null;
    
    // Try each app until one provides a response
    for (const app of relevantApps) {
      if (app.getResponse) {
        try {
          const response = await app.getResponse(query);
          if (response) {
            return { appName: app.appName, response };
          }
        } catch (error) {
          console.error(`Error getting response from ${app.appName}:`, error);
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
          console.error(`Error searching ${adapter.appName}:`, error);
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
    
    for (const [appName, data] of appData.apps) {
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
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(appName);
      return null;
    }
    
    return cached.data;
  }

  private setCacheData(appName: string, data: AppContextData): void {
    this.cache.set(appName, {
      data,
      timestamp: Date.now(),
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