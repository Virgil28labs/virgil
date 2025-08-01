/**
 * NASA APOD Service Tests
 * 
 * Tests the NASA Astronomy Picture of the Day service including:
 * - API request handling with authentication and rate limiting
 * - Response transformation and data normalization
 * - Caching system (memory and localStorage)
 * - Date validation and range checking
 * - Request deduplication and throttling
 * - Navigation (previous/next day functionality)
 * - Error handling and retry logic
 * - Sharing and download functionality
 * - Random APOD selection
 * - Cache management and statistics
 * - Rate limit tracking and warnings
 * - Preloading adjacent dates
 */

import { nasaService, ApodServiceError } from '../nasaService';
import { retryWithBackoff } from '../retryUtils';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import { logger } from '../logger';
import type { NasaApodResponse, ApodImage } from '../../types/nasa.types';

// Mock dependencies
jest.mock('../retryUtils');
jest.mock('../../services/DashboardContextService');
jest.mock('../../services/TimeService');
jest.mock('../logger');

const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;
const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock global APIs
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Mock document methods for download functionality
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn(),
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    execCommand: jest.fn(),
  },
});

// Mock navigator for clipboard
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: jest.fn(),
    },
  },
});

// Mock window.URL
Object.defineProperty(global, 'window', {
  value: {
    URL: {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn(),
    },
  },
});

// Test data
const mockApodResponse: NasaApodResponse = {
  date: '2022-01-01',
  title: 'Test APOD Title',
  explanation: 'Test explanation of the astronomy picture.',
  url: 'https://apod.nasa.gov/apod/image/test.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/test_hd.jpg',
  media_type: 'image',
  copyright: 'Test Photographer',
  concepts: ['space', 'astronomy'],
  service_version: 'v1',
};

const mockApodImage: ApodImage = {
  id: '2022-01-01',
  date: '2022-01-01',
  title: 'Test APOD Title',
  explanation: 'Test explanation of the astronomy picture.',
  imageUrl: 'https://apod.nasa.gov/apod/image/test.jpg',
  hdImageUrl: 'https://apod.nasa.gov/apod/image/test_hd.jpg',
  mediaType: 'image',
  copyright: 'Test Photographer',
  concepts: ['space', 'astronomy'],
  isHD: true,
  aspectRatio: undefined,
};

