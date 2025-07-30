/**
 * QueryPreprocessor - Query normalization and enhancement service
 * 
 * Provides query preprocessing capabilities including spell correction,
 * synonym expansion, and normalization for improved confidence scoring.
 */

import { logger } from '../lib/logger';

interface SynonymMap {
  [key: string]: string[];
}

interface SpellCorrection {
  original: string;
  corrected: string;
  distance: number;
}

export class QueryPreprocessor {
  private static instance: QueryPreprocessor;
  
  // Common misspellings and corrections
  private readonly corrections: Map<string, string> = new Map([
    // Common contractions
    ['whats', "what's"],
    ['dont', "don't"],
    ['wont', "won't"],
    ['cant', "can't"],
    ['didnt', "didn't"],
    ['doesnt', "doesn't"],
    ['isnt', "isn't"],
    ['arent', "aren't"],
    ['havent', "haven't"],
    ['hasnt', "hasn't"],
    ['wouldnt', "wouldn't"],
    ['couldnt', "couldn't"],
    ['shouldnt', "shouldn't"],
    ['youre', "you're"],
    ['theyre', "they're"],
    ['hes', "he's"],
    ['shes', "she's"],
    ['its', "it's"],
    ['were', "we're"],
    ['thats', "that's"],
    ['ive', "I've"],
    ['youve', "you've"],
    ['weve', "we've"],
    ['theyve', "they've"],
    
    // Common typos
    ['habbit', 'habit'],
    ['habbits', 'habits'],
    ['excersize', 'exercise'],
    ['excercise', 'exercise'],
    ['calender', 'calendar'],
    ['recieve', 'receive'],
    ['acheive', 'achieve'],
    ['beleive', 'believe'],
    ['seperate', 'separate'],
    ['occured', 'occurred'],
    ['untill', 'until'],
    ['wich', 'which'],
    ['teh', 'the'],
    ['taht', 'that'],
    ['nad', 'and'],
    ['adn', 'and'],
    ['waht', 'what'],
    ['wnat', 'want'],
    ['ahve', 'have'],
    ['hvae', 'have'],
    ['todya', 'today'],
    ['tommorow', 'tomorrow'],
    ['tommorrow', 'tomorrow'],
    ['yestarday', 'yesterday'],
    ['minuets', 'minutes'],
    ['mintues', 'minutes'],
    
    // App-specific
    ['pomadoro', 'pomodoro'],
    ['pomidoro', 'pomodoro'],
    ['pommodoro', 'pomodoro'],
    ['streek', 'streak'],
    ['streks', 'streaks'],
    ['habts', 'habits'],
    ['favroite', 'favorite'],
    ['favourtie', 'favorite'],
    ['picutre', 'picture'],
    ['picutres', 'pictures'],
    ['phoot', 'photo'],
    ['photoes', 'photos'],
  ]);
  
  // Synonym mappings for query expansion
  private readonly synonyms: SynonymMap = {
    // General
    'show': ['display', 'view', 'see', 'look at', 'check'],
    'get': ['fetch', 'retrieve', 'find', 'show', 'display'],
    'list': ['show', 'display', 'enumerate', 'get all'],
    'count': ['how many', 'number of', 'total', 'amount'],
    'create': ['make', 'add', 'new', 'build'],
    'delete': ['remove', 'clear', 'erase', 'destroy'],
    'update': ['change', 'modify', 'edit', 'alter'],
    
    // Time-related
    'today': ["today's", 'current day', 'this day'],
    'yesterday': ["yesterday's", 'previous day', 'last day'],
    'tomorrow': ["tomorrow's", 'next day', 'following day'],
    'now': ['current', 'present', 'at this moment'],
    'recent': ['latest', 'newest', 'most recent', 'last'],
    
    // App-specific
    'habits': ['routines', 'dailies', 'daily habits'],
    'streak': ['chain', 'consecutive days', 'run'],
    'notes': ['memos', 'reminders', 'ideas', 'thoughts'],
    'picture': ['photo', 'image', 'pic'],
    'pictures': ['photos', 'images', 'pics', 'gallery'],
    'favorite': ['starred', 'liked', 'saved', 'bookmarked'],
    'favorites': ['starred items', 'liked items', 'saved items'],
    'timer': ['pomodoro', 'focus session', 'work session'],
    'break': ['rest', 'pause', 'intermission'],
    'dogs': ['puppies', 'pups', 'canines'],
    'space': ['cosmos', 'universe', 'astronomy', 'nasa'],
  };
  
  private constructor() {}
  
