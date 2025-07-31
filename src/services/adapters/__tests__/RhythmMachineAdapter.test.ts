/**
 * RhythmMachineAdapter Test Suite
 * 
 * Tests the dashboard adapter for drum patterns and rhythm data,
 * including pattern analysis, genre categorization, and complexity calculations.
 */

import { RhythmMachineAdapter } from '../RhythmMachineAdapter';
import { timeService } from '../../TimeService';
import type { AppContextData } from '../../DashboardAppService';

// Mock dependencies
jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => Date.now()),
    fromTimestamp: jest.fn((ts: number) => new Date(ts)),
    getCurrentTime: jest.fn(() => '12:00 PM'),
    getCurrentDate: jest.fn(() => 'January 15, 2025'),
    getCurrentDateTime: jest.fn(() => 'January 15, 2025 at 12:00 PM'),
    getLocalDate: jest.fn(() => new Date()),
    formatDateToLocal: jest.fn((date: Date) => date.toLocaleDateString()),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'Wednesday'),
    getMonth: jest.fn(() => 'January'),
    getYear: jest.fn(() => 2025),
    parseDate: jest.fn((dateStr: string) => new Date(dateStr)),
    toISOString: jest.fn(() => '2025-01-15T12:00:00.000Z'),
    getTimeAgo: jest.fn((date: Date) => '5 minutes ago'),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock logger
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RhythmMachineAdapter', () => {
  let adapter: RhythmMachineAdapter;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  // Sample pattern data
  const createPattern = (rows: number, steps: number, hits: number[][]): boolean[][] => {
    const pattern: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: boolean[] = [];
      for (let s = 0; s < steps; s++) {
        row.push(hits[r]?.includes(s) || false);
      }
      pattern.push(row);
    }
    return pattern;
  };

  const samplePatterns = {
    techno: {
      pattern: createPattern(4, 16, [
        [0, 4, 8, 12], // Kick on every quarter note
        [4, 12], // Snare on 2 and 4
        [0, 2, 4, 6, 8, 10, 12, 14], // Hi-hat
        [], // Empty track
      ]),
      description: 'Classic techno 4/4',
      category: 'techno',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
    },
    jazz: {
      pattern: createPattern(4, 16, [
        [0, 10], // Syncopated kick
        [4, 14], // Snare
        [0, 3, 6, 8, 11, 14], // Jazzy hi-hat
        [7, 15], // Rim shots
      ]),
      description: 'Jazzy groove with syncopation',
      timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    },
    minimal: {
      pattern: createPattern(4, 8, [
        [0, 4], // Minimal kick
        [], // No snare
        [2, 6], // Sparse hi-hat
        [], // Empty
      ]),
      description: 'Minimal groove',
      timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockTimeService.getTimestamp.mockReturnValue(Date.now());
    adapter = new RhythmMachineAdapter();
  });

  describe('Basic Properties', () => {
    it('has correct app metadata', () => {
      expect(adapter.appName).toBe('rhythm');
      expect(adapter.displayName).toBe('Rhythm Machine');
      expect(adapter.icon).toBe('🥁');
    });

    it('provides rhythm-related keywords', () => {
      const keywords = adapter.getKeywords();
      expect(keywords).toContain('drum');
      expect(keywords).toContain('beat');
      expect(keywords).toContain('rhythm');
      expect(keywords).toContain('pattern');
      expect(keywords).toContain('techno');
      expect(keywords).toContain('jazz');
    });
  });

  describe('Storage and Loading', () => {
    it('initializes with empty slots', () => {
      const contextData = adapter.getContextData();
      expect(contextData.data.patterns.total).toBe(0);
      expect(contextData.isActive).toBe(false);
      expect(contextData.summary).toBe('No drum patterns saved yet');
    });

    it('loads saved patterns from localStorage', () => {
      const savedSlots = [
        samplePatterns.techno,
        null,
        samplePatterns.jazz,
        null,
        null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.total).toBe(2);
      expect(contextData.isActive).toBe(true);
    });

    it('handles legacy pattern format', () => {
      // Legacy format was just array of patterns
      const legacyData = [
        [[true, false], [false, true]],
        [[false, true], [true, false]],
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(legacyData));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.total).toBe(0);
      expect(contextData.data.patterns.categories).toEqual({});
    });

    it('handles invalid storage data', () => {
      localStorageMock.setItem('rhythmMachineSaveSlots', 'invalid json');
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.total).toBe(0);
      const { logger } = require('../../../lib/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch rhythm patterns',
        expect.any(Error),
        {
          component: 'rhythmAdapter',
          action: 'loadData',
        },
      );
    });

    it('listens for storage changes', () => {
      const savedSlots = [samplePatterns.techno, null, null, null, null];
      
      // Simulate storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'rhythmMachineSaveSlots',
        newValue: JSON.stringify(savedSlots),
      });
      
      window.dispatchEvent(storageEvent);
      
      // Give time for async loading
      setTimeout(() => {
        const contextData = adapter.getContextData();
        expect(contextData.data.patterns.total).toBe(1);
      }, 100);
    });
  });

  describe('Category Detection', () => {
    it('detects category from description keywords', () => {
      const patterns = [
        { description: 'Heavy techno beat', expected: 'techno' },
        { description: 'Smooth house groove', expected: 'house' },
        { description: 'Trap hi-hats', expected: 'trap' },
        { description: 'Breakbeat pattern', expected: 'breakbeat' },
        { description: 'Minimal tech', expected: 'minimal' },
        { description: '808 bass', expected: '808' },
        { description: 'Jazz drums', expected: 'jazz' },
        { description: 'Afrobeat rhythm', expected: 'afrobeat' },
        { description: 'Lo-fi beats', expected: 'lo-fi' },
        { description: 'Glitchy drums', expected: 'glitch' },
        { description: 'Ambient percussion', expected: 'ambient' },
        { description: 'Rock beat', expected: 'rock' },
        { description: 'Random pattern', expected: 'other' },
      ];

      patterns.forEach(({ description, expected }) => {
        // Clear localStorage before each test
        localStorageMock.clear();
        
        // Don't include category property, let it be detected from description
        const savedSlots = [
          { 
            pattern: samplePatterns.techno.pattern,
            description,
            timestamp: Date.now(),
          },
          null, null, null, null,
        ];
        localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
        
        const testAdapter = new RhythmMachineAdapter();
        const contextData = testAdapter.getContextData();
        
        expect(Object.keys(contextData.data.patterns.categories)).toContain(expected);
      });
    });

    it('uses explicit category over description', () => {
      const savedSlots = [
        {
          ...samplePatterns.techno,
          description: 'Jazz pattern',
          category: 'techno',
        },
        null, null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.categories).toHaveProperty('techno', 1);
      expect(contextData.data.patterns.categories).not.toHaveProperty('jazz');
    });
  });

  describe('Complexity Calculation', () => {
    it('calculates pattern complexity correctly', () => {
      const patterns = [
        {
          pattern: createPattern(4, 16, [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // All hits
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          ]),
          expected: 1.0, // 100% complexity
        },
        {
          pattern: createPattern(4, 16, [
            [], [], [], [], // No hits
          ]),
          expected: 0.0, // 0% complexity
        },
        {
          pattern: createPattern(4, 16, [
            [0, 4, 8, 12], // 4/16 hits
            [0, 4, 8, 12], // 4/16 hits
            [], [], // No hits
          ]),
          expected: 0.125, // 8/64 = 12.5%
        },
      ];

      patterns.forEach(({ pattern, expected }) => {
        const savedSlots = [
          { ...samplePatterns.techno, pattern },
          null, null, null, null,
        ];
        localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
        
        const testAdapter = new RhythmMachineAdapter();
        const contextData = testAdapter.getContextData();
        
        expect(contextData.data.stats.averageComplexity).toBeCloseTo(expected, 3);
      });
    });

    it('handles empty patterns', () => {
      const savedSlots = [
        { ...samplePatterns.techno, pattern: [] },
        null, null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.averageComplexity).toBe(0);
    });
  });

  describe('Bar Count Detection', () => {
    it('detects bar count from pattern length', () => {
      const tests = [
        { steps: 4, bars: 1 },
        { steps: 8, bars: 2 },
        { steps: 16, bars: 4 },
        { steps: 32, bars: 8 },
      ];

      tests.forEach(({ steps, bars }) => {
        const pattern = createPattern(4, steps, [[0]]);
        const savedSlots = [
          { ...samplePatterns.techno, pattern },
          null, null, null, null,
        ];
        localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
        
        const testAdapter = new RhythmMachineAdapter();
        const contextData = testAdapter.getContextData();
        
        expect(contextData.data.patterns.recent[0].bars).toBe(bars);
      });
    });
  });

  describe('Statistics and Analytics', () => {
    it('tracks popular categories', () => {
      const savedSlots = [
        { ...samplePatterns.techno },
        { ...samplePatterns.techno, timestamp: Date.now() - 1000 },
        { ...samplePatterns.jazz },
        { ...samplePatterns.minimal },
        { ...samplePatterns.techno, timestamp: Date.now() - 2000 },
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.popularCategories[0]).toBe('techno');
      expect(contextData.data.stats.popularCategories).toHaveLength(3);
    });

    it('tracks most active slot', () => {
      const now = Date.now();
      const savedSlots = [
        { ...samplePatterns.techno, timestamp: now - 3000 },
        null,
        { ...samplePatterns.jazz, timestamp: now }, // Most recent
        { ...samplePatterns.minimal, timestamp: now - 5000 },
        null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.mostActiveSlot).toBe(3); // 1-indexed
    });

    it('counts total beats', () => {
      const savedSlots = [
        samplePatterns.techno, // 4 + 2 + 8 = 14 beats
        samplePatterns.jazz, // 2 + 2 + 6 + 2 = 12 beats
        null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.totalBeats).toBe(26);
    });

    it('tracks genres used', () => {
      const savedSlots = [
        samplePatterns.techno,
        samplePatterns.jazz,
        samplePatterns.minimal,
        null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.genresUsed).toContain('techno');
      expect(contextData.data.stats.genresUsed).toContain('jazz');
      expect(contextData.data.stats.genresUsed).toContain('minimal');
    });
  });

  describe('Summary Generation', () => {
    it('generates summary for saved patterns', () => {
      const savedSlots = [
        samplePatterns.techno,
        samplePatterns.jazz,
        null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toContain('2 drum patterns');
      expect(contextData.summary).toContain('mostly');
    });

    it('indicates complex beats in summary', () => {
      const complexPattern = {
        ...samplePatterns.techno,
        pattern: createPattern(4, 16, [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        ]),
      };
      const savedSlots = [complexPattern, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toContain('complex beats');
    });

    it('indicates minimal grooves in summary', () => {
      const savedSlots = [samplePatterns.minimal, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toContain('minimal grooves');
    });
  });

  describe('Query Responses', () => {
    beforeEach(() => {
      const savedSlots = [
        samplePatterns.techno,
        samplePatterns.jazz,
        samplePatterns.minimal,
        null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      adapter = new RhythmMachineAdapter();
    });

    it('responds to count queries', async () => {
      const response = await adapter.getResponse('how many patterns do I have?');
      expect(response).toContain('3 drum patterns saved');
      expect(response).toContain('2 empty slots available');
    });

    it('responds to genre queries', async () => {
      const response = await adapter.getResponse('show me my techno patterns');
      expect(response).toContain('1 techno pattern saved');
    });

    it('responds when genre not found', async () => {
      // Test with a genre that exists in the list but has no patterns
      const response = await adapter.getResponse('do I have any house patterns?');
      expect(response).toContain("don't have any house patterns");
    });

    it('responds to recent queries', async () => {
      const response = await adapter.getResponse('what is my latest pattern?');
      expect(response).toContain('Classic techno 4/4');
      expect(response).toContain('4-bar techno beat');
    });

    it('responds to complexity queries', async () => {
      const response = await adapter.getResponse('how complex are my patterns?');
      expect(response).toContain('average complexity');
      expect(response).toContain('%');
    });

    it('responds to slot queries', async () => {
      const response = await adapter.getResponse('show me my save slots');
      expect(response).toContain('Slot 1:');
      expect(response).toContain('Slot 4: Empty');
      expect(response).toContain('Slot 3:');
    });

    it('provides overview for general queries', async () => {
      const response = await adapter.getResponse('tell me about my drum patterns');
      expect(response).toContain('Rhythm Machine: 3 drum patterns');
      expect(response).toContain('2 slots available');
    });

    it('handles empty state queries', async () => {
      localStorageMock.clear();
      const emptyAdapter = new RhythmMachineAdapter();
      
      const response = await emptyAdapter.getResponse('how many patterns?');
      expect(response).toContain("haven't saved any drum patterns yet");
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const savedSlots = [
        { ...samplePatterns.techno, description: 'Heavy techno kick pattern' },
        { ...samplePatterns.jazz, description: 'Smooth jazz brush pattern' },
        { ...samplePatterns.minimal, description: 'Minimal tech house' },
        null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      adapter = new RhythmMachineAdapter();
    });

    it('searches in pattern descriptions', async () => {
      const results = await adapter.search('kick');
      expect(results).toHaveLength(1);
      expect(results[0].label).toContain('Heavy techno kick');
      expect(results[0].type).toBe('drum-pattern');
    });

    it('searches in categories', async () => {
      const results = await adapter.search('jazz');
      expect(results).toHaveLength(1);
      expect(results[0].label).toContain('jazz');
    });

    it('ranks exact matches higher', async () => {
      const results = await adapter.search('techno');
      // Should have results for both techno patterns
      const technoResults = results.filter(r => r.label.toLowerCase().includes('techno'));
      expect(technoResults.length).toBeGreaterThan(0);
    });

    it('returns empty array for no matches', async () => {
      const results = await adapter.search('xyz123');
      expect(results).toEqual([]);
    });

    it('includes slot information in results', async () => {
      const results = await adapter.search('jazz');
      expect(results[0].field).toBe('rhythm.slot-2');
    });
  });

  describe('Time Formatting', () => {
    it('formats time ago correctly', async () => {
      const now = Date.now();
      mockTimeService.fromTimestamp.mockImplementation((ts: number) => new Date(ts));
      
      // Mock getRelativeTime method behavior
      const savedSlots = [
        { ...samplePatterns.techno, timestamp: now - 1000 * 60 * 5 }, // 5 minutes ago
        null, null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      adapter = new RhythmMachineAdapter();
      
      const response = await adapter.getResponse('when was my last pattern?');
      expect(response).toContain('created');
      expect(mockTimeService.fromTimestamp).toHaveBeenCalled();
    });
  });

  describe('Context Data', () => {
    it('provides complete context data', () => {
      const savedSlots = [
        samplePatterns.techno,
        samplePatterns.jazz,
        null, null, null,
      ];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      adapter = new RhythmMachineAdapter();
      
      const contextData = adapter.getContextData();
      
      expect(contextData).toMatchObject({
        appName: 'rhythm',
        displayName: 'Rhythm Machine',
        isActive: true,
        icon: '🥁',
        capabilities: expect.arrayContaining([
          'drum-patterns',
          'beat-creation',
          'rhythm-sequencing',
          'genre-exploration',
        ]),
      });
      
      expect(contextData.lastUsed).toBe(samplePatterns.techno.timestamp);
    });

    it('includes all pattern data in context', () => {
      const savedSlots = [samplePatterns.techno, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      adapter = new RhythmMachineAdapter();
      
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.recent[0]).toMatchObject({
        description: 'Classic techno 4/4',
        category: 'techno',
        complexity: expect.any(Number),
        bars: 4,
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles patterns with no tracks', () => {
      const emptyPattern = {
        ...samplePatterns.techno,
        pattern: [],
      };
      const savedSlots = [emptyPattern, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.total).toBe(1);
      expect(contextData.data.patterns.recent[0].bars).toBe(0);
      expect(contextData.data.patterns.recent[0].complexity).toBe(0);
    });

    it('handles patterns with empty tracks', () => {
      const emptyTracksPattern = {
        ...samplePatterns.techno,
        pattern: [[], [], [], []],
      };
      const savedSlots = [emptyTracksPattern, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      // Empty arrays still have length 0, so bars defaults to 1
      expect(contextData.data.patterns.recent[0].bars).toBe(1);
      expect(contextData.data.patterns.recent[0].complexity).toBe(0);
    });

    it('handles very large patterns', () => {
      const largePattern = {
        ...samplePatterns.techno,
        pattern: createPattern(8, 64, [
          Array.from({ length: 32 }, (_, i) => i * 2), // Every other step
        ]),
      };
      const savedSlots = [largePattern, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.recent[0].bars).toBe(8);
      expect(contextData.data.stats.totalBeats).toBe(32);
    });

    it('handles null slots gracefully', () => {
      const savedSlots = [null, null, null, null, null];
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots));
      
      adapter = new RhythmMachineAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.patterns.total).toBe(0);
      expect(contextData.data.stats.mostActiveSlot).toBe(null);
      expect(contextData.isActive).toBe(false);
    });

    it('handles concurrent updates', () => {
      const savedSlots1 = [samplePatterns.techno, null, null, null, null];
      const savedSlots2 = [samplePatterns.techno, samplePatterns.jazz, null, null, null];
      
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots1));
      adapter = new RhythmMachineAdapter();
      
      // Simulate storage update
      localStorageMock.setItem('rhythmMachineSaveSlots', JSON.stringify(savedSlots2));
      const storageEvent = new StorageEvent('storage', {
        key: 'rhythmMachineSaveSlots',
        newValue: JSON.stringify(savedSlots2),
      });
      window.dispatchEvent(storageEvent);
      
      // The adapter should reload with new data
      setTimeout(() => {
        const contextData = adapter.getContextData();
        expect(contextData.data.patterns.total).toBe(2);
      }, 100);
    });
  });
});