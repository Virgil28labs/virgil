/**
 * NasaApodAdapter - Dashboard App Adapter for NASA APOD
 * 
 * Provides unified access to NASA Astronomy Picture of the Day favorites
 * for Virgil AI assistant, enabling responses about space images and astronomy.
 */

import type { AppDataAdapter, AppContextData, AggregateableData } from '../DashboardAppService';
import { logger } from '../../lib/logger';

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

export class NasaApodAdapter implements AppDataAdapter<NasaApodData> {
  readonly appName = 'nasa';
  readonly displayName = 'NASA APOD';
  readonly icon = '🚀';
  
  private favorites: StoredApod[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly STORAGE_KEY = 'virgil_nasa_favorites';
  private listeners: ((data: NasaApodData) => void)[] = [];

  constructor() {
    this.refreshData();
  }

  private refreshData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredApod[];
        // Sort by savedAt timestamp (newest first)
        this.favorites = parsed.sort((a, b) => b.savedAt - a.savedAt);
      } else {
        this.favorites = [];
      }
      this.lastFetchTime = Date.now();
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to fetch NASA favorites', error as Error, {
        component: 'NasaApodAdapter',
        action: 'fetchData',
      });
      this.favorites = [];
    }
  }

  private ensureFreshData(): void {
    if (Date.now() - this.lastFetchTime > this.CACHE_DURATION) {
      this.refreshData();
    }
  }

  getContextData(): AppContextData<NasaApodData> {
    this.ensureFreshData();
    
    // Count media types
    const imageCount = this.favorites.filter(f => f.mediaType === 'image').length;
    const videoCount = this.favorites.filter(f => f.mediaType === 'video').length;
    const copyrightedCount = this.favorites.filter(f => f.copyright).length;
    
    // Calculate date range
    let oldestFavorite: Date | undefined;
    let newestFavorite: Date | undefined;
    let monthsSpanned = 0;
    
    if (this.favorites.length > 0) {
      const dates = this.favorites.map(f => new Date(f.date));
      oldestFavorite = new Date(Math.min(...dates.map(d => d.getTime())));
      newestFavorite = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Calculate months spanned
      const diffTime = newestFavorite.getTime() - oldestFavorite.getTime();
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

    const data: NasaApodData = {
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
    
    this.favorites.forEach(fav => {
      const text = (fav.title + ' ' + fav.explanation).toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        }
      });
    });
    
    // Return top 5 topics
    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private generateSummary(data: NasaApodData): string {
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

  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    
    return keywords.some(keyword => lowerQuery.includes(keyword));
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

  async getResponse(query: string): Promise<string> {
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
    const date = new Date(recent.date);
    const timeAgo = this.getTimeAgo(new Date(recent.savedAt));
    
    let response = `Your most recent space favorite is "${recent.title}" from ${date.toLocaleDateString()}, saved ${timeAgo}.`;
    
    if (data.favorites.recent.length > 1) {
      response += ' Recent favorites include:';
      data.favorites.recent.slice(0, 3).forEach(fav => {
        response += `\n• ${fav.title} (${new Date(fav.date).toLocaleDateString()})`;
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
        response += `\n• "${fav.title}" from ${new Date(fav.date).toLocaleDateString()}`;
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
    const date = new Date(oldest.date);
    
    return `Your oldest NASA APOD favorite is "${oldest.title}" from ${date.toLocaleDateString()}. ${
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
        response += `\n• "${fav.title}" from ${new Date(fav.date).toLocaleDateString()}`;
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
    this.ensureFreshData();
    
    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    // Search in titles and explanations
    this.favorites.forEach(fav => {
      let relevance = 0;
      
      if (fav.title.toLowerCase().includes(lowerQuery)) {
        relevance += 100;
      }
      
      if (fav.explanation.toLowerCase().includes(lowerQuery)) {
        relevance += 50;
      }
      
      if (relevance > 0) {
        results.push({
          id: fav.id,
          type: 'nasa-apod',
          title: fav.title,
          date: fav.date,
          mediaType: fav.mediaType,
          relevance,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  subscribe(callback: (data: NasaApodData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.STORAGE_KEY) {
        this.refreshData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      window.removeEventListener('storage', handleStorageChange);
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