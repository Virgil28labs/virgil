/**
 * GiphyAdapter - Dashboard App Adapter for Giphy Gallery
 *
 * Provides unified access to Giphy GIF favorites for Virgil AI assistant,
 * enabling responses about saved GIFs, memes, and animated content.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData, AggregateableData } from '../DashboardAppService';
import { timeService } from '../TimeService';
interface GiphyImage {
  id: string;
  url: string;
  webpUrl: string;
  previewUrl: string;
  originalUrl: string;
  title: string;
  rating: 'g' | 'pg' | 'pg-13' | 'r';
  width: number;
  height: number;
  username?: string;
}

interface GiphyData {
  favorites: {
    total: number;
    categories: {
      [category: string]: number;
    };
    ratings: {
      g: number;
      pg: number;
      'pg-13': number;
      r: number;
    };
    recent: {
      id: string;
      title: string;
      rating: string;
      savedAt?: number;
    }[];
  };
  stats: {
    popularCategories: string[];
    mostUsedRating: string;
    averageSize: number;
    totalSize: number;
  };
}

export class GiphyAdapter extends BaseAdapter<GiphyData> {
  readonly appName = 'giphy';
  readonly displayName = 'Giphy Gallery';
  readonly icon = '🎬';

  private favorites: GiphyImage[] = [];
  private readonly STORAGE_KEY = 'giphy-favorites';

  constructor() {
    super();
    this.loadData();
  }

  protected loadData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.favorites = JSON.parse(stored) as GiphyImage[];
      } else {
        this.favorites = [];
      }
      this.lastFetchTime = timeService.getTimestamp();
      const data = this.transformData();
      this.notifySubscribers(data);
    } catch (error) {
      this.logError('Failed to fetch Giphy favorites', error, 'loadData');
      this.favorites = [];
    }

    // Set up storage listener for real-time updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.STORAGE_KEY) {
        this.loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
  }

  protected transformData(): GiphyData {
    // Categorize GIFs based on titles
    const categories = this.categorizeGifs();

    // Count ratings
    const ratings = {
      g: 0,
      pg: 0,
      'pg-13': 0,
      r: 0,
    };

    let totalSize = 0;
    this.favorites.forEach(gif => {
      ratings[gif.rating]++;
      // Estimate size based on dimensions
      const estimatedSize = (gif.width * gif.height * 4) / 1024; // KB estimate
      totalSize += estimatedSize;
    });

    // Find most used rating
    const mostUsedRating = Object.entries(ratings)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'pg';

    // Get popular categories
    const popularCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    // Get recent favorites (estimate saved time)
    const recentFavorites = this.favorites.slice(0, 10).map((gif, index) => ({
      id: gif.id,
      title: gif.title || 'Untitled GIF',
      rating: gif.rating,
      savedAt: timeService.getTimestamp() - (index * 24 * 60 * 60 * 1000), // Each older by 1 day
    }));

    return {
      favorites: {
        total: this.favorites.length,
        categories,
        ratings,
        recent: recentFavorites,
      },
      stats: {
        popularCategories,
        mostUsedRating,
        averageSize: this.favorites.length > 0 ? totalSize / this.favorites.length : 0,
        totalSize,
      },
    };
  }

  getContextData(): AppContextData<GiphyData> {
    this.ensureFreshData();
    const data = this.transformData();
    const summary = this.generateSummary(data);
    const isActive = this.favorites.length > 0;

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: isActive ? timeService.getTimestamp() : 0,
      data,
      summary,
      capabilities: [
        'gif-favorites',
        'meme-collection',
        'animation-library',
        'content-categories',
      ],
      icon: this.icon,
    };
  }

  private categorizeGifs(): { [category: string]: number } {
    const categories: { [category: string]: number } = {};

    const categoryKeywords = {
      'funny': ['funny', 'lol', 'laugh', 'humor', 'comedy'],
      'reaction': ['reaction', 'react', 'response', 'mood'],
      'meme': ['meme', 'viral', 'trending'],
      'cute': ['cute', 'adorable', 'aww', 'sweet'],
      'animal': ['cat', 'dog', 'pet', 'animal', 'puppy', 'kitten'],
      'excited': ['excited', 'happy', 'joy', 'celebrate', 'party'],
      'sad': ['sad', 'cry', 'tears', 'upset'],
      'dance': ['dance', 'dancing', 'moves', 'groove'],
      'love': ['love', 'heart', 'romance', 'kiss'],
      'wow': ['wow', 'amazing', 'awesome', 'incredible'],
    };

    this.favorites.forEach(gif => {
      const title = (gif.title || '').toLowerCase();
      let categorized = false;

      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => title.includes(keyword))) {
          categories[category] = (categories[category] || 0) + 1;
          categorized = true;
        }
      });

      if (!categorized) {
        categories['other'] = (categories['other'] || 0) + 1;
      }
    });

    return categories;
  }

  protected generateSummary(data: GiphyData): string {
    if (data.favorites.total === 0) {
      return 'No favorite GIFs saved yet';
    }

    const parts: string[] = [];
    parts.push(`${data.favorites.total} favorite GIFs`);

    if (data.stats.popularCategories.length > 0) {
      parts.push(`mostly ${data.stats.popularCategories[0]}`);
    }

    parts.push(`${data.stats.mostUsedRating} rated`);

    return parts.join(', ');
  }

  getKeywords(): string[] {
    return [
      'gif', 'gifs', 'giphy', 'meme', 'memes', 'animation',
      'animated', 'reaction', 'funny', 'cute', 'dance',
      'sticker', 'emoji', 'mood', 'feeling',
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

    // Category queries
    const categories = ['funny', 'reaction', 'meme', 'cute', 'animal', 'dance', 'love'];
    for (const category of categories) {
      if (lowerQuery.includes(category)) {
        return this.getCategoryResponse(category);
      }
    }

    // Recent queries
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentResponse();
    }

    // Rating queries
    if (lowerQuery.includes('rating') || lowerQuery.includes('rated')) {
      return this.getRatingResponse();
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getCountResponse(_query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return "You haven't saved any favorite GIFs yet. Explore Giphy to find hilarious animations!";
    }

    let response = `You have ${data.favorites.total} favorite GIF${data.favorites.total !== 1 ? 's' : ''} saved`;

    if (data.stats.popularCategories.length > 0) {
      response += `, with ${data.stats.popularCategories[0]} being your favorite type`;
    }

    response += '.';

    return response;
  }

  private getCategoryResponse(category: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    const count = data.favorites.categories[category] || 0;

    if (count === 0) {
      return `You don't have any ${category} GIFs saved yet. Giphy has tons of ${category} content to explore!`;
    }

    let response = `You have ${count} ${category} GIF${count !== 1 ? 's' : ''} in your favorites`;

    const percentage = Math.round((count / data.favorites.total) * 100);
    if (percentage > 20) {
      response += ` (${percentage}% of your collection)`;
    }

    response += '.';

    if (category === data.stats.popularCategories[0]) {
      response += ` ${category.charAt(0).toUpperCase() + category.slice(1)} GIFs are your favorite type!`;
    }

    return response;
  }

  private getRecentResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.recent.length === 0) {
      return 'No GIFs saved yet. Start building your collection with Giphy!';
    }

    const recent = data.favorites.recent[0];
    let response = `Your most recent favorite GIF is "${recent.title}" (rated ${recent.rating})`;

    if (data.favorites.recent.length > 1) {
      response += '. Recent favorites include:';
      data.favorites.recent.slice(0, 3).forEach(gif => {
        response += `\n• ${gif.title} (${gif.rating})`;
      });
    } else {
      response += '.';
    }

    return response;
  }

  private getRatingResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return 'No GIFs saved yet to analyze ratings.';
    }

    let response = 'Your GIF collection ratings:';

    Object.entries(data.favorites.ratings).forEach(([rating, count]) => {
      if (count > 0) {
        const percentage = Math.round((count / data.favorites.total) * 100);
        response += `\n• ${rating.toUpperCase()}: ${count} GIFs (${percentage}%)`;
      }
    });

    response += `\n\nMostly ${data.stats.mostUsedRating.toUpperCase()}-rated content.`;

    return response;
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return 'Giphy Gallery: No favorites saved yet. Find and save your favorite GIFs and memes!';
    }

    let response = `Giphy Gallery: ${data.favorites.total} favorite GIFs`;

    if (data.stats.popularCategories.length > 0) {
      response += ` (mostly ${data.stats.popularCategories.slice(0, 2).join(' and ')})`;
    }

    response += `, ${data.stats.mostUsedRating.toUpperCase()}-rated`;

    response += '.';

    return response;
  }

  override async search(query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    this.ensureFreshData();

    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];

    // Search in titles
    this.favorites.forEach(gif => {
      const title = (gif.title || '').toLowerCase();
      if (title.includes(lowerQuery)) {
        results.push({
          type: 'gif',
          label: `${gif.title} (${gif.rating})`  ,
          value: gif.title || 'Untitled GIF',
          field: `giphy.gif-${gif.id}`,
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
    this.ensureFreshData();

    const aggregateData: AggregateableData[] = [];

    // Add GIF count
    if (this.favorites.length > 0) {
      aggregateData.push({
        type: 'image',
        count: this.favorites.length,
        label: 'GIFs',
        appName: this.appName,
        metadata: {
          categories: Object.keys(this.getContextData().data.favorites.categories).length,
          averageSize: this.getContextData().data.stats.averageSize,
        },
      });
    }

    return aggregateData;
  }
}
