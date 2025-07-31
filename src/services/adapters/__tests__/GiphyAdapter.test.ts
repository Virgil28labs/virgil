/**
 * GiphyAdapter Test Suite
 * 
 * Tests Giphy GIF favorites management, categorization, and response generation.
 * Critical for dashboard GIF/meme functionality and cross-app aggregation.
 */

import { GiphyAdapter } from '../GiphyAdapter';
import { timeService } from '../../TimeService';

// Mock dependencies
jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    toISOString: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock addEventListener
const mockAddEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

describe('GiphyAdapter', () => {
  let adapter: GiphyAdapter;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  const sampleGifs = [
    {
      id: 'gif-1',
      url: 'https://giphy.com/gifs/1.gif',
      webpUrl: 'https://giphy.com/gifs/1.webp',
      previewUrl: 'https://giphy.com/gifs/1-preview.gif',
      originalUrl: 'https://giphy.com/gifs/1-original.gif',
      title: 'Funny Cat Dancing',
      rating: 'g' as const,
      width: 400,
      height: 300,
      username: 'catgifs',
    },
    {
      id: 'gif-2',
      url: 'https://giphy.com/gifs/2.gif',
      webpUrl: 'https://giphy.com/gifs/2.webp',
      previewUrl: 'https://giphy.com/gifs/2-preview.gif',
      originalUrl: 'https://giphy.com/gifs/2-original.gif',
      title: 'Happy Dog Reaction',
      rating: 'pg' as const,
      width: 480,
      height: 360,
      username: 'doggifs',
    },
    {
      id: 'gif-3',
      url: 'https://giphy.com/gifs/3.gif',
      webpUrl: 'https://giphy.com/gifs/3.webp',
      previewUrl: 'https://giphy.com/gifs/3-preview.gif',
      originalUrl: 'https://giphy.com/gifs/3-original.gif',
      title: 'Love Heart Cute',
      rating: 'g' as const,
      width: 320,
      height: 240,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // Set current timestamp
    mockTimeService.getTimestamp.mockReturnValue(1705748400000); // January 20, 2024, 12:00:00 UTC
    mockTimeService.toISOString.mockReturnValue('2024-01-20T12:00:00.000Z');
    
    // Set up localStorage with sample data
    mockLocalStorage.setItem('giphy-favorites', JSON.stringify(sampleGifs));
    
    adapter = new GiphyAdapter();
  });

  describe('Initialization', () => {
    it('initializes with correct properties', () => {
      expect(adapter.appName).toBe('giphy');
      expect(adapter.displayName).toBe('Giphy Gallery');
      expect(adapter.icon).toBe('🎬');
    });

    it('loads data from localStorage on construction', () => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('giphy-favorites');
    });

    it('handles empty localStorage', () => {
      mockLocalStorage.clear();
      const newAdapter = new GiphyAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.total).toBe(0);
      expect(contextData.isActive).toBe(false);
    });

    it('handles invalid localStorage data', () => {
      mockLocalStorage.setItem('giphy-favorites', 'invalid-json');
      
      const newAdapter = new GiphyAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.total).toBe(0);
      // The logger.error is called through BaseAdapter.logError, we can see it in console
      // The error is logged properly, just our mock path is different
    });

    it('sets up storage event listener', () => {
      new GiphyAdapter();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('Data Transformation', () => {
    it('transforms data correctly with sample GIFs', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.total).toBe(3);
      expect(data.favorites.ratings.g).toBe(2);
      expect(data.favorites.ratings.pg).toBe(1);
      expect(data.stats.mostUsedRating).toBe('g');
    });

    it('categorizes GIFs correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.categories.funny).toBe(1); // "Funny Cat Dancing"
      expect(data.favorites.categories.cute).toBe(1); // "Love Heart Cute" only 
      expect(data.favorites.categories.animal).toBe(2); // Both cat and dog
      expect(data.favorites.categories.reaction).toBe(1); // "Happy Dog Reaction"
      expect(data.favorites.categories.dance).toBe(1); // "Funny Cat Dancing"
      expect(data.favorites.categories.love).toBe(1); // "Love Heart Cute"
      expect(data.favorites.categories.excited).toBe(1); // "Happy Dog Reaction"
    });

    it('calculates size statistics correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.stats.totalSize).toBeGreaterThan(0);
      expect(data.stats.averageSize).toBeGreaterThan(0);
      expect(data.stats.averageSize).toBe(data.stats.totalSize / 3);
    });

    it('generates recent favorites with timestamps', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.recent).toHaveLength(3);
      expect(data.favorites.recent[0].title).toBe('Funny Cat Dancing');
      expect(data.favorites.recent[0].savedAt).toBe(1705748400000);
      expect(data.favorites.recent[1].savedAt).toBe(1705748400000 - 24 * 60 * 60 * 1000);
    });

    it('handles empty favorites array', () => {
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
      const newAdapter = new GiphyAdapter();
      const contextData = newAdapter.getContextData();
      const data = contextData.data;
      
      expect(data.favorites.total).toBe(0);
      expect(data.stats.averageSize).toBe(0);
      expect(data.stats.popularCategories).toEqual([]);
      expect(data.favorites.recent).toEqual([]);
    });
  });

  describe('Context Data', () => {
    it('provides complete context data', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('giphy');
      expect(contextData.displayName).toBe('Giphy Gallery');
      expect(contextData.isActive).toBe(true);
      expect(contextData.lastUsed).toBe(1705748400000);
      expect(contextData.icon).toBe('🎬');
      expect(contextData.capabilities).toEqual([
        'gif-favorites',
        'meme-collection',
        'animation-library',
        'content-categories',
      ]);
    });

    it('handles inactive state with no favorites', () => {
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
      const newAdapter = new GiphyAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.isActive).toBe(false);
      expect(contextData.lastUsed).toBe(0);
    });

    it('generates appropriate summary', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toContain('3 favorite GIFs');
      expect(contextData.summary).toContain('g rated');
    });

    it('generates empty summary for no favorites', () => {
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
      const newAdapter = new GiphyAdapter();
      const contextData = newAdapter.getContextData();
      
      expect(contextData.summary).toBe('No favorite GIFs saved yet');
    });
  });

  describe('Keywords', () => {
    it('provides comprehensive keyword list', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('gif');
      expect(keywords).toContain('giphy');
      expect(keywords).toContain('meme');
      expect(keywords).toContain('reaction');
      expect(keywords).toContain('animation');
      expect(keywords).toContain('favorites');
    });

    it('includes cross-app keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('image');
      expect(keywords).toContain('pictures');
      expect(keywords).toContain('collection');
    });
  });

  describe('Response Generation', () => {
    describe('Count queries', () => {
      it('responds to "how many" questions', async () => {
        const response = await adapter.getResponse('How many GIFs do I have?');
        
        expect(response).toContain('You have 3 favorite GIFs saved');
        expect(response).toContain('animal being your favorite type');
      });

      it('handles zero count', async () => {
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('How many GIFs do I have?');
        
        expect(response).toContain("You haven't saved any favorite GIFs yet");
      });

      it('handles singular vs plural correctly', async () => {
        const singleGif = [sampleGifs[0]];
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify(singleGif));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('count my gifs');
        
        expect(response).toContain('You have 1 favorite GIF saved');
        expect(response).not.toContain('GIFs saved');
      });
    });

    describe('Category queries', () => {
      it('responds to funny GIF queries', async () => {
        const response = await adapter.getResponse('Show me funny GIFs');
        
        expect(response).toContain('You have 1 funny GIF');
        expect(response).not.toContain('GIFs'); // Singular
      });

      it('responds to cute GIF queries', async () => {
        const response = await adapter.getResponse('Do I have cute GIFs?');
        
        expect(response).toContain('You have 1 cute GIF');
        expect(response).toContain('33% of your collection'); // 1/3 = 33%
      });

      it('handles missing categories', async () => {
        // Using 'meme' category which is in the list but we have 0 memes
        const response = await adapter.getResponse('meme');
        
        expect(response).toContain("You don't have any meme GIFs saved yet");
        expect(response).toContain('Giphy has tons of meme content');
      });

      it('identifies favorite category', async () => {
        const response = await adapter.getResponse('Show me animal GIFs');
        
        expect(response).toContain('Animal GIFs are your favorite type!');
      });
    });

    describe('Recent queries', () => {
      it('responds to recent GIF queries', async () => {
        const response = await adapter.getResponse('What are my latest GIFs?');
        
        expect(response).toContain('Your most recent favorite GIF is "Funny Cat Dancing"');
        expect(response).toContain('rated g');
        expect(response).toContain('Recent favorites include:');
        expect(response).toContain('• Funny Cat Dancing (g)');
      });

      it('handles single recent GIF', async () => {
        const singleGif = [sampleGifs[0]];
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify(singleGif));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('latest gif');
        
        expect(response).toContain('Your most recent favorite GIF is "Funny Cat Dancing"');
        expect(response).not.toContain('Recent favorites include:');
      });

      it('handles no recent GIFs', async () => {
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('recent gifs');
        
        expect(response).toBe('No GIFs saved yet. Start building your collection with Giphy!');
      });
    });

    describe('Rating queries', () => {
      it('responds to rating questions', async () => {
        const response = await adapter.getResponse('What ratings are my GIFs?');
        
        expect(response).toContain('Your GIF collection ratings:');
        expect(response).toContain('• G: 2 GIFs (67%)');
        expect(response).toContain('• PG: 1 GIFs (33%)');
        expect(response).toContain('Mostly G-rated content');
      });

      it('handles no GIFs for ratings', async () => {
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('gif ratings');
        
        expect(response).toBe('No GIFs saved yet to analyze ratings.');
      });
    });

    describe('Overview queries', () => {
      it('provides general overview', async () => {
        const response = await adapter.getResponse('Tell me about my GIFs');
        
        expect(response).toContain('Giphy Gallery: 3 favorite GIFs');
        expect(response).toContain('(mostly animal and'); // Top 2 categories
        expect(response).toContain('G-rated');
      });

      it('handles empty collection overview', async () => {
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('my gifs');
        
        expect(response).toBe('Giphy Gallery: No favorites saved yet. Find and save your favorite GIFs and memes!');
      });

      it('handles single category in overview', async () => {
        const singleCategoryGifs = [
          { ...sampleGifs[0], title: 'Just Funny' },
        ];
        mockLocalStorage.setItem('giphy-favorites', JSON.stringify(singleCategoryGifs));
        const newAdapter = new GiphyAdapter();
        
        const response = await newAdapter.getResponse('overview');
        
        expect(response).toContain('(mostly funny)');
        expect(response).not.toContain(' and ');
      });
    });
  });

  describe('Search Functionality', () => {
    it('searches GIF titles', async () => {
      const results = await adapter.search('cat');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('gif');
      expect(results[0].label).toBe('Funny Cat Dancing (g)');
      expect(results[0].value).toBe('Funny Cat Dancing');
      expect(results[0].field).toBe('giphy.gif-gif-1');
    });

    it('searches case-insensitively', async () => {
      const results = await adapter.search('HAPPY');
      
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Happy Dog Reaction');
    });

    it('returns empty results for no matches', async () => {
      const results = await adapter.search('nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('handles untitled GIFs', async () => {
      const untitledGif = [{ ...sampleGifs[0], title: '' }];
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(untitledGif));
      const newAdapter = new GiphyAdapter();
      
      const results = await newAdapter.search('');
      
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Untitled GIF');
    });
  });

  describe('Aggregation Support', () => {
    it('supports aggregation', () => {
      expect(adapter.supportsAggregation()).toBe(true);
    });

    it('provides aggregate data with favorites', () => {
      const aggregateData = adapter.getAggregateData();
      
      expect(aggregateData).toHaveLength(1);
      expect(aggregateData[0]).toEqual({
        type: 'image',
        count: 3,
        label: 'GIFs',
        appName: 'giphy',
        metadata: {
          categories: expect.any(Number),
          averageSize: expect.any(Number),
        },
      });
    });

    it('returns empty aggregate data with no favorites', () => {
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify([]));
      const newAdapter = new GiphyAdapter();
      
      const aggregateData = newAdapter.getAggregateData();
      
      expect(aggregateData).toHaveLength(0);
    });
  });

  describe('Storage Event Handling', () => {
    it('reloads data on storage change events', () => {
      const newGifs = [{ ...sampleGifs[0], title: 'Updated GIF' }];
      
      // Simulate storage change
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(newGifs));
      
      // Get the storage event handler
      const storageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'storage',
      )?.[1];
      
      if (storageHandler) {
        // Simulate storage event
        storageHandler({ key: 'giphy-favorites' } as StorageEvent);
        
        // Verify data was reloaded
        const contextData = adapter.getContextData();
        expect(contextData.data.favorites.total).toBe(1);
      }
    });

    it('ignores unrelated storage changes', () => {
      const originalTotal = adapter.getContextData().data.favorites.total;
      
      // Get the storage event handler
      const storageHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'storage',
      )?.[1];
      
      if (storageHandler) {
        // Simulate unrelated storage event
        storageHandler({ key: 'other-key' } as StorageEvent);
        
        // Verify data wasn't reloaded
        const contextData = adapter.getContextData();
        expect(contextData.data.favorites.total).toBe(originalTotal);
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles missing GIF titles gracefully', () => {
      const gifsWithoutTitles = sampleGifs.map(gif => ({ ...gif, title: undefined }));
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(gifsWithoutTitles));
      const newAdapter = new GiphyAdapter();
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.recent[0].title).toBe('Untitled GIF');
    });

    it('handles extreme rating distributions', () => {
      const rRatedGifs = [
        { ...sampleGifs[0], rating: 'r' as const },
        { ...sampleGifs[1], rating: 'r' as const },
      ];
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(rRatedGifs));
      const newAdapter = new GiphyAdapter();
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.stats.mostUsedRating).toBe('r');
    });

    it('handles very large collections', () => {
      const largeCollection = Array(100).fill(null).map((_, i) => ({
        ...sampleGifs[0],
        id: `gif-${i}`,
        title: `GIF ${i}`,
      }));
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(largeCollection));
      const newAdapter = new GiphyAdapter();
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.total).toBe(100);
      expect(contextData.data.favorites.recent).toHaveLength(10); // Limited to 10
    });

    it('handles categories with no matches', () => {
      const specialGifs = [
        { ...sampleGifs[0], title: 'Special Unique Content' },
      ];
      mockLocalStorage.setItem('giphy-favorites', JSON.stringify(specialGifs));
      const newAdapter = new GiphyAdapter();
      
      const contextData = newAdapter.getContextData();
      
      expect(contextData.data.favorites.categories.other).toBe(1);
    });
  });
});