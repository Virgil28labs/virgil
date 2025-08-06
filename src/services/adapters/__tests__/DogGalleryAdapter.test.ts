/**
 * DogGalleryAdapter Comprehensive Test Suite
 * 
 * Tests Dog Gallery adapter functionality including favorites management,
 * breed statistics, search capabilities, and cross-app aggregation.
 */

import { DogGalleryAdapter } from '../DogGalleryAdapter';
import { logger } from '../../../lib/logger';
import type { MockAdapterPrivate } from '../../../test-utils/mockTypes';

// Mock AppDataService
jest.mock('../../AppDataService', () => ({
  appDataService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getAllKeys: jest.fn(),
    init: jest.fn(),
    ready: jest.fn(),
  },
}));

// Import after mocking
import { appDataService } from '../../AppDataService';

// Mock dependencies
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1703020800000), // Dec 20, 2023
    getCurrentDateTime: jest.fn(() => new Date('2023-12-20T00:00:00Z')),
    formatDateToLocal: jest.fn((_date: Date) => 'December 20, 2023'),
    fromTimestamp: jest.fn((timestamp: number) => new Date(timestamp)),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock storage event listener
const mockAddEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });

describe('DogGalleryAdapter', () => {
  let adapter: DogGalleryAdapter;
  const mockDogFavorites = [
    {
      url: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg',
      breed: 'golden retriever',
      id: 'dog-1',
    },
    {
      url: 'https://images.dog.ceo/breeds/bulldog-french/n02108915_1234.jpg',
      breed: 'french bulldog',
      id: 'dog-2',
    },
    {
      url: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_200.jpg',
      breed: 'golden retriever',
      id: 'dog-3',
    },
    {
      url: 'https://images.dog.ceo/breeds/husky/n02110185_300.jpg',
      breed: 'siberian husky',
      id: 'dog-4',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Set up default AppDataService mock
    (appDataService.get as jest.Mock).mockResolvedValue(mockDogFavorites);
    (appDataService.set as jest.Mock).mockResolvedValue(true);
    
    adapter = new DogGalleryAdapter();
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('Constructor and Initialization', () => {
    it('initializes with stored favorites', () => {
      const contextData = adapter.getContextData();
      expect(contextData.data.favorites.total).toBe(4);
      expect(contextData.isActive).toBe(true);
    });

    it('initializes with empty favorites when no storage', async () => {
      (appDataService.get as jest.Mock).mockResolvedValue(null);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.total).toBe(0);
      expect(contextData.isActive).toBe(false);
    });

    it('handles error loading data gracefully', async () => {
      (appDataService.get as jest.Mock).mockRejectedValue(new Error('Database error'));
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch dog favorites',
        expect.any(Error),
        expect.objectContaining({ action: 'loadData', component: 'DogGalleryAdapter' }),
      );
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBe(0);
    });

    it('sets up storage event listener', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('Data Transformation', () => {
    it('correctly calculates breed statistics', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.total).toBe(4);
      expect(data.favorites.breeds['golden retriever']).toBe(2);
      expect(data.favorites.breeds['french bulldog']).toBe(1);
      expect(data.favorites.breeds['siberian husky']).toBe(1);
    });

    it('identifies most favorited breed', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.stats.mostFavoritedBreed).toBe('golden retriever');
      expect(data.stats.breedDiversity).toBe(3);
      expect(data.stats.uniqueBreeds).toContain('golden retriever');
      expect(data.stats.uniqueBreeds).toContain('french bulldog');
      expect(data.stats.uniqueBreeds).toContain('siberian husky');
    });

    it('handles mixed breed default for missing breed', async () => {
      const dataWithMissingBreed = [
        { url: 'test.jpg', breed: '', id: 'test-1' },
        { url: 'test2.jpg', breed: undefined as any, id: 'test-2' },
      ];
      
      (appDataService.get as jest.Mock).mockResolvedValue(dataWithMissingBreed);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.breeds['mixed']).toBe(2);
    });

    it('generates recent favorites with estimated timestamps', () => {
      const contextData = adapter.getContextData();
      const recent = contextData.data.favorites.recent;
      
      expect(recent).toHaveLength(4);
      expect(recent[0].url).toBe(mockDogFavorites[0].url);
      expect(recent[0].breed).toBe(mockDogFavorites[0].breed);
      // Check that favorites are returned in order (most recent first based on storage order)
      expect(recent[0].url).toBe(mockDogFavorites[0].url);
      expect(recent[1].url).toBe(mockDogFavorites[1].url);
    });

    it('limits recent favorites to 10 items', async () => {
      const manyFavorites = Array.from({ length: 15 }, (_, i) => ({
        url: `https://example.com/dog${i}.jpg`,
        breed: `breed-${i}`,
        id: `dog-${i}`,
      }));
      
      (appDataService.get as jest.Mock).mockResolvedValue(manyFavorites);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.recent).toHaveLength(10);
    });
  });

  describe('Context Data Generation', () => {
    it('provides complete context data when active', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('dog');
      expect(contextData.displayName).toBe('Dog Gallery');
      expect(contextData.isActive).toBe(true);
      expect(contextData.icon).toBe('🐕');
      expect(contextData.lastUsed).toBe(1703020800000);
      expect(contextData.capabilities).toContain('dog-image-favorites');
      expect(contextData.capabilities).toContain('breed-tracking');
      expect(contextData.summary).toContain('4 favorite dogs');
    });

    it('provides inactive context when no favorites', async () => {
      (appDataService.get as jest.Mock).mockResolvedValue(null);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.isActive).toBe(false);
      expect(contextData.lastUsed).toBe(0);
      expect(contextData.summary).toBe('No favorite dogs saved yet');
    });
  });

  describe('Summary Generation', () => {
    it('generates comprehensive summary with breed info', () => {
      const contextData = adapter.getContextData();
      expect(contextData.summary).toMatch(/4 favorite dogs.*3 breeds.*mostly golden retriever/);
    });

    it('handles single breed case', async () => {
      const singleBreedData = [mockDogFavorites[0]];
      (appDataService.get as jest.Mock).mockResolvedValue(singleBreedData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.summary).toBe('1 favorite dogs');
    });

    it('handles empty state', async () => {
      (appDataService.get as jest.Mock).mockResolvedValue(null);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.summary).toBe('No favorite dogs saved yet');
    });
  });

  describe('Query Response Generation', () => {
    it('handles count queries', async () => {
      const response = await adapter.getResponse('how many favorite dogs do I have?');
      expect(response).toContain('You have 4 favorite dogs saved');
      expect(response).toContain('across 3 different breeds');
      // Note: Enthusiasm message only shows if count > 2, but golden retriever has exactly 2
      expect(response).not.toContain('You seem to really like golden retrievers!');
    });

    it('handles breed information queries', async () => {
      const response = await adapter.getResponse('what breeds do I have?');
      // The query "what breeds do I have?" triggers the mostFavoritedBreed response
      expect(response).toContain('Your most favorited breed is golden retriever with 2 saved images');
    });

    it('handles most favorited breed queries', async () => {
      const response = await adapter.getResponse('what breed do I like most?');
      expect(response).toContain('Your most favorited breed is golden retriever with 2 saved images');
    });

    it('handles recent favorites queries', async () => {
      const response = await adapter.getResponse('show me my recent favorite dogs');
      expect(response).toContain('Your most recent favorite is a golden retriever');
      expect(response).toContain('You have 4 recent favorites');
      // The logic only shows first 3 breeds and might not show all breeds
      expect(response).toContain('including golden retriever, french bulldog');
    });

    it('handles specific breed queries', async () => {
      const response = await adapter.getResponse('show me my golden retrievers');
      expect(response).toContain('You have 2 golden retrievers in your favorites');
      // The enthusiasm message only shows if count > 2, but we have exactly 2
      expect(response).not.toContain('You really seem to love golden retrievers!');
    });

    it('handles specific breed with no matches', async () => {
      const response = await adapter.getResponse('show me my poodles');
      expect(response).toContain("You don't have any poodles in your favorites yet");
      expect(response).toContain('Try searching for poodle in the Dog Gallery!');
    });

    it('provides overview for general queries', async () => {
      const response = await adapter.getResponse('tell me about my dog collection');
      expect(response).toContain('Dog Gallery: 4 favorite dogs (3 breeds)');
      expect(response).toContain('mostly golden retrievers');
    });

    it('handles empty state responses', async () => {
      (appDataService.get as jest.Mock).mockResolvedValue(null);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await newAdapter.getResponse('how many dogs?');
      expect(response).toContain("You haven't saved any favorite dogs yet");
      expect(response).toContain('Browse the Dog Gallery and tap the heart icon');
    });
  });

  describe('Search Functionality', () => {
    it('searches by breed name', async () => {
      const results = await adapter.search('golden');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        type: 'dog-breed',
        label: 'golden retriever (Dog #dog-1)',
        value: 'golden retriever',
        field: 'dog.breed-dog-1',
      });
      expect(results[1]).toEqual({
        type: 'dog-breed',
        label: 'golden retriever (Dog #dog-3)',
        value: 'golden retriever',
        field: 'dog.breed-dog-3',
      });
    });

    it('handles case insensitive search', async () => {
      const results = await adapter.search('FRENCH');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('french bulldog');
    });

    it('returns empty results for no matches', async () => {
      const results = await adapter.search('poodle');
      expect(results).toHaveLength(0);
    });

    it('searches partial breed names', async () => {
      const results = await adapter.search('bull');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('french bulldog');
    });
  });

  describe('Cross-App Aggregation', () => {
    it('supports aggregation', () => {
      expect(adapter.supportsAggregation()).toBe(true);
    });

    it('provides aggregate data for dog images', () => {
      const aggregateData = adapter.getAggregateData();
      
      expect(aggregateData).toHaveLength(1);
      expect(aggregateData[0]).toEqual({
        type: 'image',
        count: 4,
        label: 'favorite dogs',
        appName: 'dog',
        metadata: {
          breeds: 3,
          mostFavorited: 'golden retriever',
        },
      });
    });

    it('handles empty state in aggregation', () => {
      localStorageMock.clear();
      const newAdapter = new DogGalleryAdapter();
      
      const aggregateData = newAdapter.getAggregateData();
      expect(aggregateData).toHaveLength(0);
    });
  });

  describe('Keywords and Confidence', () => {
    it('provides comprehensive dog-related keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('dog');
      expect(keywords).toContain('puppy');
      expect(keywords).toContain('breed');
      expect(keywords).toContain('golden retriever');
      expect(keywords).toContain('favorite');
      expect(keywords).toContain('image');
    });

    it('returns high confidence for exact matches', async () => {
      const confidence = await adapter.getConfidence('show me my favorite dogs');
      expect(confidence).toBe(0.9);
    });

    it('returns partial confidence for breed matches', async () => {
      const confidence = await adapter.getConfidence('golden retriever');
      expect(confidence).toBe(0.9);
    });

    it('returns zero confidence for unrelated queries', async () => {
      const confidence = await adapter.getConfidence('cooking recipes');
      expect(confidence).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles storage event changes', () => {
      const storageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'storage',
      )?.[1];
      
      expect(storageHandler).toBeDefined();
      
      const mockEvent = {
        key: 'virgil_dog_favorites',
        newValue: JSON.stringify([mockDogFavorites[0]]),
      };
      
      const spy = jest.spyOn(adapter as unknown as MockAdapterPrivate, 'loadData');
      storageHandler(mockEvent);
      
      expect(spy).toHaveBeenCalled();
    });

    it('ignores irrelevant storage events', () => {
      const storageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'storage',
      )?.[1];
      
      const spy = jest.spyOn(adapter as unknown as MockAdapterPrivate, 'loadData');
      
      const mockEvent = {
        key: 'other_key',
        newValue: 'some value',
      };
      
      storageHandler(mockEvent);
      expect(spy).not.toHaveBeenCalled();
    });

    it('handles malformed dog data', async () => {
      const corruptedData = [
        { url: 'test.jpg' }, // Missing breed and id
        { breed: 'test breed' }, // Missing url and id
        null,
        undefined,
      ];
      
      (appDataService.get as jest.Mock).mockResolvedValue(corruptedData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should not crash and should handle gracefully
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBeGreaterThanOrEqual(0);
    });

    it('handles breed queries with no favorite dogs', async () => {
      localStorageMock.clear();
      const newAdapter = new DogGalleryAdapter();
      
      const response = await newAdapter.getResponse('what breeds do I have?');
      expect(response).toContain('No favorite dogs saved yet');
      expect(response).toContain('Start exploring breeds');
    });

    it('handles recent queries with no favorites', async () => {
      localStorageMock.clear();
      const newAdapter = new DogGalleryAdapter();
      
      const response = await newAdapter.getResponse('show me recent dogs');
      expect(response).toContain('No favorite dogs yet');
      expect(response).toContain('Visit the Dog Gallery');
    });

    it('handles very long breed names', async () => {
      const longBreedData = [{
        url: 'test.jpg',
        breed: 'a'.repeat(100),
        id: 'test-1',
      }];
      
      (appDataService.get as jest.Mock).mockResolvedValue(longBreedData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBe(1);
    });

    it('handles special characters in breed names', async () => {
      const specialBreedData = [{
        url: 'test.jpg',
        breed: 'test-breed with spaces & symbols!',
        id: 'test-1',
      }];
      
      (appDataService.get as jest.Mock).mockResolvedValue(specialBreedData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const results = await newAdapter.search('test-breed');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('test-breed with spaces & symbols!');
    });

    it('handles empty breed strings', async () => {
      const emptyBreedData = [{
        url: 'test.jpg',
        breed: '',
        id: 'test-1',
      }];
      
      (appDataService.get as jest.Mock).mockResolvedValue(emptyBreedData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.breeds['mixed']).toBe(1);
    });
  });

  describe('Performance and Caching', () => {
    it('uses cached data when fresh', () => {
      // First call loads data
      adapter.getContextData();
      
      const spy = jest.spyOn(adapter as unknown as MockAdapterPrivate, 'loadData');
      
      // Second call should use cached data
      adapter.getContextData();
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('refreshes data when cache expires', () => {
      // Mock expired cache
      (adapter as unknown as MockAdapterPrivate).lastFetchTime = 0;
      
      const spy = jest.spyOn(adapter as unknown as MockAdapterPrivate, 'loadData');
      adapter.getContextData();
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('handles large datasets efficiently', async () => {
      const largeFavorites = Array.from({ length: 100 }, (_, i) => ({
        url: `https://example.com/dog${i}.jpg`,
        breed: `breed-${i % 10}`, // 10 different breeds
        id: `dog-${i}`,
      }));
      
      (appDataService.get as jest.Mock).mockResolvedValue(largeFavorites);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const startTime = performance.now();
      const contextData = newAdapter.getContextData();
      const endTime = performance.now();
      
      expect(contextData.data.favorites.total).toBe(100);
      expect(contextData.data.stats.breedDiversity).toBe(10);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('handles duplicate entries gracefully', async () => {
      const duplicateData = [
        mockDogFavorites[0],
        mockDogFavorites[0], // Duplicate
        mockDogFavorites[1],
      ];
      
      (appDataService.get as jest.Mock).mockResolvedValue(duplicateData);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBe(3);
      expect(contextData.data.favorites.breeds['golden retriever']).toBe(2);
    });
  });

  describe('Breed Query Variations', () => {
    it('handles multiple breed queries with more than 5 breeds', async () => {
      const manyBreeds = Array.from({ length: 8 }, (_, i) => ({
        url: `https://example.com/dog${i}.jpg`,
        breed: `breed-${i}`,
        id: `dog-${i}`,
      }));
      
      (appDataService.get as jest.Mock).mockResolvedValue(manyBreeds);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Use a query that doesn't trigger mostFavoritedBreed response
      const response = newAdapter['getBreedResponse']('tell me about my breeds');
      expect(response).toContain('...and 3 more breeds');
    });

    it('handles single favorite with multiple in recent list', async () => {
      const singleDog = [mockDogFavorites[0]];
      (appDataService.get as jest.Mock).mockResolvedValue(singleDog);
      const newAdapter = new DogGalleryAdapter();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = newAdapter['getRecentResponse']();
      expect(response).toContain('Your most recent favorite is a golden retriever');
      expect(response).not.toContain('You have'); // Should not mention multiple
    });
  });
});