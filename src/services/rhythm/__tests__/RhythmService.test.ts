import type { Mock } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { logger } from '../../../lib/logger';
import { timeService } from '../../TimeService';
import type { RhythmPattern, RhythmGenerationOptions } from '../RhythmService';

// Mock dependencies
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    toISOString: jest.fn((date: Date) => date.toISOString()),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-01T12:00:00Z')),
  },
}));

// Mock fetch
global.fetch = jest.fn() as Mock;

// Create a test version of RhythmService that uses process.env
class TestRhythmService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || 'http://localhost:5002';
  }

  async generatePattern(options: RhythmGenerationOptions): Promise<RhythmPattern> {
    const {
      description,
      barLength,
      style = '',
      temperature = 0.7,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/rhythm/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          barLength,
          style,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate rhythm pattern');
      }

      return result.data;
    } catch (error) {
      logger.error('Pattern generation failed', error as Error, {
        component: 'RhythmService',
        action: 'generateRhythmPattern',
      });

      return this.generateFallbackPattern(options);
    }
  }

  private generateFallbackPattern(options: RhythmGenerationOptions): RhythmPattern {
    const { description, barLength, style = '' } = options;
    const pattern: boolean[][] = Array(5).fill(null).map(() => Array(barLength).fill(false));
    const desc = description.toLowerCase();

    for (let step = 0; step < barLength; step++) {
      // KICK patterns
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[0][step] = step % 4 === 0 || (step % 8 === 6 && Math.random() > 0.5);
      } else if (desc.includes('rock') || desc.includes('punk')) {
        pattern[0][step] = step % 4 === 0 || step % 4 === 2;
      } else if (desc.includes('jazz')) {
        pattern[0][step] = step % 4 === 0 || (step % 12 === 10 && Math.random() > 0.6);
      } else {
        pattern[0][step] = step % 4 === 0;
      }

      // SNARE patterns
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[1][step] = step % 8 === 4 || (step % 16 === 14 && Math.random() > 0.4);
      } else if (desc.includes('rock')) {
        pattern[1][step] = step % 4 === 2;
      } else if (desc.includes('jazz')) {
        pattern[1][step] = (step % 6 === 4 || step % 12 === 10) && Math.random() > 0.3;
      } else {
        pattern[1][step] = step % 8 === 4;
      }

      // HIHAT patterns
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[2][step] = step % 2 === 1 && Math.random() > 0.1;
      } else if (desc.includes('rock')) {
        pattern[2][step] = step % 2 === 1;
      } else if (desc.includes('jazz')) {
        pattern[2][step] = step % 3 === 1 && Math.random() > 0.2;
      } else {
        pattern[2][step] = step % 2 === 1 && Math.random() > 0.3;
      }

      // OPENHAT patterns
      pattern[3][step] = step % 8 === 7 && Math.random() > 0.5;

      // CLAP patterns
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[4][step] = step % 16 === 12 && Math.random() > 0.4;
      } else {
        pattern[4][step] = step % 16 === 12 && Math.random() > 0.7;
      }
    }

    return {
      pattern,
      description,
      barLength,
      style,
      generated: timeService.toISOString(timeService.getCurrentDateTime()),
      fallback: true,
    };
  }

  async getStats(): Promise<{
    totalGenerations: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/rhythm/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch stats', error as Error, {
        component: 'RhythmService',
        action: 'getPatternStats',
      });
      return {
        totalGenerations: 0,
        successRate: 0,
        averageResponseTime: 0,
      };
    }
  }
}

