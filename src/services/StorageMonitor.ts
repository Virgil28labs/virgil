/**
 * Storage Monitor Service
 * 
 * Provides comprehensive monitoring for all storage systems:
 * - Real-time usage tracking
 * - Quota management and alerts
 * - Performance metrics
 * - Health checks and diagnostics
 * - Automatic cleanup suggestions
 */

import { StorageService } from './StorageService';
import { indexedDBService } from './IndexedDBService';

interface StorageMetrics {
  localStorage: {
    used: number;
    available: number;
    itemCount: number;
    largestItems: { key: string; size: number }[];
  };
  indexedDB: {
    databases: DatabaseMetrics[];
    totalUsed: number;
    available: number;
  };
  total: {
    used: number;
    available: number;
    percentUsed: number;
  };
}

interface DatabaseMetrics {
  name: string;
  stores: StoreMetrics[];
  totalSize: number;
  recordCount: number;
}

interface StoreMetrics {
  name: string;
  recordCount: number;
  estimatedSize: number;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: HealthIssue[];
  recommendations: string[];
}

interface HealthIssue {
  type: 'quota' | 'performance' | 'error' | 'fragmentation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  storage: 'localStorage' | 'indexedDB';
  details?: any;
}

interface PerformanceMetrics {
  operations: {
    type: string;
    count: number;
    avgDuration: number;
    errors: number;
  }[];
  slowOperations: {
    operation: string;
    duration: number;
    timestamp: number;
  }[];
}

export class StorageMonitor {
  private static instance: StorageMonitor;
  private performanceData: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private slowOperationThreshold = 100; // ms
  private quotaWarningThreshold = 0.8; // 80%
  private quotaCriticalThreshold = 0.95; // 95%

  private constructor() {}

  static getInstance(): StorageMonitor {
    if (!StorageMonitor.instance) {
      StorageMonitor.instance = new StorageMonitor();
    }
    return StorageMonitor.instance;
  }

  /**
   * Get comprehensive storage metrics
   */
  async getMetrics(): Promise<StorageMetrics> {
    const [localStorageMetrics, indexedDBMetrics, storageEstimate] = await Promise.all([
      this.getLocalStorageMetrics(),
      this.getIndexedDBMetrics(),
      this.getStorageEstimate()
    ]);

    const totalUsed = localStorageMetrics.used + indexedDBMetrics.totalUsed;
    const totalAvailable = storageEstimate?.quota || 0;

    return {
      localStorage: localStorageMetrics,
      indexedDB: indexedDBMetrics,
      total: {
        used: totalUsed,
        available: totalAvailable,
        percentUsed: totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0
      }
    };
  }

  /**
   * Get localStorage metrics
   */
  private async getLocalStorageMetrics(): Promise<StorageMetrics['localStorage']> {
    const items: { key: string; size: number }[] = [];
    let totalSize = 0;

    try {
      const keys = StorageService.keys();
      
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2; // Approximate bytes (UTF-16)
          items.push({ key, size });
          totalSize += size;
        }
      }

      // Sort by size to find largest items
      items.sort((a, b) => b.size - a.size);

      // Estimate available space (most browsers limit to 5-10MB)
      const estimatedLimit = 10 * 1024 * 1024; // 10MB
      const available = Math.max(0, estimatedLimit - totalSize);

