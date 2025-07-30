/**
 * PomodoroAdapter - Dashboard App Adapter for Pomodoro Timer
 *
 * Provides unified access to Pomodoro timer data for Virgil AI assistant,
 * enabling responses about focus sessions, productivity tracking, and timer status.
 */

import { BaseAdapter } from './BaseAdapter';
import type { AppContextData } from '../DashboardAppService';
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

export class PomodoroAdapter extends BaseAdapter<PomodoroData> {
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

  constructor() {
    super();
    // Load today's stats from localStorage
    this.loadData();
  }

  protected loadData(): void {
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
      this.logError('Failed to load Pomodoro stats', error, 'loadData');
    }
  }

  private saveTodayStats(): void {
    try {
      const statsKey = `pomodoro-stats-${dashboardContextService.getLocalDate()}`;
      localStorage.setItem(statsKey, JSON.stringify(this.currentData.todayStats));
    } catch (error) {
      this.logError('Failed to save Pomodoro stats', error, 'saveStats');
    }
  }

  protected transformData(): PomodoroData {
    return this.currentData;
  }

  getContextData(): AppContextData<PomodoroData> {
    const data = this.transformData();
    const summary = this.generateSummary(data);
    const now = timeService.getTimestamp();
    const lastUsed = this.currentData.todayStats.lastSessionTime?.getTime() || 0; // eslint-disable-line no-restricted-syntax
    const isRecent = now - lastUsed < 60 * 60 * 1000; // Active within last hour

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive: this.currentData.isActive || isRecent,
      lastUsed,
      data,
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

  protected generateSummary(data: PomodoroData): string {
    const parts: string[] = [];

    if (data.isRunning && data.currentSession) {
      const { timeRemaining, selectedMinutes } = data.currentSession;
      const minutesLeft = Math.ceil(timeRemaining / 60);
      parts.push(`Focus session active: ${minutesLeft}/${selectedMinutes} minutes remaining`);
    } else if (data.todayStats.sessionsCompleted > 0) {
      parts.push(`${data.todayStats.sessionsCompleted} sessions completed today`);
      parts.push(`${data.todayStats.totalFocusMinutes} minutes focused`);
    } else {
      parts.push('No focus sessions today');
    }

    return parts.join(', ');
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

  override async getResponse(query: string): Promise<string> {
    // Check if user is asking for advice rather than status
    if (this.isAskingForAdvice(query)) {
      // User wants productivity advice, not timer status
      return ''; // Let LLM provide contextual advice
    }
    
    const lowerQuery = query.toLowerCase();

    // Current session status
    if (lowerQuery.includes('timer') || lowerQuery.includes('time left') || lowerQuery.includes('remaining')) {
      return this.getTimerStatusResponse();
    }

    // Today's productivity stats
    if (lowerQuery.includes('today') || lowerQuery.includes('session') || lowerQuery.includes('productivity')) {
      return this.getTodayStatsResponse();
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

  override async search(_query: string): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    // Pomodoro doesn't have searchable content, return empty
    return [];
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
    const data = this.transformData();
    this.notifySubscribers(data);
  }
}
