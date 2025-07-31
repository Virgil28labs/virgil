/**
 * StreakAdapterRefactored Test Suite
 * 
 * Tests the Habit Streak adapter service that provides unified access to
 * habit tracking data, streaks, and daily check-ins for Virgil AI assistant.
 */

import { StreakAdapterRefactored } from '../StreakAdapterRefactored';
import { StorageService } from '../../StorageService';
import { dashboardContextService } from '../../DashboardContextService';
import { timeService } from '../../TimeService';
import type { UserHabitsData } from '../../../types/habit.types';

// Mock dependencies
jest.mock('../../StorageService', () => ({
  StorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
  STORAGE_KEYS: {
    VIRGIL_HABITS: 'virgil_habits',
  },
}));

jest.mock('../../DashboardContextService', () => ({
  dashboardContextService: {
    getLocalDate: jest.fn(() => '2024-01-20'),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1642672800000), // Fixed timestamp
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
    formatDateToLocal: jest.fn((date: Date) => date.toISOString().split('T')[0]),
    subtractDays: jest.fn((date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
    fromTimestamp: jest.fn((ts: number) => new Date(ts)),
    getTimeAgo: jest.fn(() => '2 hours ago'),
    getLocalDate: jest.fn(() => '2024-01-20'),
    toISOString: jest.fn((date?: Date) => (date || new Date()).toISOString()),
    parseDate: jest.fn((dateStr: string) => new Date(dateStr)),
    formatDate: jest.fn((date: Date) => date.toLocaleDateString()),
  },
}));

const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;
const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('StreakAdapterRefactored', () => {
  let adapter: StreakAdapterRefactored;

  // Sample test data
  const mockHabitsData: UserHabitsData = {
    habits: [
      {
        id: 'habit-1',
        name: 'Morning Exercise',
        emoji: '🏃‍♂️',
        streak: 5,
        longestStreak: 12,
        lastCheckIn: '2024-01-20',
        checkIns: ['2024-01-20', '2024-01-19', '2024-01-18', '2024-01-17', '2024-01-16'],
        createdAt: '2024-01-01',
      },
      {
        id: 'habit-2',
        name: 'Read Books',
        emoji: '📚',
        streak: 3,
        longestStreak: 8,
        lastCheckIn: '2024-01-20',
        checkIns: ['2024-01-20', '2024-01-19', '2024-01-18'],
        createdAt: '2024-01-01',
      },
      {
        id: 'habit-3',
        name: 'Meditation',
        emoji: '🧘‍♂️',
        streak: 0,
        longestStreak: 15,
        lastCheckIn: '2024-01-18',
        checkIns: ['2024-01-18', '2024-01-17', '2024-01-16'],
        createdAt: '2024-01-01',
      },
    ],
    achievements: [],
    settings: { soundEnabled: true },
    stats: {
      totalCheckIns: 11,
      currentStreak: 5,
      perfectDays: ['2024-01-18', '2024-01-17'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default to successful data loading
    mockStorageService.get.mockReturnValue(mockHabitsData);
    mockDashboardContextService.getLocalDate.mockReturnValue('2024-01-20');
    
    // Create new adapter instance
    adapter = new StreakAdapterRefactored();
  });

  describe('Adapter Properties', () => {
    it('has correct app configuration', () => {
      expect(adapter.appName).toBe('streaks');
      expect(adapter.displayName).toBe('Habit Streaks');
      expect(adapter.icon).toBe('🔥');
    });

    it('returns correct keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('habit');
      expect(keywords).toContain('habits');
      expect(keywords).toContain('streak');
      expect(keywords).toContain('streaks');
      expect(keywords).toContain('check in');
      expect(keywords).toContain('check-in');
      expect(keywords).toContain('daily');
      expect(keywords).toContain('routine');
      expect(keywords).toContain('progress');
      expect(keywords).toContain('perfect day');
      expect(keywords).toContain('consistency');
      expect(keywords).toContain('tracking');
      expect(keywords).toContain('morning exercise');
      expect(keywords).toContain('read books');
      expect(keywords).toContain('meditation');
      expect(keywords.length).toBeGreaterThan(10);
    });

    it('returns correct capabilities', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.capabilities).toEqual([
        'habit-tracking',
        'streak-management',
        'daily-check-ins',
        'progress-tracking',
        'perfect-days',
        'achievement-tracking',
      ]);
    });
  });

  describe('Data Loading', () => {
    it('loads habits data successfully from StorageService', () => {
      const adapter = new StreakAdapterRefactored();
      
      expect(mockStorageService.get).toHaveBeenCalledWith('virgil_habits', {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: {
          totalCheckIns: 0,
          currentStreak: 0,
          perfectDays: [],
        },
      });
      
      const contextData = adapter.getContextData();
      expect(contextData.data.habits.length).toBe(3);
    });

    it('handles StorageService errors gracefully', () => {
      mockStorageService.get.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      // Should fall back to empty state
      expect(contextData.data.habits.length).toBe(0);
      expect(contextData.isActive).toBe(false);
    });

    it('sets timestamp when data is loaded', () => {
      const adapter = new StreakAdapterRefactored();
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });

    it('handles empty habits data', () => {
      const emptyData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: {
          totalCheckIns: 0,
          currentStreak: 0,
          perfectDays: [],
        },
      };
      mockStorageService.get.mockReturnValue(emptyData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.habits.length).toBe(0);
      expect(contextData.isActive).toBe(false);
      expect(contextData.summary).toBe('No habits tracked yet');
    });
  });

  describe('Data Transformation', () => {
    it('transforms habits data correctly', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.data.habits).toHaveLength(3);
      
      const exerciseHabit = contextData.data.habits.find(h => h.name === 'Morning Exercise');
      expect(exerciseHabit).toEqual({
        id: 'habit-1',
        name: 'Morning Exercise',
        emoji: '🏃‍♂️',
        streak: 5,
        longestStreak: 12,
        lastCheckIn: '2024-01-20',
        totalCheckIns: 5,
        isCheckedToday: true,
      });
    });

    it('calculates statistics correctly', () => {
      const contextData = adapter.getContextData();
      const stats = contextData.data.stats;
      
      expect(stats.totalHabits).toBe(3);
      expect(stats.totalCheckIns).toBe(11); // 5 + 3 + 3
      expect(stats.bestStreak).toBe(15); // Meditation's longest streak
      expect(stats.habitsCompletedToday).toBe(2); // Exercise and Reading completed today
      expect(stats.perfectDaysCount).toBe(2);
      expect(stats.lastPerfectDay).toBe('2024-01-17');
    });

    it('identifies checked today habits correctly', () => {
      const contextData = adapter.getContextData();
      const checkedToday = contextData.data.habits.filter(h => h.isCheckedToday);
      
      expect(checkedToday).toHaveLength(2);
      expect(checkedToday.map(h => h.name)).toEqual(['Morning Exercise', 'Read Books']);
    });

    it('calculates recent activity correctly', () => {
      // Mock recent dates for activity calculation
      mockTimeService.formatDateToLocal.mockImplementation((date: Date) => {
        const dayOffset = Math.floor((date.getTime() - new Date('2024-01-20').getTime()) / (24 * 60 * 60 * 1000));
        return new Date('2024-01-20').toISOString().split('T')[0];
      });
      
      const contextData = adapter.getContextData();
      expect(contextData.data.recentActivity).toBeDefined();
      expect(Array.isArray(contextData.data.recentActivity)).toBe(true);
    });

    it('handles missing perfectDays gracefully', () => {
      const dataWithoutPerfectDays = {
        ...mockHabitsData,
        stats: {
          ...mockHabitsData.stats,
          perfectDays: undefined as any,
        },
      };
      mockStorageService.get.mockReturnValue(dataWithoutPerfectDays);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.stats.perfectDaysCount).toBe(0);
      expect(contextData.data.stats.lastPerfectDay).toBeNull();
    });
  });

  describe('Context Data Generation', () => {
    it('marks app as active when habits were checked today', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(true); // Exercise and Reading checked today
    });

    it('marks app as inactive when no recent activity', () => {
      // Mock data with no recent check-ins
      const oldData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          lastCheckIn: '2024-01-10', // Old date
        })),
      };
      mockStorageService.get.mockReturnValue(oldData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.isActive).toBe(false);
    });

    it('sets lastUsed to most recent check-in timestamp', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.lastUsed).toBeGreaterThan(0);
    });

    it('sets lastUsed to 0 when no habits', () => {
      const emptyData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 0, currentStreak: 0, perfectDays: [] },
      };
      mockStorageService.get.mockReturnValue(emptyData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.lastUsed).toBe(0);
    });

    it('includes app metadata correctly', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('streaks');
      expect(contextData.displayName).toBe('Habit Streaks');
      expect(contextData.icon).toBe('🔥');
    });
  });

  describe('Summary Generation', () => {
    it('returns no habits message for empty state', () => {
      const emptyData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 0, currentStreak: 0, perfectDays: [] },
      };
      mockStorageService.get.mockReturnValue(emptyData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('No habits tracked yet');
    });

    it('generates comprehensive summary with all info', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 habits, 2 completed today, 5 day streak');
    });

    it('omits completed today when none completed', () => {
      // Mock data with no habits completed today
      mockDashboardContextService.getLocalDate.mockReturnValue('2024-01-21'); // Different day
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 habits, 5 day streak');
    });

    it('omits streak when no active streaks', () => {
      const noStreaksData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          streak: 0,
        })),
      };
      mockStorageService.get.mockReturnValue(noStreaksData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.summary).toBe('3 habits, 2 completed today');
    });

    it('returns No activity when no habits and no activity', () => {
      const emptyActiveData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 0, currentStreak: 0, perfectDays: [] },
      };
      mockStorageService.get.mockReturnValue(emptyActiveData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      // Context data should show empty state
      expect(contextData.summary).toBe('No habits tracked yet');
    });
  });

  describe('Query Response System', () => {
    beforeEach(() => {
      // Set up consistent data for query tests
      mockStorageService.get.mockReturnValue(mockHabitsData);
      adapter = new StreakAdapterRefactored();
    });

    it('responds to specific habit queries', async () => {
      const response = await adapter.getResponse('How is my morning exercise habit?');
      
      expect(response).toContain('🏃‍♂️ **Morning Exercise**:');
      expect(response).toContain('✅ Completed today');
      expect(response).toContain('🔥 Current streak: 5 days');
      expect(response).toContain('🏆 Best streak: 12 days');
      expect(response).toContain('📊 Total check-ins: 5');
    });

    it('responds to today progress queries', async () => {
      const response = await adapter.getResponse('What did I complete today?');
      
      expect(response).toContain('You\'ve completed 2 out of 3 habits today');
      expect(response).toContain('Morning Exercise, Read Books');
      expect(response).toContain('1 habits remaining');
    });

    it('responds to streak queries', async () => {
      const response = await adapter.getResponse('What are my current streaks?');
      
      expect(response).toContain('Your current streaks:');
      expect(response).toContain('🏃‍♂️ Morning Exercise: 5 days');
      expect(response).toContain('📚 Read Books: 3 days');
      expect(response).toContain('Best all-time streak: 15 days');
    });

    it('responds to perfect days queries', async () => {
      const response = await adapter.getResponse('Tell me about my perfect days');
      
      expect(response).toContain('You\'ve had 2 perfect days!');
      expect(response).toContain('Your last perfect day was');
    });

    it('provides general summary for broad queries', async () => {
      const response = await adapter.getResponse('Tell me about my habits');
      
      expect(response).toContain('You\'re tracking 3 habits:');
      expect(response).toContain('✅ 🏃‍♂️ Morning Exercise (5 day streak)');
      expect(response).toContain('✅ 📚 Read Books (3 day streak)');
      expect(response).toContain('⏳ 🧘‍♂️ Meditation');
      expect(response).toContain('📊 Total check-ins: 11');
      expect(response).toContain('🏆 Best streak: 15 days');
      expect(response).toContain('⭐ Perfect days: 2');
    });

    it('handles no data state in queries', async () => {
      const emptyData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 0, currentStreak: 0, perfectDays: [] },
      };
      mockStorageService.get.mockReturnValue(emptyData);
      adapter = new StreakAdapterRefactored();
      
      const response = await adapter.getResponse('What are my habits?');
      
      expect(response).toContain('haven\'t set up any habits yet');
    });

    it('handles advice queries by returning empty string', async () => {
      const response = await adapter.getResponse('What habits should I start?');
      
      expect(response).toBe('');
    });
  });

  describe('Response Message Variations', () => {
    it('handles perfect day completion correctly', async () => {
      // Mock all habits completed today
      const perfectDayData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          lastCheckIn: '2024-01-20',
        })),
      };
      mockStorageService.get.mockReturnValue(perfectDayData);
      adapter = new StreakAdapterRefactored();
      
      const response = await adapter.getResponse('How did I do today?');
      
      expect(response).toContain('You\'ve completed 3 out of 3 habits today');
      expect(response).toContain('🎉 Perfect day!');
    });

    it('handles no habits completed today', async () => {
      // Mock no habits completed today
      mockDashboardContextService.getLocalDate.mockReturnValue('2024-01-21');
      adapter = new StreakAdapterRefactored();
      
      const response = await adapter.getResponse('What about today?');
      
      expect(response).toContain('You haven\'t completed any habits today');
      expect(response).toContain('You have 3 habits to work on');
    });

    it('handles no active streaks correctly', async () => {
      const noStreaksData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          streak: 0,
        })),
      };
      mockStorageService.get.mockReturnValue(noStreaksData);
      adapter = new StreakAdapterRefactored();
      
      const response = await adapter.getResponse('What are my streaks?');
      
      expect(response).toContain('You don\'t have any active streaks');
      expect(response).toContain('Start checking in daily to build them!');
    });

    it('handles no perfect days correctly', async () => {
      const noPerfectDaysData = {
        ...mockHabitsData,
        stats: {
          ...mockHabitsData.stats,
          perfectDays: [],
        },
      };
      mockStorageService.get.mockReturnValue(noPerfectDaysData);
      adapter = new StreakAdapterRefactored();
      
      const response = await adapter.getResponse('Perfect days?');
      
      expect(response).toContain('You haven\'t had any perfect days yet');
      expect(response).toContain('Complete all your habits in one day to achieve this!');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      adapter = new StreakAdapterRefactored();
    });

    it('searches for habits by name', async () => {
      const results = await adapter.search('exercise');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('habit');
      expect(results[0].label).toBe('🏃‍♂️ Morning Exercise');
      expect(results[0].value).toBe('5 day streak');
      expect(results[0].field).toBe('habit.habit-1');
    });

    it('searches for habits by emoji', async () => {
      const results = await adapter.search('📚');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('habit');
      expect(results[0].label).toBe('📚 Read Books');
      expect(results[0].value).toBe('3 day streak');
      expect(results[0].field).toBe('habit.habit-2');
    });

    it('returns multiple results for partial matches', async () => {
      const results = await adapter.search('a'); // Should match Reading and Meditation
      
      expect(results.length).toBeGreaterThan(0);
      const labels = results.map(r => r.label);
      expect(labels.some(label => label.includes('Read Books'))).toBe(true);
    });

    it('returns empty results for non-matching queries', async () => {
      const results = await adapter.search('nonexistent habit');
      
      expect(results).toHaveLength(0);
    });

    it('handles case-insensitive searches', async () => {
      const results = await adapter.search('MEDITATION');
      
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('🧘‍♂️ Meditation');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles StorageService.get throwing errors', () => {
      mockStorageService.get.mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      
      expect(() => new StreakAdapterRefactored()).not.toThrow();
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      // Should fall back to empty state
      expect(contextData.data.habits).toHaveLength(0);
      expect(contextData.isActive).toBe(false);
    });

    it('handles malformed habit data gracefully', () => {
      const malformedData = {
        ...mockHabitsData,
        habits: [
          { id: 'habit-1', name: 'Test' }, // Missing required fields
        ] as any,
      };
      mockStorageService.get.mockReturnValue(malformedData);
      
      const adapter = new StreakAdapterRefactored();
      
      expect(() => adapter.getContextData()).not.toThrow();
    });

    it('handles empty check-ins arrays', () => {
      const emptyCheckInsData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          checkIns: [],
        })),
      };
      mockStorageService.get.mockReturnValue(emptyCheckInsData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.habits.every(h => h.totalCheckIns === 0)).toBe(true);
    });

    it('handles invalid dates in check-ins', () => {
      const invalidDateData = {
        ...mockHabitsData,
        habits: mockHabitsData.habits.map(h => ({
          ...h,
          checkIns: ['invalid-date', '2024-01-20'],
          lastCheckIn: 'invalid-date',
        })),
      };
      mockStorageService.get.mockReturnValue(invalidDateData);
      
      const adapter = new StreakAdapterRefactored();
      
      expect(() => adapter.getContextData()).not.toThrow();
    });

    it('ensures data freshness on multiple calls', () => {
      const adapter = new StreakAdapterRefactored();
      
      // Make multiple calls
      adapter.getContextData();
      adapter.getContextData();
      
      expect(mockTimeService.getTimestamp).toHaveBeenCalled();
    });
  });

  describe('Time Handling', () => {
    it('uses timeService for date operations', () => {
      const adapter = new StreakAdapterRefactored();
      adapter.getContextData();
      
      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockTimeService.formatDateToLocal).toHaveBeenCalled();
      expect(mockTimeService.subtractDays).toHaveBeenCalled();
    });

    it('uses dashboardContextService for current date', () => {
      const adapter = new StreakAdapterRefactored();
      adapter.getContextData();
      
      expect(mockDashboardContextService.getLocalDate).toHaveBeenCalled();
    });

    it('calculates relative time for perfect days correctly', async () => {
      mockTimeService.getTimeAgo = jest.fn(() => '3 days ago');
      
      const response = await adapter.getResponse('perfect days');
      
      expect(response).toContain('3 days ago');
    });
  });

  describe('Habit Data Validation', () => {
    it('handles habits without optional fields', () => {
      const minimalHabitsData = {
        ...mockHabitsData,
        habits: [
          {
            id: 'minimal-1',
            name: 'Minimal Habit',
            emoji: '⭐',
            streak: 1,
            longestStreak: 1,
            lastCheckIn: '2024-01-20',
            checkIns: ['2024-01-20'],
            createdAt: '2024-01-20',
          },
        ],
      };
      mockStorageService.get.mockReturnValue(minimalHabitsData);
      
      const adapter = new StreakAdapterRefactored();
      const contextData = adapter.getContextData();
      
      expect(contextData.data.habits).toHaveLength(1);
      expect(contextData.data.habits[0].name).toBe('Minimal Habit');
    });

    it('preserves all habit metadata', () => {
      const contextData = adapter.getContextData();
      const exerciseHabit = contextData.data.habits.find(h => h.name === 'Morning Exercise');
      
      expect(exerciseHabit?.id).toBe('habit-1');
      expect(exerciseHabit?.name).toBe('Morning Exercise');
      expect(exerciseHabit?.emoji).toBe('🏃‍♂️');
      expect(exerciseHabit?.streak).toBe(5);
      expect(exerciseHabit?.longestStreak).toBe(12);
      expect(exerciseHabit?.lastCheckIn).toBe('2024-01-20');
      expect(exerciseHabit?.totalCheckIns).toBe(5);
      expect(exerciseHabit?.isCheckedToday).toBe(true);
    });
  });
});