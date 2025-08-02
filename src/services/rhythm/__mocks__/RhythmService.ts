// Mock for RhythmService to handle import.meta.env
import type { RhythmPattern, RhythmGenerationOptions } from '../RhythmService';

export class RhythmService {
  constructor() {
    // baseUrl is not needed in the mock implementation
  }

  async generatePattern(options: RhythmGenerationOptions): Promise<RhythmPattern> {
    return {
      pattern: Array(5).fill(null).map(() => Array(options.barLength).fill(false)),
      description: options.description,
      barLength: options.barLength,
      style: options.style || '',
      generated: new Date().toISOString(),
      fallback: false,
    };
  }

  async getStats(): Promise<unknown> {
    return {
      totalGenerations: 0,
      successRate: 0,
      averageResponseTime: 0,
    };
  }
}

export const rhythmService = new RhythmService();