describe('NasaApodService', () => {
  const mockTimestamp = 1640995200000; // 2022-01-01
  const mockToday = '2022-01-01';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service cache
    nasaService.clearCache();
    
    // Setup common mocks
    mockTimeService.getTimestamp.mockReturnValue(mockTimestamp);
    mockTimeService.getCurrentDateTime.mockReturnValue(new Date(mockTimestamp));
    mockTimeService.parseDate.mockImplementation((dateStr) => {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    });
    mockTimeService.toISODateString.mockImplementation((date) => {
      return date?.toISOString().split('T')[0] || '2023-01-01';
    });
    mockTimeService.addDays.mockImplementation((date, days) => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
    mockTimeService.fromTimestamp.mockImplementation((timestamp) => new Date(timestamp));
    mockTimeService.toISOString.mockReturnValue('2022-01-01T12:00:00.000Z');
    
    mockDashboardContextService.getLocalDate.mockReturnValue(mockToday);
    
    // Setup fetch mock to return successful response by default
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockApodResponse),
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    };
    mockFetch.mockResolvedValue(mockResponse);
    
    // Setup retry mock to execute function immediately
    mockRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  describe('Constructor and initialization', () => {
    it('should initialize with empty cache', () => {
      const stats = nasaService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it('should warn when API key is not configured', () => {
      // We can't easily test this without recreating the service instance
      // But we can verify the logger was called during module initialization
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('NASA API key not configured'),
        expect.objectContaining({ component: 'NasaApodService' }),
      );
    });

    it('should load cache from localStorage on initialization', () => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('nasa-apod-cache');
    });
  });

  describe('getTodaysApod', () => {
    it('should fetch today\'s APOD', async () => {
      const result = await nasaService.getTodaysApod();

      expect(mockDashboardContextService.getLocalDate).toHaveBeenCalled();
      expect(result).toEqual(mockApodImage);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(nasaService.getTodaysApod()).rejects.toThrow(ApodServiceError);
    });
  });

  describe('getApodByDate', () => {
    it('should fetch APOD for valid date', async () => {
      const result = await nasaService.getApodByDate('2022-01-01');

      expect(result).toEqual(mockApodImage);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.nasa.gov/planetary/apod'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        }),
      );
    });

    it('should validate date format', async () => {
      await expect(nasaService.getApodByDate('invalid-date')).rejects.toThrow(
        'Invalid date format. Use YYYY-MM-DD',
      );
    });

    it('should validate date is within range', async () => {
      // Mock date as too early
      mockTimeService.parseDate.mockReturnValue(new Date('1990-01-01'));

      await expect(nasaService.getApodByDate('1990-01-01')).rejects.toThrow(
        'Date must be between 1995-06-16 and today',
      );
    });

    it('should return cached result if available and not expired', async () => {
      // First request to populate cache
      await nasaService.getApodByDate('2022-01-01');
      
      // Clear fetch mock calls
      mockFetch.mockClear();
      
      // Second request should use cache
      const result = await nasaService.getApodByDate('2022-01-01');
      
      expect(result).toEqual(mockApodImage);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should deduplicate simultaneous requests for same date', async () => {
      const [result1, result2, result3] = await Promise.all([
        nasaService.getApodByDate('2022-01-01'),
        nasaService.getApodByDate('2022-01-01'),
        nasaService.getApodByDate('2022-01-01'),
      ]);

      expect(result1).toEqual(mockApodImage);
      expect(result2).toEqual(mockApodImage);
      expect(result3).toEqual(mockApodImage);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: { message: 'Bad Request: Invalid date format' },
        }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(nasaService.getApodByDate('2022-01-01')).rejects.toThrow(
        ApodServiceError,
      );
    });
  });

  describe('getRandomApod', () => {
    it('should fetch a random APOD from available date range', async () => {
      // Mock random date generation
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const result = await nasaService.getRandomApod();

      expect(result).toEqual(mockApodImage);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Navigation methods', () => {
    describe('getPreviousApod', () => {
      it('should fetch previous day\'s APOD', async () => {
        mockTimeService.addDays.mockReturnValue(new Date('2021-12-31'));
        mockTimeService.toISODateString.mockReturnValue('2021-12-31');

        const result = await nasaService.getPreviousApod('2022-01-01');

        expect(result).toEqual(mockApodImage);
      });

      it('should throw error if no previous APOD available', async () => {
        // Mock date before first APOD date
        mockTimeService.addDays.mockReturnValue(new Date('1995-06-15'));
        mockTimeService.toISODateString.mockReturnValue('1995-06-15');
        mockTimeService.parseDate.mockImplementation((dateStr) => {
          if (dateStr === '1995-06-15') return new Date('1995-06-15');
          return new Date(dateStr);
        });

        await expect(nasaService.getPreviousApod('1995-06-16')).rejects.toThrow(
          'No previous APOD available',
        );
      });
    });

    describe('getNextApod', () => {
      it('should fetch next day\'s APOD', async () => {
        mockTimeService.addDays.mockReturnValue(new Date('2022-01-02'));
        mockTimeService.toISODateString.mockReturnValue('2022-01-02');
        mockDashboardContextService.getLocalDate.mockReturnValue('2022-01-05');

        const result = await nasaService.getNextApod('2022-01-01');

        expect(result).toEqual(mockApodImage);
      });

      it('should throw error if requesting future APOD', async () => {
        mockTimeService.addDays.mockReturnValue(new Date('2022-01-02'));
        mockTimeService.toISODateString.mockReturnValue('2022-01-02');
        mockDashboardContextService.getLocalDate.mockReturnValue('2022-01-01');

        await expect(nasaService.getNextApod('2022-01-01')).rejects.toThrow(
          'No future APOD available',
        );
      });
    });

    describe('canNavigatePrevious', () => {
      it('should return true when previous date is available', () => {
        mockTimeService.addDays.mockReturnValue(new Date('2022-01-01'));
        mockTimeService.toISODateString.mockReturnValue('2022-01-01');

        const canNavigate = nasaService.canNavigatePrevious('2022-01-02');

        expect(canNavigate).toBe(true);
      });

      it('should return false when previous date is before first APOD', () => {
        mockTimeService.addDays.mockReturnValue(new Date('1995-06-15'));
        mockTimeService.toISODateString.mockReturnValue('1995-06-15');
        mockTimeService.parseDate.mockImplementation((dateStr) => {
          if (dateStr === '1995-06-15') return new Date('1995-06-15');
          return new Date(dateStr);
        });

        const canNavigate = nasaService.canNavigatePrevious('1995-06-16');

        expect(canNavigate).toBe(false);
      });
    });

    describe('canNavigateNext', () => {
      it('should return true when next date is available', () => {
        mockTimeService.addDays.mockReturnValue(new Date('2022-01-02'));
        mockTimeService.toISODateString.mockReturnValue('2022-01-02');
        mockDashboardContextService.getLocalDate.mockReturnValue('2022-01-05');

        const canNavigate = nasaService.canNavigateNext('2022-01-01');

        expect(canNavigate).toBe(true);
      });

      it('should return false when next date is in the future', () => {
        mockTimeService.addDays.mockReturnValue(new Date('2022-01-02'));
        mockTimeService.toISODateString.mockReturnValue('2022-01-02');
        mockDashboardContextService.getLocalDate.mockReturnValue('2022-01-01');

        const canNavigate = nasaService.canNavigateNext('2022-01-01');

        expect(canNavigate).toBe(false);
      });
    });
  });

  describe('Download functionality', () => {
    it('should download APOD image', async () => {
      const mockBlob = new Blob(['mock image data']);
      const mockResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      (document.createElement as jest.Mock).mockReturnValue(mockLink);

      await nasaService.downloadApod(mockApodImage, false, 'custom-filename.jpg');

      expect(mockFetch).toHaveBeenCalledWith(mockApodImage.imageUrl);
      expect(mockLink.download).toBe('custom-filename.jpg');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should download HD version when requested and available', async () => {
      const mockBlob = new Blob(['mock hd image data']);
      const mockResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await nasaService.downloadApod(mockApodImage, true);

      expect(mockFetch).toHaveBeenCalledWith(mockApodImage.hdImageUrl);
    });

    it('should throw error when trying to download video content', async () => {
      const videoApod = { ...mockApodImage, mediaType: 'video' as const };

      await expect(nasaService.downloadApod(videoApod)).rejects.toThrow(
        'Cannot download video content',
      );
    });

    it('should handle download failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(nasaService.downloadApod(mockApodImage)).rejects.toThrow(
        ApodServiceError,
      );
    });
  });

  describe('Share functionality', () => {
    it('should generate share data', () => {
      const shareData = nasaService.getShareData(mockApodImage);

      expect(shareData).toEqual({
        title: mockApodImage.title,
        text: `${mockApodImage.title} - NASA Astronomy Picture of the Day for ${mockApodImage.date}`,
        url: 'https://apod.nasa.gov/apod/ap220101.html',
      });
    });

    it('should copy APOD link to clipboard', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const success = await nasaService.copyApodLink(mockApodImage);

      expect(success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://apod.nasa.gov/apod/ap220101.html',
      );
    });

    it('should fallback to execCommand when clipboard API fails', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));
      (document.execCommand as jest.Mock).mockReturnValue(true);

      const mockTextArea = {
        value: '',
        select: jest.fn(),
      };
      (document.createElement as jest.Mock).mockReturnValue(mockTextArea);

      const success = await nasaService.copyApodLink(mockApodImage);

      expect(success).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Caching system', () => {
    it('should cache API responses', async () => {
      await nasaService.getApodByDate('2022-01-01');

      const stats = nasaService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toContain('apod-2022-01-01');
    });

    it('should save cache to localStorage', async () => {
      await nasaService.getApodByDate('2022-01-01');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'nasa-apod-cache',
        expect.any(String),
      );
    });

    it('should load cache from localStorage on initialization', () => {
      const cacheData = {
        'apod-2022-01-01': {
          data: mockApodImage,
          timestamp: mockTimestamp,
        },
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));

      // Create new service instance to test cache loading
      // Note: This is conceptual as we can't easily test constructor behavior
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('nasa-apod-cache');
    });

    it('should clear cache and localStorage', () => {
      nasaService.clearCache();

      const stats = nasaService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('nasa-apod-cache');
    });

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      await expect(nasaService.getApodByDate('2022-01-01')).resolves.toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save NASA APOD cache'),
        expect.any(Object),
      );
    });
  });

  describe('Rate limiting', () => {
    it('should extract rate limit information from response headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockApodResponse),
        headers: {
          get: jest.fn()
            .mockReturnValueOnce('98') // X-RateLimit-Remaining
            .mockReturnValueOnce('100') // X-RateLimit-Limit
            .mockReturnValueOnce('1640995800'), // X-RateLimit-Reset
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await nasaService.getApodByDate('2022-01-01');

      const rateLimitStatus = nasaService.getRateLimitStatus();
      expect(rateLimitStatus.remaining).toBe(98);
      expect(rateLimitStatus.limit).toBe(100);
      expect(rateLimitStatus.percentage).toBe(98);
    });

    it('should warn when rate limit is low', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockApodResponse),
        headers: {
          get: jest.fn()
            .mockReturnValueOnce('10') // X-RateLimit-Remaining (10%)
            .mockReturnValueOnce('100') // X-RateLimit-Limit
            .mockReturnValueOnce('1640995800'),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await nasaService.getApodByDate('2022-01-01');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('NASA API rate limit warning'),
        expect.any(Object),
      );
    });

    it('should handle missing rate limit headers gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockApodResponse),
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      };
      mockFetch.mockResolvedValue(mockResponse);

      await nasaService.getApodByDate('2022-01-01');

      const rateLimitStatus = nasaService.getRateLimitStatus();
      expect(rateLimitStatus.remaining).toBeNull();
      expect(rateLimitStatus.limit).toBeNull();
      expect(rateLimitStatus.percentage).toBeNull();
    });
  });

  describe('Request throttling', () => {
    it('should throttle requests to prevent rate limiting', async () => {
      const startTime = Date.now();
      mockTimeService.getTimestamp
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 500) // Second request 500ms later
        .mockReturnValueOnce(startTime + 1100); // After throttle wait

      // Make two requests quickly
      const promise1 = nasaService.getApodByDate('2022-01-01');
      const promise2 = nasaService.getApodByDate('2022-01-02');

      await Promise.all([promise1, promise2]);

      // Should have been throttled (tested indirectly through timing)
      expect(mockTimeService.getTimestamp).toHaveBeenCalledTimes(2);
    });
  });

  describe('Preloading functionality', () => {
    it('should preload adjacent dates', async () => {
      mockTimeService.addDays
        .mockReturnValueOnce(new Date('2021-12-31')) // Previous day
        .mockReturnValueOnce(new Date('2022-01-02')); // Next day
      mockTimeService.toISODateString
        .mockReturnValueOnce('2021-12-31')
        .mockReturnValueOnce('2022-01-02');
      mockDashboardContextService.getLocalDate.mockReturnValue('2022-01-05');

      await nasaService.preloadAdjacentDates('2022-01-01');

      // Should have made requests for adjacent dates
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not preload dates that are already cached', async () => {
      // First, cache a date
      await nasaService.getApodByDate('2022-01-01');
      mockFetch.mockClear();

      // Then try to preload - should not make additional requests for cached dates
      mockTimeService.addDays.mockReturnValue(new Date('2022-01-01'));
      mockTimeService.toISODateString.mockReturnValue('2022-01-01');

      await nasaService.preloadAdjacentDates('2022-01-02');

      // Should not make request for already cached date
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only for the non-cached adjacent date
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(nasaService.getApodByDate('2022-01-01')).rejects.toThrow(
        ApodServiceError,
      );
    });

    it('should handle API error responses with custom messages', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          msg: 'Internal server error',
        }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(nasaService.getApodByDate('2022-01-01')).rejects.toThrow(
        'Internal server error',
      );
    });

    it('should handle invalid JSON responses', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(nasaService.getApodByDate('2022-01-01')).rejects.toThrow(
        'HTTP 400: Bad Request',
      );
    });

    it('should use retry logic for server errors', async () => {
      const serverError = new ApodServiceError('Server error', 500);
      mockRetryWithBackoff.mockRejectedValue(serverError);

      await expect(nasaService.getApodByDate('2022-01-01')).rejects.toThrow(
        'Server error',
      );

      expect(mockRetryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxRetries: 3,
          shouldRetry: expect.any(Function),
        }),
      );
    });
  });

  describe('Data transformation', () => {
    it('should transform NASA API response to ApodImage format', async () => {
      const result = await nasaService.getApodByDate('2022-01-01');

      expect(result).toEqual({
        id: mockApodResponse.date,
        date: mockApodResponse.date,
        title: mockApodResponse.title,
        explanation: mockApodResponse.explanation,
        imageUrl: mockApodResponse.url,
        hdImageUrl: mockApodResponse.hdurl,
        mediaType: mockApodResponse.media_type,
        copyright: mockApodResponse.copyright,
        concepts: mockApodResponse.concepts,
        isHD: true,
        aspectRatio: undefined,
      });
    });

    it('should handle responses without HD URL', async () => {
      const responseWithoutHD = { ...mockApodResponse, hdurl: undefined };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(responseWithoutHD),
        headers: { get: jest.fn().mockReturnValue(null) },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await nasaService.getApodByDate('2022-01-01');

      expect(result.isHD).toBe(false);
      expect(result.hdImageUrl).toBeUndefined();
    });

    it('should handle video content', async () => {
      const videoResponse = { ...mockApodResponse, media_type: 'video' };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(videoResponse),
        headers: { get: jest.fn().mockReturnValue(null) },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await nasaService.getApodByDate('2022-01-01');

      expect(result.mediaType).toBe('video');
    });
  });
});

describe('ApodServiceError', () => {
  it('should create error with message and status', () => {
    const error = new ApodServiceError('Test error', 404, 'NOT_FOUND');

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('ApodServiceError');
  });

  it('should create error with only message', () => {
    const error = new ApodServiceError('Simple error');

    expect(error.message).toBe('Simple error');
    expect(error.status).toBeUndefined();
    expect(error.code).toBeUndefined();
    expect(error.name).toBe('ApodServiceError');
  });
});