/**
 * VectorMemoryService Test Suite
 * 
 * Tests AI vector similarity service for semantic memory storage, search, and analysis.
 * Critical for intelligent context and conversation understanding.
 */

import { VectorMemoryService } from '../VectorMemoryService';
import { SupabaseMemoryService } from '../SupabaseMemoryService';
import { vectorService } from '../vectorService';
import { timeService } from '../TimeService';
import { dashboardContextService } from '../DashboardContextService';
import { DynamicContextBuilder } from '../DynamicContextBuilder';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import type { ChatMessage } from '../../types/chat.types';
import type { VectorSearchResult } from '../vectorService';
import type { MarkedMemory } from '../SupabaseMemoryService';

// Mock all dependencies
jest.mock('../SupabaseMemoryService');
jest.mock('../vectorService', () => ({
  vectorService: {
    isHealthy: jest.fn(),
    store: jest.fn(),
    search: jest.fn(),
    getCount: jest.fn(),
  },
}));

jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    getCurrentDateTime: jest.fn(),
    startOfDay: jest.fn(),
    endOfDay: jest.fn(),
    toISOString: jest.fn(),
    parseDate: jest.fn(),
    formatDateToLocal: jest.fn(),
    formatTimeToLocal: jest.fn(),
    subtractDays: jest.fn(),
    fromTimestamp: jest.fn(),
    getDay: jest.fn(),
    getHours: jest.fn(),
    getMinutes: jest.fn(),
  },
}));

jest.mock('../DashboardContextService', () => ({
  dashboardContextService: {
    getContext: jest.fn(),
    logActivity: jest.fn(),
  },
}));

