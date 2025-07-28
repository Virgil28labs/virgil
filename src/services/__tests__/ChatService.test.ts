import { ChatService } from '../ChatService';
import { dedupeFetch } from '../../lib/requestDeduplication';
import { dashboardAppService } from '../DashboardAppService';
import { dashboardContextService } from '../DashboardContextService';
import { logger } from '../../lib/logger';
import type { ChatMessage } from '../../types/chat.types';

// Mock TimeService first before any imports
jest.mock('../TimeService', () => ({
  timeService: {
    toISOString: jest.fn(() => '2024-01-15T12:00:00.000Z'),
    getTimestamp: jest.fn(() => 1705320000000),
    getCurrentTime: jest.fn(() => '12:00'),
    getCurrentDate: jest.fn(() => 'January 15, 2024'),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-15T12:00:00.000Z')),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'Monday'),
    getMonth: jest.fn(() => 0), // January
    getYear: jest.fn(() => 2024),
  },
}));

// Mock dependencies
jest.mock('../../lib/requestDeduplication');
jest.mock('../DashboardAppService');
jest.mock('../DashboardContextService');
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock dashboardContextService methods
const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
mockDashboardContextService.getCurrentDateTime = jest.fn(() => new Date('2024-01-15T12:00:00.000Z'));
mockDashboardContextService.getTimestamp = jest.fn(() => 1705320000000);

// Mock dashboardAppService
const mockDashboardAppService = dashboardAppService as jest.Mocked<typeof dashboardAppService>;
mockDashboardAppService.getResponseForQuery = jest.fn().mockResolvedValue(null);
// Add notifyContextChange if it doesn't exist on the type
(mockDashboardAppService as unknown as { notifyContextChange: jest.Mock }).notifyContextChange = jest.fn();

