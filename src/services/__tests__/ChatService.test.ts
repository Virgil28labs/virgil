/**
 * ChatService Comprehensive Test Suite
 * 
 * Tests chat API communication, message processing, multi-intent handling,
 * app routing logic, and error handling. Critical chat service.
 */

import { ChatService, chatService } from '../ChatService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';
import type { ChatMessage } from '../../types/chat.types';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../TimeService', () => ({
  timeService: {
    toISOString: jest.fn((date) => date instanceof Date ? date.toISOString() : String(date)),
  },
}));

jest.mock('../DashboardContextService', () => ({
  dashboardContextService: {
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00Z')),
    getTimestamp: jest.fn(() => 1705752000000),
  },
}));

jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    getAppsWithConfidence: jest.fn(),
  },
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.3,
  },
}));

jest.mock('../../lib/requestDeduplication', () => ({
  dedupeFetch: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { logger } from '../../lib/logger';
import { dashboardAppService, CONFIDENCE_THRESHOLDS } from '../DashboardAppService';
import { dedupeFetch } from '../../lib/requestDeduplication';

describe('ChatService', () => {
  let service: ChatService;
  let timeContext: ReturnType<typeof setupTimeTest>;

  const mockApiResponse = {
    success: true,
    message: {
      content: 'Test response',
      confidence: 0.9,
    },
  };

  const mockAppAdapter = {
    appName: 'test-app',
    displayName: 'Test App',
    getResponse: jest.fn(),
    getContextData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up time context
    timeContext = setupTimeTest('2024-01-20T12:00:00');
    
    // Create new service instance
    service = new ChatService('http://test-api.example.com');
    
    // Mock successful API response by default
    (dedupeFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockApiResponse),
    });
    
    // Mock app service
    (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    timeContext.cleanup();
  });

  describe('Constructor and Configuration', () => {
    it('uses provided API URL', () => {
      const customService = new ChatService('http://custom-api.com');
      expect(customService).toBeDefined();
    });

    it('uses environment variable when no URL provided', () => {
      const originalEnv = import.meta.env.VITE_LLM_API_URL;
      import.meta.env.VITE_LLM_API_URL = 'http://env-api.com';
      
      const envService = new ChatService();
      expect(envService).toBeDefined();
      
      import.meta.env.VITE_LLM_API_URL = originalEnv;
    });

    it('uses default URL when environment variable not set', () => {
      const originalEnv = import.meta.env.VITE_LLM_API_URL;
      delete import.meta.env.VITE_LLM_API_URL;
      
      const defaultService = new ChatService();
      expect(defaultService).toBeDefined();
      
      import.meta.env.VITE_LLM_API_URL = originalEnv;
    });
  });

  describe('Basic Message Sending', () => {
    it('sends message successfully', async () => {
      const userMessage = 'Hello there';
      const systemPrompt = 'You are a helpful assistant';
      const previousMessages: ChatMessage[] = [];
      const model = 'gpt-3.5-turbo';

      const result = await service.sendMessage(userMessage, systemPrompt, previousMessages, model);

      expect(result).toEqual({
        id: '1705752000000-assistant',
        role: 'assistant',
        content: 'Test response',
        timestamp: expect.any(String),
        confidence: 0.9,
      });

      expect(dedupeFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        }),
      );
    });

    it('includes previous messages in API request', async () => {
      const previousMessages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Previous user message',
          timestamp: '2024-01-20T11:00:00Z',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Previous assistant message',
          timestamp: '2024-01-20T11:01:00Z',
        },
      ];

      await service.sendMessage('New message', 'System prompt', previousMessages, 'gpt-3.5-turbo');

      const requestBody = JSON.parse((dedupeFetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody.messages).toHaveLength(4); // system + 2 previous + new user message
      expect(requestBody.messages[1]).toEqual({
        role: 'user',
        content: 'Previous user message',
      });
      expect(requestBody.messages[2]).toEqual({
        role: 'assistant',
        content: 'Previous assistant message',
      });
    });

    it('rejects empty messages', async () => {
      await expect(
        service.sendMessage('', 'System prompt', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Message cannot be empty');

      await expect(
        service.sendMessage('   ', 'System prompt', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Message cannot be empty');
    });
  });

  describe('App Routing Logic', () => {
    it('routes to high-confidence app directly', async () => {
      const mockResponse = 'Direct app response';
      mockAppAdapter.getResponse.mockResolvedValue(mockResponse);

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);

      const result = await service.sendMessage(
        'Test message',
        'System prompt',
        [],
        'gpt-3.5-turbo',
      );

      expect(result.content).toBe(mockResponse);
      expect(result.confidence).toBe(0.9);
      expect(mockAppAdapter.getResponse).toHaveBeenCalledWith('Test message');
      expect(dedupeFetch).not.toHaveBeenCalled(); // Should not call API
    });

    it('enhances context for medium-confidence apps', async () => {
      const contextData = {
        displayName: 'Test App',
        summary: 'A test application',
        data: { key: 'value' },
      };
      
      mockAppAdapter.getContextData.mockReturnValue(contextData);

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.6 },
      ]);

      await service.sendMessage('Test message', 'Original prompt', [], 'gpt-3.5-turbo');

      const requestBody = JSON.parse((dedupeFetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody.messages[0].content).toContain('Test App - A test application');
      expect(requestBody.messages[0].content).toContain('Original prompt');
    });

    it('ignores low-confidence apps', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.3 },
      ]);

      await service.sendMessage('Test message', 'System prompt', [], 'gpt-3.5-turbo');

      expect(mockAppAdapter.getResponse).not.toHaveBeenCalled();
      expect(dedupeFetch).toHaveBeenCalled(); // Should fallback to API
    });

    it('handles app service errors gracefully', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockRejectedValue(
        new Error('App service error'),
      );

      const result = await service.sendMessage(
        'Test message',
        'System prompt',
        [],
        'gpt-3.5-turbo',
      );

      expect(result.content).toBe('Test response');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get app confidence scores, continuing without app routing',
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
        }),
      );
    });

    it('handles app adapter errors gracefully', async () => {
      mockAppAdapter.getResponse.mockRejectedValue(new Error('Adapter error'));

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);

      const result = await service.sendMessage(
        'Test message',
        'System prompt',
        [],
        'gpt-3.5-turbo',
      );

      expect(result.content).toBe('Test response'); // Should fallback to API
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting response from test-app'),
        expect.any(Error),
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
        }),
      );
    });
  });

  describe('Multi-Intent Handling', () => {
    it('detects multi-intent queries', async () => {
      const app1 = { ...mockAppAdapter, appName: 'app1', displayName: 'App 1' };
      const app2 = { ...mockAppAdapter, appName: 'app2', displayName: 'App 2' };
      
      app1.getResponse = jest.fn().mockResolvedValue('Response from App 1');
      app2.getResponse = jest.fn().mockResolvedValue('Response from App 2');

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: app1, confidence: 0.7 },
        { adapter: app2, confidence: 0.6 },
      ]);

      const result = await service.sendMessage(
        'Show me notes and also check weather',
        'System prompt',
        [],
        'gpt-3.5-turbo',
      );

      expect(result.content).toContain('**App 1**: Response from App 1');
      expect(result.content).toContain('**App 2**: Response from App 2');
      expect(dedupeFetch).not.toHaveBeenCalled(); // Should not call API
    });

    it('handles multi-intent with single response', async () => {
      const app1 = { ...mockAppAdapter, appName: 'app1' };
      const app2 = { ...mockAppAdapter, appName: 'app2' };
      
      app1.getResponse = jest.fn().mockResolvedValue('Single response');
      app2.getResponse = jest.fn().mockResolvedValue(null);

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: app1, confidence: 0.7 },
        { adapter: app2, confidence: 0.6 },
      ]);

      const result = await service.sendMessage(
        'Show me notes and weather',
        'System prompt',
        [],
        'gpt-3.5-turbo',
      );

      expect(result.content).toBe('Single response');
      expect(result.content).not.toContain('**');
    });

    it('does not detect multi-intent in simple queries', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);

      await service.sendMessage('Simple message', 'System prompt', [], 'gpt-3.5-turbo');

      // Should not log multi-intent detection
      expect(logger.info).not.toHaveBeenCalledWith(
        'Multi-intent query detected',
        expect.any(Object),
      );
    });
  });

  describe('API Error Handling', () => {
    it('handles HTTP errors', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Internal server error');
    });

    it('handles HTTP errors without error message', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Chat service error: 503');
    });

    it('handles malformed JSON responses', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Chat service error: 400');
    });

    it('handles network errors', async () => {
      (dedupeFetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Network error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send chat message',
        expect.any(Error),
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
        }),
      );
    });

    it('handles invalid API responses', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      });

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Invalid response from chat service');
    });

    it('handles missing message in response', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(
        service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo'),
      ).rejects.toThrow('Invalid response from chat service');
    });
  });

  describe('Message Creation Methods', () => {
    it('creates user messages correctly', () => {
      const message = service.createUserMessage('Test user message');

      expect(message).toEqual({
        id: '1705752000000-user',
        role: 'user',
        content: 'Test user message',
        timestamp: expect.any(String),
      });
    });

    it('creates fallback messages correctly', () => {
      const message = service.createFallbackMessage();

      expect(message).toEqual({
        id: '1705752000000-fallback',
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: expect.any(String),
      });
    });

    it('creates assistant messages with confidence', () => {
      const message = (service as any).createAssistantMessage('Test content', 0.85);

      expect(message).toEqual({
        id: '1705752000000-assistant',
        role: 'assistant',
        content: 'Test content',
        timestamp: expect.any(String),
        confidence: 0.85,
      });
    });

    it('creates assistant messages without confidence', () => {
      const message = (service as any).createAssistantMessage('Test content');

      expect(message).toEqual({
        id: '1705752000000-assistant',
        role: 'assistant',
        content: 'Test content',
        timestamp: expect.any(String),
        confidence: undefined,
      });
    });
  });

  describe('Connection Validation', () => {
    it('validates successful connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const isValid = await service.validateConnection();

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.example.com/health',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('validates failed connection', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const isValid = await service.validateConnection();

      expect(isValid).toBe(false);
    });

    it('handles connection timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Timeout'));

      const isValid = await service.validateConnection();

      expect(isValid).toBe(false);
    });
  });

  describe('Logging and Monitoring', () => {
    it('logs successful routing decisions', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);
      
      mockAppAdapter.getResponse.mockResolvedValue('App response');

      await service.sendMessage('Test message', 'System', [], 'gpt-3.5-turbo');

      expect(logger.info).toHaveBeenCalledWith(
        'Chat routing decision',
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
          metadata: expect.objectContaining({
            userMessage: 'Test message',
            bestMatchApp: 'test-app',
            confidence: 0.9,
            routingDecision: 'DIRECT_RESPONSE',
          }),
        }),
      );
    });

    it('logs medium confidence routing', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.6 },
      ]);
      
      mockAppAdapter.getContextData.mockReturnValue({
        displayName: 'Test App',
        summary: 'Test summary',
      });

      await service.sendMessage('Test message', 'System', [], 'gpt-3.5-turbo');

      expect(logger.info).toHaveBeenCalledWith(
        'Chat routing decision',
        expect.objectContaining({
          metadata: expect.objectContaining({
            routingDecision: 'ENHANCED_CONTEXT',
          }),
        }),
      );
    });

    it('logs direct adapter response usage', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);
      
      mockAppAdapter.getResponse.mockResolvedValue('Direct response');

      await service.sendMessage('Test message', 'System', [], 'gpt-3.5-turbo');

      expect(logger.info).toHaveBeenCalledWith(
        'Direct adapter response used',
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
          metadata: expect.objectContaining({
            appName: 'test-app',
            confidence: 0.9,
            responseLength: 15,
          }),
        }),
      );
    });
  });

  describe('Singleton Instance', () => {
    it('exports singleton instance', () => {
      expect(chatService).toBeInstanceOf(ChatService);
    });

    it('singleton uses default configuration', () => {
      expect(chatService).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty app matches array', async () => {
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([]);

      const result = await service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo');

      expect(result.content).toBe('Test response');
      expect(dedupeFetch).toHaveBeenCalled();
    });

    it('handles app without getResponse method', async () => {
      const adapterWithoutResponse = {
        appName: 'no-response-app',
        displayName: 'No Response App',
      };

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: adapterWithoutResponse, confidence: 0.9 },
      ]);

      const result = await service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo');

      expect(result.content).toBe('Test response'); // Should fallback to API
      expect(dedupeFetch).toHaveBeenCalled();
    });

    it('handles app returning null response', async () => {
      mockAppAdapter.getResponse.mockResolvedValue(null);

      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);

      const result = await service.sendMessage('Test', 'System', [], 'gpt-3.5-turbo');

      expect(result.content).toBe('Test response'); // Should fallback to API
      expect(dedupeFetch).toHaveBeenCalled();
    });

    it('handles very long messages', async () => {
      const longMessage = 'A'.repeat(10000);

      // Setup mock to return app matches so routing decision logging is triggered
      (dashboardAppService.getAppsWithConfidence as jest.Mock).mockResolvedValue([
        { adapter: mockAppAdapter, confidence: 0.9 },
      ]);
      mockAppAdapter.getResponse.mockResolvedValue('Test response from app');

      const result = await service.sendMessage(longMessage, 'System', [], 'gpt-3.5-turbo');

      expect(result.content).toBe('Test response from app');
      expect(logger.info).toHaveBeenCalledWith(
        'Chat routing decision',
        expect.objectContaining({
          metadata: expect.objectContaining({
            userMessage: 'A'.repeat(50), // Should be truncated in logs
          }),
        }),
      );
    });
  });
});