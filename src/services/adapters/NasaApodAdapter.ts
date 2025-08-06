/**
 * NasaApodAdapter - Dashboard App Adapter for NASA APOD
 *
 * Provides unified access to NASA Astronomy Picture of the Day favorites
 * for Virgil AI assistant, enabling responses about space images and astronomy.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData, AggregateableData } from '../DashboardAppService';
import { timeService } from '../TimeService';
import { StorageService } from '../StorageService';
interface StoredApod {
  id: string;
  date: string;
  title: string;
  imageUrl: string;
  hdImageUrl?: string;
  mediaType: 'image' | 'video';
  explanation: string;
  copyright?: string;
  savedAt: number;
}

interface NasaApodData {
  favorites: {
    total: number;
    images: number;
    videos: number;
    recent: {
      id: string;
      date: string;
      title: string;
      mediaType: 'image' | 'video';
      savedAt: number;
    }[];
  };
  stats: {
    oldestFavorite?: Date;
    newestFavorite?: Date;
    monthsSpanned: number;
    copyrightedCount: number;
    popularTopics: string[];
  };
}

export class NasaApodAdapter extends BaseAdapter<NasaApodData> {
  readonly appName = 'nasa';
  readonly displayName = 'NASA APOD';
  readonly icon = '🚀';

  private favorites: StoredApod[] = [];
  private readonly STORAGE_KEY = 'virgil_nasa_favorites';

  constructor() {
    super();
    // Load data asynchronously without blocking constructor
    this.loadData().catch(error => {
      this.logError('Failed to load initial data', error, 'constructor');
    });
  }

  protected async loadData(): Promise<void> {
    try {
      // Load from localStorage
      const storedData = StorageService.get<StoredApod[]>(this.STORAGE_KEY, []);
      if (Array.isArray(storedData)) {
        // Sort by savedAt timestamp (newest first)
        this.favorites = storedData.sort((a: StoredApod, b: StoredApod) => b.savedAt - a.savedAt);
      } else {
        this.favorites = [];
      }
      this.lastFetchTime = timeService.getTimestamp();
      const data = this.transformData();
      this.notifySubscribers(data);
    } catch (error) {
      this.logError('Failed to fetch NASA favorites', error, 'loadData');
      this.favorites = [];
    }

    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', this.handleStorageChange);
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key === this.STORAGE_KEY) {
      this.loadData();
    }
  };

  protected transformData(): NasaApodData {
    // Count media types
    const imageCount = this.favorites.filter(f => f.mediaType === 'image').length;
    const videoCount = this.favorites.filter(f => f.mediaType === 'video').length;
    const copyrightedCount = this.favorites.filter(f => f.copyright).length;

    // Calculate date range
    let oldestFavorite: Date | undefined;
    let newestFavorite: Date | undefined;
    let monthsSpanned = 0;

    if (this.favorites.length > 0) {
      const dates = this.favorites.map(f => timeService.parseDate(f.date) || timeService.getCurrentDateTime());
      const minTimestamp = Math.min(...dates.map(d => d.getTime())); // eslint-disable-line no-restricted-syntax
      const maxTimestamp = Math.max(...dates.map(d => d.getTime())); // eslint-disable-line no-restricted-syntax
      oldestFavorite = timeService.fromTimestamp(minTimestamp);
      newestFavorite = timeService.fromTimestamp(maxTimestamp);

      // Calculate months spanned
      const diffTime = newestFavorite.getTime() - oldestFavorite.getTime(); // eslint-disable-line no-restricted-syntax
      monthsSpanned = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    }

    // Extract popular topics from titles and explanations
    const popularTopics = this.extractPopularTopics();

    // Get recent favorites
    const recentFavorites = this.favorites.slice(0, 10).map(fav => ({
      id: fav.id,
      date: fav.date,
      title: fav.title,
      mediaType: fav.mediaType,
      savedAt: fav.savedAt,
    }));

    return {
      favorites: {
        total: this.favorites.length,
        images: imageCount,
        videos: videoCount,
        recent: recentFavorites,
      },
      stats: {
        oldestFavorite,
        newestFavorite,
        monthsSpanned,
        copyrightedCount,
        popularTopics,
      },
    };
  }

  getContextData(): AppContextData<NasaApodData> {
    this.ensureFreshData();
    const data = this.transformData();
    const summary = this.generateSummary(data);
    const isActive = this.favorites.length > 0;

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: isActive ? this.favorites[0].savedAt : 0,
      data,
      summary,
      capabilities: [
        'astronomy-images',
        'space-favorites',
        'daily-astronomy',
        'space-education',
      ],
      icon: this.icon,
    };
  }

  private extractPopularTopics(): string[] {
    if (this.favorites.length === 0) return [];

    const topicCounts: { [topic: string]: number } = {};
    const keywords = [
      'galaxy', 'nebula', 'planet', 'moon', 'sun', 'star', 'comet',
      'asteroid', 'mars', 'jupiter', 'saturn', 'hubble', 'webb',
      'black hole', 'supernova', 'eclipse', 'aurora', 'milky way',
      'iss', 'spacecraft', 'meteor',
    ];

    for (const fav of this.favorites) {
      const text = (fav.title + ' ' + fav.explanation).toLowerCase();
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        }
      }
    }

    // Return top 5 topics
    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  protected generateSummary(data: NasaApodData): string {
    if (data.favorites.total === 0) {
      return 'No space images saved yet';
    }

    const parts: string[] = [];
    parts.push(`${data.favorites.total} space favorites`);

    if (data.favorites.videos > 0) {
      parts.push(`${data.favorites.images} images, ${data.favorites.videos} videos`);
    }

    if (data.stats.popularTopics.length > 0) {
      parts.push(`featuring ${data.stats.popularTopics[0]}`);
    }

    return parts.join(', ');
  }

  getKeywords(): string[] {
    return [
      'nasa', 'space', 'astronomy', 'apod', 'galaxy', 'nebula',
      'planet', 'star', 'cosmos', 'universe', 'telescope',
      'astronomical', 'celestial', 'cosmic', 'hubble', 'webb',
      'astronaut', 'spacecraft', 'moon', 'mars', 'jupiter',
      'saturn', 'eclipse', 'comet', 'asteroid', 'supernova',
      'black hole', 'milky way', 'space image', 'space photo',
      // Cross-app concepts
      'image', 'images', 'photo', 'photos', 'picture', 'pictures',
      'favorite', 'favorites', 'saved', 'collection',
    ];
  }

  override async getResponse(query: string): Promise<string> {
    this.ensureFreshData();
    const lowerQuery = query.toLowerCase();

    // Count queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return this.getCountResponse(lowerQuery);
    }

    // Recent/latest queries
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentResponse();
    }

    // Topic-specific queries
    const topics = ['galaxy', 'nebula', 'planet', 'moon', 'star', 'hubble', 'webb', 'mars', 'jupiter'];
    for (const topic of topics) {
      if (lowerQuery.includes(topic)) {
        return this.getTopicResponse(topic);
      }
    }

    // Date range queries
    if (lowerQuery.includes('oldest') || lowerQuery.includes('first')) {
      return this.getOldestResponse();
    }

    // Video queries
    if (lowerQuery.includes('video')) {
      return this.getVideoResponse();
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getCountResponse(_query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return "You haven't saved any space images yet. Explore the NASA APOD gallery to discover amazing astronomy pictures!";
    }

    let response = `You have ${data.favorites.total} NASA APOD favorite${data.favorites.total !== 1 ? 's' : ''}`;

    if (data.favorites.videos > 0) {
      response += ` (${data.favorites.images} image${data.favorites.images !== 1 ? 's' : ''} and ${data.favorites.videos} video${data.favorites.videos !== 1 ? 's' : ''})`;
    }

    response += '.';

    if (data.stats.monthsSpanned > 12) {
      response += ` Your collection spans over ${Math.floor(data.stats.monthsSpanned / 12)} year${Math.floor(data.stats.monthsSpanned / 12) !== 1 ? 's' : ''} of astronomical discoveries!`;
    }

    return response;
  }

  private getRecentResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.recent.length === 0) {
      return 'No space images saved yet. Open NASA APOD to explore the cosmos!';
    }

    const recent = data.favorites.recent[0];
    const date = timeService.parseDate(recent.date) || timeService.getCurrentDateTime();
    const timeAgo = this.getRelativeTime(timeService.fromTimestamp(recent.savedAt));

    let response = `Your most recent space favorite is "${recent.title}" from ${timeService.formatDateToLocal(date)}, saved ${timeAgo}.`;

    if (data.favorites.recent.length > 1) {
      response += ' Recent favorites include:';
      data.favorites.recent.slice(0, 3).forEach(fav => {
        response += `\n• ${fav.title} (${timeService.formatDateToLocal(timeService.parseDate(fav.date) || timeService.getCurrentDateTime())})`;
      });
    }

    return response;
  }

  private getTopicResponse(topic: string): string {
    this.ensureFreshData();

    const matchingFavorites = this.favorites.filter(fav =>
      (fav.title + ' ' + fav.explanation).toLowerCase().includes(topic.toLowerCase()),
    );

    if (matchingFavorites.length === 0) {
      return `You don't have any ${topic}-related images in your favorites yet. NASA APOD has amazing ${topic} photos to explore!`;
    }

    let response = `You have ${matchingFavorites.length} ${topic}-related favorite${matchingFavorites.length !== 1 ? 's' : ''}`;

    if (matchingFavorites.length <= 3) {
      response += ':';
      matchingFavorites.forEach(fav => {
        response += `\n• "${fav.title}" from ${timeService.formatDateToLocal(timeService.parseDate(fav.date) || timeService.getCurrentDateTime())}`;
      });
    } else {
      response += ', including:';
      matchingFavorites.slice(0, 3).forEach(fav => {
        response += `\n• "${fav.title}"`;
      });
      response += `\n...and ${matchingFavorites.length - 3} more`;
    }

    return response;
  }

  private getOldestResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (!data.stats.oldestFavorite) {
      return 'No space images saved yet. Start building your cosmic collection!';
    }

    const oldest = this.favorites[this.favorites.length - 1];
    const date = timeService.parseDate(oldest.date) || timeService.getCurrentDateTime();

    return `Your oldest NASA APOD favorite is "${oldest.title}" from ${timeService.formatDateToLocal(date)}. ${
      data.stats.monthsSpanned > 6
        ? `You've been collecting space images for over ${data.stats.monthsSpanned} months!`
        : ''
    }`;
  }

  private getVideoResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.videos === 0) {
      return "You haven't saved any space videos yet. NASA APOD occasionally features amazing astronomy videos!";
    }

    const videoFavorites = this.favorites.filter(f => f.mediaType === 'video');
    let response = `You have ${data.favorites.videos} space video${data.favorites.videos !== 1 ? 's' : ''} saved`;

    if (videoFavorites.length <= 3) {
      response += ':';
      videoFavorites.forEach(fav => {
        response += `\n• "${fav.title}" from ${timeService.formatDateToLocal(timeService.parseDate(fav.date) || timeService.getCurrentDateTime())}`;
      });
    } else {
      response += '.';
    }

    return response;
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return 'NASA APOD: No favorites saved yet. Explore daily astronomy pictures and save your cosmic favorites!';
    }

    let response = `NASA APOD: ${data.favorites.total} space favorites`;

    if (data.stats.popularTopics.length > 0) {
      response += ` featuring ${data.stats.popularTopics.slice(0, 2).join(', ')}`;
    }

    if (data.stats.monthsSpanned > 0) {
      response += `, collected over ${data.stats.monthsSpanned} month${data.stats.monthsSpanned !== 1 ? 's' : ''}`;
    }

    response += '.';

    return response;
  }


  override async search(query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    this.ensureFreshData();

    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];

    // Search in titles and explanations
    for (const fav of this.favorites) {
      if (fav.title.toLowerCase().includes(lowerQuery) || 
          fav.explanation.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'nasa-apod',
          label: `${fav.title} (${fav.date})`,
          value: fav.title,
          field: `nasa.apod-${fav.id}`,
        });
      }
    }

    return results;
  }


  // Cross-app aggregation support
  supportsAggregation(): boolean {
    return true;
  }

  getAggregateData(): AggregateableData[] {
    this.ensureFreshData();

    const aggregateData: AggregateableData[] = [];

    // Add space images/videos
    const imageCount = this.favorites.filter(f => f.mediaType === 'image').length;
    const videoCount = this.favorites.filter(f => f.mediaType === 'video').length;

    if (imageCount > 0) {
      aggregateData.push({
        type: 'image',
        count: imageCount,
        label: 'space images',
        appName: this.appName,
        metadata: {
          copyrighted: this.favorites.filter(f => f.mediaType === 'image' && f.copyright).length,
        },
      });
    }

    if (videoCount > 0) {
      aggregateData.push({
        type: 'video',
        count: videoCount,
        label: 'space videos',
        appName: this.appName,
        metadata: {
          copyrighted: this.favorites.filter(f => f.mediaType === 'video' && f.copyright).length,
        },
      });
    }

    return aggregateData;
  }
}
