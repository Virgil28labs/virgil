/**
 * PomodoroAdapter - Dashboard App Adapter for Pomodoro Timer
 * 
 * Provides unified access to Pomodoro timer data for Virgil AI assistant,
 * enabling responses about focus sessions, productivity tracking, and timer status.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import { logger } from '../../lib/logger';
import { dashboardContextService } from '../DashboardContextService';
import { timeService } from '../TimeService';

interface PomodoroData {
  isActive: boolean;
  isRunning: boolean;
  currentSession: {
    selectedMinutes: number;
    timeRemaining: number;
    progress: number;
    phase: 'setup' | 'running' | 'paused' | 'completed';
  } | null;
  todayStats: {
    sessionsCompleted: number;
    totalFocusMinutes: number;
    lastSessionTime: Date | null;
  };
}

export class PomodoroAdapter implements AppDataAdapter<PomodoroData> {
  readonly appName = 'pomodoro';
  readonly displayName = 'Pomodoro Timer';
  readonly icon = '🍅';
  
  private currentData: PomodoroData = {
    isActive: false,
    isRunning: false,
    currentSession: null,
    todayStats: {
      sessionsCompleted: 0,
      totalFocusMinutes: 0,
      lastSessionTime: null,
    },
  };
  
  private listeners: ((data: PomodoroData) => void)[] = [];

  constructor() {
    // Load today's stats from localStorage
    this.loadTodayStats();
  }

  private loadTodayStats(): void {
    try {
      const statsKey = `pomodoro-stats-${dashboardContextService.getLocalDate()}`;
      const saved = localStorage.getItem(statsKey);
      if (saved) {
        const stats = JSON.parse(saved);
        this.currentData.todayStats = {
          ...stats,
          lastSessionTime: stats.lastSessionTime ? timeService.fromTimestamp(stats.lastSessionTime) : null,
        };
      }
    } catch (error) {
      logger.error('Failed to load Pomodoro stats', error as Error, {
        component: 'PomodoroAdapter',
        action: 'loadStats',
      });
    }
  }

  private saveTodayStats(): void {
    try {
      const statsKey = `pomodoro-stats-${dashboardContextService.getLocalDate()}`;
      localStorage.setItem(statsKey, JSON.stringify(this.currentData.todayStats));
    } catch (error) {
      logger.error('Failed to save Pomodoro stats', error as Error, {
        component: 'PomodoroAdapter',
        action: 'saveStats',
      });
    }
  }

  getContextData(): AppContextData<PomodoroData> {
    const summary = this.generateSummary();
    const now = timeService.getTimestamp();
    const lastUsed = this.currentData.todayStats.lastSessionTime?.getTime() || 0; // eslint-disable-line no-restricted-syntax
    const isRecent = now - lastUsed < 60 * 60 * 1000; // Active within last hour

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive: this.currentData.isActive || isRecent,
      lastUsed,
      data: this.currentData,
      summary,
      capabilities: [
        'focus-timer',
        'productivity-tracking',
        'session-management',
        'break-reminders',
        'focus-statistics',
      ],
      icon: this.icon,
    };
  }

  private generateSummary(): string {
    const parts: string[] = [];
    
    if (this.currentData.isRunning && this.currentData.currentSession) {
      const { timeRemaining, selectedMinutes } = this.currentData.currentSession;
      const minutesLeft = Math.ceil(timeRemaining / 60);
      parts.push(`Focus session active: ${minutesLeft}/${selectedMinutes} minutes remaining`);
    } else if (this.currentData.todayStats.sessionsCompleted > 0) {
      parts.push(`${this.currentData.todayStats.sessionsCompleted} sessions completed today`);
      parts.push(`${this.currentData.todayStats.totalFocusMinutes} minutes focused`);
    } else {
      parts.push('No focus sessions today');
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
      'pomodoro', 'timer', 'focus', 'focused', 'focusing',
      'session', 'sessions', 'productivity',
      'work', 'working', 'concentrate', 'concentration',
      'break', 'breaks', 'time left', 'remaining',
      'completed', 'finish', 'done',
    ];
  }

  async getResponse(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    // Current session status
    if (lowerQuery.includes('timer') || lowerQuery.includes('time left') || lowerQuery.includes('remaining')) {
      return this.getTimerStatusResponse();
    }

    // Today's productivity stats
    if (lowerQuery.includes('today') || lowerQuery.includes('session') || lowerQuery.includes('productivity')) {
      return this.getTodayStatsResponse();
    }

    // Focus recommendations
    if (lowerQuery.includes('should') || lowerQuery.includes('when') || lowerQuery.includes('focus')) {
      return this.getFocusRecommendation();
    }

    // Default response
    return this.getOverviewResponse();
  }

  private getTimerStatusResponse(): string {
    if (!this.currentData.isActive) {
      return "The Pomodoro timer isn't active right now. Ready to start a focus session?";
    }

    if (this.currentData.isRunning && this.currentData.currentSession) {
      const { timeRemaining, selectedMinutes, progress } = this.currentData.currentSession;
      const minutesLeft = Math.floor(timeRemaining / 60);
      const secondsLeft = timeRemaining % 60;
      
      if (progress > 90) {
        return `Almost done! Just ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')} left in your ${selectedMinutes}-minute focus session. Finish strong! 🏁`;
      } else if (progress > 50) {
        return `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')} remaining in your ${selectedMinutes}-minute session. You're over halfway there! 💪`;
      } else {
        return `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')} remaining in your ${selectedMinutes}-minute focus session. Stay focused! 🎯`;
      }
    }

    if (this.currentData.currentSession?.phase === 'paused') {
      const { timeRemaining } = this.currentData.currentSession;
      const minutesLeft = Math.floor(timeRemaining / 60);
      return `Timer is paused with ${minutesLeft} minutes remaining. Ready to continue?`;
    }

    return "Timer is set up but not started yet. Click start when you're ready to focus!";
  }

  private getTodayStatsResponse(): string {
    const { sessionsCompleted, totalFocusMinutes, lastSessionTime } = this.currentData.todayStats;

    if (sessionsCompleted === 0) {
      return "You haven't completed any Pomodoro sessions today. Ready to start your first focus session?";
    }

    let response = `Great productivity today! You've completed ${sessionsCompleted} Pomodoro session${sessionsCompleted > 1 ? 's' : ''} `;
    response += `for a total of ${totalFocusMinutes} minutes of focused work. `;

    if (lastSessionTime) {
      const timeSinceLastSession = timeService.getTimestamp() - lastSessionTime.getTime(); // eslint-disable-line no-restricted-syntax
      const hoursSince = Math.floor(timeSinceLastSession / (1000 * 60 * 60));
      
      if (hoursSince < 1) {
        response += 'Keep up the momentum!';
      } else if (hoursSince < 3) {
        response += 'Perfect time for another session!';
      } else {
        response += 'Ready for another focus session?';
      }
    }

    return response;
  }

  private getFocusRecommendation(): string {
    const hour = timeService.getHours(timeService.getCurrentDateTime());
    const { sessionsCompleted } = this.currentData.todayStats;

    // Morning recommendation
    if (hour >= 6 && hour < 12) {
      if (sessionsCompleted === 0) {
        return 'Morning is a great time for focused work! Consider starting with a 25-minute Pomodoro session to kick off your productive day.';
      }
      return 'Great morning for deep work! Another 25-minute session can help maintain your focus momentum.';
    }

    // Afternoon recommendation
    if (hour >= 12 && hour < 17) {
      if (sessionsCompleted < 3) {
        return 'Afternoon is perfect for tackling important tasks. A 25-minute Pomodoro can help you power through!';
      }
      return "You've been productive today! Consider a shorter 15-minute session if you need a quick focus boost.";
    }

    // Evening recommendation
    if (hour >= 17 && hour < 22) {
      if (sessionsCompleted >= 6) {
        return "You've had a very productive day with 6+ sessions! Consider winding down to avoid burnout.";
      }
      return 'Evening focus sessions work well for wrapping up tasks. Try a 25-minute session with a relaxing break after.';
    }

    // Late night
    return "It's getting late. If you need to work, try a shorter 10-15 minute session to maintain focus without affecting sleep.";
  }

  private getOverviewResponse(): string {
    if (this.currentData.isRunning) {
      return this.getTimerStatusResponse();
    }

    const { sessionsCompleted, totalFocusMinutes } = this.currentData.todayStats;
    
    if (sessionsCompleted > 0) {
      return `Pomodoro Timer: ${sessionsCompleted} sessions completed today (${totalFocusMinutes} minutes total). ${this.currentData.isActive ? 'Timer is open and ready!' : 'Open the timer to start another session.'}`;
    }

    return 'Pomodoro Timer helps you focus with timed work sessions. The classic technique uses 25-minute focus periods. Ready to boost your productivity?';
  }

  async search(_query: string): Promise<unknown[]> {
    // Pomodoro doesn't have searchable content, return empty
    return [];
  }

  subscribe(callback: (data: PomodoroData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.currentData);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Methods to update timer state (would be called by PomodoroTimer component)
  updateTimerState(isActive: boolean, isRunning: boolean, sessionData?: {
    selectedMinutes: number;
    timeRemaining: number;
  }): void {
    this.currentData.isActive = isActive;
    this.currentData.isRunning = isRunning;
    
    if (sessionData) {
      const progress = ((sessionData.selectedMinutes * 60 - sessionData.timeRemaining) / (sessionData.selectedMinutes * 60)) * 100;
      this.currentData.currentSession = {
        ...sessionData,
        progress,
        phase: isRunning ? 'running' : sessionData.timeRemaining === sessionData.selectedMinutes * 60 ? 'setup' : 'paused',
      };
    } else {
      this.currentData.currentSession = null;
    }
    
    this.notifyListeners();
  }

  completeSession(minutes: number): void {
    this.currentData.todayStats.sessionsCompleted++;
    this.currentData.todayStats.totalFocusMinutes += minutes;
    this.currentData.todayStats.lastSessionTime = timeService.getCurrentDateTime();
    this.saveTodayStats();
    
    this.currentData.isRunning = false;
    this.currentData.currentSession = null;
    
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentData));
  }
}