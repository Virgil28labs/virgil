/**
 * DynamicContextBuilder Test Suite
 * 
 * Tests the intelligent context enhancement system that analyzes user queries
 * and dynamically selects relevant context to enhance AI responses.
 */

import { DynamicContextBuilder } from '../DynamicContextBuilder';
import { dashboardAppService } from '../DashboardAppService';
import { vectorMemoryService } from '../VectorMemoryService';
import { dashboardContextService } from '../DashboardContextService';
import type { DashboardContext, ContextualSuggestion } from '../DashboardContextService';

// Mock dependencies - order matters!
jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => Date.now()),
    getCurrentTime: jest.fn(() => '12:00 PM'),
    getCurrentDate: jest.fn(() => 'January 15, 2025'),
    getCurrentDateTime: jest.fn(() => 'January 15, 2025 at 12:00 PM'),
    getLocalDate: jest.fn(() => new Date()),
    formatDateToLocal: jest.fn((date: Date) => date.toLocaleDateString()),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'Wednesday'),
    getMonth: jest.fn(() => 'January'),
    getYear: jest.fn(() => 2025),
  },
}));
jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    subscribe: jest.fn(() => jest.fn()),
    getContextSummary: jest.fn(() => 'No active dashboard apps'),
    getAppsWithConfidence: jest.fn(() => Promise.resolve([])),
    getDetailedContext: jest.fn(() => ''),
  },
}));
jest.mock('../DashboardContextService', () => ({
  dashboardContextService: {
    getContext: jest.fn(),
  },
}));
jest.mock('../VectorMemoryService', () => ({
  vectorMemoryService: {
    getSemanticConfidenceBatch: jest.fn(() => Promise.resolve(new Map())),
  },
}));

