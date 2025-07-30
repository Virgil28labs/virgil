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
    sessionType: 'work' | 'shortBreak' | 'longBreak';
    sessionCount: number; // 1-4 for work sessions
    currentTask?: string;
  } | null;
  todayStats: {
    totalMinutes: number;
    completedSessions: number;
    currentStreak: number;
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
      totalMinutes: 0,
      completedSessions: 0,
      currentStreak: 0,
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
      const today = dashboardContextService.getLocalDate();
      const statsKey = `pomodoro-daily-stats-${today}`;
      const saved = localStorage.getItem(statsKey);
      if (saved) {
        const stats = JSON.parse(saved);
        this.currentData.todayStats = {
          totalMinutes: stats.totalMinutes || 0,
          completedSessions: stats.completedSessions || 0,
          currentStreak: stats.currentStreak || 0,
          lastSessionTime: stats.lastSessionTime ? timeService.fromTimestamp(stats.lastSessionTime) : null,
        };
      }
    } catch (error) {
      this.logError('Failed to load Pomodoro stats', error, 'loadData');
    }
  }

  private saveTodayStats(): void {
    try {
      const today = dashboardContextService.getLocalDate();
      const statsKey = `pomodoro-daily-stats-${today}`;
      const statsToSave = {
        ...this.currentData.todayStats,
        lastSessionTime: this.currentData.todayStats.lastSessionTime ? timeService.getTimestamp() : null,
      };
      localStorage.setItem(statsKey, JSON.stringify(statsToSave));
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
      const { timeRemaining, selectedMinutes, sessionType, currentTask } = data.currentSession;
      const minutesLeft = Math.ceil(timeRemaining / 60);
      const sessionLabel = sessionType === 'work' ? 'Focus' : sessionType === 'shortBreak' ? 'Short break' : 'Long break';
      
      let sessionInfo = `${sessionLabel} active: ${minutesLeft}/${selectedMinutes} minutes remaining`;
      if (currentTask && sessionType === 'work') {
        sessionInfo += ` - Working on: "${currentTask}"`;
      }
      parts.push(sessionInfo);
    } else if (data.todayStats.completedSessions > 0) {
      parts.push(`${data.todayStats.completedSessions} sessions completed today`);
      parts.push(`${data.todayStats.totalMinutes} minutes focused`);
      if (data.todayStats.currentStreak > 0) {
        parts.push(`Current streak: ${data.todayStats.currentStreak}`);
      }
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
      'break', 'breaks', 'short break', 'long break',
      'time left', 'remaining', 'task', 'current task',
      'completed', 'finish', 'done', 'streak',
      'work session', 'break time', 'focus time',
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
      const { timeRemaining, selectedMinutes, progress, sessionType, sessionCount, currentTask } = this.currentData.currentSession;
      const minutesLeft = Math.floor(timeRemaining / 60);
      const secondsLeft = timeRemaining % 60;
      const timeStr = `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
      
      if (sessionType === 'work') {
        let response = '';
        if (progress > 90) {
          response = `Almost done! Just ${timeStr} left in your ${selectedMinutes}-minute focus session. Finish strong! 🏁`;
        } else if (progress > 50) {
          response = `${timeStr} remaining in your ${selectedMinutes}-minute focus session (Session ${sessionCount} of 4). You're over halfway there! 💪`;
        } else {
          response = `${timeStr} remaining in your ${selectedMinutes}-minute focus session. Stay focused! 🎯`;
        }
        
        if (currentTask) {
          response += `\nWorking on: "${currentTask}"`;
        }
        return response;
      } else if (sessionType === 'shortBreak') {
        return `${timeStr} left in your short break. Relax and recharge! 🌿`;
      } else {
        return `${timeStr} left in your long break. Great job completing 4 focus sessions! 🎉`;
      }
    }

    if (this.currentData.currentSession?.phase === 'paused') {
      const { timeRemaining, sessionType } = this.currentData.currentSession;
      const minutesLeft = Math.floor(timeRemaining / 60);
      const sessionLabel = sessionType === 'work' ? 'focus session' : sessionType === 'shortBreak' ? 'short break' : 'long break';
      return `Timer is paused with ${minutesLeft} minutes remaining in your ${sessionLabel}. Ready to continue?`;
    }

    return "Timer is set up but not started yet. Click start when you're ready to focus!";
  }

  private getTodayStatsResponse(): string {
    const { completedSessions, totalMinutes, currentStreak, lastSessionTime } = this.currentData.todayStats;

    if (completedSessions === 0) {
      return "You haven't completed any Pomodoro sessions today. Ready to start your first focus session?";
    }

    let response = `Great productivity today! You've completed ${completedSessions} Pomodoro session${completedSessions > 1 ? 's' : ''} `;
    response += `for a total of ${totalMinutes} minutes of focused work. `;
    
    if (currentStreak > 0) {
      response += `You're on a ${currentStreak}-session streak! `;
    }

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

    const { completedSessions, totalMinutes } = this.currentData.todayStats;

    if (completedSessions > 0) {
      return `Pomodoro Timer: ${completedSessions} sessions completed today (${totalMinutes} minutes total). ${this.currentData.isActive ? 'Timer is open and ready!' : 'Open the timer to start another session.'}`;
    }

    return 'Pomodoro Timer helps you focus with timed work sessions. The classic technique uses 25-minute focus periods followed by short breaks. After 4 work sessions, you earn a longer break. Ready to boost your productivity?';
  }

  override async search(): Promise<Array<{ type: string; label: string; value: string; field: string }>> {
    // Pomodoro doesn't have searchable content, return empty
    return [];
  }


  // Methods to update timer state (would be called by PomodoroTimer component)
  updateTimerState(isActive: boolean, isRunning: boolean, sessionData?: {
    selectedMinutes: number;
    timeRemaining: number;
    sessionType: 'work' | 'shortBreak' | 'longBreak';
    sessionCount: number;
    currentTask?: string;
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

  completeSession(minutes: number, sessionType: 'work' | 'shortBreak' | 'longBreak'): void {
    // Only count work sessions for stats
    if (sessionType === 'work') {
      this.currentData.todayStats.completedSessions++;
      this.currentData.todayStats.totalMinutes += minutes;
      this.currentData.todayStats.currentStreak++;
    }
    
    this.currentData.todayStats.lastSessionTime = timeService.getCurrentDateTime();
    this.saveTodayStats();

    this.currentData.isRunning = false;
    // Don't clear currentSession here, let the component handle it

    this.notifyListeners();
  }

  private notifyListeners(): void {
    const data = this.transformData();
    this.notifySubscribers(data);
  }
}

// Singleton instance
export const pomodoroAdapter = new PomodoroAdapter();
