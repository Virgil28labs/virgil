/**
 * StreakAdapter - Dashboard App Adapter for Habit Streak Tracker
 * 
 * Provides unified access to habit tracking data for Virgil AI assistant,
 * enabling responses about habits, streaks, and daily check-ins.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import type { UserHabitsData } from '../../types/habit.types';
import { logger } from '../../lib/logger';
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

export class StreakAdapter implements AppDataAdapter<StreakData> {
  readonly appName = 'streaks';
  readonly displayName = 'Habit Streaks';
  readonly icon = '🔥';
  
  private userData: UserHabitsData | null = null;
  private listeners: ((data: StreakData) => void)[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly STORAGE_KEY = STORAGE_KEYS.VIRGIL_HABITS;

  constructor() {
    this.loadUserData();
  }

  private loadUserData(): void {
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
        this.lastFetchTime = Date.now();
      }
    } catch (error) {
      logger.error('Failed to load habit data', error as Error, {
        component: 'StreakAdapter',
        action: 'loadUserData',
      });
    }
  }

  private ensureFreshData(): void {
    if (Date.now() - this.lastFetchTime > this.CACHE_DURATION) {
      this.loadUserData();
    }
  }

  getContextData(): AppContextData<StreakData> {
    this.ensureFreshData();
    
    if (!this.userData) {
      return {
        appName: this.appName,
        displayName: this.displayName,
        isActive: false,
        lastUsed: 0,
        data: {
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
        },
        summary: 'No habits tracked yet',
        capabilities: ['habit-tracking', 'streak-management', 'daily-check-ins'],
        icon: this.icon,
      };
    }

    const data = this.transformUserData();
    const summary = this.generateSummary(data);
    const isActive = data.habits.some(h => this.isToday(h.lastCheckIn));

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: this.getLastUsedTime(),
      data,
      summary,
      capabilities: [
        'habit-tracking',
        'streak-management',
        'daily-check-ins',
        'progress-tracking',
        'perfect-days',
      ],
      icon: this.icon,
    };
  }

  private transformUserData(): StreakData {
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
    const perfectDaysCount = this.userData.stats?.perfectDays?.length || 0;
    const lastPerfectDay = this.userData.stats?.perfectDays?.slice(-1)[0] || null;

    // Get recent activity (last 7 days)
    const recentActivity = this.getRecentActivity();

    return {
      habits,
      stats: {
        totalHabits: habits.length,
        totalCheckIns: habits.reduce((sum, h) => sum + h.totalCheckIns, 0),
        bestStreak: Math.max(...habits.map(h => h.longestStreak), 0),
        habitsCompletedToday,
        perfectDaysCount,
        lastPerfectDay,
      },
      recentActivity,
    };
  }

  private getRecentActivity(): StreakData['recentActivity'] {
    if (!this.userData) return [];

    const activityMap = new Map<string, { habits: Set<string>; habitNames: string[] }>();
    const today = timeService.getCurrentDateTime();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    this.userData.habits.forEach(habit => {
      habit.checkIns.forEach(checkInDate => {
        const date = new Date(checkInDate);
        if (date >= sevenDaysAgo) {
          if (!activityMap.has(checkInDate)) {
            activityMap.set(checkInDate, { habits: new Set(), habitNames: [] });
          }
          const activity = activityMap.get(checkInDate)!;
          activity.habits.add(habit.id);
          activity.habitNames.push(habit.name);
        }
      });
    });

    return Array.from(activityMap.entries())
      .map(([date, activity]) => ({
        date,
        habitsCompleted: activity.habits.size,
        habitNames: activity.habitNames,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }

  private generateSummary(data: StreakData): string {
    const parts: string[] = [];
    
    if (data.stats.totalHabits === 0) {
      return 'No habits tracked yet';
    }

    // Habits completed today
    if (data.stats.habitsCompletedToday > 0) {
      parts.push(`${data.stats.habitsCompletedToday}/${data.stats.totalHabits} habits done today`);
    } else {
      parts.push(`0/${data.stats.totalHabits} habits completed`);
    }

    // Best streak
    if (data.stats.bestStreak > 0) {
      parts.push(`${data.stats.bestStreak}-day best streak`);
    }

    // Perfect days
    if (data.stats.perfectDaysCount > 0) {
      parts.push(`${data.stats.perfectDaysCount} perfect days`);
    }

    return parts.join(', ');
  }

  private getLastUsedTime(): number {
    if (!this.userData || this.userData.habits.length === 0) return 0;

    const allCheckIns = this.userData.habits.flatMap(h => 
      h.checkIns.map(date => new Date(date).getTime()),
    );

    return allCheckIns.length > 0 ? Math.max(...allCheckIns) : 0;
  }

  private isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const today = dashboardContextService.getLocalDate();
    return dateStr === today;
  }

  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    
    return keywords.some(keyword => lowerQuery.includes(keyword));
  }

  getKeywords(): string[] {
    return [
      'habit', 'habits', 'streak', 'streaks',
      'check in', 'checked in', 'check-in',
      'daily', 'routine', 'track', 'tracking',
      'fire', '🔥', 'consistency',
      'perfect day', 'completed',
    ];
  }

  async getResponse(query: string): Promise<string> {
    this.ensureFreshData();
    
    if (!this.userData) {
      return "You haven't set up any habits yet. Open the Habit Tracker to start building positive routines!";
    }

    const lowerQuery = query.toLowerCase();

    // Habit status check
    if (lowerQuery.includes('check') || lowerQuery.includes('done') || lowerQuery.includes('today')) {
      return this.getTodayStatusResponse();
    }

    // Streak information
    if (lowerQuery.includes('streak')) {
      return this.getStreakResponse();
    }

    // Specific habit query
    if (lowerQuery.includes('habit')) {
      return this.getHabitDetailsResponse(lowerQuery);
    }

    // Progress/stats query
    if (lowerQuery.includes('progress') || lowerQuery.includes('stats') || lowerQuery.includes('how')) {
      return this.getProgressResponse();
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getTodayStatusResponse(): string {
    const data = this.transformUserData();
    
    if (data.habits.length === 0) {
      return "You don't have any habits set up yet. Start by adding your first habit!";
    }

    const completed = data.stats.habitsCompletedToday;
    const total = data.stats.totalHabits;

    if (completed === 0) {
      return `You haven't checked in any habits today. You have ${total} habit${total > 1 ? 's' : ''} to complete: ${data.habits.map(h => `${h.emoji} ${h.name}`).join(', ')}`;
    }

    if (completed === total) {
      return `Excellent! You've completed all ${total} habits today! 🎉 ${data.habits.map(h => h.emoji).join(' ')} Keep the fire burning! 🔥`;
    }

    const completedHabits = data.habits.filter(h => h.isCheckedToday);
    const remainingHabits = data.habits.filter(h => !h.isCheckedToday);

    return `You've completed ${completed}/${total} habits today:\n` +
           `✅ Done: ${completedHabits.map(h => `${h.emoji} ${h.name}`).join(', ')}\n` +
           `⏳ Remaining: ${remainingHabits.map(h => `${h.emoji} ${h.name}`).join(', ')}`;
  }

  private getStreakResponse(): string {
    const data = this.transformUserData();
    
    if (data.habits.length === 0) {
      return "You don't have any streaks yet because you haven't added any habits. Start building streaks today!";
    }

    const habitsWithStreaks = data.habits
      .filter(h => h.streak > 0)
      .sort((a, b) => b.streak - a.streak);

    if (habitsWithStreaks.length === 0) {
      return 'No active streaks yet. Check in your habits today to start building streaks!';
    }

    let response = 'Your current streaks:\n';
    habitsWithStreaks.forEach(habit => {
      response += `• ${habit.emoji} ${habit.name}: ${habit.streak}-day streak`;
      if (habit.streak === habit.longestStreak && habit.streak > 1) {
        response += ' 🏆 (personal best!)';
      }
      response += '\n';
    });

    if (data.stats.bestStreak > 0) {
      response += `\nYour longest streak ever: ${data.stats.bestStreak} days 🔥`;
    }

    return response;
  }

  private getHabitDetailsResponse(query: string): string {
    const data = this.transformUserData();
    
    // Look for specific habit name in query
    const habit = data.habits.find(h => 
      query.toLowerCase().includes(h.name.toLowerCase()),
    );

    if (habit) {
      let response = `${habit.emoji} ${habit.name}:\n`;
      response += `• Current streak: ${habit.streak} days\n`;
      response += `• Best streak: ${habit.longestStreak} days\n`;
      response += `• Total check-ins: ${habit.totalCheckIns}\n`;
      response += `• Status today: ${habit.isCheckedToday ? '✅ Completed' : '⏳ Not yet checked'}`;
      return response;
    }

    // General habit list
    if (data.habits.length === 0) {
      return "You haven't added any habits yet. Open the Habit Tracker to create your first habit!";
    }

    return `You're tracking ${data.habits.length} habit${data.habits.length > 1 ? 's' : ''}:\n` +
           data.habits.map(h => 
             `• ${h.emoji} ${h.name} (${h.streak}-day streak${h.isCheckedToday ? ', ✅ done today' : ''})`,
           ).join('\n');
  }

  private getProgressResponse(): string {
    const data = this.transformUserData();
    
    if (data.stats.totalCheckIns === 0) {
      return "No progress yet - you haven't started tracking any habits. Begin your journey today!";
    }

    let response = 'Your habit tracking progress:\n';
    response += `• Total check-ins: ${data.stats.totalCheckIns}\n`;
    response += `• Habits tracked: ${data.stats.totalHabits}\n`;
    response += `• Best streak: ${data.stats.bestStreak} days\n`;
    response += `• Perfect days: ${data.stats.perfectDaysCount}`;

    if (data.stats.lastPerfectDay && this.isToday(data.stats.lastPerfectDay)) {
      response += ' (including today! 🌟)';
    }

    // Recent activity summary
    if (data.recentActivity.length > 0) {
      const lastWeekTotal = data.recentActivity.reduce((sum, day) => sum + day.habitsCompleted, 0);
      const avgPerDay = (lastWeekTotal / 7).toFixed(1);
      response += `\n• Last 7 days: ${lastWeekTotal} check-ins (avg ${avgPerDay}/day)`;
    }

    return response;
  }

  private getOverviewResponse(): string {
    const data = this.transformUserData();
    
    if (data.habits.length === 0) {
      return 'Habit Tracker helps you build positive routines with visual streaks. Open it to add your first habit and start your journey!';
    }

    return `Habit Tracker: ${data.stats.habitsCompletedToday}/${data.stats.totalHabits} habits done today. ` +
           `Best streak: ${data.stats.bestStreak} days 🔥. ` +
           `Total check-ins: ${data.stats.totalCheckIns}. ` +
           (data.stats.habitsCompletedToday < data.stats.totalHabits 
             ? 'Keep going!' 
             : 'Great job today! 🌟');
  }

  async search(query: string): Promise<any[]> {
    this.ensureFreshData();
    
    if (!this.userData) return [];

    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    // Search in habit names
    this.userData.habits.forEach(habit => {
      if (habit.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: habit.id,
          type: 'habit',
          name: habit.name,
          emoji: habit.emoji,
          streak: habit.streak,
          relevance: habit.name.toLowerCase() === lowerQuery ? 100 : 50,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  subscribe(callback: (data: StreakData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      this.loadUserData();
      this.notifyListeners();
    }, 30000); // Refresh every 30 seconds
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      clearInterval(intervalId);
    };
  }

  private notifyListeners(): void {
    const data = this.getContextData().data;
    this.listeners.forEach(listener => listener(data));
  }
}