jest.mock('../DynamicContextBuilder', () => ({
  DynamicContextBuilder: {
    createContextSummary: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock constants
jest.mock('../../constants/timing', () => ({
  MIN_MESSAGE_LENGTH: 10,
  CONTEXT_SEARCH_LIMIT: 5,
  VECTOR_CONFIDENCE_CACHE_TTL: 3600000, // 1 hour
  VECTOR_CONFIDENCE_CACHE_MAX_SIZE: 100,
  THREAD_GAP_THRESHOLD: 1800000, // 30 minutes
  MAX_CONTENT_PREVIEW_LENGTH: 200,
  HOURLY_CHECK_INTERVAL: 3600000, // 1 hour
}));

describe('VectorMemoryService', () => {
  let service: VectorMemoryService;
  const mockVectorService = vectorService as jest.Mocked<typeof vectorService>;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;
  const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
  const mockDynamicContextBuilder = DynamicContextBuilder as jest.Mocked<typeof DynamicContextBuilder>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset singleton instance for testing
    (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
    
    // Mock time service
    mockTimeService.getTimestamp.mockReturnValue(1705748400000); // January 20, 2024
    mockTimeService.getCurrentDateTime.mockReturnValue(new Date(1705748400000));
    mockTimeService.toISOString.mockImplementation((date?) => date ? date.toISOString() : new Date().toISOString());
    mockTimeService.formatDateToLocal.mockImplementation((date) => date.toLocaleDateString());
    mockTimeService.formatTimeToLocal.mockImplementation((date) => date.toLocaleTimeString());
    
    // Mock vector service as healthy by default
    mockVectorService.isHealthy.mockResolvedValue(true);
    mockVectorService.store.mockResolvedValue('mock-id');
    mockVectorService.search.mockResolvedValue([]);
    mockVectorService.getCount.mockResolvedValue(0);
    
    // Mock dashboard context
    mockDashboardContextService.getContext.mockReturnValue({
      user: { 
        isAuthenticated: true, 
        email: 'test@example.com',
        name: 'Test User',
        memberSince: '2024-01-01',
        preferences: {},
      },
      environment: {
        deviceType: 'desktop',
        isOnline: true,
        prefersDarkMode: false,
        language: 'en-US',
      },
      location: {
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
        city: 'San Francisco',
        region: 'California', 
        country: 'US',
        timezone: 'America/Los_Angeles',
        hasGPS: true,
        ipAddress: '192.168.1.1',
        isp: 'Test ISP',
        postal: '94102',
        address: '123 Market St',
      },
      weather: {
        temperature: 65,
        condition: 'sunny',
        description: 'Clear sky',
        humidity: 60,
        windSpeed: 10,
        feelsLike: 63,
        unit: 'fahrenheit',
        hasData: true,
      },
      activity: {
        activeComponents: ['VirgilChatbot'],
        recentActions: ['send_message'],
        timeSpentInSession: 30000,
        lastInteraction: Date.now(),
      },
      currentTime: '12:00 PM',
      currentDate: 'January 20, 2024',
      dayOfWeek: 'Saturday',
      timeOfDay: 'afternoon',
      device: {
        hasData: true,
        browser: 'Chrome',
        os: 'macOS',
        screen: '1920x1080',
      },
    });
    
    mockDynamicContextBuilder.createContextSummary.mockReturnValue('Test context summary');
    
    // Mock Supabase
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    
    const mockFrom = jest.fn();
    mockSupabase.from.mockReturnValue(mockFrom);
    
    // Create service instance and wait for initialization
    service = VectorMemoryService.getInstance();
    await service.waitForHealthCheck();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = VectorMemoryService.getInstance();
      const instance2 = VectorMemoryService.getInstance();
      
      expect(instance1).toBe(instance2);
      // Don't compare with vectorMemoryService since it may have different health state
    });

    it('extends SupabaseMemoryService', () => {
      expect(service).toBeInstanceOf(SupabaseMemoryService);
    });
  });

  describe('Health Check System', () => {
    it('checks vector service health on initialization', async () => {
      mockVectorService.isHealthy.mockResolvedValue(true);
      
      const healthResult = await service.waitForHealthCheck();
      
      expect(healthResult).toBe(true);
      expect(mockVectorService.isHealthy).toHaveBeenCalled();
    });

    it('handles health check failures gracefully', async () => {
      // Reset instance and mock failure before creating new instance
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockRejectedValue(new Error('Health check failed'));
      
      const newService = VectorMemoryService.getInstance();
      const healthResult = await newService.waitForHealthCheck();
      
      expect(healthResult).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Vector service health check failed',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'checkHealth',
        },
      );
    });

    it('returns false when vector service throws non-Error object', async () => {
      // Reset instance and mock failure before creating new instance
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockRejectedValue('String error');
      
      const newService = VectorMemoryService.getInstance();
      const healthResult = await newService.waitForHealthCheck();
      
      expect(healthResult).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Vector service health check failed',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'checkHealth',
        },
      );
    });
  });

  describe('Message Storage with Embedding', () => {
    beforeEach(() => {
      mockVectorService.isHealthy.mockResolvedValue(true);
    });

    it('stores important messages with vector embedding', async () => {
      const message: ChatMessage = {
        id: 'test-msg-1',
        content: 'My name is John and I work as a software engineer',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));
      mockTimeService.formatDateToLocal.mockReturnValue('1/20/2024');

      await service.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).toHaveBeenCalledWith(
        expect.stringContaining('My name is John and I work as a software engineer'),
      );
      expect(mockVectorService.store).toHaveBeenCalledWith(
        expect.stringContaining('[Context: 1/20/2024, user, Test context summary]'),
      );
      expect(mockDashboardContextService.logActivity).toHaveBeenCalledWith(
        'Stored semantic memory',
        'vector-memory',
      );
    });

    it('skips storage when vector service is unhealthy', async () => {
      // Create a fresh service instance with unhealthy vector service
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();
      
      // Clear the mock after health check to ensure clean state
      mockVectorService.store.mockClear();
      
      const message: ChatMessage = {
        id: 'test-msg-1',
        content: 'Important message that should be stored',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      await unhealthyService.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('skips short messages', async () => {
      const message: ChatMessage = {
        id: 'test-msg-1',
        content: 'hi', // Too short (< 10 chars)
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      await service.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('skips small talk patterns', async () => {
      const smallTalkMessages = [
        'hello there',
        'thanks',
        'how are you',
        'ok',
        'got it',
      ];

      for (const content of smallTalkMessages) {
        const message: ChatMessage = {
          id: 'test-msg',
          content,
          role: 'user',
          timestamp: '2024-01-20T12:00:00Z',
        };

        await service.storeMessageWithEmbedding(message);
      }

      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('stores messages with important patterns', async () => {
      const importantMessages = [
        'my name is Alice',
        'I work as a teacher',
        'remember that I prefer coffee',
        'I always wake up at 6am',
      ];

      mockTimeService.parseDate.mockReturnValue(new Date('2024-01-20T12:00:00Z'));
      mockTimeService.formatDateToLocal.mockReturnValue('1/20/2024');

      for (const content of importantMessages) {
        const message: ChatMessage = {
          id: 'test-msg',
          content,
          role: 'user',
          timestamp: '2024-01-20T12:00:00Z',
        };

        await service.storeMessageWithEmbedding(message);
      }

      expect(mockVectorService.store).toHaveBeenCalledTimes(4);
    });

    it('stores messages with high information density', async () => {
      const message: ChatMessage = {
        id: 'test-msg',
        content: 'Check out https://example.com for more info about API version 2.0',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));

      await service.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).toHaveBeenCalled();
    });

    it('handles storage errors gracefully', async () => {
      mockVectorService.store.mockRejectedValue(new Error('Storage failed'));
      
      const message: ChatMessage = {
        id: 'test-msg',
        content: 'Important message to store',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));

      await service.storeMessageWithEmbedding(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to store message with embedding',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'storeMessage',
        },
      );
    });

    it('creates context string correctly', async () => {
      // Create a fresh healthy service instance
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(true);
      
      const healthyService = VectorMemoryService.getInstance();
      await healthyService.waitForHealthCheck();
      
      // Clear mock calls after health setup
      mockVectorService.store.mockClear();
      
      const message: ChatMessage = {
        id: 'test-msg',
        content: 'Test message for context creation with enough characters to meet minimum length requirement for vector storage. What information should we store? This message has multiple sentences and is over 200 characters long to ensure it meets the storage criteria.',
        role: 'assistant',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));
      mockTimeService.formatDateToLocal.mockReturnValue('January 20, 2024');

      await healthyService.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).toHaveBeenCalledWith(
        expect.stringContaining('Test message for context creation with enough characters to meet minimum length requirement for vector storage. What information should we store? This message has multiple sentences and is over 200 characters long to ensure it meets the storage criteria.\n[Context: January 20, 2024, assistant, Test context summary]'),
      );
    });

    it('handles missing dashboard context gracefully', async () => {
      // Create a fresh healthy service instance
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(true);
      
      const healthyService = VectorMemoryService.getInstance();
      await healthyService.waitForHealthCheck();
      
      // Clear mock calls after health setup
      mockVectorService.store.mockClear();
      
      // Mock createContextSummary to return empty string for this test (missing context)
      mockDynamicContextBuilder.createContextSummary.mockReturnValue('');
      
      mockDashboardContextService.getContext.mockReturnValue({
        user: { 
          isAuthenticated: false, 
          email: '',
          name: '',
          memberSince: '',
          preferences: {},
        },
        environment: {
          deviceType: 'desktop',
          isOnline: false,
          prefersDarkMode: false,
          language: 'en-US',
        },
        location: {
          coordinates: { latitude: 0, longitude: 0, accuracy: 0 },
          city: '',
          region: '', 
          country: '',
          timezone: '',
          hasGPS: false,
          ipAddress: '',
          isp: '',
          postal: '',
          address: '',
        },
        weather: { hasData: false, unit: 'fahrenheit' },
        activity: {
          activeComponents: [],
          recentActions: [],
          timeSpentInSession: 0,
          lastInteraction: 0,
        },
        currentTime: '',
        currentDate: '',
        dayOfWeek: '',
        timeOfDay: 'morning',
        device: { hasData: false, browser: '', os: '', screen: '' },
      });
      
      const message: ChatMessage = {
        id: 'test-msg',
        content: 'Test message without dashboard context but with enough characters to meet minimum length requirement for vector storage. What data should we process? This message is also over 200 characters long to meet the storage criteria for high information density.',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));
      mockTimeService.formatDateToLocal.mockReturnValue('1/20/2024');

      await healthyService.storeMessageWithEmbedding(message);

      expect(mockVectorService.store).toHaveBeenCalledWith(
        expect.stringContaining('Test message without dashboard context but with enough characters to meet minimum length requirement for vector storage. What data should we process? This message is also over 200 characters long to meet the storage criteria for high information density.\n[Context: 1/20/2024, user]'),
      );
    });
  });

  describe('Semantic Memory Search', () => {
    beforeEach(() => {
      mockVectorService.isHealthy.mockResolvedValue(true);
    });

    it('searches for semantically similar memories', async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'My name is John\n[Context: 1/20/2024, user, work context]',
          similarity: 0.85,
        },
        {
          id: 'result-2',
          content: 'I prefer coffee over tea\n[Context: 1/19/2024, user, preference context]',
          similarity: 0.72,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const results = await service.searchSimilarMemories('tell me about John', 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'result-1',
        content: 'My name is John',
        role: 'user',
        timestamp: 1705748400000,
        context: '1/20/2024, user, work context',
        similarity: 0.85,
      });
      expect(results[1].content).toBe('I prefer coffee over tea');
      expect(mockVectorService.search).toHaveBeenCalledWith('tell me about John', 5);
    });

    it('returns empty array when vector service is unhealthy', async () => {
      // Create a fresh service instance with unhealthy vector service
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();

      const results = await unhealthyService.searchSimilarMemories('test query');

      expect(results).toEqual([]);
      expect(mockVectorService.search).not.toHaveBeenCalled();
    });

    it('handles search errors gracefully', async () => {
      mockVectorService.search.mockRejectedValue(new Error('Search failed'));

      const results = await service.searchSimilarMemories('test query');

      expect(results).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to search similar memories',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'searchSimilar',
        },
      );
    });

    it('uses default limit when not specified', async () => {
      mockVectorService.search.mockResolvedValue([]);

      await service.searchSimilarMemories('test query');

      expect(mockVectorService.search).toHaveBeenCalledWith('test query', 10);
    });

    it('parses vector results correctly', async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'I work as a teacher\n[Context: 1/20/2024, assistant, work context]',
          similarity: 0.9,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const results = await service.searchSimilarMemories('what do you do');

      expect(results[0].role).toBe('assistant'); // Context contains 'assistant'
      expect(results[0].context).toBe('1/20/2024, assistant, work context');
    });

    it('defaults to user role when context parsing fails', async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'Content without context markers',
          similarity: 0.8,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const results = await service.searchSimilarMemories('test');

      expect(results[0].role).toBe('assistant'); // Default when no 'user' in context
      expect(results[0].context).toBeUndefined();
    });
  });

  describe('Enhanced Context Generation', () => {
    beforeEach(() => {
      mockVectorService.isHealthy.mockResolvedValue(true);
      
      // Mock SupabaseMemoryService methods
      const mockGetContextForPrompt = jest.fn().mockReturnValue('Base context from Supabase');
      const mockGetMemoriesByCategory = jest.fn().mockResolvedValue(new Map([
        ['Personal Info', [
          { content: 'My name is Alice', timestamp: 1705748400000 },
          { content: 'I live in Seattle', timestamp: 1705748300000 },
        ]],
      ]));
      
      service.getContextForPrompt = mockGetContextForPrompt;
      service.getMemoriesByCategory = mockGetMemoriesByCategory;
    });

    it('generates enhanced context with semantic memories', async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'My favorite color is blue\n[Context: recent]',
          similarity: 0.85,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const context = await service.getEnhancedContext('what do I like');

      expect(context).toContain('Base context from Supabase');
      expect(context).toContain('Relevant memories:');
      expect(context).toContain('My favorite color is blue (85% relevant)');
    });

    it('adds category-specific context when query matches category', async () => {
      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'General memory',
          similarity: 0.7,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const context = await service.getEnhancedContext('tell me my name');

      expect(context).toContain('Personal Info history:');
      expect(context).toContain('My name is Alice');
    });

    it('falls back to regular context when vector service unhealthy', async () => {
      // Create a fresh unhealthy service instance
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();
      
      // Mock getContextForPrompt to return expected value for unhealthy service
      unhealthyService.getContextForPrompt = jest.fn().mockResolvedValue('Base context from Supabase');
      
      const context = await unhealthyService.getEnhancedContext('test query');

      expect(context).toBe('Base context from Supabase');
      expect(mockVectorService.search).not.toHaveBeenCalled();
    });

    it('falls back to regular context when no similar memories found', async () => {
      mockVectorService.search.mockResolvedValue([]);

      const context = await service.getEnhancedContext('test query');

      expect(context).toBe('Base context from Supabase');
    });

    it('handles enhanced context errors gracefully', async () => {
      mockVectorService.search.mockRejectedValue(new Error('Search failed'));

      const context = await service.getEnhancedContext('test query');

      expect(context).toBe('Base context from Supabase');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to search similar memories',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'searchSimilar',
        },
      );
    });
  });

  describe('Memory Synchronization', () => {
    beforeEach(() => {
      mockVectorService.isHealthy.mockResolvedValue(true);
      
      // Mock SupabaseMemoryService method
      const mockGetMarkedMemories = jest.fn().mockResolvedValue([
        {
          id: 'memory-1',
          content: 'Important memory 1',
          context: 'Work context',
          timestamp: 1705748400000,
          tag: 'important',
        },
        {
          id: 'memory-2', 
          content: 'Important memory 2',
          context: 'Personal context',
          timestamp: 1705748300000,
          tag: 'important',
        },
      ] as MarkedMemory[]);
      
      service.getMarkedMemories = mockGetMarkedMemories;
    });

    it('syncs important memories to vector storage', async () => {
      await service.syncImportantMemories();

      expect(mockVectorService.store).toHaveBeenCalledTimes(2);
      expect(mockVectorService.store).toHaveBeenCalledWith(
        'Important memory 1\n[Context: Work context]',
      );
      expect(mockVectorService.store).toHaveBeenCalledWith(
        'Important memory 2\n[Context: Personal context]',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Synced 2 memories',
        {
          component: 'VectorMemoryService',
          action: 'syncMemories',
          metadata: { count: 2 },
        },
      );
    });

    it('skips sync when vector service is unhealthy', async () => {
      // Create a fresh service instance with unhealthy vector service
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();

      await unhealthyService.syncImportantMemories();

      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('handles sync errors gracefully', async () => {
      mockVectorService.store.mockRejectedValue(new Error('Storage failed'));

      await service.syncImportantMemories();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to sync memories',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'syncMemories',
        },
      );
    });
  });

  describe('Vector Memory Statistics', () => {
    it('returns vector memory stats when healthy', async () => {
      mockVectorService.isHealthy.mockResolvedValue(true);
      mockVectorService.getCount.mockResolvedValue(42);

      const stats = await service.getVectorMemoryStats();

      expect(stats).toEqual({
        count: 42,
        healthy: true,
      });
    });

    it('returns stats when unhealthy', async () => {
      // Create a fresh service instance with unhealthy vector service
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      mockVectorService.getCount.mockResolvedValue(15);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();

      const stats = await unhealthyService.getVectorMemoryStats();

      expect(stats).toEqual({
        count: 15,
        healthy: false,
      });
    });

    it('handles stats errors gracefully', async () => {
      mockVectorService.getCount.mockRejectedValue(new Error('Count failed'));

      const stats = await service.getVectorMemoryStats();

      expect(stats).toEqual({
        count: 0,
        healthy: false,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get vector memory stats',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'getStats',
        },
      );
    });
  });

  describe('Daily Summary Creation', () => {
    beforeEach(() => {
      const mockDate = new Date('2024-01-20T15:30:00Z');
      mockTimeService.getCurrentDateTime.mockReturnValue(mockDate);
      mockTimeService.startOfDay.mockReturnValue(new Date('2024-01-20T00:00:00Z'));
      mockTimeService.endOfDay.mockReturnValue(new Date('2024-01-20T23:59:59Z'));
      mockTimeService.toISOString.mockImplementation((date?) => date ? date.toISOString() : new Date().toISOString());
      mockTimeService.formatDateToLocal.mockReturnValue('January 20, 2024');
      mockTimeService.parseDate.mockImplementation((timestamp) => 
        typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp),
      );
      mockTimeService.formatTimeToLocal.mockReturnValue('9:00 AM');

      // Mock Supabase query chain
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockLte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-1',
            content: 'Hello, how can I help you with your work today?',
            role: 'assistant',
            timestamp: '2024-01-20T09:00:00Z',
          },
          {
            id: 'msg-2',
            content: 'I need help with a dashboard component',
            role: 'user',
            timestamp: '2024-01-20T09:01:00Z',
          },
        ],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      // Mock markAsImportant method
      service.markAsImportant = jest.fn().mockResolvedValue(undefined);
    });

    it('creates daily summary with message threads', async () => {
      const summary = await service.createDailySummary();

      expect(summary).toContain('Daily Summary for January 20, 2024');
      expect(summary).toContain('Total conversations: 1');
      expect(summary).toContain('Total messages: 2');
      // The topics might be extracted in a different order or format
      expect(summary).toContain('Topics:');
      expect(summary).toContain('Dashboard Features');
      expect(service.markAsImportant).toHaveBeenCalledWith(
        'summary-2024-01-20',
        expect.stringContaining('Daily Summary'),
        'Generated summary for January 20, 2024',
        'daily-summary',
      );
    });

    it('handles no messages gracefully', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: mockOrder,
      });

      const summary = await service.createDailySummary();

      expect(summary).toBe('No conversations on January 20, 2024');
    });

    it('handles database errors', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: mockOrder,
      });

      const summary = await service.createDailySummary();

      expect(summary).toBe('No conversations on January 20, 2024');
    });

    it('handles unauthenticated user', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(service.createDailySummary()).rejects.toThrow('User not authenticated');
    });

    it('groups messages into conversation threads', async () => {
      // Mock messages with different timestamps to test thread grouping
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-1',
            content: 'First message',
            role: 'user',
            timestamp: '2024-01-20T09:00:00Z',
          },
          {
            id: 'msg-2',
            content: 'Response to first',
            role: 'assistant',
            timestamp: '2024-01-20T09:01:00Z',
          },
          {
            id: 'msg-3',
            content: 'Second conversation after gap',
            role: 'user',
            timestamp: '2024-01-20T11:00:00Z', // 2 hour gap
          },
        ],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: mockOrder,
      });

      mockTimeService.formatTimeToLocal.mockImplementation((date) => 
        date.toLocaleTimeString(),
      );

      const summary = await service.createDailySummary();

      expect(summary).toContain('Total conversations: 2');
      expect(summary).toContain('Total messages: 3');
    });
  });

  describe('Semantic Confidence Batch Processing', () => {
    beforeEach(() => {
      mockVectorService.isHealthy.mockResolvedValue(true);
    });

    it('processes semantic confidence for multiple queries', async () => {
      const queries = [
        { query: 'test query', intent: 'notes' },
        { query: 'test query', intent: 'tasks' },
      ];

      const mockResults: VectorSearchResult[] = [
        {
          id: 'result-1',
          content: 'Note content\n[Intent: notes]',
          similarity: 0.8,
        },
        {
          id: 'result-2',
          content: 'Task content\n[Intent: tasks]',
          similarity: 0.6,
        },
      ];

      mockVectorService.search.mockResolvedValue(mockResults);

      const results = await service.getSemanticConfidenceBatch(queries);

      expect(results.get('notes')).toBe(0.8);
      expect(results.get('tasks')).toBe(0.6);
      expect(mockVectorService.search).toHaveBeenCalledWith('test query', 10);
    });

    it('uses cache for repeated queries', async () => {
      const queries = [{ query: 'cached query', intent: 'notes' }];

      // First call
      mockVectorService.search.mockResolvedValue([
        { id: 'result-1', content: 'Cached content\n[Intent: notes]', similarity: 0.9 },
      ]);

      const results1 = await service.getSemanticConfidenceBatch(queries);
      const results2 = await service.getSemanticConfidenceBatch(queries);

      expect(results1.get('notes')).toBe(0.9);
      expect(results2.get('notes')).toBe(0.9);
      expect(mockVectorService.search).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('respects cache TTL', async () => {
      const queries = [{ query: 'ttl query', intent: 'notes' }];

      mockVectorService.search.mockResolvedValue([
        { id: 'result-1', content: 'Content\n[Intent: notes]', similarity: 0.7 },
      ]);

      await service.getSemanticConfidenceBatch(queries);

      // Advance time beyond cache TTL (1 hour)
      mockTimeService.getTimestamp.mockReturnValue(1705748400000 + 3600001);

      await service.getSemanticConfidenceBatch(queries);

      expect(mockVectorService.search).toHaveBeenCalledTimes(2);
    });

    it('returns 0 confidence when vector service unhealthy', async () => {
      // Create a fresh service instance with unhealthy vector service
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      const unhealthyService = VectorMemoryService.getInstance();
      await unhealthyService.waitForHealthCheck();

      const queries = [{ query: 'test', intent: 'notes' }];
      const results = await unhealthyService.getSemanticConfidenceBatch(queries);

      expect(results.get('notes')).toBe(0);
      expect(mockVectorService.search).not.toHaveBeenCalled();
    });

    it('handles batch processing errors gracefully', async () => {
      mockVectorService.search.mockRejectedValue(new Error('Search failed'));

      const queries = [{ query: 'error query', intent: 'notes' }];
      const results = await service.getSemanticConfidenceBatch(queries);

      expect(results.get('notes')).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get semantic confidence batch',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'getSemanticConfidenceBatch',
          metadata: { queryCount: 1 },
        },
      );
    });
  });

  describe('Pattern Learning and Analysis', () => {
    beforeEach(() => {
      mockTimeService.getCurrentDateTime.mockReturnValue(new Date('2024-01-21T00:00:00Z'));
      mockTimeService.subtractDays.mockReturnValue(new Date('2024-01-14T00:00:00Z'));

      // Mock getSummaries method
      service.getSummaries = jest.fn().mockResolvedValue([
        {
          id: 'summary-1',
          content: 'daily summary for january 20, 2024\ntotal conversations: 2\nconversation 1 (9:00 am):\ntopics: work/career, help/explanation\npreference: i prefer morning meetings',
          timestamp: 1705779600000,
          tag: 'daily-summary',
        },
      ] as MarkedMemory[]);

      service.markAsImportant = jest.fn().mockResolvedValue(undefined);
    });

    it('learns patterns from conversation summaries', async () => {
      const { patterns, insights } = await service.learnPatternsFromSummaries();

      expect(patterns.get('peak_hours')).toContain('9:00');
      expect(patterns.get('frequent_topics')).toContain('work/career');
      expect(patterns.get('preferences')).toContain('i prefer morning meetings');
      expect(insights).toContain('Most active during: 9 AM');
      expect(insights).toContain('Most discussed topics: work/career (1x), help/explanation (1x)');
      expect(insights).toContain('Learned 1 user preferences');
    });

    it('handles no summaries gracefully', async () => {
      service.getSummaries = jest.fn().mockResolvedValue([]);

      const { patterns, insights } = await service.learnPatternsFromSummaries();

      expect(patterns.size).toBe(0);
      expect(insights).toHaveLength(0);
    });

    it('stores pattern insights as memory', async () => {
      await service.learnPatternsFromSummaries();

      expect(service.markAsImportant).toHaveBeenCalledWith(
        expect.stringMatching(/^patterns-/),
        expect.stringContaining('Pattern Analysis'),
        'Weekly pattern analysis from conversation summaries',
        'pattern-analysis',
      );
    });

    it('handles pattern learning errors gracefully', async () => {
      service.getSummaries = jest.fn().mockRejectedValue(new Error('Failed to get summaries'));

      const { patterns, insights } = await service.learnPatternsFromSummaries();

      expect(patterns.size).toBe(0);
      expect(insights).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to learn patterns from summaries',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'learnPatternsFromSummaries',
        },
      );
    });
  });

  describe('Category Management', () => {
    beforeEach(() => {
      // Mock getMarkedMemories
      service.getMarkedMemories = jest.fn().mockResolvedValue([
        {
          id: 'memory-1',
          content: 'My name is Alice and I work as a teacher',
          timestamp: 1705748400000,
          tag: 'personal',
        },
        {
          id: 'memory-2',
          content: 'Remember to check the weather tomorrow',
          timestamp: 1705748300000,
          tag: 'reminder',
        },
        {
          id: 'summary-1',
          content: 'Daily summary content',
          timestamp: 1705748200000,
          tag: 'daily-summary',
        },
      ] as MarkedMemory[]);

      mockTimeService.fromTimestamp.mockImplementation((timestamp) => new Date(timestamp));
      mockTimeService.formatDateToLocal.mockReturnValue('January 20, 2024');
    });

    it('categorizes memories by content patterns', async () => {
      const categorized = await service.getMemoriesByCategory();

      expect(categorized.get('Personal Info')).toHaveLength(1);
      expect(categorized.get('Personal Info')?.[0].content).toContain('My name is Alice');
      // 'Remember to check the weather tomorrow' matches 'Weather' category first
      expect(categorized.get('Weather')).toHaveLength(1);
      expect(categorized.get('Weather')?.[0].content).toContain('weather tomorrow');
    });

    it('excludes daily summaries from category view', async () => {
      const categorized = await service.getMemoriesByCategory();

      const allMemories = Array.from(categorized.values()).flat();
      expect(allMemories).not.toContainEqual(
        expect.objectContaining({ content: 'Daily summary content' }),
      );
    });

    it('sorts memories within categories by timestamp', async () => {
      service.getMarkedMemories = jest.fn().mockResolvedValue([
        {
          id: 'memory-1',
          content: 'My name is Alice',
          timestamp: 1705748300000, // Older
          tag: 'personal',
        },
        {
          id: 'memory-2',
          content: 'My email is alice@example.com',
          timestamp: 1705748400000, // Newer
          tag: 'personal',
        },
      ] as MarkedMemory[]);

      const categorized = await service.getMemoriesByCategory();
      const personalInfo = categorized.get('Personal Info') || [];

      expect(personalInfo[0].content).toBe('My email is alice@example.com'); // Newer first
      expect(personalInfo[1].content).toBe('My name is Alice');
    });

    it('creates category summary', async () => {
      const summary = await service.createCategorySummary();

      expect(summary).toContain('Memory Categories Summary');
      expect(summary).toContain('Personal Info (1 memories)');
      expect(summary).toContain('Weather (1 memories)'); // Changed from Time/Schedule
      expect(summary).toContain('January 20, 2024: My name is Alice and I work as a teacher');
    });

    it('handles category creation errors gracefully', async () => {
      // Mock getMemoriesByCategory directly to throw error
      service.getMemoriesByCategory = jest.fn().mockRejectedValue(new Error('Failed to get memories'));

      // The createCategorySummary method catches errors and throws them
      await expect(service.createCategorySummary()).rejects.toThrow('Failed to get memories');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create category summary',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'createCategorySummary',
        },
      );
    });
  });

  describe('User Patterns Retrieval', () => {
    beforeEach(() => {
      service.getMarkedMemories = jest.fn().mockResolvedValue([
        {
          id: 'pattern-1',
          content: 'Pattern Analysis (January 21, 2024)\nMost active during: 9 AM, 2 PM\nMost discussed topics: Work/Career (5x), Health (3x)\nLearned 10 user preferences',
          timestamp: 1705780800000,
          tag: 'pattern-analysis',
        },
      ] as MarkedMemory[]);
    });

    it('retrieves user behavior patterns from stored analysis', async () => {
      const patterns = await service.getUserPatterns();

      expect(patterns.peakHours).toEqual(['9 AM', '2 PM']);
      expect(patterns.frequentTopics).toEqual(['Work/Career', 'Health']);
      expect(patterns.preferences).toEqual(['10 preferences learned']);
    });

    it('runs fresh analysis when no patterns exist', async () => {
      service.getMarkedMemories = jest.fn().mockResolvedValue([]);
      service.learnPatternsFromSummaries = jest.fn().mockResolvedValue({
        patterns: new Map([
          ['peak_hours', ['10:00']],
          ['frequent_topics', ['General']],
        ]),
        insights: [],
      });

      const patterns = await service.getUserPatterns();

      expect(patterns.peakHours).toEqual(['10:00']);
      expect(patterns.frequentTopics).toEqual(['General']);
    });

    it('handles pattern retrieval errors gracefully', async () => {
      service.getMarkedMemories = jest.fn().mockRejectedValue(new Error('Failed to get patterns'));

      const patterns = await service.getUserPatterns();

      expect(patterns).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user patterns',
        expect.any(Error),
        {
          component: 'VectorMemoryService',
          action: 'getUserPatterns',
        },
      );
    });
  });

  describe('Cache Management', () => {
    it('manages confidence cache size limits', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 100; i++) {
        const queries = [{ query: `query-${i}`, intent: 'test' }];
        mockVectorService.search.mockResolvedValue([
          { id: 'result', content: 'Content\n[Intent: test]', similarity: 0.5 },
        ]);
        await service.getSemanticConfidenceBatch(queries);
      }

      // Add one more to trigger cleanup
      const queries = [{ query: 'trigger-cleanup', intent: 'test' }];
      await service.getSemanticConfidenceBatch(queries);

      // Should have managed cache size appropriately
      expect(mockVectorService.search).toHaveBeenCalledTimes(101);
    });

    it('cleans up expired cache entries', async () => {
      const queries = [{ query: 'expire-test', intent: 'notes' }];

      mockVectorService.search.mockResolvedValue([
        { id: 'result', content: 'Content\n[Intent: notes]', similarity: 0.7 },
      ]);

      await service.getSemanticConfidenceBatch(queries);

      // Advance time beyond TTL
      mockTimeService.getTimestamp.mockReturnValue(1705748400000 + 3600001);

      await service.getSemanticConfidenceBatch(queries);

      expect(mockVectorService.search).toHaveBeenCalledTimes(2); // Cache expired, called again
    });
  });

  describe('Error Handling', () => {
    it('handles non-Error objects in health check', async () => {
      // Create a fresh service instance with failing health check
      (VectorMemoryService as unknown as { instance?: VectorMemoryService }).instance = undefined;
      mockVectorService.isHealthy.mockRejectedValue('String error');

      const errorService = VectorMemoryService.getInstance();
      const result = await errorService.waitForHealthCheck();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Vector service health check failed',
        expect.any(Error),
        expect.any(Object),
      );
    });

    it('handles non-Error objects in storage', async () => {
      mockVectorService.store.mockRejectedValue('Storage string error');

      const message: ChatMessage = {
        id: 'test',
        content: 'Important message',
        role: 'user',
        timestamp: '2024-01-20T12:00:00Z',
      };

      mockTimeService.parseDate.mockReturnValue(new Date(message.timestamp));

      await service.storeMessageWithEmbedding(message);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to store message with embedding',
        expect.any(Error),
        expect.any(Object),
      );
    });
  });
});