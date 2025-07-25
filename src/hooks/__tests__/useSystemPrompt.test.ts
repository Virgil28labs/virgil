import { renderHook } from '@testing-library/react';
import { useSystemPrompt } from '../useSystemPrompt';
import { DynamicContextBuilder } from '../../services/DynamicContextBuilder';
import { dashboardContextService } from '../../services/DashboardContextService';
import type { DashboardContext } from '../../services/DashboardContextService';
import type { User } from '../../types/auth.types';

// Mock the logger to prevent timeService usage during tests
jest.mock('../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock TimeService with the actual mock implementation
jest.mock('../../services/TimeService', () => {
  const actualMock = jest.requireActual('../../services/__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-01T14:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../../services/TimeService';
const mockTimeService = timeService as any;

// Mock dependencies
jest.mock('../../services/DynamicContextBuilder', () => ({
  DynamicContextBuilder: {
    buildEnhancedPrompt: jest.fn(),
  },
}));

jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    getContext: jest.fn(),
    logActivity: jest.fn(),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-01T14:00:00')),
  },
}));

describe('useSystemPrompt Hook', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'ben@example.com',
    user_metadata: {
      name: 'Ben',
    },
  } as User;

  let mockDashboardContext: DashboardContext;

  const defaultProps = {
    user: mockUser,
    customSystemPrompt: 'You are Virgil, a helpful AI assistant.',
    memoryContext: 'Previous conversation about weather',
    dashboardContext: mockDashboardContext,
    contextualSuggestions: ['weather', 'location'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-01T14:00:00');
    
    // Set up mock dashboard context with current timestamp and timeOfDay
    const currentDate = new Date(mockTimeService.getCurrentDate());
    const hour = currentDate.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    mockDashboardContext = {
      location: {
        city: 'Santa Monica',
        country: 'USA',
      },
      weather: null,
      user: mockUser,
      activities: [],
      appStates: {},
      lastUpdated: mockTimeService.getTimestamp(),
      timeOfDay,
    };
    
    (dashboardContextService.getContext as jest.Mock).mockReturnValue(mockDashboardContext);
    (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
    (DynamicContextBuilder.buildEnhancedPrompt as jest.Mock).mockReturnValue({
      enhancedPrompt: 'Enhanced prompt with context',
    });
  });

  afterEach(() => {
    mockTimeService.destroy();
  });

  describe('timeOfDay calculation', () => {
    it('returns morning for hours before 12', () => {
      mockTimeService.setMockDate('2024-01-01T09:00:00');
      const morningContext = {
        ...mockDashboardContext,
        timeOfDay: 'morning',
        lastUpdated: mockTimeService.getTimestamp(),
      };
      (dashboardContextService.getContext as jest.Mock).mockReturnValue(morningContext);
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
      
      const props = { ...defaultProps, dashboardContext: morningContext };
      const { result } = renderHook(() => useSystemPrompt(props));
      
      expect(result.current.timeOfDay).toBe('morning');
    });

    it('returns afternoon for hours 12-16', () => {
      mockTimeService.setMockDate('2024-01-01T14:00:00');
      const afternoonContext = {
        ...mockDashboardContext,
        timeOfDay: 'afternoon',
        lastUpdated: mockTimeService.getTimestamp(),
      };
      (dashboardContextService.getContext as jest.Mock).mockReturnValue(afternoonContext);
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
      
      const props = { ...defaultProps, dashboardContext: afternoonContext };
      const { result } = renderHook(() => useSystemPrompt(props));
      
      expect(result.current.timeOfDay).toBe('afternoon');
    });

    it('returns evening for hours 17+', () => {
      mockTimeService.setMockDate('2024-01-01T19:00:00');
      const eveningContext = {
        ...mockDashboardContext,
        timeOfDay: 'evening',
        lastUpdated: mockTimeService.getTimestamp(),
      };
      (dashboardContextService.getContext as jest.Mock).mockReturnValue(eveningContext);
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
      
      const props = { ...defaultProps, dashboardContext: eveningContext };
      const { result } = renderHook(() => useSystemPrompt(props));
      
      expect(result.current.timeOfDay).toBe('evening');
    });

    it('memoizes timeOfDay and does not recalculate', () => {
      mockTimeService.setMockDate('2024-01-01T09:00:00');
      const morningContext = {
        ...mockDashboardContext,
        timeOfDay: 'morning',
        lastUpdated: mockTimeService.getTimestamp(),
      };
      (dashboardContextService.getContext as jest.Mock).mockReturnValue(morningContext);
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
      
      const props = { ...defaultProps, dashboardContext: morningContext };
      const { result, rerender } = renderHook(() => useSystemPrompt(props));
      
      expect(result.current.timeOfDay).toBe('morning');
      
      // Advance time but don't update context
      mockTimeService.setMockDate('2024-01-01T14:00:00');
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
      rerender();
      
      // Should still be morning (memoized until context changes)
      expect(result.current.timeOfDay).toBe('morning');
    });
  });

  describe('locationContext', () => {
    it('returns formatted location with city and country', () => {
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      expect(result.current.locationContext).toBe('Santa Monica, USA');
    });

    it('returns only city when country is not available', () => {
      (dashboardContextService.getContext as jest.Mock).mockReturnValue({
        ...mockDashboardContext,
        location: { city: 'Santa Monica' },
      });
      
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      expect(result.current.locationContext).toBe('Santa Monica');
    });

    it('returns null when no location is available', () => {
      (dashboardContextService.getContext as jest.Mock).mockReturnValue({
        ...mockDashboardContext,
        location: {},
      });
      
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      expect(result.current.locationContext).toBeNull();
    });

    it('updates when dashboard context changes', () => {
      const { result, rerender } = renderHook(
        (props) => useSystemPrompt(props),
        { initialProps: defaultProps },
      );
      
      expect(result.current.locationContext).toBe('Santa Monica, USA');
      
      // Update context
      const newContext = {
        ...mockDashboardContext,
        location: { city: 'New York', country: 'USA' },
      };
      (dashboardContextService.getContext as jest.Mock).mockReturnValue(newContext);
      
      rerender({ ...defaultProps, dashboardContext: newContext });
      
      expect(result.current.locationContext).toBe('New York, USA');
    });
  });

  describe('createSystemPrompt', () => {
    beforeEach(() => {
      mockTimeService.setMockDate('2024-01-01T14:00:00');
      (dashboardContextService.getCurrentDateTime as jest.Mock).mockReturnValue(mockTimeService.getCurrentDate());
    });

    it('creates basic system prompt without user query', () => {
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      const prompt = result.current.createSystemPrompt();
      
      expect(prompt).toContain('You are Virgil, a helpful AI assistant.');
      expect(prompt).toContain('User: Ben');
      expect(prompt).toContain('Location: Santa Monica, USA');
      expect(prompt).toContain('Time: afternoon');
      expect(prompt).toContain('Memory:Previous conversation about weather');
      expect(prompt).toContain('Be conversational, concise, and use available context naturally.');
    });

    it('creates system prompt without user', () => {
      const propsWithoutUser = { ...defaultProps, user: null };
      const { result } = renderHook(() => useSystemPrompt(propsWithoutUser));
      
      const prompt = result.current.createSystemPrompt();
      
      expect(prompt).toContain('Location: Santa Monica, USA');
      expect(prompt).toContain('Time: afternoon');
      expect(prompt).not.toContain('User:');
    });

    it('handles missing custom system prompt', () => {
      const propsWithoutCustom = { ...defaultProps, customSystemPrompt: '' };
      const { result } = renderHook(() => useSystemPrompt(propsWithoutCustom));
      
      const prompt = result.current.createSystemPrompt();
      
      expect(prompt).toContain('You are Virgil, a contextual AI assistant.');
    });

    it('excludes memory context when not provided', () => {
      const propsWithoutMemory = { ...defaultProps, memoryContext: '' };
      const { result } = renderHook(() => useSystemPrompt(propsWithoutMemory));
      
      const prompt = result.current.createSystemPrompt();
      
      expect(prompt).not.toContain('Memory:');
    });

    it('enhances prompt with user query', () => {
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      const prompt = result.current.createSystemPrompt('What is the weather?');
      
      expect(DynamicContextBuilder.buildEnhancedPrompt).toHaveBeenCalledWith(
        expect.stringContaining('You are Virgil'),
        'What is the weather?',
        mockDashboardContext,
        ['weather', 'location'],
      );
      
      expect(prompt).toContain('Enhanced prompt with context');
      expect(dashboardContextService.logActivity).toHaveBeenCalledWith(
        'Asked: "What is the weather?"',
        'virgil-chat',
      );
    });

    it('truncates long queries in activity log', () => {
      const { result } = renderHook(() => useSystemPrompt(defaultProps));
      
      const longQuery = 'A'.repeat(60);
      result.current.createSystemPrompt(longQuery);
      
      expect(dashboardContextService.logActivity).toHaveBeenCalledWith(
        `Asked: "${'A'.repeat(50)}..."`,
        'virgil-chat',
      );
    });

    it('does not enhance prompt without dashboard context', () => {
      const propsWithoutContext = { ...defaultProps, dashboardContext: null };
      const { result } = renderHook(() => useSystemPrompt(propsWithoutContext));
      
      const prompt = result.current.createSystemPrompt('What is the weather?');
      
      expect(DynamicContextBuilder.buildEnhancedPrompt).not.toHaveBeenCalled();
      expect(prompt).not.toContain('Enhanced prompt with context');
    });

    it('handles unknown location gracefully', () => {
      (dashboardContextService.getContext as jest.Mock).mockReturnValue({
        ...mockDashboardContext,
        location: {},
      });
      
      const propsWithoutUser = { ...defaultProps, user: null };
      const { result } = renderHook(() => useSystemPrompt(propsWithoutUser));
      
      const prompt = result.current.createSystemPrompt();
      
      expect(prompt).toContain('Location: Unknown');
    });

    it('memoizes createSystemPrompt function', () => {
      const { result, rerender } = renderHook(() => useSystemPrompt(defaultProps));
      
      const createPrompt1 = result.current.createSystemPrompt;
      
      rerender();
      
      const createPrompt2 = result.current.createSystemPrompt;
      
      expect(createPrompt1).toBe(createPrompt2);
    });

    it('updates createSystemPrompt when dependencies change', () => {
      const { result, rerender } = renderHook(
        (props) => useSystemPrompt(props),
        { initialProps: defaultProps },
      );
      
      const createPrompt1 = result.current.createSystemPrompt;
      
      rerender({ ...defaultProps, memoryContext: 'New memory context' });
      
      const createPrompt2 = result.current.createSystemPrompt;
      
      expect(createPrompt1).not.toBe(createPrompt2);
    });
  });

  describe('static prompt optimization', () => {
    it('only recalculates static parts when dependencies change', () => {
      const { result, rerender } = renderHook(
        (props) => useSystemPrompt(props),
        { initialProps: defaultProps },
      );
      
      const prompt1 = result.current.createSystemPrompt();
      
      // Change something that doesn't affect static parts
      rerender({ ...defaultProps, contextualSuggestions: ['new', 'suggestions'] });
      
      const prompt2 = result.current.createSystemPrompt();
      
      // Static parts should be the same
      expect(prompt1.split('\n\nMemory:')[0]).toBe(prompt2.split('\n\nMemory:')[0]);
    });
  });
});