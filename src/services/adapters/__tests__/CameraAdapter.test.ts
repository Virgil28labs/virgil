/**
 * CameraAdapter Test Suite
 * 
 * Tests the Camera adapter service that provides unified access to camera photos,
 * storage management, favorites, and photo statistics for Virgil AI assistant.
 */

import { CameraAdapter } from '../CameraAdapter';
import { PhotoStorage } from '../../../components/camera/utils/photoStorage';
import { timeService } from '../../TimeService';
import type { SavedPhoto } from '../../../types/camera.types';

// Mock dependencies
jest.mock('../../../components/camera/utils/photoStorage', () => ({
  PhotoStorage: {
    getAllPhotos: jest.fn(),
    getPhoto: jest.fn(),
    savePhoto: jest.fn(),
    deletePhoto: jest.fn(),
    toggleFavorite: jest.fn(),
    updatePhoto: jest.fn(),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1642672800000), // Fixed timestamp
    fromTimestamp: jest.fn((ts: number) => new Date(ts)),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
    startOfDay: jest.fn(() => new Date('2024-01-20T00:00:00')),
    subtractDays: jest.fn((date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
    subtractMonths: jest.fn((date: Date, months: number) => {
      const result = new Date(date);
      result.setMonth(result.getMonth() - months);
      return result;
    }),
    toISOString: jest.fn((date?: Date) => (date || new Date()).toISOString()),
    formatDateToLocal: jest.fn((date: Date) => date.toLocaleDateString()),
    getTimeAgo: jest.fn(() => '2 hours ago'),
  },
}));

const mockPhotoStorage = PhotoStorage as jest.Mocked<typeof PhotoStorage>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('CameraAdapter', () => {
  let adapter: CameraAdapter;

  // Sample test data
  const mockPhotos: SavedPhoto[] = [
    {
      id: 'photo-1',
      dataUrl: 'data:image/jpeg;base64,mockdata1',
      timestamp: 1642672800000, // 2024-01-20 12:00:00
      isFavorite: true,
      name: 'Sunset Photo',
      tags: ['sunset', 'nature'],
      size: 1024 * 500, // 500KB
      width: 1920,
      height: 1080,
    },
    {
      id: 'photo-2',
      dataUrl: 'data:image/jpeg;base64,mockdata2',
      timestamp: 1642586400000, // 2024-01-19 12:00:00
      isFavorite: false,
      name: 'Selfie',
      tags: ['selfie'],
      size: 1024 * 300, // 300KB
      width: 1080,
      height: 1920,
    },
    {
      id: 'photo-3',
      dataUrl: 'data:image/jpeg;base64,mockdata3',
      timestamp: 1642500000000, // 2024-01-18 12:00:00
      isFavorite: true,
      name: 'Group Photo',
      tags: ['friends', 'party'],
      size: 1024 * 800, // 800KB
      width: 1600,
      height: 1200,
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Default to successful photo loading
    mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
    
    // Create new adapter instance and wait for initialization
    adapter = new CameraAdapter();
    // Wait a bit for async loadData to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Adapter Properties', () => {
    it('has correct app configuration', () => {
      expect(adapter.appName).toBe('camera');
      expect(adapter.displayName).toBe('Camera');
      expect(adapter.icon).toBe('📸');
    });

    it('returns correct keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('photo');
      expect(keywords).toContain('camera');
      expect(keywords).toContain('gallery');
      expect(keywords).toContain('favorite');
      expect(keywords).toContain('storage');
      expect(keywords).toContain('selfie');
      expect(keywords.length).toBeGreaterThan(10);
    });

    it('returns correct capabilities', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.capabilities).toEqual([
        'photo-capture',
        'photo-storage',
        'favorites-management',
        'photo-organization',
        'storage-tracking',
      ]);
    });
  });

  describe('Data Loading', () => {
    it('loads photos successfully from PhotoStorage', async () => {
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockPhotoStorage.getAllPhotos).toHaveBeenCalled();
      
      const contextData = adapter.getContextData();
      expect(contextData.data.photos.total).toBe(3);
    });

    it('handles PhotoStorage errors gracefully', async () => {
      mockPhotoStorage.getAllPhotos.mockRejectedValue(new Error('Storage error'));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      // Should fall back to empty photos array
      expect(contextData.data.photos.total).toBe(0);
    });

    it('sets timestamp when data is loaded', async () => {
      new CameraAdapter(); // adapter instance created to trigger initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('calculates correct photo counts', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.total).toBe(3);
      expect(contextData.data.photos.favorites).toBe(2); // photo-1 and photo-3 are favorites
    });

    it('calculates correct storage usage', () => {
      const contextData = adapter.getContextData();
      
      // Total size: 500KB + 300KB + 800KB = 1600KB = 1.56MB
      expect(contextData.data.storage.usedMB).toBeCloseTo(1.56, 2);
      expect(contextData.data.storage.maxMB).toBe(50);
      expect(contextData.data.storage.usedPercentage).toBeCloseTo(3.1, 1); // 1.56/50 * 100
    });

    it('provides recent photos in correct order', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.recent).toHaveLength(3);
      expect(contextData.data.photos.recent[0].id).toBe('photo-1'); // Most recent
      expect(contextData.data.photos.recent[0].name).toBe('Sunset Photo');
      expect(contextData.data.photos.recent[0].isFavorite).toBe(true);
    });

    it('limits recent photos to 10', async () => {
      // Create more than 10 photos
      const manyPhotos = Array.from({ length: 15 }, (_, i) => ({
        id: `photo-${i}`,
        dataUrl: `data:image/jpeg;base64,mockdata${i}`,
        timestamp: 1642672800000 - i * 1000,
        isFavorite: false,
        size: 1024 * 100,
      }));
      
      mockPhotoStorage.getAllPhotos.mockResolvedValue(manyPhotos);
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.recent).toHaveLength(10);
    });

    it('calculates time-based statistics correctly', async () => {
      // Our mockPhotos timestamps:
      // photo-1: 1642672800000 (2022-01-20 12:00:00 GMT)
      // photo-2: 1642586400000 (2022-01-19 12:00:00 GMT) 
      // photo-3: 1642500000000 (2022-01-18 12:00:00 GMT)
      
      // Mock time service with compatible dates
      mockTimeService.startOfDay.mockReturnValue(new Date(1642636800000)); // 2022-01-20 00:00:00 GMT
      mockTimeService.subtractDays.mockReturnValue(new Date(1642377600000)); // 2022-01-17 00:00:00 GMT (all photos after)
      mockTimeService.subtractMonths.mockReturnValue(new Date(1640044800000)); // 2021-12-21 00:00:00 GMT (all photos after)
      
      // Reset photo data to ensure consistency
      mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      // Only photo-1 (1642672800000) >= startOfDay.getTime() (1642636800000)
      expect(contextData.data.stats.todayCount).toBe(1);
      
      // All photos >= subtractDays.getTime() (1642377600000)
      expect(contextData.data.stats.weekCount).toBe(3);
      
      // All photos >= subtractMonths.getTime() (1640044800000)  
      expect(contextData.data.stats.monthCount).toBe(3);
    });

    it('handles empty photo array', async () => {
      mockPhotoStorage.getAllPhotos.mockResolvedValue([]);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.total).toBe(0);
      expect(contextData.data.photos.favorites).toBe(0);
      expect(contextData.data.photos.recent).toHaveLength(0);
      expect(contextData.data.storage.usedMB).toBe(0);
      expect(contextData.data.stats.todayCount).toBe(0);
      expect(contextData.data.stats.oldestPhoto).toBeUndefined();
      expect(contextData.data.stats.newestPhoto).toBeUndefined();
    });

    it('calculates oldest and newest photo dates', () => {
      const contextData = adapter.getContextData();
      
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(1642672800000); // newest (photo-1)
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(1642500000000); // oldest (photo-3)
      
      expect(contextData.data.stats.newestPhoto).toBeDefined();
      expect(contextData.data.stats.oldestPhoto).toBeDefined();
    });
  });

  describe('Context Data Generation', () => {
    it('marks app as active when photos taken in last week', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(true); // weekCount > 0
    });

    it('marks app as inactive when no recent photos', async () => {
      mockPhotoStorage.getAllPhotos.mockResolvedValue([]);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(false); // weekCount = 0
    });

    it('sets lastUsed to most recent photo timestamp', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.lastUsed).toBe(1642672800000); // photo-1 timestamp
    });

    it('sets lastUsed to 0 when no photos', async () => {
      mockPhotoStorage.getAllPhotos.mockResolvedValue([]);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.lastUsed).toBe(0);
    });

    it('includes app metadata correctly', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('camera');
      expect(contextData.displayName).toBe('Camera');
      expect(contextData.icon).toBe('📸');
    });
  });

  describe('Summary Generation', () => {
    it('returns no photos message for empty state', async () => {
      mockPhotoStorage.getAllPhotos.mockResolvedValue([]);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('No photos saved yet');
    });

    it('generates comprehensive summary with all info', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 photos, 2 favorites, 1 today, 1.56MB used');
    });

    it('omits favorites when none exist', async () => {
      const photosNoFavorites = mockPhotos.map(p => ({ ...p, isFavorite: false }));
      mockPhotoStorage.getAllPhotos.mockResolvedValue(photosNoFavorites);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 photos, 1 today, 1.56MB used');
    });

    it('omits today count when zero', async () => {
      // Mock startOfDay to be after all photos
      mockTimeService.startOfDay.mockReturnValue(new Date('2024-01-21T00:00:00'));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 photos, 2 favorites, 1.56MB used');
    });
  });

  describe('Query Response System', () => {
    beforeEach(async () => {
      // Reset time mocks for consistent behavior
      mockTimeService.startOfDay.mockReturnValue(new Date(1642636800000)); // 2022-01-20 00:00:00 GMT
      mockTimeService.subtractDays.mockReturnValue(new Date(1642377600000)); // 2022-01-17 00:00:00 GMT
      mockTimeService.subtractMonths.mockReturnValue(new Date(1640044800000)); // 2021-12-21 00:00:00 GMT
      mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
      
      // Set up consistent data for query tests
      adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('responds to count queries', async () => {
      const response = await adapter.getResponse('How many photos do I have?');
      
      expect(response).toContain('3 photos');
      expect(response).toContain('saved in your gallery');
    });

    it('responds to recent photos queries', async () => {
      const response = await adapter.getResponse('Show me recent photos');
      
      expect(response).toContain('most recent photo');
      expect(response).toContain('Sunset Photo');
      expect(response).toContain('2 hours ago');
    });

    it('responds to favorites queries', async () => {
      const response = await adapter.getResponse('What are my favorite photos?');
      
      expect(response).toContain('2 favorite photos');
      expect(response).toContain('Sunset Photo');
      expect(response).toContain('Group Photo');
    });

    it('responds to storage queries', async () => {
      const response = await adapter.getResponse('How much storage am I using?');
      
      expect(response).toContain('1.56MB');
      expect(response).toContain('50MB');
      expect(response).toContain('3.1%');
    });

    it('responds to time-based queries', async () => {
      const response = await adapter.getResponse('Photos from today');
      
      expect(response).toContain('1 photo');
      expect(response).toContain('today');
    });

    it('provides overview response for general queries', async () => {
      const response = await adapter.getResponse('Tell me about my photos');
      
      expect(response).toContain('Camera gallery');
      expect(response).toContain('3 photos');
      expect(response).toContain('2 favorites');
    });

    it('handles no photos state in queries', async () => {
      mockPhotoStorage.getAllPhotos.mockResolvedValue([]);
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const response = await adapter.getResponse('How many photos?');
      
      expect(response).toContain("You haven't saved any photos yet");
    });
  });

  describe('Response Message Variations', () => {
    it('handles singular vs plural photos correctly', async () => {
      // Test with single photo
      mockPhotoStorage.getAllPhotos.mockResolvedValue([mockPhotos[0]]);
      let adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      let response = await adapter.getResponse('count');
      expect(response).toContain('1 photo');
      expect(response).not.toContain('1 photos');

      // Test with multiple photos
      mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
      adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      response = await adapter.getResponse('count');
      expect(response).toContain('3 photos');
    });

    it('handles singular vs plural favorites correctly', async () => {
      // Test with single favorite
      const singleFavorite = [{ ...mockPhotos[0], isFavorite: true }];
      mockPhotoStorage.getAllPhotos.mockResolvedValue(singleFavorite);
      let adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      let response = await adapter.getResponse('favorites');
      expect(response).toContain('1 favorite photo');

      // Test with multiple favorites
      mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
      adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      response = await adapter.getResponse('favorites');
      expect(response).toContain('2 favorite photos');
    });

    it('provides encouraging messages for storage usage', async () => {
      // Test low storage usage
      const smallPhotos = [{ ...mockPhotos[0], size: 1024 * 10 }]; // 10KB
      mockPhotoStorage.getAllPhotos.mockResolvedValue(smallPhotos);
      let adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      let response = await adapter.getResponse('storage');
      expect(response).toContain('plenty of storage space available');

      // Test high storage usage (simulate 46MB usage - over 90% of 50MB limit)
      const largePhotos = Array.from({ length: 6 }, (_, i) => ({
        ...mockPhotos[0],
        id: `large-${i}`,
        size: 1024 * 1024 * 7.7, // ~7.7MB each = ~46MB total (>90% of 50MB)
      }));
      mockPhotoStorage.getAllPhotos.mockResolvedValue(largePhotos);
      adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      response = await adapter.getResponse('storage');
      expect(response).toContain('Storage is getting full');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('searches for photos by name', async () => {
      const results = await adapter.search('sunset');
      
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('photo');
      expect(results[0].label).toBe('Sunset Photo');
      expect(results[0].value).toBe('⭐ Favorite');
      expect(results[0].field).toBe('camera.photo-1');
    });

    it('searches for photos by tags', async () => {
      const results = await adapter.search('nature');
      
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('photo');
      expect(results[0].label).toBe('Sunset Photo');
      expect(results[0].field).toBe('camera.photo-1');
    });

    it('searches for photos by multiple criteria', async () => {
      const results = await adapter.search('selfie');
      
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('photo');
      expect(results[0].label).toBe('Selfie');
      expect(results[0].field).toBe('camera.photo-2');
    });

    it('returns no results for non-matching search terms', async () => {
      const results = await adapter.search('nonexistent'); // This won't match any names or tags
      
      expect(results.length).toBe(0); // No photos have "nonexistent" in name or tags
    });

    it('returns empty results for non-matching queries', async () => {
      const results = await adapter.search('invalid query xyz');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Time-Based Statistics', () => {
    it('calculates today count correctly', async () => {
      // Mock startOfDay to include only photo-1
      mockTimeService.startOfDay.mockReturnValue(new Date(1642672800000 - 1000));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.todayCount).toBe(1);
    });

    it('calculates week count correctly', async () => {
      // Mock subtractDays to include all photos
      mockTimeService.subtractDays.mockReturnValue(new Date(1642500000000 - 1000));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.weekCount).toBe(3);
    });

    it('calculates month count correctly', async () => {
      // Mock subtractMonths to include all photos
      mockTimeService.subtractMonths.mockReturnValue(new Date(1642500000000 - 1000));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.monthCount).toBe(3);
    });

    it('handles edge case with exact timestamp boundaries', async () => {
      // Test photo at exact boundary
      const boundaryPhoto = {
        ...mockPhotos[0],
        timestamp: 1642672800000, // Exact start of day
      };
      
      mockPhotoStorage.getAllPhotos.mockResolvedValue([boundaryPhoto]);
      mockTimeService.startOfDay.mockReturnValue(new Date(1642672800000));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.todayCount).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles PhotoStorage initialization errors', async () => {
      mockPhotoStorage.getAllPhotos.mockRejectedValue(new Error('DB initialization failed'));
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      // Should gracefully handle error and return empty state
      expect(contextData.data.photos.total).toBe(0);
      expect(contextData.data.storage.usedMB).toBe(0);
      expect(contextData.isActive).toBe(false);
    });

    it('handles photos with missing size information', async () => {
      const photosWithoutSize = mockPhotos.map(p => ({ ...p, size: undefined }));
      mockPhotoStorage.getAllPhotos.mockResolvedValue(photosWithoutSize);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.storage.usedMB).toBe(0);
      expect(contextData.data.storage.usedPercentage).toBe(0);
    });

    it('handles photos with zero size', async () => {
      const photosWithZeroSize = mockPhotos.map(p => ({ ...p, size: 0 }));
      mockPhotoStorage.getAllPhotos.mockResolvedValue(photosWithZeroSize);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.storage.usedMB).toBe(0);
    });

    it('handles very large photo collections efficiently', async () => {
      // Create 1000 photos
      const manyPhotos = Array.from({ length: 1000 }, (_, i) => ({
        id: `photo-${i}`,
        dataUrl: `data:image/jpeg;base64,mock${i}`,
        timestamp: 1642672800000 - i * 1000,
        isFavorite: i % 5 === 0, // Every 5th photo is favorite
        size: 1024 * 100, // 100KB each
      }));
      
      mockPhotoStorage.getAllPhotos.mockResolvedValue(manyPhotos);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.total).toBe(1000);
      expect(contextData.data.photos.favorites).toBe(200); // 1000/5
      expect(contextData.data.photos.recent).toHaveLength(10); // Limited to 10
      expect(contextData.data.storage.usedMB).toBeCloseTo(97.66, 2); // 1000 * 100KB
    });

    it('ensures data freshness on multiple calls', async () => {
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Make multiple calls
      adapter.getContextData();
      adapter.getContextData();
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });

    it('handles malformed photo data gracefully', async () => {
      const malformedPhotos = [
        { id: 'photo-1', dataUrl: '', timestamp: 1642672800000, isFavorite: false }, // Valid but minimal
        { id: 'photo-2', dataUrl: '', timestamp: 1642586400000, isFavorite: false }, // Valid but minimal
      ] as any;
      
      mockPhotoStorage.getAllPhotos.mockResolvedValue(malformedPhotos);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(() => adapter.getContextData()).not.toThrow();
      const contextData = adapter.getContextData();
      expect(contextData.data.photos.total).toBe(2);
    });
  });

  describe('Time Service Integration', () => {
    it('uses timeService for all timestamp operations', async () => {
      new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
      expect(mockTimeService.startOfDay).toHaveBeenCalled();
      expect(mockTimeService.subtractDays).toHaveBeenCalled();
      expect(mockTimeService.subtractMonths).toHaveBeenCalled();
    });

    it('converts timestamps to dates correctly', async () => {
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      adapter.getContextData();
      
      // Should call fromTimestamp for oldest and newest photos
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(1642672800000);
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(1642500000000);
    });
  });

  describe('Photo Data Validation', () => {
    it('handles photos without optional fields', async () => {
      const minimalPhotos = [
        {
          id: 'minimal-1',
          dataUrl: 'data:image/jpeg;base64,minimal',
          timestamp: 1642672800000,
          isFavorite: false,
          // No name, tags, size, width, height
        },
      ];
      
      mockPhotoStorage.getAllPhotos.mockResolvedValue(minimalPhotos);
      
      const adapter = new CameraAdapter();
      await new Promise(resolve => setTimeout(resolve, 10));
      const contextData = adapter.getContextData();
      
      expect(contextData.data.photos.total).toBe(1);
      expect(contextData.data.photos.recent[0].name).toBeUndefined();
      expect(contextData.data.photos.recent[0].tags).toBeUndefined();
      expect(contextData.data.storage.usedMB).toBe(0); // No size
    });

    it('preserves all photo metadata in recent photos', () => {
      const contextData = adapter.getContextData();
      const recentPhoto = contextData.data.photos.recent[0];
      
      expect(recentPhoto.id).toBe('photo-1');
      expect(recentPhoto.timestamp).toBe(1642672800000);
      expect(recentPhoto.name).toBe('Sunset Photo');
      expect(recentPhoto.size).toBe(1024 * 500);
      expect(recentPhoto.isFavorite).toBe(true);
      expect(recentPhoto.tags).toEqual(['sunset', 'nature']);
    });
  });
});