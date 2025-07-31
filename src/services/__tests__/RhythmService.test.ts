/**
 * RhythmService Comprehensive Test Suite
 * 
 * Tests rhythm pattern generation, fallback patterns, and API integration.
 * Critical for the drum machine functionality.
 */

import { RhythmService } from '../rhythm/RhythmService';
import { timeService } from '../TimeService';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../TimeService', () => ({
  timeService: {
    toISOString: jest.fn(() => '2024-01-20T12:00:00.000Z'),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('RhythmService', () => {
  let service: RhythmService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RhythmService();
    mockFetch = fetch as jest.Mock;
  });

  describe('Pattern Generation', () => {
    const mockOptions = {
      description: 'A groovy hip hop beat',
      barLength: 16,
      style: 'hip hop',
      temperature: 0.7,
    };

    it('generates pattern successfully via API', async () => {
      const mockPattern = {
        pattern: [
          [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
          [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
          [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
          [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, false],
          [false, false, false, false, false, false, false, false, false, false, false, false, true, false, false, false],
        ],
        description: 'A groovy hip hop beat',
        barLength: 16,
        style: 'hip hop',
        generated: '2024-01-20T12:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPattern,
        }),
      });

      const result = await service.generatePattern(mockOptions);

      expect(result).toEqual(mockPattern);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/rhythm/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'A groovy hip hop beat',
            barLength: 16,
            style: 'hip hop',
            temperature: 0.7,
          }),
        },
      );
    });

    it('uses environment API URL when available', async () => {
      // Set environment variable
      const originalEnv = import.meta.env.VITE_API_URL;
      import.meta.env.VITE_API_URL = 'https://api.example.com';

      const newService = new RhythmService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { pattern: [], description: '', barLength: 16 },
        }),
      });

      await newService.generatePattern(mockOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/rhythm/generate',
        expect.any(Object),
      );

      // Restore environment
      import.meta.env.VITE_API_URL = originalEnv;
    });

    it('handles API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.generatePattern(mockOptions);

      expect(logger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.any(Error),
        {
          component: 'RhythmService',
          action: 'generateRhythmPattern',
        },
      );

      // Should return fallback pattern
      expect(result.fallback).toBe(true);
      expect(result.pattern).toBeDefined();
      expect(result.pattern).toHaveLength(5);
      expect(result.pattern[0]).toHaveLength(16);
    });

    it('handles API success false responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Invalid parameters',
        }),
      });

      const result = await service.generatePattern(mockOptions);

      expect(logger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.any(Error),
        {
          component: 'RhythmService',
          action: 'generateRhythmPattern',
        },
      );

      expect(result.fallback).toBe(true);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.generatePattern(mockOptions);

      expect(logger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.any(Error),
        {
          component: 'RhythmService',
          action: 'generateRhythmPattern',
        },
      );

      expect(result.fallback).toBe(true);
    });

    it('uses default values for optional parameters', async () => {
      const minimalOptions = {
        description: 'Simple beat',
        barLength: 8,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { pattern: [], description: '', barLength: 8 },
        }),
      });

      await service.generatePattern(minimalOptions);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        description: 'Simple beat',
        barLength: 8,
        style: '',
        temperature: 0.7,
      });
    });
  });

  describe('Fallback Pattern Generation', () => {
    it('generates hip hop fallback pattern', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'hip hop beat',
        barLength: 16,
        style: 'hip hop',
      });

      expect(result.fallback).toBe(true);
      expect(result.pattern).toHaveLength(5);
      expect(result.pattern[0]).toHaveLength(16);
      expect(result.description).toBe('hip hop beat');
      expect(result.barLength).toBe(16);
      expect(result.generated).toBe('2024-01-20T12:00:00.000Z');

      // Check that kick pattern has appropriate hip hop characteristics
      const kickPattern = result.pattern[0];
      expect(kickPattern[0]).toBe(true); // First beat
      expect(kickPattern[4]).toBe(true); // Every 4th beat
    });

    it('generates rock fallback pattern', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'rock beat',
        barLength: 16,
      });

      expect(result.fallback).toBe(true);

      // Check rock pattern characteristics
      const kickPattern = result.pattern[0];
      const snarePattern = result.pattern[1];

      expect(kickPattern[0]).toBe(true); // First beat
      expect(kickPattern[2]).toBe(true); // Rock kick on 1 and 3
      expect(snarePattern[2]).toBe(true); // Snare on 2 and 4
      expect(snarePattern[6]).toBe(true);
    });

    it('generates jazz fallback pattern', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'jazz rhythm',
        barLength: 12,
      });

      expect(result.fallback).toBe(true);
      expect(result.pattern[0]).toHaveLength(12);

      // Check jazz pattern has kick on first beat
      expect(result.pattern[0][0]).toBe(true);
    });

    it('generates trap fallback pattern', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'trap beat',
        barLength: 16,
      });

      expect(result.fallback).toBe(true);

      // Check trap characteristics similar to hip hop
      const kickPattern = result.pattern[0];
      expect(kickPattern[0]).toBe(true);
    });

    it('generates generic fallback pattern', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'generic beat',
        barLength: 8,
      });

      expect(result.fallback).toBe(true);
      expect(result.pattern[0]).toHaveLength(8);

      // Check basic 4/4 pattern
      const kickPattern = result.pattern[0];
      expect(kickPattern[0]).toBe(true); // Beat 1
      expect(kickPattern[4]).toBe(true); // Beat 2 (in 8-step)
    });

    it('handles different bar lengths', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'test',
        barLength: 32,
      });

      expect(result.pattern[0]).toHaveLength(32);
      expect(result.pattern[1]).toHaveLength(32);
      expect(result.pattern[2]).toHaveLength(32);
      expect(result.pattern[3]).toHaveLength(32);
      expect(result.pattern[4]).toHaveLength(32);
    });

    it('includes timestamp from timeService', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'test',
        barLength: 16,
      });

      expect(timeService.getCurrentDateTime).toHaveBeenCalled();
      expect(timeService.toISOString).toHaveBeenCalled();
      expect(result.generated).toBe('2024-01-20T12:00:00.000Z');
    });
  });

  describe('Statistics', () => {
    it('fetches stats successfully', async () => {
      const mockStats = {
        totalGenerations: 150,
        successRate: 0.95,
        averageResponseTime: 1200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await service.getStats();

      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/rhythm/stats',
      );
    });

    it('handles stats API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.getStats();

      expect(logger.error).toHaveBeenCalledWith(
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

    it('handles stats network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await service.getStats();

      expect(logger.error).toHaveBeenCalledWith(
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
  });

  describe('Pattern Structure Validation', () => {
    it('ensures fallback patterns have correct structure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'test pattern',
        barLength: 16,
      });

      // Validate pattern structure
      expect(result.pattern).toHaveLength(5); // 5 drums
      result.pattern.forEach((drumPattern, drumIndex) => {
        expect(drumPattern).toHaveLength(16); // Correct bar length
        expect(Array.isArray(drumPattern)).toBe(true);
        drumPattern.forEach((step, stepIndex) => {
          expect(typeof step).toBe('boolean');
        });
      });

      // Validate metadata
      expect(typeof result.description).toBe('string');
      expect(typeof result.barLength).toBe('number');
      expect(typeof result.generated).toBe('string');
      expect(result.fallback).toBe(true);
    });

    it('generates different patterns with randomization', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      // Generate multiple patterns and check they're not identical
      const patterns = [];
      for (let i = 0; i < 5; i++) {
        const result = await service.generatePattern({
          description: 'hip hop beat',
          barLength: 16,
        });
        patterns.push(result.pattern);
      }

      // At least some patterns should be different due to randomization
      const uniquePatterns = new Set(patterns.map(p => JSON.stringify(p)));
      expect(uniquePatterns.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles very short bar lengths', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'short beat',
        barLength: 2,
      });

      expect(result.pattern[0]).toHaveLength(2);
      expect(result.pattern[0][0]).toBe(true); // Should still have kick on first beat
    });

    it('handles very long bar lengths', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'long beat',
        barLength: 64,
      });

      expect(result.pattern[0]).toHaveLength(64);
      // Pattern should still follow basic structure
      expect(result.pattern[0][0]).toBe(true);
    });

    it('handles empty description', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: '',
        barLength: 16,
      });

      expect(result.fallback).toBe(true);
      expect(result.description).toBe('');
      expect(result.pattern).toHaveLength(5);
    });

    it('handles case insensitive style matching', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const result = await service.generatePattern({
        description: 'HIP HOP BEAT',
        barLength: 16,
      });

      expect(result.fallback).toBe(true);
      // Should still recognize hip hop patterns despite case
      const kickPattern = result.pattern[0];
      expect(kickPattern[0]).toBe(true);
    });
  });
});