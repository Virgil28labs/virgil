/**
 * RhythmMachineAdapter - Dashboard App Adapter for Rhythm Machine
 * 
 * Provides unified access to drum patterns and rhythm data for Virgil AI assistant,
 * enabling responses about saved beats, patterns, and music creation.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';
interface SavedPattern {
  pattern: boolean[][];
  description: string;
  category?: string;
  timestamp: number;
}

interface RhythmMachineData {
  patterns: {
    total: number;
    categories: {
      [category: string]: number;
    };
    recent: {
      description: string;
      category: string;
      timestamp: number;
      complexity: number;
      bars: number;
    }[];
  };
  stats: {
    popularCategories: string[];
    averageComplexity: number;
    mostActiveSlot: number | null;
    totalBeats: number;
    genresUsed: string[];
  };
}

export class RhythmMachineAdapter implements AppDataAdapter<RhythmMachineData> {
  readonly appName = 'rhythm';
  readonly displayName = 'Rhythm Machine';
  readonly icon = '🥁';
  
  private saveSlots: (SavedPattern | null)[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly STORAGE_KEY = 'rhythmMachineSaveSlots';
  private listeners: ((data: RhythmMachineData) => void)[] = [];

  constructor() {
    this.refreshData();
  }

  private refreshData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle legacy format (just patterns)
        if (parsed.length > 0 && Array.isArray(parsed[0])) {
          this.saveSlots = [null, null, null, null, null];
        } else {
          this.saveSlots = parsed;
        }
      } else {
        this.saveSlots = [null, null, null, null, null];
      }
      this.lastFetchTime = timeService.getTimestamp();
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to fetch rhythm patterns', error as Error, {
        component: 'RhythmMachineAdapter',
        action: 'fetchData',
      });
      this.saveSlots = [null, null, null, null, null];
    }
  }

  private ensureFreshData(): void {
    if (timeService.getTimestamp() - this.lastFetchTime > this.CACHE_DURATION) {
      this.refreshData();
    }
  }

  private getCategoryFromDescription(description: string, category?: string): string {
    if (category) {
      return category;
    }
    
    const desc = description.toLowerCase();
    if (desc.includes('techno')) return 'techno';
    if (desc.includes('house')) return 'house';
    if (desc.includes('trap')) return 'trap';
    if (desc.includes('break')) return 'breakbeat';
    if (desc.includes('minimal')) return 'minimal';
    if (desc.includes('808')) return '808';
    if (desc.includes('jazz')) return 'jazz';
    if (desc.includes('afro')) return 'afrobeat';
    if (desc.includes('lo-fi') || desc.includes('lofi')) return 'lo-fi';
    if (desc.includes('glitch')) return 'glitch';
    if (desc.includes('ambient')) return 'ambient';
    if (desc.includes('rock')) return 'rock';
    
    return 'other';
  }

  private calculateComplexity(pattern: boolean[][]): number {
    if (!pattern || pattern.length === 0) return 0;
    
    let activeSteps = 0;
    let totalSteps = 0;
    
    pattern.forEach(track => {
      track.forEach(step => {
        if (step) activeSteps++;
        totalSteps++;
      });
    });
    
    return totalSteps > 0 ? (activeSteps / totalSteps) : 0;
  }

  private getBarCount(pattern: boolean[][]): number {
    if (!pattern || pattern.length === 0 || !pattern[0]) return 0;
    const steps = pattern[0].length;
    if (steps <= 4) return 1;
    if (steps <= 8) return 2;
    if (steps <= 16) return 4;
    return 8;
  }

  getContextData(): AppContextData<RhythmMachineData> {
    this.ensureFreshData();
    
    const savedPatterns = this.saveSlots.filter((slot): slot is SavedPattern => slot !== null);
    
    // Categorize patterns
    const categories: { [category: string]: number } = {};
    const genresUsed = new Set<string>();
    let totalBeats = 0;
    let totalComplexity = 0;
    
    const recentPatterns = savedPatterns
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(pattern => {
        const category = this.getCategoryFromDescription(pattern.description, pattern.category);
        categories[category] = (categories[category] || 0) + 1;
        genresUsed.add(category);
        
        const complexity = this.calculateComplexity(pattern.pattern);
        totalComplexity += complexity;
        
        // Count total beats
        pattern.pattern.forEach(track => {
          track.forEach(step => {
            if (step) totalBeats++;
          });
        });
        
        return {
          description: pattern.description,
          category,
          timestamp: pattern.timestamp,
          complexity,
          bars: this.getBarCount(pattern.pattern),
        };
      });
    
    // Find most active slot (most recently used)
    let mostActiveSlot: number | null = null;
    let mostRecentTime = 0;
    this.saveSlots.forEach((slot, index) => {
      if (slot && slot.timestamp > mostRecentTime) {
        mostRecentTime = slot.timestamp;
        mostActiveSlot = index + 1; // 1-indexed for user display
      }
    });
    
    // Get popular categories
    const popularCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    const data: RhythmMachineData = {
      patterns: {
        total: savedPatterns.length,
        categories,
        recent: recentPatterns,
      },
      stats: {
        popularCategories,
        averageComplexity: savedPatterns.length > 0 ? totalComplexity / savedPatterns.length : 0,
        mostActiveSlot,
        totalBeats,
        genresUsed: Array.from(genresUsed),
      },
    };

    const summary = this.generateSummary(data);
    const isActive = savedPatterns.length > 0;

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: savedPatterns.length > 0 ? savedPatterns[0].timestamp : 0,
      data,
      summary,
      capabilities: [
        'drum-patterns',
        'beat-creation',
        'rhythm-sequencing',
        'genre-exploration',
      ],
      icon: this.icon,
    };
  }

  private generateSummary(data: RhythmMachineData): string {
    if (data.patterns.total === 0) {
      return 'No drum patterns saved yet';
    }

    const parts: string[] = [];
    parts.push(`${data.patterns.total} drum patterns`);
    
    if (data.stats.popularCategories.length > 0) {
      parts.push(`mostly ${data.stats.popularCategories[0]}`);
    }
    
    const complexityPercent = Math.round(data.stats.averageComplexity * 100);
    if (complexityPercent > 60) {
      parts.push('complex beats');
    } else if (complexityPercent < 30) {
      parts.push('minimal grooves');
    }

    return parts.join(', ');
  }

  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    
    return keywords.some(keyword => lowerQuery.includes(keyword));
  }

  getKeywords(): string[] {
    return [
      'drum', 'drums', 'beat', 'beats', 'rhythm', 'pattern',
      'music', 'groove', 'tempo', 'bpm', 'kick', 'snare',
      'hihat', 'hi-hat', 'clap', 'percussion', 'sequencer',
      'techno', 'house', 'trap', 'jazz', 'afrobeat',
    ];
  }

  async getResponse(query: string): Promise<string> {
    this.ensureFreshData();
    const lowerQuery = query.toLowerCase();

    // Count queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return this.getCountResponse(lowerQuery);
    }

    // Genre/category queries
    const genres = ['techno', 'house', 'trap', 'jazz', 'afrobeat', '808', 'minimal'];
    for (const genre of genres) {
      if (lowerQuery.includes(genre)) {
        return this.getGenreResponse(genre);
      }
    }

    // Recent queries
    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentResponse();
    }

    // Complexity queries
    if (lowerQuery.includes('complex') || lowerQuery.includes('simple') || lowerQuery.includes('busy')) {
      return this.getComplexityResponse();
    }

    // Slot queries
    if (lowerQuery.includes('slot') || lowerQuery.includes('save')) {
      return this.getSlotResponse();
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getCountResponse(_query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.patterns.total === 0) {
      return "You haven't saved any drum patterns yet. Fire up the Rhythm Machine and create some beats!";
    }

    const emptySlots = 5 - data.patterns.total;
    let response = `You have ${data.patterns.total} drum pattern${data.patterns.total !== 1 ? 's' : ''} saved`;
    
    if (emptySlots > 0) {
      response += ` with ${emptySlots} empty slot${emptySlots !== 1 ? 's' : ''} available`;
    } else {
      response += ' (all slots full)';
    }
    
    response += '.';

    if (data.stats.totalBeats > 100) {
      response += ` That's ${data.stats.totalBeats} individual drum hits programmed!`;
    }

    return response;
  }

  private getGenreResponse(genre: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;
    
    const count = data.patterns.categories[genre] || 0;
    
    if (count === 0) {
      return `You don't have any ${genre} patterns saved yet. Try creating a ${genre} beat in the Rhythm Machine!`;
    }

    let response = `You have ${count} ${genre} pattern${count !== 1 ? 's' : ''} saved`;
    
    if (genre === data.stats.popularCategories[0]) {
      response += `. ${genre.charAt(0).toUpperCase() + genre.slice(1)} is your favorite style!`;
    }
    
    response += '.';

    return response;
  }

  private getRecentResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.patterns.recent.length === 0) {
      return 'No drum patterns saved yet. Create your first beat in the Rhythm Machine!';
    }

    const recent = data.patterns.recent[0];
    const date = timeService.fromTimestamp(recent.timestamp);
    const timeAgo = this.getTimeAgo(date);
    
    let response = `Your most recent pattern is a ${recent.bars}-bar ${recent.category} beat: "${recent.description}", created ${timeAgo}`;
    
    const complexityPercent = Math.round(recent.complexity * 100);
    if (complexityPercent > 70) {
      response += ' (complex pattern)';
    } else if (complexityPercent < 30) {
      response += ' (minimal groove)';
    }
    
    response += '.';

    if (data.patterns.recent.length > 1) {
      response += ' Recent patterns:';
      data.patterns.recent.slice(0, 3).forEach(pattern => {
        response += `\n• ${pattern.description} (${pattern.category})`;
      });
    }

    return response;
  }

  private getComplexityResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.patterns.total === 0) {
      return 'No patterns saved to analyze complexity.';
    }

    const avgComplexityPercent = Math.round(data.stats.averageComplexity * 100);
    let response = `Your drum patterns have an average complexity of ${avgComplexityPercent}%`;
    
    if (avgComplexityPercent > 60) {
      response += '. You tend to create busy, complex beats with lots of hits!';
    } else if (avgComplexityPercent < 30) {
      response += '. You prefer minimal, spacious grooves that breathe.';
    } else {
      response += '. You have a nice balance between busy and minimal patterns.';
    }

    // Find most and least complex
    const patterns = data.patterns.recent;
    if (patterns.length > 1) {
      const sorted = [...patterns].sort((a, b) => b.complexity - a.complexity);
      const mostComplex = sorted[0];
      const leastComplex = sorted[sorted.length - 1];
      
      response += `\n\nMost complex: "${mostComplex.description}" (${Math.round(mostComplex.complexity * 100)}%)`;
      response += `\nMost minimal: "${leastComplex.description}" (${Math.round(leastComplex.complexity * 100)}%)`;
    }

    return response;
  }

  private getSlotResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    let response = 'Save slot status:\n';
    
    this.saveSlots.forEach((slot, index) => {
      if (slot) {
        const category = this.getCategoryFromDescription(slot.description, slot.category);
        response += `• Slot ${index + 1}: ${slot.description} (${category})\n`;
      } else {
        response += `• Slot ${index + 1}: Empty\n`;
      }
    });

    if (data.stats.mostActiveSlot) {
      response += `\nSlot ${data.stats.mostActiveSlot} is your most recently used.`;
    }

    return response.trim();
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.patterns.total === 0) {
      return 'Rhythm Machine: No patterns saved yet. Create beats and explore different genres!';
    }

    let response = `Rhythm Machine: ${data.patterns.total} drum patterns`;
    
    if (data.stats.popularCategories.length > 0) {
      response += ` (mostly ${data.stats.popularCategories.slice(0, 2).join(' and ')})`;
    }
    
    const emptySlots = 5 - data.patterns.total;
    if (emptySlots > 0) {
      response += `, ${emptySlots} slots available`;
    }
    
    response += '.';

    return response;
  }

  private getTimeAgo(date: Date): string {
    return timeService.getTimeAgo(date);
  }

  async search(query: string): Promise<any[]> {
    this.ensureFreshData();
    
    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    const savedPatterns = this.saveSlots.filter((slot): slot is SavedPattern => slot !== null);

    // Search in descriptions and categories
    savedPatterns.forEach((pattern, index) => {
      let relevance = 0;
      
      if (pattern.description.toLowerCase().includes(lowerQuery)) {
        relevance += 100;
      }
      
      const category = this.getCategoryFromDescription(pattern.description, pattern.category);
      if (category.includes(lowerQuery)) {
        relevance += 50;
      }
      
      if (relevance > 0) {
        results.push({
          id: `slot-${index + 1}`,
          type: 'drum-pattern',
          description: pattern.description,
          category,
          slot: index + 1,
          relevance,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  subscribe(callback: (data: RhythmMachineData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.STORAGE_KEY) {
        this.refreshData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  private notifyListeners(): void {
    const data = this.getContextData().data;
    this.listeners.forEach(listener => listener(data));
  }
}