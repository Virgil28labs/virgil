// @ts-ignore - Jest types handled by environment
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ChatService } from '../ChatService';
import { dashboardAppService } from '../DashboardAppService';
import { dedupeFetch } from '../../lib/requestDeduplication';

// Mock dependencies
jest.mock('../../lib/requestDeduplication');
jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    getResponseForQuery: jest.fn(),
  },
}));

describe('ChatService', () => {
  let chatService: ChatService;
  const mockApiUrl = 'http://test-api.com/v1';
  
  beforeEach(() => {
    chatService = new ChatService(mockApiUrl);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendMessage', () => {
    const validUserMessage = 'Hello, Virgil!';
    const systemPrompt = 'You are Virgil, a helpful assistant.';
    const previousMessages = [
      { id: '1', role: 'user' as const, content: 'Hi', timestamp: '2024-01-01' },
      { id: '2', role: 'assistant' as const, content: 'Hello!', timestamp: '2024-01-01' },
    ];
    const model = 'gpt-4.1-mini';

    it('should throw error for empty message', async () => {
      await expect(
        chatService.sendMessage('', systemPrompt, previousMessages, model),
      ).rejects.toThrow('Message cannot be empty');
    });

    it('should return dashboard app response when available', async () => {
      const appResponse = {
        appId: 'test-app',
        response: 'This is a dashboard app response',
      };
      
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(appResponse);

      const result = await chatService.sendMessage(
        validUserMessage,
        systemPrompt,
        previousMessages,
        model,
      );

      expect(dashboardAppService.getResponseForQuery).toHaveBeenCalledWith(validUserMessage);
      expect(result).toMatchObject({
        role: 'assistant',
        content: appResponse.response,
      });
      expect(result.id).toMatch(/^\d+-assistant$/);
      expect(result.timestamp).toBeDefined();
      expect(dedupeFetch).not.toHaveBeenCalled();
    });

    it('should call API when no dashboard app response', async () => {
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(null);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: { content: 'API response content' },
        }),
      };
      
      (dedupeFetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await chatService.sendMessage(
        validUserMessage,
        systemPrompt,
        previousMessages,
        model,
      );

      expect(dedupeFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Hi' },
              { role: 'assistant', content: 'Hello!' },
              { role: 'user', content: validUserMessage },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        },
      );

      expect(result).toMatchObject({
        role: 'assistant',
        content: 'API response content',
      });
    });

    it('should handle API error response', async () => {
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(null);
      
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: 'Internal server error',
        }),
      };
      
      (dedupeFetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        chatService.sendMessage(validUserMessage, systemPrompt, previousMessages, model),
      ).rejects.toThrow('Internal server error');
    });

    it('should handle invalid API response', async () => {
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(null);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: false,
        }),
      };
      
      (dedupeFetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        chatService.sendMessage(validUserMessage, systemPrompt, previousMessages, model),
      ).rejects.toThrow('Invalid response from chat service');
    });

    it('should handle network errors', async () => {
      (dashboardAppService.getResponseForQuery as jest.Mock).mockResolvedValue(null);
      (dedupeFetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        chatService.sendMessage(validUserMessage, systemPrompt, previousMessages, model),
      ).rejects.toThrow('Network error');
    });
  });

  describe('createUserMessage', () => {
    it('should create a valid user message', () => {
      const content = 'Test message';
      const message = chatService.createUserMessage(content);

      expect(message).toMatchObject({
        role: 'user',
        content,
      });
      expect(message.id).toMatch(/^\d+-user$/);
      expect(message.timestamp).toBeDefined();
      expect(new Date(message.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('createFallbackMessage', () => {
    it('should create a fallback error message', () => {
      const message = chatService.createFallbackMessage();

      expect(message).toMatchObject({
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
      });
      expect(message.id).toMatch(/^\d+-fallback$/);
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('validateConnection', () => {
    it('should return true for successful health check', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      }) as jest.Mock;

      const result = await chatService.validateConnection();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/health`,
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should return false for failed health check', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      }) as jest.Mock;

      const result = await chatService.validateConnection();

      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

      const result = await chatService.validateConnection();

      expect(result).toBe(false);
    });
  });
});