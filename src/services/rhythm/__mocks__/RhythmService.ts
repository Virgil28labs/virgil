// Mock for RhythmService to handle import.meta.env
export class RhythmService {
  constructor() {
    // baseUrl is not needed in the mock implementation
  }

  async generatePattern(options: any): Promise<any> {
    return {
      pattern: Array(5).fill(null).map(() => Array(options.barLength).fill(false)),
      description: options.description,
      barLength: options.barLength,
      style: options.style || '',
      generated: new Date().toISOString(),
      fallback: false,
    };
  }

  async getStats(): Promise<any> {
    return {
      totalGenerations: 0,
      successRate: 0,
      averageResponseTime: 0,
    };
  }
}

export const rhythmService = new RhythmService();