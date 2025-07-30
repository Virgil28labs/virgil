/**
 * ConfidenceService - Unified confidence scoring orchestration
 * 
 * Provides a centralized service for calculating, caching, and explaining
 * confidence scores across different scoring methods (semantic, keyword, context).
 */

import { logger } from '../lib/logger';
import { timeService } from './TimeService';
import { vectorMemoryService } from './VectorMemoryService';
import { queryPreprocessor } from './QueryPreprocessor';
import { intentInitializer } from './IntentInitializer';
import type { AppDataAdapter, AppContextData } from './DashboardAppService';
import { CONFIDENCE_CACHE_TTL } from '../constants/timing';

export interface ConfidenceScore {
  adapter: AppDataAdapter;
  totalScore: number;
  breakdown: {
    semantic: number;
    keyword: number;
    context: number;
  };
  weights: {
    semantic: number;
    keyword: number;
    context: number;
  };
  metadata: {
    isActive: boolean;
    lastUsed: number;
    cacheHit: boolean;
  };
}

export interface ConfidenceExplanation {
  query: string;
  adapter: string;
  totalScore: number;
  explanation: string;
  factors: Array<{
    type: 'semantic' | 'keyword' | 'context';
    score: number;
    weight: number;
    contribution: number;
    details: string;
  }>;
}

interface CacheEntry {
  scores: ConfidenceScore[];
  timestamp: number;
}

interface ConfidenceWeights {
  semantic: number;
  keyword: number;
  context: number;
}

export class ConfidenceService {
  private static instance: ConfidenceService;
  
  // Cache configuration
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = CONFIDENCE_CACHE_TTL;
  private readonly MAX_CACHE_SIZE = 100;
  
  // Default weights for hybrid scoring
  private defaultWeights: ConfidenceWeights = {
    semantic: 0.6,
    keyword: 0.3,
    context: 0.1,
  };
  
  // Confidence thresholds
  public readonly THRESHOLDS = {
    HIGH: 0.85,
    MEDIUM: 0.65,
    LOW: 0.45,
  } as const;
  
  private constructor() {}
  
  static getInstance(): ConfidenceService {
    if (!ConfidenceService.instance) {
      ConfidenceService.instance = new ConfidenceService();
    }
    return ConfidenceService.instance;
  }
  
  /**
   * Calculate confidence scores for all adapters for a given query
   */
  async calculateConfidence(
    query: string,
    adapters: AppDataAdapter[],
    getAppData: (appName: string) => AppContextData | null,
    weights?: Partial<ConfidenceWeights>,
  ): Promise<ConfidenceScore[]> {
    // Preprocess the query for better matching
    const preprocessed = queryPreprocessor.preprocess(query);
    const normalizedQuery = preprocessed.normalized;
    const cacheKey = this.getCacheKey(normalizedQuery);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached.map(score => ({ ...score, metadata: { ...score.metadata, cacheHit: true } }));
    }
    
    // Merge with default weights
    const finalWeights = { ...this.defaultWeights, ...weights };
    
    // Get semantic scores in batch
    const semanticScores = await this.getSemanticScores(normalizedQuery, adapters);
    
    // Calculate all scores in parallel
    const scores = await Promise.all(
      adapters.map(async adapter => {
        const semanticScore = semanticScores.get(adapter.appName) || 0;
        const keywordScore = await this.getKeywordScore(normalizedQuery, adapter);
        const contextScore = this.getContextScore(adapter, getAppData);
        
        // Calculate weighted total
        const totalScore = this.calculateWeightedScore(
          { semantic: semanticScore, keyword: keywordScore, context: contextScore },
          finalWeights,
        );
        
        const appData = getAppData(adapter.appName);
        
        return {
          adapter,
          totalScore,
          breakdown: {
            semantic: semanticScore,
            keyword: keywordScore,
            context: contextScore,
          },
          weights: finalWeights,
          metadata: {
            isActive: appData?.isActive || false,
            lastUsed: appData?.lastUsed || 0,
            cacheHit: false,
          },
        };
      }),
    );
    