      return {
        used: totalSize,
        available,
        itemCount: items.length,
        largestItems: items.slice(0, 10) // Top 10 largest items
      };
    } catch (error) {
      console.error('Failed to get localStorage metrics:', error);
      return {
        used: 0,
        available: 0,
        itemCount: 0,
        largestItems: []
      };
    }
  }

  /**
   * Get IndexedDB metrics
   */
  private async getIndexedDBMetrics(): Promise<StorageMetrics['indexedDB']> {
    const databases: DatabaseMetrics[] = [];
    let totalUsed = 0;

    // Check registered databases
    const dbNames = ['VirgilMemory', 'VirgilCameraDB', 'NotesDB'];

    for (const dbName of dbNames) {
      try {
        const dbMetrics = await this.getDatabaseMetrics(dbName);
        databases.push(dbMetrics);
        totalUsed += dbMetrics.totalSize;
      } catch (error) {
        console.error(`Failed to get metrics for ${dbName}:`, error);
      }
    }

    const estimate = await this.getStorageEstimate();
    const available = estimate ? (estimate.quota || 0) - (estimate.usage || 0) : 0;

    return {
      databases,
      totalUsed,
      available
    };
  }

  /**
   * Get metrics for a specific database
   */
  private async getDatabaseMetrics(dbName: string): Promise<DatabaseMetrics> {
    const stores: StoreMetrics[] = [];
    let totalSize = 0;
    let totalRecords = 0;

    // For now, we'll estimate size based on record count
    // In a real implementation, we'd need to serialize and measure actual data
    const storeNames = this.getStoreNames(dbName);

    for (const storeName of storeNames) {
      const countResult = await indexedDBService.count(dbName, storeName);
      if (countResult.success && countResult.data !== undefined) {
        const recordCount = countResult.data;
        const estimatedSize = recordCount * 1024; // Rough estimate: 1KB per record
        
        stores.push({
          name: storeName,
          recordCount,
          estimatedSize
        });

        totalSize += estimatedSize;
        totalRecords += recordCount;
      }
    }

    return {
      name: dbName,
      stores,
      totalSize,
      recordCount: totalRecords
    };
  }

  /**
   * Get store names for a database
   */
  private getStoreNames(dbName: string): string[] {
    // This should ideally come from the database configuration
    const storeMap: Record<string, string[]> = {
      'VirgilMemory': ['conversations', 'memories'],
      'VirgilCameraDB': ['photos'],
      'NotesDB': ['notes']
    };

    return storeMap[dbName] || [];
  }

  /**
   * Get storage estimate from browser
   */
  private async getStorageEstimate(): Promise<StorageEstimate | null> {
    const result = await indexedDBService.getStorageEstimate();
    return result.success ? result.data || null : null;
  }

  /**
   * Check storage health
   */
  async checkHealth(): Promise<HealthStatus> {
    const metrics = await this.getMetrics();
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];

    // Check quota usage
    if (metrics.total.percentUsed >= this.quotaCriticalThreshold * 100) {
      issues.push({
        type: 'quota',
        severity: 'high',
        description: `Storage usage critical: ${metrics.total.percentUsed.toFixed(1)}% used`,
        storage: 'indexedDB'
      });
      recommendations.push('Urgently clean up old data or export important data');
    } else if (metrics.total.percentUsed >= this.quotaWarningThreshold * 100) {
      issues.push({
        type: 'quota',
        severity: 'medium',
        description: `Storage usage high: ${metrics.total.percentUsed.toFixed(1)}% used`,
        storage: 'indexedDB'
      });
      recommendations.push('Consider cleaning up old photos or chat history');
    }

    // Check localStorage usage
    if (metrics.localStorage.used > 5 * 1024 * 1024) { // 5MB warning
      issues.push({
        type: 'quota',
        severity: 'medium',
        description: 'localStorage usage exceeds 5MB',
        storage: 'localStorage'
      });
      recommendations.push('Move large data from localStorage to IndexedDB');
    }

    // Check for large items in localStorage
    const largeItems = metrics.localStorage.largestItems.filter(item => item.size > 100 * 1024); // 100KB
    if (largeItems.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'low',
        description: `${largeItems.length} large items in localStorage`,
        storage: 'localStorage',
        details: largeItems
      });
      recommendations.push('Consider moving large items to IndexedDB for better performance');
    }

    // Check performance metrics
    const performanceIssues = this.checkPerformanceHealth();
    issues.push(...performanceIssues.issues);
    recommendations.push(...performanceIssues.recommendations);

    // Determine overall status
    const status = issues.some(i => i.severity === 'high') ? 'critical' :
                   issues.some(i => i.severity === 'medium') ? 'warning' : 'healthy';

    return {
      status,
      issues,
      recommendations
    };
  }

  /**
   * Check performance health
   */
  private checkPerformanceHealth(): Pick<HealthStatus, 'issues' | 'recommendations'> {
    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];

    // Check for slow operations
    const slowOps: string[] = [];
    this.performanceData.forEach((durations, operation) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg > this.slowOperationThreshold) {
        slowOps.push(`${operation} (avg: ${avg.toFixed(0)}ms)`);
      }
    });

    if (slowOps.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: `Slow storage operations detected`,
        storage: 'indexedDB',
        details: slowOps
      });
      recommendations.push('Consider optimizing data access patterns or adding indexes');
    }

    // Check error rates
    const highErrorOps: string[] = [];
    this.errorCounts.forEach((count, operation) => {
      const total = this.performanceData.get(operation)?.length || 0;
      if (total > 0 && count / total > 0.1) { // 10% error rate
        highErrorOps.push(`${operation} (${count} errors)`);
      }
    });

    if (highErrorOps.length > 0) {
      issues.push({
        type: 'error',
        severity: 'high',
        description: 'High error rates in storage operations',
        storage: 'indexedDB',
        details: highErrorOps
      });
      recommendations.push('Investigate storage errors and ensure proper error handling');
    }

    return { issues, recommendations };
  }

  /**
   * Record operation performance
   */
  recordOperation(operation: string, duration: number, success: boolean): void {
    // Record duration
    if (!this.performanceData.has(operation)) {
      this.performanceData.set(operation, []);
    }
    const durations = this.performanceData.get(operation)!;
    durations.push(duration);
    
    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }

    // Record errors
    if (!success) {
      this.errorCounts.set(operation, (this.errorCounts.get(operation) || 0) + 1);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const operations: PerformanceMetrics['operations'] = [];
    const slowOperations: PerformanceMetrics['slowOperations'] = [];

    this.performanceData.forEach((durations, operation) => {
      const errors = this.errorCounts.get(operation) || 0;
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

      operations.push({
        type: operation,
        count: durations.length,
        avgDuration: avg,
        errors
      });

      // Find slow operations
      durations.forEach((duration, index) => {
        if (duration > this.slowOperationThreshold) {
          slowOperations.push({
            operation,
            duration,
            timestamp: Date.now() - (durations.length - index) * 1000 // Approximate
          });
        }
      });
    });

    // Sort by average duration
    operations.sort((a, b) => b.avgDuration - a.avgDuration);
    slowOperations.sort((a, b) => b.duration - a.duration);

    return {
      operations,
      slowOperations: slowOperations.slice(0, 20) // Top 20 slowest
    };
  }

  /**
   * Get cleanup suggestions
   */
  async getCleanupSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];
    const metrics = await this.getMetrics();

    // Check for old chat conversations
    const memoryResult = await indexedDBService.getAll('VirgilMemory', 'conversations');
    if (memoryResult.success && memoryResult.data) {
      const oldConversations = (memoryResult.data as any[]).filter(conv => {
        const age = Date.now() - (conv.timestamp || 0);
        return age > 30 * 24 * 60 * 60 * 1000; // 30 days
      });
      
      if (oldConversations.length > 0) {
        suggestions.push(`Delete ${oldConversations.length} chat conversations older than 30 days`);
      }
    }

    // Check for non-favorite photos
    const photosResult = await indexedDBService.count('VirgilCameraDB', 'photos');
    if (photosResult.success && photosResult.data && photosResult.data > 50) {
      suggestions.push('Consider deleting non-favorite photos to free up space');
    }

    // Check localStorage for large items
    metrics.localStorage.largestItems.forEach(item => {
      if (item.size > 100 * 1024) { // 100KB
        suggestions.push(`Move "${item.key}" from localStorage to IndexedDB (${(item.size / 1024).toFixed(1)}KB)`);
      }
    });

    return suggestions;
  }

  /**
   * Clear performance data
   */
  clearMetrics(): void {
    this.performanceData.clear();
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const storageMonitor = StorageMonitor.getInstance();