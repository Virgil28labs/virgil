import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import type { ChatMessage, ModelOption } from '../types/chat.types';
import { dedupeFetch } from '../lib/requestDeduplication';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { memoryService } from '../services/MemoryService';
import { dashboardContextService } from '../services/DashboardContextService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { dashboardAppService } from '../services/DashboardAppService';
import {
  ChatHeader,
  ChatMessages,
  ChatInput,
  MemoryModal,
  ChatProvider,
  useChatContext,
} from './chat';
import './VirgilChatbotContainer.css';

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
  const { address, ipLocation, hasGPSLocation, coordinates } = useLocation();
  const { data: weatherData, unit: weatherUnit } = useWeather();
  const inputRef = useRef<HTMLInputElement>(null);

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
            showMemoryIndicator: !!context,
          },
        });
      } catch (error) {
        // Failed to initialize memory service
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

  // Update context service with external data
  useEffect(() => {
    dashboardContextService.updateLocationContext({
      address,
      ipLocation,
      hasGPSLocation,
      coordinates,
      loading: false,
      error: null,
      permissionStatus: 'granted',
      hasLocation: !!(coordinates || ipLocation),
      hasIPLocation: !!ipLocation,
      initialized: true,
      lastUpdated: Date.now(),
      fetchLocationData: () => Promise.resolve(),
      requestLocationPermission: () => Promise.resolve(),
      clearError: () => {},
    });
  }, [address, ipLocation, hasGPSLocation, coordinates]);

  useEffect(() => {
    dashboardContextService.updateWeatherContext({
      data: weatherData,
      unit: weatherUnit,
      loading: false,
      error: null,
      fetchWeather: () => Promise.resolve(),
      toggleUnit: () => {},
      clearError: () => {},
      hasWeather: !!weatherData,
      forecast: null,
      lastUpdated: weatherData ? Date.now() : null,
    });
  }, [weatherData, weatherUnit]);

  useEffect(() => {
    dashboardContextService.updateUserContext({
      user,
      loading: false,
      signOut: () => Promise.resolve({ error: undefined }),
      refreshUser: () => Promise.resolve(),
    });
  }, [user]);

  // Save conversation when chat is closed
  useEffect(() => {
    if (!state.isOpen && state.messages.length > 0) {
      const saveConversation = async () => {
        try {
          await memoryService.saveConversation(state.messages);
        } catch (error) {
          // Failed to save conversation
        }
      };
      
      saveConversation();
    }
  }, [state.isOpen, state.messages]);

  // Persist active conversation to localStorage
  useEffect(() => {
    if (state.messages.length > 0) {
      try {
        localStorage.setItem('virgil-active-conversation', JSON.stringify(state.messages));
      } catch (error) {
        // Failed to save active conversation
      }
    } else {
      localStorage.removeItem('virgil-active-conversation');
    }
  }, [state.messages]);

  // Load persisted conversation on mount
  useEffect(() => {
    const loadPersistedConversation = async () => {
      try {
        const savedMessages = localStorage.getItem('virgil-active-conversation');
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (parsedMessages.length > 0) {
            dispatch({ type: 'SET_MESSAGES', payload: parsedMessages });
            return;
          }
        }
        
        // Fallback to memory service if no active session
        const lastConv = await memoryService.getLastConversation();
        if (lastConv && lastConv.messages && lastConv.messages.length > 0) {
          const isRecent = lastConv.timestamp && (Date.now() - lastConv.timestamp) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            dispatch({ type: 'SET_MESSAGES', payload: lastConv.messages });
          }
        }
      } catch (error) {
        // Failed to load persisted conversation
      }
    };

    if (state.messages.length === 0) {
      loadPersistedConversation();
    }
  }, []); // Only on mount

  // Memoized time of day calculation
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []); // Empty deps since we want this to be stable during the session

  // Memoized location context
  const locationContext = useMemo(() => {
    if (address?.city) {
      return `${address.city}${address.country ? `, ${address.country}` : ''}`;
    }
    if (ipLocation?.city) {
      return `${ipLocation.city}${ipLocation.country ? `, ${ipLocation.country}` : ''}`;
    }
    return null;
  }, [address?.city, address?.country, ipLocation?.city, ipLocation?.country]);

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
        state.contextualSuggestions
      );
      systemPrompt = enhancedPrompt.enhancedPrompt;
      dashboardContextService.logActivity(`Asked: "${userQuery.slice(0, 50)}..."`, 'virgil-chat');
    }

    const responseRules = `\n\nBe conversational, concise, and use available context naturally.`;
    
    return systemPrompt + responseRules;
  }, [staticPromptParts, state.memoryContext, state.dashboardContext, state.contextualSuggestions]);

  // Event handlers
  const handleModelChange = useCallback((modelId: string) => {
    dispatch({ type: 'SET_MODEL', payload: modelId });
    try {
      localStorage.setItem('virgil-selected-model', modelId);
    } catch {
      // Ignore localStorage errors
    }
  }, [dispatch]);

  const handleSizeToggle = useCallback(() => {
    const sizes: ('normal' | 'large' | 'fullscreen')[] = ['normal', 'large', 'fullscreen'];
    const currentIndex = sizes.indexOf(state.windowSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setWindowSize(nextSize);
  }, [state.windowSize, setWindowSize]);

  const handleNewChat = useCallback(async () => {
    if (state.messages.length > 0) {
      try {
        await memoryService.saveConversation(state.messages);
      } catch (error) {
        // Failed to save conversation before starting new chat
      }
    }
    newChat();
  }, [state.messages, newChat]);

  const handleSystemPromptSave = useCallback(() => {
    try {
      localStorage.setItem('virgil-custom-system-prompt', state.customSystemPrompt);
    } catch {
      // Ignore localStorage errors
    }
  }, [state.customSystemPrompt]);

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

  // Memoized message mapping for API calls
  const apiMessages = useMemo(() => 
    state.messages.map(msg => ({ role: msg.role, content: msg.content }))
  , [state.messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');
    setError(null);
    
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      setTyping(true);

      // Check if any dashboard apps can directly answer this query
      const appResponse = await dashboardAppService.getResponseForQuery(messageText);
      if (appResponse) {
        const appMessage: ChatMessage = {
          id: Date.now() + '-assistant',
          role: 'assistant',
          content: appResponse.response,
          timestamp: new Date().toISOString(),
        };
        addMessage(appMessage);
        setTyping(false);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      const chatApiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
      const systemPrompt = createSystemPrompt(messageText);

      const response = await dedupeFetch(`${chatApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: state.selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...apiMessages,
            { role: 'user', content: messageText },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat service error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.message) {
        throw new Error('Invalid response from chat service');
      }

      const assistantMessage: ChatMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant', 
        content: data.message.content,
        timestamp: new Date().toISOString(),
      };

      addMessage(assistantMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      const fallbackMessage: ChatMessage = {
        id: Date.now() + '-fallback',
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
      };
      
      addMessage(fallbackMessage);
    } finally {
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [state.selectedModel, createSystemPrompt, apiMessages, addMessage, setInput, setError, setTyping]);

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
      // Failed to mark message as important
    }
  }, [state.dashboardContext, dispatch]);

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

// Wrapper component that provides the context
export function VirgilChatbotWithContext() {
  return (
    <ChatProvider>
      <VirgilChatbotInner />
    </ChatProvider>
  );
}

export default VirgilChatbotWithContext;