    // Sort by total score descending
    const sortedScores = scores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Cache results
    this.addToCache(cacheKey, sortedScores);
    
    // Log results with preprocessing info
    this.logConfidenceResults(normalizedQuery, sortedScores, preprocessed);
    
    return sortedScores;
  }
  
  /**
   * Get detailed explanation of confidence scoring for debugging
   */
  explainConfidence(query: string, score: ConfidenceScore): ConfidenceExplanation {
    const factors = [];
    
    // Semantic factor
    factors.push({
      type: 'semantic' as const,
      score: score.breakdown.semantic,
      weight: score.weights.semantic,
      contribution: score.breakdown.semantic * score.weights.semantic,
      details: score.breakdown.semantic > 0.7 
        ? 'Strong semantic match with intent embeddings'
        : score.breakdown.semantic > 0.3
          ? 'Moderate semantic similarity'
          : 'Low semantic similarity',
    });
    
    // Keyword factor
    factors.push({
      type: 'keyword' as const,
      score: score.breakdown.keyword,
      weight: score.weights.keyword,
      contribution: score.breakdown.keyword * score.weights.keyword,
      details: score.breakdown.keyword > 0.8
        ? 'Strong keyword match'
        : score.breakdown.keyword > 0.4
          ? 'Partial keyword match'
          : 'Minimal keyword overlap',
    });
    
    // Context factor
    factors.push({
      type: 'context' as const,
      score: score.breakdown.context,
      weight: score.weights.context,
      contribution: score.breakdown.context * score.weights.context,
      details: this.getContextExplanation(score.breakdown.context, score.metadata),
    });
    
    const explanation = this.generateExplanation(score.totalScore);
    
    return {
      query,
      adapter: score.adapter.appName,
      totalScore: score.totalScore,
      explanation,
      factors,
    };
  }
  
  
  /**
   * Get semantic confidence scores using vector similarity
   */
  private async getSemanticScores(
    query: string, 
    adapters: AppDataAdapter[],
  ): Promise<Map<string, number>> {
    // Ensure intents are loaded for all adapters (lazy loading)
    await Promise.all(
      adapters.map(adapter => intentInitializer.ensureIntentLoaded(adapter.appName)),
    );
    
    const batchQueries = adapters.map(adapter => ({
      query,
      intent: adapter.appName,
    }));
    
    return vectorMemoryService.getSemanticConfidenceBatch(batchQueries);
  }
  
  /**
   * Get keyword-based confidence score
   */
  private async getKeywordScore(query: string, adapter: AppDataAdapter): Promise<number> {
    if (adapter.getConfidence) {
      return adapter.getConfidence(query);
    }
    
    // Fallback to basic keyword matching
    const keywords = adapter.getKeywords();
    
    let matches = 0;
    for (const keyword of keywords) {
      if (query.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    return keywords.length > 0 ? matches / keywords.length : 0;
  }
  
  /**
   * Get context-based confidence score
   */
  private getContextScore(adapter: AppDataAdapter, getAppData: (appName: string) => AppContextData | null): number {
    const appData = getAppData(adapter.appName);
    if (!appData) return 0;
    
    let score = 0;
    
    // Active apps get a boost
    if (appData.isActive) {
      score += 0.5;
    }
    
    // Recently used apps get a boost
    const fiveMinutesAgo = timeService.getTimestamp() - 5 * 60 * 1000;
    if (appData.lastUsed > fiveMinutesAgo) {
      score += 0.5;
    }
    
    return score;
  }
  
  /**
   * Calculate weighted score with smart fallback
   */
  private calculateWeightedScore(
    scores: { semantic: number; keyword: number; context: number },
    weights: ConfidenceWeights,
  ): number {
    // Use semantic score if it's good (>0.3), otherwise emphasize keyword
    const effectiveSemanticScore = scores.semantic > 0.3 ? scores.semantic : 0;
    const effectiveKeywordScore = scores.semantic <= 0.3 
      ? scores.keyword 
      : scores.keyword * 0.5; // Reduce keyword weight when semantic is good
    
    return (
      (effectiveSemanticScore * weights.semantic) +
      (effectiveKeywordScore * weights.keyword) +
      (scores.context * weights.context)
    );
  }
  
  /**
   * Generate human-readable explanation
   */
  private generateExplanation(totalScore: number): string {
    if (totalScore >= this.THRESHOLDS.HIGH) {
      return 'Very high confidence match based on strong semantic similarity and keyword matches.';
    } else if (totalScore >= this.THRESHOLDS.MEDIUM) {
      return 'Good confidence match with moderate semantic and keyword alignment.';
    } else if (totalScore >= this.THRESHOLDS.LOW) {
      return 'Possible match based on partial keyword or context signals.';
    } else {
      return 'Low confidence match - consider alternative routing.';
    }
  }
  
  /**
   * Get context explanation for debugging
   */
  private getContextExplanation(_score: number, metadata: { isActive?: boolean; lastUsed?: number }): string {
    const parts = [];
    
    if (metadata.isActive) {
      parts.push('app is currently active');
    }
    
    const fiveMinutesAgo = timeService.getTimestamp() - 5 * 60 * 1000;
    if (metadata.lastUsed && metadata.lastUsed > fiveMinutesAgo) {
      parts.push('recently used');
    }
    
    return parts.length > 0 
      ? `Context boost from: ${parts.join(', ')}`
      : 'No context signals';
  }
  
  /**
   * Cache management
   */
  private getCacheKey(query: string): string {
    return query.toLowerCase().trim();
  }
  
  private getFromCache(key: string): ConfidenceScore[] | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const age = timeService.getTimestamp() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.scores;
  }
  
  private addToCache(key: string, scores: ConfidenceScore[]): void {
    this.cache.set(key, {
      scores,
      timestamp: timeService.getTimestamp(),
    });
    
    // Clean up old entries if needed
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
  }
  
  private cleanupCache(): void {
    const now = timeService.getTimestamp();
    const entriesToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        entriesToDelete.push(key);
      }
    });
    
    entriesToDelete.forEach(key => this.cache.delete(key));
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Log confidence results for monitoring
   */
  private logConfidenceResults(query: string, scores: ConfidenceScore[], preprocessed?: { corrections?: Array<{ original: string; corrected: string }>; expansions?: string[] }): void {
    const topMatches = scores.slice(0, 3);
    
    const metadata: Record<string, unknown> = {
      query: query.substring(0, 50),
      matchCount: scores.filter(s => s.totalScore > this.THRESHOLDS.LOW).length,
      topMatches: topMatches.map(s => ({
        app: s.adapter.appName,
        total: s.totalScore,
        breakdown: s.breakdown,
      })),
    };
    
    // Include preprocessing info if available
    if (preprocessed && ((preprocessed.corrections?.length ?? 0) > 0 || (preprocessed.expansions?.length ?? 0) > 0)) {
      metadata.preprocessing = {
        corrections: preprocessed.corrections?.map((c) => `${c.original} → ${c.corrected}`),
        expansions: preprocessed.expansions,
      };
    }
    
    logger.info('Confidence scores calculated', {
      component: 'ConfidenceService',
      action: 'calculateConfidence',
      metadata,
    });
  }
  
  /**
   * Get confidence threshold label
   */
  getThresholdLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'BELOW_THRESHOLD' {
    if (score >= this.THRESHOLDS.HIGH) return 'HIGH';
    if (score >= this.THRESHOLDS.MEDIUM) return 'MEDIUM';
    if (score >= this.THRESHOLDS.LOW) return 'LOW';
    return 'BELOW_THRESHOLD';
  }
}

// Export singleton instance
export const confidenceService = ConfidenceService.getInstance();