describe('DynamicContextBuilder', () => {
  const mockDashboardAppService = dashboardAppService as jest.Mocked<typeof dashboardAppService>;
  const mockVectorMemoryService = vectorMemoryService as jest.Mocked<typeof vectorMemoryService>;
  const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;

  // Mock context data
  const mockContext: DashboardContext = {
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
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
      },
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
      activeComponents: ['Dashboard'],
      recentActions: ['view_dashboard'],
      timeSpentInSession: 30000,
      lastInteraction: Date.now(),
    },
    currentTime: '12:00 PM',
    currentDate: 'January 15, 2025',
    dayOfWeek: 'Wednesday',
    timeOfDay: 'afternoon',
    device: {
      hasData: true,
      browser: 'Chrome',
      os: 'macOS',
      screen: '1920x1080',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockDashboardContextService.getContext.mockReturnValue(mockContext);
    mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(new Map());
    mockDashboardAppService.getContextSummary.mockReturnValue('No active dashboard apps');
    mockDashboardAppService.getAppsWithConfidence.mockResolvedValue([]);
  });

  describe('Relevance Calculation', () => {
    describe('Keyword-based Relevance', () => {
      it('calculates time context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('What time is it now?');
        
        expect(relevance.timeContext).toBeGreaterThan(0.5);
      });

      it('calculates location context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('Where am I located?');
        
        expect(relevance.locationContext).toBeGreaterThan(0.5);
      });

      it('calculates weather context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('Is it sunny outside?');
        
        expect(relevance.weatherContext).toBeGreaterThan(0.5);
      });

      it('calculates user context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('What is my email address?');
        
        expect(relevance.userContext).toBeGreaterThan(0.5);
      });

      it('calculates activity context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('What am I currently doing?');
        
        expect(relevance.activityContext).toBeGreaterThan(0.3);
      });

      it('calculates device context relevance', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('What browser am I using?');
        
        expect(relevance.deviceContext).toBeGreaterThan(0.5);
      });

      it('handles multiple context types', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('What time is it here in this weather?');
        
        expect(relevance.timeContext).toBeGreaterThan(0.2);
        expect(relevance.locationContext).toBeGreaterThan(0.1);
        expect(relevance.weatherContext).toBeGreaterThan(0.2);
      });

      it('handles queries with no context keywords', async () => {
        const relevance = await DynamicContextBuilder.calculateRelevance('Hello world');
        
        // All scores should be low
        expect(relevance.timeContext).toBeLessThan(0.3);
        expect(relevance.locationContext).toBeLessThan(0.3);
        expect(relevance.weatherContext).toBeLessThan(0.3);
        expect(relevance.userContext).toBeLessThan(0.3);
        expect(relevance.activityContext).toBeLessThan(0.3);
        expect(relevance.deviceContext).toBeLessThan(0.3);
      });
    });

    describe('Semantic Relevance', () => {
      it('uses semantic matching when available', async () => {
        const semanticScores = new Map([
          ['time', 0.8],
          ['location', 0.1],
        ]);
        mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(semanticScores);
        
        const relevance = await DynamicContextBuilder.calculateRelevance('current moment');
        
        expect(relevance.timeContext).toBe(0.8);
        expect(mockVectorMemoryService.getSemanticConfidenceBatch).toHaveBeenCalled();
      });

      it('falls back to keywords when semantic matching fails', async () => {
        mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(new Map());
        
        const relevance = await DynamicContextBuilder.calculateRelevance('What time is it?');
        
        expect(relevance.timeContext).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Prompt Enhancement', () => {
    it('enhances prompt with time context', async () => {
      const originalPrompt = 'What should I do now?';
      const userQuery = 'What time should I do it?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('Time:');
      expect(enhanced.enhancedPrompt).toContain('12:00 PM');
      expect(enhanced.contextUsed).toContain('time');
    });

    it('enhances prompt with location context', async () => {
      const originalPrompt = 'Find a restaurant';
      const userQuery = 'Where can I go nearby?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('Location:');
      expect(enhanced.enhancedPrompt).toContain('San Francisco');
      expect(enhanced.contextUsed).toContain('location');
    });

    it('enhances prompt with weather context', async () => {
      // Use semantic scores to ensure weather context is included
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(new Map([
        ['weather', 0.7],
      ]));
      
      const originalPrompt = 'Should I wear a jacket?';
      const userQuery = 'Should I wear a jacket?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('Weather:');
      expect(enhanced.enhancedPrompt).toContain('65°F');
      expect(enhanced.contextUsed).toContain('weather');
    });

    it('enhances prompt with user context', async () => {
      const originalPrompt = 'Tell me about my profile';
      const userQuery = 'Who am I?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('User:');
      expect(enhanced.enhancedPrompt).toContain('Test User');
      expect(enhanced.contextUsed).toContain('user');
    });

    it('enhances prompt with device context', async () => {
      const originalPrompt = 'System info';
      const userQuery = 'What are my system specs?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('Device:');
      expect(enhanced.enhancedPrompt).toContain('Chrome');
      expect(enhanced.contextUsed).toContain('device');
    });

    it('includes multiple relevant contexts', async () => {
      mockVectorMemoryService.getSemanticConfidenceBatch.mockResolvedValue(new Map([
        ['time', 0.6],
        ['location', 0.6],
        ['weather', 0.7],
      ]));
      
      const originalPrompt = 'Plan my day';
      const userQuery = 'What time is it here and whats the weather?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.contextUsed).toContain('time');
      expect(enhanced.contextUsed).toContain('location');
      expect(enhanced.contextUsed).toContain('weather');
    });

    it('includes minimal context for low relevance', async () => {
      const originalPrompt = 'Tell me a joke';
      const userQuery = 'Tell me a joke';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      // Should not include any context for unrelated queries
      expect(enhanced.contextUsed).toHaveLength(0);
      expect(enhanced.enhancedPrompt).toBe(originalPrompt);
    });

    it('handles missing context gracefully', async () => {
      mockDashboardContextService.getContext.mockReturnValue({
        ...mockContext,
        weather: { hasData: false, unit: 'fahrenheit' },
        location: {
          ...mockContext.location,
          city: undefined,
          hasGPS: false,
        },
      } as DashboardContext);
      
      const originalPrompt = 'Weather info';
      const userQuery = 'Whats the weather in my location?';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      // Should not include weather context when no data
      expect(enhanced.contextUsed).not.toContain('weather');
    });

    it('includes dashboard app context when relevant', async () => {
      const mockAdapter = {
        appName: 'notes',
        displayName: 'Notes',
        getConfidence: jest.fn(),
        getContextData: jest.fn(() => ({
          appName: 'notes',
          displayName: 'Notes',
          isActive: true,
          lastUsed: Date.now(),
          data: {},
          summary: '5 notes saved',
          capabilities: ['create', 'read'],
        })),
        getKeywords: jest.fn(() => ['note', 'notes']),
      };
      
      mockDashboardAppService.getAppsWithConfidence.mockResolvedValue([
        { adapter: mockAdapter, confidence: 0.8 },
      ]);
      mockDashboardAppService.getDetailedContext.mockReturnValue('\nNotes: 5 notes saved');
      
      const originalPrompt = 'Show my notes';
      const userQuery = 'Show my notes';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
      );
      
      expect(enhanced.enhancedPrompt).toContain('DASHBOARD APP DATA:');
      expect(enhanced.enhancedPrompt).toContain('Notes: 5 notes saved');
      expect(enhanced.contextUsed).toContain('dashboard-apps');
    });
  });

  describe('Context Suggestions', () => {
    it('includes suggestions in enhanced prompt', async () => {
      const mockSuggestions: ContextualSuggestion[] = [
        { 
          id: 'greeting-1',
          type: 'information',
          priority: 'medium',
          content: 'Good afternoon!',
          reasoning: 'time-based greeting',
          triggers: ['greeting', 'hello'],
        },
        { 
          id: 'meal-1',
          type: 'recommendation',
          priority: 'low',
          content: 'Ready for lunch?',
          reasoning: 'meal time suggestion',
          triggers: ['lunch', 'meal'],
        },
      ];
      
      const originalPrompt = 'Hello';
      const userQuery = 'Hello';
      const enhanced = await DynamicContextBuilder.buildEnhancedPrompt(
        originalPrompt,
        userQuery,
        mockContext,
        mockSuggestions,
      );
      
      expect(enhanced.suggestions).toEqual(mockSuggestions);
    });
  });

  describe('Special Query Detection', () => {
    it('detects time queries', async () => {
      const queries = ['what time is it', 'current time', "what's the time"];
      
      for (const query of queries) {
        const enhanced = await DynamicContextBuilder.buildEnhancedPrompt('', query, mockContext);
        expect(enhanced.contextUsed).toContain('time');
      }
    });

    it('detects location queries', async () => {
      const queries = ['where am i', 'my location', 'what is my ip', 'my zip code'];
      
      for (const query of queries) {
        const enhanced = await DynamicContextBuilder.buildEnhancedPrompt('', query, mockContext);
        expect(enhanced.contextUsed).toContain('location');
      }
    });

    it('detects user queries', async () => {
      const queries = ['who am i', 'my name', 'my email', 'my birthday'];
      
      for (const query of queries) {
        const enhanced = await DynamicContextBuilder.buildEnhancedPrompt('', query, mockContext);
        expect(enhanced.contextUsed).toContain('user');
      }
    });

    it('detects device queries', async () => {
      const queries = ['what browser', 'my device', 'system specs', 'what am i using'];
      
      for (const query of queries) {
        const enhanced = await DynamicContextBuilder.buildEnhancedPrompt('', query, mockContext);
        expect(enhanced.contextUsed).toContain('device');
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles empty queries', async () => {
      const relevance = await DynamicContextBuilder.calculateRelevance('');
      
      // Should return minimal scores
      expect(relevance.timeContext).toBeLessThan(0.1);
      expect(relevance.locationContext).toBeLessThan(0.1);
    });

    it('handles very long queries', async () => {
      const longQuery = 'What is the current time ' + 'and weather '.repeat(50);
      const relevance = await DynamicContextBuilder.calculateRelevance(longQuery);
      
      expect(relevance.timeContext).toBeGreaterThan(0);
      expect(relevance.weatherContext).toBeGreaterThan(0);
    });

    it('handles special characters in queries', async () => {
      const relevance = await DynamicContextBuilder.calculateRelevance('What@#$time%^&*is()?');
      
      expect(relevance.timeContext).toBeGreaterThan(0.3);
    });

    it('normalizes relevance scores', async () => {
      const relevance = await DynamicContextBuilder.calculateRelevance(
        'time time time time time time time',
      );
      
      // Score should be capped at 1.0
      expect(relevance.timeContext).toBeLessThanOrEqual(1.0);
      expect(relevance.timeContext).toBeGreaterThan(0.7);
    });
  });
});