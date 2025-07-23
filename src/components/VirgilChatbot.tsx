import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import type { ChatMessage, ModelOption } from '../types/chat.types';
import { dedupeFetch } from '../lib/requestDeduplication';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { memoryService, type StoredConversation, type MarkedMemory } from '../services/MemoryService';
import { dashboardContextService, type DashboardContext, type ContextualSuggestion } from '../services/DashboardContextService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { dashboardAppService } from '../services/DashboardAppService';
import {
  ChatHeader,
  ChatMessages,
  ChatInput,
  MemoryModal,
} from './chat';
import './VirgilChatbot.css';

const VirgilChatbot = memo(function VirgilChatbot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1-mini');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    // Load from localStorage on component mount
    try {
      return localStorage.getItem('virgil-custom-system-prompt') || '';
    } catch {
      return '';
    }
  });
  
  // Memory-related state
  const [lastConversation, setLastConversation] = useState<StoredConversation | null>(null);
  const [markedMemories, setMarkedMemories] = useState<MarkedMemory[]>([]);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState<boolean>(false);
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);
  const [recentConversations, setRecentConversations] = useState<StoredConversation[]>([]);
  const [dashboardContext, setDashboardContext] = useState<DashboardContext | null>(null);
  const [contextualSuggestions, setContextualSuggestions] = useState<ContextualSuggestion[]>([]);
  
  // Window control state
  const [windowSize, setWindowSize] = useState<'normal' | 'large' | 'fullscreen'>(() => {
    try {
      const saved = localStorage.getItem('virgil-window-size') as 'normal' | 'large' | 'fullscreen';
      return saved || 'normal';
    } catch {
      return 'normal';
    }
  });
  
  const { user } = useAuth();
  const { address, ipLocation, hasGPSLocation, coordinates } = useLocation();
  const { data: weatherData, unit: weatherUnit } = useWeather();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus management for chatbot modal
  const { containerRef: chatContainerRef } = useFocusManagement(isOpen, {
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true,
    initialFocusSelector: 'input[type="text"]',
  });

  // Keyboard navigation for quick actions and model dropdown
  const { containerRef: keyboardNavRef } = useKeyboardNavigation({
    enabled: isOpen,
    onEscape: () => setIsOpen(false),
    onEnter: (element) => {
      if (element.classList.contains('quick-btn')) {
        element.click();
      } else if (element.classList.contains('model-option')) {
        element.click();
      }
    },
  });

  // Available models - memoized to prevent recreation on every render
  const models = useMemo<ModelOption[]>(() => [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast and efficient' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Most capable model' },
    { id: 'o4-mini', name: 'o4 Mini', description: 'Optimized reasoning' },
  ], []);

  // Load saved model from localStorage
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('virgil-selected-model');
      if (savedModel && models.find(m => m.id === savedModel)) {
        setSelectedModel(savedModel);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [models]);

  // Initialize memory service and load memory data
  useEffect(() => {
    const initMemory = async () => {
      try {
        await memoryService.init();
        
        // Load last conversation
        const lastConv = await memoryService.getLastConversation();
        setLastConversation(lastConv);
        
        // Load marked memories
        const memories = await memoryService.getMarkedMemories();
        setMarkedMemories(memories);
        
        // Load recent conversations
        const conversations = await memoryService.getRecentConversations(10);
        setRecentConversations(conversations);
        
        // Get context for prompt
        const context = await memoryService.getContextForPrompt();
        setMemoryContext(context);
        
        // Show indicator if we have memory context
        setShowMemoryIndicator(!!context);
      } catch (error) {
        // Failed to initialize memory service
      }
    };
    
    initMemory();
  }, []);

  // Initialize dashboard context service
  useEffect(() => {
    // Subscribe to context updates
    const unsubscribe = dashboardContextService.subscribe((context) => {
      setDashboardContext(context);
      const suggestions = dashboardContextService.generateSuggestions();
      setContextualSuggestions(suggestions);
    });

    // Get initial context
    setDashboardContext(dashboardContextService.getContext());
    setContextualSuggestions(dashboardContextService.generateSuggestions());

    return unsubscribe;
  }, []);

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

  // Save conversation when chat is closed (but keep messages for persistence)
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const saveConversation = async () => {
        try {
          await memoryService.saveConversation(messages);
          // Keep messages in state for persistence - don't clear them
        } catch (error) {
          // Failed to save conversation
        }
      };
      
      saveConversation();
    }
  }, [isOpen, messages]);

  // Persist active conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('virgil-active-conversation', JSON.stringify(messages));
      } catch (error) {
        // Failed to save active conversation
      }
    } else {
      // Clear localStorage when no messages
      localStorage.removeItem('virgil-active-conversation');
    }
  }, [messages]);

  // Load persisted conversation on mount
  useEffect(() => {
    const loadPersistedConversation = async () => {
      try {
        // Priority: localStorage active session > memory service > empty
        const savedMessages = localStorage.getItem('virgil-active-conversation');
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (parsedMessages.length > 0) {
            setMessages(parsedMessages);
            return;
          }
        }
        
        // Fallback to memory service if no active session
        const lastConv = await memoryService.getLastConversation();
        if (lastConv && lastConv.messages && lastConv.messages.length > 0) {
          // Only load if conversation is recent (within 24 hours)
          const isRecent = lastConv.timestamp && (Date.now() - lastConv.timestamp) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            setMessages(lastConv.messages);
          }
        }
      } catch (error) {
        // Failed to load persisted conversation
      }
    };

    // Only load on initial mount
    if (messages.length === 0) {
      loadPersistedConversation();
    }
  }, []); // Empty dependency array for mount-only execution

  // Memoized static parts of system prompt (performance optimization)
  const staticPromptParts = useMemo(() => {
    // Generate minimal, efficient context
    const getTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'morning';
      if (hour < 17) return 'afternoon';
      return 'evening';
    };

    const getLocationContext = () => {
      if (address?.city) {
        return `${address.city}${address.country ? `, ${address.country}` : ''}`;
      }
      if (ipLocation?.city) {
        return `${ipLocation.city}${ipLocation.country ? `, ${ipLocation.country}` : ''}`;
      }
      return null;
    };

    // Minimal context - only essential information
    const staticUserContext = user ? 
      `User: ${user.user_metadata?.name || 'User'}${getLocationContext() ? ` • Location: ${getLocationContext()}` : ''} • Time: ${getTimeOfDay()}` :
      `Location: ${getLocationContext() || 'Unknown'} • Time: ${getTimeOfDay()}`;

    const basePrompt = customSystemPrompt || 'You are Virgil, a contextual AI assistant.';
    
    return { basePrompt, staticUserContext };
  }, [user, address, ipLocation, customSystemPrompt]);

  const createSystemPrompt = useCallback((userQuery?: string) => {
    // Start with optimized base prompt and minimal context
    let systemPrompt = `${staticPromptParts.basePrompt} ${staticPromptParts.staticUserContext}`;

    // Add memory context if available
    if (memoryContext) {
      systemPrompt += `\n\nMemory:${memoryContext}`;
    }

    // Add smart contextual awareness using DynamicContextBuilder
    if (userQuery && dashboardContext) {
      const enhancedPrompt = DynamicContextBuilder.buildEnhancedPrompt(
        systemPrompt,
        userQuery,
        dashboardContext,
        contextualSuggestions
      );
      systemPrompt = enhancedPrompt.enhancedPrompt;

      // Log activity for context service
      dashboardContextService.logActivity(`Asked: "${userQuery.slice(0, 50)}..."`, 'virgil-chat');
    }

    // Condensed response rules - essential behavior only
    const responseRules = `\n\nBe conversational, concise, and use available context naturally.`;
    
    return systemPrompt + responseRules;
  }, [staticPromptParts, memoryContext, dashboardContext, contextualSuggestions]);

  // Event handlers
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('virgil-selected-model', modelId);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Window control handlers
  const handleMinimize = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSizeToggle = useCallback(() => {
    const sizes: ('normal' | 'large' | 'fullscreen')[] = ['normal', 'large', 'fullscreen'];
    const currentIndex = sizes.indexOf(windowSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setWindowSize(nextSize);
    try {
      localStorage.setItem('virgil-window-size', nextSize);
    } catch {
      // Ignore localStorage errors
    }
  }, [windowSize]);

  const handleNewChat = useCallback(async () => {
    if (messages.length > 0) {
      try {
        // Save current conversation to memory before clearing
        await memoryService.saveConversation(messages);
      } catch (error) {
        // Failed to save conversation before starting new chat
      }
    }
    
    // Clear current conversation
    setMessages([]);
    localStorage.removeItem('virgil-active-conversation');
  }, [messages]);

  // System prompt handlers
  const handleSystemPromptSave = useCallback(() => {
    try {
      localStorage.setItem('virgil-custom-system-prompt', customSystemPrompt);
    } catch {
      // Ignore localStorage errors
    }
  }, [customSystemPrompt]);

  // Message handlers
  const handleClearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const handleExportMessages = useCallback(() => {
    const chatData = {
      exportedAt: new Date().toISOString(),
      user: user?.user_metadata?.name || 'Unknown',
      messages: messages,
      totalMessages: messages.length,
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virgil-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [user, messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    
    // Refocus the input field after sending message
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      setIsTyping(true);

      // Check if any dashboard apps can directly answer this query
      const appResponse = await dashboardAppService.getResponseForQuery(messageText);
      if (appResponse) {
        // Add app-specific response
        const appMessage: ChatMessage = {
          id: Date.now() + '-assistant',
          role: 'assistant',
          content: appResponse.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, appMessage]);
        setIsTyping(false);
        // Refocus input after app response
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      // Use our secure backend API instead of calling OpenAI directly
      const chatApiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
      
      // Prepare messages with contextual awareness
      const systemPrompt = createSystemPrompt(messageText);

      const response = await dedupeFetch(`${chatApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
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

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: Date.now() + '-fallback',
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
      // Refocus input after response is complete
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [selectedModel, createSystemPrompt, messages]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && input.trim()) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  // Function to mark a message as important
  const markAsImportant = useCallback(async (message: ChatMessage) => {
    try {
      // Create rich context for the memory
      let context = `From conversation on ${new Date().toLocaleDateString()}`;
      if (dashboardContext) {
        context = DynamicContextBuilder.createContextSummary(dashboardContext);
      }
      await memoryService.markAsImportant(message.id, message.content, context);
      
      // Reload marked memories
      const memories = await memoryService.getMarkedMemories();
      setMarkedMemories(memories);
      
      // Update memory context
      const newContext = await memoryService.getContextForPrompt();
      setMemoryContext(newContext);
      setShowMemoryIndicator(true);
      
      // Show feedback (could add a toast notification here)
    } catch (error) {
      // Failed to mark message as important
    }
  }, [dashboardContext]);

  // Error handling
  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  if (!isOpen) {
    return (
      <button
        className="virgil-chatbot-bubble"
        onClick={() => setIsOpen(true)}
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
      className={`virgil-chatbot-container ${windowSize}`}
      role="dialog"
      aria-label="Virgil AI Assistant"
      aria-modal="true"
    >
      {/* Header */}
      <ChatHeader
        windowSize={windowSize}
        onSizeToggle={handleSizeToggle}
        onMinimize={handleMinimize}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        models={models}
        showMemoryIndicator={showMemoryIndicator}
        markedMemories={markedMemories}
        recentConversations={recentConversations}
        onMemoryModalOpen={() => setShowMemoryModal(true)}
        dashboardContext={dashboardContext}
        customSystemPrompt={customSystemPrompt}
        onSystemPromptChange={setCustomSystemPrompt}
        onSystemPromptSave={handleSystemPromptSave}
        onNewChat={handleNewChat}
        messageCount={messages.length}
        onClearMessages={handleClearMessages}
        onExportMessages={handleExportMessages}
        createSystemPrompt={createSystemPrompt}
      />

      {/* Messages */}
      <ChatMessages
        messages={messages}
        isTyping={isTyping}
        error={error}
        onErrorDismiss={handleErrorDismiss}
        onMarkAsImportant={markAsImportant}
        user={user}
        lastConversation={lastConversation}
      />

      {/* Input */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        isTyping={isTyping}
        error={error}
        onQuickAction={handleQuickAction}
        showQuickActions={messages.length === 0}
        dashboardContext={dashboardContext}
        shouldFocus={isOpen}
      />

      {/* Memory Modal */}
      <MemoryModal
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        markedMemories={markedMemories}
        recentConversations={recentConversations}
        onMemoriesUpdate={setMarkedMemories}
        onConversationsUpdate={setRecentConversations}
        onMemoryContextUpdate={setMemoryContext}
        onMemoryIndicatorUpdate={setShowMemoryIndicator}
      />
    </div>
  );
});

export { VirgilChatbot };
export default VirgilChatbot;