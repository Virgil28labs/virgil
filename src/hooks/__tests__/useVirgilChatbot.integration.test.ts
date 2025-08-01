/**
 * VirgilChatbot Hook Integration Tests
 * 
 * Tests the complete integration of all chatbot hooks including context sync,
 * memory integration, real-time updates, and cross-component communication.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { AllTheProviders } from '../../test-utils/AllTheProviders';
import { useContextSync } from '../useContextSync';
import { useMemoryService } from '../useMemoryService';
import { useDashboardContext } from '../useDashboardContext';
import { useSystemPrompt } from '../useSystemPrompt';
import { useMessageHandling } from '../useMessageHandling';
import type { AuthContextValue } from '../../types/auth.types';
import type { ChatMessage } from '../../types/chat.types';

// Mock all services and contexts
jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    getContext: jest.fn(() => ({
      currentTime: '12:00 PM',
      currentDate: 'January 15, 2025',
      timeOfDay: 'afternoon',
      location: { hasGPS: true, city: 'San Francisco' },
      weather: { hasData: true, temperature: 22, condition: 'sunny' },
      user: { isAuthenticated: true, name: 'Test User' },
      device: { hasData: true, device: 'Desktop' },
      activity: { activeComponents: [], recentActions: [] },
      environment: { isOnline: true, deviceType: 'desktop' },
      apps: { apps: new Map(), activeApps: [], lastUpdated: Date.now() },
    })),
    subscribe: jest.fn(() => jest.fn()),
    logActivity: jest.fn(),
  },
}));

jest.mock('../../services/MemoryService', () => ({
  MemoryService: jest.fn(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getContextForPrompt: jest.fn().mockResolvedValue('Recent conversation context'),
    markAsImportant: jest.fn().mockResolvedValue(undefined),
    getRecentMessages: jest.fn().mockResolvedValue([]),
    saveConversation: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../services/SupabaseMemoryService', () => ({
  supabaseMemoryService: {
    isConnected: jest.fn(() => true),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    storeVector: jest.fn().mockResolvedValue(undefined),
    searchSimilar: jest.fn().mockResolvedValue([]),
    getConnectionStatus: jest.fn(() => ({ connected: true, lastSync: Date.now() })),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Chat API mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    body: {
      getReader: () => ({
        read: () => Promise.resolve({ 
          done: true, 
          value: new TextEncoder().encode('Test response'), 
        }),
      }),
    },
  } as Response),
);

describe('VirgilChatbot Hook Integration Tests', () => {
  const mockUser: AuthContextValue['user'] = {
    id: '1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    role: 'authenticated',
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    confirmation_sent_at: undefined,
    confirmed_at: '2024-01-01T00:00:00.000Z',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: undefined,
    phone_confirmed_at: undefined,
    recovery_sent_at: undefined,
    new_email: undefined,
    invited_at: undefined,
    factors: undefined,
    identities: [],
    is_anonymous: false,
  };

  const wrapper = ({ children }: { children: ReactNode }) => React.createElement(AllTheProviders, null, children);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Context Synchronization Integration', () => {
    it('synchronizes dashboard context with chat state', async () => {
      const mockDispatch = jest.fn();
      
      renderHook(
        () => {
          const contextSync = useContextSync();
          const dashboardContext = useDashboardContext({ dispatch: mockDispatch });
          return { contextSync, dashboardContext };
        },
        { wrapper },
      );

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_DASHBOARD_CONTEXT',
          payload: expect.objectContaining({
            currentTime: '12:00 PM',
            location: expect.objectContaining({ city: 'San Francisco' }),
            weather: expect.objectContaining({ temperature: 22 }),
          }),
        });
      });
    });

    it('updates context when dashboard state changes', async () => {
      const mockDispatch = jest.fn();
      let contextUpdateCallback: ((context: unknown) => void) | undefined;
      
      const dashboardContextService = require('../../services/DashboardContextService').dashboardContextService;
      dashboardContextService.subscribe.mockImplementation((callback: (context: unknown) => void) => {
        contextUpdateCallback = callback;
        return jest.fn();
      });

      renderHook(
        () => {
          useContextSync();
          useDashboardContext({ dispatch: mockDispatch });
        },
        { wrapper },
      );

      // Simulate dashboard context update
      if (contextUpdateCallback) {
        act(() => {
          contextUpdateCallback!({
            currentTime: '1:00 PM',
            location: { hasGPS: true, city: 'Los Angeles' },
            weather: { hasData: true, temperature: 28, condition: 'hot', unit: 'celsius' as const },
            user: { isAuthenticated: true, name: 'Test User' },
            device: { hasData: true, device: 'Mobile' },
            activity: { activeComponents: ['weather'], recentActions: ['check_weather'], timeSpentInSession: 0, lastInteraction: Date.now() },
            environment: { isOnline: true, deviceType: 'mobile', prefersDarkMode: false, language: 'en' },
            apps: { apps: new Map(), activeApps: [], lastUpdated: Date.now() },
          });
        });
      }

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_DASHBOARD_CONTEXT',
          payload: expect.objectContaining({
            currentTime: '1:00 PM',
            location: expect.objectContaining({ city: 'Los Angeles' }),
            weather: expect.objectContaining({ temperature: 28 }),
          }),
        });
      });
    });
  });

  describe('Memory Service Integration', () => {
    it('integrates memory context with chat responses', async () => {
      const mockDispatch = jest.fn();
      const mockSetError = jest.fn();
      
      const { result } = renderHook(
        () => useMemoryService({
          dispatch: mockDispatch,
          setError: mockSetError,
          dashboardContext: {
            currentTime: '12:00 PM',
            currentDate: 'January 15, 2025',
            timeOfDay: 'afternoon',
            dayOfWeek: 'Wednesday',
            location: { hasGPS: true, city: 'San Francisco' },
            weather: { hasData: true, temperature: 22, unit: 'celsius' as const },
            user: { isAuthenticated: true, name: 'Test User' },
            device: { hasData: true },
            activity: { activeComponents: [], recentActions: [], timeSpentInSession: 0, lastInteraction: Date.now() },
            environment: { isOnline: true, deviceType: 'desktop', prefersDarkMode: false, language: 'en' },
            apps: { apps: new Map(), activeApps: [], lastUpdated: Date.now() },
          },
        }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isRealtimeConnected).toBe(true);
      });

      // Test memory marking
      const testMessage: ChatMessage = {
        id: 'msg-123',
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString(),
      };
      await act(async () => {
        await result.current.markAsImportant(testMessage);
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MEMORY_CONTEXT',
        payload: expect.any(String),
      });
    });
  });

  describe('System Prompt Integration', () => {
    it('creates comprehensive system prompts with all context', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello Virgil',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          timestamp: new Date(Date.now() + 1000).toISOString(),
        },
      ];

      const { result } = renderHook(
        () => useSystemPrompt({
          user: mockUser,
          customSystemPrompt: 'Custom instructions',
          memoryContext: 'Recent conversation context',
          dashboardContext: {
            currentTime: '12:00 PM',
            currentDate: 'January 15, 2025',
            timeOfDay: 'afternoon',
            dayOfWeek: 'Wednesday',
            location: { hasGPS: true, city: 'San Francisco' },
            weather: { hasData: true, temperature: 22, condition: 'sunny', unit: 'celsius' as const },
            user: { isAuthenticated: true, name: 'Test User' },
            device: { hasData: true, device: 'Desktop' },
            activity: { activeComponents: ['weather', 'notes'], recentActions: ['check_weather'], timeSpentInSession: 0, lastInteraction: Date.now() },
            environment: { isOnline: true, deviceType: 'desktop', prefersDarkMode: false, language: 'en' },
            apps: { 
              apps: new Map([
                ['notes', { appName: 'notes', displayName: 'Notes', isActive: true, lastUsed: Date.now(), data: { count: 5 }, summary: '', confidence: 0.8, tags: [], capabilities: [] }],
                ['weather', { appName: 'weather', displayName: 'Weather', isActive: true, lastUsed: Date.now(), data: { temperature: 22 }, summary: '', confidence: 0.9, tags: [], capabilities: [] }],
              ]),
              activeApps: ['notes', 'weather'],
              lastUpdated: Date.now(),
            },
          },
          contextualSuggestions: [
            { id: '1', type: 'action', priority: 'medium', content: 'Check the weather', reasoning: 'Weather data available', triggers: ['weather', 'temperature'] },
            { id: '2', type: 'action', priority: 'medium', content: 'Review notes', reasoning: 'Notes app active', triggers: ['notes', 'write'] },
          ],
          messages: messages,
        }),
        { wrapper },
      );

      const systemPrompt = await result.current.createSystemPrompt();
      
      expect(systemPrompt).toContain('Custom instructions');
      expect(systemPrompt).toContain('Recent conversation context');
      expect(systemPrompt).toContain('San Francisco');
      expect(systemPrompt).toContain('22');
      expect(systemPrompt).toContain('Test User');
      expect(systemPrompt).toContain('afternoon');
    });
  });

  describe('Message Handling Integration', () => {
    it('integrates all components for complete message flow', async () => {
      const mockAddMessage = jest.fn();
      const mockSetInput = jest.fn();
      const mockSetError = jest.fn();
      const mockSetTyping = jest.fn();
      const mockCreateSystemPrompt = jest.fn().mockResolvedValue('System prompt with context');

      const messages: ChatMessage[] = [];

      const { result } = renderHook(
        () => useMessageHandling({
          selectedModel: 'gpt-4.1-mini',
          messages,
          createSystemPrompt: mockCreateSystemPrompt,
          addMessage: mockAddMessage,
          setInput: mockSetInput,
          setError: mockSetError,
          setTyping: mockSetTyping,
          isTyping: false,
          input: 'Hello Virgil!',
        }),
        { wrapper },
      );

      // Test message submission
      await act(async () => {
        await result.current.handleSubmit(new Event('submit') as any);
      });

      expect(mockCreateSystemPrompt).toHaveBeenCalled();
      expect(mockAddMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        role: 'user',
        content: 'Hello Virgil!',
        timestamp: expect.any(String),
      });
      expect(mockSetTyping).toHaveBeenCalledWith(true);
      expect(mockSetInput).toHaveBeenCalledWith('');
    });
  });
});