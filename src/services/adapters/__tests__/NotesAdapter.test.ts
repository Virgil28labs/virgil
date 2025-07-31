/**
 * NotesAdapter Comprehensive Test Suite
 * 
 * Tests Notes adapter functionality including note management, task tracking,
 * tag distribution, search capabilities, and context data generation.
 */

import { NotesAdapter } from '../NotesAdapter';
import { timeService } from '../../TimeService';
import { logger } from '../../../lib/logger';
import { notesStorage } from '../../../components/notes/storage';
import type { Entry, TagType, ActionType } from '../../../components/notes/types';

// Mock dependencies
jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => 1703020800000), // Dec 20, 2023
    getCurrentDateTime: jest.fn(() => new Date('2023-12-20T00:00:00Z')),
    getTimeAgo: jest.fn((date: Date) => {
      const now = 1703020800000;
      const diff = now - date.getTime();
      if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return `${Math.floor(diff / 86400000)} days ago`;
    }),
  },
}));

jest.mock('../../../components/notes/storage', () => ({
  notesStorage: {
    getAllEntries: jest.fn(),
  },
}));

const mockNotesStorage = notesStorage as jest.Mocked<typeof notesStorage>;

describe('NotesAdapter', () => {
  let adapter: NotesAdapter;
  const baseTime = new Date('2023-12-20T00:00:00Z');
  
  const mockEntries: Entry[] = [
    {
      id: 'note-1',
      content: 'Working on the new project dashboard with authentication and user management features',
      timestamp: new Date(1703020800000 - 60000), // 1 minute before mocked now
      tags: ['work' as TagType],
      actionType: 'task' as ActionType,
      tasks: [
        { id: 'task-1', text: 'Implement authentication', completed: false },
        { id: 'task-2', text: 'Design user dashboard', completed: true },
      ],
    },
    {
      id: 'note-2',
      content: 'Had a great conversation with John about the new product features. Need to follow up next week.',
      timestamp: new Date(1703020800000 - 3600000), // 1 hour before mocked now
      tags: ['people' as TagType, 'work' as TagType],
      actionType: 'note' as ActionType,
      tasks: [
        { id: 'task-3', text: 'Follow up with John', completed: false },
      ],
    },
    {
      id: 'note-3',
      content: 'Reflection on personal growth: I need to focus more on health and work-life balance.',
      timestamp: new Date(1703020800000 - 86400000), // 1 day before mocked now
      tags: ['growth' as TagType, 'health' as TagType],
      actionType: 'reflect' as ActionType,
      tasks: [],
    },
    {
      id: 'note-4',
      content: 'Budget planning for next month includes savings goals and expense tracking.',
      timestamp: new Date(1703020800000 - 2 * 86400000), // 2 days before mocked now
      tags: ['money' as TagType],
      actionType: 'goal' as ActionType,
      tasks: [
        { id: 'task-4', text: 'Set up expense tracking', completed: false },
        { id: 'task-5', text: 'Review monthly budget', completed: false },
      ],
    },
    {
      id: 'note-5',
      content: 'Just a random thought about weekend plans.',
      timestamp: new Date(1703020800000 - 3 * 86400000), // 3 days before mocked now
      tags: [],
      actionType: undefined,
      tasks: [],
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNotesStorage.getAllEntries.mockResolvedValue(mockEntries);
    
    adapter = new NotesAdapter();
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('Constructor and Initialization', () => {
    it('initializes with notes data', async () => {
      expect(mockNotesStorage.getAllEntries).toHaveBeenCalled();
      
      const contextData = adapter.getContextData();
      expect(contextData.data.totalNotes).toBe(5);
      expect(contextData.isActive).toBe(true); // Has recent activity
    });

    it('handles initialization errors gracefully', async () => {
      mockNotesStorage.getAllEntries.mockRejectedValue(new Error('Storage error'));
      
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch notes data',
        expect.any(Error),
        expect.objectContaining({ action: 'loadData', component: 'notesAdapter' }),
      );
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.totalNotes).toBe(0);
    });
  });

  describe('Data Transformation', () => {
    it('correctly calculates task statistics', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.taskCount.total).toBe(5);
      expect(data.taskCount.completed).toBe(1);
      expect(data.taskCount.pending).toBe(4);
    });

    it('calculates tag distribution correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.tagDistribution.work).toBe(2);
      expect(data.tagDistribution.people).toBe(1);
      expect(data.tagDistribution.growth).toBe(1);
      expect(data.tagDistribution.health).toBe(1);
      expect(data.tagDistribution.money).toBe(1);
      expect(data.tagDistribution.life).toBe(0);
      expect(data.tagDistribution.untagged).toBe(1);
    });

    it('calculates action type distribution correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.actionTypeDistribution.task).toBe(1);
      expect(data.actionTypeDistribution.note).toBe(1);
      expect(data.actionTypeDistribution.reflect).toBe(1);
      expect(data.actionTypeDistribution.goal).toBe(1);
      expect(data.actionTypeDistribution.idea).toBe(0);
      expect(data.actionTypeDistribution.uncategorized).toBe(1);
    });

    it('generates recent notes with truncated content', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.recentNotes).toHaveLength(5);
      expect(data.recentNotes[0].content).toContain('Working on the new project dashboard');
      expect(data.recentNotes[0].content.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(data.recentNotes[0].hasActiveTasks).toBe(true);
    });

    it('identifies last update correctly', () => {
      const contextData = adapter.getContextData();
      const data = contextData.data;
      
      expect(data.lastUpdate).toEqual(mockEntries[0].timestamp);
    });
  });

  describe('Context Data Generation', () => {
    it('provides complete context data when active', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.appName).toBe('notes');
      expect(contextData.displayName).toBe('Notes');
      expect(contextData.isActive).toBe(true);
      expect(contextData.icon).toBe('📝');
      expect(contextData.capabilities).toContain('note-taking');
      expect(contextData.capabilities).toContain('task-management');
      expect(contextData.summary).toContain('5 notes');
      expect(contextData.summary).toContain('4 pending tasks');
    });

    it('handles inactive state when no recent activity', async () => {
      // Make entries much older than 30 minutes compared to mocked now timestamp
      const oldEntries = mockEntries.map(entry => ({
        ...entry,
        timestamp: new Date(1703020800000 - 2 * 60 * 60 * 1000), // 2 hours before mocked now
      }));
      
      mockNotesStorage.getAllEntries.mockResolvedValue(oldEntries);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.isActive).toBe(false);
    });

    it('handles empty state', async () => {
      mockNotesStorage.getAllEntries.mockResolvedValue([]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.isActive).toBe(false);
      expect(contextData.lastUsed).toBe(0);
      expect(contextData.summary).toBe('No notes yet');
    });
  });

  describe('Summary Generation', () => {
    it('generates comprehensive summary with all elements', () => {
      const contextData = adapter.getContextData();
      expect(contextData.summary).toMatch(/5 notes.*4 pending tasks.*last note 1 minutes ago/);
    });

    it('handles no pending tasks', async () => {
      const entriesWithoutTasks = mockEntries.map(entry => ({
        ...entry,
        tasks: entry.tasks.map(task => ({ ...task, completed: true })),
      }));
      
      mockNotesStorage.getAllEntries.mockResolvedValue(entriesWithoutTasks);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.summary).not.toContain('pending tasks');
      expect(contextData.summary).toContain('5 notes');
    });
  });

  describe('Query Response Generation', () => {
    it('handles count queries for notes', async () => {
      const response = await adapter.getResponse('how many notes do I have?');
      expect(response).toBe('You have 5 notes in your collection.');
    });

    it('handles count queries for tasks', async () => {
      const response = await adapter.getResponse('how many tasks do I have?');
      expect(response).toBe('You have 5 tasks total: 1 completed and 4 pending.');
    });

    it('handles general count queries', async () => {
      const response = await adapter.getResponse('how many items total?');
      expect(response).toBe('You have 5 notes with 5 tasks (4 pending).');
    });

    it('handles task queries', async () => {
      const response = await adapter.getResponse('show me my tasks');
      expect(response).toContain('You have 4 pending tasks');
      expect(response).toContain('Implement authentication');
      expect(response).toContain('Follow up with John');
    });

    it('handles recent notes queries', async () => {
      const response = await adapter.getResponse('show me recent notes');
      expect(response).toContain('Your 3 most recent notes:');
      expect(response).toContain('Working on the new project dashboard');
      expect(response).toContain('[work]');
    });

    it('handles tag queries for specific tags', async () => {
      const response = await adapter.getResponse('show me work tagged notes');
      expect(response).toContain('You have 2 notes tagged with "work"');
      expect(response).toContain('Working on the new project dashboard');
    });

    it('handles general tag queries', async () => {
      const response = await adapter.getResponse('what tags do I use?');
      expect(response).toContain('Your notes by category:');
      expect(response).toContain('work: 2 notes');
      expect(response).toContain('untagged: 1 notes');
    });

    it('handles search queries', async () => {
      const response = await adapter.getResponse('search for "dashboard"');
      expect(response).toContain('Found 1 notes containing "dashboard"');
      expect(response).toContain('Working on the new project dashboard');
    });

    it('handles search queries with no results', async () => {
      const response = await adapter.getResponse('search for "nonexistent"');
      expect(response).toBe('I couldn\'t find any notes containing "nonexistent".');
    });

    it('handles malformed search queries', async () => {
      const response = await adapter.getResponse('search');
      expect(response).toBe('What would you like to search for in your notes?');
    });

    it('handles overview queries', async () => {
      const response = await adapter.getResponse('tell me about my notes');
      expect(response).toContain('You have 5 notes with 4 pending tasks');
      expect(response).toContain('Your last note was 1 minutes ago (task)');
    });

    it('returns empty string for advice queries', async () => {
      const response = await adapter.getResponse('how should I organize my notes?');
      expect(response).toBe(''); // Should let LLM provide advice
    });
  });

  describe('Edge Cases in Responses', () => {
    it('handles empty task response', async () => {
      const entriesWithoutTasks = mockEntries.map(entry => ({
        ...entry,
        tasks: [],
      }));
      
      mockNotesStorage.getAllEntries.mockResolvedValue(entriesWithoutTasks);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await newAdapter.getResponse('show me my tasks');
      expect(response).toBe("You don't have any tasks in your notes yet.");
    });

    it('handles empty recent notes response', async () => {
      mockNotesStorage.getAllEntries.mockResolvedValue([]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await newAdapter.getResponse('show me recent notes');
      expect(response).toBe("You haven't created any notes yet.");
    });

    it('handles tag query for unused tags', async () => {
      const response = await adapter.getResponse('show me life tagged notes');
      // Should fall back to general tag overview since no life notes exist
      expect(response).toContain('Your notes by category:');
    });

    it('handles empty tag response', async () => {
      const entriesWithoutTags = mockEntries.map(entry => ({
        ...entry,
        tags: [],
      }));
      
      mockNotesStorage.getAllEntries.mockResolvedValue(entriesWithoutTags);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await newAdapter.getResponse('what tags do I use?');
      expect(response).toBe("You haven't tagged any notes yet. Tags help organize notes into life areas: work, health, money, people, growth, and life.");
    });

    it('handles empty overview response', async () => {
      mockNotesStorage.getAllEntries.mockResolvedValue([]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const response = await newAdapter.getResponse('tell me about my notes');
      expect(response).toBe("You haven't created any notes yet. Start capturing your thoughts, tasks, and ideas!");
    });
  });

  describe('Search Functionality', () => {
    it('searches in content, tags, and action types', async () => {
      const results = await adapter.search('work');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('note');
      expect(results[0].label).toContain('Working on the new project dashboard');
      expect(results[0].field).toMatch(/note\./);
    });

    it('searches case insensitively', async () => {
      const results = await adapter.search('WORK');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty results for no matches', async () => {
      const results = await adapter.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('sorts results by relevance', async () => {
      const results = await adapter.search('work');
      
      // Should have results sorted by relevance
      expect(results.length).toBeGreaterThan(1);
      
      // The first result should be more relevant (more matches or newer)
      const firstResult = results[0];
      expect(firstResult).toBeDefined();
    });

    it('truncates long content in search results', async () => {
      const longContentEntry: Entry = {
        id: 'long-note',
        content: 'A'.repeat(100) + ' work related content',
        timestamp: new Date(),
        tags: ['work'],
        actionType: 'note',
        tasks: [],
      };
      
      mockNotesStorage.getAllEntries.mockResolvedValue([longContentEntry]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const results = await newAdapter.search('work');
      expect(results[0].label.length).toBeLessThanOrEqual(53); // 50 + '...'
    });
  });

  describe('Keywords and Confidence', () => {
    it('provides comprehensive note-related keywords', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('note');
      expect(keywords).toContain('task');
      expect(keywords).toContain('idea');
      expect(keywords).toContain('work');
      expect(keywords).toContain('health');
      expect(keywords).toContain('reflection');
    });

    it('returns high confidence for exact matches', async () => {
      const confidence = await adapter.getConfidence('show me my notes');
      expect(confidence).toBe(0.9);
    });

    it('returns high confidence for task queries', async () => {
      const confidence = await adapter.getConfidence('what tasks do I have');
      expect(confidence).toBe(0.9);
    });

    it('returns zero confidence for unrelated queries', async () => {
      const confidence = await adapter.getConfidence('cooking recipes');
      expect(confidence).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles large numbers of notes efficiently', async () => {
      const largeEntries = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        content: `Note content ${i} with some text about work and life`,
        timestamp: new Date(baseTime.getTime() - i * 60000),
        tags: i % 3 === 0 ? ['work'] : i % 3 === 1 ? ['life'] : [],
        actionType: i % 2 === 0 ? 'note' as ActionType : 'task' as ActionType,
        tasks: i % 5 === 0 ? [{ id: `task-${i}`, text: `Task ${i}`, completed: false }] : [],
      }));
      
      mockNotesStorage.getAllEntries.mockResolvedValue(largeEntries);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const startTime = performance.now();
      const contextData = newAdapter.getContextData();
      const endTime = performance.now();
      
      expect(contextData.data.totalNotes).toBe(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('handles notes with many tasks', async () => {
      const noteWithManyTasks: Entry = {
        id: 'task-heavy-note',
        content: 'Project with many subtasks',
        timestamp: new Date(),
        tags: ['work'],
        actionType: 'task',
        tasks: Array.from({ length: 20 }, (_, i) => ({
          id: `subtask-${i}`,
          text: `Subtask ${i}`,
          completed: i % 2 === 0,
        })),
      };
      
      mockNotesStorage.getAllEntries.mockResolvedValue([noteWithManyTasks]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const contextData = newAdapter.getContextData();
      expect(contextData.data.taskCount.total).toBe(20);
      expect(contextData.data.taskCount.completed).toBe(10);
      expect(contextData.data.taskCount.pending).toBe(10);
    });

    it('handles special characters in content', async () => {
      const specialCharEntry: Entry = {
        id: 'special-note',
        content: 'Note with émojis 🚀 and spëcial çhars & symbols!',
        timestamp: new Date(),
        tags: ['life'],
        actionType: 'note',
        tasks: [],
      };
      
      mockNotesStorage.getAllEntries.mockResolvedValue([specialCharEntry]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const results = await newAdapter.search('émojis');
      expect(results).toHaveLength(1);
      expect(results[0].label).toContain('émojis 🚀');
    });

    it('handles very long content efficiently', async () => {
      const longContent = 'A'.repeat(10000) + ' searchable term';
      const longContentEntry: Entry = {
        id: 'long-note',
        content: longContent,
        timestamp: new Date(),
        tags: ['work'],
        actionType: 'note',
        tasks: [],
      };
      
      mockNotesStorage.getAllEntries.mockResolvedValue([longContentEntry]);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const results = await newAdapter.search('searchable');
      expect(results).toHaveLength(1);
      expect(results[0].label.length).toBeLessThanOrEqual(53);
    });
  });

  describe('Relevance Calculation', () => {
    it('calculates relevance based on multiple factors', async () => {
      const testEntries: Entry[] = [
        {
          id: 'content-match',
          content: 'This has work work work mentioned multiple times',
          timestamp: new Date(baseTime.getTime() - 86400000), // Old
          tags: [],
          actionType: 'note',
          tasks: [],
        },
        {
          id: 'tag-match',
          content: 'This mentions something else',
          timestamp: new Date(baseTime.getTime() - 60000), // Recent
          tags: ['work'],
          actionType: 'note',
          tasks: [],
        },
        {
          id: 'action-match',
          content: 'Another note about something',
          timestamp: new Date(baseTime.getTime() - 3600000), // Medium age
          tags: [],
          actionType: 'work' as any, // Using work as action type for test
          tasks: [],
        },
      ];
      
      mockNotesStorage.getAllEntries.mockResolvedValue(testEntries);
      const newAdapter = new NotesAdapter();
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const results = await newAdapter.search('work');
      expect(results.length).toBe(3);
      
      // Results should be sorted by relevance
      // Content with multiple matches should have higher relevance
      expect(results[0].field).toBe('note.content-match');
    });
  });
});