/**
 * CameraAdapter - Dashboard App Adapter for Camera/Photo Gallery
 *
 * Provides unified access to camera photos for Virgil AI assistant,
 * enabling responses about saved photos, favorites, and storage usage.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData, AggregateableData } from '../DashboardAppService';
import { PhotoStorage } from '../../components/camera/utils/photoStorage';
import type { SavedPhoto } from '../../types/camera.types';
import { timeService } from '../TimeService';

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

export class CameraAdapter extends BaseAdapter<CameraData> {
  readonly appName = 'camera';
  readonly displayName = 'Camera';
  readonly icon = '📸';

  private photos: SavedPhoto[] = [];

  constructor() {
    super();
    this.loadData();
  }

  protected async loadData(): Promise<void> {
    try {
      this.photos = await PhotoStorage.getAllPhotos();
      this.lastFetchTime = timeService.getTimestamp();
      const data = this.transformData();
      this.notifySubscribers(data);
    } catch (error) {
      this.logError('Failed to fetch camera photos', error, 'loadData');
      this.photos = [];
    }
  }


  protected transformData(): CameraData {
    const todayStart = timeService.startOfDay();
    const weekStart = timeService.subtractDays(timeService.getCurrentDateTime(), 7);
    const monthStart = timeService.subtractMonths(timeService.getCurrentDateTime(), 1);

    // Calculate stats
    // Note: Using .getTime() on Date objects from timeService is correct here - we need timestamps for comparison
    const todayCount = this.photos.filter(p => p.timestamp >= todayStart.getTime()).length; // eslint-disable-line no-restricted-syntax
    const weekCount = this.photos.filter(p => p.timestamp >= weekStart.getTime()).length; // eslint-disable-line no-restricted-syntax
    const monthCount = this.photos.filter(p => p.timestamp >= monthStart.getTime()).length; // eslint-disable-line no-restricted-syntax
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

    return {
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
        oldestPhoto: this.photos.length > 0 ? timeService.fromTimestamp(this.photos[this.photos.length - 1].timestamp) : undefined,
        newestPhoto: this.photos.length > 0 ? timeService.fromTimestamp(this.photos[0].timestamp) : undefined,
      },
    };
  }

  getContextData(): AppContextData<CameraData> {
    this.ensureFreshData();
    const data = this.transformData();
    const summary = this.generateSummary(data);
    const weekCount = data.stats.weekCount;
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

  protected generateSummary(data: CameraData): string {
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



  getKeywords(): string[] {
    return [
      'photo', 'photos', 'picture', 'pictures', 'selfie', 'selfies',
      'camera', 'gallery', 'image', 'images',
      'saved', 'captured', 'taken', 'shot',
      'favorite', 'favorites', 'starred',
      'storage', 'space', 'memory',
    ];
  }

  override async getResponse(query: string): Promise<string> {
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
      return 'No photos in your gallery yet. Start capturing memories with the camera!';
    }

    const mostRecent = data.photos.recent[0];
    const timeAgo = this.getTimeAgo(timeService.fromTimestamp(mostRecent.timestamp));

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
        const timeAgo = this.getTimeAgo(timeService.fromTimestamp(photo.timestamp));
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
        return 'No photos taken this week. Time to capture some memories!';
      }
      return `You've taken ${data.stats.weekCount} photo${data.stats.weekCount !== 1 ? 's' : ''} in the past week.`;
    }

    if (query.includes('month')) {
      if (data.stats.monthCount === 0) {
        return 'No photos taken this month. Your camera is waiting!';
      }
      return `You've taken ${data.stats.monthCount} photo${data.stats.monthCount !== 1 ? 's' : ''} in the past month.`;
    }

    return this.getOverviewResponse();
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.photos.total === 0) {
      return 'Camera app: No photos saved yet. Open the camera to start capturing memories!';
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
    return timeService.getTimeAgo(date);
  }

  override async search(query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    await this.ensureFreshData();

    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];

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
        const name = photo.name || `Photo from ${timeService.formatDateToLocal(timeService.fromTimestamp(photo.timestamp))}`;
        results.push({
          type: 'photo',
          label: name,
          value: photo.isFavorite ? '⭐ Favorite' : timeService.formatDateToLocal(timeService.fromTimestamp(photo.timestamp)),
          field: `camera.${photo.id}`,
        });
      }
    });

    return results;
  }


  // Cross-app aggregation support
  supportsAggregation(): boolean {
    return true;
  }

  getAggregateData(): AggregateableData[] {
    // Note: ensureFreshData is handled by getContextData which is called first

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
            const today = timeService.startOfDay();
            return p.timestamp >= today.getTime(); // eslint-disable-line no-restricted-syntax
          }).length,
        },
      });
    }

    return aggregateData;
  }

  protected override getCapabilities(): string[] {
    return [
      'photo-capture',
      'photo-storage',
      'favorites-management',
      'photo-organization',
      'storage-tracking',
    ];
  }
}
