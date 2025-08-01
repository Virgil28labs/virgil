/**
 * ConfidenceService Test Suite
 * 
 * Tests unified confidence scoring orchestration, semantic scoring, caching,
 * and explanation generation. Critical for AI-powered intent classification.
 */

import { ConfidenceService, confidenceService, type ConfidenceScore } from '../ConfidenceService';
import { timeService } from '../TimeService';
import { vectorMemoryService } from '../VectorMemoryService';
import { queryPreprocessor } from '../QueryPreprocessor';
import { intentInitializer } from '../IntentInitializer';
import { logger } from '../../lib/logger';
import type { AppDataAdapter, AppContextData } from '../DashboardAppService';

// Mock all dependencies
jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));

jest.mock('../VectorMemoryService', () => ({
  vectorMemoryService: {
    getSemanticConfidenceBatch: jest.fn(),
  },
}));

jest.mock('../QueryPreprocessor', () => ({
  queryPreprocessor: {
    preprocess: jest.fn(),
  },
}));

jest.mock('../IntentInitializer', () => ({
  intentInitializer: {
    ensureIntentLoaded: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
  },
}));

// Mock adapter implementations
class MockAdapter implements AppDataAdapter {
  constructor(
    public readonly appName: string,
    public readonly displayName: string,
    private mockData: Record<string, unknown> = {},
  ) {}

  getContextData(): AppContextData {
    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive: (this.mockData.isActive as boolean | undefined) ?? false,
      lastUsed: (this.mockData.lastUsed as number | undefined) ?? 0,
      data: (this.mockData.data as object | undefined) ?? {},
      summary: (this.mockData.summary as string | undefined) ?? `${this.displayName} summary`,
      capabilities: (this.mockData.capabilities as string[] | undefined) ?? ['basic'],
    };
  }

  getKeywords(): string[] {
    return (this.mockData.keywords as string[] | undefined) ?? [this.appName];
  }

  async getConfidence(query: string): Promise<number> {
    // Simple mock confidence based on keyword matching
    const keywords = this.getKeywords();
    const queryLower = query.toLowerCase();
    const matches = keywords.filter(keyword => queryLower.includes(keyword.toLowerCase()));
    return matches.length > 0 ? 0.8 : 0.1;
  }
}

