/**
 * NotesAdapter - Dashboard App Adapter for Notes Application
 * 
 * Provides unified access to notes data for Virgil AI assistant,
 * enabling intelligent responses about user's notes, tasks, and reflections.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import { logger } from '../../lib/logger';
import type { Entry, TagType, ActionType } from '../../components/notes/types';
import { notesStorage } from '../../components/notes/storage';
import { timeService } from '../TimeService';

interface NotesData {
  totalNotes: number;
  recentNotes: {
    id: string;
    content: string;
    timestamp: Date;
    tags: TagType[];
    actionType?: ActionType;
    hasActiveTasks: boolean;
  }[];
  taskCount: {
    total: number;
    completed: number;
    pending: number;
  };
  tagDistribution: Record<TagType | 'untagged', number>;
  actionTypeDistribution: Record<ActionType | 'uncategorized', number>;
  lastUpdate: Date | null;
}

export class NotesAdapter implements AppDataAdapter<NotesData> {
  readonly appName = 'notes';
  readonly displayName = 'Notes';
  readonly icon = '📝';
  
  private entries: Entry[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private listeners: ((data: NotesData) => void)[] = [];

  constructor() {
    // Initialize data
    this.refreshData();
  }

  private async refreshData(): Promise<void> {
    try {
      this.entries = await notesStorage.getAllEntries();
      this.lastFetchTime = timeService.getTimestamp();
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to fetch notes data', error as Error, {
        component: 'NotesAdapter',
        action: 'fetchData',
      });
      this.entries = [];
    }
  }

  private async ensureFreshData(): Promise<void> {
    if (timeService.getTimestamp() - this.lastFetchTime > this.CACHE_DURATION) {
      await this.refreshData();
    }
  }

  getContextData(): AppContextData<NotesData> {
    const now = timeService.getTimestamp();
    const taskStats = this.calculateTaskStats();
    const recentEntries = this.getRecentEntries(5);
    
    const data: NotesData = {
      totalNotes: this.entries.length,
      recentNotes: recentEntries.map(entry => ({
        id: entry.id,
        content: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : ''),
        timestamp: entry.timestamp,
        tags: entry.tags,
        actionType: entry.actionType,
        hasActiveTasks: entry.tasks.some(t => !t.completed),
      })),
      taskCount: taskStats,
      tagDistribution: this.calculateTagDistribution(),
      actionTypeDistribution: this.calculateActionTypeDistribution(),
      lastUpdate: this.entries.length > 0 
        ? this.entries.reduce((latest, entry) => 
          entry.timestamp > latest ? entry.timestamp : latest, 
        this.entries[0].timestamp,
        )
        : null,
    };

    const summary = this.generateSummary(data);
    const isActive = recentEntries.some(entry => 
      // eslint-disable-next-line no-restricted-syntax
      now - entry.timestamp.getTime() < 30 * 60 * 1000, // Active if used in last 30 minutes
    );

    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive,
      lastUsed: this.entries.length > 0 ? this.entries[0].timestamp.getTime() : 0, // eslint-disable-line no-restricted-syntax
      data,
      summary,
      capabilities: [
        'note-taking',
        'task-management',
        'idea-capture',
        'reflection-journaling',
        'tag-organization',
      ],
      icon: this.icon,
    };
  }

  private calculateTaskStats(): NotesData['taskCount'] {
    let total = 0;
    let completed = 0;

    this.entries.forEach(entry => {
      entry.tasks.forEach(task => {
        total++;
        if (task.completed) completed++;
      });
    });

    return {
      total,
      completed,
      pending: total - completed,
    };
  }

  private calculateTagDistribution(): Record<TagType | 'untagged', number> {
    const distribution: Record<TagType | 'untagged', number> = {
      work: 0,
      health: 0,
      money: 0,
      people: 0,
      growth: 0,
      life: 0,
      untagged: 0,
    };

    this.entries.forEach(entry => {
      if (entry.tags.length === 0) {
        distribution.untagged++;
      } else {
        entry.tags.forEach(tag => {
          distribution[tag]++;
        });
      }
    });

    return distribution;
  }

  private calculateActionTypeDistribution(): Record<ActionType | 'uncategorized', number> {
    const distribution: Record<ActionType | 'uncategorized', number> = {
      task: 0,
      note: 0,
      idea: 0,
      goal: 0,
      reflect: 0,
      uncategorized: 0,
    };

    this.entries.forEach(entry => {
      if (entry.actionType) {
        distribution[entry.actionType]++;
      } else {
        distribution.uncategorized++;
      }
    });

    return distribution;
  }

  private getRecentEntries(count: number): Entry[] {
    return this.entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // eslint-disable-line no-restricted-syntax
      .slice(0, count);
  }

  private generateSummary(data: NotesData): string {
    const parts: string[] = [];
    
    if (data.totalNotes > 0) {
      parts.push(`${data.totalNotes} notes`);
    }
    
    if (data.taskCount.pending > 0) {
      parts.push(`${data.taskCount.pending} pending tasks`);
    }
    
    if (data.recentNotes.length > 0) {
      const lastNote = data.recentNotes[0];
      const timeAgo = this.getTimeAgo(lastNote.timestamp);
      parts.push(`last note ${timeAgo}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No notes yet';
  }

  private getTimeAgo(date: Date): string {
    return timeService.getTimeAgo(date);
  }

  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const keywords = this.getKeywords();
    
    return keywords.some(keyword => lowerQuery.includes(keyword));
  }

  getKeywords(): string[] {
    return [
      'note', 'notes',
      'task', 'tasks', 'todo', 'todos',
      'idea', 'ideas',
      'reflection', 'reflect', 'journal',
      'wrote', 'written', 'jotted',
      'remember', 'reminder',
      'tag', 'tags', 'tagged',
      'work', 'health', 'money', 'people', 'growth', 'life',
    ];
  }

  async getResponse(query: string): Promise<string> {
    await this.ensureFreshData();
    const lowerQuery = query.toLowerCase();

    // Handle specific query types
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return this.getCountResponse(lowerQuery);
    }

    if (lowerQuery.includes('task') || lowerQuery.includes('todo')) {
      return this.getTaskResponse(lowerQuery);
    }

    if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last')) {
      return this.getRecentNotesResponse();
    }

    if (lowerQuery.includes('tag') || lowerQuery.includes('category')) {
      return this.getTagResponse(lowerQuery);
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
      return this.searchNotes(lowerQuery);
    }

    // Default response
    return this.getOverviewResponse();
  }

  private getCountResponse(query: string): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (query.includes('task')) {
      return `You have ${data.taskCount.total} tasks total: ${data.taskCount.completed} completed and ${data.taskCount.pending} pending.`;
    }

    if (query.includes('note')) {
      return `You have ${data.totalNotes} notes in your collection.`;
    }

    return `You have ${data.totalNotes} notes with ${data.taskCount.total} tasks (${data.taskCount.pending} pending).`;
  }

  private getTaskResponse(_query: string): string {
    const taskStats = this.calculateTaskStats();
    
    if (taskStats.total === 0) {
      return "You don't have any tasks in your notes yet.";
    }

    const pendingTasks = this.entries
      .flatMap(entry => 
        entry.tasks
          .filter(task => !task.completed)
          .map(task => ({ task, entry })),
      )
      .slice(0, 5);

    let response = `You have ${taskStats.pending} pending tasks`;

    if (pendingTasks.length > 0) {
      response += '. Here are your most recent:\n';
      pendingTasks.forEach(({ task, entry }) => {
        response += `• ${task.text} (from note: "${entry.content.substring(0, 30)}...")\n`;
      });
    }

    return response;
  }

  private getRecentNotesResponse(): string {
    const recent = this.getRecentEntries(3);
    
    if (recent.length === 0) {
      return "You haven't created any notes yet.";
    }

    let response = `Your ${recent.length} most recent notes:\n`;
    recent.forEach(entry => {
      const timeAgo = this.getTimeAgo(entry.timestamp);
      const preview = entry.content.substring(0, 80) + (entry.content.length > 80 ? '...' : '');
      const tags = entry.tags.length > 0 ? ` [${entry.tags.join(', ')}]` : '';
      response += `• ${timeAgo}: "${preview}"${tags}\n`;
    });

    return response;
  }

  private getTagResponse(query: string): string {
    const distribution = this.calculateTagDistribution();
    const tags: TagType[] = ['work', 'health', 'money', 'people', 'growth', 'life'];
    
    // Check for specific tag
    const requestedTag = tags.find(tag => query.includes(tag));
    if (requestedTag && distribution[requestedTag] > 0) {
      const taggedEntries = this.entries
        .filter(entry => entry.tags.includes(requestedTag))
        .slice(0, 3);
      
      let response = `You have ${distribution[requestedTag]} notes tagged with "${requestedTag}"`;
      if (taggedEntries.length > 0) {
        response += '. Recent ones:\n';
        taggedEntries.forEach(entry => {
          response += `• "${entry.content.substring(0, 60)}..."\n`;
        });
      }
      return response;
    }

    // General tag overview
    const activeTags = tags.filter(tag => distribution[tag] > 0);
    if (activeTags.length === 0) {
      return "You haven't tagged any notes yet. Tags help organize notes into life areas: work, health, money, people, growth, and life.";
    }

    let response = 'Your notes by category:\n';
    activeTags.forEach(tag => {
      response += `• ${tag}: ${distribution[tag]} notes\n`;
    });
    if (distribution.untagged > 0) {
      response += `• untagged: ${distribution.untagged} notes\n`;
    }

    return response;
  }

  private searchNotes(query: string): string {
    // Extract search term (simple implementation)
    const searchMatch = query.match(/(?:search|find|about)\s+(?:for\s+)?["']?([^"']+)["']?/i);
    if (!searchMatch) {
      return 'What would you like to search for in your notes?';
    }

    const searchTerm = searchMatch[1].toLowerCase();
    const matches = this.entries.filter(entry => 
      entry.content.toLowerCase().includes(searchTerm),
    );

    if (matches.length === 0) {
      return `I couldn't find any notes containing "${searchTerm}".`;
    }

    let response = `Found ${matches.length} notes containing "${searchTerm}":\n`;
    matches.slice(0, 3).forEach(entry => {
      const preview = entry.content.substring(0, 80) + (entry.content.length > 80 ? '...' : '');
      response += `• "${preview}"\n`;
    });

    if (matches.length > 3) {
      response += `...and ${matches.length - 3} more.`;
    }

    return response;
  }

  private getOverviewResponse(): string {
    const contextData = this.getContextData();
    const data = contextData.data;

    if (data.totalNotes === 0) {
      return "You haven't created any notes yet. Start capturing your thoughts, tasks, and ideas!";
    }

    let response = `You have ${data.totalNotes} notes`;
    
    if (data.taskCount.pending > 0) {
      response += ` with ${data.taskCount.pending} pending tasks`;
    }
    
    if (data.recentNotes.length > 0) {
      const lastNote = data.recentNotes[0];
      response += `. Your last note was ${this.getTimeAgo(lastNote.timestamp)}`;
      
      if (lastNote.actionType) {
        response += ` (${lastNote.actionType})`;
      }
    }

    response += '.';
    return response;
  }

  async search(query: string): Promise<unknown[]> {
    await this.ensureFreshData();
    
    const lowerQuery = query.toLowerCase();
    const matches = this.entries.filter(entry => 
      entry.content.toLowerCase().includes(lowerQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      (entry.actionType && entry.actionType.toLowerCase().includes(lowerQuery)),
    );

    return matches.map(entry => ({
      id: entry.id,
      type: 'note',
      content: entry.content,
      timestamp: entry.timestamp,
      tags: entry.tags,
      actionType: entry.actionType,
      relevance: this.calculateRelevance(entry, lowerQuery),
    })).sort((a, b) => b.relevance - a.relevance);
  }

  private calculateRelevance(entry: Entry, query: string): number {
    let score = 0;
    const lowerContent = entry.content.toLowerCase();
    
    // Content matches
    const contentMatches = (lowerContent.match(new RegExp(query, 'g')) || []).length;
    score += contentMatches * 10;
    
    // Tag matches
    if (entry.tags.some(tag => tag.toLowerCase().includes(query))) {
      score += 20;
    }
    
    // Action type matches
    if (entry.actionType && entry.actionType.toLowerCase().includes(query)) {
      score += 15;
    }
    
    // Recency bonus
    const ageInDays = (timeService.getTimestamp() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24); // eslint-disable-line no-restricted-syntax
    score += Math.max(0, 10 - ageInDays);
    
    return score;
  }

  subscribe(callback: (data: NotesData) => void): () => void {
    this.listeners.push(callback);
    
    // Send initial data
    callback(this.getContextData().data);
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      this.refreshData();
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