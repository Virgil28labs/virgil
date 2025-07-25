/**
 * CircleGameAdapter - Dashboard App Adapter for Perfect Circle Game
 * 
 * Provides unified access to Perfect Circle game scores and statistics
 * for Virgil AI assistant, enabling responses about gaming performance.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';

interface CircleGameData {
  scores: {
    best: number;
    attempts: number;
    averageScore: number;
    lastPlayed?: number;
  };
  stats: {
    perfectScores: number;
    excellentScores: number;
    goodScores: number;
    improvementRate: number;
    scoreDistribution: {
      perfect: number;  // 95-100
      excellent: number; // 85-94
      great: number;    // 75-84
      good: number;     // 60-74
      fair: number;     // 40-59
      needsWork: number; // 0-39
    };
  };
  achievements: {
    firstPerfect: boolean;
    consistentPlayer: boolean;
    improvingArtist: boolean;
    circleNovice: boolean;
    circleMaster: boolean;
  };
}

export class CircleGameAdapter implements AppDataAdapter<CircleGameData> {
  readonly appName = 'circle';
  readonly displayName = 'Perfect Circle';
  readonly icon = '⭕';
  
  private bestScore = 0;
  private attempts = 0;
  private scoreHistory: number[] = [];
  private lastPlayTime = 0;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly SCORE_HISTORY_KEY = 'perfectCircleScoreHistory';
  private readonly LAST_PLAY_KEY = 'perfectCircleLastPlay';
  private listeners: ((data: CircleGameData) => void)[] = [];

  constructor() {
    this.refreshData();
  }

  private refreshData(): void {
    try {
      // Load best score
      const savedBest = localStorage.getItem('perfectCircleBestScore');
      this.bestScore = savedBest ? parseInt(savedBest, 10) : 0;
      
      // Load attempts
      const savedAttempts = localStorage.getItem('perfectCircleAttempts');
      this.attempts = savedAttempts ? parseInt(savedAttempts, 10) : 0;
      
      // Load score history (if available)
      const savedHistory = localStorage.getItem(this.SCORE_HISTORY_KEY);
      this.scoreHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      // Load last play time
      const savedLastPlay = localStorage.getItem(this.LAST_PLAY_KEY);
      this.lastPlayTime = savedLastPlay ? parseInt(savedLastPlay, 10) : 0;
      
      this.lastFetchTime = timeService.getTimestamp();
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to fetch circle game data', error as Error, {
        component: 'CircleGameAdapter',
        action: 'fetchData',
      });
      this.bestScore = 0;
      this.attempts = 0;
      this.scoreHistory = [];
      this.lastPlayTime = 0;
    }
  }

  private ensureFreshData(): void {
    if (timeService.getTimestamp() - this.lastFetchTime > this.CACHE_DURATION) {
      this.refreshData();
    }
  }

  private calculateAverageScore(): number {
    if (this.scoreHistory.length === 0) return 0;
    const sum = this.scoreHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.scoreHistory.length);
  }

  private calculateImprovementRate(): number {
    if (this.scoreHistory.length < 2) return 0;
    
    // Compare recent average to older average
    const midPoint = Math.floor(this.scoreHistory.length / 2);
    const oldAvg = this.scoreHistory.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const newAvg = this.scoreHistory.slice(midPoint).reduce((a, b) => a + b, 0) / (this.scoreHistory.length - midPoint);
    
    return newAvg > oldAvg ? (newAvg - oldAvg) / oldAvg : 0;
  }

  private getScoreDistribution(): CircleGameData['stats']['scoreDistribution'] {
    const distribution = {
      perfect: 0,
      excellent: 0,
      great: 0,
      good: 0,
      fair: 0,
      needsWork: 0,
    };
    
    this.scoreHistory.forEach(score => {
      if (score >= 95) distribution.perfect++;
      else if (score >= 85) distribution.excellent++;
      else if (score >= 75) distribution.great++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else distribution.needsWork++;
    });
    
    return distribution;
  }

  private getAchievements(): CircleGameData['achievements'] {
    const distribution = this.getScoreDistribution();
    
    return {
      firstPerfect: this.bestScore >= 95,
      consistentPlayer: this.attempts >= 20,
      improvingArtist: this.calculateImprovementRate() > 0.1,
      circleNovice: this.attempts >= 5,
      circleMaster: distribution.perfect >= 3,
    };
  }

  getContextData(): AppContextData<CircleGameData> {
    this.ensureFreshData();
    
    const averageScore = this.calculateAverageScore();
    const distribution = this.getScoreDistribution();
    const achievements = this.getAchievements();
    
    const data: CircleGameData = {
      scores: {
        best: this.bestScore,
        attempts: this.attempts,
        averageScore,
        lastPlayed: this.lastPlayTime,
      },
      stats: {
        perfectScores: distribution.perfect,
        excellentScores: distribution.excellent,
        goodScores: distribution.good,
        improvementRate: this.calculateImprovementRate(),
        scoreDistribution: distribution,
      },
      achievements,
    };

    const summary = this.generateSummary(data);
    const isActive = this.attempts > 0;

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: this.lastPlayTime,
      data,
      summary,
      capabilities: [
        'game-scores',
        'skill-tracking',
        'achievement-system',
        'performance-analysis',
      ],
      icon: this.icon,
    };
  }

  private generateSummary(data: CircleGameData): string {
    if (data.scores.attempts === 0) {
      return 'No circles drawn yet';
    }

    const parts: string[] = [];
    parts.push(`Best: ${data.scores.best}%`);
    parts.push(`${data.scores.attempts} attempts`);
    
    if (data.scores.best >= 95) {
      parts.push('Master artist!');
    } else if (data.scores.best >= 85) {
      parts.push('Excellent drawer');
    } else if (data.scores.best >= 75) {
      parts.push('Getting good!');
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
      'circle', 'circles', 'perfect circle', 'draw circle',
      'circle game', 'circle score', 'best circle',
      'drawing', 'draw', 'round', 'circular',
      'game score', 'attempts', 'tries',
    ];
  }

  async getResponse(query: string): Promise<string> {
    this.ensureFreshData();
    const lowerQuery = query.toLowerCase();

    // Score queries
    if (lowerQuery.includes('score') || lowerQuery.includes('best')) {
      return this.getScoreResponse();
    }

    // Attempts queries
    if (lowerQuery.includes('attempts') || lowerQuery.includes('tries') || lowerQuery.includes('played')) {
      return this.getAttemptsResponse();
    }

    // Achievement queries
    if (lowerQuery.includes('achievement') || lowerQuery.includes('badge') || lowerQuery.includes('unlock')) {
      return this.getAchievementResponse();
    }

    // Progress/improvement queries
    if (lowerQuery.includes('progress') || lowerQuery.includes('improv') || lowerQuery.includes('better')) {
      return this.getProgressResponse();
    }

    // Stats queries
    if (lowerQuery.includes('stats') || lowerQuery.includes('statistics')) {
      return this.getStatsResponse();
    }

    // Default overview
    return this.getOverviewResponse();
  }

  private getScoreResponse(): string {
    if (this.attempts === 0) {
      return "You haven't played Perfect Circle yet. Give it a try and see how round you can draw!";
    }

    let response = `Your best Perfect Circle score is ${this.bestScore}%`;
    
    if (this.bestScore >= 95) {
      response += " - That's a perfect circle! You're a true artist! ✨";
    } else if (this.bestScore >= 85) {
      response += ' - Excellent! Almost perfect!';
    } else if (this.bestScore >= 75) {
      response += ' - Great job! Very circular!';
    } else if (this.bestScore >= 60) {
      response += ' - Good effort! Keep practicing!';
    } else {
      response += " - Keep trying, you'll get better!";
    }

    const avg = this.calculateAverageScore();
    if (avg > 0 && this.scoreHistory.length > 1) {
      response += ` Your average score is ${avg}%.`;
    }

    return response;
  }

  private getAttemptsResponse(): string {
    if (this.attempts === 0) {
      return "You haven't tried drawing any circles yet. Open the Perfect Circle game and test your skills!";
    }

    let response = `You've attempted to draw perfect circles ${this.attempts} time${this.attempts !== 1 ? 's' : ''}`;
    
    if (this.lastPlayTime) {
      const timeAgo = this.getTimeAgo(timeService.fromTimestamp(this.lastPlayTime));
      response += `, last played ${timeAgo}`;
    }
    
    response += '.';

    const achievements = this.getAchievements();
    if (achievements.consistentPlayer) {
      response += " You're a consistent player!";
    } else if (achievements.circleNovice) {
      response += " You're getting the hang of it!";
    }

    return response;
  }

  private getAchievementResponse(): string {
    const achievements = this.getAchievements();
    const unlockedCount = Object.values(achievements).filter(a => a).length;
    
    if (unlockedCount === 0) {
      return 'No achievements unlocked yet. Keep playing to earn badges!';
    }

    let response = `You've unlocked ${unlockedCount} achievement${unlockedCount !== 1 ? 's' : ''}:\n`;
    
    if (achievements.firstPerfect) response += '• First Perfect - Score 95% or higher ✨\n';
    if (achievements.circleMaster) response += '• Circle Master - Get 3 perfect scores 🎯\n';
    if (achievements.consistentPlayer) response += '• Consistent Player - Play 20+ times 🎮\n';
    if (achievements.improvingArtist) response += '• Improving Artist - Show steady improvement 📈\n';
    if (achievements.circleNovice) response += '• Circle Novice - Play 5+ times 🎨\n';

    return response.trim();
  }

  private getProgressResponse(): string {
    if (this.scoreHistory.length < 2) {
      return 'Play more games to track your progress. Each circle helps you improve!';
    }

    const improvementRate = this.calculateImprovementRate();
    let response = '';
    
    if (improvementRate > 0.1) {
      const percent = Math.round(improvementRate * 100);
      response = `Great progress! Your scores have improved by ${percent}% on average. `;
    } else if (improvementRate > 0) {
      response = "You're showing steady improvement! Keep practicing. ";
    } else {
      response = 'Your scores are consistent. Try drawing slower for better results. ';
    }

    const recentScores = this.scoreHistory.slice(-5);
    if (recentScores.length > 0) {
      response += `Recent scores: ${recentScores.join('%, ')}%.`;
    }

    return response;
  }

  private getStatsResponse(): string {
    if (this.attempts === 0) {
      return 'No game statistics yet. Play Perfect Circle to start tracking your performance!';
    }

    const distribution = this.getScoreDistribution();
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    
    let response = `Perfect Circle Statistics (${total} games):\n`;
    
    if (distribution.perfect > 0) {
      response += `• Perfect (95-100%): ${distribution.perfect} circles\n`;
    }
    if (distribution.excellent > 0) {
      response += `• Excellent (85-94%): ${distribution.excellent} circles\n`;
    }
    if (distribution.great > 0) {
      response += `• Great (75-84%): ${distribution.great} circles\n`;
    }
    if (distribution.good > 0) {
      response += `• Good (60-74%): ${distribution.good} circles\n`;
    }
    if (distribution.fair > 0) {
      response += `• Fair (40-59%): ${distribution.fair} circles\n`;
    }
    if (distribution.needsWork > 0) {
      response += `• Needs Work (0-39%): ${distribution.needsWork} circles\n`;
    }

    return response.trim();
  }

  private getOverviewResponse(): string {
    if (this.attempts === 0) {
      return 'Perfect Circle Game: No attempts yet. Challenge yourself to draw the perfect circle!';
    }

    let response = `Perfect Circle: Best score ${this.bestScore}%, ${this.attempts} attempt${this.attempts !== 1 ? 's' : ''}`;
    
    const achievements = this.getAchievements();
    const unlockedCount = Object.values(achievements).filter(a => a).length;
    if (unlockedCount > 0) {
      response += `, ${unlockedCount} achievement${unlockedCount !== 1 ? 's' : ''}`;
    }
    
    response += '.';

    return response;
  }

  private getTimeAgo(date: Date): string {
    return timeService.getTimeAgo(date);
  }

  async search(query: string): Promise<unknown[]> {
    this.ensureFreshData();
    
    const lowerQuery = query.toLowerCase();
    const results: unknown[] = [];

    // Search for score-related queries
    if (lowerQuery.includes('score') || lowerQuery.includes('best')) {
      results.push({
        id: 'best-score',
        type: 'game-score',
        value: this.bestScore,
        label: `Best score: ${this.bestScore}%`,
        relevance: 100,
      });
    }

    // Search for achievement-related queries
    const achievements = this.getAchievements();
    Object.entries(achievements).forEach(([key, unlocked]) => {
      if (unlocked && key.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `achievement-${key}`,
          type: 'achievement',
          name: key,
          unlocked: true,
          relevance: 80,
        });
      }
    });

    return results.sort((a, b) => (b as { relevance: number }).relevance - (a as { relevance: number }).relevance);
  }

  subscribe(callback: (data: CircleGameData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'perfectCircleBestScore' || 
          e.key === 'perfectCircleAttempts' ||
          e.key === this.SCORE_HISTORY_KEY) {
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