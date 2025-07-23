import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatApi } from '../useChatApi';
import { chatService } from '../../services/ChatService';
import type { ChatMessage } from '../../types/chat.types';

// Mock the chat service
jest.mock('../../services/ChatService', () => ({
  chatService: {
    sendMessage: jest.fn(),
    createFallbackMessage: jest.fn(),
  },
}));

describe('useChatApi', () => {
  const mockUserMessage = 'Hello, Virgil!';
  const mockSystemPrompt = 'You are Virgil, a helpful assistant.';
  const mockPreviousMessages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'Hi', timestamp: '2024-01-01' },
  ];
  const mockModel = 'gpt-4.1-mini';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChatApi());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful message send', async () => {
    const mockResponse: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: '2024-01-01',
    };

    const onSuccess = jest.fn();
    const onTypingChange = jest.fn();

    (chatService.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => 
      useChatApi({ onSuccess, onTypingChange })
    );

    await act(async () => {
      await result.current.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(chatService.sendMessage).toHaveBeenCalledWith(
      mockUserMessage,
      mockSystemPrompt,
      mockPreviousMessages,
      mockModel
    );

    expect(onTypingChange).toHaveBeenCalledWith(true);
    expect(onTypingChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors and send fallback message', async () => {
    const mockError = new Error('API Error');
    const mockFallback: ChatMessage = {
      id: '3',
      role: 'assistant',
      content: "I'm having trouble connecting right now. Please try again in a moment!",
      timestamp: '2024-01-01',
    };

    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onTypingChange = jest.fn();

    (chatService.sendMessage as jest.Mock).mockRejectedValue(mockError);
    (chatService.createFallbackMessage as jest.Mock).mockReturnValue(mockFallback);

    const { result } = renderHook(() => 
      useChatApi({ onSuccess, onError, onTypingChange })
    );

    await act(async () => {
      await result.current.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(onError).toHaveBeenCalledWith('API Error');
    expect(result.current.error).toBe('API Error');
    expect(chatService.createFallbackMessage).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(mockFallback);
    expect(onTypingChange).toHaveBeenCalledWith(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle non-Error exceptions', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    (chatService.sendMessage as jest.Mock).mockRejectedValue('String error');
    (chatService.createFallbackMessage as jest.Mock).mockReturnValue({
      id: '4',
      role: 'assistant',
      content: 'Fallback',
      timestamp: '2024-01-01',
    });

    const { result } = renderHook(() => 
      useChatApi({ onSuccess, onError })
    );

    await act(async () => {
      await result.current.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(onError).toHaveBeenCalledWith('An error occurred');
    expect(result.current.error).toBe('An error occurred');
  });

  it('should ignore empty messages', async () => {
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useChatApi({ onSuccess }));

    await act(async () => {
      await result.current.sendMessage(
        '   ',
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(chatService.sendMessage).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should clear error', async () => {
    const mockError = new Error('API Error');
    const onError = jest.fn();

    (chatService.sendMessage as jest.Mock).mockRejectedValue(mockError);
    (chatService.createFallbackMessage as jest.Mock).mockReturnValue({
      id: '1',
      role: 'assistant',
      content: 'Fallback',
      timestamp: '2024-01-01',
    });

    const { result } = renderHook(() => useChatApi({ onError }));

    // Create an error by sending a message that fails
    await act(async () => {
      await result.current.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(result.current.error).toBe('API Error');

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should update loading state during request', async () => {
    let resolvePromise: (value: ChatMessage) => void;
    const promise = new Promise<ChatMessage>((resolve) => {
      resolvePromise = resolve;
    });

    (chatService.sendMessage as jest.Mock).mockReturnValue(promise);

    const { result } = renderHook(() => useChatApi());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.sendMessage(
        mockUserMessage,
        mockSystemPrompt,
        mockPreviousMessages,
        mockModel
      );
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({
        id: '5',
        role: 'assistant',
        content: 'Response',
        timestamp: '2024-01-01',
      });
      await promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle callbacks being undefined', async () => {
    const mockResponse: ChatMessage = {
      id: '6',
      role: 'assistant',
      content: 'Response',
      timestamp: '2024-01-01',
    };

    (chatService.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChatApi());

    // Should not throw when callbacks are undefined
    await expect(
      act(async () => {
        await result.current.sendMessage(
          mockUserMessage,
          mockSystemPrompt,
          mockPreviousMessages,
          mockModel
        );
      })
    ).resolves.not.toThrow();
  });
});