import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage, ModelOption } from '../types/chat.types';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useChatApi } from '../hooks/useChatApi';
import { useContextSync } from '../hooks/useContextSync';
import { memoryService } from '../services/MemoryService';
import { dashboardContextService } from '../services/DashboardContextService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { chatService } from '../services/ChatService';
import {
  ChatHeader,
  ChatMessages,
  ChatInput,
  MemoryModal,
  ChatProvider,
  useChatContext,
} from './chat';
import './VirgilChatbot.css';

// Available models - defined at module level for reuse
const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast and efficient' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Most capable model' },
  { id: 'o4-mini', name: 'o4 Mini', description: 'Optimized reasoning' },
];

// Inner component that uses the context
function VirgilChatbotInner() {
  const { state, dispatch, setOpen, setWindowSize, addMessage, setInput, setTyping, setError, clearMessages, newChat } = useChatContext();
  
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use custom hooks for cleaner code
  useContextSync();

  // Focus management for chatbot modal
  const { containerRef: chatContainerRef } = useFocusManagement(state.isOpen, {
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true,
    initialFocusSelector: 'input[type="text"]',
  });

  // Keyboard navigation for quick actions and model dropdown
  const { containerRef: keyboardNavRef } = useKeyboardNavigation({
    enabled: state.isOpen,
    onEscape: () => setOpen(false),
    onEnter: (element) => {
      if (element.classList.contains('quick-btn')) {
        element.click();
      } else if (element.classList.contains('model-option')) {
        element.click();
      }
    },
  });


  // Initialize memory service and load memory data
  useEffect(() => {
    const initMemory = async () => {
      try {
        await memoryService.init();
        
        // Load all memory data
        const [lastConv, memories, conversations, context] = await Promise.all([
          memoryService.getLastConversation(),
          memoryService.getMarkedMemories(),
          memoryService.getRecentConversations(10),
          memoryService.getContextForPrompt(),
        ]);
        
        dispatch({
          type: 'SET_MEMORY_DATA',
          payload: {
            lastConversation: lastConv,
            markedMemories: memories,
            recentConversations: conversations,
            memoryContext: context,
            showMemoryIndicator: true, // Always show memory button
          },
        });
      } catch (error) {
        console.error('Failed to initialize memory service:', error);
      }
    };
    
    initMemory();
  }, [dispatch]);

  // Initialize dashboard context service
  useEffect(() => {
    const unsubscribe = dashboardContextService.subscribe((context) => {
      const suggestions = dashboardContextService.generateSuggestions();
      dispatch({
        type: 'SET_DASHBOARD_CONTEXT',
        payload: { context, suggestions },
      });
    });

    // Get initial context
    const initialContext = dashboardContextService.getContext();
    const initialSuggestions = dashboardContextService.generateSuggestions();
    dispatch({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: { context: initialContext, suggestions: initialSuggestions },
    });

    return unsubscribe;
  }, [dispatch]);

  // Custom hooks handle context syncing

  // Removed auto-save on close to prevent duplicates
  // Conversations are saved when starting a new chat

  // Removed localStorage for active conversation - now using continuous conversation in IndexedDB

  // Load recent messages from continuous conversation on mount
  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        // Load last 20 messages from continuous conversation for UI
        const recentMessages = await memoryService.getRecentMessages(20);
        if (recentMessages.length > 0) {
          dispatch({ type: 'SET_MESSAGES', payload: recentMessages });
        }
      } catch (error) {
        console.error('Failed to load recent messages:', error);
      }
    };

    if (state.messages.length === 0) {
      loadRecentMessages();
    }
  }, []); // Only on mount

  // Memoized time of day calculation
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []); // Empty deps since we want this to be stable during the session

  // Memoized location context from dashboard
  const locationContext = useMemo(() => {
    const ctx = dashboardContextService.getContext();
    if (ctx.location.city) {
      return `${ctx.location.city}${ctx.location.country ? `, ${ctx.location.country}` : ''}`;
    }
    return null;
  }, [state.dashboardContext]); // Re-compute when dashboard context changes

  // Memoized static parts of system prompt
  const staticPromptParts = useMemo(() => {
    const staticUserContext = user ? 
      `User: ${user.user_metadata?.name || 'User'}${locationContext ? ` • Location: ${locationContext}` : ''} • Time: ${timeOfDay}` :
      `Location: ${locationContext || 'Unknown'} • Time: ${timeOfDay}`;

    const basePrompt = state.customSystemPrompt || 'You are Virgil, a contextual AI assistant.';
    
    return { basePrompt, staticUserContext };
  }, [user, locationContext, timeOfDay, state.customSystemPrompt]);

  const createSystemPrompt = useCallback((userQuery?: string) => {
    let systemPrompt = `${staticPromptParts.basePrompt} ${staticPromptParts.staticUserContext}`;

    if (state.memoryContext) {
      systemPrompt += `\n\nMemory:${state.memoryContext}`;
    }

    if (userQuery && state.dashboardContext) {
      const enhancedPrompt = DynamicContextBuilder.buildEnhancedPrompt(
        systemPrompt,
        userQuery,
        state.dashboardContext,
        state.contextualSuggestions,
      );
      systemPrompt = enhancedPrompt.enhancedPrompt;
      dashboardContextService.logActivity(`Asked: "${userQuery.slice(0, 50)}..."`, 'virgil-chat');
    }

    const responseRules = '\n\nBe conversational, concise, and use available context naturally.';
    
    return systemPrompt + responseRules;
  }, [staticPromptParts, state.memoryContext, state.dashboardContext, state.contextualSuggestions]);

  // Event handlers
  // Use localStorage hook for selected model
  const [, setStoredModel] = useLocalStorage('virgil-selected-model', 'gpt-4.1-mini');
  
  const handleModelChange = useCallback((modelId: string) => {
    dispatch({ type: 'SET_MODEL', payload: modelId });
    setStoredModel(modelId);
  }, [dispatch, setStoredModel]);

  const handleSizeToggle = useCallback(() => {
    const sizes: ('normal' | 'large' | 'fullscreen')[] = ['normal', 'large', 'fullscreen'];
    const currentIndex = sizes.indexOf(state.windowSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setWindowSize(nextSize);
  }, [state.windowSize, setWindowSize]);

  const handleNewChat = useCallback(async () => {
    // In continuous conversation model, we don't need to save before clearing
    // Messages are saved in real-time as they're added
    newChat();
  }, [newChat]);

  // Use localStorage hook for system prompt
  const [, setStoredSystemPrompt] = useLocalStorage('virgil-custom-system-prompt', '');
  
  const handleSystemPromptSave = useCallback(() => {
    setStoredSystemPrompt(state.customSystemPrompt);
  }, [state.customSystemPrompt, setStoredSystemPrompt]);

  const handleExportMessages = useCallback(() => {
    const chatData = {
      exportedAt: new Date().toISOString(),
      user: user?.user_metadata?.name || 'Unknown',
      messages: state.messages,
      totalMessages: state.messages.length,
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virgil-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [user, state.messages]);

  // Removed - no longer needed with ChatService

  // Use chat API hook with enhanced loading states
  const { sendMessage: sendChatMessage, loadingState } = useChatApi({
    onSuccess: async (message) => {
      addMessage(message);
      
      // Save assistant message to continuous conversation
      try {
        await memoryService.saveConversation([message]);
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
      
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (error) => {
      setError(error);
    },
    onTypingChange: setTyping,
  });

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage = chatService.createUserMessage(messageText);
    addMessage(userMessage);
    setInput('');
    setError(null);
    
    // Save user message to continuous conversation
    try {
      await memoryService.saveConversation([userMessage]);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }
    
    setTimeout(() => inputRef.current?.focus(), 0);

    const systemPrompt = createSystemPrompt(messageText);
    await sendChatMessage(messageText, systemPrompt, state.messages, state.selectedModel);
  }, [state.selectedModel, state.messages, createSystemPrompt, addMessage, setInput, setError, sendChatMessage]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.input.trim() && !state.isTyping) {
      sendMessage(state.input);
    }
  }, [state.input, state.isTyping, sendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !state.isTyping && state.input.trim()) {
      e.preventDefault();
      sendMessage(state.input);
    }
  }, [state.input, state.isTyping, sendMessage]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  const markAsImportant = useCallback(async (message: ChatMessage) => {
    try {
      let context = `From conversation on ${new Date().toLocaleDateString()}`;
      if (state.dashboardContext) {
        context = DynamicContextBuilder.createContextSummary(state.dashboardContext);
      }
      await memoryService.markAsImportant(message.id, message.content, context);
      
      const memories = await memoryService.getMarkedMemories();
      const newContext = await memoryService.getContextForPrompt();
      
      dispatch({
        type: 'SET_MEMORY_DATA',
        payload: {
          markedMemories: memories,
          memoryContext: newContext,
          showMemoryIndicator: true,
        },
      });
    } catch (error) {
      console.error('Failed to mark message as important:', error);
      setError('Unable to save memory. Please try again.');
    }
  }, [state.dashboardContext, dispatch, setError]);

  const handleMinimize = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, [setError]);

  const handleMemoryModalOpen = useCallback(() => {
    dispatch({ type: 'SET_MEMORY_MODAL', payload: true });
  }, [dispatch]);

  const handleMemoryModalClose = useCallback(() => {
    dispatch({ type: 'SET_MEMORY_MODAL', payload: false });
  }, [dispatch]);

  const handleSystemPromptChange = useCallback((prompt: string) => {
    dispatch({ type: 'SET_SYSTEM_PROMPT', payload: prompt });
  }, [dispatch]);

  if (!state.isOpen) {
    return (
      <button
        className="virgil-chatbot-bubble"
        onClick={() => setOpen(true)}
        title="Chat with Virgil AI Assistant"
        aria-label="Open chat with Virgil AI Assistant"
        aria-expanded="false"
        role="button"
      >
        <div className="chat-icon" aria-hidden="true">
          <div className="chat-line" />
          <div className="chat-line" />
        </div>
        <div className="pulse-ring" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div 
      ref={(el) => {
        if (chatContainerRef) chatContainerRef.current = el;
        if (keyboardNavRef) keyboardNavRef.current = el;
      }}
      className={`virgil-chatbot-container ${state.windowSize}`}
      role="dialog"
      aria-label="Virgil AI Assistant"
      aria-modal="true"
    >
      <ChatHeader
        windowSize={state.windowSize}
        onSizeToggle={handleSizeToggle}
        onMinimize={handleMinimize}
        selectedModel={state.selectedModel}
        onModelChange={handleModelChange}
        models={AVAILABLE_MODELS}
        showMemoryIndicator={state.showMemoryIndicator}
        markedMemories={state.markedMemories}
        recentConversations={state.recentConversations}
        onMemoryModalOpen={handleMemoryModalOpen}
        dashboardContext={state.dashboardContext}
        customSystemPrompt={state.customSystemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        onSystemPromptSave={handleSystemPromptSave}
        onNewChat={handleNewChat}
        messageCount={state.messages.length}
        onClearMessages={clearMessages}
        onExportMessages={handleExportMessages}
        createSystemPrompt={createSystemPrompt}
      />

      <ChatMessages
        messages={state.messages}
        isTyping={state.isTyping}
        error={state.error}
        onErrorDismiss={handleErrorDismiss}
        onMarkAsImportant={markAsImportant}
        user={user}
        lastConversation={state.lastConversation}
        loadingState={loadingState}
      />

      <ChatInput
        input={state.input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        isTyping={state.isTyping}
        error={state.error}
        onQuickAction={handleQuickAction}
        showQuickActions={state.messages.length === 0}
        dashboardContext={state.dashboardContext}
        shouldFocus={state.isOpen}
      />

      <MemoryModal
        isOpen={state.showMemoryModal}
        onClose={handleMemoryModalClose}
        markedMemories={state.markedMemories}
        recentConversations={state.recentConversations}
        onMemoriesUpdate={(memories) => dispatch({ type: 'SET_MEMORY_DATA', payload: { markedMemories: memories } })}
        onConversationsUpdate={(conversations) => dispatch({ type: 'SET_MEMORY_DATA', payload: { recentConversations: conversations } })}
        onMemoryContextUpdate={(context) => dispatch({ type: 'SET_MEMORY_DATA', payload: { memoryContext: context } })}
        onMemoryIndicatorUpdate={(show) => dispatch({ type: 'SET_MEMORY_DATA', payload: { showMemoryIndicator: show } })}
      />
    </div>
  );
}

// Wrapper component that provides the context - wrapped with memo for performance
const VirgilChatbot = memo(function VirgilChatbot() {
  return (
    <ChatProvider>
      <VirgilChatbotInner />
    </ChatProvider>
  );
});

export { VirgilChatbot };
export default VirgilChatbot;