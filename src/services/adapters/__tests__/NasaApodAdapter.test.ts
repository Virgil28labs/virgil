/**
 * NasaApodAdapter Comprehensive Test Suite
 * 
 * Tests NASA APOD adapter functionality including favorites management,
 * data transformation, search capabilities, and cross-app aggregation.
 */

import { NasaApodAdapter } from '../NasaApodAdapter';
import { logger } from '../../../lib/logger';
import type { MockAdapterPrivate } from '../../../test-utils/mockTypes';

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
    parseDate: jest.fn((dateStr: string) => {
      if (!dateStr) return null;
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    }),
    formatDateToLocal: jest.fn((_date: Date) => 'December 20, 2023'),
    fromTimestamp: jest.fn((timestamp: number) => new Date(timestamp)),
    formatDate: jest.fn((_date: Date) => 'December 20, 2023'),
    getTimeAgo: jest.fn((date: Date) => {
      const now = 1703020800000;
      const diff = now - date.getTime();
      if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return `${Math.floor(diff / 86400000)} days ago`;
    }),
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

describe('NasaApodAdapter', () => {
  let adapter: NasaApodAdapter;
  const mockStoredApods = [
    {
      id: '2023-12-20',
      date: '2023-12-20',
      title: 'Galaxy M87 from Hubble',
      imageUrl: 'https://apod.nasa.gov/apod/image/2312/m87_hubble.jpg',
      hdImageUrl: 'https://apod.nasa.gov/apod/image/2312/m87_hubble_hd.jpg',
      mediaType: 'image' as const,
      explanation: 'A massive galaxy with a supermassive black hole at its center.',
      copyright: 'NASA, ESA, Hubble',
      savedAt: 1703020800000,
    },
    {
      id: '2023-12-19',
      date: '2023-12-19',
      title: 'Mars Exploration Video',
      imageUrl: 'https://apod.nasa.gov/apod/image/2312/mars_video.mp4',
      mediaType: 'video' as const,
      explanation: 'Stunning footage of Mars surface from the Perseverance rover.',
      savedAt: 1702934400000,
    },
    {
      id: '2023-12-18',
      date: '2023-12-18',
      title: 'Nebula NGC 6302',
      imageUrl: 'https://apod.nasa.gov/apod/image/2312/ngc6302.jpg',
      mediaType: 'image' as const,
      explanation: 'The Bug Nebula captured by the Webb Space Telescope.',
      copyright: 'NASA, ESA, Webb',
      savedAt: 1702848000000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Set up default localStorage data
    localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(mockStoredApods));
    
    adapter = new NasaApodAdapter();
  });

  describe('Constructor and Initialization', () => {
    it('initializes with stored favorites', () => {
      const contextData = adapter.getContextData();
      expect(contextData.data.favorites.total).toBe(3);
      expect(contextData.data.favorites.images).toBe(2);
      expect(contextData.data.favorites.videos).toBe(1);
    });

    it('initializes with empty favorites when no storage', () => {
      localStorageMock.clear();
      const newAdapter = new NasaApodAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.total).toBe(0);
      expect(contextData.isActive).toBe(false);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('virgil_nasa_favorites', 'invalid json');
      const newAdapter = new NasaApodAdapter();
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch NASA favorites',
        expect.any(Error),
        expect.objectContaining({ action: 'loadData', component: 'nasaAdapter' }),
      );
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBe(0);
    });

    it('sets up storage event listener', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('Data Transformation', () => {
    it('correctly counts media types', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.total).toBe(3);
      expect(data.favorites.images).toBe(2);
      expect(data.favorites.videos).toBe(1);
    });

    it('calculates statistics correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.stats.copyrightedCount).toBe(2);
      expect(data.stats.oldestFavorite).toBeDefined();
      expect(data.stats.newestFavorite).toBeDefined();
      expect(data.stats.monthsSpanned).toBeGreaterThanOrEqual(0);
    });

    it('extracts popular topics', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.stats.popularTopics).toContain('galaxy');
      expect(data.stats.popularTopics).toContain('mars');
      expect(data.stats.popularTopics).toContain('hubble');
    });

    it('sorts recent favorites by savedAt timestamp', () => {
      const contextData = adapter.getContextData();
      const recent = contextData.data.favorites.recent;
      
      expect(recent[0].id).toBe('2023-12-20'); // Most recent
      expect(recent[1].id).toBe('2023-12-19');
      expect(recent[2].id).toBe('2023-12-18');
    });

    it('limits recent favorites to 10 items', () => {
      // Create adapter with many favorites
      const manyFavorites = Array.from({ length: 15 }, (_, i) => ({
        id: `2023-12-${20 - i}`,
        date: `2023-12-${20 - i}`,
        title: `Space Image ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        mediaType: 'image' as const,
        explanation: 'Test explanation',
        savedAt: 1703020800000 - (i * 86400000),
      }));
      
      localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(manyFavorites));
      const newAdapter = new NasaApodAdapter();
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.recent).toHaveLength(10);
    });
  });

  describe('Context Data Generation', () => {
    it('provides complete context data when active', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('nasa');
      expect(contextData.displayName).toBe('NASA APOD');
      expect(contextData.isActive).toBe(true);
      expect(contextData.icon).toBe('🚀');
      expect(contextData.lastUsed).toBe(1703020800000);
      expect(contextData.capabilities).toContain('astronomy-images');
      expect(contextData.capabilities).toContain('space-favorites');
      expect(contextData.summary).toContain('3 space favorites');
    });

    it('provides inactive context when no favorites', () => {
      localStorageMock.clear();
      const newAdapter = new NasaApodAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.isActive).toBe(false);
      expect(contextData.lastUsed).toBe(0);
      expect(contextData.summary).toBe('No space images saved yet');
    });
  });

  describe('Summary Generation', () => {
    it('generates comprehensive summary with topics', () => {
      const contextData = adapter.getContextData();
      expect(contextData.summary).toMatch(/3 space favorites.*featuring galaxy/);
    });

    it('includes video count in summary', () => {
      const contextData = adapter.getContextData();
      expect(contextData.summary).toContain('2 images, 1 videos');
    });

    it('handles empty state', () => {
      localStorageMock.clear();
      const newAdapter = new NasaApodAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.summary).toBe('No space images saved yet');
    });
  });

  describe('Query Response Generation', () => {
    it('handles count queries', async () => {
      const response = await adapter.getResponse('how many space images do I have?');
      expect(response).toContain('You have 3 NASA APOD favorites');
      expect(response).toContain('2 images and 1 video');
    });

    it('handles recent queries', async () => {
      const response = await adapter.getResponse('show me recent space images');
      expect(response).toContain('Galaxy M87 from Hubble');
      expect(response).toContain('December 20, 2023');
    });

    it('handles topic-specific queries', async () => {
      const response = await adapter.getResponse('show me galaxy images');
      expect(response).toContain('1 galaxy-related favorite');
      expect(response).toContain('Galaxy M87 from Hubble');
    });

    it('handles oldest queries', async () => {
      const response = await adapter.getResponse('what is my oldest space image?');
      expect(response).toContain('Nebula NGC 6302');
      expect(response).toContain('oldest NASA APOD favorite');
    });

    it('handles video queries', async () => {
      const response = await adapter.getResponse('show me space videos');
      expect(response).toContain('You have 1 space video saved');
      expect(response).toContain('Mars Exploration Video');
    });

    it('provides overview for general queries', async () => {
      const response = await adapter.getResponse('tell me about my space collection');
      expect(response).toContain('NASA APOD: 3 space favorites');
      expect(response).toContain('featuring galaxy'); // Should include at least the first popular topic
    });

    it('handles empty state responses', async () => {
      localStorageMock.clear();
      const newAdapter = new NasaApodAdapter();
      
      const response = await newAdapter.getResponse('how many space images?');
      expect(response).toContain("You haven't saved any space images yet");
    });
  });

  describe('Search Functionality', () => {
    it('searches in titles and explanations', async () => {
      const results = await adapter.search('galaxy');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'nasa-apod',
        label: 'Galaxy M87 from Hubble (2023-12-20)',
        value: 'Galaxy M87 from Hubble',
        field: 'nasa.apod-2023-12-20',
      });
    });

    it('handles case insensitive search', async () => {
      const results = await adapter.search('MARS');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Mars Exploration Video');
    });

    it('returns empty results for no matches', async () => {
      const results = await adapter.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('searches in explanations', async () => {
      const results = await adapter.search('supermassive');
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Galaxy M87 from Hubble');
    });
  });

  describe('Cross-App Aggregation', () => {
    it('supports aggregation', () => {
      expect(adapter.supportsAggregation()).toBe(true);
    });

    it('provides aggregate data for images and videos', () => {
      const aggregateData = adapter.getAggregateData();
      
      expect(aggregateData).toHaveLength(2);
      
      const imageData = aggregateData.find(item => item.type === 'image');
      expect(imageData).toEqual({
        type: 'image',
        count: 2,
        label: 'space images',
        appName: 'nasa',
        metadata: {
          copyrighted: 2,
        },
      });
      
      const videoData = aggregateData.find(item => item.type === 'video');
      expect(videoData).toEqual({
        type: 'video',
        count: 1,
        label: 'space videos',
        appName: 'nasa',
        metadata: {
          copyrighted: 0,
        },
      });
    });

    it('handles empty state in aggregation', () => {
      localStorageMock.clear();
      const newAdapter = new NasaApodAdapter();
      
      const aggregateData = newAdapter.getAggregateData();
      expect(aggregateData).toHaveLength(0);
    });
  });

  describe('Keywords and Confidence', () => {
    it('provides comprehensive space-related keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('nasa');
      expect(keywords).toContain('space');
      expect(keywords).toContain('astronomy');
      expect(keywords).toContain('galaxy');
      expect(keywords).toContain('hubble');
      expect(keywords).toContain('image');
      expect(keywords).toContain('favorite');
    });

    it('returns high confidence for exact matches', async () => {
      const confidence = await adapter.getConfidence('nasa space images');
      expect(confidence).toBe(0.9);
    });

    it('returns partial confidence for partial matches', async () => {
      const confidence = await adapter.getConfidence('astronomical');
      expect(confidence).toBe(0.9); // Should match as exact word
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
      
      // Simulate storage change
      const mockEvent = {
        key: 'virgil_nasa_favorites',
        newValue: JSON.stringify([mockStoredApods[0]]),
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

    it('handles malformed date parsing', () => {
      const corruptedData = [{
        ...mockStoredApods[0],
        date: 'invalid-date',
      }];
      
      localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(corruptedData));
      const newAdapter = new NasaApodAdapter();
      
      // Should not crash and should handle gracefully
      const contextData = newAdapter.getContextData();
      expect(contextData.data.favorites.total).toBe(1);
    });

    it('handles empty explanation text', () => {
      const dataWithEmptyExplanation = [{
        ...mockStoredApods[0],
        explanation: '',
      }];
      
      localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(dataWithEmptyExplanation));
      const newAdapter = new NasaApodAdapter();
      
      const results = newAdapter.search('galaxy');
      expect(results).toBeDefined();
    });

    it('handles missing copyright fields', () => {
      const dataWithoutCopyright = mockStoredApods.map(item => {
        const { copyright: _copyright, ...rest } = item;
        return rest;
      });
      
      localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(dataWithoutCopyright));
      const newAdapter = new NasaApodAdapter();
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.stats.copyrightedCount).toBe(0);
    });

    it('handles very long topic queries', async () => {
      const longQuery = 'galaxy'.repeat(100);
      const response = await adapter.getResponse(longQuery);
      expect(response).toContain('galaxy-related');
    });

    it('handles queries with special characters', async () => {
      const specialQuery = 'space & astronomy!';
      const response = await adapter.getResponse(specialQuery);
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
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
    it('handles large datasets efficiently', () => {
      // Create 100 fake favorites
      const largeFavorites = Array.from({ length: 100 }, (_, i) => ({
        id: `2023-${String(i).padStart(3, '0')}`,
        date: `2023-01-${String((i % 30) + 1).padStart(2, '0')}`,
        title: `Space Image ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        mediaType: i % 5 === 0 ? 'video' as const : 'image' as const,
        explanation: `Explanation for space object ${i} with various astronomical terms`,
        savedAt: 1703020800000 - (i * 86400000),
      }));
      
      localStorageMock.setItem('virgil_nasa_favorites', JSON.stringify(largeFavorites));
      const newAdapter = new NasaApodAdapter();
      
      const startTime = performance.now();
      const contextData = newAdapter.getContextData();
      const endTime = performance.now();
      
      expect(contextData.data.favorites.total).toBe(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });
});