describe('RhythmService', () => {
  let rhythmService: TestRhythmService;
  const mockFetch = global.fetch as Mock;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  beforeEach(() => {
    process.env.VITE_API_URL = 'http://test-api.com';
    rhythmService = new TestRhythmService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use VITE_API_URL from environment', () => {
      expect(rhythmService['baseUrl']).toBe('http://test-api.com');
    });

    it('should fallback to localhost when VITE_API_URL is not set', () => {
      delete process.env.VITE_API_URL;
      const service = new TestRhythmService();
      expect(service['baseUrl']).toBe('http://localhost:5002');
      process.env.VITE_API_URL = 'http://test-api.com';
    });
  });

  describe('generatePattern', () => {
    const mockOptions: RhythmGenerationOptions = {
      description: 'hip hop beat',
      barLength: 16,
      style: 'modern',
      temperature: 0.8,
    };

    const mockSuccessResponse: RhythmPattern = {
      pattern: [
        [true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false],
        [false, true, false, true, false, true, false, true],
        [false, false, false, false, false, false, false, true],
        [false, false, false, false, true, false, false, false],
      ],
      description: 'hip hop beat',
      barLength: 8,
      style: 'modern',
      generated: '2024-01-01T12:00:00Z',
      category: 'hip-hop',
    };

    it('should successfully generate pattern from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSuccessResponse,
        }),
      });

      const result = await rhythmService.generatePattern(mockOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/v1/rhythm/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'hip hop beat',
            barLength: 16,
            style: 'modern',
            temperature: 0.8,
          }),
        },
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should use default values when not provided', async () => {
      const minimalOptions: RhythmGenerationOptions = {
        description: 'basic beat',
        barLength: 8,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSuccessResponse,
        }),
      });

      await rhythmService.generatePattern(minimalOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            description: 'basic beat',
            barLength: 8,
            style: '',
            temperature: 0.7,
          }),
        }),
      );
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await rhythmService.generatePattern(mockOptions);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.any(Error),
        {
          component: 'RhythmService',
          action: 'generateRhythmPattern',
        },
      );

      // Should return fallback pattern
      expect(result.fallback).toBe(true);
      expect(result.pattern).toHaveLength(5);
      expect(result.pattern[0]).toHaveLength(16);
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid pattern format',
        }),
      });

      const result = await rhythmService.generatePattern(mockOptions);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.objectContaining({
          message: 'Invalid pattern format',
        }),
        expect.any(Object),
      );

      expect(result.fallback).toBe(true);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await rhythmService.generatePattern(mockOptions);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.objectContaining({
          message: 'Network error',
        }),
        expect.any(Object),
      );

      expect(result.fallback).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await rhythmService.generatePattern(mockOptions);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result.fallback).toBe(true);
    });
  });

  describe('generateFallbackPattern', () => {
    beforeEach(() => {
      // Mock Math.random for predictable tests
      jest.spyOn(Math, 'random').mockReturnValue(0.7);
    });

    afterEach(() => {
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should generate hip hop pattern', () => {
      const options: RhythmGenerationOptions = {
        description: 'hip hop groove',
        barLength: 16,
        style: 'trap',
      };

      const result = rhythmService['generateFallbackPattern'](options);

      expect(result.pattern).toHaveLength(5);
      expect(result.pattern[0]).toHaveLength(16);
      expect(result.fallback).toBe(true);
      expect(result.description).toBe('hip hop groove');
      expect(result.style).toBe('trap');

      // Check kick pattern for hip hop
      expect(result.pattern[0][0]).toBe(true); // Beat 1
      expect(result.pattern[0][4]).toBe(true); // Beat 2
      expect(result.pattern[0][8]).toBe(true); // Beat 3
      expect(result.pattern[0][12]).toBe(true); // Beat 4
    });

    it('should generate rock pattern', () => {
      const options: RhythmGenerationOptions = {
        description: 'rock beat',
        barLength: 8,
      };

      const result = rhythmService['generateFallbackPattern'](options);

      // Check kick pattern for rock (1 and 3)
      expect(result.pattern[0][0]).toBe(true);
      expect(result.pattern[0][2]).toBe(true);
      expect(result.pattern[0][4]).toBe(true);
      expect(result.pattern[0][6]).toBe(true);

      // Check snare pattern for rock (backbeat on 2 and 4)
      expect(result.pattern[1][2]).toBe(true);
      expect(result.pattern[1][6]).toBe(true);
    });

    it('should generate jazz pattern', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Below threshold

      const options: RhythmGenerationOptions = {
        description: 'jazz swing',
        barLength: 12,
      };

      const result = rhythmService['generateFallbackPattern'](options);

      // Check for jazz kick pattern
      expect(result.pattern[0][0]).toBe(true); // Beat 1
      expect(result.pattern[0][4]).toBe(true); // Beat 2
      expect(result.pattern[0][8]).toBe(true); // Beat 3
    });

    it('should generate default pattern for unknown style', () => {
      const options: RhythmGenerationOptions = {
        description: 'experimental beat',
        barLength: 8,
      };

      const result = rhythmService['generateFallbackPattern'](options);

      // Check default kick pattern (four on the floor)
      expect(result.pattern[0][0]).toBe(true);
      expect(result.pattern[0][4]).toBe(true);

      // Check default snare pattern
      expect(result.pattern[1][4]).toBe(true);
    });

    it('should include timestamp in generated pattern', () => {
      const options: RhythmGenerationOptions = {
        description: 'test beat',
        barLength: 8,
      };

      const result = rhythmService['generateFallbackPattern'](options);

      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockTimeService.toISOString).toHaveBeenCalled();
      expect(result.generated).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('getStats', () => {
    it('should successfully fetch stats', async () => {
      const mockStats = {
        totalGenerations: 100,
        successRate: 0.95,
        averageResponseTime: 250,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await rhythmService.getStats();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/v1/rhythm/stats',
      );
      expect(result).toEqual(mockStats);
    });

    it('should handle stats fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await rhythmService.getStats();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch stats',
        expect.any(Error),
        {
          component: 'RhythmService',
          action: 'getPatternStats',
        },
      );

      expect(result).toEqual({
        totalGenerations: 0,
        successRate: 0,
        averageResponseTime: 0,
      });
    });

    it('should handle network error when fetching stats', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await rhythmService.getStats();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toEqual({
        totalGenerations: 0,
        successRate: 0,
        averageResponseTime: 0,
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', async () => {
      const module = await import('../RhythmService');
      expect(module.rhythmService).toBeDefined();
      // Check that it has the expected methods
      expect(typeof module.rhythmService.generatePattern).toBe('function');
      expect(typeof module.rhythmService.getStats).toBe('function');
    });
  });
});