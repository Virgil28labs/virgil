import { renderHook, act } from '@testing-library/react';
import { useRealtimeSync } from '../useRealtimeSync';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useRealtimeSync - Multi-Device Synchronization', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  let mockChannel: jest.Mocked<RealtimeChannel>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue('ok'),
    } as any;
    
    mockSupabase.channel = jest.fn().mockReturnValue(mockChannel);
    mockSupabase.removeChannel = jest.fn();
  });

  it('should not create subscriptions when disabled', () => {
    renderHook(() => useRealtimeSync({
      enabled: false,
      userId: 'test-user',
      onNewMessage: jest.fn(),
    }));
    
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('should not create subscriptions without userId', () => {
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId: null,
      onNewMessage: jest.fn(),
    }));
    
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('should create channel with user-specific name', () => {
    const userId = 'user-123';
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onNewMessage: jest.fn(),
    }));
    
    expect(mockSupabase.channel).toHaveBeenCalledWith(`virgil-sync-${userId}`);
  });

  it('should subscribe to messages table with user filter', () => {
    const userId = 'user-123';
    const onNewMessage = jest.fn();
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onNewMessage,
    }));
    
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `user_id=eq.${userId}`,
      },
      expect.any(Function),
    );
  });

  it('should subscribe to conversations table with user filter', () => {
    const userId = 'user-123';
    const onConversationUpdate = jest.fn();
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onConversationUpdate,
    }));
    
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user_id=eq.${userId}`,
      },
      expect.any(Function),
    );
  });

  it('should subscribe to memories table with user filter', () => {
    const userId = 'user-123';
    const onMemoryUpdate = jest.fn();
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onMemoryUpdate,
    }));
    
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'memories',
        filter: `user_id=eq.${userId}`,
      },
      expect.any(Function),
    );
  });

  it('should handle new message events from same user only', async () => {
    const userId = 'user-123';
    const onNewMessage = jest.fn();
    let messageHandler: Function;
    
    mockChannel.on.mockImplementation((_event, config, handler) => {
      if ((config as any).table === 'messages') {
        messageHandler = handler;
      }
      return mockChannel;
    });
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onNewMessage,
    }));
    
    // Simulate message from same user
    const newMessage = {
      id: 'msg-1',
      user_id: userId,
      conversation_id: 'conv-1',
      role: 'user',
      content: 'Test message',
      timestamp: new Date().toISOString(),
    };
    
    await act(async () => {
      messageHandler!({
        eventType: 'INSERT',
        new: newMessage,
      });
    });
    
    expect(onNewMessage).toHaveBeenCalledWith(expect.objectContaining({
      id: 'msg-1',
      content: 'Test message',
      role: 'user',
    }));
  });

  it('should handle connection state changes', async () => {
    const onConnectionChange = jest.fn();
    let subscribeCallback: Function | undefined;
    
    mockChannel.subscribe.mockImplementation((callback) => {
      if (callback) {
        subscribeCallback = callback;
      }
      return mockChannel;
    });
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId: 'user-123',
      onConnectionChange,
    }));
    
    // Simulate successful connection
    await act(async () => {
      subscribeCallback!('SUBSCRIBED');
    });
    
    expect(onConnectionChange).toHaveBeenCalledWith(true);
    
    // Simulate disconnection
    await act(async () => {
      subscribeCallback!('CLOSED');
    });
    
    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });

  it('should handle memory deletion events', async () => {
    const userId = 'user-123';
    const onMemoryDelete = jest.fn();
    let memoryHandler: Function;
    
    mockChannel.on.mockImplementation((_event, config, handler) => {
      if ((config as any).table === 'memories') {
        memoryHandler = handler;
      }
      return mockChannel;
    });
    
    renderHook(() => useRealtimeSync({
      enabled: true,
      userId,
      onMemoryDelete,
    }));
    
    // Simulate memory deletion
    await act(async () => {
      memoryHandler!({
        eventType: 'DELETE',
        old: {
          id: 'mem-1',
          user_id: userId,
          local_id: 'local-mem-1',
        },
      });
    });
    
    expect(onMemoryDelete).toHaveBeenCalledWith('mem-1');
  });

  it('should cleanup subscriptions on unmount', async () => {
    const { unmount } = renderHook(() => useRealtimeSync({
      enabled: true,
      userId: 'user-123',
      onNewMessage: jest.fn(),
    }));
    
    expect(mockChannel.subscribe).toHaveBeenCalled();
    
    await act(async () => {
      unmount();
    });
    
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should recreate subscriptions when userId changes', async () => {
    const { rerender } = renderHook(
      ({ userId }) => useRealtimeSync({
        enabled: true,
        userId,
        onNewMessage: jest.fn(),
      }),
      { initialProps: { userId: 'user-1' } },
    );
    
    expect(mockSupabase.channel).toHaveBeenCalledWith('virgil-sync-user-1');
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    
    // Change user
    await act(async () => {
      rerender({ userId: 'user-2' });
    });
    
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    expect(mockSupabase.channel).toHaveBeenCalledWith('virgil-sync-user-2');
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
  });

  it('should handle reconnection attempts', async () => {
    jest.useFakeTimers();
    
    let subscribeCallback: Function | undefined;
    mockChannel.subscribe.mockImplementation((callback) => {
      if (callback) {
        subscribeCallback = callback;
      }
      return mockChannel;
    });
    
    const { unmount } = renderHook(() => useRealtimeSync({
      enabled: true,
      userId: 'user-123',
      onNewMessage: jest.fn(),
    }));
    
    // Simulate channel error
    await act(async () => {
      subscribeCallback!('CHANNEL_ERROR');
    });
    
    // Should attempt reconnection after delay
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // When error happens, the hook will create a new channel on reconnect
    expect(mockSupabase.channel).toHaveBeenCalledTimes(2); // Initial + retry
    
    unmount();
    jest.useRealTimers();
  });
});