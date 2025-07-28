/**
 * StreakAdapter - Dashboard App Adapter for Habit Streak Tracker
 *
 * Provides unified access to habit tracking data for Virgil AI assistant,
 * enabling responses about habits, streaks, and daily check-ins.
 * 
 * Refactored to use BaseAdapter for reduced duplication.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData } from '../DashboardAppService';
import type { UserHabitsData } from '../../types/habit.types';
import { StorageService, STORAGE_KEYS } from '../StorageService';
import { dashboardContextService } from '../DashboardContextService';
import { timeService } from '../TimeService';

interface StreakData {
  habits: {
    id: string;
    name: string;
    emoji: string;
    streak: number;
    longestStreak: number;
    lastCheckIn: string | null;
    totalCheckIns: number;
    isCheckedToday: boolean;
  }[];
  stats: {
    totalHabits: number;
    totalCheckIns: number;
    bestStreak: number;
    habitsCompletedToday: number;
    perfectDaysCount: number;
    lastPerfectDay: string | null;
  };
  recentActivity: {
    date: string;
    habitsCompleted: number;
    habitNames: string[];
  }[];
}

export class StreakAdapterRefactored extends BaseAdapter<StreakData> {
  readonly appName = 'streaks';
  readonly displayName = 'Habit Streaks';
  readonly icon = '🔥';

  private userData: UserHabitsData | null = null;
  private readonly STORAGE_KEY = STORAGE_KEYS.VIRGIL_HABITS;

  constructor() {
    super();
    this.loadData();
  }

  protected loadData(): void {
    try {
      const defaultData: UserHabitsData = {
        habits: [],
        achievements: [],
        settings: { soundEnabled: true },
        stats: {
          totalCheckIns: 0,
          currentStreak: 0,
          perfectDays: [],
        },
      };
      this.userData = StorageService.get<UserHabitsData>(this.STORAGE_KEY, defaultData);
      if (this.userData && this.userData.habits.length > 0) {
        this.lastFetchTime = timeService.getTimestamp();
      }
    } catch (error) {
      this.logError('Failed to load habit data', error, 'loadData');
    }
  }

  getContextData(): AppContextData<StreakData> {
    this.ensureFreshData();

    if (!this.userData || this.userData.habits.length === 0) {
      return {
        appName: this.appName,
        displayName: this.displayName,
        isActive: false,
        lastUsed: 0,
        data: this.getEmptyData(),
        summary: 'No habits tracked yet',
        capabilities: this.getCapabilities(),
        icon: this.icon,
      };
    }

    const data = this.transformData();
    const summary = this.generateSummary(data);
    const isActive = data.habits.some(h => this.isToday(h.lastCheckIn));

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: this.getLastUsedTime(),
      data,
      summary,
      capabilities: this.getCapabilities(),
      icon: this.icon,
    };
  }

  protected transformData(): StreakData {
    if (!this.userData) {
      throw new Error('User data not loaded');
    }

    const today = dashboardContextService.getLocalDate();
    const habits = this.userData.habits.map(habit => ({
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      streak: habit.streak,
      longestStreak: habit.longestStreak,
      lastCheckIn: habit.lastCheckIn,
      totalCheckIns: habit.checkIns.length,
      isCheckedToday: habit.lastCheckIn === today,
    }));

    const habitsCompletedToday = habits.filter(h => h.isCheckedToday).length;
    const bestStreak = Math.max(0, ...habits.map(h => h.longestStreak));
    const totalCheckIns = habits.reduce((sum, h) => sum + h.totalCheckIns, 0);

    const perfectDays = this.userData.stats.perfectDays || [];
    const lastPerfectDay = perfectDays.length > 0 
      ? perfectDays[perfectDays.length - 1] 
      : null;

    // Get recent activity (last 7 days)
    const recentActivity = this.getRecentActivity();

    return {
      habits,
      stats: {
        totalHabits: habits.length,
        totalCheckIns,
        bestStreak,
        habitsCompletedToday,
        perfectDaysCount: perfectDays.length,
        lastPerfectDay,
      },
      recentActivity,
    };
  }

  protected generateSummary(data: StreakData): string {
    const parts: string[] = [];

    if (data.habits.length > 0) {
      parts.push(`${data.habits.length} habits`);
    }

    if (data.stats.habitsCompletedToday > 0) {
      parts.push(`${data.stats.habitsCompletedToday} completed today`);
    }

    const activeStreaks = data.habits.filter(h => h.streak > 0);
    if (activeStreaks.length > 0) {
      const bestCurrentStreak = Math.max(...activeStreaks.map(h => h.streak));
      parts.push(`${bestCurrentStreak} day streak`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No activity';
  }

  getKeywords(): string[] {
    return [
      'habit', 'habits', 'streak', 'streaks', 'check in', 'check-in',
      'daily', 'routine', 'progress', 'perfect day', 'consistency',
      'tracking', 'goal', 'goals', ...this.getHabitNames(),
    ];
  }

  protected override getCapabilities(): string[] {
    return [
      'habit-tracking',
      'streak-management', 
      'daily-check-ins',
      'progress-tracking',
      'perfect-days',
      'achievement-tracking',
    ];
  }

  override async getResponse(query: string): Promise<string> {
    const contextData = this.getContextData();
    if (!contextData.isActive || !contextData.data) {
      return this.getInactiveResponse();
    }

    const data = contextData.data;
    const lowerQuery = query.toLowerCase();

    // Specific habit queries
    for (const habit of data.habits) {
      if (lowerQuery.includes(habit.name.toLowerCase())) {
        return this.getHabitResponse(habit);
      }
    }

    // Today's progress
    if (lowerQuery.includes('today') || lowerQuery.includes('check in')) {
      return this.getTodayResponse(data);
    }

    // Streak queries
    if (lowerQuery.includes('streak')) {
      return this.getStreakResponse(data);
    }

    // Perfect days
    if (lowerQuery.includes('perfect')) {
      return this.getPerfectDaysResponse(data);
    }

    // General summary
    return this.getGeneralSummary(data);
  }

  override async search(query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    const data = this.transformData();
    const results: Array<{ type: string; label: string; value: string; field: string }> = [];
    const lowerQuery = query.toLowerCase();

    // Search habits
    for (const habit of data.habits) {
      if (habit.name.toLowerCase().includes(lowerQuery) || 
          habit.emoji.includes(query)) {
        results.push({
          type: 'habit',
          label: `${habit.emoji} ${habit.name}`,
          value: `${habit.streak} day streak`,
          field: `habit.${habit.id}`,
        });
      }
    }

    return results;
  }

  // Private helper methods

  private getEmptyData(): StreakData {
    return {
      habits: [],
      stats: {
        totalHabits: 0,
        totalCheckIns: 0,
        bestStreak: 0,
        habitsCompletedToday: 0,
        perfectDaysCount: 0,
        lastPerfectDay: null,
      },
      recentActivity: [],
    };
  }

  private getLastUsedTime(): number {
    if (!this.userData || this.userData.habits.length === 0) return 0;
    
    const lastCheckIns = this.userData.habits
      .map(h => h.lastCheckIn)
      .filter(Boolean)
      .map(date => this.getTimestamp(date));
    
    return lastCheckIns.length > 0 ? Math.max(...lastCheckIns) : 0;
  }

  private getHabitNames(): string[] {
    if (!this.userData) return [];
    return this.userData.habits.map(h => h.name.toLowerCase());
  }

  private getRecentActivity(): Array<{ date: string; habitsCompleted: number; habitNames: string[] }> {
    if (!this.userData) return [];

    const activity: Record<string, Set<string>> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      timeService.formatDateToLocal(timeService.subtractDays(timeService.getCurrentDateTime(), i)),
    );

    // Count check-ins per day
    for (const habit of this.userData.habits) {
      for (const checkIn of habit.checkIns) {
        if (last7Days.includes(checkIn)) {
          if (!activity[checkIn]) {
            activity[checkIn] = new Set();
          }
          activity[checkIn].add(habit.name);
        }
      }
    }

    return Object.entries(activity)
      .map(([date, habitSet]) => ({
        date,
        habitsCompleted: habitSet.size,
        habitNames: Array.from(habitSet),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private getHabitResponse(habit: StreakData['habits'][0]): string {
    const parts: string[] = [`${habit.emoji} **${habit.name}**:`];
    
    if (habit.isCheckedToday) {
      parts.push('✅ Completed today');
    } else {
      parts.push('⏳ Not completed today');
    }
    
    if (habit.streak > 0) {
      parts.push(`🔥 Current streak: ${habit.streak} days`);
    }
    
    if (habit.longestStreak > 0) {
      parts.push(`🏆 Best streak: ${habit.longestStreak} days`);
    }
    
    parts.push(`📊 Total check-ins: ${habit.totalCheckIns}`);
    
    return parts.join('\n');
  }

  private getTodayResponse(data: StreakData): string {
    if (data.stats.habitsCompletedToday === 0) {
      return `You haven't completed any habits today. You have ${data.habits.length} habits to work on.`;
    }
    
    const remaining = data.habits.length - data.stats.habitsCompletedToday;
    const completed = data.habits.filter(h => h.isCheckedToday).map(h => h.name).join(', ');
    
    let response = `You've completed ${data.stats.habitsCompletedToday} out of ${data.habits.length} habits today: ${completed}.`;
    
    if (remaining > 0) {
      response += ` ${remaining} habits remaining.`;
    } else {
      response += ' 🎉 Perfect day!';
    }
    
    return response;
  }

  private getStreakResponse(data: StreakData): string {
    const activeStreaks = data.habits.filter(h => h.streak > 0);
    
    if (activeStreaks.length === 0) {
      return 'You don\'t have any active streaks. Start checking in daily to build them!';
    }
    
    const streakInfo = activeStreaks
      .sort((a, b) => b.streak - a.streak)
      .map(h => `${h.emoji} ${h.name}: ${h.streak} days`)
      .join('\n');
    
    return `Your current streaks:\n${streakInfo}\n\nBest all-time streak: ${data.stats.bestStreak} days`;
  }

  private getPerfectDaysResponse(data: StreakData): string {
    if (data.stats.perfectDaysCount === 0) {
      return 'You haven\'t had any perfect days yet. Complete all your habits in one day to achieve this!';
    }
    
    let response = `You've had ${data.stats.perfectDaysCount} perfect days!`;
    
    if (data.stats.lastPerfectDay) {
      response += ` Your last perfect day was ${this.getRelativeTime(data.stats.lastPerfectDay)}.`;
    }
    
    return response;
  }

  private getGeneralSummary(data: StreakData): string {
    const parts: string[] = [`You're tracking ${data.habits.length} habits:`];
    
    for (const habit of data.habits) {
      const status = habit.isCheckedToday ? '✅' : '⏳';
      const streak = habit.streak > 0 ? ` (${habit.streak} day streak)` : '';
      parts.push(`${status} ${habit.emoji} ${habit.name}${streak}`);
    }
    
    parts.push('');
    parts.push(`📊 Total check-ins: ${data.stats.totalCheckIns}`);
    parts.push(`🏆 Best streak: ${data.stats.bestStreak} days`);
    parts.push(`⭐ Perfect days: ${data.stats.perfectDaysCount}`);
    
    return parts.join('\n');
  }
}

// Singleton instance
export const streakAdapterRefactored = new StreakAdapterRefactored();