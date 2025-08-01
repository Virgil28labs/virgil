/**
 * CircleGameAdapter Test Suite
 * 
 * Tests the Perfect Circle game adapter that provides unified access to
 * game scores, statistics, achievements, and performance analysis.
 */

import { CircleGameAdapter } from '../CircleGameAdapter';
import { timeService } from '../../TimeService';

// Mock dependencies
jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1642672800000), // Fixed timestamp
    fromTimestamp: jest.fn((ts: number) => new Date(ts)),
    getTimeAgo: jest.fn(() => '2 hours ago'),
    toISOString: jest.fn((date?: Date) => (date || new Date()).toISOString()),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('CircleGameAdapter', () => {
  let adapter: CircleGameAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Create new adapter instance
    adapter = new CircleGameAdapter();
  });

  describe('Adapter Properties', () => {
    it('has correct app configuration', () => {
      expect(adapter.appName).toBe('circle');
      expect(adapter.displayName).toBe('Perfect Circle');
      expect(adapter.icon).toBe('⭕');
    });

    it('returns correct keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('circle');
      expect(keywords).toContain('perfect circle');
      expect(keywords).toContain('draw circle');
      expect(keywords).toContain('circle game');
      expect(keywords).toContain('drawing');
      expect(keywords).toContain('attempts');
      expect(keywords.length).toBeGreaterThan(10);
    });

    it('returns correct capabilities', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.capabilities).toEqual([
        'game-scores',
        'skill-tracking',
        'achievement-system',
        'performance-analysis',
      ]);
    });
  });

  describe('Data Loading', () => {
    it('loads default values when no localStorage data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.best).toBe(0);
      expect(contextData.data.scores.attempts).toBe(0);
      expect(contextData.data.scores.averageScore).toBe(0);
      expect(contextData.data.scores.lastPlayed).toBe(0);
    });

    it('loads existing best score from localStorage', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '87';
        if (key === 'perfectCircleAttempts') return '15';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.best).toBe(87);
      expect(contextData.data.scores.attempts).toBe(15);
    });

    it('loads score history from localStorage', () => {
      const scoreHistory = [85, 90, 87, 92, 88];
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleBestScore') return '92';
        if (key === 'perfectCircleAttempts') return '5';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.averageScore).toBe(88); // (85+90+87+92+88)/5 = 88.4, rounded to 88
    });

    it('loads last play time from localStorage', () => {
      const lastPlayTime = 1642600000000;
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleLastPlay') return String(lastPlayTime);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.lastPlayed).toBe(lastPlayTime);
    });

    it('handles corrupt localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return 'invalid-json';
        if (key === 'perfectCircleBestScore') return 'not-a-number';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      // Should fall back to defaults
      expect(contextData.data.scores.best).toBe(0);
      expect(contextData.data.scores.averageScore).toBe(0);
    });
  });

  describe('Score Calculations', () => {
    it('calculates correct average score', () => {
      const scoreHistory = [75, 80, 85, 90, 95];
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleBestScore') return '95';
        if (key === 'perfectCircleAttempts') return '5';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.averageScore).toBe(85); // (75+80+85+90+95)/5 = 85
    });

    it('returns zero average for empty score history', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.averageScore).toBe(0);
    });

    it('calculates improvement rate correctly', () => {
      // Scores showing improvement: older avg = 70, newer avg = 90
      const scoreHistory = [65, 75, 85, 95]; // First half: 70, Second half: 90
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleBestScore') return '95';
        if (key === 'perfectCircleAttempts') return '4';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      // Expected: (90-70)/70 = 0.286 (approximately)
      expect(contextData.data.stats.improvementRate).toBeCloseTo(0.286, 2);
    });

    it('returns zero improvement rate for insufficient data', () => {
      const scoreHistory = [85]; // Only one score
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.improvementRate).toBe(0);
    });

    it('returns zero improvement rate when scores decline', () => {
      // Scores showing decline: older avg = 90, newer avg = 70
      const scoreHistory = [95, 85, 75, 65]; // First half: 90, Second half: 70
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.improvementRate).toBe(0);
    });
  });

  describe('Score Distribution', () => {
    it('categorizes scores correctly', () => {
      const scoreHistory = [98, 88, 78, 68, 48, 28]; // One in each category
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleBestScore') return '98';
        if (key === 'perfectCircleAttempts') return '6';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      const distribution = contextData.data.stats.scoreDistribution;
      
      expect(distribution.perfect).toBe(1);    // 98 (95-100)
      expect(distribution.excellent).toBe(1);  // 88 (85-94)
      expect(distribution.great).toBe(1);      // 78 (75-84)
      expect(distribution.good).toBe(1);       // 68 (60-74)
      expect(distribution.fair).toBe(1);       // 48 (40-59)
      expect(distribution.needsWork).toBe(1);  // 28 (0-39)
    });

    it('counts perfect scores correctly', () => {
      const scoreHistory = [96, 97, 98, 99, 100];
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleBestScore') return '100';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.perfectScores).toBe(5);
      expect(contextData.data.stats.scoreDistribution.perfect).toBe(5);
    });

    it('handles empty score history', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      const distribution = contextData.data.stats.scoreDistribution;
      
      expect(distribution.perfect).toBe(0);
      expect(distribution.excellent).toBe(0);
      expect(distribution.great).toBe(0);
      expect(distribution.good).toBe(0);
      expect(distribution.fair).toBe(0);
      expect(distribution.needsWork).toBe(0);
    });
  });

  describe('Achievement System', () => {
    it('unlocks First Perfect achievement for score >= 95', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '96';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.firstPerfect).toBe(true);
    });

    it('does not unlock First Perfect for score < 95', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '94';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.firstPerfect).toBe(false);
    });

    it('unlocks Consistent Player for 20+ attempts', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '25';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.consistentPlayer).toBe(true);
    });

    it('unlocks Circle Novice for 5+ attempts', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '7';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.circleNovice).toBe(true);
    });

    it('unlocks Improving Artist for improvement rate > 0.1', () => {
      // Set up scores with significant improvement
      const scoreHistory = [60, 70, 85, 95]; // Improvement from 65 to 90
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.improvingArtist).toBe(true);
    });

    it('unlocks Circle Master for 3+ perfect scores', () => {
      const scoreHistory = [96, 97, 98, 99]; // 4 perfect scores
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.circleMaster).toBe(true);
    });

    it('does not unlock Circle Master with < 3 perfect scores', () => {
      const scoreHistory = [96, 97, 85, 80]; // Only 2 perfect scores
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.achievements.circleMaster).toBe(false);
    });
  });

  describe('Context Data Generation', () => {
    it('marks app as active when attempts > 0', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '5';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(true);
    });

    it('marks app as inactive when no attempts', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(false);
    });

    it('sets lastUsed to lastPlayTime', () => {
      const lastPlayTime = 1642600000000;
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleLastPlay') return String(lastPlayTime);
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.lastUsed).toBe(lastPlayTime);
    });

    it('includes app metadata correctly', () => {
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('circle');
      expect(contextData.displayName).toBe('Perfect Circle');
      expect(contextData.icon).toBe('⭕');
    });
  });

  describe('Summary Generation', () => {
    it('returns no attempts message for empty state', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('No circles drawn yet');
    });

    it('generates summary with best score and attempts', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '82';
        if (key === 'perfectCircleAttempts') return '12';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('Best: 82%, 12 attempts, Getting good!');
    });

    it('adds Master artist message for perfect scores', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '97';
        if (key === 'perfectCircleAttempts') return '5';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('Best: 97%, 5 attempts, Master artist!');
    });

    it('adds Excellent drawer message for excellent scores', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '89';
        if (key === 'perfectCircleAttempts') return '8';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('Best: 89%, 8 attempts, Excellent drawer');
    });
  });

  describe('Query Response System', () => {
    beforeEach(() => {
      // Set up some sample data for query tests
      const scoreHistory = [85, 90, 87, 92, 88];
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '92';
        if (key === 'perfectCircleAttempts') return '5';
        if (key === 'perfectCircleScoreHistory') return JSON.stringify(scoreHistory);
        if (key === 'perfectCircleLastPlay') return '1642600000000';
        return null;
      });
      
      adapter = new CircleGameAdapter();
    });

    it('responds to score queries', async () => {
      const response = await adapter.getResponse('What is my best score?');
      
      expect(response).toContain('92%');
      expect(response).toContain('Excellent! Almost perfect!'); // 92% falls in 85-94 range
      expect(response).toContain('average score is 88%');
    });

    it('responds to attempts queries', async () => {
      const response = await adapter.getResponse('How many times have I played?');
      
      expect(response).toContain('5 times');
      expect(response).toContain('last played 2 hours ago');
    });

    it('responds to achievement queries', async () => {
      // Set up data for achievements
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '96';
        if (key === 'perfectCircleAttempts') return '25';
        if (key === 'perfectCircleScoreHistory') return JSON.stringify([96, 97, 98]);
        return null;
      });
      
      adapter = new CircleGameAdapter();
      const response = await adapter.getResponse('What achievements do I have?');
      
      expect(response).toContain('First Perfect');
      expect(response).toContain('Consistent Player');
      expect(response).toContain('Circle Master');
    });

    it('responds to progress queries', async () => {
      const response = await adapter.getResponse('How am I improving?');
      
      expect(response).toContain('Recent scores');
      expect(response).toContain('90%, 87%, 92%, 88%');
    });

    it('responds to stats queries', async () => {
      const response = await adapter.getResponse('Show me my statistics');
      
      expect(response).toContain('Perfect Circle Statistics');
      expect(response).toContain('5 games');
    });

    it('provides overview response for general queries', async () => {
      const response = await adapter.getResponse('Tell me about perfect circle');
      
      expect(response).toContain('Perfect Circle: Best score 92%');
      expect(response).toContain('5 attempts');
    });

    it('handles no data state in queries', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      adapter = new CircleGameAdapter();
      
      const response = await adapter.getResponse('What is my score?');
      
      expect(response).toContain("You haven't played Perfect Circle yet");
    });
  });

  describe('Response Messages', () => {
    it('provides encouraging messages for different score ranges', async () => {
      // Test perfect score message
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '98';
        if (key === 'perfectCircleAttempts') return '1';
        return null;
      });
      
      let adapter = new CircleGameAdapter();
      let response = await adapter.getResponse('score');
      expect(response).toContain("That's a perfect circle! You're a true artist! ✨");

      // Test excellent score message
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '88';
        if (key === 'perfectCircleAttempts') return '1';
        return null;
      });
      
      adapter = new CircleGameAdapter();
      response = await adapter.getResponse('score');
      expect(response).toContain('Excellent! Almost perfect!');

      // Test good score message
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '65';
        if (key === 'perfectCircleAttempts') return '1';
        return null;
      });
      
      adapter = new CircleGameAdapter();
      response = await adapter.getResponse('score');
      expect(response).toContain('Good effort! Keep practicing!');

      // Test low score message
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '45';
        if (key === 'perfectCircleAttempts') return '1';
        return null;
      });
      
      adapter = new CircleGameAdapter();
      response = await adapter.getResponse('score');
      expect(response).toContain("Keep trying, you'll get better!");
    });

    it('handles singular vs plural attempts correctly', async () => {
      // Test singular
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '1';
        return null;
      });
      
      let adapter = new CircleGameAdapter();
      let response = await adapter.getResponse('attempts');
      expect(response).toContain('1 time');
      expect(response).not.toContain('1 times');

      // Test plural
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '5';
        return null;
      });
      
      adapter = new CircleGameAdapter();
      response = await adapter.getResponse('attempts');
      expect(response).toContain('5 times');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      // Set up data for search tests
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return '98'; // Need >= 95 for firstPerfect
        if (key === 'perfectCircleAttempts') return '15';
        if (key === 'perfectCircleScoreHistory') return JSON.stringify([96, 97, 98]); // 3 perfect scores for circleMaster
        return null;
      });
      
      adapter = new CircleGameAdapter();
    });

    it('searches for score information', async () => {
      const results = await adapter.search('best score');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('game-score');
      expect(results[0].label).toBe('Best score: 98%');
      expect(results[0].value).toBe('98');
      expect(results[0].field).toBe('circle.best-score');
    });

    it('searches for achievements', async () => {
      const results = await adapter.search('perfect'); // Search for 'perfect' which matches 'firstPerfect'
      
      expect(results.length).toBeGreaterThan(0);
      const firstPerfectResult = results.find(r => r.field.includes('firstPerfect'));
      expect(firstPerfectResult).toBeDefined();
      expect(firstPerfectResult?.type).toBe('achievement');
      expect(firstPerfectResult?.value).toBe('Unlocked');
    });

    it('returns empty results for non-matching queries', async () => {
      const results = await adapter.search('invalid query xyz');
      
      expect(results).toHaveLength(0);
    });

    it('formats achievement names correctly', async () => {
      const results = await adapter.search('master'); // Search for 'master' which matches 'circleMaster'
      
      const masterResult = results.find(r => r.field.includes('circleMaster'));
      expect(masterResult?.label).toBe('circle Master');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles localStorage access errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      
      expect(() => new CircleGameAdapter()).not.toThrow();
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      // Should fall back to default values
      expect(contextData.data.scores.best).toBe(0);
      expect(contextData.data.scores.attempts).toBe(0);
    });

    it('handles malformed JSON in score history', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return '{invalid json';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.averageScore).toBe(0);
    });

    it('handles non-numeric localStorage values', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBestScore') return 'not-a-number';
        if (key === 'perfectCircleAttempts') return 'also-not-a-number';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      // parseInt returns NaN for non-numeric strings
      expect(contextData.data.scores.best).toBe(NaN);
      expect(contextData.data.scores.attempts).toBe(NaN);
    });

    it('handles empty score history arrays', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return '[]';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.scores.averageScore).toBe(0);
      expect(contextData.data.stats.improvementRate).toBe(0);
    });

    it('handles single score in history for improvement calculation', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleScoreHistory') return '[85]';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.improvementRate).toBe(0);
    });

    it('ensures data freshness on context requests', () => {
      const adapter = new CircleGameAdapter();
      
      // Make multiple calls to ensure ensureFreshData is called
      adapter.getContextData();
      adapter.getContextData();
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });
  });

  describe('Time Handling', () => {
    it('uses timeService for timestamp operations', () => {
      new CircleGameAdapter();
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });

    it('formats time ago correctly in responses', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleAttempts') return '5';
        if (key === 'perfectCircleLastPlay') return '1642600000000';
        return null;
      });
      
      const adapter = new CircleGameAdapter();
      const response = await adapter.getResponse('attempts');
      
      expect(response).toContain('2 hours ago');
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(1642600000000);
      expect(mockTimeService.getTimeAgo).toHaveBeenCalled();
    });
  });
});