import { SupabaseMemoryService, type MarkedMemory } from '../SupabaseMemoryService';
import { timeService } from '../TimeService';
import { dashboardContextService } from '../DashboardContextService';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../types/chat.types';
import { THREAD_GAP_THRESHOLD, HOURLY_CHECK_INTERVAL } from '../../constants/timing';

export class VectorSummaryService extends SupabaseMemoryService {
  private lastSummaryDate: string | null = null;
  private summaryTimer: NodeJS.Timeout | null = null;

  async createDailySummary(date?: Date): Promise<string> {
    const targetDate = date || timeService.getLocalDate();
    const targetDateObj = typeof targetDate === 'string' ? timeService.parseDate(targetDate) || timeService.getCurrentDateTime() : targetDate;
    const startOfDay = timeService.addDays(targetDateObj, 0);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = timeService.addDays(targetDateObj, 0);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Get all messages for the day
      const messages = await this.getMessagesInRange(startOfDay, endOfDay);

      if (messages.length === 0) {
        return 'No conversations recorded for this day.';
      }

      // Group messages into conversation threads
      const threads = this.groupIntoThreads(messages);

      // Generate summary sections
      const summaryParts: string[] = [];

      // Day overview
      const dayStr = timeService.formatDateToLocal(targetDateObj, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      summaryParts.push(`# Daily Summary for ${dayStr}`);
      summaryParts.push('\n## Overview');
      summaryParts.push(`- Total conversations: ${threads.length}`);
      summaryParts.push(`- Total messages: ${messages.length}`);
      summaryParts.push(`- Active hours: ${this.getActiveHours(messages)}`);

      // Main topics discussed
      summaryParts.push('\n## Topics Discussed');
      const topics = threads.flatMap(thread => this.extractTopics(thread));
      const uniqueTopics = [...new Set(topics)];
      uniqueTopics.forEach(topic => {
        summaryParts.push(`- ${topic}`);
      });

      // Key information and learnings
      summaryParts.push('\n## Key Information');
      const keyInfo = threads.flatMap(thread => this.extractKeyInformation(thread));
      keyInfo.slice(0, 10).forEach(info => {
        summaryParts.push(`- ${info}`);
      });

      // Context patterns
      const contextPatterns = this.analyzeContextPatterns(messages);
      if (contextPatterns.length > 0) {
        summaryParts.push('\n## Context Patterns');
        contextPatterns.forEach(pattern => {
          summaryParts.push(`- ${pattern}`);
        });
      }

      const summary = summaryParts.join('\n');

      // Store the summary
      await this.storeSummary(summary, targetDateObj);

      // Update last summary date
      this.lastSummaryDate = timeService.toISOString(targetDateObj).split('T')[0];

      return summary;
    } catch (error) {
      logger.error('Failed to create daily summary', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorSummaryService',
        action: 'createDailySummary',
        metadata: { date: timeService.toISOString(targetDateObj) },
      });
      throw error;
    }
  }

  private groupIntoThreads(messages: ChatMessage[]): ChatMessage[][] {
    const threads: ChatMessage[][] = [];
    let currentThread: ChatMessage[] = [];

    messages.forEach((message, index) => {
      if (index === 0) {
        currentThread.push(message);
      } else {
        const prevMessage = messages[index - 1];
        const timeDiff = Number(message.timestamp) - Number(prevMessage.timestamp);

        if (timeDiff > THREAD_GAP_THRESHOLD) {
          if (currentThread.length > 0) {
            threads.push(currentThread);
          }
          currentThread = [message];
        } else {
          currentThread.push(message);
        }
      }
    });

    if (currentThread.length > 0) {
      threads.push(currentThread);
    }

    return threads;
  }

  private extractTopics(thread: ChatMessage[]): string[] {
    const topics: string[] = [];
    const contentLower = thread.map(m => m.content.toLowerCase()).join(' ');

    // Common topic patterns
    const topicPatterns = [
      { pattern: /weather|temperature|forecast|rain|snow|sunny/gi, topic: 'Weather' },
      { pattern: /code|programming|javascript|typescript|react|debug/gi, topic: 'Programming' },
      { pattern: /music|song|rhythm|beat|melody/gi, topic: 'Music' },
      { pattern: /photo|picture|camera|image|gallery/gi, topic: 'Photography' },
      { pattern: /habit|streak|goal|routine|track/gi, topic: 'Habit Tracking' },
      { pattern: /time|date|schedule|calendar|reminder/gi, topic: 'Time Management' },
      { pattern: /location|address|gps|map|navigate/gi, topic: 'Location' },
      { pattern: /note|memo|remember|task|todo/gi, topic: 'Notes & Tasks' },
    ];

    topicPatterns.forEach(({ pattern, topic }) => {
      if (pattern.test(contentLower)) {
        topics.push(topic);
      }
    });

    return topics;
  }

  private extractKeyInformation(thread: ChatMessage[]): string[] {
    const keyInfo: string[] = [];

    thread.forEach(message => {
      // Look for patterns that indicate important information
      const patterns = [
        /remember:?\s+(.+)/i,
        /important:?\s+(.+)/i,
        /note:?\s+(.+)/i,
        /todo:?\s+(.+)/i,
        /meeting.+at\s+(\d{1,2}[:\d]*\s*[ap]m?)/i,
        /deadline.+(\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/i,
      ];

      patterns.forEach(pattern => {
        const match = message.content.match(pattern);
        if (match && match[1]) {
          keyInfo.push(match[1].trim());
        }
      });
    });

    return keyInfo;
  }

  private getActiveHours(messages: ChatMessage[]): string {
    const hours = messages.map(m => timeService.getHours(timeService.parseDate(String(m.timestamp)) || timeService.getCurrentDateTime()));
    const uniqueHours = [...new Set(hours)].sort((a, b) => a - b);

    if (uniqueHours.length === 0) return 'None';
    if (uniqueHours.length === 1) return `${uniqueHours[0]}:00`;

    const ranges: string[] = [];
    let rangeStart = uniqueHours[0];
    let rangeEnd = uniqueHours[0];

    for (let i = 1; i < uniqueHours.length; i++) {
      if (uniqueHours[i] - rangeEnd === 1) {
        rangeEnd = uniqueHours[i];
      } else {
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}:00` : `${rangeStart}:00-${rangeEnd}:00`);
        rangeStart = uniqueHours[i];
        rangeEnd = uniqueHours[i];
      }
    }

    ranges.push(rangeStart === rangeEnd ? `${rangeStart}:00` : `${rangeStart}:00-${rangeEnd}:00`);
    return ranges.join(', ');
  }

  private analyzeContextPatterns(messages: ChatMessage[]): string[] {
    const patterns: string[] = [];
    const contexts = messages.map(m => m.content).filter(Boolean);

    if (contexts.length === 0) return patterns;

    // Analyze common patterns in context
    const weatherCount = contexts.filter(c => c?.includes('weather')).length;
    const locationCount = contexts.filter(c => c?.includes('location')).length;
    const timeCount = contexts.filter(c => c?.includes('time')).length;

    if (weatherCount > messages.length * 0.3) {
      patterns.push('Frequent weather-related queries');
    }
    if (locationCount > messages.length * 0.2) {
      patterns.push('Location-aware conversations');
    }
    if (timeCount > messages.length * 0.4) {
      patterns.push('Time-sensitive discussions');
    }

    return patterns;
  }

  private async storeSummary(summary: string, date: Date): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase.from('memories').insert({
      user_id: user.id,
      content: summary,
      tag: 'summary',
      context: 'daily_summary',
      created_at: timeService.toISOString(date),
    });

    if (error) {
      throw error;
    }
  }

  private async getMessagesInRange(start: Date, end: Date): Promise<ChatMessage[]> {
    // Get messages from the parent class or implement a method to fetch messages in range
    const recentMessages = await this.getRecentMessages(1000);
    // Use timeService for consistent timestamp handling
    const startTime = start.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: getting timestamp from Date object
    const endTime = end.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: getting timestamp from Date object
    
    return recentMessages
      .filter(m => Number(m.timestamp) >= startTime && Number(m.timestamp) <= endTime)
      .map(m => ({
        id: m.id || String(m.timestamp),
        content: m.content,
        role: m.role,
        timestamp: m.timestamp,
        context: m.content, // Use content since context doesn't exist on ChatMessage
      }));
  }

  scheduleDailySummary(): void {
    // Clear existing timer
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
    }

    // Check every hour if we need to create a summary
    this.summaryTimer = setInterval(async () => {
      try {
        const now = timeService.getCurrentDateTime(); // Use TimeService
        const currentDateStr = timeService.toISOString(now).split('T')[0];

        // Create summary at the end of the day (11 PM)
        if (timeService.getHours(now) === 23 && this.lastSummaryDate !== currentDateStr) {
          await this.createDailySummary(now);
          dashboardContextService.logActivity('Created daily summary', 'memory-summary');
        }
      } catch (error) {
        logger.error('Failed to create scheduled summary', error instanceof Error ? error : new Error(String(error)), {
          component: 'VectorSummaryService',
          action: 'scheduleDailySummary',
        });
      }
    }, HOURLY_CHECK_INTERVAL);
  }

  stopScheduler(): void {
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }
  }

  async getSummaries(startDate: Date, endDate: Date): Promise<MarkedMemory[]> {
    // Get all marked memories and filter for summaries by date range
    const memories = await this.getMarkedMemories();
    // Use Date.getTime() which is appropriate for Date objects
    const startTime = startDate.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: getting timestamp from Date object
    const endTime = endDate.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: getting timestamp from Date object
    
    return memories.filter(m => 
      m.timestamp >= startTime && 
      m.timestamp <= endTime &&
      m.tag === 'summary',
    );
  }
}