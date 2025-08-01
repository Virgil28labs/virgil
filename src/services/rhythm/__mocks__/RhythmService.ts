// Mock for RhythmService to handle import.meta.env
export class RhythmService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || 'http://localhost:5002';
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