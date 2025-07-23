/**
 * CameraAdapter - Dashboard App Adapter for Camera/Photo Gallery
 * 
 * Provides unified access to camera photos for Virgil AI assistant,
 * enabling responses about saved photos, favorites, and storage usage.
 */

import type { AppDataAdapter, AppContextData, AggregateableData } from '../DashboardAppService';
import { PhotoStorage } from '../../components/camera/utils/photoStorage';
import type { SavedPhoto } from '../../types/camera.types';
import { logger } from '../../lib/logger';

interface CameraData {
  photos: {
    total: number;
    favorites: number;
    recent: {
      id: string;
      timestamp: number;
      name?: string;
      size?: number;
      isFavorite: boolean;
      tags?: string[];
    }[];
  };
  storage: {
    usedMB: number;
    maxMB: number;
    usedPercentage: number;
  };
  stats: {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    oldestPhoto?: Date;
    newestPhoto?: Date;
  };
}

export class CameraAdapter implements AppDataAdapter<CameraData> {
  readonly appName = 'camera';
  readonly displayName = 'Camera';
  readonly icon = '📸';
  
  private photos: SavedPhoto[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private listeners: ((data: CameraData) => void)[] = [];

  constructor() {
    this.refreshData();
  }

  private async refreshData(): Promise<void> {
    try {
      this.photos = await PhotoStorage.getAllPhotos();
      this.lastFetchTime = Date.now();
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to fetch camera photos', error as Error, {
        component: 'CameraAdapter',
        action: 'fetchData'
      });
      this.photos = [];
    }
  }

  private async ensureFreshData(): Promise<void> {
    if (Date.now() - this.lastFetchTime > this.CACHE_DURATION) {
      await this.refreshData();
    }
  }

  getContextData(): AppContextData<CameraData> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);

    // Calculate stats
    const todayCount = this.photos.filter(p => p.timestamp >= todayStart.getTime()).length;
    const weekCount = this.photos.filter(p => p.timestamp >= weekStart.getTime()).length;
    const monthCount = this.photos.filter(p => p.timestamp >= monthStart.getTime()).length;
    const favorites = this.photos.filter(p => p.isFavorite);
    
    // Get storage info
    const totalSize = this.photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
    const maxSize = 50 * 1024 * 1024; // 50MB default
    const usedMB = totalSize / (1024 * 1024);
    const maxMB = maxSize / (1024 * 1024);
    const usedPercentage = (totalSize / maxSize) * 100;

    // Get recent photos
    const recentPhotos = this.photos.slice(0, 10).map(photo => ({
      id: photo.id,
      timestamp: photo.timestamp,
      name: photo.name,
      size: photo.size,
      isFavorite: photo.isFavorite,
      tags: photo.tags,
    }));

    const data: CameraData = {
      photos: {
        total: this.photos.length,
        favorites: favorites.length,
        recent: recentPhotos,
      },
      storage: {
        usedMB: parseFloat(usedMB.toFixed(2)),
        maxMB,
        usedPercentage: parseFloat(usedPercentage.toFixed(1)),
      },
      stats: {
        todayCount,
        weekCount,
        monthCount,
        oldestPhoto: this.photos.length > 0 ? new Date(this.photos[this.photos.length - 1].timestamp) : undefined,
        newestPhoto: this.photos.length > 0 ? new Date(this.photos[0].timestamp) : undefined,
      },
    };

    const summary = this.generateSummary(data);
    const isActive = weekCount > 0; // Active if photos taken in last week

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: this.photos.length > 0 ? this.photos[0].timestamp : 0,
      data,
      summary,
      capabilities: [
        'photo-capture',
        'photo-storage',
        'favorites-management',
        'photo-organization',
        'storage-tracking',
      ],
      icon: this.icon,
    };
  }

  private generateSummary(data: CameraData): string {
    const parts: string[] = [];
    
    if (data.photos.total === 0) {
      return 'No photos saved yet';
    }

    parts.push(`${data.photos.total} photos`);
    
    if (data.photos.favorites > 0) {
      parts.push(`${data.photos.favorites} favorites`);
    }
    
    if (data.stats.todayCount > 0) {
      parts.push(`${data.stats.todayCount} today`);
    }
    
    parts.push(`${data.storage.usedMB}MB used`);

    return parts.join(', ');
  }

  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    
    return keywords.some(keyword => lowerQuery.includes(keyword));
  }

  getKeywords(): string[] {
    return [
      'photo', 'photos', 'picture', 'pictures', 'selfie', 'selfies',
      'camera', 'gallery', 'image', 'images',
      'saved', 'captured', 'taken', 'shot',
      'favorite', 'favorites', 'starred',
      'storage', 'space', 'memory',
    ];
  }

  async getResponse(query: string): Promise<string> {
    await this.ensureFreshData();
    const lowerQuery = query.toLowerCase();

    // Photo count queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return this.getCountResponse(lowerQuery);
    }

    // Recent photos queries
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentPhotosResponse();
    }

    // Favorites queries
    if (lowerQuery.includes('favorite') || lowerQuery.includes('starred')) {
      return this.getFavoritesResponse();
    }

    // Storage queries
    if (lowerQuery.includes('storage') || lowerQuery.includes('space') || lowerQuery.includes('memory')) {
      return this.getStorageResponse();
    }

    // Time-based queries
    if (lowerQuery.includes('today') || lowerQuery.includes('week') || lowerQuery.includes('month')) {
      return this.getTimeBasedResponse(lowerQuery);
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getCountResponse(query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (query.includes('favorite')) {
      if (data.photos.favorites === 0) {
        return "You haven't marked any photos as favorites yet. Tap the star icon on photos you want to favorite!";
      }
      return `You have ${data.photos.favorites} favorite photo${data.photos.favorites !== 1 ? 's' : ''} out of ${data.photos.total} total.`;
    }

    if (data.photos.total === 0) {
      return "You haven't saved any photos yet. Open the camera app to capture your first photo!";
    }

    return `You have ${data.photos.total} photo${data.photos.total !== 1 ? 's' : ''} saved in your gallery.`;
  }

  private getRecentPhotosResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.photos.recent.length === 0) {
      return "No photos in your gallery yet. Start capturing memories with the camera!";
    }

    const mostRecent = data.photos.recent[0];
    const timeAgo = this.getTimeAgo(new Date(mostRecent.timestamp));
    
    let response = `Your most recent photo was taken ${timeAgo}`;
    
    if (mostRecent.name) {
      response += ` (named "${mostRecent.name}")`;
    }
    
    if (mostRecent.isFavorite) {
      response += ' and is marked as a favorite';
    }
    
    response += '.';

    if (data.photos.recent.length > 1) {
      response += ` You have ${data.photos.recent.length} recent photos in your gallery.`;
    }

    return response;
  }

  private getFavoritesResponse(): string {
    const favorites = this.photos.filter(p => p.isFavorite);
    
    if (favorites.length === 0) {
      return "You haven't marked any photos as favorites yet. Tap the star icon on photos you love!";
    }

    const recent = favorites.slice(0, 3);
    let response = `You have ${favorites.length} favorite photo${favorites.length !== 1 ? 's' : ''}.`;
    
    if (recent.length > 0) {
      response += ' Recent favorites:';
      recent.forEach(photo => {
        const timeAgo = this.getTimeAgo(new Date(photo.timestamp));
        response += `\n• Photo from ${timeAgo}`;
        if (photo.name) {
          response += ` ("${photo.name}")`;
        }
      });
    }

    return response;
  }

  private getStorageResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.photos.total === 0) {
      return `You have ${data.storage.maxMB}MB of storage available for photos. Start capturing!`;
    }

    let response = `Storage usage: ${data.storage.usedMB}MB of ${data.storage.maxMB}MB (${data.storage.usedPercentage}%)`;
    
    if (data.storage.usedPercentage > 80) {
      response += '\n⚠️ Storage is getting full. Consider deleting old photos or exporting them.';
    } else if (data.storage.usedPercentage > 50) {
      response += '\n📊 You\'re using about half of your available storage.';
    } else {
      response += '\n✅ You have plenty of storage space available.';
    }

    // Add average photo size info
    if (data.photos.total > 0) {
      const avgSizeMB = data.storage.usedMB / data.photos.total;
      response += `\nAverage photo size: ${avgSizeMB.toFixed(2)}MB`;
    }

    return response;
  }

  private getTimeBasedResponse(query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (query.includes('today')) {
      if (data.stats.todayCount === 0) {
        return "You haven't taken any photos today. Ready to capture some moments?";
      }
      return `You've taken ${data.stats.todayCount} photo${data.stats.todayCount !== 1 ? 's' : ''} today.`;
    }

    if (query.includes('week')) {
      if (data.stats.weekCount === 0) {
        return "No photos taken this week. Time to capture some memories!";
      }
      return `You've taken ${data.stats.weekCount} photo${data.stats.weekCount !== 1 ? 's' : ''} in the past week.`;
    }

    if (query.includes('month')) {
      if (data.stats.monthCount === 0) {
        return "No photos taken this month. Your camera is waiting!";
      }
      return `You've taken ${data.stats.monthCount} photo${data.stats.monthCount !== 1 ? 's' : ''} in the past month.`;
    }

    return this.getOverviewResponse();
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.photos.total === 0) {
      return "Camera app: No photos saved yet. Open the camera to start capturing memories!";
    }

    let response = `Camera gallery: ${data.photos.total} photos`;
    
    if (data.photos.favorites > 0) {
      response += ` (${data.photos.favorites} favorites)`;
    }
    
    response += `, ${data.storage.usedMB}MB used`;
    
    if (data.stats.todayCount > 0) {
      response += `, ${data.stats.todayCount} taken today`;
    }
    
    response += '.';

    return response;
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    
    return date.toLocaleDateString();
  }

  async search(query: string): Promise<any[]> {
    await this.ensureFreshData();
    
    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    // Search by photo name or tags
    this.photos.forEach(photo => {
      let relevance = 0;
      
      if (photo.name && photo.name.toLowerCase().includes(lowerQuery)) {
        relevance += 50;
      }
      
      if (photo.tags) {
        photo.tags.forEach(tag => {
          if (tag.toLowerCase().includes(lowerQuery)) {
            relevance += 30;
          }
        });
      }
      
      if (relevance > 0) {
        results.push({
          id: photo.id,
          type: 'photo',
          name: photo.name || `Photo from ${new Date(photo.timestamp).toLocaleDateString()}`,
          timestamp: photo.timestamp,
          isFavorite: photo.isFavorite,
          relevance,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  subscribe(callback: (data: CameraData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      this.refreshData();
    }, 30000); // Refresh every 30 seconds
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      clearInterval(intervalId);
    };
  }

  private notifyListeners(): void {
    const data = this.getContextData().data;
    this.listeners.forEach(listener => listener(data));
  }

  // Cross-app aggregation support
  supportsAggregation(): boolean {
    return true;
  }

  getAggregateData(): AggregateableData[] {
    this.ensureFreshData();
    
    const aggregateData: AggregateableData[] = [];
    
    // Add photo count
    if (this.photos.length > 0) {
      aggregateData.push({
        type: 'image',
        count: this.photos.length,
        label: 'photos',
        appName: this.appName,
        metadata: {
          favorites: this.photos.filter(p => p.isFavorite).length,
          todayCount: this.photos.filter(p => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return p.timestamp >= today.getTime();
          }).length,
        }
      });
    }
    
    return aggregateData;
  }
}