import { logger } from '../../lib/logger';

export interface RhythmPattern {
  pattern: boolean[][]; // 5 drums x N steps
  description: string;
  barLength: number;
  style?: string;
  generated: string;
  category?: string;
  fallback?: boolean;
}

export interface RhythmGenerationOptions {
  description: string;
  barLength: number;
  style?: string;
  temperature?: number;
}

export class RhythmService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  }

  /**
   * Generate a rhythm pattern using LLM
   */
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

      // Return the pattern data from server
      return result.data;

    } catch (error) {
      logger.error('Pattern generation failed', error as Error, {
        component: 'RhythmService',
        action: 'generateRhythmPattern',
      });
      
      // Fallback to local algorithmic generation
      return this.generateFallbackPattern(options);
    }
  }

  /**
   * Generate a fallback pattern when LLM fails
   */
  private generateFallbackPattern(options: RhythmGenerationOptions): RhythmPattern {
    const { description, barLength, style = '' } = options;
    
    // Initialize empty pattern
    const pattern: boolean[][] = Array(5).fill(null).map(() => Array(barLength).fill(false));
    
    // Generate basic patterns based on description keywords
    const desc = description.toLowerCase();
    
    for (let step = 0; step < barLength; step++) {
      // KICK patterns (index 0)
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[0][step] = step % 4 === 0 || (step % 8 === 6 && Math.random() > 0.5);
      } else if (desc.includes('rock') || desc.includes('punk')) {
        pattern[0][step] = step % 4 === 0 || step % 4 === 2;
      } else if (desc.includes('jazz')) {
        pattern[0][step] = step % 4 === 0 || (step % 12 === 10 && Math.random() > 0.6);
      } else {
        pattern[0][step] = step % 4 === 0;
      }
      
      // SNARE patterns (index 1)
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[1][step] = step % 8 === 4 || (step % 16 === 14 && Math.random() > 0.4);
      } else if (desc.includes('rock')) {
        pattern[1][step] = step % 4 === 2;
      } else if (desc.includes('jazz')) {
        pattern[1][step] = (step % 6 === 4 || step % 12 === 10) && Math.random() > 0.3;
      } else {
        pattern[1][step] = step % 8 === 4;
      }
      
      // HIHAT patterns (index 2)
      if (desc.includes('hip hop') || desc.includes('trap')) {
        pattern[2][step] = step % 2 === 1 && Math.random() > 0.1;
      } else if (desc.includes('rock')) {
        pattern[2][step] = step % 2 === 1;
      } else if (desc.includes('jazz')) {
        pattern[2][step] = step % 3 === 1 && Math.random() > 0.2;
      } else {
        pattern[2][step] = step % 2 === 1 && Math.random() > 0.3;
      }
      
      // OPENHAT patterns (index 3)
      pattern[3][step] = step % 8 === 7 && Math.random() > 0.5;
      
      // CLAP patterns (index 4)
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
      generated: new Date().toISOString(),
      fallback: true,
    };
  }

  // Removed all advanced pattern conversion methods - using simple classification approach

  /**
   * Get rhythm generation statistics
   */
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

// Export singleton instance
export const rhythmService = new RhythmService();