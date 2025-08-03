/**
 * DogGalleryAdapter - Dashboard App Adapter for Dog Gallery
 *
 * Provides unified access to dog gallery favorites for Virgil AI assistant,
 * enabling responses about saved dog images, breeds, and favorites.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData, AggregateableData } from '../DashboardAppService';
import { timeService } from '../TimeService';

interface DogImage {
  url: string;
  breed: string;
  id: string;
}

interface DogGalleryData {
  favorites: {
    total: number;
    breeds: {
      [breed: string]: number;
    };
    recent: {
      url: string;
      breed: string;
      id: string;
    }[];
  };
  stats: {
    mostFavoritedBreed?: string;
    breedDiversity: number;
    uniqueBreeds: string[];
  };
}

export class DogGalleryAdapter extends BaseAdapter<DogGalleryData> {
  readonly appName = 'dog';
  readonly displayName = 'Dog Gallery';
  readonly icon = '🐕';

  private favorites: DogImage[] = [];
  private readonly STORAGE_KEY = 'virgil_dog_favorites';

  constructor() {
    super();
    // Load data asynchronously without blocking constructor
    this.loadData().catch(error => {
      this.logError('Failed to load initial data', error, 'constructor');
    });
  }

  protected async loadData(): Promise<void> {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        this.favorites = JSON.parse(storedData);
      } else {
        this.favorites = [];
      }
      this.lastFetchTime = timeService.getTimestamp();
      const data = this.transformData();
      this.notifySubscribers(data);
    } catch (error) {
      this.logError('Failed to fetch dog favorites', error, 'loadData');
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

  protected transformData(): DogGalleryData {
    // Calculate breed statistics
    const breedCounts: { [breed: string]: number } = {};
    this.favorites.forEach(dog => {
      const breed = dog.breed || 'mixed';
      breedCounts[breed] = (breedCounts[breed] || 0) + 1;
    });

    // Find most favorited breed
    const [mostFavoritedBreed] = Object.entries(breedCounts)
      .sort(([, a], [, b]) => b - a)[0] || [undefined, 0];

    // Get unique breeds
    const uniqueBreeds = Object.keys(breedCounts);

    // Get recent favorites
    const recentFavorites = this.favorites.slice(0, 10).map(dog => ({
      url: dog.url,
      breed: dog.breed,
      id: dog.id,
    }));

    return {
      favorites: {
        total: this.favorites.length,
        breeds: breedCounts,
        recent: recentFavorites,
      },
      stats: {
        mostFavoritedBreed,
        breedDiversity: uniqueBreeds.length,
        uniqueBreeds,
      },
    };
  }

  getContextData(): AppContextData<DogGalleryData> {
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
        'dog-image-favorites',
        'breed-tracking',
        'favorite-management',
        'breed-statistics',
      ],
      icon: this.icon,
    };
  }

  protected generateSummary(data: DogGalleryData): string {
    if (data.favorites.total === 0) {
      return 'No favorite dogs saved yet';
    }

    const parts: string[] = [];
    parts.push(`${data.favorites.total} favorite dogs`);

    if (data.stats.breedDiversity > 1) {
      parts.push(`${data.stats.breedDiversity} breeds`);
    }

    if (data.stats.mostFavoritedBreed) {
      const count = data.favorites.breeds[data.stats.mostFavoritedBreed];
      if (count > 1) {
        parts.push(`mostly ${data.stats.mostFavoritedBreed}`);
      }
    }

    return parts.join(', ');
  }

  getKeywords(): string[] {
    return [
      'dog', 'dogs', 'puppy', 'puppies', 'pup', 'doggo',
      'breed', 'breeds', 'favorite dog', 'saved dog',
      'pet', 'pets', 'canine', 'hound',
      'golden retriever', 'labrador', 'poodle', 'bulldog',
      'beagle', 'husky', 'corgi', 'terrier',
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
      return this.getCountResponse();
    }

    // Breed queries
    if (lowerQuery.includes('breed')) {
      return this.getBreedResponse(lowerQuery);
    }

    // Recent favorites
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentResponse();
    }

    // Specific breed queries
    const breedNames = ['retriever', 'labrador', 'poodle', 'bulldog', 'beagle',
      'husky', 'corgi', 'terrier', 'shepherd', 'spaniel'];
    for (const breed of breedNames) {
      if (lowerQuery.includes(breed)) {
        return this.getSpecificBreedResponse(breed);
      }
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getCountResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return "You haven't saved any favorite dogs yet. Browse the Dog Gallery and tap the heart icon on dogs you love!";
    }

    let response = `You have ${data.favorites.total} favorite dog${data.favorites.total !== 1 ? 's' : ''} saved`;

    if (data.stats.breedDiversity > 1) {
      response += ` across ${data.stats.breedDiversity} different breeds`;
    }

    response += '.';

    if (data.stats.mostFavoritedBreed && data.favorites.breeds[data.stats.mostFavoritedBreed] > 2) {
      response += ` You seem to really like ${data.stats.mostFavoritedBreed}s!`;
    }

    return response;
  }

  private getBreedResponse(query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return 'No favorite dogs saved yet. Start exploring breeds in the Dog Gallery!';
    }

    if (query.includes('what breed') || query.includes('which breed')) {
      if (data.stats.mostFavoritedBreed) {
        const count = data.favorites.breeds[data.stats.mostFavoritedBreed];
        return `Your most favorited breed is ${data.stats.mostFavoritedBreed} with ${count} saved image${count !== 1 ? 's' : ''}.`;
      }
    }

    // List all breeds
    let response = `You have favorites from ${data.stats.breedDiversity} breed${data.stats.breedDiversity !== 1 ? 's' : ''}:`;

    const sortedBreeds = Object.entries(data.favorites.breeds)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 breeds

    sortedBreeds.forEach(([breed, count]) => {
      response += `\n• ${breed}: ${count} photo${count !== 1 ? 's' : ''}`;
    });

    if (Object.keys(data.favorites.breeds).length > 5) {
      response += `\n...and ${Object.keys(data.favorites.breeds).length - 5} more breeds`;
    }

    return response;
  }

  private getRecentResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.recent.length === 0) {
      return 'No favorite dogs yet. Visit the Dog Gallery to discover adorable pups!';
    }

    const recent = data.favorites.recent[0];
    let response = `Your most recent favorite is a ${recent.breed}`;

    if (data.favorites.recent.length > 1) {
      response += `. You have ${data.favorites.recent.length} recent favorites`;

      // Show variety in recent favorites
      const recentBreeds = new Set(data.favorites.recent.slice(0, 3).map(d => d.breed));
      if (recentBreeds.size > 1) {
        response += ` including ${Array.from(recentBreeds).join(', ')}`;
      }
    }

    response += '.';
    return response;
  }

  private getSpecificBreedResponse(breed: string): string {
    this.ensureFreshData();

    // Find all favorites matching the breed
    const matchingDogs = this.favorites.filter(dog =>
      dog.breed.toLowerCase().includes(breed.toLowerCase()),
    );

    if (matchingDogs.length === 0) {
      return `You don't have any ${breed}s in your favorites yet. Try searching for ${breed} in the Dog Gallery!`;
    }

    const exactBreed = matchingDogs[0].breed;
    return `You have ${matchingDogs.length} ${exactBreed}${matchingDogs.length !== 1 ? 's' : ''} in your favorites. ${
      matchingDogs.length > 2 ? `You really seem to love ${exactBreed}s!` : ''
    }`;
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.favorites.total === 0) {
      return 'Dog Gallery: No favorites saved yet. Browse and save your favorite good boys and girls!';
    }

    let response = `Dog Gallery: ${data.favorites.total} favorite dogs`;

    if (data.stats.breedDiversity > 1) {
      response += ` (${data.stats.breedDiversity} breeds)`;
    }

    if (data.stats.mostFavoritedBreed) {
      response += `, mostly ${data.stats.mostFavoritedBreed}s`;
    }

    response += '.';

    return response;
  }

  override async search(query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    this.ensureFreshData();

    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];

    // Search by breed
    this.favorites.forEach(dog => {
      if (dog.breed.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'dog-breed',
          label: `${dog.breed} (Dog #${dog.id})`,
          value: dog.breed,
          field: `dog.breed-${dog.id}`,
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

    // Add dog image count
    if (this.favorites.length > 0) {
      aggregateData.push({
        type: 'image',
        count: this.favorites.length,
        label: 'favorite dogs',
        appName: this.appName,
        metadata: {
          breeds: Object.keys(this.getContextData().data.favorites.breeds).length,
          mostFavorited: this.getContextData().data.stats.mostFavoritedBreed,
        },
      });
    }

    return aggregateData;
  }
}