describe('ChatService', () => {
  let chatService: ChatService;
  const mockApiUrl = 'http://test-api.com/api/v1';

  beforeEach(() => {
    jest.clearAllMocks();
    chatService = new ChatService(mockApiUrl);
    // Reset dashboard app service to return null by default
    mockDashboardAppService.getResponseForQuery.mockResolvedValue(null);
    // Reset timestamp counter to ensure unique IDs
    let timestampCounter = 1705320000000;
    mockDashboardContextService.getTimestamp.mockImplementation(() => timestampCounter++);
    // Reset dedupeFetch to return success by default
    (dedupeFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        message: {
          content: 'I am doing well, thank you!',
        },
      }),
    });
  });

  describe('constructor', () => {
    test('uses provided API URL', () => {
      const customUrl = 'http://custom-api.com';
      const service = new ChatService(customUrl);
      expect(service['apiUrl']).toBe(customUrl);
    });

    test('falls back to environment variable', () => {
      const envUrl = 'http://env-api.com';
      const originalEnv = import.meta.env.VITE_LLM_API_URL;
      (import.meta.env as Record<string, string>).VITE_LLM_API_URL = envUrl;
      const service = new ChatService();
      expect(service['apiUrl']).toBe(envUrl);
      (import.meta.env as Record<string, string>).VITE_LLM_API_URL = originalEnv;
    });

    test('falls back to default URL', () => {
      const originalEnv = import.meta.env.VITE_LLM_API_URL;
      delete (import.meta.env as Record<string, string>).VITE_LLM_API_URL;
      const service = new ChatService();
      expect(service['apiUrl']).toBe('http://localhost:5002/api/v1');
      if (originalEnv !== undefined) {
        (import.meta.env as Record<string, string>).VITE_LLM_API_URL = originalEnv;
      }
    });
  });

  describe('sendMessage', () => {
    const mockUserMessage = 'Hello, how are you?';
    const mockSystemPrompt = 'You are a helpful assistant.';
    const mockPreviousMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Previous message',
        timestamp: '2024-01-15T11:00:00.000Z',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Previous response',
        timestamp: '2024-01-15T11:01:00.000Z',
      },
    ];
    const mockModel = 'gpt-4.1-mini';

    test('sends correct request to API', async () => {
      await chatService.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel,
      );

      expect(dedupeFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/chat`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: mockModel,
            messages: [
              { role: 'system', content: mockSystemPrompt },
              { role: 'user', content: 'Previous message' },
              { role: 'assistant', content: 'Previous response' },
              { role: 'user', content: mockUserMessage },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        }),
      );
    });

    test('returns formatted assistant message on success', async () => {
      const result = await chatService.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel,
      );

      expect(result).toEqual({
        id: expect.any(String),
        role: 'assistant',
        content: 'I am doing well, thank you!',
        timestamp: '2024-01-15T12:00:00.000Z',
      });
    });

    test('generates unique message IDs', async () => {
      const result1 = await chatService.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        [],
        mockModel,
      );

      const result2 = await chatService.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        [],
        mockModel,
      );

      expect(result1.id).not.toBe(result2.id);
    });

    test('handles empty previous messages', async () => {
      await chatService.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        [],
        mockModel,
      );

      expect(dedupeFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            model: mockModel,
            messages: [
              { role: 'system', content: mockSystemPrompt },
              { role: 'user', content: mockUserMessage },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        }),
      );
    });

    test('handles dashboard app service response', async () => {
      const appResponse = {
        response: 'This is a direct app response',
        appId: 'test-app',
      };
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(appResponse);

      const result = await chatService.sendMessage(
        'What is the weather?',
        mockSystemPrompt,
        [],
        mockModel,
      );

      expect(result).toEqual({
        id: expect.any(String),
        role: 'assistant',
        content: 'This is a direct app response',
        timestamp: '2024-01-15T12:00:00.000Z',
      });

      // Should not make API call when app responds
      expect(dedupeFetch).not.toHaveBeenCalled();
    });

    test('throws error when API returns non-ok response', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'Server error details' }),
      });

      await expect(
        chatService.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel,
        ),
      ).rejects.toThrow('Server error details');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send chat message',
        expect.any(Error),
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
          metadata: expect.objectContaining({
            model: mockModel,
            messageLength: mockUserMessage.length,
          }),
        }),
      );
    });

    test('throws error when API returns error in response', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Model not available',
        }),
      });

      await expect(
        chatService.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel,
        ),
      ).rejects.toThrow('Invalid response from chat service');
    });

    test('throws error when API response is missing message', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          // Missing message field
        }),
      });

      await expect(
        chatService.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel,
        ),
      ).rejects.toThrow('Invalid response from chat service');
    });

    test('handles network errors', async () => {
      const networkError = new Error('Network error');
      (dedupeFetch as jest.Mock).mockRejectedValue(networkError);

      await expect(
        chatService.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel,
        ),
      ).rejects.toThrow('Network error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send chat message',
        networkError,
        expect.objectContaining({
          component: 'ChatService',
          action: 'sendMessage',
          metadata: expect.objectContaining({
            model: mockModel,
            messageLength: mockUserMessage.length,
          }),
        }),
      );
    });

    test('handles JSON parsing errors', async () => {
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      await expect(
        chatService.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel,
        ),
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('createUserMessage', () => {
    test('creates user message with correct format', () => {
      const content = 'This is a user message';
      const result = chatService.createUserMessage(content);

      expect(result).toEqual({
        id: expect.stringContaining('-user'),
        role: 'user',
        content: content,
        timestamp: '2024-01-15T12:00:00.000Z',
      });
    });
  });

  describe('createFallbackMessage', () => {
    test('creates fallback message', () => {
      const result = chatService.createFallbackMessage();

      expect(result).toEqual({
        id: expect.stringContaining('-fallback'),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: '2024-01-15T12:00:00.000Z',
      });
    });
  });

  describe('validateConnection', () => {
    test('returns true when API is healthy', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      const result = await chatService.validateConnection();
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/health`,
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    test('returns false when API is down', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      });

      const result = await chatService.validateConnection();
      expect(result).toBe(false);
    });

    test('returns false on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await chatService.validateConnection();
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles very long messages', async () => {
      const longMessage = 'a'.repeat(10000);

      const result = await chatService.sendMessage(
        longMessage,
        'System prompt',
        [],
        'gpt-4.1-mini',
      );

      expect(result.content).toBe('I am doing well, thank you!');
      expect(dedupeFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(longMessage),
        }),
      );
    });

    test('handles special characters in messages', async () => {
      const specialMessage = 'Test with "quotes", \'apostrophes\', and \nnewlines\t\ttabs';
      
      await chatService.sendMessage(
        specialMessage,
        'System prompt',
        [],
        'gpt-4.1-mini',
      );

      const bodyArg = JSON.parse((dedupeFetch as jest.Mock).mock.calls[0][1].body);
      expect(bodyArg.messages[1].content).toBe(specialMessage);
    });

    test('handles concurrent requests', async () => {
      const indices = [0, 1, 2, 3, 4];
      const promises = indices.map((index) => 
        chatService.sendMessage(
          `Message ${index}`,
          'System prompt',
          [],
          'gpt-4.1-mini',
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(dedupeFetch).toHaveBeenCalledTimes(5);
      results.forEach((result) => {
        expect(result.content).toBe('I am doing well, thank you!');
        // Each should have a unique ID due to incrementing timestamp
        expect(result.id).toMatch(/^\d+-assistant$/);
      });
      
      // Verify all IDs are unique
      const ids = results.map(r => r.id);
      expect(new Set(ids).size).toBe(5);
    });

    test('throws error for empty message', async () => {
      await expect(
        chatService.sendMessage(
          '',
          'System prompt',
          [],
          'gpt-4.1-mini',
        ),
      ).rejects.toThrow('Message cannot be empty');

      await expect(
        chatService.sendMessage(
          '   ',
          'System prompt',
          [],
          'gpt-4.1-mini',
        ),
      ).rejects.toThrow('Message cannot be empty');
    });
  });
});