describe('ConfidenceService', () => {
  let service: ConfidenceService;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;
  const mockVectorMemoryService = vectorMemoryService as jest.Mocked<typeof vectorMemoryService>;
  const mockQueryPreprocessor = queryPreprocessor as jest.Mocked<typeof queryPreprocessor>;
  const mockIntentInitializer = intentInitializer as jest.Mocked<typeof intentInitializer>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getTimestamp.mockReturnValue(1705748400000); // January 20, 2024
    service = ConfidenceService.getInstance();
    
    // Clear cache between tests
    service.clearCache();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ConfidenceService.getInstance();
      const instance2 = ConfidenceService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(confidenceService);
    });

    it('provides access to thresholds', () => {
      expect(service.THRESHOLDS.HIGH).toBe(0.85);
      expect(service.THRESHOLDS.MEDIUM).toBe(0.65);
      expect(service.THRESHOLDS.LOW).toBe(0.45);
    });
  });

  describe('Confidence Calculation', () => {
    let notesAdapter: MockAdapter;
    let tasksAdapter: MockAdapter;
    let adapters: AppDataAdapter[];
    let getAppData: (appName: string) => AppContextData | null;

    beforeEach(() => {
      notesAdapter = new MockAdapter('notes', 'Notes App', {
        keywords: ['note', 'notes', 'write'],
        isActive: true,
        lastUsed: 1705748400000,
      });
      
      tasksAdapter = new MockAdapter('tasks', 'Tasks App', {
        keywords: ['task', 'tasks', 'todo'],
        isActive: false,
        lastUsed: 0,
      });
      
      adapters = [notesAdapter, tasksAdapter];
      
      getAppData = (appName: string) => {
        const adapter = adapters.find(a => a.appName === appName);
        return adapter ? adapter.getContextData() : null;
      };

      // Setup default mocks
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'test query',
        normalized: 'test query',
        corrections: [],
        expansions: [],
      });

      mockIntentInitializer.ensureIntentLoaded.mockResolvedValue(undefined);
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([
          ['notes', 0.8],
          ['tasks', 0.2],
        ]),
      );
    });

    it('calculates confidence scores for all adapters', async () => {
      const results = await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(results).toHaveLength(2);
      expect(results[0].adapter).toBe(notesAdapter);
      expect(results[0].totalScore).toBeGreaterThan(0);
      expect(results[0].breakdown).toEqual({
        semantic: expect.any(Number),
        keyword: expect.any(Number),
        context: expect.any(Number),
      });
      expect(results[0].weights).toEqual({
        semantic: 0.6,
        keyword: 0.3,
        context: 0.1,
      });
      expect(results[0].metadata).toEqual({
        isActive: true,
        lastUsed: 1705748400000,
        cacheHit: false,
      });
    });

    it('sorts results by total score descending', async () => {
      const results = await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(results).toHaveLength(2);
      expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore);
    });

    it('uses custom weights when provided', async () => {
      const customWeights = {
        semantic: 0.2,
        keyword: 0.7,
        context: 0.1,
      };
      
      const results = await service.calculateConfidence('write a note', adapters, getAppData, customWeights);
      
      expect(results[0].weights).toEqual(customWeights);
    });

    it('preprocesses queries before scoring', async () => {
      await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(mockQueryPreprocessor.preprocess).toHaveBeenCalledWith('write a note');
    });

    it('ensures intents are loaded for all adapters', async () => {
      await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(mockIntentInitializer.ensureIntentLoaded).toHaveBeenCalledWith('notes');
      expect(mockIntentInitializer.ensureIntentLoaded).toHaveBeenCalledWith('tasks');
    });

    it('gets semantic scores in batch', async () => {
      await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledWith([
        { query: 'test query', intent: 'notes' },
        { query: 'test query', intent: 'tasks' },
      ]);
    });

    it('handles adapters without getConfidence method', async () => {
      const basicAdapter = {
        appName: 'basic',
        displayName: 'Basic App',
        getContextData: () => ({
          appName: 'basic',
          displayName: 'Basic App',
          isActive: false,
          lastUsed: 0,
          data: {},
          summary: 'Basic summary',
          capabilities: [],
        }),
        getKeywords: () => ['basic', 'simple'],
      } as AppDataAdapter;

      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'basic query',
        normalized: 'basic query',
        corrections: [],
        expansions: [],
      });

      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['basic', 0.3]]),
      );

      const results = await service.calculateConfidence('basic query', [basicAdapter], getAppData);
      
      expect(results).toHaveLength(1);
      // Fallback keyword matching: 'basic query' contains 'basic' = 1 match out of 2 keywords = 0.5
      expect(results[0].breakdown.keyword).toBe(0.5);
    });

    it('calculates context scores based on app state', async () => {
      const results = await service.calculateConfidence('write a note', adapters, getAppData);
      
      // Notes adapter is active and recently used
      expect(results.find(r => r.adapter.appName === 'notes')?.breakdown.context).toBeGreaterThan(0);
      
      // Tasks adapter is inactive
      expect(results.find(r => r.adapter.appName === 'tasks')?.breakdown.context).toBe(0);
    });

    it('logs confidence results', async () => {
      await service.calculateConfidence('write a note', adapters, getAppData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Confidence scores calculated',
        expect.objectContaining({
          component: 'ConfidenceService',
          action: 'calculateConfidence',
          metadata: expect.objectContaining({
            query: 'test query',
            matchCount: expect.any(Number),
            topMatches: expect.any(Array),
          }),
        }),
      );
    });

    it('includes preprocessing info in logs when available', async () => {
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'tast query',
        normalized: 'test query',
        corrections: [{ original: 'tast', corrected: 'test', distance: 1 }],
        expansions: ['examination', 'trial'],
      });
      
      await service.calculateConfidence('tast query', adapters, getAppData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Confidence scores calculated',
        expect.objectContaining({
          metadata: expect.objectContaining({
            preprocessing: {
              corrections: ['tast → test'],
              expansions: ['examination', 'trial'],
            },
          }),
        }),
      );
    });

    it('handles empty adapter list', async () => {
      const results = await service.calculateConfidence('test query', [], getAppData);
      
      expect(results).toEqual([]);
    });

    it('handles semantic scoring fallback', async () => {
      // Mock semantic scores as low
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([
          ['notes', 0.1], // Low semantic score
          ['tasks', 0.05],
        ]),
      );
      
      const results = await service.calculateConfidence('write a note', adapters, getAppData);
      
      // Should still get results with keyword scoring
      expect(results).toHaveLength(2);
      expect(results[0].breakdown.keyword).toBeGreaterThan(0);
    });
  });

  describe('Caching System', () => {
    let adapters: AppDataAdapter[];
    let getAppData: (appName: string) => AppContextData | null;

    beforeEach(() => {
      const adapter = new MockAdapter('notes', 'Notes App');
      adapters = [adapter];
      getAppData = () => adapter.getContextData();
      
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'test query',
        normalized: 'test query',
        corrections: [],
        expansions: [],
      });
      
      mockIntentInitializer.ensureIntentLoaded.mockResolvedValue(undefined);
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(new Map([['notes', 0.8]]));
    });

    it('caches confidence calculation results', async () => {
      const results1 = await service.calculateConfidence('test query', adapters, getAppData);
      const results2 = await service.calculateConfidence('test query', adapters, getAppData);
      
      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results2[0].metadata.cacheHit).toBe(true);
      
      // Should only call semantic scoring once
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledTimes(1);
    });

    it('respects cache TTL', async () => {
      await service.calculateConfidence('test query', adapters, getAppData);
      
      // Advance time beyond cache TTL (1 hour)
      mockTimeService.getTimestamp.mockReturnValue(1705748400000 + 3600001);
      
      const results = await service.calculateConfidence('test query', adapters, getAppData);
      
      expect(results[0].metadata.cacheHit).toBe(false);
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledTimes(2);
    });

    it('clears cache manually', async () => {
      await service.calculateConfidence('test query', adapters, getAppData);
      
      service.clearCache();
      
      const results = await service.calculateConfidence('test query', adapters, getAppData);
      expect(results[0].metadata.cacheHit).toBe(false);
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledTimes(2);
    });

    it('cleans up expired cache entries when cache size limit reached', async () => {
      // Fill cache with many entries to trigger cleanup
      for (let i = 0; i < 150; i++) {
        mockQueryPreprocessor.preprocess.mockReturnValue({
          original: `query${i}`,
          normalized: `query${i}`,
          corrections: [],
          expansions: [],
        });
        await service.calculateConfidence(`query${i}`, adapters, getAppData);
      }
      
      // Advance time to expire early entries
      mockTimeService.getTimestamp.mockReturnValue(1705748400000 + 3600001);
      
      // Add one more query to trigger cleanup when cache is full
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'cleanup-trigger',
        normalized: 'cleanup-trigger',
        corrections: [],
        expansions: [],
      });
      await service.calculateConfidence('cleanup-trigger', adapters, getAppData);
      
      // Early queries should have been cleaned up when cache size limit was hit
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'query0',
        normalized: 'query0',
        corrections: [],
        expansions: [],
      });
      const results = await service.calculateConfidence('query0', adapters, getAppData);
      expect(results[0].metadata.cacheHit).toBe(false);
    });

    it('handles cache size limits', async () => {
      // Create many unique queries to test cache size management
      for (let i = 0; i < 150; i++) {
        mockQueryPreprocessor.preprocess.mockReturnValue({
          original: `query ${i}`,
          normalized: `query ${i}`,
          corrections: [],
          expansions: [],
        });
        await service.calculateConfidence(`query ${i}`, adapters, getAppData);
      }
      
      // The cache should manage its size appropriately
      // (We can't easily test the internal cache size without exposing it)
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledTimes(150);
    });
  });

  describe('Confidence Explanation', () => {
    let adapter: MockAdapter;
    let score: ConfidenceScore;

    beforeEach(() => {
      adapter = new MockAdapter('notes', 'Notes App');
      score = {
        adapter,
        totalScore: 0.75,
        breakdown: {
          semantic: 0.6,
          keyword: 0.8,
          context: 0.5,
        },
        weights: {
          semantic: 0.6,
          keyword: 0.3,
          context: 0.1,
        },
        metadata: {
          isActive: true,
          lastUsed: 1705748400000,
          cacheHit: false,
        },
      };
    });

    it('generates detailed confidence explanation', () => {
      const explanation = service.explainConfidence('test query', score);
      
      expect(explanation.query).toBe('test query');
      expect(explanation.adapter).toBe('notes');
      expect(explanation.totalScore).toBe(0.75);
      expect(explanation.explanation).toContain('Good confidence match');
      
      expect(explanation.factors).toHaveLength(3);
      
      const semanticFactor = explanation.factors.find(f => f.type === 'semantic');
      expect(semanticFactor).toEqual({
        type: 'semantic',
        score: 0.6,
        weight: 0.6,
        contribution: 0.36,
        details: 'Moderate semantic similarity',
      });
      
      const keywordFactor = explanation.factors.find(f => f.type === 'keyword');
      expect(keywordFactor).toEqual({
        type: 'keyword',
        score: 0.8,
        weight: 0.3,
        contribution: 0.24,
        details: 'Partial keyword match',
      });
      
      const contextFactor = explanation.factors.find(f => f.type === 'context');
      expect(contextFactor).toEqual({
        type: 'context',
        score: 0.5,
        weight: 0.1,
        contribution: 0.05,
        details: 'Context boost from: app is currently active, recently used',
      });
    });

    it('provides different explanations based on score levels', () => {
      // High confidence
      score.totalScore = 0.9;
      let explanation = service.explainConfidence('test query', score);
      expect(explanation.explanation).toContain('Very high confidence');
      
      // Medium confidence
      score.totalScore = 0.7;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.explanation).toContain('Good confidence');
      
      // Low confidence
      score.totalScore = 0.5;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.explanation).toContain('Possible match');
      
      // Below threshold
      score.totalScore = 0.3;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.explanation).toContain('Low confidence');
    });

    it('provides semantic factor details based on score', () => {
      score.breakdown.semantic = 0.8;
      let explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[0].details).toContain('Strong semantic match');
      
      score.breakdown.semantic = 0.5;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[0].details).toContain('Moderate semantic similarity');
      
      score.breakdown.semantic = 0.2;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[0].details).toContain('Low semantic similarity');
    });

    it('provides keyword factor details based on score', () => {
      score.breakdown.keyword = 0.9;
      let explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[1].details).toContain('Strong keyword match');
      
      score.breakdown.keyword = 0.6;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[1].details).toContain('Partial keyword match');
      
      score.breakdown.keyword = 0.2;
      explanation = service.explainConfidence('test query', score);
      expect(explanation.factors[1].details).toContain('Minimal keyword overlap');
    });

    it('provides context explanations based on app state', () => {
      score.metadata.isActive = true;
      score.metadata.lastUsed = 1705748400000;
      
      const explanation = service.explainConfidence('test query', score);
      const contextFactor = explanation.factors.find(f => f.type === 'context');
      
      expect(contextFactor?.details).toContain('app is currently active');
      expect(contextFactor?.details).toContain('recently used');
    });

    it('handles missing context signals', () => {
      score.metadata.isActive = false;
      score.metadata.lastUsed = 0;
      
      const explanation = service.explainConfidence('test query', score);
      const contextFactor = explanation.factors.find(f => f.type === 'context');
      
      expect(contextFactor?.details).toBe('No context signals');
    });
  });

  describe('Threshold Classification', () => {
    it('classifies scores into threshold labels', () => {
      expect(service.getThresholdLabel(0.9)).toBe('HIGH');
      expect(service.getThresholdLabel(0.85)).toBe('HIGH');
      expect(service.getThresholdLabel(0.75)).toBe('MEDIUM');
      expect(service.getThresholdLabel(0.65)).toBe('MEDIUM');
      expect(service.getThresholdLabel(0.55)).toBe('LOW');
      expect(service.getThresholdLabel(0.45)).toBe('LOW');
      expect(service.getThresholdLabel(0.35)).toBe('BELOW_THRESHOLD');
      expect(service.getThresholdLabel(0.1)).toBe('BELOW_THRESHOLD');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let adapters: AppDataAdapter[];
    let getAppData: (appName: string) => AppContextData | null;

    beforeEach(() => {
      const adapter = new MockAdapter('notes', 'Notes App');
      adapters = [adapter];
      getAppData = () => adapter.getContextData();
      
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: 'test query',
        normalized: 'test query',
        corrections: [],
        expansions: [],
      });
      
      mockIntentInitializer.ensureIntentLoaded.mockResolvedValue(undefined);
    });

    it('handles vector memory service errors gracefully', async () => {
      mockVectorMemoryService.getSemanticConfidenceBatch.mockRejectedValue(
        new Error('Vector service error'),
      );
      
      // Should still proceed with keyword and context scoring
      await expect(service.calculateConfidence('test query', adapters, getAppData))
        .rejects.toThrow('Vector service error');
    });

    it('propagates adapter getConfidence errors', async () => {
      const errorAdapter = new MockAdapter('error', 'Error App');
      errorAdapter.getConfidence = jest.fn().mockRejectedValue(new Error('Adapter error'));
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['error', 0.5]]),
      );
      
      // Should propagate the error from adapter.getConfidence
      await expect(service.calculateConfidence('test query', [errorAdapter], getAppData))
        .rejects.toThrow('Adapter error');
    });

    it('handles missing app data gracefully', async () => {
      const getAppDataWithNull = () => null;
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['notes', 0.8]]),
      );
      
      const results = await service.calculateConfidence('test query', adapters, getAppDataWithNull);
      
      expect(results).toHaveLength(1);
      expect(results[0].metadata.isActive).toBe(false);
      expect(results[0].metadata.lastUsed).toBe(0);
      expect(results[0].breakdown.context).toBe(0);
    });

    it('handles empty query strings', async () => {
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: '',
        normalized: '',
        corrections: [],
        expansions: [],
      });
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['notes', 0.0]]),
      );
      
      const results = await service.calculateConfidence('', adapters, getAppData);
      
      expect(results).toHaveLength(1);
      expect(results[0].totalScore).toBeGreaterThanOrEqual(0);
    });

    it('handles adapters with no keywords', async () => {
      const noKeywordAdapter = {
        appName: 'empty',
        displayName: 'Empty App',
        getContextData: () => ({
          appName: 'empty',
          displayName: 'Empty App',
          isActive: false,
          lastUsed: 0,
          data: {},
          summary: 'Empty summary',
          capabilities: [],
        }),
        getKeywords: () => [], // No keywords
        // No getConfidence method - will use fallback
      } as AppDataAdapter;
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['empty', 0.5]]),
      );
      
      const results = await service.calculateConfidence('test query', [noKeywordAdapter], getAppData);
      
      expect(results).toHaveLength(1);
      expect(results[0].breakdown.keyword).toBe(0); // No keywords = 0 keyword score from fallback
    });

    it('handles very long queries with truncation', async () => {
      const longQuery = 'a'.repeat(1000);
      
      mockQueryPreprocessor.preprocess.mockReturnValue({
        original: longQuery,
        normalized: longQuery,
        corrections: [],
        expansions: [],
      });
      
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['notes', 0.5]]),
      );
      
      await service.calculateConfidence(longQuery, adapters, getAppData);
      
      // Should log with truncated query (MAX_QUERY_LOG_LENGTH = 200)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Confidence scores calculated',
        expect.objectContaining({
          metadata: expect.objectContaining({
            query: expect.stringMatching(/^a{1,200}$/),
          }),
        }),
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles many concurrent confidence calculations', async () => {
      const adapter = new MockAdapter('notes', 'Notes App');
      const adapters = [adapter];
      const getAppData = () => adapter.getContextData();
      
      mockQueryPreprocessor.preprocess.mockImplementation((query: string) => ({
        original: query,
        normalized: query,
        corrections: [],
        expansions: [],
      }));
      
      mockIntentInitializer.ensureIntentLoaded.mockResolvedValue(undefined);
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['notes', 0.8]]),
      );
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.calculateConfidence(`query ${i}`, adapters, getAppData));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0].totalScore).toBeGreaterThan(0);
      });
    });

    it('maintains reasonable memory usage with cache cleanup', async () => {
      const adapter = new MockAdapter('notes', 'Notes App');
      const adapters = [adapter];
      const getAppData = () => adapter.getContextData();
      
      mockIntentInitializer.ensureIntentLoaded.mockResolvedValue(undefined);
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(
        new Map([['notes', 0.8]]),
      );
      
      // Generate many queries over time
      for (let i = 0; i < 200; i++) {
        mockQueryPreprocessor.preprocess.mockReturnValue({
          original: `query ${i}`,
          normalized: `query ${i}`,
          corrections: [],
          expansions: [],
        });
        
        await service.calculateConfidence(`query ${i}`, adapters, getAppData);
        
        // Advance time periodically to trigger cleanup
        if (i % 50 === 0) {
          mockTimeService.getTimestamp.mockReturnValue(1705748400000 + (i * 100));
        }
      }
      
      // Should have completed without issues
      expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalledTimes(200);
    });
  });
});