  static getInstance(): QueryPreprocessor {
    if (!QueryPreprocessor.instance) {
      QueryPreprocessor.instance = new QueryPreprocessor();
    }
    return QueryPreprocessor.instance;
  }
  
  /**
   * Preprocess a query with all enhancements
   */
  preprocess(query: string): {
    original: string;
    normalized: string;
    corrections: SpellCorrection[];
    expansions: string[];
  } {
    const original = query;
    
    // Step 1: Basic normalization
    let normalized = this.normalizeBasic(query);
    
    // Step 2: Spell correction
    const corrections: SpellCorrection[] = [];
    normalized = this.correctSpelling(normalized, corrections);
    
    // Step 3: Synonym expansion
    const expansions = this.expandSynonyms(normalized);
    
    // Log preprocessing results
    if (corrections.length > 0 || expansions.length > 0) {
      logger.debug('Query preprocessed', {
        component: 'QueryPreprocessor',
        action: 'preprocess',
        metadata: {
          original,
          normalized,
          corrections: corrections.map(c => `${c.original} → ${c.corrected}`),
          expansions,
        },
      });
    }
    
    return {
      original,
      normalized,
      corrections,
      expansions,
    };
  }
  
  /**
   * Basic normalization: lowercase, trim, normalize whitespace
   */
  private normalizeBasic(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/['']/g, "'") // Normalize quotes
      .replace(/[""]/g, '"') // Normalize double quotes
      .replace(/[…]/g, '...') // Normalize ellipsis
      .replace(/\s*'\s*/g, "'") // Remove spaces around apostrophes
      .replace(/\s*-\s*/g, '-'); // Remove spaces around hyphens
  }
  
  /**
   * Correct common spelling mistakes
   */
  private correctSpelling(query: string, corrections: SpellCorrection[]): string {
    let corrected = query;
    
    // Apply known corrections
    const words = corrected.split(' ');
    const correctedWords = words.map(word => {
      const correction = this.corrections.get(word);
      if (correction) {
        corrections.push({
          original: word,
          corrected: correction,
          distance: this.levenshteinDistance(word, correction),
        });
        return correction;
      }
      return word;
    });
    
    corrected = correctedWords.join(' ');
    
    // Apply phrase-level corrections
    for (const [mistake, correction] of this.corrections) {
      if (mistake.includes(' ') && corrected.includes(mistake)) {
        corrected = corrected.replace(new RegExp(mistake, 'g'), correction);
        corrections.push({
          original: mistake,
          corrected: correction,
          distance: this.levenshteinDistance(mistake, correction),
        });
      }
    }
    
    return corrected;
  }
  
  /**
   * Expand query with synonyms
   */
  private expandSynonyms(query: string): string[] {
    const expansions: string[] = [];
    const words = query.split(' ');
    
    // Check each word for synonyms
    for (const word of words) {
      const syns = this.synonyms[word];
      if (syns) {
        // Create variations with each synonym
        for (const syn of syns) {
          const expanded = query.replace(new RegExp(`\\b${word}\\b`, 'g'), syn);
          if (expanded !== query) {
            expansions.push(expanded);
          }
        }
      }
    }
    
    // Also check multi-word synonyms
    for (const [term, syns] of Object.entries(this.synonyms)) {
      if (term.includes(' ') && query.includes(term)) {
        for (const syn of syns) {
          const expanded = query.replace(new RegExp(term, 'g'), syn);
          if (expanded !== query && !expansions.includes(expanded)) {
            expansions.push(expanded);
          }
        }
      }
    }
    
    // Limit expansions to prevent explosion
    return expansions.slice(0, 5);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Calculate distances
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Check if a word might be misspelled (for future enhancement)
   */
  isMisspelled(word: string): boolean {
    // For now, just check if it's in our corrections map
    return this.corrections.has(word.toLowerCase());
  }
  
  /**
   * Get suggestions for a potentially misspelled word
   */
  getSuggestions(word: string): string[] {
    const suggestions: Array<{ word: string; distance: number }> = [];
    const lowerWord = word.toLowerCase();
    
    // Check all known corrections
    for (const [mistake, correction] of this.corrections) {
      const distance = this.levenshteinDistance(lowerWord, mistake);
      if (distance <= 2) { // Within 2 edits
        suggestions.push({ word: correction, distance });
      }
    }
    
    // Sort by distance and return top 3
    return suggestions
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(s => s.word);
  }
}

// Export singleton instance
export const queryPreprocessor = QueryPreprocessor.getInstance();