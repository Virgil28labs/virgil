// Removed unused import: vectorService
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';
import { 
  VECTOR_CONFIDENCE_CACHE_TTL,
  VECTOR_CONFIDENCE_CACHE_MAX_SIZE,
} from '../../constants/timing';

export class VectorConfidenceService {
  private readonly CONFIDENCE_CACHE_TTL = VECTOR_CONFIDENCE_CACHE_TTL;
  private readonly CONFIDENCE_CACHE_MAX_SIZE = VECTOR_CONFIDENCE_CACHE_MAX_SIZE;
  private confidenceCache = new Map<string, { confidence: number; timestamp: number }>();

  async getSemanticConfidenceBatch(
    queries: string[],
    withCache = true,
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const queriesToProcess: string[] = [];

    // Check cache first if enabled
    if (withCache) {
      const now = timeService.getTimestamp();
      for (const query of queries) {
        const cached = this.confidenceCache.get(query);
        if (cached && now - cached.timestamp < this.CONFIDENCE_CACHE_TTL) {
          results.set(query, cached.confidence);
        } else {
          queriesToProcess.push(query);
        }
      }
    } else {
      queriesToProcess.push(...queries);
    }

    // Process uncached queries
    if (queriesToProcess.length > 0) {
      try {
        // Process in smaller batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < queriesToProcess.length; i += batchSize) {
          const batch = queriesToProcess.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async query => {
              try {
                // For now, return a confidence score based on query length and complexity
                // This is a placeholder implementation until vector service supports semantic confidence
                const confidence = this.calculateBasicConfidence(query);
                if (withCache) {
                  this.addToConfidenceCache(query, confidence);
                }
                return { query, confidence };
              } catch (error) {
                logger.warn('Failed to get confidence for query', {
                  component: 'VectorConfidenceService',
                  action: 'getSemanticConfidenceBatch',
                  metadata: { query, error },
                });
                return { query, confidence: 0 };
              }
            }),
          );

          // Add batch results
          for (const { query, confidence } of batchResults) {
            results.set(query, confidence);
          }
        }
      } catch (error) {
        logger.error('Batch confidence processing failed', error instanceof Error ? error : new Error(String(error)), {
          component: 'VectorConfidenceService',
          action: 'getSemanticConfidenceBatch',
        });
      }
    }

    return results;
  }

  private addToConfidenceCache(key: string, confidence: number): void {
    // Implement LRU-like behavior
    if (this.confidenceCache.size >= this.CONFIDENCE_CACHE_MAX_SIZE) {
      // Remove oldest entries
      const entriesToRemove = Math.floor(this.CONFIDENCE_CACHE_MAX_SIZE * 0.2); // Remove 20%
      const sortedEntries = Array.from(this.confidenceCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      );

      for (let i = 0; i < entriesToRemove; i++) {
        if (sortedEntries[i]) {
          this.confidenceCache.delete(sortedEntries[i][0]);
        }
      }
    }

    this.confidenceCache.set(key, { confidence, timestamp: timeService.getTimestamp() });
  }

  clearCache(): void {
    this.confidenceCache.clear();
  }

  getCacheSize(): number {
    return this.confidenceCache.size;
  }

  private calculateBasicConfidence(query: string): number {
    // Basic confidence calculation based on query characteristics
    // This is a placeholder implementation
    const words = query.toLowerCase().split(/\s+/);
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who', 'which'];
    const hasQuestionWords = words.some(word => questionWords.includes(word));
    const hasQuestionMark = query.includes('?');
    
    let confidence = 0.3; // Base confidence
    
    if (hasQuestionWords) confidence += 0.2;
    if (hasQuestionMark) confidence += 0.1;
    if (words.length > 3) confidence += 0.2;
    if (words.length > 10) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }
}